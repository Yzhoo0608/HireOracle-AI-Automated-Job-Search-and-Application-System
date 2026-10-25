import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash || ''))) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // If user must change their password (used temp password)
    if (user.force_password_change) {
      const tempToken = jwt.sign({ userId: user.id, email: user.email, scope: 'change_password' }, JWT_SECRET, { expiresIn: '15m' });
      return NextResponse.json({ success: true, requirePasswordChange: true, tempToken });
    }

    const token = generateToken({ userId: user.id, email: user.email });
    const response = NextResponse.json({
      success: true,
      data: { user: { id: user.id, email: user.email, name: user.name } },
    });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
