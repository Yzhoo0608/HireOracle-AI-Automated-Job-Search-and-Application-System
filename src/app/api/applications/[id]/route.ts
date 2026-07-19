import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getApplicationById, updateApplicationStatus, getUserById } from '@/lib/db';
import { sendApplicationEmail } from '@/lib/agents/email-agent';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;
    const app = await getApplicationById(resolvedParams.id);
    
    if (!app || app.user_id !== user.userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: app });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;
    const app = await getApplicationById(resolvedParams.id);
    
    if (!app || app.user_id !== user.userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    const { status } = await request.json();
    await updateApplicationStatus(resolvedParams.id, status);
    
    // Auto-notify user on interview
    if (status === 'interview_scheduled') {
      const fullUser = await getUserById(user.userId);
      if (fullUser) {
        await sendApplicationEmail({
          to: fullUser.email,
          subject: `Interview Scheduled for ${app.job_title} at ${app.company_name}`,
          body: `Congratulations ${fullUser.name}!\n\nYou have an interview scheduled for the ${app.job_title} position at ${app.company_name}.\n\nPlease come to the AI Job Agent app to practice your interview: http://localhost:3000/interview\n\nGood luck!`,
          userName: 'AI Job Agent'
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
