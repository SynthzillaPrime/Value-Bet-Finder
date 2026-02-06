import React, { useState } from "react";
import { TrackedBet } from "../types";
import { SummaryStats } from "./stats/SummaryStats";
import { AnalysisDashboard } from "./AnalysisDashboard";
import {
  fetchClosingLineForBet,
  fetchMatchResult,
} from "../services/edgeFinder";
import {
  Download,
  Upload,
  RefreshCw,
  Trophy,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  XCircle,
  MinusCircle,
  ChevronDown,
} from "lucide-react";

interface Props {
  bets: TrackedBet[];
  apiKey: string;
  bankroll: number;
  onUpdateBet: (bet: TrackedBet) => void;
  onDeleteBet: (id: string) => void;
}

type AnalysisOption =
  | "Bankroll Over Time"
  | "Expected vs Actual"
  | "CLV Over Time"
  | "By Competition"
  | "By Odds Band"
  | "By Timing"
  | "By Market";

export const AnalysisView: React.FC<Props> = ({
  bets,
  apiKey,
  bankroll,
  onUpdateBet,
  onDeleteBet,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisOption>(
    "By Competition",
  );

  const checkClosingLine = async (bet: TrackedBet) => {
    if (new Date() < new Date(bet.kickoff)) {
      alert("Match hasn't started yet.");
      return;
    }

    setLoadingId(bet.id);
    const result = await fetchClosingLineForBet(apiKey, bet);
    setLoadingId(null);

    if (result) {
      const clv = (bet.exchangePrice / result.fairPrice - 1) * 100;
      onUpdateBet({
        ...bet,
        closingRawPrice: result.rawPrice,
        closingFairPrice: result.fairPrice,
        clvPercent: clv,
        status: "closed",
      });
    }
  };

  const checkBetResult = async (bet: TrackedBet) => {
    if (new Date() < new Date(bet.kickoff)) {
      alert("Match hasn't started yet.");
      return;
    }

    setLoadingId(bet.id + "-result");
    const scoreResult = await fetchMatchResult(apiKey, bet);
    setLoadingId(null);

    if (!scoreResult || !scoreResult.completed) return;

    const { homeScore, awayScore } = scoreResult;
    if (homeScore === undefined || awayScore === undefined) return;

    let result: "won" | "lost" | "push" = "lost";

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
    } else if (bet.market === "Over/Under") {
      const parts = bet.selection.split(" ");
      const type = parts[0];
      const line = parseFloat(parts[1]);
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
    } else if (bet.market === "Handicap") {
      const parts = bet.selection.split(" ");
      const point = parseFloat(parts[parts.length - 1]);
      const team = parts.slice(0, -1).join(" ");
      if (team === bet.homeTeam) {
        const adjusted = homeScore + point;
        if (adjusted > awayScore) result = "won";
        else if (adjusted < awayScore) result = "lost";
        else result = "push";
      } else if (team === bet.awayTeam) {
        const adjusted = awayScore + point;
        if (adjusted > homeScore) result = "won";
        else if (adjusted < homeScore) result = "lost";
        else result = "push";
      }
    }

    let flatPL = result === "won" ? bet.exchangePrice - 1 : result === "lost" ? -1 : 0;
    let kellyPL = result === "won" ? bet.kellyStake * (bet.exchangePrice - 1) : result === "lost" ? -bet.kellyStake : 0;

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

  const exportToCSV = () => {
    const headers = [
      "Match", "League", "Selection", "Market", "Exchange", "Your Odds",
      "Pinnacle True Odds", "Net Edge %", "Timing Bucket", "Notes", "Result",
      "Closing True Odds", "CLV %", "Flat Stake", "Flat P/L", "Kelly Stake", "Kelly P/L",
      "Kickoff", "Tracked At"
    ];

    const rows = bets.map(bet => [
      `"${bet.homeTeam} vs ${bet.awayTeam}"`,
      `"${bet.sport}"`,
      `"${bet.selection}"`,
      `"${bet.market}"`,
      `"${bet.exchangeName}"`,
      bet.exchangePrice,
      bet.fairPrice,
      bet.netEdgePercent,
      bet.timingBucket,
      `"${bet.notes || ""}"`,
      bet.result || "open",
      bet.closingFairPrice || "",
      bet.clvPercent || "",
      bet.flatStake,
      bet.flatPL !== undefined ? bet.flatPL : "",
      bet.kellyStake,
      bet.kellyPL !== undefined ? bet.kellyPL : "",
      `"${new Date(bet.kickoff).toLocaleString()}"`,
      `"${new Date(bet.placedAt).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `value-bets-export-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
  };

  const sortedBets = [...bets].sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());

  const formatTimePlaced = (bet: TrackedBet) => {
    const hoursBefore = (new Date(bet.kickoff).getTime() - bet.placedAt) / (1000 * 60 * 60);
    if (hoursBefore > 48) return `${Math.floor(hoursBefore / 24)}d out`;
    if (hoursBefore > 1) return `${Math.floor(hoursBefore)}h out`;
    return `<1h out`;
  };

  const analysisOptions: AnalysisOption[] = [
    "Bankroll Over Time", "Expected vs Actual", "CLV Over Time",
    "By Competition", "By Odds Band", "By Timing", "By Market"
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Performance Analysis</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("Import CSV coming soon")}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <SummaryStats bets={bets} currentKellyBankroll={bankroll} />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">View Analysis:</label>
          <div className="relative">
            <select
              value={selectedAnalysis}
              onChange={(e) => setSelectedAnalysis(e.target.value as AnalysisOption)}
              className="appearance-none bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {analysisOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
           <div className="text-4xl mb-4">📈</div>
           <h3 className="text-xl font-bold text-slate-200">Chart: {selectedAnalysis}</h3>
           <p className="text-slate-500 mt-2">Visualization and detailed table for {selectedAnalysis} is being processed.</p>
        </div>
      </div>

      <AnalysisDashboard bets={bets} />

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Full Bet History</h3>
        <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Event</th>
                <th className="p-4 font-medium">Selection</th>
                <th className="p-4 font-medium text-right">Timing</th>
                <th className="p-4 font-medium text-right">Odds</th>
                <th className="p-4 font-medium text-right">Score</th>
                <th className="p-4 font-medium text-right">CLV %</th>
                <th className="p-4 font-medium text-right">Result</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-300">
              {sortedBets.map((bet) => {
                const hasStarted = new Date() > new Date(bet.kickoff);
                const clvColor = (bet.clvPercent || 0) > 0 ? "text-emerald-400" : "text-red-400";
                return (
                  <tr key={bet.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{bet.homeTeam} vs {bet.awayTeam}</div>
                      <div className="text-xs text-slate-500">{new Date(bet.kickoff).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="p-4">
                      <div>{bet.selection}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{bet.market}</div>
                    </td>
                    <td className="p-4 text-right">
                       <div className="text-xs font-medium text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded inline-block">{bet.timingBucket}</div>
                       <div className="text-[10px] text-slate-500 mt-1">{formatTimePlaced(bet)}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-blue-300 font-bold">{bet.exchangePrice.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{bet.exchangeName}</div>
                    </td>
                    <td className="p-4 text-right">
                      {bet.homeScore !== undefined ? (
                        <div className="font-mono text-slate-200 font-bold">{bet.homeScore} - {bet.awayScore}</div>
                      ) : <span className="text-slate-600">-</span>}
                    </td>
                    <td className="p-4 text-right font-bold">
                      {bet.clvPercent !== undefined ? (
                        <div className={`flex items-center justify-end gap-1 ${clvColor}`}>
                          {bet.clvPercent > 0 ? "+" : ""}{bet.clvPercent.toFixed(2)}%
                        </div>
                      ) : <span className="text-slate-600">-</span>}
                    </td>
                    <td className="p-4 text-right">
                      {bet.result === "won" && <span className="text-emerald-400 font-bold uppercase text-xs">Won</span>}
                      {bet.result === "lost" && <span className="text-red-400 font-bold uppercase text-xs">Lost</span>}
                      {bet.result === "push" && <span className="text-slate-400 font-bold uppercase text-xs">Push</span>}
                      {!bet.result && <span className="text-slate-600 text-xs italic">Open</span>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {bet.status === "open" && (
                          <>
                            <button onClick={() => checkClosingLine(bet)} disabled={!hasStarted || loadingId === bet.id} className="p-2 text-blue-400 hover:bg-slate-700 rounded disabled:opacity-30">
                              <RefreshCw className={`w-4 h-4 ${loadingId === bet.id ? "animate-spin" : ""}`} />
                            </button>
                            <button onClick={() => checkBetResult(bet)} disabled={!hasStarted || loadingId === bet.id + "-result"} className="p-2 text-emerald-400 hover:bg-slate-700 rounded disabled:opacity-30">
                              <Trophy className={`w-4 h-4 ${loadingId === bet.id + "-result" ? "animate-pulse" : ""}`} />
                            </button>
                          </>
                        )}
                        <button onClick={() => onDeleteBet(bet.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded">
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
