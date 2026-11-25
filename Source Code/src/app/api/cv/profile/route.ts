import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { getCVProfile } from '@/backend/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const profile = await getCVProfile(user.userId);
    
    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
