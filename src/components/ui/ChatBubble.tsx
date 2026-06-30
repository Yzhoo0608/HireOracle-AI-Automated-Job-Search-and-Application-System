import React from 'react';

interface ChatBubbleProps {
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  score?: number;
  feedback?: string;
}

export function ChatBubble({ role, content, score, feedback }: ChatBubbleProps) {
  if (role === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-700">
          {content}
        </span>
      </div>
    );
  }

  const isInterviewer = role === 'interviewer';

  return (
    <div className={`flex w-full mb-6 ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col max-w-[80%] ${isInterviewer ? 'items-start' : 'items-end'}`}>
        <div className="flex items-center mb-1 gap-2">
          <span className="text-xs font-medium text-slate-400">
            {isInterviewer ? 'AI Recruiter' : 'You'}
          </span>
          {score !== undefined && !isInterviewer && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              score >= 8 ? 'bg-green-500/20 text-green-400' : 
              score >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
            }`}>
              Score: {score}/10
            </span>
          )}
        </div>
        
        <div className={`px-4 py-3 rounded-2xl ${
          isInterviewer 
            ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm' 
            : 'bg-primary/20 border border-primary/30 text-white rounded-tr-sm'
        }`}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        </div>

        {feedback && !isInterviewer && (
          <div className="mt-2 bg-slate-800/80 border border-slate-700 rounded-lg p-3 w-full animate-fade-in">
            <div className="text-xs font-bold text-accent mb-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              Feedback
            </div>
            <p className="text-xs text-slate-300 italic">{feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}
