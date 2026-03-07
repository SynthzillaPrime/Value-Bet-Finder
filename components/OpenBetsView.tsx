import React, { useState, useRef } from "react";
import { TrackedBet } from "../types";

import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface Props {
  bets: TrackedBet[];
  onDeleteBet: (id: string) => Promise<void>;
  onSettleBet: (betId: string) => Promise<boolean>;
  onSettleAll: () => Promise<{ settled: number; failed: number }>;
}

export const OpenBetsView: React.FC<Props> = ({
  bets,
  onDeleteBet,
  onSettleBet,
  onSettleAll,
}) => {
  const [settlingId, setSettlingId] = useState<string | null>(null);
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

  const handleSettleSingle = async (bet: TrackedBet) => {
    setSettlingId(bet.id);
    try {
      await onSettleBet(bet.id);
    } finally {
      setSettlingId(null);
    }
  };

  const handleSettleAll = async () => {
    if (readyToSettle.length === 0) return;
    setSettlingAll(true);
    setSettleProgress({ current: 0, total: readyToSettle.length });

    try {
      const { settled, failed } = await onSettleAll();
      if (failed > 0) {
        alert(`Settlement complete: ${settled} succeeded, ${failed} failed.`);
      }
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

  if (openBets.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold text-white">Open Bets</h2>
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <h3 className="text-xl font-semibold text-slate-300">No open bets</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Open Bets</h2>
          <p className="text-sm text-slate-500 mt-1">
            {openBets.length} open
            {readyToSettle.length > 0 &&
              ` · ${readyToSettle.length} ready to settle`}
            {inPlay.length > 0 && ` · ${inPlay.length} in play`}
          </p>
        </div>

        <button
          onClick={handleSettleAll}
          disabled={settlingAll || readyToSettle.length === 0}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
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
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                <th className="px-6 py-3 border-b border-slate-800/50">
                  Match
                </th>
                <th className="px-6 py-3 border-b border-slate-800/50">
                  Selection
                </th>
                <th className="px-6 py-3 border-b border-slate-800/50">
                  Exchange
                </th>
                <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                  Odds
                </th>
                <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                  Edge
                </th>
                <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                  Stake
                </th>
                <th className="px-6 py-3 border-b border-slate-800/50 text-center">
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
                      onSettle={() => handleSettleSingle(bet)}
                      settling={settlingId === bet.id || settlingAll}
                      isConfirming={confirmDeleteId === bet.id}
                      onDelete={() => handleDeleteClick(bet.id)}
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
                      onSettle={null}
                      settling={false}
                      isConfirming={confirmDeleteId === bet.id}
                      onDelete={() => handleDeleteClick(bet.id)}
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
                      onSettle={null}
                      settling={false}
                      isConfirming={confirmDeleteId === bet.id}
                      onDelete={() => handleDeleteClick(bet.id)}
                    />
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface BetRowProps {
  bet: TrackedBet;
  timeStatus: { label: string; color: string };
  formatKickoff: (d: Date) => string;
  onSettle: (() => void) | null;
  settling: boolean;
  isConfirming: boolean;
  onDelete: () => void;
}

const BetRow: React.FC<BetRowProps> = ({
  bet,
  timeStatus,
  formatKickoff,
  onSettle,
  settling,
  isConfirming,
  onDelete,
}) => {
  const edge = bet.baseNetEdgePercent ?? bet.netEdgePercent;

  return (
    <tr className="group hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-slate-200">
          {bet.homeTeam} vs {bet.awayTeam}
        </div>
        <div className="flex flex-col mt-1">
          <span className="text-[10px] font-bold uppercase text-slate-500">
            {bet.sport}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-500">
              {formatKickoff(bet.kickoff)}
            </span>
            <span className={`text-[10px] font-bold ${timeStatus.color}`}>
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
          className={`font-bold ${edge > 0 ? "text-emerald-400" : "text-slate-500"}`}
        >
          {edge > 0 ? "+" : ""}
          {edge.toFixed(1)}%
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="font-extrabold text-white">
          £{bet.kellyStake.toFixed(2)}
        </div>
      </td>
      <td className="px-6 py-4 text-center min-w-[140px]">
        <div className="flex items-center justify-center gap-2">
          {onSettle && (
            <button
              onClick={onSettle}
              disabled={settling}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
            >
              {settling ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Settle"
              )}
            </button>
          )}
          <div className="w-[80px] flex justify-center">
            <button
              onClick={onDelete}
              className={`transition-all rounded-lg w-full flex items-center justify-center ${
                isConfirming
                  ? "py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-tight"
                  : "p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
              }`}
            >
              {isConfirming ? "Confirm?" : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};
