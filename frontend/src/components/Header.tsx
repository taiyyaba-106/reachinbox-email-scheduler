import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User as UserIcon, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-slate-300 shrink-0">
      {/* System Status Indicator */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-xs text-slate-400 font-medium">ReachInbox Production Engine</span>
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
          <div className="flex items-center gap-4">
            {/* User Avatar, Name & Email */}
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || user.email}
                  className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">
                  {user.name || user.email.split('@')[0]}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{user.email}</div>
              </div>
            </div>

            {/* Simple Logout Button */}
            <button
              onClick={logout}
              title="Sign out of account"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs font-medium transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">Guest User</div>
        )}
      </div>
    </header>
  );
};

