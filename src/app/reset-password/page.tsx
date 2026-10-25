'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hasToken = !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md relative z-10 bg-white border border-slate-200 shadow-sm" gradientBorder>
        <div className="text-center mb-8">
          <img src="/logo.png" alt="HireOracle" className="h-14 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-1">Set New Password</h1>
          <p className="text-slate-500 text-sm">Enter your new password below</p>
        </div>

        {!hasToken && (
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-6">
              Invalid or missing reset token. Please request a new link.
            </div>
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500 font-medium">
              Request New Link
            </Link>
          </div>
        )}

        {hasToken && error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        {hasToken && success ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm mb-6">
              Password has been successfully reset!
            </div>
            <Link href="/login" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 font-medium transition-colors">
              Go to Login
            </Link>
          </div>
        ) : hasToken && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium" size="lg" isLoading={loading}>
              Reset Password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-4 bg-background">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
