import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { runJobSearch, runMatchAndRank } from '@/lib/agents/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const filters = await request.json();
    
    // Fallback to user's saved preferences if search inputs are empty
    const dbUser = await getUserById(user.userId);
    const searchKeywords = (filters.keywords && filters.keywords.length > 0)
      ? filters.keywords
      : (dbUser?.preferences?.job_titles?.length ? dbUser.preferences.job_titles : (dbUser?.preferences?.industries || []));
    const searchLocation = filters.location || dbUser?.preferences?.location || '';

    const effectiveFilters = {
      keywords: searchKeywords,
      location: searchLocation,
      remote: filters.remote ?? filters.isRemote ?? (dbUser?.preferences?.remote_preference === 'remote')
    };

    await runJobSearch(user.userId, effectiveFilters);
    const matches = await runMatchAndRank(user.userId);

    return NextResponse.json({ success: true, data: matches });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
