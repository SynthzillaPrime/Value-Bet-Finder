import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { BetCard } from "./components/BetCard";
import { LeagueSelector } from "./components/LeagueSelector";
import { BetTracker } from "./components/BetTracker";
import { AnalysisView } from "./components/AnalysisView";
import { fetchOddsData, calculateEdges } from "./services/edgeFinder";
import { BetEdge, FetchStatus, TrackedBet, MatchResponse } from "./types";
import { LEAGUES, HARDCODED_API_KEY } from "./constants";
import {
  RefreshCw,
  AlertTriangle,
  Trophy,
  Activity,
  Search,
  BarChart3,
} from "lucide-react";

const STORAGE_KEY = "ods_api_key";
const BETS_STORAGE_KEY = "tracked_bets";
const BANKROLL_STORAGE_KEY = "simulated_bankroll";

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [status, setStatus] = useState<FetchStatus>("no-key");

  // Data State
  const [rawMatches, setRawMatches] = useState<MatchResponse[]>([]);
  const [trackedBets, setTrackedBets] = useState<TrackedBet[]>([]);
  const [bankroll, setBankroll] = useState<number>(100);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(
    null,
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // UI State
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(
    LEAGUES.map((l) => l.key),
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [view, setView] = useState<"scanner" | "tracker" | "analysis">(
    "scanner",
  );

  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    const storedBets = localStorage.getItem(BETS_STORAGE_KEY);
    const storedBankroll = localStorage.getItem(BANKROLL_STORAGE_KEY);

    if (storedBankroll) {
      setBankroll(parseFloat(storedBankroll));
    }

    // Priority: 1. LocalStorage, 2. Hardcoded Key
    if (storedKey) {
      setApiKey(storedKey);
      setStatus("idle");
    } else if (HARDCODED_API_KEY && HARDCODED_API_KEY.length > 5) {
      setApiKey(HARDCODED_API_KEY);
      setStatus("idle");
    }

    if (storedBets) {
      try {
        // Revive date strings to Date objects AND Migrate legacy data
        const parsed = JSON.parse(storedBets);
        const revived = parsed.map((b: any) => ({
          ...b,
          kickoff: new Date(b.kickoff),
          // Migration: If legacy smarketsPrice exists but exchangePrice doesn't
          exchangeName: b.exchangeName || "Smarkets",
          exchangeKey: b.exchangeKey || "smarkets",
          exchangePrice: b.exchangePrice || b.smarketsPrice || 0,
        }));
        setTrackedBets(revived);
      } catch (e) {
        console.error("Failed to load tracked bets", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(BETS_STORAGE_KEY, JSON.stringify(trackedBets));
  }, [trackedBets]);

  useEffect(() => {
    localStorage.setItem(BANKROLL_STORAGE_KEY, bankroll.toString());
  }, [bankroll]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setIsChangingKey(false);
    setStatus("idle");
  };

  const handleCancelChangeKey = () => {
    setIsChangingKey(false);
  };

  const handleTrackBet = (bet: BetEdge, notes?: string) => {
    const now = Date.now();
    const hoursBeforeKickoff = (bet.kickoff.getTime() - now) / (1000 * 60 * 60);
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
    setTrackedBets((prev) => [...prev, newTrackedBet]);
  };

  const handleUpdateTrackedBet = (updatedBet: TrackedBet) => {
    const oldBet = trackedBets.find((b) => b.id === updatedBet.id);
    // If the bet just settled, update the bankroll
    if (
      oldBet &&
      !oldBet.result &&
      updatedBet.result &&
      updatedBet.kellyPL !== undefined
    ) {
      setBankroll((prev) => prev + (updatedBet.kellyPL || 0));
    }
    setTrackedBets((prev) =>
      prev.map((b) => (b.id === updatedBet.id ? updatedBet : b)),
    );
  };

  const handleDeleteTrackedBet = (id: string) => {
    if (window.confirm("Delete this record?")) {
      setTrackedBets((prev) => prev.filter((b) => b.id !== id));
    }
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

  // View: API Key Input (Initial or Changing)
  if (!apiKey || isChangingKey) {
    return (
      <ApiKeyInput
        onSave={handleSaveKey}
        onCancel={apiKey ? handleCancelChangeKey : undefined}
      />
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
              Matchday Edge Finder
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-1">
              Smart Money vs Public Money
            </p>
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
            onClick={() => setView("tracker")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-semibold ${view === "tracker" ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Activity className="w-4 h-4" /> Recent Bets{" "}
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
              {trackedBets.length}
            </span>
          </button>
          <button
            onClick={() => setView("analysis")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-semibold ${view === "analysis" ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "text-slate-400 hover:text-slate-200"}`}
          >
            <BarChart3 className="w-4 h-4" /> Analysis
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
        ) : view === "tracker" ? (
          <BetTracker
            bets={trackedBets}
            apiKey={apiKey}
            onUpdateBet={handleUpdateTrackedBet}
            onDeleteBet={handleDeleteTrackedBet}
          />
        ) : (
          <AnalysisView
            bets={trackedBets}
            apiKey={apiKey}
            bankroll={bankroll}
            onUpdateBet={handleUpdateTrackedBet}
            onDeleteBet={handleDeleteTrackedBet}
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
          <p>
            Odds data provided by The-Odds-API. Updates may be delayed by a few
            minutes.
          </p>
          <p className="mt-1">
            Kelly Criterion stakes are suggestions only. Gamble responsibly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
