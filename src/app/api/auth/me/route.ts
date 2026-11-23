import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { getUserById, updateUserName } from '@/backend/db';
import { startActivePipelineTimer } from '@/backend/agents/orchestrator';

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
      data: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        preferences: user.preferences, 
        is_active: user.is_active,
        force_password_change: user.force_password_change === true
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 60) {
      return NextResponse.json({ success: false, error: 'Name cannot exceed 60 characters' }, { status: 400 });
    }

    await updateUserName(authUser.userId, trimmedName);

    return NextResponse.json({
      success: true,
      message: 'Name updated successfully',
      data: { name: trimmedName }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.message?.includes('Unauthorized') ? 401 : 500 });
  }
}

