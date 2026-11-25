'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/frontend/components/ui/Card';
import { Badge } from '@/frontend/components/ui/Badge';
import { useToast } from '@/frontend/components/ui/Toast';
import { Building, Calendar, ChevronRight, ExternalLink, Play } from 'lucide-react';
import type { Application } from '@/shared/types';

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
      const res = await fetch('/api/applications?t=' + Date.now(), { cache: 'no-store' });
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
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast(
          newStatus === 'interview_scheduled'
            ? 'Status updated to Interview! Job added to Interview Preparation.'
            : 'Status updated',
          'success'
        );
        fetchApps();
      } else {
        toast(data.error || 'Failed to update status', 'error');
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
    return <div className="flex justify-center py-20 text-slate-500">Loading pipeline...</div>;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map((col) => (
          <div key={col.id} className={`flex flex-col min-w-[300px] w-full rounded-xl border ${col.color} p-4 h-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{col.title}</h3>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full border border-slate-200">
                {pipeline[col.id]?.length || 0}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {pipeline[col.id]?.map((app) => (
                <div key={app.id} className="bg-white border border-slate-200/60 p-4 rounded-lg hover:border-blue-500/50 transition-colors cursor-grab active:cursor-grabbing shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-slate-800 animate-fade-in flex-1">
                      {app.job?.url ? (
                        <a 
                          href={app.job.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-500 hover:underline inline-flex items-center gap-1"
                        >
                          {app.job_title}
                          <ExternalLink size={12} className="opacity-60" />
                        </a>
                      ) : (
                        app.job_title
                      )}
                    </h4>
                    {app.status === 'interview_scheduled' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Interview
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-slate-500 gap-2 mb-3">
                    <Building size={14} /> {app.company_name}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-slate-500 gap-1">
                      <Calendar size={12} /> {new Date(app.date_applied).toLocaleDateString()}
                    </div>
                    {app.match_score && (
                      <span className="text-xs font-bold text-blue-600">{Math.round(app.match_score)}% Match</span>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <select 
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded text-xs text-slate-700 p-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="applied">Applied</option>
                      <option value="under_review">Under Review</option>
                      <option value="interview_scheduled">Interview</option>
                      <option value="offer_received">Offer Received</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    {app.status === 'interview_scheduled' && (
                      <Link
                        href={`/interview?jobId=${app.job_id}`}
                        className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-xs"
                      >
                        <Play size={12} className="fill-current" /> Practice Interview
                      </Link>
                    )}
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
