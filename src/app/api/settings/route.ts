import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById, updateUserPreferences } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const user = getUserById(authUser.userId);
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
    updateUserPreferences(authUser.userId, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
