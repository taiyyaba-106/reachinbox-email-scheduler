import React, { useEffect, useState, useCallback } from 'react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { CardSkeleton } from '../components/Skeleton';
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  CalendarPlus,
  FileSpreadsheet,
  Search,
  Cpu,
  RefreshCw,
  Eye,
  X,
  TrendingUp,
  Inbox,
  Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi, configApi } from '../services/api';
import type { Email, SchedulerConfig, DashboardStatsData } from '../types';

export const DashboardPage: React.FC = () => {
  const [statsData, setStatsData] = useState<DashboardStatsData | null>(null);
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Email for Modal Inspection
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [statsRes, configRes] = await Promise.all([
        dashboardApi.getStats(),
        configApi.getConfig().catch(() => ({ success: false, data: null })),
      ]);

      if (statsRes.success) {
        setStatsData(statsRes.data);
      } else {
        setErrorMsg('Failed to load dashboard metrics from backend.');
      }

      if (configRes && configRes.success && configRes.data) {
        setConfig(configRes.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while loading dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Controlled refresh interval (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return '—';
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  const deliveryRate = statsData?.deliveryRate ?? 100;
  const pendingCount = (statsData?.pendingEmails || 0) + (statsData?.queuedEmails || 0) + (statsData?.processingEmails || 0);

  return (
    <div className="space-y-6">
      {/* Header Banner & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
            <span>Dashboard Overview</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative real-time metrics directly from MySQL database and BullMQ queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-2 border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>

          <Link
            to="/schedule"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Schedule Email</span>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Authoritative Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !statsData ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Emails"
              value={statsData?.totalEmails || 0}
              icon={Mail}
              color="brand"
              subtitle="All-time MySQL records"
            />
            <StatCard
              title="Scheduled / Pending"
              value={pendingCount}
              icon={Clock}
              color="indigo"
              subtitle={`${statsData?.scheduledToday || 0} scheduled today`}
            />
            <StatCard
              title="Sent Successfully"
              value={statsData?.sentEmails || 0}
              icon={CheckCircle2}
              color="emerald"
              subtitle={`${statsData?.sentToday || 0} delivered today`}
            />
            <StatCard
              title="Failed Permanent"
              value={statsData?.failedEmails || 0}
              icon={AlertTriangle}
              color="rose"
              subtitle={`${statsData?.failedToday || 0} failed today`}
            />
          </>
        )}
      </div>

      {/* Delivery Success Rate & BullMQ Live Queue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Rate Visualization Progress Bar */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Delivery Success Rate</span>
              <span className="text-lg font-bold text-emerald-400">{deliveryRate}%</span>
            </div>
            <p className="text-xs text-slate-400">
              Percentage of sent emails vs total finished delivery attempts.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  deliveryRate >= 90
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                    : deliveryRate >= 70
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, deliveryRate))}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100% Target</span>
            </div>
          </div>
        </div>

        {/* BullMQ Live Queue Summary Widget */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">BullMQ Live Queue Summary</h3>
            </div>
            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Live Queue Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Queue Count Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <span className="text-slate-400 text-[11px]">Waiting</span>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {statsData?.bullmq.waiting || 0}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <span className="text-slate-400 text-[11px]">Delayed</span>
              <div className="text-lg font-bold text-indigo-400 font-mono">
                {statsData?.bullmq.delayed || 0}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <span className="text-slate-400 text-[11px]">Active</span>
              <div className="text-lg font-bold text-sky-400 font-mono">
                {statsData?.bullmq.active || 0}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <span className="text-slate-400 text-[11px]">Completed</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {statsData?.bullmq.completed || 0}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1 col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[11px]">Failed</span>
              <div className="text-lg font-bold text-rose-400 font-mono">
                {statsData?.bullmq.failed || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/schedule"
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 transition-all shadow-xl group flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs group-hover:text-indigo-400 transition-colors">
                Schedule Single Email
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Enqueue single email with date & time</p>
            </div>
          </Link>

          <Link
            to="/schedule/csv"
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 transition-all shadow-xl group flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs group-hover:text-emerald-400 transition-colors">
                Upload CSV Bulk Emails
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Batch schedule emails from a CSV file</p>
            </div>
          </Link>

          <Link
            to="/search"
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 transition-all shadow-xl group flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs group-hover:text-sky-400 transition-colors">
                Search Email Archive
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Full-text search across all subjects & bodies</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Scheduler Runtime Config Banner */}
      {config && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-300 font-medium">
              Hourly Limit: <strong className="text-white">{config.hourlyEmailLimit}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium">
              Worker Concurrency: <strong className="text-white">{config.workerConcurrency}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium">
              Scheduler State:{' '}
              <strong className={config.enabled ? 'text-emerald-400' : 'text-rose-400'}>
                {config.enabled ? 'ENABLED' : 'DISABLED'}
              </strong>
            </span>
          </div>
          <Link to="/settings" className="text-indigo-400 hover:underline font-semibold flex items-center gap-1">
            <span>Configure Runtime Settings</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Recent Scheduled Emails Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Recent Scheduled Emails</h3>
            <p className="text-xs text-slate-400">Latest 5 records from MySQL database</p>
          </div>
          <Link to="/emails" className="text-xs text-indigo-400 hover:underline font-medium">
            View All Email History
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading recent emails...
          </div>
        ) : !statsData?.recentEmails || statsData.recentEmails.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">No scheduled emails found in database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Recipient</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Scheduled At</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {statsData.recentEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400">#{email.id}</td>
                    <td className="px-5 py-3.5 font-medium text-white">{email.recipient}</td>
                    <td className="px-5 py-3.5 max-w-xs truncate">{email.subject}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono">
                      {formatDate(email.scheduledAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={email.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedEmail(email)}
                        className="px-3 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold text-xs border border-indigo-500/20 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EMAIL DETAILS MODAL */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Email Details #{selectedEmail.id}</h3>
                  <p className="text-xs text-slate-400">Full job metadata</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 font-medium">Status</span>
                <Badge status={selectedEmail.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Recipient</span>
                  </div>
                  <div className="font-semibold text-white truncate">{selectedEmail.recipient}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>BullMQ Job ID</span>
                  </div>
                  <div className="font-semibold text-indigo-300 font-mono">
                    {selectedEmail.jobId || `email-${selectedEmail.id}`}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Scheduled Time</span>
                  </div>
                  <div className="font-semibold text-slate-200">{formatDate(selectedEmail.scheduledAt)}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sent Time</span>
                  </div>
                  <div className="font-semibold text-slate-200">{formatDate(selectedEmail.sentAt)}</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Subject</label>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 font-medium text-white">
                  {selectedEmail.subject}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Body</label>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {selectedEmail.body}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
