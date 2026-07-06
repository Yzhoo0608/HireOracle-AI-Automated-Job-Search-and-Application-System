import { askJSON } from '../groq';
import type { ParsedCV, Job } from '../types';

export async function generateCoverLetter(cv: ParsedCV, job: Job, customNotes: string = ''): Promise<{ coverLetter: string; emailSubject: string; emailBody: string }> {
  const prompt = `
    Generate a professional and tailored cover letter and email application for the following job based on the candidate's CV.
    Return JSON matching:
    {
      "coverLetter": "string (the full cover letter text, well formatted)",
      "emailSubject": "string (the subject line of the email)",
      "emailBody": "string (the body of the email, shorter than cover letter, mentioning CV is attached)"
    }

    Candidate Name: ${cv.name}
    Candidate Skills: ${cv.skills.join(', ')}
    Candidate Experience: ${JSON.stringify(cv.experience)}

    Job Title: ${job.title}
    Job Company: ${job.company}
    Job Description: ${job.description}

    Custom Notes/Instructions from candidate: ${customNotes}
  `;

  const result = await askJSON<any>(prompt, "You are an expert career coach writing compelling cover letters. Return ONLY JSON.");

  const defaultBody = `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. 

Please find attached my CV for your review. I look forward to the opportunity to discuss my qualifications with you.

Best regards,
${cv.name}`;

  return {
    coverLetter: result.coverLetter || '',
    emailSubject: result.emailSubject || `Application for ${job.title} - ${cv.name}`,
    emailBody: (result.emailBody && result.emailBody.trim()) ? result.emailBody.trim() : defaultBody
  };
}
