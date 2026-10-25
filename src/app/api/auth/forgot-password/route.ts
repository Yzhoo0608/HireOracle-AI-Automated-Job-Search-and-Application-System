import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUserPassword, setForcePasswordChange } from '@/lib/db';
import { sendApplicationEmail } from '@/lib/agents/email-agent';
import { hashPassword } from '@/lib/auth';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists, a temporary password has been sent.' });
    }

    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    await updateUserPassword(user.id, hashed);
    await setForcePasswordChange(user.id, true);

    await sendApplicationEmail({
      to: user.email,
      subject: 'Your temporary password — HireOracle',
      body: `Hi ${user.name || 'there'},\n\nA temporary password has been generated for your account:\n\n  ${tempPassword}\n\nPlease log in with this temporary password. You will be asked to set a new password immediately after logging in.\n\nThis temporary password can only be used once.\n\nIf you did not request this, please contact support immediately.`,
      userName: 'HireOracle Security',
      isSystemNotification: true,
    });

    return NextResponse.json({ success: true, message: 'A temporary password has been sent to your email.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
