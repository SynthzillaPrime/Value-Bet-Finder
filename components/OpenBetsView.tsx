import React, { useState, useRef } from "react";
import { TrackedBet } from "../types";
import { LEAGUES } from "../constants";

import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
} from "lucide-react";

interface Props {
  bets: TrackedBet[];
  onDeleteBet: (id: string) => Promise<void>;
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

export const OpenBetsView: React.FC<Props> = ({
  bets,
  onDeleteBet,
  onSettleBet,
  onSettleAll,
}) => {
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [failedSettleIds, setFailedSettleIds] = useState<Set<string>>(
    new Set(),
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [settlingAll, setSettlingAll] = useState(false);
  const [settleProgress, setSettleProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const openBets = bets
    .filter((b) => b.status === "open")
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  const now = new Date();
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  const readyToSettle = openBets.filter(
    (b) => now.getTime() - new Date(b.kickoff).getTime() >= TWO_HOURS,
  );
  const inPlay = openBets.filter((b) => {
    const kickoff = new Date(b.kickoff).getTime();
    return now.getTime() >= kickoff && now.getTime() - kickoff < TWO_HOURS;
  });
  const upcoming = openBets.filter(
    (b) => new Date(b.kickoff).getTime() > now.getTime(),
  );

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

  const handleSettleSingle = async (
    betId: string,
    forceResult?: "won" | "lost" | "void",
  ) => {
    setSettlingId(betId);
    try {
      const result = await onSettleBet(betId, forceResult);
      if (result === "failed" && !forceResult) {
        setFailedSettleIds((prev) => new Set(prev).add(betId));
      } else if (result === "settled") {
        setFailedSettleIds((prev) => {
          const next = new Set(prev);
          next.delete(betId);
          return next;
        });
      }
    } finally {
      setSettlingId(null);
    }
  };

  const handleSettleAll = async () => {
    if (readyToSettle.length === 0) return;
    setSettlingAll(true);
    setSettleProgress({ current: 0, total: readyToSettle.length });

    try {
      const { settled, skipped, failed } = await onSettleAll();
      let message = `Settled: ${settled}, Skipped: ${skipped}`;
      if (failed > 0) {
        message += `, Failed: ${failed}`;
      }
      alert(message);
    } finally {
      setSettlingAll(false);
      setSettleProgress(null);
    }
  };

  const formatKickoff = (kickoff: Date) => {
    return (
      kickoff.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }) +
      ", " +
      kickoff.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const getTimeStatus = (kickoff: Date) => {
    const kickoffMs = kickoff.getTime();
    const nowMs = now.getTime();

    if (nowMs < kickoffMs) {
      const hoursUntil = (kickoffMs - nowMs) / (1000 * 60 * 60);
      if (hoursUntil < 1)
        return {
          label: `${Math.floor(hoursUntil * 60)}m to KO`,
          color: "text-amber-400",
        };
      if (hoursUntil < 24)
        return {
          label: `${Math.floor(hoursUntil)}h to KO`,
          color: "text-slate-400",
        };
      return {
        label: `${Math.floor(hoursUntil / 24)}d to KO`,
        color: "text-slate-500",
      };
    }

    const hoursSince = (nowMs - kickoffMs) / (1000 * 60 * 60);
    if (hoursSince < 2) return { label: "In play", color: "text-yellow-400" };
    return { label: "Ready to settle", color: "text-emerald-400" };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 mb-6 gap-4 relative z-20">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white">Open Bets</h1>
          {openBets.length > 0 && (
            <span className="text-sm text-slate-500 tabular-nums">
              {openBets.length} open
              {readyToSettle.length > 0 &&
                ` · ${readyToSettle.length} ready to settle`}
              {inPlay.length > 0 && ` · ${inPlay.length} in play`}
            </span>
          )}
        </div>

        {openBets.length > 0 && (
          <button
            onClick={handleSettleAll}
            disabled={settlingAll || readyToSettle.length === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 tabular-nums"
          >
            {settlingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Settling {settleProgress?.current}/{settleProgress?.total}...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Settle All ({readyToSettle.length})
              </>
            )}
          </button>
        )}
      </div>

      {openBets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <h3 className="text-xl font-semibold text-slate-300">No open bets</h3>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="px-6 py-3 border-b border-slate-800/50 font-bold">
                    Match
                  </th>
                  <th className="px-6 py-3 border-b border-slate-800/50 font-bold">
                    Selection
                  </th>
                  <th className="px-6 py-3 border-b border-slate-800/50 font-bold">
                    Exchange
                  </th>
                  <th className="px-6 py-3 border-b border-slate-800/50 text-right font-bold">
                    Odds
                  </th>
                  <th className="px-6 py-3 border-b border-slate-800/50 text-right font-bold">
                    Edge
                  </th>
                  <th className="px-6 py-3 border-b border-slate-800/50 text-right font-bold">
                    Stake
                  </th>
                  <th className="px-6 py-3 border-b border-slate-800/50 text-center font-bold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {/* Ready to Settle Section */}
                {readyToSettle.length > 0 && (
                  <>
                    <tr className="bg-emerald-500/5">
                      <td
                        colSpan={7}
                        className="px-6 py-2 border-b border-slate-800/50"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready to Settle
                        </div>
                      </td>
                    </tr>
                    {readyToSettle.map((bet) => (
                      <BetRow
                        key={bet.id}
                        bet={bet}
                        timeStatus={getTimeStatus(bet.kickoff)}
                        formatKickoff={formatKickoff}
                        onSettle={(res) => handleSettleSingle(bet.id, res)}
                        onResetFailure={() => {
                          setFailedSettleIds((prev) => {
                            const next = new Set(prev);
                            next.delete(bet.id);
                            return next;
                          });
                        }}
                        settling={settlingId === bet.id || settlingAll}
                        isConfirming={confirmDeleteId === bet.id}
                        onDelete={() => handleDeleteClick(bet.id)}
                        autoFailed={failedSettleIds.has(bet.id)}
                      />
                    ))}
                  </>
                )}

                {/* In Play Section */}
                {inPlay.length > 0 && (
                  <>
                    <tr className="bg-yellow-500/5">
                      <td
                        colSpan={7}
                        className="px-6 py-2 border-b border-slate-800/50"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
                          <AlertCircle className="w-3.5 h-3.5" />
                          In Play — settle after full time
                        </div>
                      </td>
                    </tr>
                    {inPlay.map((bet) => (
                      <BetRow
                        key={bet.id}
                        bet={bet}
                        timeStatus={getTimeStatus(bet.kickoff)}
                        formatKickoff={formatKickoff}
                        onSettle={(res) => handleSettleSingle(bet.id, res)}
                        onResetFailure={() => {
                          setFailedSettleIds((prev) => {
                            const next = new Set(prev);
                            next.delete(bet.id);
                            return next;
                          });
                        }}
                        settling={settlingId === bet.id}
                        isConfirming={confirmDeleteId === bet.id}
                        onDelete={() => handleDeleteClick(bet.id)}
                        autoFailed={failedSettleIds.has(bet.id)}
                      />
                    ))}
                  </>
                )}

                {/* Upcoming Section */}
                {upcoming.length > 0 && (
                  <>
                    <tr className="bg-slate-800/20">
                      <td
                        colSpan={7}
                        className="px-6 py-2 border-b border-slate-800/50"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          Upcoming
                        </div>
                      </td>
                    </tr>
                    {upcoming.map((bet) => (
                      <BetRow
                        key={bet.id}
                        bet={bet}
                        timeStatus={getTimeStatus(bet.kickoff)}
                        formatKickoff={formatKickoff}
                        onSettle={(res) => handleSettleSingle(bet.id, res)}
                        onResetFailure={() => {
                          setFailedSettleIds((prev) => {
                            const next = new Set(prev);
                            next.delete(bet.id);
                            return next;
                          });
                        }}
                        settling={settlingId === bet.id}
                        isConfirming={confirmDeleteId === bet.id}
                        onDelete={() => handleDeleteClick(bet.id)}
                        autoFailed={failedSettleIds.has(bet.id)}
                      />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

interface BetRowProps {
  bet: TrackedBet;
  timeStatus: { label: string; color: string };
  formatKickoff: (d: Date) => string;
  onSettle: (forceResult?: "won" | "lost" | "void") => void;
  onResetFailure: () => void;
  settling: boolean;
  isConfirming: boolean;
  onDelete: () => void;
  autoFailed: boolean;
}

const BetRow: React.FC<BetRowProps> = ({
  bet,
  timeStatus,
  formatKickoff,
  onSettle,
  onResetFailure,
  settling,
  isConfirming,
  onDelete,
  autoFailed,
}) => {
  const edge = bet.baseNetEdgePercent ?? bet.netEdgePercent;
  const isReady = timeStatus.label === "Ready to settle";

  return (
    <tr className="group hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-slate-200">
          {bet.homeTeam} vs {bet.awayTeam}
        </div>
        <div className="flex flex-col mt-1">
          <span className="text-[10px] font-bold uppercase text-slate-500">
            {LEAGUES.find((l) => l.key === bet.sportKey)?.name || bet.sport}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-500 tabular-nums">
              {formatKickoff(bet.kickoff)}
            </span>
            <span
              className={`text-[10px] font-bold tabular-nums ${timeStatus.color}`}
            >
              {timeStatus.label}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-[15px] font-extrabold text-white">
          {bet.selection}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="font-bold text-slate-300">{bet.exchangeName}</div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="font-bold text-white tabular-nums">
          {bet.exchangePrice.toFixed(2)}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div
          className={`font-bold tabular-nums ${edge > 0 ? "text-emerald-400" : "text-slate-500"}`}
        >
          {edge > 0 ? "+" : ""}
          {edge.toFixed(1)}%
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="font-extrabold text-white tabular-nums">
          £{bet.kellyStake.toFixed(2)}
        </div>
      </td>
      <td className="px-6 py-4 text-center min-w-[120px]">
        <div className="flex items-center justify-center gap-3">
          {/* Fixed-width container for Settle/Manual buttons to prevent jitter */}
          <div className="w-[85px] flex items-center justify-center relative">
            {autoFailed ? (
              <div className="flex flex-col gap-1 w-full animate-in fade-in slide-in-from-right-1 duration-200">
                <button
                  onClick={() => onSettle("won")}
                  disabled={settling}
                  className="w-full py-0.5 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 rounded text-[9px] font-bold uppercase hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                >
                  Won
                </button>
                <button
                  onClick={() => onSettle("lost")}
                  disabled={settling}
                  className="w-full py-0.5 bg-red-950/20 border border-red-500/30 text-red-400 rounded text-[9px] font-bold uppercase hover:bg-red-900/40 transition-colors disabled:opacity-50"
                >
                  Lost
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => onSettle("void")}
                    disabled={settling}
                    className="flex-1 py-0.5 bg-slate-900 border border-slate-500/30 text-slate-400 rounded text-[9px] font-bold uppercase hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Void
                  </button>
                  <button
                    onClick={onResetFailure}
                    disabled={settling}
                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Cancel manual settlement"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onSettle()}
                disabled={settling || !isReady}
                className="w-full px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
              >
                {settling ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                ) : (
                  "Settle"
                )}
              </button>
            )}
          </div>

          <div className="w-[70px] flex justify-center border-l border-slate-800/50 pl-3">
            <button
              onClick={onDelete}
              className={`transition-all rounded-lg flex items-center justify-center h-8 ${
                isConfirming
                  ? "w-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-tight"
                  : "w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
              }`}
            >
              {isConfirming ? "Yes?" : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};
