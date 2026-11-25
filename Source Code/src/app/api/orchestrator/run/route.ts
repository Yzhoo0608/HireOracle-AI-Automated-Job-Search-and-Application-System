import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { runFullPipeline } from '@/backend/agents/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const results = await runFullPipeline(user.userId);
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
