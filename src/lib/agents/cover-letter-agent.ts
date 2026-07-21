import { askJSON } from '../groq';
import type { ParsedCV, Job } from '../types';
import PDFDocument from 'pdfkit';
import fs from 'fs';

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

  let result: any = {};
  try {
    result = await askJSON<any>(prompt, "You are an expert career coach writing compelling cover letters. Return ONLY JSON.");
  } catch (e) {
    console.error('[CoverLetterAgent] LLM failed:', e);
  }

  const defaultCoverLetter = `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. Based on my background and experience, I believe I can make a significant contribution to your team.

My skills include: ${cv.skills ? cv.skills.join(', ') : ''}.

I look forward to discussing how my experience aligns with the requirements of this role.

Sincerely,
${cv.name}`;

  const defaultBody = `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. 

Please find attached my CV for your review. I look forward to the opportunity to discuss my qualifications with you.

Best regards,
${cv.name}`;

  return {
    coverLetter: (result.coverLetter && result.coverLetter.trim()) ? result.coverLetter.trim() : defaultCoverLetter,
    emailSubject: result.emailSubject || `Application for ${job.title} - ${cv.name}`,
    emailBody: (result.emailBody && result.emailBody.trim()) ? result.emailBody.trim() : defaultBody
  };
}

export function saveTextAsPDF(text: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      doc.fontSize(12).font('Helvetica').lineGap(4).text(text, {
        align: 'left',
        paragraphGap: 12
      });

      doc.end();
      stream.on('finish', () => {
        resolve();
      });
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}
