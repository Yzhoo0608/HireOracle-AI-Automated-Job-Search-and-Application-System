import { askJSON } from '../groq';
import type { ParsedCV, Job, JobMatch, UserPreferences } from '../types';

export async function matchJobToCV(cv: ParsedCV, job: Job, preferences: UserPreferences | null): Promise<Omit<JobMatch, 'id' | 'created_at'>> {
  const prompt = `
    Evaluate the match between this candidate's CV and the job description.
    Provide a detailed scoring and analysis.
    Return JSON matching:
    {
      "overall_score": number (0-100),
      "skill_score": number (0-100),
      "experience_score": number (0-100),
      "location_score": number (0-100),
      "preference_score": number (0-100),
      "skill_gaps": ["string"],
      "recommendations": ["string"]
    }

    CV Summary: ${cv.summary}
    CV Skills: ${cv.skills.join(', ')}
    CV Experience: ${JSON.stringify(cv.experience)}

    Job Title: ${job.title}
    Job Description: ${job.description}
    Job Requirements: ${JSON.stringify(job.requirements)}
    Job Location: ${job.location}

    User Preferences: ${preferences ? JSON.stringify(preferences) : 'None'}
  `;

  const analysis = await askJSON<any>(prompt, "You are an expert technical recruiter evaluating a candidate for a job. Return ONLY JSON.");

  return {
    user_id: '', // Will be filled by caller
    job_id: job.id,
    overall_score: analysis.overall_score || 0,
    skill_score: analysis.skill_score || 0,
    experience_score: analysis.experience_score || 0,
    location_score: analysis.location_score || 0,
    preference_score: analysis.preference_score || 0,
    skill_gaps: analysis.skill_gaps || [],
    recommendations: analysis.recommendations || []
  };
}
