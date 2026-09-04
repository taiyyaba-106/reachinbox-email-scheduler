import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User as UserIcon } from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-slate-300 shrink-0">
      {/* Title / Breadcrumb Placeholder */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-xs text-slate-400 font-medium">Backend System Connected (Port 5000)</span>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        <button
          title="Notifications"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800"></div>

        {user ? (
          <div className="flex items-center gap-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="w-8 h-8 rounded-full border border-brand-500/30 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-white leading-tight">
                {user.name || user.email.split('@')[0]}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.email}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">Guest User</div>
        )}
      </div>
    </header>
  );
};
