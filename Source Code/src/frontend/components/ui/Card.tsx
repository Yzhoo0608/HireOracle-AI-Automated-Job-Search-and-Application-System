import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientBorder?: boolean;
}

export function Card({ children, className = '', gradientBorder = false, ...props }: CardProps) {
  if (gradientBorder) {
    return (
      <div className={`relative p-[1px] rounded-2xl bg-gradient-to-br from-blue-500 to-blue-200 ${className}`} {...props}>
        <div className="rounded-2xl p-6 h-full w-full" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-6 shadow-sm border border-slate-200/60 transition-transform hover:-translate-y-1 duration-300 ${className}`} style={{ backgroundColor: '#ffffff', color: '#0f172a' }} {...props}>
      {children}
    </div>
  );
}
