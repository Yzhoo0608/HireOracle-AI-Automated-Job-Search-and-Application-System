import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { getUserById, updateUserActiveStatus } from '@/backend/db';
import { runActivePipelineCycle, abortUserPipeline } from '@/backend/agents/orchestrator';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const user = await getUserById(authUser.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, active: !!user.is_active });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { active } = await request.json();
    
    await updateUserActiveStatus(authUser.userId, active);
    
    if (active) {
      // Trigger a pipeline cycle immediately in the background
      runActivePipelineCycle(authUser.userId).catch(err => {
        console.error('[Orchestrator] Error running immediate cycle:', err);
      });
    } else {
      // Stop pipeline clicked -> instantly cancel any active loop in progress
      abortUserPipeline(authUser.userId);
    }

    return NextResponse.json({ success: true, active });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
