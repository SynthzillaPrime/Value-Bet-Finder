import React, { useState, useEffect } from "react";
import { LeagueSelector } from "./components/LeagueSelector";
import { AnalysisView } from "./components/AnalysisView";
import { BankrollView } from "./components/bankroll/BankrollView";
import { OpenBetsView } from "./components/OpenBetsView";
import { BetHistoryView } from "./components/BetHistoryView";
import { ScannerTable } from "./components/ScannerTable";
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
  Zap,
  CheckCircle2,
  Settings,
  X,
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
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [localSelectedExchangeKey, setLocalSelectedExchangeKey] = useState<
    string | null
  >(null);
  const [isTracking, setIsTracking] = useState(false);
  const [batchTrackingStatus, setBatchTrackingStatus] = useState<{
    current: number;
    total: number;
    done: boolean;
  } | null>(null);
  const [batchExchange, setBatchExchange] = useState<string>("matchbook");
  const [customCommission, setCustomCommission] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");

  const {
    apiKey,
    status,
    bets,
    requestsRemaining,
    requestsUsed,
    fixtureCounts,
    isCheckingFixtures,
    loadFixtureCounts,
    errorMessage,
    setErrorMessage,
    selectedLeagues,
    setSelectedLeagues,
    runScan,
    setApiKey,
  } = useScanner();

  const {
    transactions,
    exchangeBankrolls,
    bankroll,
    handleAddTransaction,
    loadTransactions,
    addTransactionDirect,
    updateTransactionByBetId,
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
    updateTransactionByBetId,
    setErrorMessage,
    apiKey || "",
  );

  useEffect(() => {
    if (status === "no-key" && !apiKey) {
      setShowSettings(true);
      setShowApiKeyInput(true);
    }
  }, [status, apiKey]);

  const handleCommissionSelect = async (bet: any, commission: number) => {
    if (isNaN(commission) || commission < 0 || commission > 100) return;
    setIsTracking(true);
    try {
      await handleTrackBet(
        bet,
        commission,
        localSelectedExchangeKey || bet.offers[0].exchangeKey,
      );
      setExpandedBetId(null);
      setCustomCommission("");
    } catch (error) {
      console.error("Tracking failed:", error);
    } finally {
      setIsTracking(false);
    }
  };

  const handleTrackAll = async () => {
    // Filter for bets that aren't already tracked on this specific exchange
    // We check for matchId + selection + exchangeKey to avoid duplicates
    const untrackedBets = bets.filter((bet) => {
      const alreadyTracked = trackedBets.some(
        (tb) =>
          tb.id === bet.id &&
          tb.selection === bet.selection &&
          tb.exchangeKey === batchExchange,
      );

      // Only track if it hasn't been tracked and it actually has an offer for the selected exchange
      const hasExchangeOffer = bet.offers.some(
        (o) => o.exchangeKey === batchExchange,
      );

      return !alreadyTracked && hasExchangeOffer;
    });

    if (untrackedBets.length === 0) return;

    setIsTracking(true);
    setBatchTrackingStatus({
      current: 0,
      total: untrackedBets.length,
      done: false,
    });

    for (let i = 0; i < untrackedBets.length; i++) {
      const bet = untrackedBets[i];
      setBatchTrackingStatus((prev) =>
        prev ? { ...prev, current: i + 1 } : null,
      );

      try {
        // Track with 2% commission as per requirements
        await handleTrackBet(bet, 2, batchExchange);
      } catch (error) {
        console.error(`Failed to track bet ${bet.id}:`, error);
      }
    }

    setBatchTrackingStatus((prev) => (prev ? { ...prev, done: true } : null));
    setIsTracking(false);

    // Clear confirmation message after 3 seconds
    setTimeout(() => {
      setBatchTrackingStatus(null);
    }, 3000);
  };

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
        <header className="flex items-center justify-between mb-12 p-1">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight hidden sm:block">
              VALUE<span className="text-emerald-500">BET</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Settings
                    </h3>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                        Odds API Key
                      </label>
                      {showApiKeyInput || !apiKey ? (
                        <div className="space-y-2">
                          <input
                            type="password"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setApiKey(newApiKey);
                                setShowApiKeyInput(false);
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                            >
                              Save
                            </button>
                            {apiKey && (
                              <button
                                onClick={() => setShowApiKeyInput(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-400 tabular-nums">
                              ••••••••{apiKey.slice(-4)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setNewApiKey(apiKey);
                                  setShowApiKeyInput(true);
                                }}
                                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 px-1"
                              >
                                Change
                              </button>
                              <button
                                onClick={() => setApiKey("")}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 px-1"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <nav className="flex items-center bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
              {[
                { id: "scanner", label: "Scanner" },
                { id: "openbets", label: "Open Bets" },
                { id: "history", label: "History" },
                { id: "analysis", label: "Analysis" },
                { id: "bankroll", label: "Bankroll" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                    view === item.id
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
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
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm gap-4 relative z-20">
                <div className="flex items-center gap-6">
                  <LeagueSelector
                    selected={selectedLeagues}
                    onChange={setSelectedLeagues}
                    disabled={status === "loading"}
                    fixtureCounts={fixtureCounts}
                    onCheckFixtures={loadFixtureCounts}
                    isCheckingFixtures={isCheckingFixtures}
                  />
                  <div className="text-sm text-slate-400">
                    <span className="font-bold text-white">{bets.length}</span>{" "}
                    edges found
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {status === "success" && bets.length > 0 && (
                    <div className="flex items-center gap-2 bg-slate-900/40 p-1.5 pr-3 rounded-xl border border-slate-800/60 backdrop-blur-sm">
                      <select
                        value={batchExchange}
                        onChange={(e) => setBatchExchange(e.target.value)}
                        disabled={isTracking}
                        className="bg-slate-800/80 text-white text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      >
                        <option value="matchbook">Matchbook</option>
                        <option value="smarkets">Smarkets</option>
                      </select>
                      <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap px-1">
                        at 2% commission
                      </span>
                      <button
                        onClick={handleTrackAll}
                        disabled={
                          isTracking ||
                          !bets.some(
                            (bet) =>
                              bet.offers.some(
                                (o) => o.exchangeKey === batchExchange,
                              ) &&
                              !trackedBets.some(
                                (tb) =>
                                  tb.id === bet.id &&
                                  tb.selection === bet.selection &&
                                  tb.exchangeKey === batchExchange,
                              ),
                          )
                        }
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          batchTrackingStatus?.done
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                        }`}
                      >
                        {isTracking && batchTrackingStatus ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Tracking {batchTrackingStatus.current}/
                            {batchTrackingStatus.total}...
                          </>
                        ) : batchTrackingStatus?.done ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {batchTrackingStatus.total} bets tracked
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            Track All
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={
                      status === "no-key"
                        ? () => setShowSettings(true)
                        : runScan
                    }
                    disabled={status === "loading"}
                    className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold transition-all w-full md:w-auto ${
                      status === "loading"
                        ? "opacity-40 cursor-not-allowed bg-slate-800"
                        : status === "no-key"
                          ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                          : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-95"
                    }`}
                  >
                    <RefreshCw
                      className={`w-4.5 h-4.5 ${status === "loading" ? "animate-spin" : ""}`}
                    />
                    {status === "loading"
                      ? "Scanning..."
                      : status === "no-key"
                        ? "Set API Key"
                        : "Run Scan"}
                  </button>
                </div>
              </div>

              {status === "loading" ? (
                <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-800/50">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <Search className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="mt-6 text-slate-400 font-medium animate-pulse">
                    Scanning exchange markets...
                  </p>
                </div>
              ) : status === "empty" ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-800/50">
                  <p className="text-slate-400 font-medium">
                    No value bets found for selected leagues.
                  </p>
                </div>
              ) : (
                <ScannerTable
                  bets={bets}
                  trackedBets={trackedBets}
                  bankroll={bankroll}
                  expandedBetId={expandedBetId}
                  setExpandedBetId={setExpandedBetId}
                  localSelectedExchangeKey={localSelectedExchangeKey}
                  setLocalSelectedExchangeKey={setLocalSelectedExchangeKey}
                  isTracking={isTracking}
                  customCommission={customCommission}
                  setCustomCommission={setCustomCommission}
                  handleCommissionSelect={handleCommissionSelect}
                />
              )}
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
            <AnalysisView bets={trackedBets} transactions={transactions} />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary key="bankroll" fallbackLabel="Bankroll">
            <BankrollView
              transactions={transactions}
              exchangeBankrolls={exchangeBankrolls}
              onAddTransaction={handleAddTransaction}
              trackedBets={trackedBets}
            />
          </ErrorBoundary>
        )}

        <footer className="mt-12 pb-8 flex justify-center">
          <div className="flex flex-col gap-1.5 bg-slate-900 px-6 py-3 rounded-full border border-slate-800 w-64 shadow-lg">
            <div className="flex justify-center items-center text-xs text-slate-400">
              <span className="text-slate-300 font-medium">
                {requestsUsed !== null && requestsRemaining !== null ? (
                  <>
                    API: {requestsUsed.toLocaleString()} /{" "}
                    {(requestsUsed + requestsRemaining).toLocaleString()} used
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  requestsUsed === null || requestsRemaining === null
                    ? "w-0"
                    : (requestsUsed / (requestsUsed + requestsRemaining)) *
                          100 >=
                        90
                      ? "bg-red-500"
                      : (requestsUsed / (requestsUsed + requestsRemaining)) *
                            100 >=
                          70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                }`}
                style={{
                  width: `${
                    requestsUsed === null || requestsRemaining === null
                      ? 0
                      : Math.min(
                          100,
                          Math.max(
                            0,
                            (requestsUsed /
                              (requestsUsed + requestsRemaining)) *
                              100,
                          ),
                        )
                  }%`,
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
