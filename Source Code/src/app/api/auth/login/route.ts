import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, JWT_SECRET } from '@/backend/auth';
import { getUserByEmail } from '@/backend/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const rawPass = typeof password === 'string' ? password : '';
    const trimmedPass = rawPass.trim();
    let isMatch = await verifyPassword(rawPass, user.password_hash || '');
    if (!isMatch && trimmedPass !== rawPass) {
      isMatch = await verifyPassword(trimmedPass, user.password_hash || '');
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // If user must change their password (used temp password)
    if (user.force_password_change) {
      const tempToken = jwt.sign({ userId: user.id, email: user.email, scope: 'change_password' }, JWT_SECRET, { expiresIn: '15m' });
      const response = NextResponse.json({ success: true, requirePasswordChange: true, tempToken });
      response.cookies.delete('auth_token');
      return response;
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
