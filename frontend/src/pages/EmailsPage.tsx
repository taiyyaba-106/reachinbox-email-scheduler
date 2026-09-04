import React, { useEffect, useState, useCallback } from 'react';
import { emailApi } from '../services/api';
import type { Email } from '../types';
import { Badge } from '../components/Badge';
import { TableRowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Hash,
  Cpu,
  AlertTriangle,
} from 'lucide-react';

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Failed', value: 'FAILED' },
];

export const EmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const limit = 10;

  const fetchEmails = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        setErrorMsg(null);

        const res = await emailApi.getEmails({
          status: filterStatus,
          page,
          limit,
        });

        if (res.success) {
          setEmails(res.data || []);
          setTotal(res.pagination?.total || 0);
        } else {
          setErrorMsg('Failed to load email records.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'An error occurred while fetching emails.');
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [filterStatus, page]
  );

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Controlled periodic background refresh (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmails(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return '—';
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Email History</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time audit log of all scheduled, queued, delivered, and failed emails from MySQL.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchEmails(false)}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setFilterStatus(tab.value);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === tab.value
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* API Error State */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => fetchEmails(false)}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table & Content Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5">Scheduled At</th>
                <th className="px-5 py-3.5">Sent At</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Attempts</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <>
                  <TableRowSkeleton columns={9} />
                  <TableRowSkeleton columns={9} />
                  <TableRowSkeleton columns={9} />
                  <TableRowSkeleton columns={9} />
                  <TableRowSkeleton columns={9} />
                </>
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState
                      icon={filterStatus !== 'ALL' ? 'mail' : 'inbox'}
                      title={filterStatus !== 'ALL' ? `No ${filterStatus} Emails Found` : 'No Emails Scheduled Yet'}
                      description={
                        filterStatus !== 'ALL'
                          ? `There are currently no scheduled emails with status "${filterStatus}".`
                          : 'You have not scheduled any emails yet. Use the Schedule page to enqueue your first email job!'
                      }
                      action={
                        filterStatus !== 'ALL'
                          ? { label: 'Reset Filter', onClick: () => setFilterStatus('ALL') }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-medium">#{email.id}</td>
                    <td className="px-5 py-3.5 font-medium text-white max-w-[180px] truncate">
                      {email.recipient}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px] truncate text-slate-300">{email.subject}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatDate(email.scheduledAt)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatDate(email.sentAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={email.status} />
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-400">
                      {email.attempts || 0}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatDate(email.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedEmail(email)}
                        title="View Details"
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold text-xs transition-all inline-flex items-center gap-1.5 border border-indigo-500/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

            {/* Pagination Bar */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>{' '}
                ({total} total records)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors flex items-center gap-1 font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
      </div>

      {/* EMAIL DETAILS MODAL */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Email Details #{selectedEmail.id}</h3>
                  <p className="text-xs text-slate-400">Full job metadata and body payload</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Status Header Bar */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 font-medium">Status</span>
                <Badge status={selectedEmail.status} />
              </div>

              {/* Error Message Alert (if FAILED) */}
              {selectedEmail.errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Job Delivery Failure Reason</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed text-rose-300 break-words pt-1">
                    {selectedEmail.errorMessage}
                  </p>
                </div>
              )}

              {/* Grid Metrics */}
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
                    {selectedEmail.jobId || 'N/A'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Scheduled Delivery Time</span>
                  </div>
                  <div className="font-semibold text-slate-200">
                    {formatDate(selectedEmail.scheduledAt)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Actual Sent Time</span>
                  </div>
                  <div className="font-semibold text-slate-200">
                    {formatDate(selectedEmail.sentAt)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Hash className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Execution Attempts</span>
                  </div>
                  <div className="font-semibold text-white">{selectedEmail.attempts || 0} attempt(s)</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Created Date</span>
                  </div>
                  <div className="font-semibold text-slate-200">
                    {formatDate(selectedEmail.createdAt)}
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Subject</label>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 font-medium text-white">
                  {selectedEmail.subject}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Body Content</label>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedEmail.body}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
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

export default EmailsPage;
