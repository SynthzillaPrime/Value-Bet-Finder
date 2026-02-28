import React, { useState, useEffect, useRef } from "react";
import { TrackedBet } from "../types";
import { calculatePL } from "../services/betSettlement";
import { LEAGUES } from "../constants";
import { fetchClosingLine, fetchMatchResult } from "../services/edgeFinder";
import { RefreshCw, Trophy, Trash2, ChevronDown } from "lucide-react";

interface Props {
  bets: TrackedBet[];
  apiKey: string;
  onUpdateBet: (bet: TrackedBet) => void;
  onDeleteBet: (id: string) => void;
}

export const BetHistoryView: React.FC<Props> = ({
  bets,
  apiKey,
  onUpdateBet,
  onDeleteBet,
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [compFilter, timingFilter, oddsFilter, clvFilter, resultFilter]);

  const checkClosingLine = async (bet: TrackedBet) => {
    if (new Date() < new Date(bet.kickoff)) {
      alert("Match hasn't started yet.");
      return;
    }

    setLoadingId(bet.id);
    const result = await fetchClosingLine(apiKey, bet);
    setLoadingId(null);

    if (result) {
      onUpdateBet({
        ...bet,
        closingRawPrice: result.closingRawPrice,
        closingFairPrice: result.closingFairPrice,
        clvPercent: result.clvPercent,
        status: "closed",
      });
    }
  };

  const checkBetResult = async (bet: TrackedBet) => {
    if (new Date() < new Date(bet.kickoff)) {
      alert("Match hasn't started yet.");
      return;
    }

    setLoadingId(bet.id + "-result");
    const scoreResult = await fetchMatchResult(apiKey, bet);
    setLoadingId(null);

    if (!scoreResult || !scoreResult.completed) return;

    const { homeScore, awayScore } = scoreResult;
    if (homeScore === undefined || awayScore === undefined) return;

    let result: "won" | "lost" | "void" = "lost";

    if (bet.market === "Match Result") {
      if (bet.selection === bet.homeTeam) {
        if (homeScore > awayScore) result = "won";
      } else if (bet.selection === bet.awayTeam) {
        if (awayScore > homeScore) result = "won";
      } else if (bet.selection.toLowerCase() === "draw") {
        if (homeScore === awayScore) result = "won";
      }
    } else if (bet.market === "Over/Under") {
      const parts = bet.selection.split(" ");
      const type = parts[0];
      const line = parseFloat(parts[1]);
      const total = homeScore + awayScore;
      if (type === "Over") {
        if (total > line) result = "won";
        else if (total < line) result = "lost";
        else result = "void";
      } else if (type === "Under") {
        if (total < line) result = "won";
        else if (total > line) result = "lost";
        else result = "void";
      }
    } else if (bet.market === "Handicap") {
      const parts = bet.selection.split(" ");
      const point = parseFloat(parts[parts.length - 1]);
      const team = parts.slice(0, -1).join(" ");
      if (team === bet.homeTeam) {
        const adjusted = homeScore + point;
        if (adjusted > awayScore) result = "won";
        else if (adjusted < awayScore) result = "lost";
        else result = "void";
      } else if (team === bet.awayTeam) {
        const adjusted = awayScore + point;
        if (adjusted > homeScore) result = "won";
        else if (adjusted < homeScore) result = "lost";
        else result = "void";
      }
    }

    // Use per-bet commission for P/L calculation
    const { flatPL, kellyPL } = calculatePL(bet, result);

    onUpdateBet({
      ...bet,
      result,
      homeScore,
      awayScore,
      flatPL,
      kellyPL,
      status: "closed",
    });
  };

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

  const formatTimePlaced = (bet: TrackedBet) => {
    const hoursBefore =
      (new Date(bet.kickoff).getTime() - bet.placedAt) / (1000 * 60 * 60);
    if (hoursBefore > 48) return `${Math.floor(hoursBefore / 24)}d out`;
    if (hoursBefore > 1) return `${Math.floor(hoursBefore)}h out`;
    return `<1h out`;
  };

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
                  const idxA = LEAGUES.findIndex((l) => l.name === a);
                  const idxB = LEAGUES.findIndex((l) => l.name === b);
                  if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });
                return sortedSports.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ));
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
              <th className="p-4 font-medium">Event</th>
              <th className="p-4 font-medium">Selection</th>
              <th className="p-4 font-medium text-right">Timing</th>
              <th className="p-4 font-medium text-right">Odds</th>
              <th className="p-4 font-medium text-right">Comm</th>
              <th className="p-4 font-medium text-right">CLV %</th>
              <th className="p-4 font-medium text-right">Result</th>
              <th className="p-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-300">
            {sortedBets.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
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
                const clvColor =
                  (bet.clvPercent || 0) > 0
                    ? "text-emerald-400"
                    : "text-red-400";
                return (
                  <tr
                    key={bet.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(bet.kickoff).toLocaleString("en-GB", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>{bet.selection}</div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {bet.market}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs font-medium text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded inline-block">
                        {bet.timingBucket}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {formatTimePlaced(bet)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-blue-300 font-bold">
                        {bet.exchangePrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {bet.exchangeName}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-xs text-slate-400 font-mono">
                        {bet.commission !== undefined
                          ? `${bet.commission}%`
                          : "-"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold">
                      {bet.clvPercent !== undefined ? (
                        <div
                          className={`flex items-center justify-end gap-1 ${clvColor}`}
                        >
                          {bet.clvPercent > 0 ? "+" : ""}
                          {bet.clvPercent.toFixed(2)}%
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
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
                      <div className="flex items-center justify-end gap-2">
                        {bet.status === "open" && (
                          <>
                            <button
                              onClick={() => checkClosingLine(bet)}
                              disabled={!hasStarted || loadingId === bet.id}
                              className="p-2 text-blue-400 hover:bg-slate-700 rounded disabled:opacity-30"
                            >
                              <RefreshCw
                                className={`w-4 h-4 ${loadingId === bet.id ? "animate-spin" : ""}`}
                              />
                            </button>
                            <button
                              onClick={() => checkBetResult(bet)}
                              disabled={
                                !hasStarted || loadingId === bet.id + "-result"
                              }
                              className="p-2 text-emerald-400 hover:bg-slate-700 rounded disabled:opacity-30"
                            >
                              <Trophy
                                className={`w-4 h-4 ${loadingId === bet.id + "-result" ? "animate-pulse" : ""}`}
                              />
                            </button>
                          </>
                        )}
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
