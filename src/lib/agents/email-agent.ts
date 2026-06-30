import nodemailer from 'nodemailer';
import path from 'path';

export async function sendApplicationEmail(options: { 
  to: string; 
  subject: string; 
  body: string; 
  cvPath?: string; 
  userName: string 
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

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${options.userName}" <${user}>`,
      to: options.to,
      subject: options.subject,
      text: options.body,
    };

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
