'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Building, Calendar, ChevronRight, ExternalLink } from 'lucide-react';
import type { Application } from '@/lib/types';

type Pipeline = Record<string, Application[]>;

export default function ApplicationsPage() {
  const [pipeline, setPipeline] = useState<Pipeline>({
    applied: [],
    under_review: [],
    interview_scheduled: [],
    offer_received: [],
    rejected: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        const newPipeline: Pipeline = {
          applied: [], under_review: [], interview_scheduled: [], offer_received: [], rejected: []
        };
        data.data.forEach((app: Application) => {
          if (newPipeline[app.status]) {
            newPipeline[app.status].push(app);
          }
        });
        setPipeline(newPipeline);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast('Status updated', 'success');
        fetchApps();
      }
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const columns = [
    { id: 'applied', title: 'Applied', color: 'border-blue-500/30 bg-blue-500/5' },
    { id: 'under_review', title: 'Under Review', color: 'border-purple-500/30 bg-purple-500/5' },
    { id: 'interview_scheduled', title: 'Interview', color: 'border-yellow-500/30 bg-yellow-500/5' },
    { id: 'offer_received', title: 'Offer', color: 'border-green-500/30 bg-green-500/5' },
    { id: 'rejected', title: 'Rejected', color: 'border-red-500/30 bg-red-500/5' },
  ];

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-400">Loading pipeline...</div>;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map((col) => (
          <div key={col.id} className={`flex flex-col min-w-[300px] w-full rounded-xl border ${col.color} p-4 h-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-200">{col.title}</h3>
              <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">
                {pipeline[col.id]?.length || 0}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {pipeline[col.id]?.map((app) => (
                <div key={app.id} className="bg-slate-800/80 border border-slate-700 p-4 rounded-lg hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing">
                  <h4 className="font-medium text-white mb-1 animate-fade-in">
                    {app.job?.url ? (
                      <a 
                        href={app.job.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
                      >
                        {app.job_title}
                        <ExternalLink size={12} className="opacity-60" />
                      </a>
                    ) : (
                      app.job_title
                    )}
                  </h4>
                  <div className="flex items-center text-sm text-slate-400 gap-2 mb-3">
                    <Building size={14} /> {app.company_name}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-slate-500 gap-1">
                      <Calendar size={12} /> {new Date(app.date_applied).toLocaleDateString()}
                    </div>
                    {app.match_score && (
                      <span className="text-xs font-bold text-primary">{Math.round(app.match_score)}% Match</span>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <select 
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 p-1 focus:outline-none focus:border-primary"
                    >
                      <option value="applied">Applied</option>
                      <option value="under_review">Under Review</option>
                      <option value="interview_scheduled">Interview</option>
                      <option value="offer_received">Offer Received</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
