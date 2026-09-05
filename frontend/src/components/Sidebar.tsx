import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarPlus,
  FileSpreadsheet,
  Mail,
  Search,
  Settings,
  Cpu,
  LogOut,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Schedule Email', path: '/schedule', icon: CalendarPlus },
    { name: 'CSV Bulk Upload', path: '/schedule/csv', icon: FileSpreadsheet },
    { name: 'All Emails', path: '/emails', icon: Mail },
    { name: 'Search Emails', path: '/search', icon: Search },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 hidden md:flex min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight leading-none text-base">ReachInbox</h1>
            <span className="text-xs text-brand-400 font-medium tracking-wide">Email Scheduler</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Monitoring
          </div>

          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-amber-500 group-hover:animate-pulse" />
              <span>BullMQ Queue</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              LIVE
            </span>
          </a>
        </nav>
      </div>

      {/* Footer / User Session */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
