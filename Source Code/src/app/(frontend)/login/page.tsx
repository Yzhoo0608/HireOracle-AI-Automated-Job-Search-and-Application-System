'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/frontend/components/ui/Card';
import { Button } from '@/frontend/components/ui/Button';
import { Logo } from '@/frontend/components/ui/Logo';

type LoginView = 'password' | 'otp-email' | 'otp-verify';

function LoginContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const googleNotConfigured = searchParams.get('google_not_configured') === 'true';

  const [view, setView] = useState<LoginView>('password');

  // Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP login state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(urlError || '');

  // Clear error when switching views
  useEffect(() => {
    setError('');
  }, [view]);

  // Sync error from OAuth or URL redirects
  useEffect(() => {
    if (urlError) {
      setError(urlError);
    }
  }, [urlError]);

  // ── Password Login ──
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.requirePasswordChange && data.tempToken) {
          // Redirect to change-password with tempToken in sessionStorage
          sessionStorage.setItem('change_password_token', data.tempToken);
          window.location.href = '/change-password';
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await res.json();

      if (data.success) {
        setView('otp-verify');
        setOtpDigits(['', '', '', '', '', '']);
        // Focus first input after render
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (overrideCode?: string) => {
    const code = overrideCode || otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, code }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = '/';
      } else {
        setError(data.error || 'Invalid verification code');
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Input Handlers ──
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1); // Take only last char
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        setTimeout(() => handleVerifyOtp(fullCode), 200);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    if (pasted.length === 6) {
      setTimeout(() => handleVerifyOtp(pasted), 200);
    } else {
      otpInputRefs.current[pasted.length]?.focus();
    }
  };

  // ── Resend Timer ──
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleResend = async () => {
    setResendCooldown(60);
    setError('');
    try {
      await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });
    } catch (err) {
      // silently fail
    }
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md relative z-10 bg-white border border-slate-200 shadow-sm" gradientBorder>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-5">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-1">
            {view === 'otp-verify' ? 'Check your email' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 text-sm">
            {view === 'otp-verify' ? 'We sent a verification code to your email' : 'Sign in to your HireOracle account'}
          </p>
        </div>

        {googleNotConfigured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs mb-4">
            <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>⚙️</span> Google OAuth Setup Required
            </p>
            <p className="text-slate-600 leading-relaxed">
              Please add your <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">GOOGLE_CLIENT_ID</code> and <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">GOOGLE_CLIENT_SECRET</code> to your <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">.env.local</code> file to enable Google sign-in.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        {/* ── Password View (Default) ── */}
        {view === 'password' && (
          <>
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-600">Password</label>
                  <a href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-500 font-medium">
                    Forgot Password?
                  </a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium" size="lg" isLoading={loading}>
                Sign In
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Or continue with</span>
                </div>
              </div>

              {/* Log in with Google button */}
              <a
                href="/api/auth/google?mode=login"
                className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs transition-all duration-200 hover:border-slate-300 hover:scale-[1.01]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Log in with Google</span>
              </a>

              <Button 
                type="button" 
                variant="secondary" 
                className="w-full mt-3" 
                onClick={() => setView('otp-email')}
              >
                Sign in with Email Code
              </Button>
            </div>
          </>
        )}

        {/* ── OTP Request Email View ── */}
        {view === 'otp-email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                value={otpEmail}
                onChange={e => setOtpEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <Button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-medium" size="lg" isLoading={loading}>
              Send Verification Code
            </Button>

            <div className="mt-4 text-center">
              <button 
                type="button"
                onClick={() => setView('password')}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Back to password login
              </button>
            </div>
          </form>
        )}

        {/* ── OTP Verification Code View ── */}
        {view === 'otp-verify' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-slate-600">
                We sent a 6-digit code to <span className="font-semibold text-slate-800">{otpEmail}</span>
              </p>
            </div>

            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { otpInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(index, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-white border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  style={{ caretColor: 'transparent' }}
                />
              ))}
            </div>

            <Button
              type="button"
              onClick={() => handleVerifyOtp()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
              size="lg"
              isLoading={loading}
            >
              Verify & Sign In
            </Button>

            <div className="flex items-center justify-between text-sm px-1">
              <button
                onClick={() => { setView('otp-email'); setOtpDigits(['', '', '', '', '', '']); setError(''); }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Change email
              </button>
              {resendCooldown > 0 ? (
                <span className="text-slate-400">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-500 transition-colors font-medium">
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-4 bg-background">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <LoginContent />
    </React.Suspense>
  );
}
