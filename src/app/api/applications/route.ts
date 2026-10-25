import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getApplicationsByUser, createApplication, checkDuplicateApplication } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const apps = await getApplicationsByUser(user.userId);
    return NextResponse.json({ success: true, data: apps });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    if (body.job_id) {
      const isDuplicate = await checkDuplicateApplication(user.userId, body.job_id);
      if (isDuplicate) {
        const apps = await getApplicationsByUser(user.userId);
        const existing = apps.find(a => a.job_id === body.job_id);
        if (existing) {
          return NextResponse.json({ success: true, data: existing });
        }
      }
    }

    const app = await createApplication({
      ...body,
      user_id: user.userId
    });
    
    return NextResponse.json({ success: true, data: app });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
