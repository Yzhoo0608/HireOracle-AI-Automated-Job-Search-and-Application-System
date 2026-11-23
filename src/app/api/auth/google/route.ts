import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = request.nextUrl.origin || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!clientId || clientId.trim() === '' || clientId === 'your_google_client_id_here') {
    // If Google OAuth credentials are not set in .env.local yet, guide the user
    return NextResponse.redirect(`${origin}/login?google_not_configured=true`);
  }

  // Official Google OAuth 2.0 authorization URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account'); // Shows the "Choose an account" screen (Photo 3)
  googleAuthUrl.searchParams.set('state', mode);

  return NextResponse.redirect(googleAuthUrl.toString());
}
