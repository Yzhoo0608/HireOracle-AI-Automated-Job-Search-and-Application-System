import { askJSON } from '../groq';
import type { ParsedCV, Job, JobMatch, UserPreferences } from '../types';

export async function matchJobToCV(cv: ParsedCV, job: Job, preferences: UserPreferences | null): Promise<Omit<JobMatch, 'id' | 'created_at'>> {
  const prompt = `
    You are an expert technical recruiter. Evaluate the match between this candidate and the job posting.
    Score each of the following 7 factors from 0 to 100:

    1. skill_score — How well the candidate's skills match the job's required skills.
    2. experience_score — How well the candidate's work experience (years, roles, industry) matches the job requirements.
    3. education_score — How well the candidate's education level and field match the job's education requirements.
    4. location_score — How well the candidate's preferred location matches the job's location.
    5. salary_score — How well the candidate's salary expectations match the job's offered salary range. CRITICAL: If the job posting does NOT disclose a salary range (e.g. "Not specified", undisclosed, or hidden), do NOT penalize the job! Treat undisclosed salaries as neutral with a fair baseline score of 75-80.
    6. job_title_score — How closely the candidate's target job title(s) match the actual job title.
    7. job_type_score — How well the candidate's preferred job type (full-time, part-time, contract, internship) matches the job's type.

    Then compute an overall_score as a weighted average of all 7 factors.

    Return JSON matching:
    {
      "overall_score": number (0-100),
      "skill_score": number (0-100),
      "experience_score": number (0-100),
      "education_score": number (0-100),
      "location_score": number (0-100),
      "salary_score": number (0-100),
      "job_title_score": number (0-100),
      "job_type_score": number (0-100),
      "skill_gaps": ["string"],
      "recommendations": ["string"]
    }

    === CANDIDATE INFORMATION ===
    CV Summary: ${cv.summary}
    CV Skills: ${cv.skills.join(', ')}
    CV Experience: ${JSON.stringify(cv.experience)}
    CV Education: ${JSON.stringify(cv.education)}

    === JOB POSTING INFORMATION ===
    Job Title: ${job.title}
    Job Description: ${job.description}
    Job Requirements: ${JSON.stringify(job.requirements)}
    Job Location: ${job.location}
    Job Salary Range: ${job.salary_range || 'Not specified (Undisclosed - treat neutrally, do not penalize)'}
    Job Type: ${job.job_type || 'Not specified'}

    === USER PREFERENCES ===
    Target Location: ${preferences?.location || 'Not specified'}
    Target Job Titles: ${preferences?.job_titles?.join(', ') || preferences?.industries?.join(', ') || 'Not specified'}
    Job Type Preference: ${preferences?.job_type || 'any'}
    Salary Range: ${preferences?.salary_min || 0} - ${preferences?.salary_max || 0}
  `;

  const analysis = await askJSON<any>(prompt, "You are an expert technical recruiter evaluating a candidate for a job. Return ONLY JSON.");

  return {
    user_id: '', // Will be filled by caller
    job_id: job.id,
    overall_score: analysis.overall_score || 0,
    skill_score: analysis.skill_score || 0,
    experience_score: analysis.experience_score || 0,
    education_score: analysis.education_score || 0,
    location_score: analysis.location_score || 0,
    salary_score: analysis.salary_score || 0,
    job_title_score: analysis.job_title_score || 0,
    job_type_score: analysis.job_type_score || 0,
    skill_gaps: analysis.skill_gaps || [],
    recommendations: analysis.recommendations || []
  };
}
