import { getUserById, getCVProfile, searchJobs as dbSearchJobs, createJob, createJobMatch, getJobMatchesByUser, createApplication, getUnmatchedJobsForUser, hasAppliedToJob, hasAppliedToCompanyAndTitle, hasAppliedToJobStreetId, getDb, getApplicationsByUser, getDashboardStats } from '../db';
import { searchJobs as scrapeJobs } from './job-search-agent';
import { matchJobToCV } from './matching-agent';
import { generateCoverLetter } from './cover-letter-agent';
import { sendApplicationEmail } from './email-agent';
import { checkCompanyReplies } from './reply-agent';
import type { JobSearchRequest, Job, JobMatch } from '../types';

export async function runJobSearch(userId: string, filters: JobSearchRequest): Promise<Job[]> {
  const user = await getUserById(userId);
  const profile = await getCVProfile(userId);
  
  if (!user) throw new Error('User not found');
  
  const userSkills = profile ? profile.structured_data.skills : [];
  
  // 1. Scrape new jobs
  const newJobsData = await scrapeJobs(filters, userSkills);
  
  // 2. Save jobs to DB (avoid duplicates based on URL ideally, but for now just create)
  const savedJobs: Job[] = [];
  for (const jobData of newJobsData) {
    // Simple duplicate check could be added here
    const job = await createJob(jobData);
    savedJobs.push(job);
  }
  
  return savedJobs;
}

export async function runMatchAndRank(userId: string): Promise<JobMatch[]> {
  const user = await getUserById(userId);
  const profile = await getCVProfile(userId);
  
  if (!user || !profile) throw new Error('User or CV profile not found');
  
  // Get jobs created today or recently that don't have matches yet
  const jobs = await dbSearchJobs(''); // For simplicity, grab all jobs. In prod, filter to un-matched.
  
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
      console.error(`Failed to match job ${job.title}:`, e.message);
      // Wait longer (5 seconds) if we hit a rate limit, then continue
      if (e.message.includes('429') || e.message.toLowerCase().includes('rate limit')) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  return await getJobMatchesByUser(userId);
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
      keywords: user.preferences?.industries || []
    };
    
    const jobs = await runJobSearch(userId, filters);
    jobsFound = jobs.length;
    
    const matches = await runMatchAndRank(userId);
    matched = matches.length;
    
    // Auto-apply logic
    const profile = await getCVProfile(userId);
    if (profile) {
      for (const match of matches) {
        if (match.overall_score >= 70 && match.job) {
          try {
            // 1. Generate Cover Letter
            const { coverLetter, emailSubject, emailBody } = await generateCoverLetter(
              profile.structured_data,
              match.job
            );

            // 2. Email Company (simulate company email using hr@[company].com)
            const companyEmail = `hr@${match.job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
            await sendApplicationEmail({
              to: companyEmail,
              cc: user.email,
              subject: emailSubject,
              body: emailBody,
              userName: user.name,
              cvPath: profile.file_path
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
    }
    
  } catch (error: any) {
    errors.push(error.message);
  }

  return { jobsFound, matched, applied, errors };
}

export async function runActivePipelineCycle(userId: string): Promise<{ scraped: number; matched: number; applied: number; errors: string[] }> {
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
    const filters: JobSearchRequest = {
      location: user.preferences?.location || '',
      keywords: user.preferences?.industries || []
    };
    
    // Scrape new jobs matching preferences
    const newJobsData = await scrapeJobs(filters, userSkills);
    for (const jobData of newJobsData) {
      try {
        await createJob(jobData);
        scraped++;
      } catch (e: any) {
        // Ignore duplicate key or DB errors on insert
      }
    }
  } catch (error: any) {
    console.error('[Orchestrator] Step A Scrape Error:', error.message);
    errors.push(`Job Search Scraper error: ${error.message}`);
  }

  // Step B: Match & Filter
  if (profile) {
    try {
      const unmatched = await getUnmatchedJobsForUser(userId);
      // Scan up to 10 unmatched jobs to respect free key rate limits
      for (const job of unmatched.slice(0, 10)) {
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
      console.error('[Orchestrator] Step B Match Error:', error.message);
      errors.push(`Matching Agent error: ${error.message}`);
    }

    // Step C: Batch Apply (Picks exactly 5 highly matched jobs)
    try {
      const matches = await getJobMatchesByUser(userId);
      // Filter for highly matched (score >= 70) and not yet applied
      const candidates = [];
      for (const match of matches) {
        if (!match.job) continue;
        const score = match.overall_score >= 70;
        if (!score) continue;

        const alreadyAppliedById = await hasAppliedToJob(userId, match.job_id);
        const alreadyAppliedByTitle = await hasAppliedToCompanyAndTitle(userId, match.job.company, match.job.title);
        const alreadyAppliedByJobStreetId = await hasAppliedToJobStreetId(userId, match.job.url);

        if (!alreadyAppliedById && !alreadyAppliedByTitle && !alreadyAppliedByJobStreetId) {
          candidates.push(match);
        }
      }

      // Pick exactly the first 5 highly matched jobs
      const batchToApply = candidates.slice(0, 5);
      for (const match of batchToApply) {
        if (!match.job) continue;
        
        // Double check DB before applying to prevent double application
        if (
          await hasAppliedToJob(userId, match.job_id) || 
          await hasAppliedToCompanyAndTitle(userId, match.job.company, match.job.title) ||
          await hasAppliedToJobStreetId(userId, match.job.url)
        ) {
          continue;
        }

        try {
          // 1. Generate Cover Letter
          const { coverLetter, emailSubject, emailBody } = await generateCoverLetter(
            profile.structured_data,
            match.job
          );

          // 2. Email Company (simulate hr@[company].com)
          const companyEmail = `hr@${match.job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
          await sendApplicationEmail({
            to: companyEmail,
            cc: user.email,
            subject: emailSubject,
            body: emailBody,
            userName: user.name,
            cvPath: profile.file_path
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
        } catch (e: any) {
          console.error(`[Orchestrator] Failed to auto-apply to ${match.job.title}:`, e.message);
          errors.push(`Auto-apply error for job "${match.job.title}": ${e.message}`);
        }
      }
    } catch (error: any) {
      console.error('[Orchestrator] Step C Apply Error:', error.message);
      errors.push(`Batch Apply error: ${error.message}`);
    }
  } else {
    errors.push('No CV profile uploaded yet; skipping match and auto-apply steps.');
  }

  // Step D: Check Company Replies & Status Updates (Accepted/Rejected/Interviews)
  let checkResults = { processed: 0, updates: [] as any[], errors: [] as string[] };
  try {
    checkResults = await checkCompanyReplies(userId);
  } catch (e: any) {
    errors.push(`Failed to check replies: ${e.message}`);
  }

  // Step E: Send Auto-Pilot Cycle Summary Email to User
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
