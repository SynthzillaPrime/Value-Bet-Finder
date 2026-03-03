import React, { useState, useEffect } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { BetCard } from "./components/BetCard";
import { LeagueSelector } from "./components/LeagueSelector";
import { AnalysisView } from "./components/AnalysisView";
import { BankrollView } from "./components/bankroll/BankrollView";
import { OpenBetsView } from "./components/OpenBetsView";
import { BetHistoryView } from "./components/BetHistoryView";
import ErrorBoundary from "./components/ErrorBoundary";
import { PinLock } from "./components/PinLock";
import {
  isPinSetUp,
  isSessionValid,
  setPin,
  verifyPin,
} from "./services/supabase";
import { useTrackedBets } from "./hooks/useTrackedBets";
import { useBankroll } from "./hooks/useBankroll";
import { useScanner } from "./hooks/useScanner";
import {
  RefreshCw,
  AlertTriangle,
  Trophy,
  Search,
  BarChart3,
  Wallet,
  ClipboardList,
  History,
} from "lucide-react";

const App: React.FC = () => {
  // Auth and Navigation State
  const [authState, setAuthState] = useState<
    "loading" | "setup" | "locked" | "unlocked"
  >("loading");
  const [view, setView] = useState<
    "scanner" | "openbets" | "history" | "analysis" | "bankroll"
  >("scanner");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modular Hooks for Scanner, Bankroll, and Tracked Bets
  const {
    apiKey,
    status,
    bets,
    requestsRemaining,
    lastUpdated,
    errorMessage,
    setErrorMessage,
    selectedLeagues,
    setSelectedLeagues,
    runScan,
    handleSaveKey,
  } = useScanner();

  const {
    transactions,
    exchangeBankrolls,
    bankroll,
    handleAddTransaction,
    loadTransactions,
    addTransactionDirect,
  } = useBankroll(setErrorMessage);

  const {
    trackedBets,
    loadTrackedBets,
    handleTrackBet,
    handleDeleteTrackedBet,
    settleBet,
    settleAll,
  } = useTrackedBets(
    bankroll,
    addTransactionDirect,
    setErrorMessage,
    apiKey || "",
  );

  // Authentication check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const pinExists = await isPinSetUp();
      if (!pinExists) {
        setAuthState("setup");
        return;
      }
      if (await isSessionValid()) setAuthState("unlocked");
      else setAuthState("locked");
    };
    checkAuth();
  }, []);

  // Initial data loading from Supabase once unlocked
  useEffect(() => {
    if (authState !== "unlocked" || dataLoaded) return;

    const loadData = async () => {
      try {
        setLoadError(null);
        await Promise.all([loadTrackedBets(), loadTransactions()]);
        setDataLoaded(true);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        setLoadError("Failed to load data from database. Please try again.");
      }
    };
    loadData();
  }, [authState, dataLoaded, loadTrackedBets, loadTransactions]);

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse font-medium tracking-widest uppercase text-xs">
          Initialising...
        </div>
      </div>
    );
  }

  if (authState === "setup") {
    return (
      <PinLock
        mode="setup"
        onSuccess={() => setAuthState("unlocked")}
        onVerify={verifyPin}
        onSetup={setPin}
      />
    );
  }

  if (authState === "locked") {
    return (
      <PinLock
        mode="login"
        onSuccess={() => setAuthState("unlocked")}
        onVerify={verifyPin}
        onSetup={setPin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
              <Trophy className="w-8 h-8 text-slate-950" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Value Bet Finder
              </h1>
              <p className="text-slate-500 font-medium">
                Professional Edge Scanner
              </p>
            </div>
          </div>

          <nav className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 backdrop-blur-sm self-start overflow-x-auto max-w-full no-scrollbar">
            {[
              { id: "scanner", icon: Search, label: "Scanner" },
              { id: "openbets", icon: ClipboardList, label: "Open Bets" },
              { id: "history", icon: History, label: "History" },
              { id: "analysis", icon: BarChart3, label: "Analysis" },
              { id: "bankroll", icon: Wallet, label: "Bankroll" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap ${
                  view === item.id
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <item.icon className="w-4.5 h-4.5" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </header>

        {(errorMessage || loadError) && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMessage || loadError}</p>
            </div>
            <button
              onClick={() =>
                errorMessage ? setErrorMessage("") : setLoadError(null)
              }
              className="text-xs font-bold uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {view === "scanner" ? (
          <ErrorBoundary key="scanner" fallbackLabel="Scanner">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4 text-slate-400">
                    <div className="flex flex-col text-center md:text-left">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                        Last Scan
                      </span>
                      <span className="text-sm font-mono font-medium text-slate-300">
                        {lastUpdated
                          ? lastUpdated.toLocaleTimeString()
                          : "Never"}
                      </span>
                    </div>
                    <div className="hidden md:block w-px h-8 bg-slate-800/50" />
                    <div className="flex flex-col text-center md:text-left">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                        Found
                      </span>
                      <span className="text-sm font-mono font-medium text-slate-300">
                        {bets.length} Edges
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {status === "no-key" && (
                      <ApiKeyInput onSave={handleSaveKey} />
                    )}
                    <button
                      onClick={runScan}
                      disabled={status === "loading" || status === "no-key"}
                      className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold transition-all ${
                        status === "loading" || status === "no-key"
                          ? "opacity-40 cursor-not-allowed bg-slate-800"
                          : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-95"
                      }`}
                    >
                      <RefreshCw
                        className={`w-4.5 h-4.5 ${status === "loading" ? "animate-spin" : ""}`}
                      />
                      {status === "loading" ? "Scanning..." : "Run Scan"}
                    </button>
                  </div>
                </div>

                {status === "loading" ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800/50">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      <Search className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-6 text-slate-400 font-medium animate-pulse">
                      Scanning exchange markets...
                    </p>
                  </div>
                ) : status === "empty" ? (
                  <div className="text-center py-20 bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800/50">
                    <p className="text-slate-400 font-medium">
                      No value bets found for selected leagues.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bets.map((bet) => (
                      <BetCard
                        key={bet.id}
                        bet={bet}
                        onTrack={handleTrackBet}
                        isTracked={trackedBets.some((tb) => tb.id === bet.id)}
                        bankroll={bankroll}
                        exchangeBankrolls={exchangeBankrolls}
                      />
                    ))}
                  </div>
                )}
              </div>

              <aside className="lg:col-span-4 sticky top-8">
                <LeagueSelector
                  selected={selectedLeagues}
                  onChange={setSelectedLeagues}
                  disabled={status === "loading"}
                />
              </aside>
            </div>
          </ErrorBoundary>
        ) : view === "openbets" ? (
          <ErrorBoundary key="openbets" fallbackLabel="Open Bets">
            <OpenBetsView
              bets={trackedBets}
              onDeleteBet={handleDeleteTrackedBet}
              onSettleBet={settleBet}
              onSettleAll={settleAll}
            />
          </ErrorBoundary>
        ) : view === "history" ? (
          <ErrorBoundary key="history" fallbackLabel="History">
            <BetHistoryView
              bets={trackedBets}
              onDeleteBet={handleDeleteTrackedBet}
              onSettleBet={settleBet}
            />
          </ErrorBoundary>
        ) : view === "analysis" ? (
          <ErrorBoundary key="analysis" fallbackLabel="Analysis">
            <AnalysisView bets={trackedBets} />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary key="bankroll" fallbackLabel="Bankroll">
            <BankrollView
              transactions={transactions}
              exchangeBankrolls={exchangeBankrolls}
              onAddTransaction={handleAddTransaction}
            />
          </ErrorBoundary>
        )}

        <footer className="mt-12 pb-8 flex justify-center">
          <div className="flex flex-col gap-1.5 bg-slate-900 px-6 py-3 rounded-full border border-slate-800 w-64 shadow-lg">
            <div className="flex justify-center items-center text-xs text-slate-400">
              <span className="text-slate-300 font-medium">
                {requestsRemaining !== null
                  ? Math.max(0, 10000 - requestsRemaining).toLocaleString()
                  : "—"}{" "}
                of 10,000 used
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  requestsRemaining === null
                    ? "w-0"
                    : ((10000 - requestsRemaining) / 10000) * 100 >= 90
                      ? "bg-red-500"
                      : ((10000 - requestsRemaining) / 10000) * 100 >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                }`}
                style={{
                  width: `${requestsRemaining === null ? 0 : Math.min(100, Math.max(0, ((10000 - requestsRemaining) / 10000) * 100))}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-600 text-center">
              Resets{" "}
              {new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                1,
              ).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
