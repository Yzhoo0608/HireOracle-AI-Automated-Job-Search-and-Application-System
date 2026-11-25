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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <div className="p-2 bg-blue-50/60 rounded-lg text-blue-600">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-800 tracking-tight">{value}</div>
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
