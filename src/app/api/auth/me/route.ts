import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { startActivePipelineTimer } from '@/lib/agents/orchestrator';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const user = await getUserById(authUser.userId);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Start background loop timer if not already started
    try {
      startActivePipelineTimer();
    } catch (e) {
      console.error('[AuthMe] Failed to start active pipeline timer:', e);
    }

    return NextResponse.json({ 
      success: true, 
      data: { id: user.id, email: user.email, name: user.name, preferences: user.preferences, is_active: user.is_active } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
