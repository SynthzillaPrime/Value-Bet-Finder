import React, { useState } from "react";
import { TrackedBet } from "../types";
import { fetchMatchResult } from "../services/edgeFinder";
import { EXCHANGES } from "../constants";
import { Trash2, Trophy } from "lucide-react";

interface Props {
  bets: TrackedBet[];
  apiKey: string;

  onUpdateBet: (bet: TrackedBet) => void;
  onDeleteBet: (id: string) => void;
}

export const BetTracker: React.FC<Props> = ({
  bets,
  apiKey,

  onUpdateBet,
  onDeleteBet,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const checkBetResult = async (bet: TrackedBet) => {
    if (new Date() < new Date(bet.kickoff)) {
      alert("Match hasn't started yet.");
      return;
    }

    setLoadingId(bet.id + "-result");
    const scoreResult = await fetchMatchResult(apiKey, bet);
    setLoadingId(null);

    if (!scoreResult) {
      alert("Could not fetch match result. Data might not be available yet.");
      return;
    }

    if (!scoreResult.completed) {
      alert("Match is still in progress or scores are not yet finalized.");
      return;
    }

    const { homeScore, awayScore } = scoreResult;
    if (homeScore === undefined || awayScore === undefined) {
      alert("Final scores are missing from the response.");
      return;
    }

    let result: "won" | "lost" | "push" = "lost";

    // Logic for Match Result (h2h)
    if (bet.market === "Match Result") {
      if (bet.selection === bet.homeTeam) {
        if (homeScore > awayScore) result = "won";
        else if (homeScore === awayScore) result = "lost";
      } else if (bet.selection === bet.awayTeam) {
        if (awayScore > homeScore) result = "won";
        else if (homeScore === awayScore) result = "lost";
      } else if (bet.selection.toLowerCase() === "draw") {
        if (homeScore === awayScore) result = "won";
      }
    }
    // Logic for Over/Under (totals)
    else if (bet.market === "Over/Under") {
      const parts = bet.selection.split(" ");
      const type = parts[0]; // Over or Under
      const line = parseFloat(parts[1]); // e.g. 2.5
      const total = homeScore + awayScore;

      if (type === "Over") {
        if (total > line) result = "won";
        else if (total < line) result = "lost";
        else result = "push";
      } else if (type === "Under") {
        if (total < line) result = "won";
        else if (total > line) result = "lost";
        else result = "push";
      }
    }
    // Logic for Handicap (spreads)
    else if (bet.market === "Handicap") {
      const parts = bet.selection.split(" ");
      const point = parseFloat(parts[parts.length - 1]);
      const team = parts.slice(0, -1).join(" ");

      if (team === bet.homeTeam) {
        const adjustedScore = homeScore + point;
        if (adjustedScore > awayScore) result = "won";
        else if (adjustedScore < awayScore) result = "lost";
        else result = "push";
      } else if (team === bet.awayTeam) {
        const adjustedScore = awayScore + point;
        if (adjustedScore > homeScore) result = "won";
        else if (adjustedScore < homeScore) result = "lost";
        else result = "push";
      }
    }

    const exchange = EXCHANGES.find((ex) => ex.key === bet.exchangeKey);
    const commission = exchange ? exchange.commission : 0;

    let flatPL = 0;
    let kellyPL = 0;

    if (result === "won") {
      flatPL = (bet.exchangePrice - 1) * (1 - commission);
      kellyPL = bet.kellyStake * (bet.exchangePrice - 1) * (1 - commission);
    } else if (result === "lost") {
      flatPL = -1;
      kellyPL = -bet.kellyStake;
    } else if (result === "push" || result === "void") {
      flatPL = 0;
      kellyPL = 0;
    }

    onUpdateBet({
      ...bet,
      result,
      homeScore,
      awayScore,
      flatPL,
      kellyPL,
      status: "closed",
    });
  };

  const sortedBets = [...bets].sort(
    (a, b) => b.kickoff.getTime() - a.kickoff.getTime(),
  );

  const recentBets = sortedBets.slice(0, 10);
  const openCount = bets.filter((b) => b.status === "open").length;
  const wonCount = bets.filter((b) => b.result === "won").length;
  const lostCount = bets.filter((b) => b.result === "lost").length;

  if (bets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p>You haven't tracked any bets yet.</p>
        <p className="text-sm">
          Click "Track Bet" on the scanner to add them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="text-slate-400">
          {openCount}{" "}
          <span className="text-[10px] uppercase tracking-wider text-slate-600 ml-1">
            Open
          </span>
        </span>
        <span className="text-emerald-400">
          {wonCount}{" "}
          <span className="text-[10px] uppercase tracking-wider text-emerald-900/50 ml-1">
            Won
          </span>
        </span>
        <span className="text-red-400">
          {lostCount}{" "}
          <span className="text-[10px] uppercase tracking-wider text-red-900/50 ml-1">
            Lost
          </span>
        </span>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4">Recent Bets</h3>

        <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Match</th>
                <th className="p-4 font-medium">Selection</th>
                <th className="p-4 font-medium text-right">Odds</th>
                <th className="p-4 font-medium text-right">Result</th>
                <th className="p-4 font-medium text-right">Flat P/L</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentBets.map((bet) => {
                const hasStarted = new Date() > new Date(bet.kickoff);

                return (
                  <tr
                    key={bet.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(bet.kickoff).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      <div className="text-sm">{bet.selection}</div>
                      <div className="text-[10px] text-slate-500">
                        {bet.market}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-blue-300 font-bold">
                        {bet.exchangePrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {bet.result === "won" && (
                        <div className="text-emerald-400 font-bold text-xs uppercase text-right">
                          Won
                        </div>
                      )}
                      {bet.result === "lost" && (
                        <div className="text-red-400 font-bold text-xs uppercase text-right">
                          Lost
                        </div>
                      )}
                      {bet.result === "push" && (
                        <div className="text-slate-400 font-bold text-xs uppercase text-right">
                          Push
                        </div>
                      )}
                      {!bet.result && (
                        <span className="text-slate-500 text-xs italic">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {bet.flatPL !== undefined ? (
                        <div
                          className={`font-mono font-bold ${bet.flatPL >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {bet.flatPL > 0 ? "+" : ""}
                          {bet.flatPL.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {bet.status === "open" && (
                          <button
                            onClick={() => checkBetResult(bet)}
                            disabled={
                              !hasStarted || loadingId === bet.id + "-result"
                            }
                            className={`p-2 rounded hover:bg-slate-700 transition-colors ${!hasStarted ? "opacity-30 cursor-not-allowed" : "text-emerald-400"}`}
                            title={
                              !hasStarted ? "Wait for kickoff" : "Fetch Result"
                            }
                          >
                            <Trophy
                              className={`w-4 h-4 ${loadingId === bet.id + "-result" ? "animate-pulse" : ""}`}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteBet(bet.id)}
                          className="p-2 rounded hover:bg-red-900/20 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
