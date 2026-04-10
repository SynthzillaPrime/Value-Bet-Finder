import React from "react";
import { TrackedBet } from "../../types";

interface Props {
  bets: TrackedBet[];
}

export const SummaryStats: React.FC<Props> = ({ bets }) => {
  const settledBets = bets.filter((b) => b.result !== undefined);
  const decisiveBets = bets.filter(
    (b) => b.result === "won" || b.result === "lost",
  );
  const clvBets = bets.filter((b) => b.clvPercent !== undefined);

  // 1. Total Bets
  const totalCount = bets.length;
  const settledCount = settledBets.length;
  const openCount = totalCount - settledCount;

  // 2. Win Rate & Required Win Rate
  const wins = decisiveBets.filter((b) => b.result === "won").length;
  const losses = decisiveBets.filter((b) => b.result === "lost").length;
  const voidCount = settledBets.filter((b) => b.result === "void").length;
  const winRate =
    decisiveBets.length > 0 ? (wins / decisiveBets.length) * 100 : 0;

  const avgOddsDecisive =
    decisiveBets.length > 0
      ? decisiveBets.reduce((acc, b) => acc + b.exchangePrice, 0) /
        decisiveBets.length
      : 0;
  const requiredWinRate = avgOddsDecisive > 0 ? (1 / avgOddsDecisive) * 100 : 0;

  // 4. Avg Edge (All bets)
  const avgEdge =
    bets.length > 0
      ? bets.reduce(
          (acc, b) => acc + (b.baseNetEdgePercent ?? b.netEdgePercent ?? 0),
          0,
        ) / bets.length
      : 0;

  // 5. Avg CLV
  const avgClv =
    clvBets.length > 0
      ? clvBets.reduce((s, b) => s + (b.clvPercent ?? 0), 0) / clvBets.length
      : 0;
  const beatCloseCount = clvBets.filter((b) => (b.clvPercent ?? 0) > 0).length;
  const beatCloseRate =
    clvBets.length > 0 ? (beatCloseCount / clvBets.length) * 100 : 0;

  // 6. Kelly Stats
  const totalKellyPL = settledBets.reduce(
    (acc, b) => acc + (b.kellyPL ?? 0),
    0,
  );
  const totalKellyStakes = settledBets.reduce(
    (acc, b) => acc + (b.kellyStake ?? 0),
    0,
  );
  const isKellyStaked = totalKellyStakes >= 0.01;
  const kellyROI = isKellyStaked ? (totalKellyPL / totalKellyStakes) * 100 : 0;

  const stats = [
    {
      label: "Total Bets",
      value: totalCount.toString(),
      subValue: `${openCount} open`,
      color: "text-blue-400",
    },
    {
      label: "Total Staked",
      value: `£${totalKellyStakes.toFixed(2)}`,
      subValue: "Kelly Staking",
      color: "text-blue-400",
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      subValue: `Req: ${requiredWinRate.toFixed(1)}%`,
      color: winRate >= requiredWinRate ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "Avg Odds",
      value: avgOddsDecisive.toFixed(2),
      subValue: `${wins}W ${losses}L${voidCount > 0 ? ` ${voidCount} Void` : ""}`,
      color: "text-blue-400",
    },
    {
      label: "Avg Edge",
      value: `${avgEdge >= 0 ? "+" : ""}${avgEdge.toFixed(1)}%`,
      subValue: "at time of bet",
      color: avgEdge >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "Avg CLV",
      value: `${avgClv >= 0 ? "+" : ""}${avgClv.toFixed(1)}%`,
      subValue: `${beatCloseRate.toFixed(1)}% beat close`,
      color: avgClv >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "ROI",
      value: isKellyStaked
        ? `${kellyROI >= 0 ? "+" : ""}${kellyROI.toFixed(1)}%`
        : "N/A",
      subValue: `${totalKellyPL >= 0 ? "+" : "-"}£${Math.abs(totalKellyPL).toFixed(2)} total P/L`,
      color: !isKellyStaked
        ? "text-slate-500"
        : kellyROI >= 0
          ? "text-emerald-400"
          : "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 w-full font-sans">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-1 transition-all hover:bg-slate-800 hover:border-slate-600 min-w-0 w-full"
        >
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 truncate">
            {stat.label}
          </span>
          <div className={`text-2xl font-bold ${stat.color} truncate`}>
            {stat.value}
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate">
            {stat.subValue}
          </div>
        </div>
      ))}
    </div>
  );
};
