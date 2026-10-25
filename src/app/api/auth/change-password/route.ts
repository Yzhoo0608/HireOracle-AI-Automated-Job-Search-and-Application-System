import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { updateUserPassword, setForcePasswordChange, getUserById } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export async function POST(request: NextRequest) {
  try {
    const { tempToken, newPassword } = await request.json();

    if (!tempToken || !newPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    let payload: any;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, error: 'Session expired. Please request a new temporary password.' }, { status: 401 });
    }

    if (payload.scope !== 'change_password') {
      return NextResponse.json({ success: false, error: 'Invalid token scope' }, { status: 401 });
    }

    const hashed = await hashPassword(newPassword);
    await updateUserPassword(payload.userId, hashed);
    await setForcePasswordChange(payload.userId, false);

    const user = await getUserById(payload.userId);
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
