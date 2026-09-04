import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Mail,
  Calendar,
  User as UserIcon,
  AlertCircle,
  X,
  Eye,
  Clock,
  Send,
  Hash,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import { emailApi } from '../services/api';
import type { Email } from '../types';
import Badge from '../components/Badge';
import { TableRowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export const SearchPage: React.FC = () => {
  // Search Inputs
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [recipientFilter, setRecipientFilter] = useState<string>('');
  const [debouncedRecipient, setDebouncedRecipient] = useState<string>('');

  // Results & Pagination
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 10;

  // Selected Email for Modal Inspection
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Debounce search term (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Debounce recipient filter (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRecipient(recipientFilter);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [recipientFilter]);

  // Fetch search results from backend GET /api/emails/search
  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await emailApi.searchEmails({
        query: debouncedSearchTerm.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        recipient: debouncedRecipient.trim() || undefined,
        page,
        limit,
      });

      if (response.success) {
        setEmails(response.data || []);
        setTotal(response.pagination?.total || 0);
      } else {
        setError('Failed to perform search query.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while executing search query.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, statusFilter, debouncedRecipient, page]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setStatusFilter('ALL');
    setRecipientFilter('');
    setDebouncedRecipient('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return '—';
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  const isFiltered = searchTerm || statusFilter !== 'ALL' || recipientFilter;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Full-Text Email Search</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Powered by Elasticsearch with MySQL fallback. Search across subject, body content, and recipients.
            </p>
          </div>
        </div>

        {isFiltered && (
          <button
            onClick={handleClearSearch}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <X className="w-4 h-4" />
            <span>Reset Search & Filters</span>
          </button>
        )}
      </div>

      {/* Search Input & Controls */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Full-Text Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by subject keywords, message body text, or recipient email..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5 rounded-lg"
                title="Clear search text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Recipient Search Filter */}
          <div className="relative md:w-64">
            <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              placeholder="Filter by recipient..."
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {recipientFilter && (
              <button
                onClick={() => setRecipientFilter('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="relative md:w-48">
            <Filter className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="QUEUED">QUEUED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Error State Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={executeSearch}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs transition-colors"
          >
            Retry Search
          </button>
        </div>
      )}

      {/* Results Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5">Body Preview</th>
                <th className="px-5 py-3.5">Scheduled At</th>
                <th className="px-5 py-3.5">Sent At</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <>
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                </>
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon="search"
                      title="No Search Results Found"
                      description="No email records matched your search query or selected status filters."
                      action={
                        isFiltered
                          ? { label: 'Clear Filters', onClick: handleClearSearch }
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
                    <td className="px-5 py-3.5 max-w-[180px] truncate text-slate-300 font-medium">
                      {email.subject}
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px] truncate text-slate-400">
                      {email.body ? (email.body.length > 60 ? `${email.body.slice(0, 60)}...` : email.body) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatDate(email.scheduledAt)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatDate(email.sentAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={email.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedEmail(email)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold text-xs transition-all inline-flex items-center gap-1.5 border border-indigo-500/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
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
            ({total} total matching results)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors font-medium"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors font-medium"
            >
              Next
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

            {/* Modal Content */}
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
                    <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
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

export default SearchPage;
