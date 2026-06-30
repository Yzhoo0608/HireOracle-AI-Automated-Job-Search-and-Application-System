import { getUserById, getCVProfile, searchJobs as dbSearchJobs, createJob, createJobMatch, getJobMatchesByUser, createApplication } from '../db';
import { searchJobs as scrapeJobs } from './job-search-agent';
import { matchJobToCV } from './matching-agent';
import { generateCoverLetter } from './cover-letter-agent';
import { sendApplicationEmail } from './email-agent';
import type { JobSearchRequest, Job, JobMatch } from '../types';

export async function runJobSearch(userId: string, filters: JobSearchRequest): Promise<Job[]> {
  const user = getUserById(userId);
  const profile = getCVProfile(userId);
  
  if (!user) throw new Error('User not found');
  
  const userSkills = profile ? profile.structured_data.skills : [];
  
  // 1. Scrape new jobs
  const newJobsData = await scrapeJobs(filters, userSkills);
  
  // 2. Save jobs to DB (avoid duplicates based on URL ideally, but for now just create)
  const savedJobs: Job[] = [];
  for (const jobData of newJobsData) {
    // Simple duplicate check could be added here
    const job = createJob(jobData);
    savedJobs.push(job);
  }
  
  return savedJobs;
}

export async function runMatchAndRank(userId: string): Promise<JobMatch[]> {
  const user = getUserById(userId);
  const profile = getCVProfile(userId);
  
  if (!user || !profile) throw new Error('User or CV profile not found');
  
  // Get jobs created today or recently that don't have matches yet
  const jobs = dbSearchJobs(''); // For simplicity, grab all jobs. In prod, filter to un-matched.
  
  for (const job of jobs.slice(0, 20)) { // Limit to 20 to avoid rate limits
    const matchData = await matchJobToCV(profile.structured_data, job, user.preferences);
    createJobMatch({
      ...matchData,
      user_id: userId
    });
  }
  
  return getJobMatchesByUser(userId);
}

export async function runFullPipeline(userId: string): Promise<{ jobsFound: number; matched: number; applied: number; errors: string[] }> {
  const user = getUserById(userId);
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
    const profile = getCVProfile(userId);
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
              subject: emailSubject,
              body: emailBody,
              userName: user.name,
              cvPath: profile.file_path
            });

            // 3. Save Application Record
            createApplication({
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
