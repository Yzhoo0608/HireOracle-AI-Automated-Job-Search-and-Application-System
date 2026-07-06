'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { MatchScore } from '@/components/ui/MatchScore';
import { Briefcase, FileText, CheckCircle, Search, Play, RefreshCw, ExternalLink } from 'lucide-react';
import type { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [checkingReplies, setCheckingReplies] = useState(false);
  const [userName, setUserName] = useState('');

  const getDynamicGreeting = (name: string) => {
    const hr = new Date().getHours();
    let greet = 'Hi';
    if (hr >= 5 && hr < 12) {
      greet = 'Good morning';
    } else if (hr >= 12 && hr < 17) {
      greet = 'Good afternoon';
    } else if (hr >= 17 && hr < 22) {
      greet = 'Good evening';
    } else {
      greet = 'Hi';
    }
    return `${greet}, ${name}!`;
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/applications/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserName(data.data.name);
        }
      })
      .catch(err => console.error(err));
  }, [fetchStats]);

  const handleAutoPilot = async () => {
    setRunning(true);
    setPipelineResult(null);
    try {
      const res = await fetch('/api/orchestrator/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPipelineResult(
          `✅ Pipeline complete! Found ${data.data.jobsFound} jobs, matched ${data.data.matched}, auto-applied to ${data.data.applied}.`
        );
      } else {
        setPipelineResult(`❌ Pipeline error: ${data.error}`);
      }
      await fetchStats();
    } catch (e: any) {
      setPipelineResult(`❌ Error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleCheckReplies = async () => {
    setCheckingReplies(true);
    setPipelineResult(null);
    try {
      const res = await fetch('/api/applications/check-replies', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const { processed, updates, errors } = data.data;
        if (updates.length > 0) {
          const updateMsgs = updates.map((u: any) => `${u.company} (${u.newStatus === 'interview_scheduled' ? 'Interview' : u.newStatus})`).join(', ');
          setPipelineResult(`✉️ Checked replies! Processed ${processed} new emails. Updated status for: ${updateMsgs}.`);
        } else {
          setPipelineResult(`✉️ Checked replies! Processed ${processed} new emails. No status updates.`);
        }
        if (errors.length > 0) {
          console.error('Mail check errors:', errors);
        }
      } else {
        setPipelineResult(`❌ Mail check error: ${data.error}`);
      }
      await fetchStats();
    } catch (e: any) {
      setPipelineResult(`❌ Error checking replies: ${e.message}`);
    } finally {
      setCheckingReplies(false);
    }
  };


  const updateStatus = async (appId: string, status: string) => {
    await fetch(`/api/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchStats();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Auto-Pilot Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {userName ? getDynamicGreeting(userName) : 'Dashboard'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Your AI job search overview</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckReplies}
            disabled={checkingReplies}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-md hover:scale-105 transition-all duration-200`}
          >
            {checkingReplies ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Checking Mail...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Check Replies
              </>
            )}
          </button>
          <button
            onClick={handleAutoPilot}
            disabled={running}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
              running
                ? 'bg-slate-700 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 shadow-lg hover:shadow-cyan-500/25 hover:scale-105'
            }`}
          >
            {running ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Running Pipeline...
              </>
            ) : (
              <>
                <Play size={16} />
                Start Auto-Pilot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pipeline Result Banner */}
      {pipelineResult && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          pipelineResult.startsWith('✅')
            ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
            : 'bg-red-900/30 border-red-700/50 text-red-300'
        }`}>
          {pipelineResult}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Applications"
          value={stats.total_applications}
          icon={<Briefcase />}
        />
        <StatCard
          title="Jobs Found Today"
          value={stats.jobs_found_today}
          icon={<Search />}
        />
        <StatCard
          title="Interviews"
          value={stats.interviews_scheduled}
          icon={<CheckCircle />}
        />
        <StatCard
          title="Avg Match Score"
          value={`${stats.avg_match_score}%`}
          icon={<FileText />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Applications</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">Auto-applied to matches ≥ 70%</span>
          </div>
          {stats.recent_applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-2">No applications yet.</p>
              <p className="text-slate-500 text-sm">Upload your CV and click "Start Auto-Pilot" to begin!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {stats.recent_applications.map((app) => (
                    <tr 
                      key={app.id} 
                      className="hover:bg-slate-800/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedApp(app)}
                    >
                      <td className="py-3 font-medium text-slate-200">{app.company_name}</td>
                      <td className="py-3 text-slate-300 truncate max-w-[140px]">
                        {app.job?.url ? (
                          <a 
                            href={app.job.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {app.job_title}
                            <ExternalLink size={12} className="opacity-60" />
                          </a>
                        ) : (
                          app.job_title
                        )}
                      </td>
                      <td className="py-3 text-slate-400 text-xs">{new Date(app.date_applied).toLocaleDateString()}</td>
                      <td className="py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                        >
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="interview_scheduled">Interview ⭐</option>
                          <option value="offer_received">Offer 🎉</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Top Matches */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Top Matches</h2>
          </div>
          <div className="space-y-3">
            {stats.top_matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No matched jobs yet.</p>
              </div>
            ) : (
              stats.top_matches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                >
                  <MatchScore score={match.overall_score} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-200 truncate">{match.job?.title}</h4>
                    <p className="text-xs text-slate-400 truncate">{match.job?.company}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Status Pipeline */}
      {stats.total_applications > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Application Pipeline</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'applied', label: 'Applied', color: 'bg-blue-500' },
              { key: 'under_review', label: 'Under Review', color: 'bg-yellow-500' },
              { key: 'interview_scheduled', label: 'Interview', color: 'bg-violet-500' },
              { key: 'offer_received', label: 'Offer', color: 'bg-emerald-500' },
              { key: 'rejected', label: 'Rejected', color: 'bg-red-500' },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700/50">
                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                <span className="text-slate-300 text-sm font-medium">{label}</span>
                <span className="text-white font-bold ml-1">
                  {stats.status_counts[key as keyof typeof stats.status_counts] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}


      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl border-slate-700 relative">
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h2 className="text-xl font-bold text-white mb-1">{selectedApp.job_title}</h2>
            <p className="text-cyan-400 mb-2">{selectedApp.company_name}</p>
            
            {selectedApp.email_sent_to && (
              <div className="mb-4 bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3 text-sm">
                <p className="text-emerald-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span><strong>Auto-Applied:</strong> An email was automatically sent to {selectedApp.email_sent_to} with your CV attached!</span>
                </p>
              </div>
            )}
            
            {selectedApp.notes && (
              <div className="mb-4 max-h-40 overflow-y-auto pr-2">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Communication Logs & History</h3>
                <div className="bg-slate-900/40 rounded-lg p-3 text-xs text-slate-300 border border-slate-800/50 whitespace-pre-wrap font-mono">
                  {selectedApp.notes}
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto pr-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Cover Letter</h3>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap border border-slate-800 font-mono">
                {selectedApp.cover_letter || "No cover letter generated."}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(selectedApp.cover_letter || '');
                  alert('Cover letter copied to clipboard!');
                }}
              >
                Copy Cover Letter
              </Button>
              <Button
                variant="primary"
                onClick={() => setSelectedApp(null)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
