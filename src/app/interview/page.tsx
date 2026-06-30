'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { useToast } from '@/components/ui/Toast';
import { Play, Send, History } from 'lucide-react';
import type { InterviewSession, JobMatch } from '@/lib/types';

export default function InterviewPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [interviewType, setInterviewType] = useState<'hr' | 'technical'>('hr');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch past sessions and available jobs
    Promise.all([
      fetch('/api/interview/sessions').then(res => res.json()),
      fetch('/api/jobs').then(res => res.json())
    ]).then(([sessionsData, jobsData]) => {
      if (sessionsData.success) setSessions(sessionsData.data);
      if (jobsData.success) {
        setMatches(jobsData.data);
        if (jobsData.data.length > 0) setSelectedJobId(jobsData.data[0].job_id);
      }
    });
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages]);

  const startInterview = async () => {
    if (!selectedJobId) {
      toast('Please select a job first', 'error');
      return;
    }
    
    setStarting(true);
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJobId, type: interviewType })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.data);
        toast('Interview started!', 'success');
      } else {
        toast(data.error || 'Failed to start interview', 'error');
      }
    } catch (error) {
      toast('An error occurred', 'error');
    } finally {
      setStarting(false);
    }
  };

  const sendAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !currentSession) return;

    const userAns = answer;
    setAnswer('');
    
    // Optimistic UI update
    const tempSession = { ...currentSession };
    tempSession.messages.push({ role: 'candidate', content: userAns });
    setCurrentSession(tempSession);
    setLoading(true);

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession.id, answer: userAns })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.data);
      }
    } catch (error) {
      toast('Failed to send answer', 'error');
      // Rollback on error could go here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)] animate-fade-in">
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Play size={18} className="text-primary" /> Start New Session
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Select Job</label>
              <select 
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-primary focus:outline-none"
              >
                {matches.length === 0 && <option value="">No jobs available</option>}
                {matches.map(m => (
                  <option key={m.id} value={m.job_id}>{m.job?.title} at {m.job?.company}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Interview Type</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setInterviewType('hr')}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${interviewType === 'hr' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  HR
                </button>
                <button 
                  onClick={() => setInterviewType('technical')}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${interviewType === 'technical' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  Technical
                </button>
              </div>
            </div>
            <Button onClick={startInterview} className="w-full" isLoading={starting}>
              Start Interview
            </Button>
          </div>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History size={18} className="text-secondary" /> Past Sessions
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {sessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => setCurrentSession(session)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  currentSession?.id === session.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium uppercase text-slate-400">{session.type}</span>
                  {session.overall_score !== null && (
                    <span className="text-xs font-bold text-green-400">{Math.round(session.overall_score)}/10</span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-white truncate">{session.job?.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{new Date(session.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="lg:col-span-3 flex flex-col h-full relative" gradientBorder>
        {!currentSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquareIcon className="w-16 h-16 mb-4 text-slate-600 opacity-50" />
            <h2 className="text-xl font-semibold text-white mb-2">Ready to Practice?</h2>
            <p>Select a job and start an interview to begin your mock session.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">{currentSession.job?.title}</h2>
                <p className="text-sm text-slate-400 uppercase tracking-wider">{currentSession.type} Interview</p>
              </div>
              {currentSession.overall_score !== null && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Overall Score</p>
                  <p className="text-xl font-bold text-primary">{Math.round(currentSession.overall_score)}/10</p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-4">
              {currentSession.messages.map((msg, idx) => (
                <ChatBubble 
                  key={idx} 
                  role={msg.role} 
                  content={msg.content} 
                  score={msg.score} 
                  feedback={msg.feedback} 
                />
              ))}
              {loading && (
                <div className="flex justify-start mb-6">
                  <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendAnswer} className="mt-4 pt-4 border-t border-slate-700 shrink-0 relative">
              <textarea 
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-14 py-3 text-white focus:outline-none focus:border-primary resize-none custom-scrollbar"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAnswer(e);
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={loading || !answer.trim()}
                className="absolute right-3 bottom-5 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

// Custom icon for placeholder
function MessageSquareIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
