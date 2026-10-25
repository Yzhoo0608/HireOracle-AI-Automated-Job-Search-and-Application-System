import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDashboardStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const stats = await getDashboardStats(user.userId);
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
