import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string; positive: boolean };
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <Card className="flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 transform group-hover:scale-110">
        <div className="w-16 h-16 text-primary">{icon}</div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="p-2 bg-slate-800/50 rounded-lg text-primary backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      {trend && (
        <div className="mt-2 text-xs flex items-center">
          <span className={`${trend.positive ? 'text-green-400' : 'text-red-400'} font-medium flex items-center`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-slate-500 ml-2">{trend.label}</span>
        </div>
      )}
    </Card>
  );
}
