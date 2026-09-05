import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, ShieldCheck, Mail, Zap, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginAsDemo, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const expired = urlParams.get('expired');
    const error = urlParams.get('error');

    if (expired) {
      setErrorMessage('Your session has expired. Please sign in again.');
    } else if (error) {
      setErrorMessage(`Authentication failed: ${error}`);
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 text-center space-y-6">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-500/25">
            <Send className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Email Scheduler</h1>
          <p className="text-sm font-medium text-slate-400">Sign in to continue</p>
        </div>

        {/* Error / Expired Session Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={loginAsDemo}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/25 active:scale-[0.98] cursor-pointer"
          >
            <Zap className="w-4 h-4 text-indigo-200 fill-indigo-200" />
            <span>Instant Demo Login</span>
          </button>

          <button
            onClick={loginWithGoogle}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.1-6.68-4.93H1.28v3.15C3.32 21.36 7.42 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.28C.46 8.21 0 10.05 0 12s.46 3.79 1.28 5.42l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.42 0 3.32 2.64 1.28 6.58l4.04 3.15c.94-2.83 3.57-4.98 6.68-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80 text-[11px] font-medium text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>BullMQ Engine</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Idempotent</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Mail className="w-4 h-4 text-amber-400" />
            <span>SMTP Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
