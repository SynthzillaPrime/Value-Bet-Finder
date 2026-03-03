import React, { useState, useEffect, useRef } from "react";
import { TrackedBet } from "../types";
import { LEAGUES } from "../constants";
import { RefreshCw, Trophy, Trash2, ChevronDown, Download } from "lucide-react";

interface Props {
  bets: TrackedBet[];
  onDeleteBet: (id: string) => Promise<void>;
  onSettleBet: (
    betId: string,
    forceResult?: "won" | "lost" | "void",
  ) => Promise<boolean>;
}

export const BetHistoryView: React.FC<Props> = ({
  bets,
  onDeleteBet,
  onSettleBet,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDeleteClick = (id: string) => {
    if (confirmDeleteId === id) {
      onDeleteBet(id);
      setConfirmDeleteId(null);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    } else {
      setConfirmDeleteId(id);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = setTimeout(() => {
        setConfirmDeleteId(null);
      }, 3000);
    }
  };

  // Filter states
  const [compFilter, setCompFilter] = useState("All Competitions");
  const [timingFilter, setTimingFilter] = useState("All Timing");
  const [oddsFilter, setOddsFilter] = useState("All Odds");
  const [clvFilter, setClvFilter] = useState("All CLV");
  const [resultFilter, setResultFilter] = useState("All Results");

  // Pagination state
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const exportBetsToCSV = (targetBets: TrackedBet[]) => {
    const headers = [
      "Date",
      "Match",
      "Competition",
      "Selection",
      "Market",
      "Exchange",
      "Odds",
      "True Odds",
      "Edge %",
      "Commission %",
      "Kelly Stake",
      "Result",
      "Kelly P/L",
      "CLV %",
      "Closing Odds",
      "Timing Bucket",
      "Placed At",
    ];

    const rows = targetBets.map((bet) => {
      const kickoffDate = new Date(bet.kickoff);
      const placedDate = new Date(bet.placedAt);
      const competition =
        LEAGUES.find((l) => l.key === bet.sportKey)?.name || bet.sport;

      return [
        kickoffDate.toLocaleDateString("en-GB"),
        `"${bet.match}"`,
        competition,
        bet.selection,
        bet.market,
        bet.exchangeName,
        bet.exchangePrice.toFixed(2),
        bet.fairPrice.toFixed(2),
        (bet.baseNetEdgePercent ?? bet.netEdgePercent).toFixed(1),
        bet.commission ?? 0,
        bet.kellyStake.toFixed(2),
        bet.result || "open",
        bet.kellyPL !== undefined ? bet.kellyPL.toFixed(2) : "",
        bet.clvPercent !== undefined ? bet.clvPercent.toFixed(2) : "",
        bet.closingFairPrice !== undefined
          ? bet.closingFairPrice.toFixed(2)
          : "",
        bet.timingBucket,
        `${placedDate.toLocaleDateString("en-GB")} ${placedDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `vbf-bets-${dateStr}.csv`);
    link.click();
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [compFilter, timingFilter, oddsFilter, clvFilter, resultFilter]);

  const filteredBets = bets.filter((bet) => {
    if (compFilter !== "All Competitions" && bet.sport !== compFilter)
      return false;
    if (timingFilter !== "All Timing" && bet.timingBucket !== timingFilter)
      return false;
    if (oddsFilter !== "All Odds") {
      const price = bet.exchangePrice;
      if (oddsFilter === "1.50 - 3.00" && !(price >= 1.5 && price < 3.0))
        return false;
      if (oddsFilter === "3.00 - 6.00" && !(price >= 3.0 && price < 6.0))
        return false;
      if (oddsFilter === "6.00 - 10.00" && !(price >= 6.0 && price <= 10.0))
        return false;
    }
    if (clvFilter !== "All CLV") {
      if (clvFilter === "Positive CLV" && !((bet.clvPercent || 0) > 0))
        return false;
      if (clvFilter === "Negative CLV" && !((bet.clvPercent || 0) < 0))
        return false;
      if (clvFilter === "No CLV" && bet.clvPercent !== undefined) return false;
    }
    if (resultFilter !== "All Results") {
      const res = bet.result?.toLowerCase();
      const status = bet.status;
      if (resultFilter === "Open" && status !== "open") return false;
      if (resultFilter === "Won" && res !== "won") return false;
      if (resultFilter === "Lost" && res !== "lost") return false;
      if (resultFilter === "Void" && res !== "void") return false;
    }
    return true;
  });

  const sortedBets = [...filteredBets].sort(
    (a, b) => b.kickoff.getTime() - a.kickoff.getTime(),
  );

  const totalPages = Math.ceil(sortedBets.length / ITEMS_PER_PAGE);
  const paginatedBets = sortedBets.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Bet History</h2>
            <p className="text-sm text-slate-500 mt-1">
              {bets.length} total · {filteredBets.length} shown
            </p>
          </div>

          <div className="relative">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value === "all") exportBetsToCSV(bets);
                if (e.target.value === "filtered") exportBetsToCSV(sortedBets);
                e.target.value = "";
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-400 outline-none appearance-none cursor-pointer pr-8 min-w-[115px] transition-all shadow-lg shadow-emerald-900/20"
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                Export
              </option>
              <option value="all" className="bg-slate-900 text-white">
                Export All
              </option>
              <option value="filtered" className="bg-slate-900 text-white">
                Export Filtered
              </option>
            </select>
            <Download className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-white pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Competition Filter */}
          <div className="relative">
            <select
              value={compFilter}
              onChange={(e) => setCompFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8"
            >
              <option>All Competitions</option>
              {(() => {
                const uniqueSports = Array.from(
                  new Set(bets.map((b) => b.sport)),
                );
                const sortedSports = uniqueSports.sort((a, b) => {
                  const betA = bets.find((bt) => bt.sport === a);
                  const betB = bets.find((bt) => bt.sport === b);
                  const idxA = LEAGUES.findIndex(
                    (l) => l.key === betA?.sportKey,
                  );
                  const idxB = LEAGUES.findIndex(
                    (l) => l.key === betB?.sportKey,
                  );
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;
                  return a.localeCompare(b);
                });
                return sortedSports.map((sport) => {
                  const representativeBet = bets.find((b) => b.sport === sport);
                  const friendlyName = representativeBet
                    ? LEAGUES.find((l) => l.key === representativeBet.sportKey)
                        ?.name || sport
                    : sport;
                  return (
                    <option key={sport} value={sport}>
                      {friendlyName}
                    </option>
                  );
                });
              })()}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Timing Filter */}
          <div className="relative">
            <select
              value={timingFilter}
              onChange={(e) => setTimingFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8"
            >
              <option>All Timing</option>
              <option>48hr+</option>
              <option>24-48hr</option>
              <option>12-24hr</option>
              <option>&lt;12hr</option>
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Odds Range Filter */}
          <div className="relative">
            <select
              value={oddsFilter}
              onChange={(e) => setOddsFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8"
            >
              <option>All Odds</option>
              <option>1.50 - 3.00</option>
              <option>3.00 - 6.00</option>
              <option>6.00 - 10.00</option>
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* CLV Filter */}
          <div className="relative">
            <select
              value={clvFilter}
              onChange={(e) => setClvFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8"
            >
              <option>All CLV</option>
              <option>Positive CLV</option>
              <option>Negative CLV</option>
              <option>No CLV</option>
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Result Filter */}
          <div className="relative">
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8"
            >
              <option>All Results</option>
              <option>Won</option>
              <option>Lost</option>
              <option>Void</option>
              <option>Open</option>
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">Match</th>
              <th className="p-4 font-medium text-right">Exchange</th>
              <th className="p-4 font-medium text-right">Result</th>
              <th className="p-4 font-medium text-right">Odds</th>
              <th className="p-4 font-medium text-right">Edge %</th>
              <th className="p-4 font-medium text-right">Stake (Kelly)</th>
              <th className="p-4 font-medium text-right">P/L (Kelly)</th>
              <th className="p-4 font-medium text-right">Comm.</th>
              <th className="p-4 font-medium text-right">Date</th>
              <th className="p-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-300">
            {sortedBets.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-12 text-center text-slate-600 italic"
                >
                  {bets.length === 0
                    ? "No bets tracked yet."
                    : "No bets match your filters."}
                </td>
              </tr>
            ) : (
              paginatedBets.map((bet) => {
                const hasStarted = new Date() > new Date(bet.kickoff);
                return (
                  <tr
                    key={bet.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                        {bet.selection} ({bet.market})
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs text-slate-400 font-medium">
                        {bet.exchangeName}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {bet.result === "won" && (
                        <span className="text-emerald-400 font-bold uppercase text-xs">
                          Won
                        </span>
                      )}
                      {bet.result === "lost" && (
                        <span className="text-red-400 font-bold uppercase text-xs">
                          Lost
                        </span>
                      )}
                      {bet.result === "void" && (
                        <span className="text-slate-400 font-bold uppercase text-xs">
                          Void
                        </span>
                      )}
                      {!bet.result && (
                        <span className="text-slate-600 text-xs italic">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-blue-300 font-bold">
                        {bet.exchangePrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-emerald-400 font-bold">
                        +
                        {(bet.baseNetEdgePercent ?? bet.netEdgePercent).toFixed(
                          1,
                        )}
                        %
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-white">
                        £{bet.kellyStake.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {bet.kellyPL !== undefined ? (
                        <div
                          className={`font-bold ${bet.kellyPL >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {bet.kellyPL >= 0 ? "+" : ""}£
                          {Math.abs(bet.kellyPL).toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs text-slate-400">
                        {bet.commission ?? 0}%
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs text-slate-400">
                        {new Date(bet.kickoff).toLocaleString("en-GB", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 mr-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700/30">
                          {(["won", "lost", "void"] as const).map((res) => (
                            <button
                              key={res}
                              onClick={() => onSettleBet(bet.id, res)}
                              className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold uppercase transition-colors ${
                                bet.result === res
                                  ? res === "won"
                                    ? "bg-emerald-500 text-slate-950"
                                    : res === "lost"
                                      ? "bg-red-500 text-slate-950"
                                      : "bg-slate-500 text-slate-950"
                                  : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                              }`}
                              title={`Manual ${res}`}
                            >
                              {res[0]}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={async () => {
                            setLoadingId(bet.id);
                            try {
                              await onSettleBet(bet.id);
                            } finally {
                              setLoadingId(null);
                            }
                          }}
                          disabled={!hasStarted || loadingId === bet.id}
                          className="p-2 text-blue-400 hover:bg-slate-700 rounded disabled:opacity-30"
                          title="Fetch CLV"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${loadingId === bet.id ? "animate-spin" : ""}`}
                          />
                        </button>
                        <button
                          onClick={async () => {
                            setLoadingId(bet.id + "-result");
                            try {
                              await onSettleBet(bet.id);
                            } finally {
                              setLoadingId(null);
                            }
                          }}
                          disabled={
                            !hasStarted || loadingId === bet.id + "-result"
                          }
                          className="p-2 text-emerald-400 hover:bg-slate-700 rounded disabled:opacity-30"
                          title="Check/Re-check Result"
                        >
                          <Trophy
                            className={`w-4 h-4 ${loadingId === bet.id + "-result" ? "animate-pulse" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(bet.id)}
                          className={`transition-all rounded ${
                            confirmDeleteId === bet.id
                              ? "px-2 py-1 bg-red-900/40 text-red-400 text-[10px] font-bold uppercase tracking-wider"
                              : "p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20"
                          }`}
                        >
                          {confirmDeleteId === bet.id ? (
                            "Confirm?"
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {sortedBets.length > 0 && (
        <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
          <div className="text-sm text-slate-400">
            Showing{" "}
            <span className="font-medium text-slate-200">
              {Math.min((page - 1) * ITEMS_PER_PAGE + 1, sortedBets.length)}-
              {Math.min(page * ITEMS_PER_PAGE, sortedBets.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-200">
              {sortedBets.length}
            </span>{" "}
            bets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
