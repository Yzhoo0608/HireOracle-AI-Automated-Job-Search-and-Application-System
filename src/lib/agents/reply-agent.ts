import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { askJSON } from '../groq';
import { getApplicationsByUser, getApplicationById, getUserById, updateApplicationStatusAndNotes, updateApplicationNotes } from '../db';
import { sendApplicationEmail } from './email-agent';
import type { ApplicationStatus } from '../types';

interface ReplyAnalysis {
  classification: 'accepted' | 'rejected' | 'other';
  summary: string;
  sentiment_score: number;
}

function getEmailMatchScore(app: any, subject: string, body: string, fromAddress: string): number {
  let score = 0;
  
  // 1. Sender Match
  if (app.email_sent_to && fromAddress.toLowerCase() === app.email_sent_to.toLowerCase()) {
    score += 100;
  }
  
  const normSubject = subject.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const normBody = body.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const normCompany = app.company_name.toLowerCase()
    .replace(/\b(sdn\.?\s*bhd\.?|pte\.?\s*ltd\.?|ltd\.?|limited|co\.?|corp\.?|corporation|inc\.?|incorporated|group)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
    
  const normJobTitle = app.job_title.toLowerCase().replace(/[^a-z0-9]/gi, '');

  // 2. Company Name Match in Subject
  if (normCompany && normSubject.includes(normCompany)) {
    score += 50;
  }
  
  // 3. Job Title Match in Subject
  if (normJobTitle && normSubject.includes(normJobTitle)) {
    score += 30;
  }
  
  // 4. Company Name Match in Body
  if (normCompany && normBody.includes(normCompany)) {
    score += 10;
  }
  
  // 5. Job Title Match in Body
  if (normJobTitle && normBody.includes(normJobTitle)) {
    score += 5;
  }
  
  return score;
}

export async function checkCompanyReplies(userId: string): Promise<{
  processed: number;
  updates: Array<{ company: string; role: string; oldStatus: string; newStatus: string; summary: string }>;
  errors: string[];
}> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const host = process.env.IMAP_HOST || 'imap.gmail.com';
  const port = parseInt(process.env.IMAP_PORT || '993');
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    return { processed: 0, updates: [], errors: ['IMAP email credentials not configured.'] };
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    logger: false
  });

  const updates: Array<{ company: string; role: string; oldStatus: string; newStatus: string; summary: string }> = [];
  const errors: string[] = [];
  let processedCount = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    
    try {
      // Get all applications for this user to match replies against
      const applications = await getApplicationsByUser(userId);
      if (applications.length === 0) {
        lock.release();
        await client.logout();
        return { processed: 0, updates: [], errors: [] };
      }

      // Search for unseen emails
      const searchResults = await client.search({ seen: false });
      
      if (searchResults && Array.isArray(searchResults)) {
        for (const uid of searchResults) {
        try {
          const fetchResult = await client.fetchOne(uid, { source: true });
          if (!fetchResult || !fetchResult.source) continue;

          const parsedMail = await simpleParser(fetchResult.source);
          const subject = parsedMail.subject || '';
          const bodyText = parsedMail.text || '';
          const fromAddress = parsedMail.from?.value[0]?.address || '';
          const fromName = parsedMail.from?.value[0]?.name || '';
          const emailDate = parsedMail.date ? new Date(parsedMail.date) : new Date();

          // Match email to an active application using robust scoring
          let matchedApp = null;
          let highestScore = 0;
          const emailTime = emailDate.getTime();
          
          for (const app of applications) {
            // Safety: Ignore emails received before the application was submitted
            const appTime = new Date(app.date_applied || app.created_at).getTime();
            if (emailTime < appTime - 60000) {
              continue;
            }

            const score = getEmailMatchScore(app, subject, bodyText, fromAddress);
            if (score > highestScore) {
              highestScore = score;
              matchedApp = app;
            }
          }
          
          // Safety threshold: must have at least a job title or company name match (score >= 30)
          if (highestScore < 30) {
            matchedApp = null;
          }

          if (matchedApp) {
            processedCount++;
            
            // Call Groq LLM to classify response
            const prompt = `
              Analyze this email reply from a company regarding a job application.
              Determine if the company is:
              1. "accepted" - inviting for an interview, requesting a screening call, or making an offer.
              2. "rejected" - notifying they are not moving forward.
              3. "other" - asking clarifying questions, acknowledging receipt, or a neutral update.

              Email Subject: ${subject}
              Email From: ${fromName} <${fromAddress}>
              Email Content:
              ${bodyText.substring(0, 3000)}

              Return ONLY a valid JSON object matching this structure:
              {
                "classification": "accepted" | "rejected" | "other",
                "summary": "Brief 1-2 sentence summary of the email",
                "sentiment_score": number (0 to 100)
              }
            `;

            const analysis = await askJSON<ReplyAnalysis>(
              prompt, 
              "You are an assistant tracking job applications. Classify email replies accurately. Return JSON only."
            );

            let newStatus: ApplicationStatus | null = null;
            if (analysis.classification === 'accepted') {
              newStatus = 'interview_scheduled';
            } else if (analysis.classification === 'rejected') {
              newStatus = 'rejected';
            }

            const oldStatus = matchedApp.status;

            const timestamp = new Date().toISOString();
            const newNote = `[${timestamp}] Email Reply from ${fromAddress}:\n${analysis.summary}\n\n${matchedApp.notes || ''}`;
            
            if (newStatus) {
              await updateApplicationStatusAndNotes(matchedApp.id, newStatus, newNote);
              
              updates.push({
                company: matchedApp.company_name,
                role: matchedApp.job_title,
                oldStatus,
                newStatus,
                summary: analysis.summary
              });
            } else {
              // Just update notes if it's 'other'
              await updateApplicationNotes(matchedApp.id, newNote);
            }

            // Forward reply copy to the candidate
            await sendApplicationEmail({
              to: user.email,
              subject: `[Agent Forward] Reply from ${matchedApp.company_name}: ${subject}`,
              body: `Hi ${user.name},\n\nWe detected an incoming reply from ${matchedApp.company_name} for the position of ${matchedApp.job_title}.\n\nAI Summary: ${analysis.summary}\nNew Status: ${newStatus || oldStatus}\n\nJob Link: ${matchedApp.job?.url || 'N/A'}\n\nYou may return to the application anytime for interview preparation!\n\n-- Original Message --\nFrom: ${fromAddress}\nSubject: ${subject}\n\n${bodyText}`,
              userName: 'AI Job Agent',
              isSystemNotification: true
            });

            // Mark email as read/seen in the inbox
            await client.messageFlagsAdd(uid, ['\\Seen']);
          }
        } catch (mailErr: any) {
          errors.push(`Failed to process email UID ${uid}: ${mailErr.message}`);
        }
      }
      }
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (err: any) {
    errors.push(`IMAP connection error: ${err.message}`);
  }

  return { processed: processedCount, updates, errors };
}

