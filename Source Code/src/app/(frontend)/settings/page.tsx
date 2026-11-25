'use client';

import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Card } from '@/frontend/components/ui/Card';
import { Button } from '@/frontend/components/ui/Button';
import { useToast } from '@/frontend/components/ui/Toast';
import type { UserPreferences } from '@/shared/types';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    location: '',
    job_type: 'any',
    remote_preference: 'any',
    job_titles: [],
    industries: [],
    salary_min: 0,
    salary_max: 0,
    experience_level: 'mid'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industriesInput, setIndustriesInput] = useState('');
  const { toast } = useToast();

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast('Password updated successfully!', 'success');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast(data.error || 'Failed to update password', 'error');
      }
    } catch {
      toast('An error occurred. Please try again.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setPreferences(res.data);
          setIndustriesInput(res.data.job_titles?.join(', ') || res.data.industries?.join(', ') || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const prefsToSave = {
      ...preferences,
      industries: industriesInput.split(',').map(i => i.trim()).filter(i => i),
      job_titles: industriesInput.split(',').map(i => i.trim()).filter(i => i)
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefsToSave)
      });
      const data = await res.json();
      
      if (data.success) {
        toast('Settings saved! Searching and matching jobs in background...', 'success');
      } else {
        toast(data.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      toast('An error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      {/* Job Search Preferences */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Job Search Preferences</h2>
        <form onSubmit={handleSave} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Target Location</label>
              <input 
                type="text" 
                value={preferences.location || ''}
                onChange={e => setPreferences({...preferences, location: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Kuala Lumpur, Selangor, Johor (or leave empty for nationwide)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Remote/Work Mode Preference</label>
              <select 
                value={preferences.remote_preference || 'any'}
                onChange={e => setPreferences({...preferences, remote_preference: e.target.value as any})}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid Allowed</option>
                <option value="onsite">On-site Only</option>
                <option value="any">Open to All</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Target Job Titles</label>
              <input 
                type="text" 
                value={industriesInput}
                onChange={e => setIndustriesInput(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Software Engineer, Data Scientist"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Job Type Preference</label>
              <select 
                value={preferences.job_type || 'any'}
                onChange={e => setPreferences({...preferences, job_type: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="any">Any</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Min Salary</label>
              <input 
                type="number" 
                value={preferences.salary_min || 0}
                onChange={e => setPreferences({
                  ...preferences, 
                  salary_min: Number(e.target.value)
                })}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Max Salary</label>
              <input 
                type="number" 
                value={preferences.salary_max || 0}
                onChange={e => setPreferences({
                  ...preferences, 
                  salary_max: Number(e.target.value)
                })}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium" isLoading={saving}>Save Preferences</Button>
          </div>
        </form>
      </Card>

      {/* Account & Password Security */}
      <Card id="security">
        <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
          <Lock className="text-blue-600" size={18} />
          <h2 className="text-lg font-semibold text-slate-800">Change Password & Security</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Update your account password to ensure your account remains secure.
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none text-sm"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none text-sm"
              minLength={6}
            />
          </div>

          <div>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm" 
              isLoading={passwordLoading}
              disabled={!newPassword || !confirmPassword}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Email Configuration</h2>
        <p className="text-sm text-slate-600 mb-4">
          To enable auto-applying, you must configure your SMTP credentials in the environment variables (<code>.env.local</code>).
        </p>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-sm text-slate-600">
          EMAIL_USER=your_email@gmail.com<br/>
          EMAIL_APP_PASSWORD=****_****_****_****
        </div>
      </Card>
    </div>
  );
}
