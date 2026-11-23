import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUserPassword, setForcePasswordChange } from '@/backend/db';
import { sendApplicationEmail } from '@/backend/agents/email-agent';
import { hashPassword } from '@/backend/auth';

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

    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);
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
      body: `Hi ${user.name || 'there'},\n\nA temporary password has been generated for your account:\n\n${tempPassword}\n\nPlease log in using this temporary password (case-sensitive, enter without leading or trailing spaces). You will be required to set a new password immediately after logging in.\n\nThis temporary password can only be used once.\n\nIf you did not request this, please contact support immediately.`,
      userName: 'HireOracle Security',
      isSystemNotification: true,
    });

    const response = NextResponse.json({ success: true, message: 'A temporary password has been sent to your email.' });
    response.cookies.delete('auth_token');
    return response;
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
