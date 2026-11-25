import { getUserById, getCVProfile, createJob, createJobMatch, getJobMatchesByUser, createApplication, getUnmatchedJobsForUser, hasAppliedToJob, hasAppliedToCompanyAndTitle, hasAppliedToJobStreetId, getDb, getApplicationsByUser, getDashboardStats, markJobInactive } from '../db';
import { searchJobs as scrapeJobs, verifyJobIsActive } from './job-search-agent';
import { matchJobToCV } from './matching-agent';
import { generateCoverLetter, saveTextAsPDF } from './cover-letter-agent';
import { sendApplicationEmail } from './email-agent';
import { checkCompanyReplies } from './reply-agent';
import path from 'path';
import fs from 'fs/promises';
import type { JobSearchRequest, Job, JobMatch } from '@/shared/types';

export async function runJobSearch(userId: string, filters: JobSearchRequest): Promise<Job[]> {
  const user = await getUserById(userId);
  const profile = await getCVProfile(userId);
  
  if (!user) throw new Error('User not found');
  
  // Fallback to user saved preferences if filters are empty
  const effectiveKeywords = (filters.keywords && filters.keywords.length > 0)
    ? filters.keywords
    : (user.preferences?.job_titles?.length ? user.preferences.job_titles : (user.preferences?.industries || []));
  const effectiveLocation = filters.location || user.preferences?.location || '';

  const effectiveFilters: JobSearchRequest = {
    keywords: effectiveKeywords,
    location: effectiveLocation,
    remote: filters.remote ?? (user.preferences?.remote_preference === 'remote'),
    job_type: filters.job_type || user.preferences?.job_type || ''
  };

  const userSkills = profile ? profile.structured_data.skills : [];
  
  // 1. Scrape new jobs
  const newJobsData = await scrapeJobs(effectiveFilters, userSkills);
  
  // 2. Save jobs to DB
  const savedJobs: Job[] = [];
  for (const jobData of newJobsData) {
    // Simple duplicate check could be added here
    const job = await createJob(jobData);
    savedJobs.push(job);
  }
  
  return savedJobs;
}

export function isJobTypeCompatible(
  preferredType?: string,
  jobType?: string,
  jobTitle?: string,
  jobTypeScore?: number
): boolean {
  if (!preferredType || preferredType.toLowerCase() === 'any') {
    return true;
  }

  const pref = preferredType.toLowerCase().trim();
  const jt = (jobType || '').toLowerCase().trim();
  const title = (jobTitle || '').toLowerCase().trim();
  const combined = `${jt} ${title}`;

  if (pref === 'full-time' || pref === 'full_time' || pref === 'fulltime') {
    const isContractOrTemp = combined.includes('contract') || combined.includes('temp') || combined.includes('temporary');
    const isInternship = combined.includes('intern') || combined.includes('trainee');
    const isPartTime = combined.includes('part-time') || combined.includes('part time');
    if (isContractOrTemp || isInternship || isPartTime) return false;
    if (typeof jobTypeScore === 'number' && jobTypeScore > 0 && jobTypeScore < 60) return false;
    return true;
  }

  if (pref === 'part-time' || pref === 'part_time' || pref === 'parttime') {
    const isPartTime = combined.includes('part-time') || combined.includes('part time');
    if (!isPartTime && !jt.includes('part')) return false;
    if (typeof jobTypeScore === 'number' && jobTypeScore > 0 && jobTypeScore < 60) return false;
    return true;
  }

  if (pref === 'internship' || pref === 'intern') {
    const isIntern = combined.includes('intern') || combined.includes('trainee') || combined.includes('practicum') || combined.includes('practical');
    if (!isIntern && !jt.includes('intern')) return false;
    if (typeof jobTypeScore === 'number' && jobTypeScore > 0 && jobTypeScore < 60) return false;
    return true;
  }

  if (pref === 'contract' || pref === 'temporary' || pref === 'temp') {
    const isContract = combined.includes('contract') || combined.includes('temp') || combined.includes('temporary');
    if (!isContract && !jt.includes('contract')) return false;
    if (typeof jobTypeScore === 'number' && jobTypeScore > 0 && jobTypeScore < 60) return false;
    return true;
  }

  return true;
}

