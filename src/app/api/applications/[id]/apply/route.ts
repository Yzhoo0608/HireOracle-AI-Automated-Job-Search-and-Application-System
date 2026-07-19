import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getApplicationById, getJobById, getCVProfile, getUserById, createEmailLog } from '@/lib/db';
import { generateCoverLetter } from '@/lib/agents/cover-letter-agent';
import { sendApplicationEmail } from '@/lib/agents/email-agent';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    const resolvedParams = await params;
    const app = await getApplicationById(resolvedParams.id);
    
    if (!app || app.user_id !== authUser.userId) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const job = await getJobById(app.job_id);
    const cv = await getCVProfile(authUser.userId);
    const user = await getUserById(authUser.userId);

    if (!job || !cv || !user) {
      return NextResponse.json({ success: false, error: 'Missing job, CV, or user data' }, { status: 400 });
    }

    const { customNotes } = await request.json();

    // 1. Generate Cover Letter & Email
    const { coverLetter, emailSubject, emailBody } = await generateCoverLetter(cv.structured_data, job, customNotes);

    // 2. Send Email
    if (app.email_sent_to) {
      const emailResult = await sendApplicationEmail({
        to: app.email_sent_to,
        cc: user.email,
        subject: emailSubject,
        body: emailBody,
        cvPath: cv.file_path,
        userName: user.name
      });

      // 3. Log Email
      await createEmailLog({
        user_id: user.id,
        application_id: app.id,
        to_email: app.email_sent_to,
        subject: emailSubject,
        body: emailBody,
        status: emailResult.success ? 'sent' : 'failed'
      });
      
      if (!emailResult.success) {
        return NextResponse.json({ success: false, error: emailResult.error }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: { coverLetter } });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
