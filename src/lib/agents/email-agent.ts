import nodemailer from 'nodemailer';
import path from 'path';

export async function sendApplicationEmail(options: { 
  to: string; 
  cc?: string;
  subject: string; 
  body: string; 
  cvPath?: string; 
  userName: string;
  isSystemNotification?: boolean;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return { success: false, error: 'Email credentials not configured in environment variables.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass
      }
    });

    const redirect = process.env.EMAIL_REDIRECT;
    const isRedirectActive = redirect && !options.isSystemNotification;
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${options.userName}" <${user}>`,
      to: isRedirectActive ? redirect : options.to,
      subject: options.subject,
      text: options.body,
    };

    if (options.cc) {
      mailOptions.cc = options.cc;
    }

    if (options.cvPath) {
      mailOptions.attachments = [
        {
          filename: path.basename(options.cvPath),
          path: options.cvPath
        }
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}
