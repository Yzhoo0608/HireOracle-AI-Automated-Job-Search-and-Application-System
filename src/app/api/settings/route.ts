import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById, updateUserPreferences } from '@/lib/db';
import { runJobSearch, runMatchAndRank } from '@/lib/agents/orchestrator';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const user = await getUserById(authUser.userId);
    if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user.preferences });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    await updateUserPreferences(authUser.userId, body);

    // Automatically trigger background scraping and matching for the new preferences
    const filters = {
      location: body.location || '',
      keywords: body.job_titles?.length ? body.job_titles : (body.industries || [])
    };

    runJobSearch(authUser.userId, filters)
      .then(() => runMatchAndRank(authUser.userId))
      .catch(err => console.error('[Settings] Background search/match failed:', err));

    return NextResponse.json({ success: true, message: 'Preferences updated and job matching initiated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
