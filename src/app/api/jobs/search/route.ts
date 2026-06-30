import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { runJobSearch, runMatchAndRank } from '@/lib/agents/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const filters = await request.json();
    
    await runJobSearch(user.userId, filters);
    const matches = await runMatchAndRank(user.userId);

    return NextResponse.json({ success: true, data: matches });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
