import React, { useState, useEffect } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
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
import { RefreshCw, AlertTriangle, Trophy, Search } from "lucide-react";

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
  const [customCommission, setCustomCommission] = useState("");

  const {
    apiKey,
    status,
    bets,
    requestsRemaining,
    requestsUsed,
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
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Value Bet Finder
              </h1>
            </div>
          </div>

          <nav className="flex bg-slate-900 rounded-xl border border-slate-800/50 self-start overflow-x-auto max-w-full no-scrollbar divide-x divide-slate-800">
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
                className={`min-w-[110px] text-center px-5 py-2.5 transition-all duration-200 whitespace-nowrap text-sm first:rounded-l-xl last:rounded-r-xl ${
                  view === item.id
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 z-10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {item.label}
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
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm gap-4 relative z-20">
                <div className="flex items-center gap-6">
                  <LeagueSelector
                    selected={selectedLeagues}
                    onChange={setSelectedLeagues}
                    disabled={status === "loading"}
                  />
                  <div className="text-sm text-slate-400">
                    <span className="font-bold text-white">{bets.length}</span>{" "}
                    edges found
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {status === "no-key" && (
                    <ApiKeyInput onSave={handleSaveKey} />
                  )}
                  <button
                    onClick={runScan}
                    disabled={status === "loading" || status === "no-key"}
                    className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold transition-all w-full md:w-auto ${
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
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                          <th className="px-6 py-3 border-b border-slate-800/50">
                            Match
                          </th>
                          <th className="px-6 py-3 border-b border-slate-800/50">
                            Selection
                          </th>
                          <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                            True Odds
                          </th>
                          <th className="px-6 py-3 border-b border-slate-800/50">
                            Exchange
                          </th>
                          <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                            Odds
                          </th>
                          <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                            Edge
                          </th>
                          <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                            Stake
                          </th>
                          <th className="px-6 py-3 border-b border-slate-800/50 text-center">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bets.map((bet, index) => {
                          const isTracked = trackedBets.some(
                            (tb) => tb.id === bet.id,
                          );
                          const isExpanded = expandedBetId === bet.id;
                          const activeOffer =
                            isExpanded && localSelectedExchangeKey
                              ? bet.offers.find(
                                  (o) =>
                                    o.exchangeKey === localSelectedExchangeKey,
                                ) || bet.offers[0]
                              : bet.offers[0];

                          const mainOffer = bet.offers[0];
                          const kellyStake =
                            Math.max(0, bankroll) *
                            (activeOffer.kellyPercent / 100) *
                            0.3;
                          const formattedDate =
                            bet.kickoff.toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            }) +
                            ", " +
                            bet.kickoff.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                          return (
                            <React.Fragment key={bet.id}>
                              {/* Primary Row */}
                              <tr
                                className={`group hover:bg-slate-800/30 transition-colors ${index !== 0 ? "border-t border-slate-800/50" : ""}`}
                              >
                                <td
                                  className="px-6 py-3.5"
                                  rowSpan={bet.offers.length}
                                >
                                  <div className="font-medium text-slate-200">
                                    {bet.homeTeam} vs {bet.awayTeam}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-500">
                                      {bet.sport}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {formattedDate}
                                    </span>
                                  </div>
                                </td>
                                <td
                                  className="px-6 py-3.5"
                                  rowSpan={bet.offers.length}
                                >
                                  <div className="text-[15px] font-extrabold text-white">
                                    {bet.selection}
                                  </div>
                                </td>
                                <td
                                  className="px-6 py-3.5 text-right"
                                  rowSpan={bet.offers.length}
                                >
                                  <div className="font-semibold text-slate-500">
                                    {bet.fairPrice.toFixed(2)}
                                  </div>
                                </td>
                                {/* Exchange specific cells for main offer */}
                                <td className="px-6 py-3.5">
                                  <div className="font-bold text-slate-300">
                                    {mainOffer.exchangeName}
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  <div className="font-bold text-white tabular-nums">
                                    {mainOffer.price.toFixed(2)}
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  <div className="font-bold text-emerald-400">
                                    {mainOffer.netEdgePercent > 0 ? "+" : ""}
                                    {mainOffer.netEdgePercent.toFixed(1)}%
                                  </div>
                                </td>
                                <td
                                  className="px-6 py-3.5 text-right"
                                  rowSpan={bet.offers.length}
                                >
                                  <div className="font-extrabold text-white">
                                    £{kellyStake.toFixed(2)}
                                  </div>
                                </td>
                                <td
                                  className="px-6 py-3.5 text-center"
                                  rowSpan={bet.offers.length}
                                >
                                  {isTracked ? (
                                    <span className="text-slate-600 text-sm font-medium">
                                      Tracked
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (expandedBetId === bet.id) {
                                          setExpandedBetId(null);
                                        } else {
                                          setExpandedBetId(bet.id);
                                          setLocalSelectedExchangeKey(
                                            mainOffer.exchangeKey,
                                          );
                                        }
                                      }}
                                      className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-colors shadow-lg ${
                                        expandedBetId === bet.id
                                          ? "bg-slate-700 text-slate-300 shadow-none"
                                          : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                                      }`}
                                    >
                                      {expandedBetId === bet.id
                                        ? "Cancel"
                                        : "Track Bet"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {/* Sub-rows for additional offers */}
                              {bet.offers.slice(1).map((offer) => (
                                <tr
                                  key={offer.exchangeKey}
                                  className="group hover:bg-slate-800/30 transition-colors border-none"
                                >
                                  <td className="px-6 py-1.5">
                                    <div className="font-normal text-slate-500">
                                      {offer.exchangeName}
                                    </div>
                                  </td>
                                  <td className="px-6 py-1.5 text-right">
                                    <div className="font-semibold text-slate-500 tabular-nums">
                                      {offer.price.toFixed(2)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-1.5 text-right">
                                    <div className="font-medium text-slate-500">
                                      {offer.netEdgePercent > 0 ? "+" : ""}
                                      {offer.netEdgePercent.toFixed(1)}%
                                    </div>
                                  </td>
                                </tr>
                              ))}

                              {/* Expansion Row for Commission Picker */}
                              {expandedBetId === bet.id && (
                                <tr className="bg-slate-950/50 border-t border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <td colSpan={8} className="px-6 py-4">
                                    <div className="flex items-center gap-6">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
                                          Commission:
                                        </span>
                                        <div className="flex gap-2">
                                          <button
                                            disabled={isTracking}
                                            onClick={() =>
                                              handleCommissionSelect(bet, 0)
                                            }
                                            className="px-3 py-1 text-xs font-bold rounded-md bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                                          >
                                            0%
                                          </button>
                                          <button
                                            disabled={isTracking}
                                            onClick={() =>
                                              handleCommissionSelect(bet, 2)
                                            }
                                            className="px-3 py-1 text-xs font-bold rounded-md bg-amber-900/30 text-amber-400 border border-amber-500/30 hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                                          >
                                            2%
                                          </button>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              disabled={isTracking}
                                              value={customCommission}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (
                                                  val === "" ||
                                                  /^\d*\.?\d{0,2}$/.test(val)
                                                ) {
                                                  setCustomCommission(val);
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  handleCommissionSelect(
                                                    bet,
                                                    parseFloat(
                                                      customCommission,
                                                    ),
                                                  );
                                                  return;
                                                }

                                                // Allow control keys
                                                const allowedKeys = [
                                                  "Backspace",
                                                  "Delete",
                                                  "Tab",
                                                  "Escape",
                                                  "Enter",
                                                  "ArrowLeft",
                                                  "ArrowRight",
                                                  "ArrowUp",
                                                  "ArrowDown",
                                                  ".",
                                                ];
                                                if (
                                                  !allowedKeys.includes(
                                                    e.key,
                                                  ) &&
                                                  !/^\d$/.test(e.key)
                                                ) {
                                                  e.preventDefault();
                                                }
                                              }}
                                              onBlur={() => {
                                                if (customCommission)
                                                  handleCommissionSelect(
                                                    bet,
                                                    parseFloat(
                                                      customCommission,
                                                    ),
                                                  );
                                              }}
                                              placeholder="Custom %"
                                              className="w-20 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="w-px h-6 bg-slate-800" />

                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
                                          Exchange:
                                        </span>
                                        <div className="flex gap-2">
                                          {bet.offers.map((offer) => (
                                            <button
                                              key={offer.exchangeKey}
                                              disabled={isTracking}
                                              onClick={() =>
                                                setLocalSelectedExchangeKey(
                                                  offer.exchangeKey,
                                                )
                                              }
                                              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors border ${
                                                localSelectedExchangeKey ===
                                                offer.exchangeKey
                                                  ? "bg-blue-600 border-blue-500 text-white"
                                                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                                              }`}
                                            >
                                              {offer.exchangeName}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {isTracking ? (
                                        <div className="flex items-center gap-2 ml-auto text-blue-400 text-[10px] font-bold uppercase">
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                          Tracking...
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setExpandedBetId(null)}
                                          className="ml-auto text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
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