export async function simulateCompanyReply(
  applicationId: string, 
  replyText: string
): Promise<{ success: boolean; newStatus: ApplicationStatus | 'no_change'; summary: string; error?: string }> {
  try {
    const app = await getApplicationById(applicationId);
    if (!app) {
      return { success: false, newStatus: 'no_change', summary: '', error: 'Application not found' };
    }

    const user = await getUserById(app.user_id);
    if (!user) {
      return { success: false, newStatus: 'no_change', summary: '', error: 'User not found' };
    }

    // AI Classification
    const prompt = `
      Analyze this simulated email reply from a company regarding a job application.
      Determine if the company is:
      1. "accepted" - inviting for an interview, requesting a screening call, or making an offer.
      2. "rejected" - notifying they are not moving forward.
      3. "other" - asking clarifying questions, acknowledging receipt, or a neutral update.

      Company: ${app.company_name}
      Role: ${app.job_title}
      Email Content:
      ${replyText}

      Return ONLY a valid JSON object matching this structure:
      {
        "classification": "accepted" | "rejected" | "other",
        "summary": "Brief 1-2 sentence summary of the email",
        "sentiment_score": number (0 to 100)
      }
    `;

    const analysis = await askJSON<ReplyAnalysis>(
      prompt, 
      "You are an assistant tracking job applications. Classify email replies accurately. Return JSON only."
    );

    let newStatus: ApplicationStatus | null = null;
    if (analysis.classification === 'accepted') {
      newStatus = 'interview_scheduled';
    } else if (analysis.classification === 'rejected') {
      newStatus = 'rejected';
    }

    const oldStatus = app.status;
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] [SIMULATED] Email Reply:\n${analysis.summary}\n\n${app.notes || ''}`;

    if (newStatus) {
      await updateApplicationStatusAndNotes(app.id, newStatus, newNote);
    } else {
      await updateApplicationNotes(app.id, newNote);
    }

    // Forward copy to the candidate
    await sendApplicationEmail({
      to: user.email,
      subject: `[Agent Forward] Reply from ${app.company_name}: Simulated Response`,
      body: `Hi ${user.name},\n\nWe detected a simulated incoming reply from ${app.company_name} for the position of ${app.job_title}.\n\nAI Summary: ${analysis.summary}\nNew Status: ${newStatus || oldStatus}\n\nJob Link: ${app.job?.url || 'N/A'}\n\nYou may return to the application anytime for interview preparation!\n\n-- Original Message --\nFrom: hr@${app.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com\nSubject: Job Application Update\n\n${replyText}`,
      userName: 'AI Job Agent',
      isSystemNotification: true
    });

    return { 
      success: true, 
      newStatus: newStatus || 'no_change', 
      summary: analysis.summary 
    };

  } catch (err: any) {
    return { success: false, newStatus: 'no_change', summary: '', error: err.message };
  }
}
