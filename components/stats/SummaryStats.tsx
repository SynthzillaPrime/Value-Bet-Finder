import React from "react";
import { TrackedBet } from "../../types";
import { Trophy, TrendingUp, Wallet, Percent, Activity } from "lucide-react";

interface Props {
  bets: TrackedBet[];
}

export const SummaryStats: React.FC<Props> = ({ bets }) => {
  const settledBets = bets.filter((b) => b.result !== undefined);
  const decisiveBets = settledBets.filter(
    (b) => b.result === "won" || b.result === "lost",
  );
  const clvBets = bets.filter((b) => b.clvPercent !== undefined);

  const totalBets = bets.length;
  const totalSettled = settledBets.length;

  // Win Rate
  const wins = settledBets.filter((b) => b.result === "won").length;
  const losses = settledBets.filter((b) => b.result === "lost").length;
  const voidCount = settledBets.filter((b) => b.result === "void").length;
  const winRate =
    decisiveBets.length > 0 ? (wins / decisiveBets.length) * 100 : 0;

  const avgOdds =
    decisiveBets.length > 0
      ? decisiveBets.reduce((acc, b) => acc + b.exchangePrice, 0) /
        decisiveBets.length
      : 0;
  const expectedWinRate = avgOdds > 0 ? (1 / avgOdds) * 100 : 0;

  // CLV Stats
  const avgClv =
    clvBets.length > 0
      ? clvBets.reduce((acc, b) => acc + (b.clvPercent || 0), 0) /
        clvBets.length
      : 0;

  const beatCloseCount = clvBets.filter((b) => (b.clvPercent || 0) > 0).length;
  const beatCloseRate =
    clvBets.length > 0 ? (beatCloseCount / clvBets.length) * 100 : 0;

  // P/L & ROI
  const totalFlatPL = settledBets.reduce((acc, b) => acc + (b.flatPL || 0), 0);
  const totalFlatStakes = settledBets.length; // Flat stake is always 1
  const flatROI =
    totalFlatStakes > 0 ? (totalFlatPL / totalFlatStakes) * 100 : 0;

  const totalKellyPL = settledBets.reduce(
    (acc, b) => acc + (b.kellyPL || 0),
    0,
  );
  const totalKellyStakes = settledBets.reduce(
    (acc, b) => acc + b.kellyStake,
    0,
  );
  const kellyROI =
    totalKellyStakes > 0 ? (totalKellyPL / totalKellyStakes) * 100 : 0;

  const stats = [
    {
      label: "Total Bets",
      value: totalBets,
      subValue:
        totalBets - totalSettled > 0
          ? `${totalSettled} settled, ${totalBets - totalSettled} open`
          : `${totalSettled} settled`,
      icon: <Activity className="w-4 h-4" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      subValue: `${wins}W ${losses}L${voidCount > 0 ? ` ${voidCount}V` : ""}\nAvg odds: ${avgOdds.toFixed(2)}\nReq. win rate: ${expectedWinRate.toFixed(0)}%`,
      icon: <Trophy className="w-4 h-4" />,
      color: winRate >= expectedWinRate ? "text-emerald-400" : "text-red-400",
      bgColor:
        winRate >= expectedWinRate ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Avg CLV",
      value: `${avgClv > 0 ? "+" : ""}${avgClv.toFixed(1)}%`,
      subValue: `${beatCloseRate.toFixed(1)}% Beat Close`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: avgClv >= 0 ? "text-emerald-400" : "text-red-400",
      bgColor: avgClv >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Flat ROI",
      value: `${flatROI > 0 ? "+" : ""}${flatROI.toFixed(1)}%`,
      subValue: `${totalFlatPL >= 0 ? "+" : ""}£${totalFlatPL.toFixed(2)} total P/L`,
      icon: <Percent className="w-4 h-4" />,
      color: flatROI >= 0 ? "text-blue-400" : "text-red-400",
      bgColor: "bg-slate-800",
    },
    {
      label: "Kelly ROI",
      value: `${kellyROI > 0 ? "+" : ""}${kellyROI.toFixed(1)}%`,
      subValue:
        totalSettled === 0
          ? "No data yet"
          : `${totalKellyPL >= 0 ? "+" : ""}£${totalKellyPL.toFixed(2)} total P/L`,
      icon: <Wallet className="w-4 h-4" />,
      color: kellyROI >= 0 ? "text-indigo-400" : "text-red-400",
      bgColor: "bg-slate-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-1 transition-all hover:bg-slate-800 hover:border-slate-600"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              {stat.label}
            </span>
            <div className={`p-1.5 rounded-lg ${stat.bgColor} ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
          <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
          <div
            className="text-[10px] text-slate-400 font-medium"
            style={{ whiteSpace: "pre-line" }}
          >
            {stat.subValue}
          </div>
        </div>
      ))}
    </div>
  );
};
