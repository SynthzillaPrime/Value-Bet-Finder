import React, { useState, useMemo } from "react";
import { TrackedBet } from "../../types";

interface MobileOpenBetsProps {
  bets: TrackedBet[];
  onSettleBet: (
    betId: string,
    forceResult?: "won" | "lost" | "void",
  ) => Promise<"settled" | "skipped" | "failed">;
  onSettleAll: () => Promise<{
    settled: number;
    skipped: number;
    failed: number;
  }>;
}

type TimeStatus = {
  label: string;
  color: string;
  state: "upcoming" | "in-play" | "ready";
};

export const MobileOpenBets: React.FC<MobileOpenBetsProps> = ({
  bets,
  onSettleBet,
  onSettleAll,
}) => {
  const [settlingAll, setSettlingAll] = useState(false);
  const [settlingBetId, setSettlingBetId] = useState<string | null>(null);

  const now = new Date();

  const getTimeStatus = (kickoff: Date): TimeStatus => {
    const diffMs = kickoff.getTime() - now.getTime();
    const twoHoursAfterKickoff = new Date(
      kickoff.getTime() + 2 * 60 * 60 * 1000,
    );

    if (now < kickoff) {
      const diffHrs = diffMs / (1000 * 60 * 60);
      const diffMins = diffMs / (1000 * 60);

      if (diffHrs >= 24) {
        return {
          label: `${Math.floor(diffHrs / 24)}d to KO`,
          color: "text-slate-400",
          state: "upcoming",
        };
      } else if (diffHrs >= 1) {
        return {
          label: `${Math.floor(diffHrs)}h to KO`,
          color: "text-slate-400",
          state: "upcoming",
        };
      } else {
        return {
          label: `${Math.max(0, Math.floor(diffMins))}m to KO`,
          color: "text-amber-400",
          state: "upcoming",
        };
      }
    } else if (now < twoHoursAfterKickoff) {
      return { label: "In play", color: "text-yellow-400", state: "in-play" };
    } else {
      return { label: "Ready", color: "text-emerald-400", state: "ready" };
    }
  };

  const openBets = useMemo(() => {
    return bets
      .filter((b) => b.status === "open")
      .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  }, [bets]);

  const readyToSettleCount = openBets.filter(
    (b) => getTimeStatus(b.kickoff).state === "ready",
  ).length;

  const handleSettleAll = async () => {
    setSettlingAll(true);
    try {
      const result = await onSettleAll();
      alert(
        `Settlement Complete:\nSettled: ${result.settled}\nSkipped: ${result.skipped}\nFailed: ${result.failed}`,
      );
    } finally {
      setSettlingAll(false);
    }
  };

  const handleSettleSingle = async (betId: string) => {
    setSettlingBetId(betId);
    try {
      await onSettleBet(betId);
    } finally {
      setSettlingBetId(null);
    }
  };

  const formatKickoff = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  if (openBets.length === 0) {
    return (
      <div className="px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-800/50">
          <p className="text-slate-400 font-medium">No open bets</p>
          <p className="text-slate-500 text-sm mt-1">
            Track bets on the Scanner tab to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 px-4 py-4 pb-24">
      <button
        onClick={handleSettleAll}
        disabled={readyToSettleCount === 0 || settlingAll}
        className={`w-full h-12 rounded-xl font-bold transition-colors flex items-center justify-center bg-emerald-500 text-slate-950 active:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {settlingAll ? "Settling..." : `Settle All (${readyToSettleCount})`}
      </button>

      {openBets.map((bet) => {
        const timeStatus = getTimeStatus(bet.kickoff);
        const isSettling = settlingBetId === bet.id;
        const canSettle = timeStatus.state === "ready" && !settlingAll;

        return (
          <div
            key={bet.id}
            className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col"
          >
            {/* Header Section */}
            <div className="p-4 border-b border-slate-800/50">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400/80">
                  {bet.sport}
                </span>
                <div className="bg-slate-800/60 px-2 py-0.5 rounded-full">
                  <span
                    className={`text-[11px] font-medium ${timeStatus.color}`}
                  >
                    {timeStatus.label}
                  </span>
                </div>
              </div>
              <h3 className="text-slate-200 font-semibold text-sm">
                {bet.homeTeam} vs {bet.awayTeam}
              </h3>
              <p className="text-slate-500 text-[11px] tabular-nums mt-0.5">
                {formatKickoff(bet.kickoff)}
              </p>
            </div>

            {/* Details Section */}
            <div className="p-4 grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                  Selection
                </p>
                <p className="text-slate-200 text-[13px] font-medium truncate">
                  {bet.selection}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                  Exchange
                </p>
                <p className="text-slate-200 text-[13px] font-medium">
                  {bet.exchangeName}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                  Odds
                </p>
                <p className="text-slate-200 text-[13px] font-medium tabular-nums">
                  {bet.exchangePrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                  Stake
                </p>
                <p className="text-slate-200 text-[13px] font-medium tabular-nums">
                  £{bet.kellyStake.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Action Section */}
            <div className="px-4 pb-4">
              <button
                onClick={() => handleSettleSingle(bet.id)}
                disabled={!canSettle || isSettling}
                className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSettling
                  ? "Settling..."
                  : timeStatus.state === "in-play"
                    ? "In play"
                    : timeStatus.state === "upcoming"
                      ? "Not yet"
                      : "Settle"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
