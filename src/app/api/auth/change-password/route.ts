import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hashPassword } from '@/lib/auth';
import { updateUserPassword } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await updateUserPassword(authUser.userId, passwordHash);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
