import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle2, AlertCircle, Sliders, MessageSquare } from 'lucide-react';
import { configApi, slackApi } from '../services/api';
import type { SchedulerConfig, SlackStatus } from '../types';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<SchedulerConfig>({
    hourlyEmailLimit: 100,
    workerConcurrency: 5,
    artificialDelayMs: 0,
    enabled: true,
  });

  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [webhookInput, setWebhookInput] = useState<string>('');
  const [connectingWebhook, setConnectingWebhook] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [configRes, slackRes] = await Promise.all([
        configApi.getConfig().catch(() => null),
        slackApi.getStatus().catch(() => null),
      ]);

      if (configRes && configRes.data) {
        setConfig(configRes.data);
      }

      if (slackRes) {
        setSlackStatus(slackRes);
      }

      // Check URL query parameters
      const params = new URLSearchParams(window.location.search);
      const slackConnected = params.get('slack');
      const err = params.get('error');

      if (slackConnected === 'connected') {
        setMessage({ type: 'success', text: 'Slack workspace connected successfully via OAuth!' });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (err) {
        setMessage({ type: 'error', text: decodeURIComponent(err) });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load system settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const { showSuccess, showError } = useToast();

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // Prevent double submission
    setSaving(true);
    setMessage(null);

    try {
      const res = await configApi.updateConfig(config);
      if (res.success && res.data) {
        setConfig(res.data);
        const msg = 'Scheduler configuration updated successfully!';
        setMessage({ type: 'success', text: msg });
        showSuccess(msg);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to update configuration';
      setMessage({ type: 'error', text: msg });
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectSlack = () => {
    const authUrl = slackApi.getSlackAuthUrl();
    window.location.href = authUrl;
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookInput || connectingWebhook) return;
    setConnectingWebhook(true);

    try {
      const res = await slackApi.connectWebhook(webhookInput);
      if (res.success) {
        showSuccess('Slack Webhook connected successfully!');
        setMessage({ type: 'success', text: 'Slack Webhook URL configured successfully.' });
        setWebhookInput('');
        fetchSettings();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to connect Slack Webhook';
      showError(msg);
      setMessage({ type: 'error', text: msg });
    } finally {
      setConnectingWebhook(false);
    }
  };

  const handleDisconnectSlack = async () => {
    try {
      await slackApi.disconnect();
      showSuccess('Slack workspace disconnected.');
      setSlackStatus({ connected: false, teamName: null, slackUserId: null, channel: null });
    } catch (err: any) {
      showError(err.message || 'Failed to disconnect Slack');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p>Loading application settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings & Integrations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage email scheduler runtime limits, BullMQ worker concurrency, and Slack workspace notifications.
        </p>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Slack Integration Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Slack Workspace Integration</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive real-time notifications when scheduled emails are sent or fail.
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              slackStatus?.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
            }`}
          >
            {slackStatus?.connected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        <div className="p-6 space-y-5">
          {slackStatus?.connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase block">Workspace / Mode</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{slackStatus.teamName || 'Slack Team'}</span>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase block">User ID</span>
                  <span className="font-semibold text-slate-900 dark:text-white font-mono">{slackStatus.slackUserId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase block">Notification Channel</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{slackStatus.channel || '#general'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDisconnectSlack}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition"
                >
                  Disconnect Slack
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Connect your Slack workspace using standard **Slack OAuth 2.0** or paste an **Incoming Webhook URL**.
              </p>

              {/* Direct Webhook Form */}
              <form onSubmit={handleSaveWebhook} className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Connect via Slack Webhook URL (Instant)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={connectingWebhook || !webhookInput}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {connectingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Webhook
                  </button>
                </div>
              </form>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">Or use full Slack App OAuth Authorize flow:</span>
                <button
                  type="button"
                  onClick={handleConnectSlack}
                  className="px-4 py-2 bg-[#4A154B] hover:bg-[#3F123F] text-white text-xs font-medium rounded-lg flex items-center gap-2 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Connect via Slack OAuth
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scheduler Runtime Config Form */}
      <form onSubmit={handleConfigSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scheduler Runtime Limits</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust rate limiting and BullMQ queue concurrency settings in real-time.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Hourly Email Rate Limit
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={config.hourlyEmailLimit}
                onChange={(e) => setConfig({ ...config, hourlyEmailLimit: parseInt(e.target.value) || 1 })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Maximum emails allowed per hour.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Worker Concurrency
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.workerConcurrency}
                onChange={(e) => setConfig({ ...config, workerConcurrency: parseInt(e.target.value) || 1 })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Number of parallel BullMQ worker tasks.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">Scheduler Processing Engine</span>
              <span className="text-xs text-slate-500">Enable or pause queue consumption globally.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
