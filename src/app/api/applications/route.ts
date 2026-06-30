import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getApplicationsByUser, createApplication } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const apps = getApplicationsByUser(user.userId);
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
    
    const app = createApplication({
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
