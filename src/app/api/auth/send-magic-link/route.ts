import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createMagicLinkToken } from '@/lib/db';
import { sendApplicationEmail } from '@/lib/agents/email-agent';

function generateOTP(): string {
  // Generate a 6-digit numeric OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ success: true, message: 'If an account exists, a verification code has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    // Store OTP as the token in magic_links table
    await createMagicLinkToken(user.id, otp, expiresAt);

    await sendApplicationEmail({
      to: user.email,
      subject: `${otp} is your HireOracle verification code`,
      body: `Hi ${user.name || 'there'},\n\nYour verification code is:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
      userName: 'HireOracle Security',
      isSystemNotification: true
    });

    return NextResponse.json({ success: true, message: 'If an account exists, a verification code has been sent.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
