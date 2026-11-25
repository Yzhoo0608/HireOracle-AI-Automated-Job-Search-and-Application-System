import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/backend/auth';
import { findExistingGoogleUser, createGoogleUser, setForcePasswordChange } from '@/backend/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const mode = searchParams.get('state') === 'register' ? 'register' : 'login';
  const origin = request.nextUrl.origin || 'http://localhost:3000';
  const targetPage = mode === 'register' ? 'register' : 'login';

  if (error) {
    return NextResponse.redirect(`${origin}/${targetPage}?error=${encodeURIComponent('Google authentication was cancelled: ' + error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/${targetPage}?error=Missing+Google+authorization+code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?google_not_configured=true`);
  }

  try {
    // 1. Exchange authorization code for Google access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Google OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(
        `${origin}/${targetPage}?error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'Failed to exchange authorization token with Google')}`
      );
    }

    // 2. Fetch user profile from Google UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userRes.json();
    if (!userRes.ok || !userInfo.email) {
      console.error('[Google OAuth] UserInfo request failed:', userInfo);
      return NextResponse.redirect(`${origin}/${targetPage}?error=Failed+to+retrieve+Google+profile+details`);
    }

    // 3. Find or register depending on mode
    let user = await findExistingGoogleUser({
      googleId: userInfo.sub,
      email: userInfo.email,
    });

    if (mode === 'login') {
      if (!user) {
        // User does not exist in the database! Deny login and guide them to register.
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('No HireOracle account found with ' + userInfo.email + '. Please create an account first.')}`
        );
      }
    } else {
      // mode === 'register'
      if (!user) {
        user = await createGoogleUser({
          googleId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
        });
      }
    }

    await setForcePasswordChange(user.id, false);

    // 4. Issue session JWT auth token
    const token = generateToken({ userId: user.id, email: user.email });

    // 5. Set session cookie and redirect to dashboard
    const response = NextResponse.redirect(`${origin}/`);
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('[Google OAuth] Callback exception:', err);
    return NextResponse.redirect(`${origin}/${targetPage}?error=${encodeURIComponent(err.message || 'An error occurred during Google authentication')}`);
  }
}
