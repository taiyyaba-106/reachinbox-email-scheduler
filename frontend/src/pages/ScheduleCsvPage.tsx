import React, { useState, useRef } from 'react';
import { emailApi } from '../services/api';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Download,
  Send,
  AlertTriangle,
  FileText,
  Trash2,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import type { BulkScheduleResponse, ScheduleEmailPayload } from '../types';
import { useToast } from '../context/ToastContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedCsvRow {
  rowNum: number;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  isValid: boolean;
  errorReason?: string;
  isDuplicate?: boolean;
}

export const ScheduleCsvPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Submission & Results State
  const [loading, setLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkScheduleResponse | null>(null);

  // Helper to parse CSV text manually handling quoted strings
  const parseCsvText = (text: string): ParsedCsvRow[] => {
    const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return [];

    // Parse line respecting quoted strings
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Header row check
    const headerCols = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
    let recipientIdx = headerCols.indexOf('recipient');
    let subjectIdx = headerCols.indexOf('subject');
    let bodyIdx = headerCols.indexOf('body');
    let scheduledAtIdx = headerCols.indexOf('scheduledat');

    let startIndex = 1;
    // Fallback if no header matching
    if (recipientIdx === -1) recipientIdx = 0;
    if (subjectIdx === -1) subjectIdx = 1;
    if (bodyIdx === -1) bodyIdx = 2;
    if (scheduledAtIdx === -1) scheduledAtIdx = 3;

    // Check if line 0 looks like data instead of header
    if (
      headerCols.length >= 4 &&
      !['recipient', 'subject', 'body', 'scheduledat'].some((h) => headerCols.includes(h))
    ) {
      startIndex = 0;
    }

    const rows: ParsedCsvRow[] = [];
    const seenKeys = new Set<string>();

    for (let i = startIndex; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const rowNum = i + 1;

      const recipient = cols[recipientIdx] || '';
      const subject = cols[subjectIdx] || '';
      const body = cols[bodyIdx] || '';
      const scheduledAt = cols[scheduledAtIdx] || '';

      // Check empty line
      if (!recipient && !subject && !body && !scheduledAt) {
        continue;
      }

      let isValid = true;
      let errorReason = '';

      if (!recipient) {
        isValid = false;
        errorReason = 'Missing recipient email.';
      } else if (!EMAIL_REGEX.test(recipient)) {
        isValid = false;
        errorReason = 'Invalid email address format.';
      } else if (!subject) {
        isValid = false;
        errorReason = 'Missing email subject.';
      } else if (!body) {
        isValid = false;
        errorReason = 'Missing email body content.';
      } else if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
        isValid = false;
        errorReason = 'Invalid scheduledAt date format.';
      } else if (new Date(scheduledAt).getTime() <= Date.now()) {
        isValid = false;
        errorReason = 'Scheduled date/time must be in the future.';
      }

      // Check duplicate row
      const dupKey = `${recipient.toLowerCase()}|${subject}|${body}|${scheduledAt}`;
      let isDuplicate = false;
      if (seenKeys.has(dupKey)) {
        isDuplicate = true;
        if (isValid) {
          isValid = false;
          errorReason = 'Duplicate row in CSV file.';
        }
      } else {
        seenKeys.add(dupKey);
      }

      rows.push({
        rowNum,
        recipient,
        subject,
        body,
        scheduledAt,
        isValid,
        errorReason,
        isDuplicate,
      });
    }

    return rows;
  };

  const handleFileChange = (file: File) => {
    setParseError(null);
    setBulkResult(null);
    setSubmitError(null);

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setParseError('Please upload a valid CSV file (.csv extension).');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCsvText(text);
        if (parsed.length === 0) {
          setParseError('The uploaded CSV file is empty or contains no readable records.');
          setParsedRows([]);
        } else {
          setParsedRows(parsed);
        }
      } catch (err: any) {
        setParseError(`Failed to parse CSV file: ${err?.message}`);
        setParsedRows([]);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const { showSuccess, showError } = useToast();

  const handleSubmit = async () => {
    if (validRows.length === 0 || loading) return;

    setSubmitError(null);
    setLoading(true);

    const payload: ScheduleEmailPayload[] = validRows.map((r) => ({
      recipient: r.recipient,
      subject: r.subject,
      body: r.body,
      scheduledAt: new Date(r.scheduledAt).toISOString(),
    }));

    try {
      const res = await emailApi.bulkScheduleEmails(payload);
      setBulkResult(res);
      showSuccess(`Bulk scheduling complete! Scheduled ${res.successful} email(s).`);
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit bulk scheduling request.';
      setSubmitError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const now = new Date();
    const future1 = new Date(now.getTime() + 2 * 60 * 1000).toISOString();
    const future2 = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    const sampleCsv = `recipient,subject,body,scheduledAt
user1@example.com,Quarterly Team Update,Please review the attached Q4 update.,${future1}
user2@example.com,Meeting Reminder,Project sync starting shortly.,${future2}
invalid-email-format,Missing Subject Test,Body content here,${future1}
user3@example.com,Past Time Test,This row should fail validation,2020-01-01T12:00:00`;

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_emails_schedule.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setBulkResult(null);
    setSubmitError(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
            <span>CSV Bulk Email Scheduler</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Batch enqueue multiple emails from a CSV file into the BullMQ delayed execution queue.
          </p>
        </div>

        {/* Schedule Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <Link
            to="/schedule"
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            Single Email
          </Link>
          <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
            CSV Bulk Upload
          </span>
        </div>
      </div>

      {/* Bulk Results View */}
      {bulkResult ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 animate-fadeIn">
          {/* Status Header */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Bulk Scheduling Complete</h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">{bulkResult.message}</p>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Total Rows Processed</span>
              <div className="text-2xl font-bold text-white">{bulkResult.total}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-emerald-400 font-medium">Successfully Scheduled</span>
              <div className="text-2xl font-bold text-emerald-400">{bulkResult.successful}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-rose-400 font-medium">Failed / Invalid</span>
              <div className="text-2xl font-bold text-rose-400">{bulkResult.failed}</div>
            </div>
          </div>

          {/* Detailed Execution Results Table */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs">Row Execution Breakdown</h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Details / Job ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bulkResult.results.map((res) => (
                    <tr key={res.row} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-slate-400">#{res.row}</td>
                      <td className="px-4 py-3 font-medium text-white">{res.recipient}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">{res.subject}</td>
                      <td className="px-4 py-3">
                        {res.success ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            QUEUED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {res.success ? (
                          <span className="text-indigo-300">
                            Email #{res.emailId} ({res.jobId})
                          </span>
                        ) : (
                          <span className="text-rose-400">{res.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/emails')}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <span>View Email History</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Upload Another CSV</span>
            </button>
          </div>
        </div>
      ) : (
        /* File Upload & Preview View */
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          {/* Instruction & Template download bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Expected columns: <code className="font-mono text-indigo-300">recipient,subject,body,scheduledAt</code>
              </span>
            </div>
            <button
              onClick={handleDownloadSampleCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV</span>
            </button>
          </div>

          {parseError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {submitError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Drag & Drop File Input Area */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-sm">Click to upload or drag & drop CSV</h3>
              <p className="text-xs text-slate-400 mt-1">Supports standard CSV files (.csv up to 5MB)</p>
            </div>
          ) : (
            /* Selected File Info Bar */
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="font-semibold text-white text-xs">{selectedFile.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} total rows parsed
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Validation Counter Banner */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">CSV Validation Results</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    {validRows.length} Ready to Schedule
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                      {invalidRows.length} Invalid / Skipped
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Scheduled At</th>
                      <th className="px-4 py-3">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowNum}
                        className={`transition-colors ${
                          row.isValid ? 'hover:bg-slate-800/40' : 'bg-rose-500/5 hover:bg-rose-500/10'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-slate-400">#{row.rowNum}</td>
                        <td className="px-4 py-3 font-medium text-white max-w-[160px] truncate">
                          {row.recipient || <span className="text-rose-400 italic">Empty</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">
                          {row.subject || <span className="text-rose-400 italic">Empty</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                          {row.scheduledAt ? (
                            new Date(row.scheduledAt).toLocaleString()
                          ) : (
                            <span className="text-rose-400 italic">Empty</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              {row.errorReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit Schedule Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || validRows.length === 0}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Scheduling {validRows.length} Email(s)...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Schedule {validRows.length} Valid Email(s)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleCsvPage;
