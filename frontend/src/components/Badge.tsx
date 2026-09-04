import React from 'react';
import type { EmailStatus } from '../types';

interface BadgeProps {
  status: EmailStatus | string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const normalized = status.toUpperCase();

  let styles = 'bg-slate-800 text-slate-400 border-slate-700';

  switch (normalized) {
    case 'SENT':
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      break;
    case 'PROCESSING':
      styles = 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse';
      break;
    case 'QUEUED':
      styles = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      break;
    case 'PENDING':
      styles = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      break;
    case 'FAILED':
      styles = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {normalized}
    </span>
  );
};

export default Badge;
