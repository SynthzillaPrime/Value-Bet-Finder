import React, { useMemo, useState, useEffect } from "react";
import { TrackedBet, BankrollTransaction } from "../../types";
import { ChevronDown } from "lucide-react";

interface MobileAnalysisProps {
  bets: TrackedBet[];
  transactions: BankrollTransaction[];
}

export const MobileAnalysis: React.FC<MobileAnalysisProps> = ({
  bets,
  transactions,
}) => {
  const seasons = useMemo(() => {
    const s = Array.from(new Set(bets.map((b) => b.season).filter(Boolean)));
    return s.sort((a, b) => b.localeCompare(a));
  }, [bets]);

  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);

  useEffect(() => {
    if (seasonFilter === null && seasons.length > 0) {
      setSeasonFilter(seasons[0]);
    }
  }, [seasons, seasonFilter]);

  const filteredBets = useMemo(() => {
    if (seasonFilter === null) return [];
    if (seasonFilter === "All seasons") return bets;
    return bets.filter((b) => b.season === seasonFilter);
  }, [bets, seasonFilter]);

  const filteredTransactions = useMemo(() => {
    if (seasonFilter === null) return [];
    if (seasonFilter === "All seasons") return transactions;
    return transactions.filter((t) => t.season === seasonFilter);
  }, [transactions, seasonFilter]);

  // 1. Calculations
  const settledBets = filteredBets.filter(
    (b) => b.result !== undefined && b.result !== null,
  );
  const decisiveBets = filteredBets.filter(
    (b) => b.result === "won" || b.result === "lost",
  );
  const clvBets = filteredBets.filter(
    (b) => b.clvPercent !== undefined && b.clvPercent !== null,
  );

  const nonBetTransactions = filteredTransactions.filter(
    (t) =>
      t.type === "deposit" ||
      t.type === "withdrawal" ||
      t.type === "adjustment",
  );

  const startingBankroll = nonBetTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );

  const totalCount = filteredBets.length;
  const settledCount = settledBets.length;
  const openCount = totalCount - settledCount;

  const totalStaked = settledBets.reduce(
    (acc, b) => acc + (b.kellyStake ?? 0),
    0,
  );
  const totalPL = settledBets.reduce((acc, b) => acc + (b.kellyPL ?? 0), 0);
  const currentBankroll = startingBankroll + totalPL;
  const isStaked = totalStaked >= 0.01;

  const wins = decisiveBets.filter((b) => b.result === "won").length;
  const losses = decisiveBets.filter((b) => b.result === "lost").length;
  const voids = settledBets.filter((b) => b.result === "void").length;
  const winRate =
    decisiveBets.length > 0 ? (wins / decisiveBets.length) * 100 : 0;

  const avgOdds =
    decisiveBets.length > 0
      ? decisiveBets.reduce((acc, b) => acc + b.exchangePrice, 0) /
        decisiveBets.length
      : 0;
  const requiredWinRate = avgOdds > 0 ? (1 / avgOdds) * 100 : 0;

  const avgEdge =
    filteredBets.length > 0
      ? filteredBets.reduce(
          (acc, b) => acc + (b.baseNetEdgePercent ?? b.netEdgePercent ?? 0),
          0,
        ) / filteredBets.length
      : 0;

  const avgClv =
    clvBets.length > 0
      ? clvBets.reduce((acc, b) => acc + (b.clvPercent ?? 0), 0) /
        clvBets.length
      : 0;
  const beatCloseCount = clvBets.filter((b) => (b.clvPercent ?? 0) > 0).length;
  const beatRate =
    clvBets.length > 0 ? (beatCloseCount / clvBets.length) * 100 : 0;

  const roi = isStaked ? (totalPL / totalStaked) * 100 : 0;

  const formattedTotalPL = `${totalPL >= 0 ? "+" : "-"}£${Math.abs(totalPL).toFixed(2)}`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h1 className="text-[17px] font-bold text-white">Performance</h1>

        {/* Season Filter */}
        <div className="relative">
          <select
            value={seasonFilter || ""}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8"
          >
            {!seasonFilter && <option value="">Loading...</option>}
            <option value="All seasons">All seasons</option>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4">
        {/* Bankroll */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Bankroll
          </div>
          <div className="text-[22px] font-bold tabular-nums text-emerald-400">
            £{currentBankroll.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Incl. deposits/adj
          </div>
        </div>

        {/* Total Bets */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Total Bets
          </div>
          <div className="text-[22px] font-bold tabular-nums text-blue-400">
            {totalCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {openCount} open
          </div>
        </div>

        {/* Total Staked */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Total Staked
          </div>
          <div className="text-[22px] font-bold tabular-nums text-blue-400">
            £{totalStaked.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Kelly Staking</div>
        </div>

        {/* Win Rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Win Rate
          </div>
          <div
            className={`text-[22px] font-bold tabular-nums ${
              winRate >= requiredWinRate ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Req: {requiredWinRate.toFixed(1)}%
          </div>
        </div>

        {/* Avg Odds */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Avg Odds
          </div>
          <div className="text-[22px] font-bold tabular-nums text-blue-400">
            {avgOdds.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {wins}W {losses}L{voids > 0 ? ` ${voids}V` : ""}
          </div>
        </div>

        {/* Avg Edge */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Avg Edge
          </div>
          <div
            className={`text-[22px] font-bold tabular-nums ${
              avgEdge >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {avgEdge >= 0 ? "+" : ""}
            {avgEdge.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            at time of bet
          </div>
        </div>

        {/* Avg CLV */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Avg CLV
          </div>
          <div
            className={`text-[22px] font-bold tabular-nums ${
              avgClv >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {avgClv >= 0 ? "+" : ""}
            {avgClv.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {beatRate.toFixed(0)}% beat close
          </div>
        </div>

        {/* ROI Full Width */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            ROI
          </div>
          <div className="flex items-center justify-between mt-1">
            <div
              className={`text-[28px] font-bold tabular-nums ${
                !isStaked
                  ? "text-slate-500"
                  : roi >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
              }`}
            >
              {!isStaked ? "N/A" : `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
            </div>
            <div
              className={`text-[28px] font-bold tabular-nums ${
                totalPL >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formattedTotalPL}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {formattedTotalPL} total P/L
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 p-4 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center">
        <span className="text-slate-500 text-[12px]">
          Charts and breakdowns available on desktop
        </span>
      </div>

      <div className="pb-24" />
    </div>
  );
};
