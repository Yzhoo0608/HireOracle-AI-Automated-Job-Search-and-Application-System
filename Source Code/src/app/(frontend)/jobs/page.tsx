'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/frontend/components/ui/Card';
import { Button } from '@/frontend/components/ui/Button';
import { MatchScore } from '@/frontend/components/ui/MatchScore';
import { Badge } from '@/frontend/components/ui/Badge';
import { useToast } from '@/frontend/components/ui/Toast';
import { MapPin, Building, Sliders, Scale, Sparkles, RefreshCw, CheckCircle } from 'lucide-react';
import type { JobMatch } from '@/shared/types';

// Helper to retrieve or derive vacancy-specific dynamic weights
function getMatchWeights(match: JobMatch) {
  if (
    match.dynamic_weights &&
    typeof match.dynamic_weights.job_title === 'number' &&
    match.dynamic_weights.job_title > 0
  ) {
    return { weights: match.dynamic_weights, isInferred: true };
  }

  // Fallback for matches created prior to dynamic weighting migration
  const isSalaryUndisclosed =
    !match.job?.salary_range ||
    match.job.salary_range.toLowerCase().includes('undisclose') ||
    match.job.salary_range.toLowerCase().includes('not spec');

  const desc = (match.job?.description || '').toLowerCase();
  const isEduSpecified =
    desc.includes('degree') || desc.includes('diploma') || desc.includes('bachelor');

  if (isSalaryUndisclosed && !isEduSpecified) {
    return {
      weights: {
        job_title: 30,
        years_of_experience: 35,
        location: 15,
        qualification_level: 5,
        job_type: 10,
        salary: 5,
      },
      isInferred: false,
    };
  } else if (isSalaryUndisclosed) {
    return {
      weights: {
        job_title: 25,
        years_of_experience: 30,
        qualification_level: 15,
        location: 15,
        job_type: 10,
        salary: 5,
      },
      isInferred: false,
    };
  } else {
    return {
      weights: {
        job_title: 25,
        years_of_experience: 25,
        location: 15,
        qualification_level: 15,
        salary: 10,
        job_type: 10,
      },
      isInferred: false,
    };
  }
}

export default function JobsPage() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchJobs = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setMatches(data.data);
        if (isManual) {
          toast(`Refreshed ${data.data.length} job matches!`, 'success');
        }
      } else {
        if (isManual) toast(data.error || 'Failed to refresh matches', 'error');
      }
    } catch (error) {
      console.error(error);
      if (isManual) toast('Failed to refresh matches', 'error');
    } finally {
      setInitialLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
      {/* AI Job Matches Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Matched Opportunities</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vacancies automatically matched to your CV profile using 6-factor dynamic weighting and semantic scoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 rounded-lg px-3 py-2 shadow-sm">
            <Sparkles size={14} className="text-blue-600" />
            <span>{matches.length} Matched Vacancies</span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => fetchJobs(true)} 
            disabled={refreshing || initialLoading}
            isLoading={refreshing}
            className="flex items-center gap-1.5 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex justify-center py-20 text-slate-400">Loading jobs...</div>
      ) : matches.length === 0 ? (
        <Card className="text-center py-20">
          <Sparkles className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No matched jobs yet</h3>
          <p className="text-slate-500">Upload your CV to let the AI agent automatically find and match vacancies.</p>
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

                  {/* Dynamic Vacancy Weights & Factor Scores Breakdown */}
                  {(() => {
                    const { weights, isInferred } = getMatchWeights(match);
                    const weightSum =
                      weights.job_title +
                      weights.years_of_experience +
                      weights.qualification_level +
                      weights.location +
                      weights.salary +
                      weights.job_type;

                    return (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Scale size={13} className="text-blue-600" />
                            Vacancy Dynamic Weights & Factor Scores
                            {isInferred ? (
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200/60">
                                AI Dynamic
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200">
                                Vacancy Priority
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Sum: {weightSum}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-center">
                            <div className="text-[11px] text-slate-500 font-medium">Job Title</div>
                            <div className="text-sm font-bold text-blue-600 mt-0.5">{weights.job_title}%</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Score: {Math.round(match.job_title_score || 0)}</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-center">
                            <div className="text-[11px] text-slate-500 font-medium">Experience</div>
                            <div className="text-sm font-bold text-blue-600 mt-0.5">{weights.years_of_experience}%</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Score: {Math.round(match.experience_score || 0)}</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-center">
                            <div className="text-[11px] text-slate-500 font-medium">Education</div>
                            <div className="text-sm font-bold text-blue-600 mt-0.5">{weights.qualification_level}%</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Score: {Math.round(match.education_score || 0)}</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-center">
                            <div className="text-[11px] text-slate-500 font-medium">Location</div>
                            <div className="text-sm font-bold text-blue-600 mt-0.5">{weights.location}%</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Score: {Math.round(match.location_score || 0)}</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-center">
                            <div className="text-[11px] text-slate-500 font-medium">Salary</div>
                            <div className="text-sm font-bold text-blue-600 mt-0.5">{weights.salary}%</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Score: {Math.round(match.salary_score || 0)}</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-center">
                            <div className="text-[11px] text-slate-500 font-medium">Job Type</div>
                            <div className="text-sm font-bold text-blue-600 mt-0.5">{weights.job_type}%</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Score: {Math.round(match.job_type_score || 0)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-col items-center justify-between md:border-l border-slate-100 md:pl-6 shrink-0">
                  <div className="text-center mb-4 md:mb-0">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Match Score</p>
                    <MatchScore score={match.overall_score} />
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full mt-4">
                    {match.application_id ? (
                      <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs">
                        <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                        <span>Applied</span>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => handleApply(match.id)} 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 shadow-xs cursor-pointer"
                      >
                        Apply Now
                      </Button>
                    )}
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
