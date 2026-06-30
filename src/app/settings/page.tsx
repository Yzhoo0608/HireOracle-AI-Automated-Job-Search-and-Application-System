'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { UserPreferences } from '@/lib/types';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    location: '',
    remote_preference: 'remote',
    industries: [],
    salary_min: 0,
    salary_max: 0,
    experience_level: 'mid'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industriesInput, setIndustriesInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setPreferences(res.data);
          setIndustriesInput(res.data.industries?.join(', ') || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const prefsToSave = {
      ...preferences,
      industries: industriesInput.split(',').map(i => i.trim()).filter(i => i)
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefsToSave)
      });
      const data = await res.json();
      
      if (data.success) {
        toast('Settings saved successfully', 'success');
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
      <h1 className="text-2xl font-bold text-white mb-6">System Settings</h1>

      <Card>
        <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Job Search Preferences</h2>
        <form onSubmit={handleSave} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Location</label>
              <input 
                type="text" 
                value={preferences.location || ''}
                onChange={e => setPreferences({...preferences, location: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="e.g. New York, NY"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Remote Preference</label>
              <select 
                value={preferences.remote_preference || 'any'}
                onChange={e => setPreferences({...preferences, remote_preference: e.target.value as any})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              >
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid Allowed</option>
                <option value="onsite">On-site Only</option>
                <option value="any">Open to All</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Target Industries / Keywords</label>
            <input 
              type="text" 
              value={industriesInput}
              onChange={e => setIndustriesInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              placeholder="e.g. FinTech, Healthcare, Machine Learning (comma separated)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Min Salary</label>
              <input 
                type="number" 
                value={preferences.salary_min || 0}
                onChange={e => setPreferences({
                  ...preferences, 
                  salary_min: Number(e.target.value)
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Max Salary</label>
              <input 
                type="number" 
                value={preferences.salary_max || 0}
                onChange={e => setPreferences({
                  ...preferences, 
                  salary_max: Number(e.target.value)
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700 flex justify-end">
            <Button type="submit" isLoading={saving}>Save Preferences</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Email Configuration</h2>
        <p className="text-sm text-slate-400 mb-4">
          To enable auto-applying, you must configure your SMTP credentials in the environment variables (<code>.env.local</code>).
        </p>
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 font-mono text-sm text-slate-300">
          EMAIL_USER=your_email@gmail.com<br/>
          EMAIL_APP_PASSWORD=****_****_****_****
        </div>
      </Card>
    </div>
  );
}
