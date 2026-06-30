import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientBorder?: boolean;
}

export function Card({ children, className = '', gradientBorder = false, ...props }: CardProps) {
  if (gradientBorder) {
    return (
      <div className={`relative p-[1px] rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent ${className}`} {...props}>
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 h-full w-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`glass rounded-2xl p-6 shadow-xl transition-transform hover:-translate-y-1 duration-300 ${className}`} {...props}>
      {children}
    </div>
  );
}
