import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { getApplicationById, updateApplicationStatus, getUserById } from '@/backend/db';
import { sendApplicationEmail } from '@/backend/agents/email-agent';

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
    
    // Auto-notify user on interview asynchronously (non-blocking)
    if (status === 'interview_scheduled') {
      getUserById(user.userId).then((fullUser) => {
        if (fullUser) {
          sendApplicationEmail({
            to: fullUser.email,
            subject: `Interview Scheduled for ${app.job_title} at ${app.company_name}`,
            body: `Congratulations ${fullUser.name}!\n\nYou have an interview scheduled for the ${app.job_title} position at ${app.company_name}.\n\nPlease come to the AI Job Agent app to practice your interview: http://localhost:3000/interview\n\nGood luck!`,
            userName: 'AI Job Agent',
            isSystemNotification: true
          }).catch((err) => console.error('[Interview Email Notification Error]:', err));
        }
      }).catch((err) => console.error('[Interview User Fetch Error]:', err));
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
