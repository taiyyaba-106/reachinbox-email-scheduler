import React from 'react';
import { useToast, type ToastType } from '../context/ToastContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
        bar: 'bg-emerald-500',
      };
    case 'error':
      return {
        bg: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
        icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
        bar: 'bg-rose-500',
      };
    case 'warning':
      return {
        bg: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
        bar: 'bg-amber-500',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-950/90 border-blue-500/40 text-blue-200',
        icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
        bar: 'bg-blue-500',
      };
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const styles = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 ${styles.bg}`}
          >
            {styles.icon}
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="font-semibold text-sm leading-tight mb-0.5">{toast.title}</h4>}
              <p className="text-xs leading-relaxed opacity-90 break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
