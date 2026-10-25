import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { simulateCompanyReply } from '@/lib/agents/reply-agent';
import { getApplicationById } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    
    const { applicationId, replyText } = await request.json();
    if (!applicationId || !replyText) {
      return NextResponse.json({ success: false, error: 'applicationId and replyText are required' }, { status: 400 });
    }

    const app = await getApplicationById(applicationId);
    if (!app || app.user_id !== authUser.userId) {
      return NextResponse.json({ success: false, error: 'Application not found or unauthorized' }, { status: 404 });
    }

    const result = await simulateCompanyReply(applicationId, replyText);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        newStatus: result.newStatus,
        summary: result.summary
      }
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
