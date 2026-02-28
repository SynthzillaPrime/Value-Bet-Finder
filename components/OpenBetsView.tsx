import React, { useState, useRef } from "react";
import { TrackedBet } from "../types";
import { calculatePL } from "../services/betSettlement";
import {
  fetchClosingLineForBet,
  fetchMatchResult,
} from "../services/edgeFinder";
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface Props {
  bets: TrackedBet[];
  apiKey: string;
  onUpdateBet: (bet: TrackedBet) => void;
  onDeleteBet: (id: string) => void;
}

export const OpenBetsView: React.FC<Props> = ({
  bets,
  apiKey,
  onUpdateBet,
  onDeleteBet,
}) => {
  const [settlingId, setSettlingId] = useState<string | null>(null);
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

  const settleBet = async (bet: TrackedBet): Promise<boolean> => {
    // Fetch result
    const scoreResult = await fetchMatchResult(apiKey, bet);
    if (!scoreResult || !scoreResult.completed) return false;

    const { homeScore, awayScore } = scoreResult;
    if (homeScore === undefined || awayScore === undefined) return false;

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

    // Fetch CLV
    let clvPercent: number | undefined;
    let closingRawPrice: number | undefined;
    let closingFairPrice: number | undefined;

    const clvResult = await fetchClosingLineForBet(apiKey, bet);
    if (clvResult) {
      closingRawPrice = clvResult.rawPrice;
      closingFairPrice = clvResult.fairPrice;
      clvPercent = (bet.exchangePrice / clvResult.fairPrice - 1) * 100;
    }

    onUpdateBet({
      ...bet,
      result,
      homeScore,
      awayScore,
      flatPL,
      kellyPL,
      closingRawPrice,
      closingFairPrice,
      clvPercent,
      status: "closed",
    });

    return true;
  };

  const handleSettleSingle = async (bet: TrackedBet) => {
    setSettlingId(bet.id);
    await settleBet(bet);
    setSettlingId(null);
  };

  const handleSettleAll = async () => {
    if (readyToSettle.length === 0) return;
    setSettlingAll(true);
    setSettleProgress({ current: 0, total: readyToSettle.length });

    for (let i = 0; i < readyToSettle.length; i++) {
      setSettleProgress({ current: i + 1, total: readyToSettle.length });
      await settleBet(readyToSettle[i]);
      // Small delay to avoid hammering the API
      if (i < readyToSettle.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setSettlingAll(false);
    setSettleProgress(null);
  };

  const formatKickoff = (kickoff: Date) => {
    const d = new Date(kickoff);
    return d.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeStatus = (kickoff: Date) => {
    const kickoffMs = new Date(kickoff).getTime();
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
      {/* Header */}
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

        {readyToSettle.length > 0 && (
          <button
            onClick={handleSettleAll}
            disabled={settlingAll}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
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

      {/* Ready to Settle */}
      {readyToSettle.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready to Settle
          </h3>
          <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-emerald-500/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                  <th className="p-4 font-medium">Match</th>
                  <th className="p-4 font-medium">Selection</th>
                  <th className="p-4 font-medium text-right">Odds</th>
                  <th className="p-4 font-medium text-right">Edge</th>
                  <th className="p-4 font-medium text-right">Comm</th>
                  <th className="p-4 font-medium text-right">Kickoff</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-300">
                {readyToSettle.map((bet) => (
                  <BetRow
                    key={bet.id}
                    bet={bet}
                    timeStatus={getTimeStatus(bet.kickoff)}
                    formatKickoff={formatKickoff}
                    settling={settlingId === bet.id || settlingAll}
                    onSettle={() => handleSettleSingle(bet)}
                    isConfirming={confirmDeleteId === bet.id}
                    onDelete={() => handleDeleteClick(bet.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In Play */}
      {inPlay.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            In Play — settle after full time
          </h3>
          <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-yellow-500/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                  <th className="p-4 font-medium">Match</th>
                  <th className="p-4 font-medium">Selection</th>
                  <th className="p-4 font-medium text-right">Odds</th>
                  <th className="p-4 font-medium text-right">Edge</th>
                  <th className="p-4 font-medium text-right">Comm</th>
                  <th className="p-4 font-medium text-right">Kickoff</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-300">
                {inPlay.map((bet) => (
                  <BetRow
                    key={bet.id}
                    bet={bet}
                    timeStatus={getTimeStatus(bet.kickoff)}
                    formatKickoff={formatKickoff}
                    settling={false}
                    onSettle={null}
                    isConfirming={confirmDeleteId === bet.id}
                    onDelete={() => handleDeleteClick(bet.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Upcoming
          </h3>
          <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                  <th className="p-4 font-medium">Match</th>
                  <th className="p-4 font-medium">Selection</th>
                  <th className="p-4 font-medium text-right">Odds</th>
                  <th className="p-4 font-medium text-right">Edge</th>
                  <th className="p-4 font-medium text-right">Comm</th>
                  <th className="p-4 font-medium text-right">Kickoff</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-300">
                {upcoming.map((bet) => (
                  <BetRow
                    key={bet.id}
                    bet={bet}
                    timeStatus={getTimeStatus(bet.kickoff)}
                    formatKickoff={formatKickoff}
                    settling={false}
                    onSettle={null}
                    isConfirming={confirmDeleteId === bet.id}
                    onDelete={() => handleDeleteClick(bet.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API cost note */}
      <p className="text-[10px] text-slate-600 text-center">
        Settling uses 2 API calls per bet (1 result + 1 CLV).
      </p>
    </div>
  );
};

// ---- Reusable row component ----

interface BetRowProps {
  bet: TrackedBet;
  timeStatus: { label: string; color: string };
  formatKickoff: (d: Date) => string;
  settling: boolean;
  onSettle: (() => void) | null;
  onDelete: () => void;
  isConfirming: boolean;
}

const BetRow: React.FC<BetRowProps> = ({
  bet,
  timeStatus,
  formatKickoff,
  settling,
  onSettle,
  onDelete,
  isConfirming,
}) => (
  <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
    <td className="p-4">
      <div className="font-semibold text-slate-200">
        {bet.homeTeam} vs {bet.awayTeam}
      </div>
      <div className="text-[10px] text-slate-500 uppercase mt-0.5">
        {bet.sport}
      </div>
    </td>
    <td className="p-4">
      <div>{bet.selection}</div>
      <div className="text-[10px] text-slate-500 uppercase">{bet.market}</div>
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
      <span className="text-emerald-400 font-bold">
        +{bet.netEdgePercent.toFixed(1)}%
      </span>
    </td>
    <td className="p-4 text-right">
      <span className="text-xs text-slate-400 font-mono">
        {bet.commission !== undefined ? `${bet.commission}%` : "-"}
      </span>
    </td>
    <td className="p-4 text-right">
      <div className="text-xs text-slate-400">{formatKickoff(bet.kickoff)}</div>
      <div className={`text-[10px] font-bold mt-0.5 ${timeStatus.color}`}>
        {timeStatus.label}
      </div>
    </td>
    <td className="p-4 text-right">
      <div className="flex items-center justify-end gap-2">
        {onSettle && (
          <button
            onClick={onSettle}
            disabled={settling}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {settling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Settle"
            )}
          </button>
        )}
        <button
          onClick={onDelete}
          className={`transition-all rounded ${
            isConfirming
              ? "px-2 py-1 bg-red-900/40 text-red-400 text-[10px] font-bold uppercase tracking-wider"
              : "p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20"
          }`}
        >
          {isConfirming ? "Confirm?" : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </td>
  </tr>
);
