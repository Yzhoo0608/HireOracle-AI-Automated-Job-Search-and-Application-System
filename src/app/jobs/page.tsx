'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MatchScore } from '@/components/ui/MatchScore';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Search, MapPin, Building, Globe } from 'lucide-react';
import type { JobMatch } from '@/lib/types';

export default function JobsPage() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filters, setFilters] = useState({ keywords: '', location: '', remote: false });
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setMatches(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Split keywords by comma
      const keywordList = filters.keywords.split(',').map(k => k.trim()).filter(k => k);
      
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywordList,
          location: filters.location,
          isRemote: filters.remote
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast('Search completed! Found new matches.', 'success');
        fetchJobs(); // Refresh the list
      } else {
        toast(data.error || 'Search failed', 'error');
      }
    } catch (error) {
      toast('An error occurred during search', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (matchId: string) => {
    toast('Generating cover letter & applying...', 'info');
    try {
      const match = matches.find(m => m.id === matchId);
      const res = await fetch(`/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: match?.job_id,
          company_name: match?.job?.company,
          job_title: match?.job?.title,
          status: 'applied',
          date_applied: new Date().toISOString(),
          match_score: match?.overall_score
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.error || 'Failed to track application', 'error');
        return;
      }

      const appId = data.data.id;

      // Trigger cover letter generation, email dispatch, and status updates
      const applyRes = await fetch(`/api/applications/${appId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customNotes: '' })
      });
      const applyData = await applyRes.json();
      
      if (applyData.success) {
        toast('Application sent and tracked successfully!', 'success');
        fetchJobs(); // Refresh match lists
      } else {
        toast(applyData.error || 'Failed to send application email', 'error');
      }
    } catch (e) {
      toast('Failed to apply', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <Card gradientBorder className="p-1">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Job titles, keywords, or skills (comma separated)" 
              value={filters.keywords}
              onChange={e => setFilters({...filters, keywords: e.target.value})}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:w-64 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="City, state, or zip" 
              value={filters.location}
              onChange={e => setFilters({...filters, location: e.target.value})}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center px-4 bg-white border border-slate-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
              <input 
                type="checkbox" 
                checked={filters.remote}
                onChange={e => setFilters({...filters, remote: e.target.checked})}
                className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500 bg-white"
              />
              <Globe size={16} className="text-slate-400" /> Remote Only
            </label>
          </div>
          <Button type="submit" size="lg" isLoading={loading} className="md:w-32 bg-blue-600 hover:bg-blue-500 text-white font-medium">
            Search
          </Button>
        </form>
      </Card>

      {initialLoading ? (
        <div className="flex justify-center py-20 text-slate-400">Loading jobs...</div>
      ) : matches.length === 0 ? (
        <Card className="text-center py-20">
          <Search className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No jobs found yet</h3>
          <p className="text-slate-500">Adjust your search filters and hit Search to find matches.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id} className="group transition-all duration-300 hover:shadow-blue-500/5 hover:border-blue-500/40">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        <a href={match.job?.url} target="_blank" rel="noopener noreferrer">{match.job?.title}</a>
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Building size={14} /> {match.job?.company}</span>
                        <span className="flex items-center gap-1"><MapPin size={14} /> {match.job?.location}</span>
                        {match.job?.salary && (
                          <span className="text-emerald-600 font-mono">{match.job?.salary}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mt-4 line-clamp-2 leading-relaxed">
                    {match.job?.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {match.skill_gaps && match.skill_gaps.map((gap, i) => (
                      <Badge key={i} variant="warning">Missing: {gap}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between md:border-l border-slate-100 md:pl-6 shrink-0">
                  <div className="text-center mb-4 md:mb-0">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Match Score</p>
                    <MatchScore score={match.overall_score} />
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full mt-4">
                    <Button onClick={() => handleApply(match.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium">
                      Auto-Apply
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
