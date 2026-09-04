import React, { useState, useEffect } from 'react';
import { emailApi, slackApi } from '../services/api';
import { Send, CheckCircle2, AlertCircle, Clock, Hash, Cpu, Mail, Calendar, ArrowRight, RotateCcw, MessageSquare } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import type { ScheduleEmailResponse, SlackStatus } from '../types';
import { useToast } from '../context/ToastContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SchedulePage: React.FC = () => {
  const navigate = useNavigate();

  // Form Fields
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');

  // Field-level validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission & UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    response: ScheduleEmailResponse;
    scheduledAtISO: string;
  } | null>(null);

  // Optional Slack Status
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  useEffect(() => {
    // Set default date to today and default time to 5 mins from now
    const now = new Date();
    const future = new Date(now.getTime() + 5 * 60 * 1000);

    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    setScheduledDate(`${year}-${month}-${day}`);

    const hours = String(future.getHours()).padStart(2, '0');
    const minutes = String(future.getMinutes()).padStart(2, '0');
    setScheduledTime(`${hours}:${minutes}`);

    // Check optional Slack integration status
    slackApi
      .getStatus()
      .then((res) => {
        if (res && res.connected) {
          setSlackStatus(res);
        }
      })
      .catch(() => {
        // Soft fail if Slack endpoint fails or unauthenticated
      });
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Recipient validation
    if (!recipient.trim()) {
      newErrors.recipient = 'Recipient email address is required.';
    } else if (!EMAIL_REGEX.test(recipient.trim())) {
      newErrors.recipient = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // 2. Subject validation
    if (!subject.trim()) {
      newErrors.subject = 'Email subject is required.';
    }

    // 3. Body validation
    if (!body.trim()) {
      newErrors.body = 'Email body content is required.';
    }

    // 4. Scheduled Date & Time validation
    if (!scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required.';
    }

    if (!scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required.';
    }

    if (scheduledDate && scheduledTime) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (isNaN(scheduledDateTime.getTime())) {
        newErrors.scheduledTime = 'Invalid date and time combination.';
      } else if (scheduledDateTime.getTime() <= Date.now()) {
        newErrors.scheduledTime = 'Scheduled time must be in the future.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    setErrorMsg(null);

    if (!validateForm()) {
      showError('Please fix the validation errors in the form.');
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const scheduledAtISO = scheduledDateTime.toISOString();

    try {
      setLoading(true);
      const res = await emailApi.scheduleEmail({
        recipient: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
        scheduledAt: scheduledAtISO,
      });

      if (res.success) {
        setSuccessData({
          response: res,
          scheduledAtISO,
        });
        showSuccess('Email scheduled successfully!');
      } else {
        const msg = res.message || 'Failed to schedule email.';
        setErrorMsg(msg);
        showError(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to schedule email. Please try again.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setErrorMsg(null);
    setErrors({});
    setSubject('');
    setBody('');

    // Reset date/time to 5 mins from now
    const now = new Date();
    const future = new Date(now.getTime() + 5 * 60 * 1000);
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    setScheduledDate(`${year}-${month}-${day}`);

    const hours = String(future.getHours()).padStart(2, '0');
    const minutes = String(future.getMinutes()).padStart(2, '0');
    setScheduledTime(`${hours}:${minutes}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-indigo-400" />
            <span>Schedule Email</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enqueues a delayed job into the BullMQ queue for reliable, asynchronous delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {slackStatus?.connected && (
            <div className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 flex items-center gap-2 shadow-sm">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Slack Notifications Active</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
              Single Email
            </span>
            <Link
              to="/schedule/csv"
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              CSV Bulk Upload
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        {successData ? (
          /* SUCCESS DISPLAY CARD */
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Email scheduled successfully.</h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Your email has been registered in the database and enqueued into the BullMQ delayed execution queue.
                </p>
              </div>
            </div>

            {/* Scheduled Email Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Hash className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">Email ID</span>
                </div>
                <div className="text-lg font-bold text-white">#{successData.response.emailId}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">BullMQ Job ID</span>
                </div>
                <div className="text-lg font-bold text-indigo-300 font-mono">{successData.response.jobId}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">Scheduled Delivery Time</span>
                </div>
                <div className="text-sm font-semibold text-slate-200">
                  {new Date(successData.scheduledAtISO).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">Initial Queue Status</span>
                </div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                    QUEUED
                  </span>
                </div>
              </div>
            </div>

            {/* Recipient & Subject Summary */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-medium text-white">{recipient}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Subject:</span>
                <span className="font-medium text-white">{subject}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/emails')}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <span>View Email History</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Schedule Another Email</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORM VIEW */
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Recipient Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Recipient Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (errors.recipient) setErrors((prev) => ({ ...prev, recipient: '' }));
                  }}
                  placeholder="e.g. user@example.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-600 focus:outline-none transition-all ${
                    errors.recipient
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {errors.recipient && <p className="mt-1 text-rose-400 text-[11px]">{errors.recipient}</p>}
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Subject <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
                }}
                placeholder="e.g. Q4 Performance Sync"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-600 focus:outline-none transition-all ${
                  errors.subject
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
              {errors.subject && <p className="mt-1 text-rose-400 text-[11px]">{errors.subject}</p>}
            </div>

            {/* Date & Time Fields (Split) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Scheduled Date <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => {
                      setScheduledDate(e.target.value);
                      if (errors.scheduledDate || errors.scheduledTime) {
                        setErrors((prev) => ({ ...prev, scheduledDate: '', scheduledTime: '' }));
                      }
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border text-white focus:outline-none transition-all font-mono ${
                      errors.scheduledDate
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {errors.scheduledDate && <p className="mt-1 text-rose-400 text-[11px]">{errors.scheduledDate}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Scheduled Time <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => {
                      setScheduledTime(e.target.value);
                      if (errors.scheduledTime) setErrors((prev) => ({ ...prev, scheduledTime: '' }));
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border text-white focus:outline-none transition-all font-mono ${
                      errors.scheduledTime
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {errors.scheduledTime && <p className="mt-1 text-rose-400 text-[11px]">{errors.scheduledTime}</p>}
              </div>
            </div>

            {/* Body Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Body Content <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (errors.body) setErrors((prev) => ({ ...prev, body: '' }));
                }}
                placeholder="Write your email body content..."
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-600 focus:outline-none transition-all ${
                  errors.body
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              ></textarea>
              {errors.body && <p className="mt-1 text-rose-400 text-[11px]">{errors.body}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Scheduling Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Schedule Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
