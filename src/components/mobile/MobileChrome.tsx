import React from "react";
import {
  Trophy,
  Settings,
  Search,
  Clock,
  BarChart3,
  Wallet,
  RefreshCw,
  PlusCircle
} from "lucide-react";
import { LeagueSelector } from "../LeagueSelector";

interface MobileChromeProps {
  children: React.ReactNode;
  view: 'scanner' | 'openbets' | 'history' | 'analysis' | 'bankroll';
  onViewChange: (view: 'scanner' | 'openbets' | 'history' | 'analysis' | 'bankroll') => void;
  onSettingsClick: () => void;
  scannerProps: {
    selectedLeagues: string[];
    setSelectedLeagues: (keys: string[]) => void;
    fixtureCounts: Record<string, number>;
    loadFixtureCounts: () => void;
    isCheckingFixtures: boolean;
    betsCount: number;
    status: string;
    runScan: () => void;
    apiKeyMissing: boolean;
  };
  errorBanner?: React.ReactNode;
}

export const MobileChrome: React.FC<MobileChromeProps> = ({
  children,
  view,
  onViewChange,
  onSettingsClick,
  scannerProps,
  errorBanner
}) => {
  const tabs = [
    { id: 'scanner', label: 'Scanner', icon: Search },
    { id: 'openbets', label: 'Open', icon: PlusCircle },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'bankroll', label: 'Bankroll', icon: Wallet },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 h-14 bg-slate-950/95 backdrop-blur border-b border-slate-900 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trophy className="w-5 h-5 text-slate-950 fill-current" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-100">
            Value Bet Finder
          </span>
        </div>
        <button
          onClick={onSettingsClick}
          className="w-10 h-10 flex items-center justify-center text-slate-400 active:text-slate-100 transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      {/* Sticky Scan Bar (Scanner view only) */}
      {view === 'scanner' && (
        <div className="sticky top-14 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-900 px-5 py-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <LeagueSelector
                selected={scannerProps.selectedLeagues}
                onChange={scannerProps.setSelectedLeagues}
                disabled={scannerProps.status === 'loading'}
                fixtureCounts={scannerProps.fixtureCounts}
                onCheckFixtures={scannerProps.loadFixtureCounts}
                isCheckingFixtures={scannerProps.isCheckingFixtures}
              />
            </div>
            <button
              onClick={scannerProps.apiKeyMissing ? onSettingsClick : scannerProps.runScan}
              disabled={scannerProps.status === 'loading'}
              className={`h-11 px-5 rounded-xl font-bold text-[13px] tracking-tight transition-all flex items-center gap-2 ${
                scannerProps.status === 'loading'
                  ? 'bg-slate-800 text-slate-500 opacity-50'
                  : 'bg-emerald-500 text-slate-950 active:bg-emerald-400 shadow-lg shadow-emerald-500/10'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${scannerProps.status === 'loading' ? 'animate-spin' : ''}`} />
              {scannerProps.status === 'loading' ? 'Scanning...' : 'Run Scan'}
            </button>
          </div>
          {scannerProps.betsCount > 0 && scannerProps.status !== 'loading' && (
            <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 tabular-nums">
              {scannerProps.betsCount} value bets found
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorBanner && (
        <div className="px-4 mt-3">
          {errorBanner}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-950/95 backdrop-blur border-t border-slate-900 pb-3 pt-2 z-30">
        <div className="grid grid-cols-5 h-full px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id as any)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
                  isActive ? 'text-emerald-400' : 'text-slate-500 active:text-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current opacity-20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 w-8 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
