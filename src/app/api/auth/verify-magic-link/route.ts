import { NextRequest, NextResponse } from 'next/server';
import { getMagicLinkToken, deleteMagicLinkToken, getUserById } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ success: false, error: 'Email and verification code are required' }, { status: 400 });
    }

    // Look up the OTP token
    const tokenRecord = await getMagicLinkToken(code);

    if (!tokenRecord) {
      return NextResponse.json({ success: false, error: 'Invalid verification code' }, { status: 400 });
    }

    if (new Date() > tokenRecord.expires_at) {
      await deleteMagicLinkToken(code);
      return NextResponse.json({ success: false, error: 'Code has expired. Please request a new one.' }, { status: 400 });
    }

    const user = await getUserById(tokenRecord.user_id);
    if (!user) {
      await deleteMagicLinkToken(code);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 400 });
    }

    // Verify the email matches the user who requested the OTP
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Invalid verification code' }, { status: 400 });
    }

    // Generate session token and clean up
    const sessionToken = generateToken({ userId: user.id, email: user.email });
    await deleteMagicLinkToken(code);

    const response = NextResponse.json({
      success: true,
      data: { user: { id: user.id, email: user.email, name: user.name } }
    });

    response.cookies.set('auth_token', sessionToken, {
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
