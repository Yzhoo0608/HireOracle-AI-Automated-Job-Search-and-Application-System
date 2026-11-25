import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken, JWT_SECRET, getAuthUser } from '@/backend/auth';
import { updateUserPassword, setForcePasswordChange, getUserById } from '@/backend/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { tempToken, newPassword } = await request.json();

    const cleanNewPassword = typeof newPassword === 'string' ? newPassword.trim() : '';

    if (!cleanNewPassword) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    if (cleanNewPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    let targetUserId: string | null = null;

    if (tempToken) {
      let payload: any;
      try {
        payload = jwt.verify(tempToken, JWT_SECRET);
      } catch {
        return NextResponse.json({ success: false, error: 'Session expired. Please request a new temporary password.' }, { status: 401 });
      }

      if (payload.scope !== 'change_password') {
        return NextResponse.json({ success: false, error: 'Invalid token scope' }, { status: 401 });
      }
      targetUserId = payload.userId;
    } else {
      const authUser = await getAuthUser();
      if (!authUser) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      targetUserId = authUser.userId;
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized user' }, { status: 401 });
    }

    const hashed = await hashPassword(cleanNewPassword);
    await updateUserPassword(targetUserId, hashed);
    await setForcePasswordChange(targetUserId, false);

    const user = await getUserById(targetUserId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Issue full session token
    const token = generateToken({ userId: user.id, email: user.email });
    const response = NextResponse.json({ success: true, data: { user: { id: user.id, email: user.email, name: user.name } } });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
