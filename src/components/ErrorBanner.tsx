import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3 text-red-400">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-xs font-bold uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
};
