import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getJobMatchesByUser, getAcceptedJobMatches } from '@/lib/db';

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
    }
    
    return NextResponse.json({ success: true, data: matches });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
