'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const adjectives = ['Swift', 'Clever', 'Stellar', 'Sharp', 'Mighty', 'Curious', 'Epic', 'Dynamic', 'Vibrant', 'Valiant'];
  const nouns = ['Wizard', 'Coder', 'Analyst', 'Ninja', 'Hustler', 'Explorer', 'Leader', 'Developer', 'Maven', 'Pioneer'];

  const generateNickname = () => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    setName(`${adj}${noun}${num}`);
  };

  React.useEffect(() => {
    generateNickname();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      
      if (data.success) {
        window.location.href = '/';
      } else {
        setError(data.error || 'Registration failed');
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
          <h1 className="text-xl font-bold text-slate-800 mb-1">Create Account</h1>
          <p className="text-slate-500 text-sm">Start your automated job search journey</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-600">Nickname</label>
              <button 
                type="button" 
                onClick={generateNickname} 
                className="text-xs text-blue-600 hover:text-blue-500 transition-colors flex items-center gap-1 font-medium"
              >
                🎲 Randomize
              </button>
            </div>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="e.g. SwiftWizard42"
              required
            />
          </div>

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
            <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium" size="lg" isLoading={loading}>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500 transition-colors font-medium">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
