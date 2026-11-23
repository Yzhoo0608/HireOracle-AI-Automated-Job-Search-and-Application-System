import { NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/auth';
import { updateUserActiveStatus } from '@/backend/db';
import { abortUserPipeline } from '@/backend/agents/orchestrator';

export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (authUser?.userId) {
      // 1. Immediately abort any in-flight active pipeline cycle
      abortUserPipeline(authUser.userId);
      // 2. Ensure pipeline is stopped in DB so background timer doesn't run while logged out
      await updateUserActiveStatus(authUser.userId, false);
    }
  } catch (e: any) {
    console.error('[Logout] Error stopping user pipeline on logout:', e.message);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
