import React from "react";
import { TrackedBet } from "../../types";
import { Trophy, TrendingUp, Wallet, Percent, Activity } from "lucide-react";

interface Props {
  bets: TrackedBet[];
  currentKellyBankroll: number;
}

export const SummaryStats: React.FC<Props> = ({
  bets,
  currentKellyBankroll,
}) => {
  const settledBets = bets.filter((b) => b.result !== undefined);
  const clvBets = bets.filter((b) => b.clvPercent !== undefined);

  const totalBets = bets.length;
  const totalSettled = settledBets.length;

  // Win Rate
  const wins = settledBets.filter((b) => b.result === "won").length;
  const winRate = totalSettled > 0 ? (wins / totalSettled) * 100 : 0;

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

  const flatBankroll = 100 + totalFlatPL;

  const stats = [
    {
      label: "Total Bets",
      value: totalBets,
      subValue: `${totalSettled} Settled`,
      icon: <Activity className="w-4 h-4" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      subValue: `${wins} Wins`,
      icon: <Trophy className="w-4 h-4" />,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Avg CLV",
      value: `${avgClv > 0 ? "+" : ""}${avgClv.toFixed(2)}%`,
      subValue: `${beatCloseRate.toFixed(1)}% Beat Close`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: avgClv >= 0 ? "text-emerald-400" : "text-red-400",
      bgColor: avgClv >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Flat ROI",
      value: `${flatROI > 0 ? "+" : ""}${flatROI.toFixed(1)}%`,
      subValue: `£${flatBankroll.toFixed(2)} Bank`,
      icon: <Percent className="w-4 h-4" />,
      color: flatROI >= 0 ? "text-blue-400" : "text-red-400",
      bgColor: "bg-slate-800",
    },
    {
      label: "Kelly ROI",
      value: `${kellyROI > 0 ? "+" : ""}${kellyROI.toFixed(1)}%`,
      subValue: `£${currentKellyBankroll.toFixed(2)} Bank`,
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
          <div className="text-[10px] text-slate-400 font-medium">
            {stat.subValue}
          </div>
        </div>
      ))}
    </div>
  );
};
