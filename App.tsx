import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { BetCard } from "./components/BetCard";
import { LeagueSelector } from "./components/LeagueSelector";
import { AnalysisView } from "./components/AnalysisView";
import { BankrollView } from "./components/bankroll/BankrollView";
import { PinLock } from "./components/PinLock";
import { fetchOddsData, calculateEdges } from "./services/edgeFinder";
import {
  isPinSetUp,
  isSessionValid,
  setPin,
  verifyPin,
  fetchAllBets,
  fetchAllTransactions,
  insertBet,
  updateBet as supabaseUpdateBet,
  deleteBet as supabaseDeleteBet,
  insertBets,
  insertTransaction,
  insertTransactions,
  migrateLocalStorageToSupabase,
} from "./services/supabase";
import {
  BetEdge,
  FetchStatus,
  TrackedBet,
  MatchResponse,
  ExchangeBankroll,
  BankrollTransaction,
} from "./types";
import { LEAGUES, HARDCODED_API_KEY } from "./constants";
import {
  RefreshCw,
  AlertTriangle,
  Trophy,
  Search,
  BarChart3,
  Wallet,
} from "lucide-react";

const STORAGE_KEY = "ods_api_key";

const App: React.FC = () => {
  // Auth state
  const [authState, setAuthState] = useState<
    "loading" | "setup" | "locked" | "unlocked"
  >("loading");

  const [apiKey, setApiKey] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    if (HARDCODED_API_KEY && HARDCODED_API_KEY.length > 5)
      return HARDCODED_API_KEY;
    return null;
  });
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [status, setStatus] = useState<FetchStatus>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const hasKey =
      stored || (HARDCODED_API_KEY && HARDCODED_API_KEY.length > 5);
    return hasKey ? "idle" : "no-key";
  });

  // Data State
  const [rawMatches, setRawMatches] = useState<MatchResponse[]>([]);
  const [trackedBets, setTrackedBets] = useState<TrackedBet[]>([]);
  const [transactions, setTransactions] = useState<BankrollTransaction[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const exchangeBankrolls = useMemo(() => {
    const totals: ExchangeBankroll = { smarkets: 0, matchbook: 0, betfair: 0 };
    transactions.forEach((t) => {
      totals[t.exchange] += t.amount;
    });
    return totals;
  }, [transactions]);

  const bankroll = useMemo(() => {
    return (
      exchangeBankrolls.smarkets +
      exchangeBankrolls.matchbook +
      exchangeBankrolls.betfair
    );
  }, [exchangeBankrolls]);

  const [remainingRequests, setRemainingRequests] = useState<number | null>(
    null,
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // UI State
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(
    LEAGUES.map((l) => l.key),
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [view, setView] = useState<"scanner" | "analysis" | "bankroll">(
    "scanner",
  );

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const pinExists = await isPinSetUp();
      if (!pinExists) {
        setAuthState("setup");
        return;
      }

      const sessionValid = await isSessionValid();
      if (sessionValid) {
        setAuthState("unlocked");
      } else {
        setAuthState("locked");
      }
    };
    checkAuth();
  }, []);

  // Load data from Supabase once unlocked
  useEffect(() => {
    if (authState !== "unlocked" || dataLoaded) return;

    const loadData = async () => {
      // Try migration first (one-time, only runs if Supabase is empty)
      const migration = await migrateLocalStorageToSupabase();
      if (migration.bets > 0 || migration.transactions > 0) {
        console.log(
          `Migrated ${migration.bets} bets and ${migration.transactions} transactions to Supabase`,
        );
      }

      // Load from Supabase
      const [bets, txs] = await Promise.all([
        fetchAllBets(),
        fetchAllTransactions(),
      ]);

      setTrackedBets(bets);
      setTransactions(txs);
      setDataLoaded(true);
    };

    loadData();
  }, [authState, dataLoaded]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setIsChangingKey(false);
    setStatus("idle");
  };

  const handleCancelChangeKey = () => {
    setIsChangingKey(false);
  };

  const handleTrackBet = async (bet: BetEdge, notes?: string) => {
    const now = Date.now();
    const hoursBeforeKickoff =
      (bet.kickoff.getTime() - now) / (1000 * 60 * 60);
    let timingBucket: "48hr+" | "24-48hr" | "12-24hr" | "<12hr" = "<12hr";

    if (hoursBeforeKickoff >= 48) timingBucket = "48hr+";
    else if (hoursBeforeKickoff >= 24) timingBucket = "24-48hr";
    else if (hoursBeforeKickoff >= 12) timingBucket = "12-24hr";

    const fractionalKellyStake = bankroll * ((bet.kellyPercent / 100) * 0.3);

    const newTrackedBet: TrackedBet = {
      ...bet,
      placedAt: now,
      fairPriceAtBet: bet.fairPrice,
      status: "open",
      hoursBeforeKickoff,
      timingBucket,
      notes,
      flatStake: 1,
      kellyStake: fractionalKellyStake,
    };

    // Optimistic update
    setTrackedBets((prev) => [...prev, newTrackedBet]);
    // Persist to Supabase
    await insertBet(newTrackedBet);
  };

  const handleUpdateTrackedBet = async (updatedBet: TrackedBet) => {
    const oldBet = trackedBets.find((b) => b.id === updatedBet.id);

    // If the bet just settled, create a bankroll transaction
    if (
      oldBet &&
      !oldBet.result &&
      updatedBet.result &&
      updatedBet.kellyPL !== undefined
    ) {
      const pl =
        updatedBet.kellyPL !== undefined
          ? updatedBet.kellyPL
          : updatedBet.flatPL || 0;

      let bankrollKey: keyof ExchangeBankroll = "smarkets";
      if (updatedBet.exchangeKey === "matchbook") bankrollKey = "matchbook";
      if (updatedBet.exchangeKey === "betfair_ex_uk") bankrollKey = "betfair";

      let type: BankrollTransaction["type"] = "bet_win";
      if (updatedBet.result === "lost") type = "bet_loss";
      else if (updatedBet.result === "void") type = "bet_void";

      const transaction: BankrollTransaction = {
        id: `bet-${updatedBet.id}-${Date.now()}`,
        timestamp: Date.now(),
        exchange: bankrollKey,
        type,
        amount: pl,
        betId: updatedBet.id,
      };

      // Optimistic update
      setTransactions((prev) => [...prev, transaction]);
      // Persist to Supabase
      await insertTransaction(transaction);
    }

    // Optimistic update
    setTrackedBets((prev) =>
      prev.map((b) => (b.id === updatedBet.id ? updatedBet : b)),
    );
    // Persist to Supabase
    await supabaseUpdateBet(updatedBet);
  };

  const handleDeleteTrackedBet = async (id: string) => {
    if (window.confirm("Delete this record?")) {
      // Optimistic update
      setTrackedBets((prev) => prev.filter((b) => b.id !== id));
      // Persist to Supabase
      await supabaseDeleteBet(id);
    }
  };

  const handleImportBets = async (newBets: TrackedBet[]) => {
    // Optimistic update
    setTrackedBets((prev) => [...prev, ...newBets]);
    // Persist to Supabase
    await insertBets(newBets);
  };

  const handleAddTransaction = async (t: BankrollTransaction) => {
    // Optimistic update
    setTransactions((prev) => [...prev, t]);
    // Persist to Supabase
    await insertTransaction(t);
  };

  // --- Core Logic ---

  // 1. Fetching Data
  const runScan = useCallback(async () => {
    if (!apiKey) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const { matches, remainingRequests: remaining } = await fetchOddsData(
        apiKey,
        selectedLeagues,
      );
      setRawMatches(matches);
      setRemainingRequests(remaining);
      setLastUpdated(new Date());
      setStatus("success");
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "AUTH_ERROR") {
        setErrorMessage(
          "Invalid API Key. Please check your environment variable.",
        );
        setStatus("error");
      } else if (msg === "QUOTA_EXCEEDED") {
        setErrorMessage(
          "API quota exceeded. Resets monthly — check your plan at the-odds-api.com",
        );
        setStatus("error");
      } else {
        setErrorMessage("Network error. Check console for details.");
        setStatus("error");
      }
    }
  }, [apiKey, selectedLeagues]);

  // 2. Processing Data (Memoized to run when matches or filter changes)
  const bets = useMemo(() => {
    if (rawMatches.length === 0) return [];
    return calculateEdges(rawMatches);
  }, [rawMatches]);

  // --- Auth Views ---

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
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

  // --- API Key Input ---
  if (!apiKey || isChangingKey) {
    return (
      <ApiKeyInput
        onSave={handleSaveKey}
        onCancel={apiKey ? handleCancelChangeKey : undefined}
      />
    );
  }

  // --- Loading data ---
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading your data...</div>
      </div>
    );
  }

  // View: Main App
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-3">
              <Trophy className="text-blue-500" />
              Value Bet Finder
            </h1>
          </div>

          <div className="flex items-center gap-3"></div>
        </div>

        {/* View Switcher */}
        <div className="flex mb-6 bg-slate-900 border border-slate-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setView("scanner")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-semibold ${view === "scanner" ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Search className="w-4 h-4" /> Bet Finder
          </button>

          <button
            onClick={() => setView("analysis")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-semibold ${view === "analysis" ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "text-slate-400 hover:text-slate-200"}`}
          >
            <BarChart3 className="w-4 h-4" /> Analysis
          </button>
          <button
            onClick={() => setView("bankroll")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-semibold ${view === "bankroll" ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Wallet className="w-4 h-4" /> Bankroll
          </button>
        </div>

        {view === "scanner" ? (
          <>
            {/* Controls */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <LeagueSelector
                  selected={selectedLeagues}
                  onChange={setSelectedLeagues}
                  disabled={status === "loading"}
                />
                <button
                  onClick={runScan}
                  disabled={
                    status === "loading" || selectedLeagues.length === 0
                  }
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`}
                  />
                  {status === "loading" ? "Scanning..." : "Fetch Odds"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-slate-500 ml-auto">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Main Content Area */}
            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {errorMessage}
              </div>
            )}

            {status === "idle" && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-slate-300">
                  No odds loaded
                </h3>
                <p className="text-slate-500 mt-2 max-w-md text-center">
                  Select your competitions and click "Fetch Odds" to start
                  looking for value.
                </p>
              </div>
            )}

            {status === "success" && bets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <div className="text-5xl mb-4">😐</div>
                <h3 className="text-xl font-semibold text-slate-300">
                  No edges found
                </h3>
                <p className="text-slate-500 mt-2 max-w-md text-center">
                  The market is efficient right now (no edges {">"}= 2.0%). Try
                  refreshing later.
                </p>
              </div>
            )}

            {bets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bets.map((bet) => (
                  <BetCard
                    key={bet.id}
                    bet={bet}
                    onTrack={handleTrackBet}
                    isTracked={trackedBets.some((tb) => tb.id === bet.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : view === "analysis" ? (
          <AnalysisView
            bets={trackedBets}
            apiKey={apiKey}
            exchangeBankrolls={exchangeBankrolls}
            transactions={transactions}
            onUpdateBet={handleUpdateTrackedBet}
            onDeleteBet={handleDeleteTrackedBet}
            onImportBets={handleImportBets}
            onAddTransaction={handleAddTransaction}
          />
        ) : (
          <BankrollView
            transactions={transactions}
            exchangeBankrolls={exchangeBankrolls}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {/* Footer info */}
        <div className="mt-12 text-center text-slate-600 text-sm pb-8">
          {remainingRequests !== null && (
            <div className="mb-3 inline-flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 text-xs text-slate-400">
              <div
                className={`w-2 h-2 rounded-full ${remainingRequests < 50 ? "bg-red-500" : "bg-emerald-500"}`}
              ></div>
              API Quota:{" "}
              <span
                className={
                  remainingRequests < 50
                    ? "text-red-400 font-bold"
                    : "text-slate-300"
                }
              >
                {remainingRequests}
              </span>{" "}
              requests remaining
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
