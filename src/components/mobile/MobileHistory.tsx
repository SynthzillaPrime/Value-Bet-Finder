import React from "react";
import { TrackedBet } from "../../types";
import { LEAGUES } from "../../constants";

interface MobileHistoryProps {
  bets: TrackedBet[];
  onDeleteBet: (id: string) => Promise<void>;
}

export const MobileHistory: React.FC<MobileHistoryProps> = ({ bets }) => {
  // 1. Filter and sort: settled bets only, kickoff descending
  const settledBets = bets
    .filter((bet) => bet.result !== undefined && bet.result !== null)
    .sort(
      (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime(),
    );

  // 2. Summary stats
  const totalPL = settledBets.reduce((sum, bet) => sum + (bet.kellyPL || 0), 0);
  const winCount = settledBets.filter((bet) => bet.result === "won").length;
  const lossCount = settledBets.filter((bet) => bet.result === "lost").length;

  // 3. Date formatter helper: "Sat 12 Apr"
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  if (settledBets.length === 0) {
    return (
      <div className="px-4 py-10">
        <div className="rounded-2xl border-2 border-dashed border-slate-800 py-20 flex flex-col items-center justify-center text-center">
          <p className="text-slate-400 font-medium">No settled bets yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Bets will appear here once settled
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* Summary Strip */}
      <div className="px-5 py-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {settledBets.length} settled bets
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold tabular-nums ${
              totalPL >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {totalPL >= 0 ? "+" : "-"}£{Math.abs(totalPL).toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500 tabular-nums">
            {winCount}W {lossCount}L
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="px-4 space-y-2 pb-24">
        {settledBets.map((bet) => {
          const leagueName =
            LEAGUES.find((l) => l.key === bet.sportKey)?.name || bet.sport;

          return (
            <div
              key={`${bet.id}-${bet.placedAt}`}
              className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden"
            >
              <div className="px-4 py-3 flex items-start justify-between">
                {/* Left Side */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="uppercase tracking-wider text-emerald-400/80 text-[10px] font-semibold truncate">
                      {leagueName}
                    </span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="text-slate-500 tabular-nums text-[11px]">
                      {formatDate(bet.kickoff)}
                    </span>
                  </div>
                  <div className="text-[14px] font-semibold text-slate-200 mb-0.5 truncate">
                    {bet.homeTeam} vs {bet.awayTeam}
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-white">
                    <span className="font-bold truncate">{bet.selection}</span>
                    <span className="text-slate-500 tabular-nums text-[11px] whitespace-nowrap">
                      @ {bet.exchangePrice.toFixed(2)}
                    </span>
                    <span className="text-slate-600 text-[11px]">•</span>
                    <span className="text-slate-500 text-[11px] truncate">
                      {bet.exchangeName}
                    </span>
                  </div>
                </div>

                {/* Right Side */}
                <div className="flex flex-col items-end ml-3">
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-1 ${
                      bet.result === "won"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : bet.result === "lost"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-slate-500/15 text-slate-400"
                    }`}
                  >
                    {bet.result}
                  </div>
                  <div
                    className={`text-[16px] font-bold tabular-nums ${
                      bet.result === "won"
                        ? "text-emerald-400"
                        : bet.result === "lost"
                          ? "text-red-400"
                          : "text-slate-400"
                    }`}
                  >
                    {bet.result === "won"
                      ? "+"
                      : bet.result === "lost"
                        ? "-"
                        : ""}
                    £{Math.abs(bet.kellyPL || 0).toFixed(2)}
                  </div>
                  <div className="text-slate-500 text-[10px] tabular-nums">
                    £{bet.kellyStake.toFixed(2)} staked
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
