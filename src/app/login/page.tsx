'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
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
        window.location.href = '/';
      } else {
        setError(data.error || 'Login failed');
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
          <h1 className="text-xl font-bold text-slate-800 mb-1">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Sign in to your HireOracle account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-500 transition-colors font-medium">
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  );
}
