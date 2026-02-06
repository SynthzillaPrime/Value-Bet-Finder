import React, { useState } from "react";
import { TrackedBet } from "../types";
import { SummaryStats } from "./stats/SummaryStats";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { EXCHANGES } from "../constants";
import {
  fetchClosingLineForBet,
  fetchMatchResult,
} from "../services/edgeFinder";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
  LineChart,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Download,
  Upload,
  RefreshCw,
  Trophy,
  Trash2,
  ChevronDown,
  Wallet,
} from "lucide-react";

import { ExchangeBankroll, BankrollTransaction } from "../types";

interface Props {
  bets: TrackedBet[];
  apiKey: string;
  bankroll: number;
  exchangeBankrolls: ExchangeBankroll;
  transactions: BankrollTransaction[];
  onAddTransaction: (t: BankrollTransaction) => void;
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
  | "By Market"
  | "By Exchange";

export const AnalysisView: React.FC<Props> = ({
  bets,
  apiKey,
  bankroll,
  exchangeBankrolls,
  transactions,
  onAddTransaction,
  onUpdateBet,
  onDeleteBet,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newTx, setNewTx] = useState<{
    exchange: "smarkets" | "betfair" | "matchbook";
    type: "deposit" | "withdrawal" | "adjustment";
    amount: string;
    note: string;
  }>({
    exchange: "smarkets",
    type: "deposit",
    amount: "",
    note: "",
  });

  const [selectedAnalysis, setSelectedAnalysis] =
    useState<AnalysisOption>("By Competition");

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

  const exportToCSV = () => {
    const headers = [
      "Match",
      "League",
      "Selection",
      "Market",
      "Exchange",
      "Your Odds",
      "Pinnacle True Odds",
      "Net Edge %",
      "Timing Bucket",
      "Notes",
      "Result",
      "Closing True Odds",
      "CLV %",
      "Flat Stake",
      "Flat P/L",
      "Kelly Stake",
      "Kelly P/L",
      "Kickoff",
      "Tracked At",
    ];

    const rows = bets.map((bet) => [
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
      `"${new Date(bet.placedAt).toLocaleString()}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `value-bets-export-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.click();
  };

  const sortedBets = [...bets].sort(
    (a, b) => b.kickoff.getTime() - a.kickoff.getTime(),
  );

  const formatTimePlaced = (bet: TrackedBet) => {
    const hoursBefore =
      (new Date(bet.kickoff).getTime() - bet.placedAt) / (1000 * 60 * 60);
    if (hoursBefore > 48) return `${Math.floor(hoursBefore / 24)}d out`;
    if (hoursBefore > 1) return `${Math.floor(hoursBefore)}h out`;
    return `<1h out`;
  };

  const analysisOptions: AnalysisOption[] = [
    "Bankroll Over Time",
    "Expected vs Actual",
    "CLV Over Time",
    "By Competition",
    "By Odds Band",
    "By Timing",
    "By Market",
    "By Exchange",
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Performance Analysis</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${showSettings ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"}`}
          >
            <Wallet className="w-3.5 h-3.5" /> Bankroll Settings
          </button>
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

        {showSettings && (
          <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl animate-in slide-in-from-top-4 duration-300 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Bankroll Management
              </h3>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Balance
                </span>
                <span className="text-xl font-bold text-emerald-400">
                  £{bankroll.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["smarkets", "matchbook", "betfair"] as const).map((ex) => (
                <div
                  key={ex}
                  className="bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    {ex}
                  </span>
                  <span className="text-lg font-mono font-bold text-slate-200">
                    £{exchangeBankrolls[ex].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* New Transaction Form */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">
                Add Transaction
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold">
                    Exchange
                  </label>
                  <select
                    value={newTx.exchange}
                    onChange={(e) =>
                      setNewTx({ ...newTx, exchange: e.target.value as any })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="smarkets">Smarkets</option>
                    <option value="matchbook">Matchbook</option>
                    <option value="betfair">Betfair</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold">
                    Type
                  </label>
                  <select
                    value={newTx.type}
                    onChange={(e) =>
                      setNewTx({ ...newTx, type: e.target.value as any })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold">
                    Amount (£)
                  </label>
                  <input
                    type="number"
                    value={newTx.amount}
                    placeholder="0.00"
                    onChange={(e) =>
                      setNewTx({ ...newTx, amount: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <button
                  onClick={() => {
                    const amount = parseFloat(newTx.amount);
                    if (isNaN(amount) || amount === 0) return;
                    onAddTransaction({
                      id: `tx-${Date.now()}`,
                      timestamp: Date.now(),
                      exchange: newTx.exchange,
                      type: newTx.type as any,
                      amount:
                        newTx.type === "withdrawal"
                          ? -Math.abs(amount)
                          : amount,
                      note: newTx.note,
                    });
                    setNewTx({ ...newTx, amount: "", note: "" });
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Recent History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase">
                Recent Transactions
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {[...transactions]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 10)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between items-center text-xs py-2 border-b border-slate-800"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-300 capitalize">
                          {t.type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(t.timestamp).toLocaleString()} •{" "}
                          {t.exchange}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {t.amount >= 0 ? "+" : ""}£
                        {Math.abs(t.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <SummaryStats bets={bets} currentKellyBankroll={bankroll} />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            View Analysis:
          </label>
          <div className="relative">
            <select
              value={selectedAnalysis}
              onChange={(e) =>
                setSelectedAnalysis(e.target.value as AnalysisOption)
              }
              className="appearance-none bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {analysisOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {selectedAnalysis === "Bankroll Over Time" ? (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      ...transactions
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .reduce((acc: any[], tx) => {
                          const prevBankroll =
                            acc.length > 0 ? acc[acc.length - 1].bankroll : 0;
                          acc.push({
                            timestamp: tx.timestamp,
                            bankroll: prevBankroll + tx.amount,
                            label:
                              tx.type === "bet_win" || tx.type === "bet_loss"
                                ? "Bet Settlement"
                                : tx.type,
                          });
                          return acc;
                        }, []),
                    ]}
                  >
                    <defs>
                      <linearGradient
                        id="colorBankroll"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        new Date(val).toLocaleDateString()
                      }
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `£${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                      itemStyle={{ color: "#10b981" }}
                      formatter={(value: number | undefined) => {
                        if (value === undefined) return null;
                        return [`£${value.toFixed(2)}`, "Bankroll"];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="bankroll"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorBankroll)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                    <th className="p-4 font-medium">Bet #</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Match</th>
                    <th className="p-4 font-medium">Result</th>
                    <th className="p-4 font-medium text-right">P/L (Kelly)</th>
                    <th className="p-4 font-medium text-right">Bankroll</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                  {bets
                    .filter((b) => b.result !== undefined)
                    .sort((a, b) => a.placedAt - b.placedAt)
                    .reduce((acc: any[], bet, idx) => {
                      const prevBankroll =
                        acc.length > 0 ? acc[acc.length - 1].bankroll : 100;
                      const currentBankroll = prevBankroll + (bet.kellyPL || 0);
                      acc.push({
                        betNum: idx + 1,
                        date: new Date(bet.placedAt).toLocaleDateString(),
                        match: `${bet.homeTeam} vs ${bet.awayTeam}`,
                        result: bet.result,
                        pl: bet.kellyPL || 0,
                        bankroll: currentBankroll,
                      });
                      return acc;
                    }, [])
                    .reverse()
                    .map((row) => (
                      <tr
                        key={row.betNum}
                        className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 font-mono text-slate-500">
                          #{row.betNum}
                        </td>
                        <td className="p-4 text-xs">{row.date}</td>
                        <td className="p-4 font-medium text-slate-200">
                          {row.match}
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${row.result === "won" ? "bg-emerald-500/10 text-emerald-400" : row.result === "lost" ? "bg-red-500/10 text-red-400" : "bg-slate-700 text-slate-300"}`}
                          >
                            {row.result}
                          </span>
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-bold ${row.pl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {row.pl > 0 ? "+" : ""}
                          {row.pl.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-200">
                          £{row.bankroll.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedAnalysis === "Expected vs Actual" ? (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      ...transactions
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .reduce((acc: any[], tx) => {
                          const prevActual =
                            acc.length > 0 ? acc[acc.length - 1].actual : 0;
                          const prevExpected =
                            acc.length > 0 ? acc[acc.length - 1].expected : 0;

                          let actualChange = tx.amount;
                          let expectedChange = 0;

                          if (tx.type === "bet_win" || tx.type === "bet_loss") {
                            const bet = bets.find((b) => b.id === tx.betId);
                            if (bet) {
                              expectedChange =
                                (bet.netEdgePercent / 100) * bet.kellyStake;
                            }
                          } else {
                            // Deposits/Withdrawals add to both to keep them baseline aligned
                            expectedChange = tx.amount;
                          }

                          acc.push({
                            timestamp: tx.timestamp,
                            actual: prevActual + actualChange,
                            expected: prevExpected + expectedChange,
                          });
                          return acc;
                        }, []),
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        new Date(val).toLocaleDateString()
                      }
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `£${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                      labelFormatter={(val) =>
                        new Date(val).toLocaleDateString()
                      }
                      formatter={(value: number | undefined) => {
                        if (value === undefined) return null;
                        return [`£${value.toFixed(2)}`];
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      name="Actual Bankroll"
                      type="monotone"
                      dataKey="actual"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="Expected Bankroll"
                      type="monotone"
                      dataKey="expected"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400 max-w-2xl mx-auto">
                <span className="font-bold text-slate-300 uppercase mr-2">
                  Explanation:
                </span>
                Expected = Starting bank + sum of (edge × stake). Actual = Real
                results. Lines converging over time = edge is real.
              </p>
            </div>

            <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                    <th className="p-4 font-medium">Bet #</th>
                    <th className="p-4 font-medium">Match</th>
                    <th className="p-4 font-medium text-right">Edge %</th>
                    <th className="p-4 font-medium text-right">Exp. Gain</th>
                    <th className="p-4 font-medium text-right">Actual P/L</th>
                    <th className="p-4 font-medium text-right">Exp. Bank</th>
                    <th className="p-4 font-medium text-right">Act. Bank</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                  {bets
                    .filter((b) => b.result !== undefined)
                    .sort((a, b) => a.placedAt - b.placedAt)
                    .reduce((acc: any[], bet, idx) => {
                      const prevActual =
                        acc.length > 0 ? acc[acc.length - 1].actual : 100;
                      const prevExpected =
                        acc.length > 0 ? acc[acc.length - 1].expected : 100;
                      const expectedGain =
                        (bet.netEdgePercent / 100) * bet.kellyStake;
                      const currentActual = prevActual + (bet.kellyPL || 0);
                      const currentExpected = prevExpected + expectedGain;
                      acc.push({
                        betNum: idx + 1,
                        match: `${bet.homeTeam} vs ${bet.awayTeam}`,
                        edge: bet.netEdgePercent,
                        expGain: expectedGain,
                        actualPL: bet.kellyPL || 0,
                        expected: currentExpected,
                        actual: currentActual,
                      });
                      return acc;
                    }, [])
                    .reverse()
                    .map((row) => (
                      <tr
                        key={row.betNum}
                        className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 font-mono text-slate-500">
                          #{row.betNum}
                        </td>
                        <td className="p-4 font-medium text-slate-200">
                          {row.match}
                        </td>
                        <td className="p-4 text-right text-slate-400">
                          {row.edge.toFixed(2)}%
                        </td>
                        <td className="p-4 text-right text-indigo-400 font-mono">
                          £{row.expGain.toFixed(2)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-bold ${row.actualPL >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {row.actualPL > 0 ? "+" : ""}
                          {row.actualPL.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono text-indigo-300">
                          £{row.expected.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-200">
                          £{row.actual.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedAnalysis === "CLV Over Time" ? (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={bets
                      .filter((b) => b.clvPercent !== undefined)
                      .sort((a, b) => a.placedAt - b.placedAt)
                      .map((bet, idx) => ({
                        betNum: idx + 1,
                        clv: bet.clvPercent,
                      }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="betNum"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                      formatter={(value: number | undefined) => {
                        if (value === undefined) return null;
                        return [`${value.toFixed(2)}%`, "CLV"];
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="clv"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {(() => {
                const clvBets = bets.filter((b) => b.clvPercent !== undefined);
                const avgClv =
                  clvBets.length > 0
                    ? clvBets.reduce((acc, b) => acc + (b.clvPercent || 0), 0) /
                      clvBets.length
                    : 0;
                const beatCount = clvBets.filter(
                  (b) => (b.clvPercent || 0) > 0,
                ).length;
                const beatRate =
                  clvBets.length > 0 ? (beatCount / clvBets.length) * 100 : 0;

                return (
                  <div className="mt-6 flex justify-center gap-8 border-t border-slate-800 pt-6">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">
                        Average CLV
                      </p>
                      <p
                        className={`text-xl font-bold ${avgClv >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {avgClv > 0 ? "+" : ""}
                        {avgClv.toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">
                        Beat The Close
                      </p>
                      <p className="text-xl font-bold text-slate-200">
                        {beatCount}{" "}
                        <span className="text-slate-500 text-sm">of</span>{" "}
                        {clvBets.length}
                        <span className="text-blue-400 ml-2">
                          ({beatRate.toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                    <th className="p-4 font-medium">Bet #</th>
                    <th className="p-4 font-medium">Match</th>
                    <th className="p-4 font-medium text-right">Your Odds</th>
                    <th className="p-4 font-medium text-right">Closing Odds</th>
                    <th className="p-4 font-medium text-right">CLV %</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                  {bets
                    .filter((b) => b.clvPercent !== undefined)
                    .sort((a, b) => a.placedAt - b.placedAt)
                    .map((bet, idx) => (
                      <tr
                        key={bet.id}
                        className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 font-mono text-slate-500">
                          #{idx + 1}
                        </td>
                        <td className="p-4 font-medium text-slate-200">
                          {bet.homeTeam} vs {bet.awayTeam}
                        </td>
                        <td className="p-4 text-right font-mono text-blue-300">
                          {bet.exchangePrice.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">
                          {bet.closingFairPrice?.toFixed(2)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-bold ${(bet.clvPercent || 0) > 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {(bet.clvPercent || 0) > 0 ? "+" : ""}
                          {(bet.clvPercent || 0).toFixed(2)}%
                        </td>
                      </tr>
                    ))
                    .reverse()}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedAnalysis === "By Competition" ? (
          <div className="space-y-6">
            {(() => {
              const settled = bets.filter(
                (b) =>
                  b.result !== undefined &&
                  b.result !== "push" &&
                  b.result !== "void",
              );
              const settledTxs = transactions.filter(
                (t: BankrollTransaction) =>
                  t.type === "bet_win" || t.type === "bet_loss",
              );

              const competitionsMap: Record<string, TrackedBet[]> = {};
              settled.forEach((b) => {
                if (!competitionsMap[b.sport]) competitionsMap[b.sport] = [];
                competitionsMap[b.sport].push(b);
              });

              const compData = Object.entries(competitionsMap)
                .map(([name, compBets]) => {
                  const compTxs = settledTxs.filter((t) =>
                    compBets.some((b) => b.id === t.betId),
                  );
                  const totalPL = compTxs.reduce((sum, t) => sum + t.amount, 0);
                  const totalStakes = compBets.reduce(
                    (sum, b) => sum + b.kellyStake,
                    0,
                  );
                  const roi =
                    totalStakes > 0 ? (totalPL / totalStakes) * 100 : 0;
                  const wins = compBets.filter(
                    (b) => b.result === "won",
                  ).length;
                  const clvBets = compBets.filter(
                    (b) => b.clvPercent !== undefined,
                  );
                  const avgClv =
                    clvBets.length > 0
                      ? clvBets.reduce((s, b) => s + (b.clvPercent || 0), 0) /
                        clvBets.length
                      : 0;

                  return {
                    name,
                    roi,
                    bets: compBets.length,
                    wins,
                    winRate: (wins / compBets.length) * 100,
                    avgClv,
                  };
                })
                .sort((a, b) => b.roi - a.roi);

              if (compData.length === 0) {
                return (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                    No settled bets yet to analyze competitions.
                  </div>
                );
              }

              return (
                <>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="w-full h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={compData}
                          margin={{ left: 0, right: 0, top: 10, bottom: 70 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={10}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={80}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#1e293b",
                              borderRadius: "8px",
                              color: "#f8fafc",
                            }}
                            formatter={(v: number | undefined) => {
                              if (v === undefined) return null;
                              return [`${v.toFixed(2)}%`, "ROI"];
                            }}
                          />
                          <ReferenceLine
                            y={0}
                            stroke="#475569"
                            strokeWidth={2}
                          />
                          <Bar dataKey="roi">
                            {compData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          <th className="p-4 font-medium">Competition</th>
                          <th className="p-4 font-medium text-right">Bets</th>
                          <th className="p-4 font-medium text-right">Won</th>
                          <th className="p-4 font-medium text-right">
                            Win Rate
                          </th>
                          <th className="p-4 font-medium text-right">
                            Avg CLV
                          </th>
                          <th className="p-4 font-medium text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-300">
                        {compData.map((row) => (
                          <tr
                            key={row.name}
                            className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-200">
                              {row.name}
                            </td>
                            <td className="p-4 text-right">{row.bets}</td>
                            <td className="p-4 text-right">{row.wins}</td>
                            <td className="p-4 text-right">
                              {row.winRate.toFixed(1)}%
                            </td>
                            <td
                              className={`p-4 text-right ${row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.avgClv > 0 ? "+" : ""}
                              {row.avgClv.toFixed(2)}%
                            </td>
                            <td
                              className={`p-4 text-right font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.roi > 0 ? "+" : ""}
                              {row.roi.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        ) : selectedAnalysis === "By Odds Band" ? (
          <div className="space-y-6">
            {(() => {
              const settled = bets.filter(
                (b) =>
                  b.result !== undefined &&
                  b.result !== "push" &&
                  b.result !== "void",
              );
              const settledTxs = transactions.filter(
                (t: BankrollTransaction) =>
                  t.type === "bet_win" || t.type === "bet_loss",
              );
              const bands = [
                { label: "1.50 - 3.00", min: 1.5, max: 3.0 },
                { label: "3.00 - 6.00", min: 3.0, max: 6.0 },
                { label: "6.00 - 10.00", min: 6.0, max: 10.0 },
              ];

              const bandData = bands.map((band) => {
                const bandBets = settled.filter((b) => {
                  if (band.label === "1.50 - 3.00")
                    return b.exchangePrice >= 1.5 && b.exchangePrice < 3.0;
                  if (band.label === "3.00 - 6.00")
                    return b.exchangePrice >= 3.0 && b.exchangePrice < 6.0;
                  return b.exchangePrice >= 6.0 && b.exchangePrice <= 10.0;
                });
                const bandTxs = settledTxs.filter((t) =>
                  bandBets.some((b) => b.id === t.betId),
                );
                const totalPL = bandTxs.reduce((sum, t) => sum + t.amount, 0);
                const totalStakes = bandBets.reduce(
                  (sum, b) => sum + b.kellyStake,
                  0,
                );
                const roi = totalStakes > 0 ? (totalPL / totalStakes) * 100 : 0;
                const wins = bandBets.filter((b) => b.result === "won").length;
                const clvBets = bandBets.filter(
                  (b) => b.clvPercent !== undefined,
                );
                const avgClv =
                  clvBets.length > 0
                    ? clvBets.reduce((s, b) => s + (b.clvPercent || 0), 0) /
                      clvBets.length
                    : 0;

                return {
                  name: band.label,
                  roi,
                  bets: bandBets.length,
                  wins,
                  winRate:
                    bandBets.length > 0 ? (wins / bandBets.length) * 100 : 0,
                  avgClv,
                };
              });

              return (
                <>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="w-full h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={bandData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#1e293b",
                              borderRadius: "8px",
                              color: "#f8fafc",
                            }}
                            formatter={(v: number | undefined) => {
                              if (v === undefined) return null;
                              return [`${v.toFixed(2)}%`, "ROI"];
                            }}
                          />
                          <ReferenceLine
                            y={0}
                            stroke="#475569"
                            strokeWidth={2}
                          />
                          <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                            {bandData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          <th className="p-4 font-medium">Odds Band</th>
                          <th className="p-4 font-medium text-right">Bets</th>
                          <th className="p-4 font-medium text-right">Won</th>
                          <th className="p-4 font-medium text-right">
                            Win Rate
                          </th>
                          <th className="p-4 font-medium text-right">
                            Avg CLV
                          </th>
                          <th className="p-4 font-medium text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-300">
                        {bandData.map((row) => (
                          <tr
                            key={row.name}
                            className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-200">
                              {row.name}
                            </td>
                            <td className="p-4 text-right">{row.bets}</td>
                            <td className="p-4 text-right">{row.wins}</td>
                            <td className="p-4 text-right">
                              {row.winRate.toFixed(1)}%
                            </td>
                            <td
                              className={`p-4 text-right ${row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.avgClv > 0 ? "+" : ""}
                              {row.avgClv.toFixed(2)}%
                            </td>
                            <td
                              className={`p-4 text-right font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.roi > 0 ? "+" : ""}
                              {row.roi.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        ) : selectedAnalysis === "By Timing" ? (
          <div className="space-y-6">
            {(() => {
              const settled = bets.filter(
                (b) =>
                  b.result !== undefined &&
                  b.result !== "push" &&
                  b.result !== "void",
              );
              const settledTxs = transactions.filter(
                (t: BankrollTransaction) =>
                  t.type === "bet_win" || t.type === "bet_loss",
              );
              const buckets = ["48hr+", "24-48hr", "12-24hr", "<12hr"];

              const timingData = buckets.map((bucket) => {
                const bucketBets = settled.filter(
                  (b) => b.timingBucket === bucket,
                );
                const bucketTxs = settledTxs.filter((t) =>
                  bucketBets.some((b) => b.id === t.betId),
                );
                const totalPL = bucketTxs.reduce((sum, t) => sum + t.amount, 0);
                const totalStakes = bucketBets.reduce(
                  (sum, b) => sum + b.kellyStake,
                  0,
                );
                const roi = totalStakes > 0 ? (totalPL / totalStakes) * 100 : 0;
                const wins = bucketBets.filter(
                  (b) => b.result === "won",
                ).length;
                const clvBets = bucketBets.filter(
                  (b) => b.clvPercent !== undefined,
                );
                const avgClv =
                  clvBets.length > 0
                    ? clvBets.reduce((s, b) => s + (b.clvPercent || 0), 0) /
                      clvBets.length
                    : 0;

                return {
                  name: bucket,
                  roi,
                  bets: bucketBets.length,
                  wins,
                  winRate:
                    bucketBets.length > 0
                      ? (wins / bucketBets.length) * 100
                      : 0,
                  avgClv,
                };
              });

              return (
                <>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="w-full h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={timingData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#1e293b",
                              borderRadius: "8px",
                              color: "#f8fafc",
                            }}
                            formatter={(v: number | undefined) => {
                              if (v === undefined) return null;
                              return [`${v.toFixed(2)}%`, "ROI"];
                            }}
                          />
                          <ReferenceLine
                            y={0}
                            stroke="#475569"
                            strokeWidth={2}
                          />
                          <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                            {timingData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          <th className="p-4 font-medium">Timing</th>
                          <th className="p-4 font-medium text-right">Bets</th>
                          <th className="p-4 font-medium text-right">Won</th>
                          <th className="p-4 font-medium text-right">
                            Win Rate
                          </th>
                          <th className="p-4 font-medium text-right">
                            Avg CLV
                          </th>
                          <th className="p-4 font-medium text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-300">
                        {timingData.map((row) => (
                          <tr
                            key={row.name}
                            className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-200">
                              {row.name}
                            </td>
                            <td className="p-4 text-right">{row.bets}</td>
                            <td className="p-4 text-right">{row.wins}</td>
                            <td className="p-4 text-right">
                              {row.winRate.toFixed(1)}%
                            </td>
                            <td
                              className={`p-4 text-right ${row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.avgClv > 0 ? "+" : ""}
                              {row.avgClv.toFixed(2)}%
                            </td>
                            <td
                              className={`p-4 text-right font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.roi > 0 ? "+" : ""}
                              {row.roi.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        ) : selectedAnalysis === "By Exchange" ? (
          <div className="space-y-6">
            {(() => {
              const settled = bets.filter(
                (b) =>
                  b.result !== undefined &&
                  b.result !== "push" &&
                  b.result !== "void",
              );
              const settledTxs = transactions.filter(
                (t: BankrollTransaction) =>
                  t.type === "bet_win" || t.type === "bet_loss",
              );
              const exchangeKeys = [
                { key: "smarkets", apiKey: "smarkets", name: "Smarkets" },
                { key: "matchbook", apiKey: "matchbook", name: "Matchbook" },
                { key: "betfair", apiKey: "betfair_ex_uk", name: "Betfair" },
              ];

              const exchangeData = exchangeKeys.map((ex) => {
                const exBets = settled.filter(
                  (b) => b.exchangeKey === ex.apiKey,
                );
                const exConfig = EXCHANGES.find((e) => e.key === ex.apiKey);
                const commRate = exConfig?.commission || 0;

                let grossProfit = 0;
                let commissionPaid = 0;
                let totalStakes = 0;
                let lostStakes = 0;
                let wins = 0;

                const exTxs = settledTxs.filter((t) => t.exchange === ex.key);

                exBets.forEach((b) => {
                  totalStakes += b.kellyStake;
                  if (b.result === "won") {
                    wins++;
                    const profit = (b.exchangePrice - 1) * b.kellyStake;
                    grossProfit += profit;
                    commissionPaid += profit * commRate;
                  } else if (b.result === "lost") {
                    lostStakes += b.kellyStake;
                  }
                });

                const netProfit = exTxs.reduce((sum, t) => sum + t.amount, 0);
                const roi =
                  totalStakes > 0 ? (netProfit / totalStakes) * 100 : 0;

                return {
                  name: ex.name,
                  key: ex.key,
                  bets: exBets.length,
                  wins,
                  winRate: exBets.length > 0 ? (wins / exBets.length) * 100 : 0,
                  grossProfit,
                  commissionPaid,
                  netProfit,
                  roi,
                  bankroll: exchangeBankrolls[ex.key as keyof ExchangeBankroll],
                };
              });

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {exchangeData.map((ex) => (
                      <div
                        key={ex.key}
                        className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {ex.name}
                          </span>
                          <span className="text-sm font-mono font-bold text-slate-200">
                            £{ex.bankroll.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">
                              Bets
                            </p>
                            <p className="text-sm font-bold text-slate-300">
                              {ex.bets}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">
                              ROI
                            </p>
                            <p
                              className={`text-sm font-bold ${ex.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {ex.roi > 0 ? "+" : ""}
                              {ex.roi.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={exchangeData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#1e293b",
                              borderRadius: "8px",
                              color: "#f8fafc",
                            }}
                            formatter={(v: number | undefined) => {
                              if (v === undefined) return null;
                              return [`${v.toFixed(2)}%`, "ROI"];
                            }}
                          />
                          <ReferenceLine
                            y={0}
                            stroke="#475569"
                            strokeWidth={2}
                          />
                          <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                            {exchangeData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          <th className="p-4 font-medium">Exchange</th>
                          <th className="p-4 font-medium text-right">Bets</th>
                          <th className="p-4 font-medium text-right">
                            Win Rate
                          </th>
                          <th className="p-4 font-medium text-right">
                            Gross Profit
                          </th>
                          <th className="p-4 font-medium text-right">Comm.</th>
                          <th className="p-4 font-medium text-right">
                            Net P/L
                          </th>
                          <th className="p-4 font-medium text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-300">
                        {exchangeData.map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-200">
                              {row.name}
                            </td>
                            <td className="p-4 text-right">{row.bets}</td>
                            <td className="p-4 text-right">
                              {row.winRate.toFixed(1)}%
                            </td>
                            <td className="p-4 text-right text-slate-400 font-mono">
                              £{row.grossProfit.toFixed(2)}
                            </td>
                            <td className="p-4 text-right text-red-900/50 font-mono">
                              -£{row.commissionPaid.toFixed(2)}
                            </td>
                            <td
                              className={`p-4 text-right font-bold font-mono ${row.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.netProfit >= 0 ? "£+" : "-£"}
                              {Math.abs(row.netProfit).toFixed(2)}
                            </td>
                            <td
                              className={`p-4 text-right font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.roi > 0 ? "+" : ""}
                              {row.roi.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        ) : selectedAnalysis === "By Market" ? (
          <div className="space-y-6">
            {(() => {
              const settled = bets.filter(
                (b) =>
                  b.result !== undefined &&
                  b.result !== "push" &&
                  b.result !== "void",
              );
              const settledTxs = transactions.filter(
                (t: BankrollTransaction) =>
                  t.type === "bet_win" || t.type === "bet_loss",
              );
              const markets = ["Match Result", "Over/Under", "Handicap"];

              const marketData = markets.map((mkt) => {
                const marketBets = settled.filter((b) => b.market === mkt);
                const marketTxs = settledTxs.filter((t) =>
                  marketBets.some((b) => b.id === t.betId),
                );
                const totalPL = marketTxs.reduce(
                  (sum: number, t: BankrollTransaction) => sum + t.amount,
                  0,
                );
                const totalStakes = marketBets.reduce(
                  (sum, b) => sum + b.kellyStake,
                  0,
                );
                const roi = totalStakes > 0 ? (totalPL / totalStakes) * 100 : 0;
                const wins = marketBets.filter(
                  (b) => b.result === "won",
                ).length;
                const clvBets = marketBets.filter(
                  (b) => b.clvPercent !== undefined,
                );
                const avgClv =
                  clvBets.length > 0
                    ? clvBets.reduce((s, b) => s + (b.clvPercent || 0), 0) /
                      clvBets.length
                    : 0;

                return {
                  name: mkt,
                  roi,
                  bets: marketBets.length,
                  wins,
                  winRate:
                    marketBets.length > 0
                      ? (wins / marketBets.length) * 100
                      : 0,
                  avgClv,
                };
              });

              return (
                <>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="w-full h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={marketData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#1e293b",
                              borderRadius: "8px",
                              color: "#f8fafc",
                            }}
                            formatter={(v: number | undefined) => {
                              if (v === undefined) return null;
                              return [`${v.toFixed(2)}%`, "ROI"];
                            }}
                          />
                          <ReferenceLine
                            y={0}
                            stroke="#475569"
                            strokeWidth={2}
                          />
                          <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                            {marketData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          <th className="p-4 font-medium">Market</th>
                          <th className="p-4 font-medium text-right">Bets</th>
                          <th className="p-4 font-medium text-right">Won</th>
                          <th className="p-4 font-medium text-right">
                            Win Rate
                          </th>
                          <th className="p-4 font-medium text-right">
                            Avg CLV
                          </th>
                          <th className="p-4 font-medium text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-300">
                        {marketData.map((row) => (
                          <tr
                            key={row.name}
                            className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-200">
                              {row.name}
                            </td>
                            <td className="p-4 text-right">{row.bets}</td>
                            <td className="p-4 text-right">{row.wins}</td>
                            <td className="p-4 text-right">
                              {row.winRate.toFixed(1)}%
                            </td>
                            <td
                              className={`p-4 text-right ${row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.avgClv > 0 ? "+" : ""}
                              {row.avgClv.toFixed(2)}%
                            </td>
                            <td
                              className={`p-4 text-right font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.roi > 0 ? "+" : ""}
                              {row.roi.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-slate-200">
              Chart: {selectedAnalysis}
            </h3>
            <p className="text-slate-500 mt-2">
              Visualization and detailed table for {selectedAnalysis} is being
              processed.
            </p>
          </div>
        )}
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
                const clvColor =
                  (bet.clvPercent || 0) > 0
                    ? "text-emerald-400"
                    : "text-red-400";
                return (
                  <tr
                    key={bet.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(bet.kickoff).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>{bet.selection}</div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {bet.market}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs font-medium text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded inline-block">
                        {bet.timingBucket}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {formatTimePlaced(bet)}
                      </div>
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
                      {bet.homeScore !== undefined ? (
                        <div className="font-mono text-slate-200 font-bold">
                          {bet.homeScore} - {bet.awayScore}
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold">
                      {bet.clvPercent !== undefined ? (
                        <div
                          className={`flex items-center justify-end gap-1 ${clvColor}`}
                        >
                          {bet.clvPercent > 0 ? "+" : ""}
                          {bet.clvPercent.toFixed(2)}%
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {bet.result === "won" && (
                        <span className="text-emerald-400 font-bold uppercase text-xs">
                          Won
                        </span>
                      )}
                      {bet.result === "lost" && (
                        <span className="text-red-400 font-bold uppercase text-xs">
                          Lost
                        </span>
                      )}
                      {bet.result === "push" && (
                        <span className="text-slate-400 font-bold uppercase text-xs">
                          Push
                        </span>
                      )}
                      {!bet.result && (
                        <span className="text-slate-600 text-xs italic">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {bet.status === "open" && (
                          <>
                            <button
                              onClick={() => checkClosingLine(bet)}
                              disabled={!hasStarted || loadingId === bet.id}
                              className="p-2 text-blue-400 hover:bg-slate-700 rounded disabled:opacity-30"
                            >
                              <RefreshCw
                                className={`w-4 h-4 ${loadingId === bet.id ? "animate-spin" : ""}`}
                              />
                            </button>
                            <button
                              onClick={() => checkBetResult(bet)}
                              disabled={
                                !hasStarted || loadingId === bet.id + "-result"
                              }
                              className="p-2 text-emerald-400 hover:bg-slate-700 rounded disabled:opacity-30"
                            >
                              <Trophy
                                className={`w-4 h-4 ${loadingId === bet.id + "-result" ? "animate-pulse" : ""}`}
                              />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onDeleteBet(bet.id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded"
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
