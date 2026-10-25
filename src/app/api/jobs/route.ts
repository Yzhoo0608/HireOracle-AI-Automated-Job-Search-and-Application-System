import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getJobMatchesByUser, getAcceptedJobMatches, getUnmatchedJobsForUser } from '@/lib/db';
import { runMatchAndRank } from '@/lib/agents/orchestrator';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const acceptedOnly = searchParams.get('acceptedOnly') === 'true';
    
    let matches;
    if (acceptedOnly) {
      matches = await getAcceptedJobMatches(user.userId);
    } else {
      const minScore = parseInt(searchParams.get('minScore') || '0', 10);
      matches = await getJobMatchesByUser(user.userId, minScore);

      // If user has 0 matches yet, check if there are active jobs in the DB and score them
      if (matches.length === 0) {
        const unmatched = await getUnmatchedJobsForUser(user.userId);
        if (unmatched.length > 0) {
          try {
            matches = await runMatchAndRank(user.userId);
          } catch (e: any) {
            console.warn('[Jobs API] Auto-match on visit failed:', e.message);
          }
        }
      }
    }
    
    return NextResponse.json({ success: true, data: matches });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
