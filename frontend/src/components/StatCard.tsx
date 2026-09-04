import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'brand' | 'emerald' | 'amber' | 'rose' | 'indigo';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'brand',
}) => {
  const colorMap = {
    brand: 'from-indigo-600/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
    emerald: 'from-emerald-600/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-600/20 to-amber-500/5 text-amber-400 border-amber-500/20',
    rose: 'from-rose-600/20 to-rose-500/5 text-rose-400 border-rose-500/20',
    indigo: 'from-indigo-600/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
  };

  const iconBgMap = {
    brand: 'bg-indigo-500/10 text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    indigo: 'bg-indigo-500/10 text-indigo-400',
  };

  return (
    <div
      className={`p-5 rounded-2xl bg-gradient-to-b ${colorMap[color]} border backdrop-blur-md shadow-lg transition-all duration-200 hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${iconBgMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-extrabold text-white tracking-tight">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-slate-400 font-medium">{subtitle}</div>}
    </div>
  );
};

export default StatCard;
