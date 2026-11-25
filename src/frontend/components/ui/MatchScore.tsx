import React from 'react';

export function MatchScore({ score }: { score: number }) {
  let colorClass = 'text-green-400 stroke-green-400';
  if (score < 50) colorClass = 'text-red-400 stroke-red-400';
  else if (score < 75) colorClass = 'text-yellow-400 stroke-yellow-400';

  const strokeDasharray = `${score} 100`;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
        <path
          className="stroke-slate-200"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
        />
        <path
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeDasharray={strokeDasharray}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
        />
      </svg>
      <div className="absolute font-bold text-sm text-slate-700">
        {Math.round(score)}%
      </div>
    </div>
  );
}
