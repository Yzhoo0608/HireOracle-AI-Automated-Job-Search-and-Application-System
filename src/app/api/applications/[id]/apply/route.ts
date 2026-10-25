import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getApplicationById, getJobById, getCVProfile, getUserById, createEmailLog, getDb } from '@/lib/db';
import { generateCoverLetter, saveTextAsPDF } from '@/lib/agents/cover-letter-agent';
import { sendApplicationEmail } from '@/lib/agents/email-agent';
import path from 'path';
import fs from 'fs/promises';

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

    // Generate cover letter PDF file
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const coverLetterPath = path.join(uploadsDir, `${authUser.userId}-${Date.now()}-cover-letter.pdf`);
    await saveTextAsPDF(coverLetter, coverLetterPath);

    const targetEmail = app.email_sent_to || `hr@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    // 2. Send Email
    const emailResult = await sendApplicationEmail({
      to: targetEmail,
      cc: user.email,
      subject: emailSubject,
      body: emailBody,
      cvPath: cv.file_path,
      coverLetterPath: coverLetterPath,
      userName: user.name
    });

    // 3. Log Email
    await createEmailLog({
      user_id: user.id,
      application_id: app.id,
      to_email: targetEmail,
      subject: emailSubject,
      body: emailBody,
      status: emailResult.success ? 'sent' : 'failed'
    });
    
    if (!emailResult.success) {
      return NextResponse.json({ success: false, error: emailResult.error }, { status: 500 });
    }

    // 4. Update Database Application row with cover letter and email target
    const db = getDb();
    await db.query(
      'UPDATE applications SET cover_letter = $1, status = $2, email_sent_to = $3 WHERE id = $4',
      [coverLetter, 'applied', targetEmail, app.id]
    );

    return NextResponse.json({ success: true, data: { coverLetter } });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
