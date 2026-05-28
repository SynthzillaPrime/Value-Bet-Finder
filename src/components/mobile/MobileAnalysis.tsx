import React from "react";
import { TrackedBet, BankrollTransaction } from "../../types";

interface MobileAnalysisProps {
  bets: TrackedBet[];
  transactions: BankrollTransaction[];
}

export const MobileAnalysis: React.FC<MobileAnalysisProps> = ({ bets }) => {
  // 1. Calculations
  const settledBets = bets.filter(
    (b) => b.result !== undefined && b.result !== null,
  );
  const decisiveBets = bets.filter(
    (b) => b.result === "won" || b.result === "lost",
  );
  const clvBets = bets.filter(
    (b) => b.clvPercent !== undefined && b.clvPercent !== null,
  );

  const totalCount = bets.length;
  const settledCount = settledBets.length;
  const openCount = totalCount - settledCount;

  const totalStaked = settledBets.reduce(
    (acc, b) => acc + (b.kellyStake ?? 0),
    0,
  );
  const totalPL = settledBets.reduce((acc, b) => acc + (b.kellyPL ?? 0), 0);
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
    bets.length > 0
      ? bets.reduce(
          (acc, b) => acc + (b.baseNetEdgePercent ?? b.netEdgePercent ?? 0),
          0,
        ) / bets.length
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
      <h1 className="text-[17px] font-bold px-5 pt-4 pb-3 text-white">
        Performance
      </h1>

      <div className="grid grid-cols-2 gap-2.5 px-4">
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
