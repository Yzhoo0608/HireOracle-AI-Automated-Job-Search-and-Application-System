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
        <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs rounded-full border border-slate-200">
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
          <span className="text-xs font-medium text-slate-500">
            {isInterviewer ? 'AI Recruiter' : 'You'}
          </span>
          {score !== undefined && !isInterviewer && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
              score >= 8 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
              score >= 5 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              Score: {score}/10
            </span>
          )}
        </div>
        
        <div className={`px-4 py-3 rounded-2xl ${
          isInterviewer 
            ? 'bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-sm' 
            : 'bg-blue-50 border border-blue-200 text-slate-800 rounded-tr-sm'
        }`}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        </div>

        {feedback && !isInterviewer && (
          <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-3 w-full animate-fade-in">
            <div className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              Feedback
            </div>
            <p className="text-xs text-slate-600 italic">{feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}
