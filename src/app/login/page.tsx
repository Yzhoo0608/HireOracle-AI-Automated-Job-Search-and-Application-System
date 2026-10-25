'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type LoginView = 'password' | 'otp-email' | 'otp-verify';

function LoginContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

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
          <img src="/logo.png" alt="HireOracle" className="h-14 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-1">
            {view === 'otp-verify' ? 'Check your email' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 text-sm">
            {view === 'otp-verify' ? 'We sent a verification code to your email' : 'Sign in to your HireOracle account'}
          </p>
        </div>

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

              <Button 
                type="button" 
                variant="secondary" 
                className="w-full mt-4" 
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
