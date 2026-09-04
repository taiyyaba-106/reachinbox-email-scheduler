import React from 'react';
import { Inbox, Search, MailX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'inbox' | 'search' | 'mail';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'inbox',
  action,
}) => {
  const renderIcon = () => {
    switch (icon) {
      case 'search':
        return <Search className="w-10 h-10 text-slate-500" />;
      case 'mail':
        return <MailX className="w-10 h-10 text-slate-500" />;
      case 'inbox':
      default:
        return <Inbox className="w-10 h-10 text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 my-4">
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 mb-4">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
