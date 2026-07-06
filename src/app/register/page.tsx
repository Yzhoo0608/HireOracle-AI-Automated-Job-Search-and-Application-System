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
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-slate-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10" gradientBorder>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent mx-auto flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <span className="text-2xl font-bold text-white">AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400">Start your automated job search journey</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-300">Nickname</label>
              <button 
                type="button" 
                onClick={generateNickname} 
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium"
              >
                🎲 Randomize
              </button>
            </div>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="e.g. SwiftWizard42"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full mt-6" size="lg" isLoading={loading}>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
