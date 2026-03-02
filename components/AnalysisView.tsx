import React, { useState } from "react";
import { TrackedBet } from "../types";
import { LEAGUES } from "../constants";
import { SummaryStats } from "./stats/SummaryStats";
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

interface Props {
  bets: TrackedBet[];
}

export const AnalysisView: React.FC<Props> = ({ bets }) => {
  const [bankrollPage, setBankrollPage] = useState(1);
  const [expectedPage, setExpectedPage] = useState(1);
  const [clvPage, setClvPage] = useState(1);
  const [compPage, setCompPage] = useState(1);
  const [oddsPage, setOddsPage] = useState(1);
  const [timingPage, setTimingPage] = useState(1);
  const [marketPage, setMarketPage] = useState(1);

  const pageSize = 10;

  const settled = bets.filter(
    (b) => b.result !== undefined && b.result !== "void" && b.result !== "push",
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Performance Analysis</h2>
      </div>

      <SummaryStats bets={bets} />

      <div className="space-y-12">
        {/* 1. Bankroll Tracker */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            Bankroll Tracker
          </h3>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={bets
                      .filter((b) => b.result !== undefined)
                      .sort((a, b) => a.placedAt - b.placedAt)
                      .reduce((acc: any[], bet, idx) => {
                        const prevBankroll =
                          acc.length > 0 ? acc[acc.length - 1].bankroll : 0;
                        acc.push({
                          betNum: idx + 1,
                          bankroll: prevBankroll + (bet.kellyPL || 0),
                        });
                        return acc;
                      }, [])}
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
                      dataKey="betNum"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Bet #",
                        position: "insideBottom",
                        offset: -5,
                        fontSize: 10,
                        fill: "#64748b",
                      }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `£${value}`}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                      itemStyle={{ color: "#f8fafc" }}
                      labelFormatter={(val) => `Bet #${val}`}
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
                    <th className="p-4 font-medium text-right">P/L</th>
                    <th className="p-4 font-medium text-right">Bankroll</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                  {(() => {
                    const allRows = bets
                      .filter((b) => b.result !== undefined)
                      .sort((a, b) => a.placedAt - b.placedAt)
                      .reduce((acc: any[], bet, idx) => {
                        const prevBankroll =
                          acc.length > 0 ? acc[acc.length - 1].bankroll : 0;
                        const currentBankroll =
                          prevBankroll + (bet.kellyPL || 0);
                        acc.push({
                          betNum: idx + 1,
                          date: new Date(bet.placedAt).toLocaleDateString(
                            "en-GB",
                          ),
                          match: `${bet.homeTeam} vs ${bet.awayTeam}`,
                          result: bet.result,
                          pl: bet.kellyPL || 0,
                          bankroll: currentBankroll,
                        });
                        return acc;
                      }, [])
                      .reverse();

                    const paginatedRows = allRows.slice(
                      (bankrollPage - 1) * pageSize,
                      bankrollPage * pageSize,
                    );

                    return paginatedRows.map((row) => (
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
                    ));
                  })()}
                </tbody>
              </table>
              {(() => {
                const total = bets.filter((b) => b.result !== undefined).length;
                const totalPages = Math.ceil(total / pageSize);
                if (total <= pageSize) return null;
                return (
                  <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      Showing{" "}
                      {Math.min((bankrollPage - 1) * pageSize + 1, total)}-
                      {Math.min(bankrollPage * pageSize, total)} of {total}
                    </span>
                    <div className="flex gap-4">
                      <button
                        onClick={() =>
                          setBankrollPage((p) => Math.max(1, p - 1))
                        }
                        disabled={bankrollPage === 1}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setBankrollPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={bankrollPage === totalPages}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* 2. Expected vs Actual */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            Expected vs Actual
          </h3>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={bets
                      .filter((b) => b.result !== undefined)
                      .sort((a, b) => a.placedAt - b.placedAt)
                      .reduce((acc: any[], bet, idx) => {
                        const prevActual =
                          acc.length > 0 ? acc[acc.length - 1].actual : 0;
                        const prevExpected =
                          acc.length > 0 ? acc[acc.length - 1].expected : 0;
                        const expectedGain =
                          ((bet.baseNetEdgePercent ?? bet.netEdgePercent ?? 0) /
                            100) *
                          bet.kellyStake;
                        acc.push({
                          betNum: idx + 1,
                          actual: prevActual + (bet.kellyPL || 0),
                          expected: prevExpected + expectedGain,
                        });
                        return acc;
                      }, [])}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="betNum"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Bet #",
                        position: "insideBottom",
                        offset: -5,
                        fontSize: 10,
                        fill: "#64748b",
                      }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `£${value}`}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                      itemStyle={{ color: "#f8fafc" }}
                      labelFormatter={(val) => `Bet #${val}`}
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
                    <th className="p-4 font-medium text-right">CLV %</th>
                    <th className="p-4 font-medium text-right">Kelly Stake</th>
                    <th className="p-4 font-medium text-right">Exp. P/L</th>
                    <th className="p-4 font-medium text-right">Act. P/L</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                  {(() => {
                    const allRows = bets
                      .filter((b) => b.result !== undefined)
                      .sort((a, b) => a.placedAt - b.placedAt)
                      .map((bet, idx) => {
                        const edge =
                          bet.baseNetEdgePercent ?? bet.netEdgePercent ?? 0;
                        const expectedGain = (edge / 100) * bet.kellyStake;
                        const actualGain = bet.kellyPL || 0;
                        return {
                          betNum: idx + 1,
                          match: `${bet.homeTeam} vs ${bet.awayTeam}`,
                          edge: edge,
                          stake: bet.kellyStake,
                          clv: bet.clvPercent,
                          expected: expectedGain,
                          actual: actualGain,
                        };
                      })
                      .reverse();

                    const paginatedRows = allRows.slice(
                      (expectedPage - 1) * pageSize,
                      expectedPage * pageSize,
                    );

                    return paginatedRows.map((row) => (
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
                          {row.edge.toFixed(1)}%
                        </td>
                        <td
                          className={`p-4 text-right font-mono ${row.clv !== undefined ? (row.clv > 0 ? "text-emerald-400" : "text-red-400") : "text-slate-500"}`}
                        >
                          {row.clv !== undefined
                            ? `${row.clv > 0 ? "+" : ""}${row.clv.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="p-4 text-right text-slate-200 font-mono">
                          £{row.stake.toFixed(2)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono ${row.expected >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          £{row.expected.toFixed(2)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-bold ${row.actual >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {row.actual > 0 ? "+" : ""}£{row.actual.toFixed(2)}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              {(() => {
                const total = bets.filter((b) => b.result !== undefined).length;
                const totalPages = Math.ceil(total / pageSize);
                if (total <= pageSize) return null;
                return (
                  <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      Showing{" "}
                      {Math.min((expectedPage - 1) * pageSize + 1, total)}-
                      {Math.min(expectedPage * pageSize, total)} of {total}
                    </span>
                    <div className="flex gap-4">
                      <button
                        onClick={() =>
                          setExpectedPage((p) => Math.max(1, p - 1))
                        }
                        disabled={expectedPage === 1}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setExpectedPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={expectedPage === totalPages}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* 3. CLV Tracker */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">CLV Tracker</h3>
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
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                      itemStyle={{ color: "#f8fafc" }}
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
                    <th className="p-4 font-medium text-right">Net Edge %</th>
                    <th className="p-4 font-medium text-right">Your Odds</th>
                    <th className="p-4 font-medium text-right">Closing Odds</th>
                    <th className="p-4 font-medium text-right">CLV %</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                  {(() => {
                    const allRows = bets
                      .filter((b) => b.clvPercent !== undefined)
                      .sort((a, b) => a.placedAt - b.placedAt)
                      .map((bet, idx) => ({
                        id: bet.id,
                        betNum: idx + 1,
                        match: `${bet.homeTeam} vs ${bet.awayTeam}`,
                        netEdge:
                          bet.baseNetEdgePercent ?? bet.netEdgePercent ?? 0,
                        odds: bet.exchangePrice,
                        closing: bet.closingFairPrice,
                        clv: bet.clvPercent || 0,
                      }))
                      .reverse();

                    const paginatedRows = allRows.slice(
                      (clvPage - 1) * pageSize,
                      clvPage * pageSize,
                    );

                    return paginatedRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 font-mono text-slate-500">
                          #{row.betNum}
                        </td>
                        <td className="p-4 font-medium text-slate-200">
                          {row.match}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">
                          {row.netEdge.toFixed(1)}%
                        </td>
                        <td className="p-4 text-right font-mono text-blue-300">
                          {row.odds.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">
                          {row.closing?.toFixed(2)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-bold ${row.clv > 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {row.clv > 0 ? "+" : ""}
                          {row.clv.toFixed(2)}%
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              {(() => {
                const total = bets.filter(
                  (b) => b.clvPercent !== undefined,
                ).length;
                const totalPages = Math.ceil(total / pageSize);
                if (total <= pageSize) return null;
                return (
                  <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      Showing {Math.min((clvPage - 1) * pageSize + 1, total)}-
                      {Math.min(clvPage * pageSize, total)} of {total}
                    </span>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setClvPage((p) => Math.max(1, p - 1))}
                        disabled={clvPage === 1}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setClvPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={clvPage === totalPages}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* 4. By Competition */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            By Competition
          </h3>
          {(() => {
            const competitionsMap: Record<string, TrackedBet[]> = {};
            settled.forEach((b) => {
              const compName =
                LEAGUES.find((l) => l.key === b.sportKey)?.name || b.sport;
              if (!competitionsMap[compName]) competitionsMap[compName] = [];
              competitionsMap[compName].push(b);
            });

            const compData = Object.entries(competitionsMap)
              .map(([name, compBets]) => {
                const totalPL = compBets.reduce(
                  (sum, b) => sum + (b.kellyPL || 0),
                  0,
                );
                const totalStaked = compBets.reduce(
                  (acc, b) => acc + (b.kellyStake || 0),
                  0,
                );
                const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
                const wins = compBets.filter((b) => b.result === "won").length;
                const clvBets = compBets.filter(
                  (b) => b.clvPercent !== undefined,
                );
                const avgClv =
                  clvBets.length > 0
                    ? clvBets.reduce((s, b) => s + (b.clvPercent || 0), 0) /
                      clvBets.length
                    : 0;
                const avgEdge =
                  compBets.reduce(
                    (sum, b) =>
                      sum + (b.baseNetEdgePercent ?? b.netEdgePercent ?? 0),
                    0,
                  ) / compBets.length;
                return {
                  name,
                  roi,
                  bets: compBets.length,
                  wins,
                  winRate: (wins / compBets.length) * 100,
                  avgClv,
                  avgEdge,
                };
              })
              .sort((a, b) => b.roi - a.roi);

            if (compData.length === 0)
              return (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                  No settled data.
                </div>
              );

            return (
              <div className="space-y-6">
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
                          interval={0}
                          tick={{ fontSize: 9 }}
                          angle={-45}
                          textAnchor="end"
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
                            borderColor: "#334155",
                            borderRadius: "8px",
                            color: "#f8fafc",
                          }}
                          itemStyle={{ color: "#f8fafc" }}
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          formatter={(v: number | undefined) => [
                            v !== undefined ? `${v.toFixed(2)}%` : "0.00%",
                            "ROI",
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
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
                        <th className="p-4 font-medium text-right">Win Rate</th>
                        <th className="p-4 font-medium text-right">Avg Edge</th>
                        <th className="p-4 font-medium text-right">Avg CLV</th>
                        <th className="p-4 font-medium text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-300">
                      {compData
                        .slice((compPage - 1) * pageSize, compPage * pageSize)
                        .map((row) => (
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
                            <td className="p-4 text-right text-slate-400">
                              {row.avgEdge.toFixed(1)}%
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
                  {(() => {
                    const total = compData.length;
                    const totalPages = Math.ceil(total / pageSize);
                    if (total <= pageSize) return null;
                    return (
                      <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Showing{" "}
                          {Math.min((compPage - 1) * pageSize + 1, total)}-
                          {Math.min(compPage * pageSize, total)} of {total}
                        </span>
                        <div className="flex gap-4">
                          <button
                            onClick={() =>
                              setCompPage((p) => Math.max(1, p - 1))
                            }
                            disabled={compPage === 1}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setCompPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={compPage === totalPages}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </section>

        {/* 5. By Odds Band */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            By Odds Band
          </h3>
          {(() => {
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
              const totalPL = bandBets.reduce(
                (sum, b) => sum + (b.kellyPL || 0),
                0,
              );
              const totalStaked = bandBets.reduce(
                (acc, b) => acc + (b.kellyStake || 0),
                0,
              );
              const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
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
              <div className="space-y-6">
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
                            borderColor: "#334155",
                            borderRadius: "8px",
                            color: "#f8fafc",
                          }}
                          itemStyle={{ color: "#f8fafc" }}
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          formatter={(v: number | undefined) => [
                            v !== undefined ? `${v.toFixed(2)}%` : "0.00%",
                            "ROI",
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
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
                        <th className="p-4 font-medium text-right">Win Rate</th>
                        <th className="p-4 font-medium text-right">Avg CLV</th>
                        <th className="p-4 font-medium text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-300">
                      {bandData
                        .slice((oddsPage - 1) * pageSize, oddsPage * pageSize)
                        .map((row) => (
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
                  {(() => {
                    const total = bandData.length;
                    const totalPages = Math.ceil(total / pageSize);
                    if (total <= pageSize) return null;
                    return (
                      <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Showing{" "}
                          {Math.min((oddsPage - 1) * pageSize + 1, total)}-
                          {Math.min(oddsPage * pageSize, total)} of {total}
                        </span>
                        <div className="flex gap-4">
                          <button
                            onClick={() =>
                              setOddsPage((p) => Math.max(1, p - 1))
                            }
                            disabled={oddsPage === 1}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setOddsPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={oddsPage === totalPages}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </section>

        {/* 6. By Timing */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">By Timing</h3>
          {(() => {
            const buckets = ["48hr+", "24-48hr", "12-24hr", "<12hr"];
            const timingData = buckets.map((bucket) => {
              const bucketBets = settled.filter(
                (b) => b.timingBucket === bucket,
              );
              const totalPL = bucketBets.reduce(
                (sum, b) => sum + (b.kellyPL || 0),
                0,
              );
              const totalStaked = bucketBets.reduce(
                (acc, b) => acc + (b.kellyStake || 0),
                0,
              );
              const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
              const wins = bucketBets.filter((b) => b.result === "won").length;
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
                  bucketBets.length > 0 ? (wins / bucketBets.length) * 100 : 0,
                avgClv,
              };
            });

            return (
              <div className="space-y-6">
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
                            borderColor: "#334155",
                            borderRadius: "8px",
                            color: "#f8fafc",
                          }}
                          itemStyle={{ color: "#f8fafc" }}
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          formatter={(v: number | undefined) => [
                            v !== undefined ? `${v.toFixed(2)}%` : "0.00%",
                            "ROI",
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
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
                        <th className="p-4 font-medium text-right">Win Rate</th>
                        <th className="p-4 font-medium text-right">Avg CLV</th>
                        <th className="p-4 font-medium text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-300">
                      {timingData
                        .slice(
                          (timingPage - 1) * pageSize,
                          timingPage * pageSize,
                        )
                        .map((row) => (
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
                  {(() => {
                    const total = timingData.length;
                    const totalPages = Math.ceil(total / pageSize);
                    if (total <= pageSize) return null;
                    return (
                      <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Showing{" "}
                          {Math.min((timingPage - 1) * pageSize + 1, total)}-
                          {Math.min(timingPage * pageSize, total)} of {total}
                        </span>
                        <div className="flex gap-4">
                          <button
                            onClick={() =>
                              setTimingPage((p) => Math.max(1, p - 1))
                            }
                            disabled={timingPage === 1}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setTimingPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={timingPage === totalPages}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </section>

        {/* 7. By Market */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">By Market</h3>
          {(() => {
            const markets = ["Match Result", "Over/Under", "Handicap"];
            const marketData = markets.map((mkt) => {
              const marketBets = settled.filter((b) => b.market === mkt);
              const totalPL = marketBets.reduce(
                (sum, b) => sum + (b.kellyPL || 0),
                0,
              );
              const totalStaked = marketBets.reduce(
                (acc, b) => acc + (b.kellyStake || 0),
                0,
              );
              const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
              const wins = marketBets.filter((b) => b.result === "won").length;
              const clvBets = marketBets.filter(
                (b) => b.clvPercent !== undefined,
              );
              const avgClv =
                clvBets.length > 0
                  ? clvBets.reduce((s, b) => s + (b.clvPercent || 0), 0) /
                    clvBets.length
                  : 0;
              const avgEdge =
                marketBets.length > 0
                  ? marketBets.reduce(
                      (sum, b) =>
                        sum + (b.baseNetEdgePercent ?? b.netEdgePercent ?? 0),
                      0,
                    ) / marketBets.length
                  : 0;
              return {
                name: mkt,
                roi,
                bets: marketBets.length,
                wins,
                winRate:
                  marketBets.length > 0 ? (wins / marketBets.length) * 100 : 0,
                avgClv,
                avgEdge,
              };
            });

            return (
              <div className="space-y-6">
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
                            borderColor: "#334155",
                            borderRadius: "8px",
                            color: "#f8fafc",
                          }}
                          itemStyle={{ color: "#f8fafc" }}
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          formatter={(v: number | undefined) => [
                            v !== undefined ? `${v.toFixed(2)}%` : "0.00%",
                            "ROI",
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
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
                        <th className="p-4 font-medium text-right">Win Rate</th>
                        <th className="p-4 font-medium text-right">Avg Edge</th>
                        <th className="p-4 font-medium text-right">Avg CLV</th>
                        <th className="p-4 font-medium text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-300">
                      {marketData
                        .slice(
                          (marketPage - 1) * pageSize,
                          marketPage * pageSize,
                        )
                        .map((row) => (
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
                            <td className="p-4 text-right text-slate-400">
                              {row.avgEdge.toFixed(1)}%
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
                  {(() => {
                    const total = marketData.length;
                    const totalPages = Math.ceil(total / pageSize);
                    if (total <= pageSize) return null;
                    return (
                      <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Showing{" "}
                          {Math.min((marketPage - 1) * pageSize + 1, total)}-
                          {Math.min(marketPage * pageSize, total)} of {total}
                        </span>
                        <div className="flex gap-4">
                          <button
                            onClick={() =>
                              setMarketPage((p) => Math.max(1, p - 1))
                            }
                            disabled={marketPage === 1}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setMarketPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={marketPage === totalPages}
                            className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </section>

        {/* Kelly Comparison Analysis */}
      </div>
    </div>
  );
};