const globalMatchLocks = global as unknown as {
  activeMatchPromises?: Map<string, Promise<JobMatch[]>>;
  activeCyclePromises?: Map<string, Promise<{ scraped: number; matched: number; applied: number; errors: string[] }>>;
  activeAbortControllers?: Map<string, AbortController>;
};
if (!globalMatchLocks.activeMatchPromises) {
  globalMatchLocks.activeMatchPromises = new Map<string, Promise<JobMatch[]>>();
}
if (!globalMatchLocks.activeCyclePromises) {
  globalMatchLocks.activeCyclePromises = new Map<string, Promise<{ scraped: number; matched: number; applied: number; errors: string[] }>>();
}
if (!globalMatchLocks.activeAbortControllers) {
  globalMatchLocks.activeAbortControllers = new Map<string, AbortController>();
}
const activeMatchPromises = globalMatchLocks.activeMatchPromises;
const activeCyclePromises = globalMatchLocks.activeCyclePromises;
const activeAbortControllers = globalMatchLocks.activeAbortControllers;

export function abortUserPipeline(userId: string) {
  console.log(`[Orchestrator] Aborting active pipeline cycle for user: ${userId}`);
  const controller = activeAbortControllers.get(userId);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(userId);
  }
}

export async function runMatchAndRank(userId: string): Promise<JobMatch[]> {
  const existingRun = activeMatchPromises.get(userId);
  if (existingRun) {
    return existingRun;
  }

  const matchPromise = (async (): Promise<JobMatch[]> => {
    const user = await getUserById(userId);
    const profile = await getCVProfile(userId);
    
    if (!user || !profile) throw new Error('User or CV profile not found');
    
    // Get newest unmatched and active jobs
    const jobs = await getUnmatchedJobsForUser(userId);
    
    for (const job of jobs.slice(0, 10)) { // Limit to 10 to reduce rate limits on free keys
      try {
        const matchData = await matchJobToCV(profile.structured_data, job, user.preferences);
        await createJobMatch({
          ...matchData,
          user_id: userId
        });
        // Pause for 1.5 seconds between matches to stay under rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
          const waitMatch = msg.match(/try again in (\d+(?:\.\d+)?)s/i);
          const rawWaitMs = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) + 500 : 5000;
          const waitMs = Math.min(Math.max(rawWaitMs, 1000), 15000);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          try {
            const retryMatchData = await matchJobToCV(profile.structured_data, job, user.preferences);
            await createJobMatch({
              ...retryMatchData,
              user_id: userId
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          } catch (retryErr: any) {
            console.error(`Failed to match job ${job.title}:`, retryErr.message);
          }
        } else {
          console.error(`Failed to match job ${job.title}:`, msg);
        }
      }
    }
    
    return await getJobMatchesByUser(userId);
  })();

  activeMatchPromises.set(userId, matchPromise);
  try {
    return await matchPromise;
  } finally {
    activeMatchPromises.delete(userId);
  }
}

