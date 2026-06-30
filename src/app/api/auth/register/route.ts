import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { createUser, getUserByEmail } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (getUserByEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(email, passwordHash, name);
    const token = generateToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({ 
      success: true, 
      data: { user: { id: user.id, email: user.email, name: user.name } } 
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
