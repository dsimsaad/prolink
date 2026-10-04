import React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';

export const ToastContainer: React.FC = () => {
  const { toasts } = useMarketplace();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-white rounded-[10px] border shadow-md transition-all duration-200 animate-in slide-in-from-top-2 ${
              isError
                ? 'border-[#FCA5A5] text-[#991B1B]'
                : isWarning
                ? 'border-[#FDE68A] text-[#92400E]'
                : 'border-[#DCE8E0] text-[#0C2A1B]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />}
              {isError && <XCircle className="w-4 h-4 text-[#B42318]" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-[#C77D0A]" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-[#0F6B3E]" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold leading-tight">{t.title}</h4>
              {t.message && (
                <p className="text-xs text-[#6A7B70] mt-0.5 leading-normal">{t.message}</p>
              )}
            </div>

            <button
              onClick={() => marketplaceStore.removeToast(t.id)}
              className="shrink-0 text-[#A3B1A8] hover:text-[#0C2A1B] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