export async function runFullPipeline(userId: string): Promise<{ jobsFound: number; matched: number; applied: number; errors: string[] }> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  
  const errors: string[] = [];
  let jobsFound = 0;
  let matched = 0;
  let applied = 0; 

  try {
    const filters: JobSearchRequest = {
      location: user.preferences?.location || '',
      keywords: user.preferences?.job_titles?.length ? user.preferences.job_titles : (user.preferences?.industries || []),
      job_type: user.preferences?.job_type || ''
    };
    
    const jobs = await runJobSearch(userId, filters);
    jobsFound = jobs.length;
    
    const matches = await runMatchAndRank(userId);
    matched = matches.length;
    
    // Auto-apply logic
    const profile = await getCVProfile(userId);
    if (profile) {
      // Prioritize newest jobs first, then older suitable jobs (score >= 70 and matching job type)
      const sortedMatches = [...matches]
        .filter(m => 
          m.overall_score >= 70 && 
          m.job && 
          m.job.is_active !== false &&
          isJobTypeCompatible(user.preferences?.job_type, m.job.job_type, m.job.title, m.job_type_score)
        )
        .sort((a, b) => {
          const dateA = a.job?.created_at ? new Date(a.job.created_at).getTime() : 0;
          const dateB = b.job?.created_at ? new Date(b.job.created_at).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA; // Newest first
          return b.overall_score - a.overall_score; // Highest score next
        });

      for (const match of sortedMatches) {
        if (!match.job) continue;

        // Skip if already applied
        if (
          await hasAppliedToJob(userId, match.job_id) || 
          await hasAppliedToCompanyAndTitle(userId, match.job.company, match.job.title) ||
          await hasAppliedToJobStreetId(userId, match.job.url)
        ) {
          continue;
        }

        // Verify job is still active on JobStreet before applying
        const isActive = await verifyJobIsActive(match.job.url);
        if (!isActive) {
          console.log(`[Auto-Apply] Job is no longer available on JobStreet: "${match.job.title}". Skipping and marking inactive.`);
          await markJobInactive(match.job_id);
          continue; // Proceed to next suitable job
        }

        try {
          // 1. Generate Cover Letter
          const { coverLetter, emailSubject, emailBody } = await generateCoverLetter(
            profile.structured_data,
            match.job
          );

          // Generate cover letter PDF file
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });
          const coverLetterPath = path.join(uploadsDir, `${userId}-${Date.now()}-cover-letter.pdf`);
          await saveTextAsPDF(coverLetter, coverLetterPath);

          // 2. Email Company (simulate company email using hr@[company].com)
          const companyEmail = `hr@${match.job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
          await sendApplicationEmail({
            to: companyEmail,
            cc: user.email,
            subject: emailSubject,
            body: emailBody,
            userName: user.name,
            cvPath: profile.file_path,
            coverLetterPath: coverLetterPath
          });

          // 3. Save Application Record
          await createApplication({
            user_id: userId,
            job_id: match.job_id,
            company_name: match.job.company,
            job_title: match.job.title,
            status: 'applied',
            date_applied: new Date().toISOString(),
            cover_letter: coverLetter,
            match_score: match.overall_score,
            email_sent_to: companyEmail,
            follow_up_date: '',
            notes: ''
          });

          applied++;
        } catch (e: any) {
          errors.push(`Failed to auto-apply to ${match.job.title}: ${e.message}`);
        }
      }
    }
    
  } catch (error: any) {
    errors.push(error.message);
  }

  return { jobsFound, matched, applied, errors };
}

export async function runActivePipelineCycle(userId: string): Promise<{ scraped: number; matched: number; applied: number; errors: string[] }> {
  const existingCycle = activeCyclePromises.get(userId);
  if (existingCycle) {
    console.log(`[Orchestrator] Active cycle already running for user ${userId}. Returning in-flight promise.`);
    return existingCycle;
  }

  const controller = new AbortController();
  activeAbortControllers.set(userId, controller);

  const cyclePromise = (async () => {
    try {
      return await executeActivePipelineCycle(userId, controller.signal);
    } finally {
      activeCyclePromises.delete(userId);
      activeAbortControllers.delete(userId);
    }
  })();

  activeCyclePromises.set(userId, cyclePromise);
  return cyclePromise;
}

async function executeActivePipelineCycle(userId: string, signal: AbortSignal): Promise<{ scraped: number; matched: number; applied: number; errors: string[] }> {
  if (signal.aborted) {
    console.log(`[Orchestrator] Active cycle aborted early for user: ${userId}`);
    return { scraped: 0, matched: 0, applied: 0, errors: ['Pipeline stopped by user'] };
  }

  const user = await getUserById(userId);
  if (!user || !user.is_active) {
    return { scraped: 0, matched: 0, applied: 0, errors: ['User not active'] };
  }

  const errors: string[] = [];
  let scraped = 0;
  let matched = 0;
  let applied = 0;
  const appliedJobs: Array<{ company: string; title: string; score: number }> = [];

  const profile = await getCVProfile(userId);
  const userSkills = profile ? profile.structured_data.skills : [];

  // Step A: Search & Store
  try {
    if (signal.aborted) throw new Error('Pipeline stopped by user');

    const filters: JobSearchRequest = {
      location: user.preferences?.location || '',
      keywords: user.preferences?.job_titles?.length ? user.preferences.job_titles : (user.preferences?.industries || []),
      job_type: user.preferences?.job_type || ''
    };
    
    // Scrape new jobs matching preferences
    const newJobsData = await scrapeJobs(filters, userSkills);
    for (const jobData of newJobsData) {
      if (signal.aborted) break;
      try {
        await createJob(jobData);
        scraped++;
      } catch (e: any) {
        // Ignore duplicate key or DB errors on insert
      }
    }
  } catch (error: any) {
    if (signal.aborted) {
      console.log(`[Orchestrator] Step A aborted for user: ${userId}`);
      return { scraped, matched, applied, errors: ['Pipeline stopped by user'] };
    }
    console.error('[Orchestrator] Step A Scrape Error:', error.message);
    errors.push(`Job Search Scraper error: ${error.message}`);
  }

  // Step B: Match & Filter
  if (profile) {
    try {
      if (signal.aborted) throw new Error('Pipeline stopped by user');

      const unmatched = await getUnmatchedJobsForUser(userId);
      // Scan up to 10 unmatched jobs to respect free key rate limits
      for (const job of unmatched.slice(0, 10)) {
        if (signal.aborted) {
          console.log(`[Orchestrator] Step B matching aborted for user: ${userId}`);
          break;
        }
        const currentUser = await getUserById(userId);
        if (!currentUser || !currentUser.is_active) {
          console.log(`[Orchestrator] User ${userId} is no longer active. Aborting matching.`);
          break;
        }

        try {
          const matchData = await matchJobToCV(profile.structured_data, job, user.preferences);
          await createJobMatch({
            ...matchData,
            user_id: userId
          });
          matched++;
          // Delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (e: any) {
          console.error(`Failed to match job ${job.title}:`, e.message);
          if (e.message.includes('429') || e.message.toLowerCase().includes('rate limit')) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          errors.push(`Matching error for job "${job.title}": ${e.message}`);
        }
      }
    } catch (error: any) {
      if (signal.aborted) {
        console.log(`[Orchestrator] Step B aborted for user: ${userId}`);
        return { scraped, matched, applied, errors: ['Pipeline stopped by user'] };
      }
      console.error('[Orchestrator] Step B Match Error:', error.message);
      errors.push(`Matching Agent error: ${error.message}`);
    }

    // Step C: Batch Apply (Picks exactly 5 highly matched jobs)
    try {
      if (signal.aborted) throw new Error('Pipeline stopped by user');

      const matches = await getJobMatchesByUser(userId);
      // Filter for highly matched (score >= 70), active in DB, compatible job type, and not yet applied
      const candidates = [];
      for (const match of matches) {
        if (!match.job) continue;
        if (match.job.is_active === false) continue;
        const score = match.overall_score >= 70;
        if (!score) continue;

        // Enforce strict job type compatibility with user preferences
        if (!isJobTypeCompatible(user.preferences?.job_type, match.job.job_type, match.job.title, match.job_type_score)) {
          console.log(`[Batch Apply] Skipping job "${match.job.title}" due to job type incompatibility with preferred "${user.preferences?.job_type}"`);
          continue;
        }

        const alreadyAppliedById = await hasAppliedToJob(userId, match.job_id);
        const alreadyAppliedByTitle = await hasAppliedToCompanyAndTitle(userId, match.job.company, match.job.title);
        const alreadyAppliedByJobStreetId = await hasAppliedToJobStreetId(userId, match.job.url);

        if (!alreadyAppliedById && !alreadyAppliedByTitle && !alreadyAppliedByJobStreetId) {
          candidates.push(match);
        }
      }

      // Prioritize newest jobs first, then older suitable jobs
      candidates.sort((a, b) => {
        const dateA = a.job?.created_at ? new Date(a.job.created_at).getTime() : 0;
        const dateB = b.job?.created_at ? new Date(b.job.created_at).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA; // Newest first
        return b.overall_score - a.overall_score; // Highest score next
      });

      // Apply to up to 5 verified active jobs in this cycle
      let appliedCount = 0;
      for (const match of candidates) {
        if (appliedCount >= 5) break;
        if (!match.job) continue;

        // CRITICAL CHECK: Stop immediately if pipeline was stopped or user logged out
        if (signal.aborted) {
          console.log(`[Batch Apply] Pipeline cycle aborted for user ${userId}. Stopping further applications.`);
          break;
        }
        const currentUserState = await getUserById(userId);
        if (!currentUserState || !currentUserState.is_active) {
          console.log(`[Batch Apply] User ${userId} is no longer active (pipeline stopped or user logged out). Stopping further applications immediately.`);
          break;
        }
        
        // Double check DB before applying to prevent double application
        if (
          await hasAppliedToJob(userId, match.job_id) || 
          await hasAppliedToCompanyAndTitle(userId, match.job.company, match.job.title) ||
          await hasAppliedToJobStreetId(userId, match.job.url)
        ) {
          continue;
        }

        // Liveness verification: check if job is still active on JobStreet
        const isActive = await verifyJobIsActive(match.job.url);
        if (!isActive) {
          console.log(`[Batch Apply] Job is no longer available on JobStreet: "${match.job.title}". Skipping and marking inactive.`);
          await markJobInactive(match.job_id);
          continue; // Automatically move to the next candidate (even if older)
        }

        try {
          // Pre-LLM check: make sure user didn't stop during liveness check
          if (signal.aborted) break;
          const preLlmCheck = await getUserById(userId);
          if (!preLlmCheck || !preLlmCheck.is_active) break;

          // 1. Generate Cover Letter
          const { coverLetter, emailSubject, emailBody } = await generateCoverLetter(
            profile.structured_data,
            match.job
          );

          // Generate cover letter PDF file
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });
          const coverLetterPath = path.join(uploadsDir, `${userId}-${Date.now()}-cover-letter.pdf`);
          await saveTextAsPDF(coverLetter, coverLetterPath);

          // CRITICAL CHECK BEFORE SENDING REAL EMAIL:
          if (signal.aborted) {
            console.log(`[Batch Apply] Pipeline cycle aborted right before emailing for "${match.job.title}". Aborting.`);
            break;
          }
          const preEmailCheck = await getUserById(userId);
          if (!preEmailCheck || !preEmailCheck.is_active) {
            console.log(`[Batch Apply] User ${userId} is no longer active right before emailing for "${match.job.title}". Aborting.`);
            break;
          }

          // 2. Email Company (simulate hr@[company].com)
          const companyEmail = `hr@${match.job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
          await sendApplicationEmail({
            to: companyEmail,
            cc: user.email,
            subject: emailSubject,
            body: emailBody,
            userName: user.name,
            cvPath: profile.file_path,
            coverLetterPath: coverLetterPath
          });

          // 3. Save Application Record
          await createApplication({
            user_id: userId,
            job_id: match.job_id,
            company_name: match.job.company,
            job_title: match.job.title,
            status: 'applied',
            date_applied: new Date().toISOString(),
            cover_letter: coverLetter,
            match_score: match.overall_score,
            email_sent_to: companyEmail,
            follow_up_date: '',
            notes: ''
          });

          appliedJobs.push({
            company: match.job.company,
            title: match.job.title,
            score: match.overall_score
          });

          applied++;
          appliedCount++;
        } catch (e: any) {
          console.error(`[Orchestrator] Failed to auto-apply to ${match.job.title}:`, e.message);
          errors.push(`Auto-apply error for job "${match.job.title}": ${e.message}`);
        }
      }
    } catch (error: any) {
      if (signal.aborted) {
        console.log(`[Orchestrator] Step C aborted for user ${userId}`);
        return { scraped, matched, applied, errors: ['Pipeline stopped by user'] };
      }
      console.error('[Orchestrator] Step C Apply Error:', error.message);
      errors.push(`Batch Apply error: ${error.message}`);
    }
  } else {
    errors.push('No CV profile uploaded yet; skipping match and auto-apply steps.');
  }

  // Step D: Check Company Replies & Status Updates (Accepted/Rejected/Interviews)
  if (signal.aborted) {
    console.log(`[Orchestrator] Pipeline cycle aborted for user ${userId}. Skipping reply check.`);
    return { scraped, matched, applied, errors };
  }
  const preCheckUser = await getUserById(userId);
  if (!preCheckUser || !preCheckUser.is_active) {
    console.log(`[Orchestrator] User ${userId} is inactive. Skipping reply check.`);
    return { scraped, matched, applied, errors };
  }

  let checkResults = { processed: 0, updates: [] as any[], errors: [] as string[] };
  try {
    checkResults = await checkCompanyReplies(userId);
  } catch (e: any) {
    errors.push(`Failed to check replies: ${e.message}`);
  }

  // Step E: Send Auto-Pilot Cycle Summary Email to User
  if (signal.aborted) {
    console.log(`[Orchestrator] Pipeline cycle aborted for user ${userId}. Skipping summary email.`);
    return { scraped, matched, applied, errors };
  }
  const finalCheck = await getUserById(userId);
  if (!finalCheck || !finalCheck.is_active) {
    console.log(`[Orchestrator] User ${userId} is inactive. Skipping summary email.`);
    return { scraped, matched, applied, errors };
  }
  const dateStr = new Date().toLocaleString();

  // Query all-time stats and data for the user
  let statsSummary = '';
  let last5AppliedText = '';
  let interviewAppsText = '';

  try {
    const allApplications = await getApplicationsByUser(userId);
    const dashboardStats = await getDashboardStats(userId);

    // Format all-time stats
    statsSummary += `📊 ALL-TIME PIPELINE STATS:\n`;
    statsSummary += `- Total Applications: ${dashboardStats.total_applications}\n`;
    statsSummary += `- Under Review: ${dashboardStats.status_counts.under_review}\n`;
    statsSummary += `- Interviews Scheduled: ${dashboardStats.status_counts.interview_scheduled}\n`;
    statsSummary += `- Offers Received: ${dashboardStats.status_counts.offer_received}\n`;
    statsSummary += `- Rejections: ${dashboardStats.status_counts.rejected}\n\n`;

    // Format last 5 applied jobs
    last5AppliedText += `⏮️ LAST 5 APPLICATIONS SUBMITTED:\n`;
    const last5 = allApplications.slice(0, 5);
    if (last5.length > 0) {
      last5.forEach((app, index) => {
        last5AppliedText += `  ${index + 1}. ${app.job_title} at ${app.company_name} (Status: ${app.status.replace('_', ' ')})\n`;
      });
    } else {
      last5AppliedText += `- No applications submitted yet.\n`;
    }
    last5AppliedText += `📝 *For the complete list of all applications, please check your dashboard page (http://localhost:3000/applications).*\n\n`;

    // Format interview/replied list
    interviewAppsText += `📞 INCOMING REPLIES / INTERVIEWS SCHEDULED:\n`;
    const interviewApps = allApplications.filter(app => app.status === 'interview_scheduled');
    if (interviewApps.length > 0) {
      interviewApps.forEach((app, index) => {
        interviewAppsText += `  ${index + 1}. ${app.company_name} — ${app.job_title}\n`;
        if (app.notes) {
          // Show the latest note line if present
          const latestNote = app.notes.split('\n\n')[0] || '';
          interviewAppsText += `     Latest Update: ${latestNote}\n`;
        }
      });
    } else {
      interviewAppsText += `- No companies have scheduled interviews yet.\n`;
    }
    interviewAppsText += `\n`;
  } catch (err: any) {
    console.error('Failed to compile all-time statistics:', err.message);
  }

  let summaryBody = '';
  summaryBody += statsSummary;
  summaryBody += last5AppliedText;
  summaryBody += interviewAppsText;

  try {
    await sendApplicationEmail({
      to: user.email,
      subject: `[AI Job Agent] Auto-Pilot Summary - ${dateStr}`,
      body: summaryBody,
      userName: user.name,
      isSystemNotification: true
    });
    console.log(`[Orchestrator] Summary email sent to ${user.email}`);
  } catch (e: any) {
    console.error('Failed to send summary email:', e.message);
  }

  return { scraped, matched, applied, errors };
}

let activeTimerInitialized = false;

export function startActivePipelineTimer() {
  if (activeTimerInitialized) return;
  activeTimerInitialized = true;

  console.log('[Orchestrator] Starting background active automation loop (10-minute cycle)');

  // Run the loop cycle every 10 minutes
  setInterval(async () => {
    try {
      const db = getDb();
      // Get all active users from db
      const result = await db.query('SELECT id FROM users WHERE is_active = 1');
      const activeUsers = result.rows;
      
      for (const row of activeUsers) {
        console.log(`[Orchestrator] Running active pipeline cycle for user: ${row.id}`);
        const result = await runActivePipelineCycle(row.id);
        console.log(`[Orchestrator] Active pipeline cycle completed for user ${row.id}:`, result);
      }
    } catch (e) {
      console.error('[Orchestrator] Error in background active automation loop:', e);
    }
  }, 10 * 60 * 1000); // 10 minutes
}
