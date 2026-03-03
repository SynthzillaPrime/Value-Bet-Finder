import React, { useMemo } from "react";
import { TrackedBet } from "../types";
import { LEAGUES } from "../constants";
import { SummaryStats } from "./stats/SummaryStats";
import { PaginatedTable } from "./PaginatedTable";
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
  const pageSize = 10;

  const settled = useMemo(() => {
    return bets.filter((b) => b.result !== undefined && b.result !== "void");
  }, [bets]);

  // 1. Bankroll Data
  const bankrollData = useMemo(() => {
    return bets
      .filter((b) => b.result !== undefined)
      .sort((a, b) => a.placedAt - b.placedAt)
      .reduce((acc: any[], bet, idx) => {
        const prevBankroll = acc.length > 0 ? acc[acc.length - 1].bankroll : 0;
        const currentBankroll = prevBankroll + (bet.kellyPL || 0);
        acc.push({
          betNum: idx + 1,
          date: new Date(bet.placedAt).toLocaleDateString("en-GB"),
          match: `${bet.homeTeam} vs ${bet.awayTeam}`,
          result: bet.result,
          pl: bet.kellyPL || 0,
          bankroll: currentBankroll,
        });
        return acc;
      }, []);
  }, [bets]);

  // 2. Expected Data
  const expectedData = useMemo(() => {
    return bets
      .filter((b) => b.result !== undefined)
      .sort((a, b) => a.placedAt - b.placedAt)
      .reduce((acc: any[], bet, idx) => {
        const prevActual = acc.length > 0 ? acc[acc.length - 1].actual : 0;
        const prevExpected = acc.length > 0 ? acc[acc.length - 1].expected : 0;

        const edge = bet.baseNetEdgePercent ?? bet.netEdgePercent ?? 0;
        const expectedGain = (edge / 100) * bet.kellyStake;
        const actualGain = bet.kellyPL ?? 0;

        acc.push({
          betNum: idx + 1,
          match: `${bet.homeTeam} vs ${bet.awayTeam}`,
          edge: edge,
          stake: bet.kellyStake,
          clv: bet.clvPercent,
          expectedGain: expectedGain,
          actualGain: actualGain,
          actual: prevActual + actualGain,
          expected: prevExpected + expectedGain,
        });
        return acc;
      }, []);
  }, [bets]);

  // 3. CLV Data
  const clvData = useMemo(() => {
    const clvBets = bets
      .filter((b) => b.clvPercent !== undefined)
      .sort((a, b) => a.placedAt - b.placedAt);

    const rows = clvBets.map((bet, idx) => ({
      id: bet.id,
      betNum: idx + 1,
      match: `${bet.homeTeam} vs ${bet.awayTeam}`,
      netEdge: bet.baseNetEdgePercent ?? bet.netEdgePercent ?? 0,
      odds: bet.exchangePrice,
      closing: bet.closingFairPrice,
      clv: bet.clvPercent ?? 0,
    }));

    const avgClv =
      clvBets.length > 0
        ? clvBets.reduce((acc, b) => acc + (b.clvPercent ?? 0), 0) /
          clvBets.length
        : 0;

    const beatCount = clvBets.filter((b) => (b.clvPercent ?? 0) > 0).length;
    const beatRate =
      clvBets.length > 0 ? (beatCount / clvBets.length) * 100 : 0;

    return {
      rows,
      chart: rows,
      avgClv,
      beatCount,
      beatRate,
      totalCount: clvBets.length,
    };
  }, [bets]);

  // 4. Competition Data
  const competitionData = useMemo(() => {
    const competitionsMap: Record<string, TrackedBet[]> = {};
    settled.forEach((b) => {
      const compName =
        LEAGUES.find((l) => l.key === b.sportKey)?.name || b.sport;
      if (!competitionsMap[compName]) competitionsMap[compName] = [];
      competitionsMap[compName].push(b);
    });

    return Object.entries(competitionsMap)
      .map(([name, compBets]) => {
        const totalPL = compBets.reduce((sum, b) => sum + (b.kellyPL ?? 0), 0);
        const totalStaked = compBets.reduce(
          (acc, b) => acc + (b.kellyStake || 0),
          0,
        );
        const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
        const wins = compBets.filter((b) => b.result === "won").length;
        const clvBets = compBets.filter((b) => b.clvPercent !== undefined);
        const avgClv =
          clvBets.length > 0
            ? clvBets.reduce((s, b) => s + (b.clvPercent ?? 0), 0) /
              clvBets.length
            : 0;
        const avgEdge =
          compBets.reduce(
            (sum, b) => sum + (b.baseNetEdgePercent ?? b.netEdgePercent ?? 0),
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
  }, [settled]);

  // 5. Odds Band Data
  const oddsBandData = useMemo(() => {
    const bands = [
      { label: "1.50 - 3.00", min: 1.5, max: 3.0 },
      { label: "3.00 - 6.00", min: 3.0, max: 6.0 },
      { label: "6.00 - 10.00", min: 6.0, max: 10.0 },
    ];
    return bands.map((band) => {
      const bandBets = settled.filter((b) => {
        if (band.label === "1.50 - 3.00")
          return b.exchangePrice >= 1.5 && b.exchangePrice < 3.0;
        if (band.label === "3.00 - 6.00")
          return b.exchangePrice >= 3.0 && b.exchangePrice < 6.0;
        return b.exchangePrice >= 6.0 && b.exchangePrice <= 10.0;
      });
      const totalPL = bandBets.reduce((sum, b) => sum + (b.kellyPL ?? 0), 0);
      const totalStaked = bandBets.reduce(
        (acc, b) => acc + (b.kellyStake || 0),
        0,
      );
      const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
      const wins = bandBets.filter((b) => b.result === "won").length;
      const clvBets = bandBets.filter((b) => b.clvPercent !== undefined);
      const avgClv =
        clvBets.length > 0
          ? clvBets.reduce((s, b) => s + (b.clvPercent ?? 0), 0) /
            clvBets.length
          : 0;
      return {
        name: band.label,
        roi,
        bets: bandBets.length,
        wins,
        winRate: bandBets.length > 0 ? (wins / bandBets.length) * 100 : 0,
        avgClv,
      };
    });
  }, [settled]);

  // 6. Timing Data
  const timingData = useMemo(() => {
    const buckets = ["48hr+", "24-48hr", "12-24hr", "<12hr"];
    return buckets.map((bucket) => {
      const bucketBets = settled.filter((b) => b.timingBucket === bucket);
      const totalPL = bucketBets.reduce((sum, b) => sum + (b.kellyPL ?? 0), 0);
      const totalStaked = bucketBets.reduce(
        (acc, b) => acc + (b.kellyStake || 0),
        0,
      );
      const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
      const wins = bucketBets.filter((b) => b.result === "won").length;
      const clvBets = bucketBets.filter((b) => b.clvPercent !== undefined);
      const avgClv =
        clvBets.length > 0
          ? clvBets.reduce((s, b) => s + (b.clvPercent ?? 0), 0) /
            clvBets.length
          : 0;
      return {
        name: bucket,
        roi,
        bets: bucketBets.length,
        wins,
        winRate: bucketBets.length > 0 ? (wins / bucketBets.length) * 100 : 0,
        avgClv,
      };
    });
  }, [settled]);

  // 7. Market Data
  const marketData = useMemo(() => {
    const markets = ["Match Result", "Over/Under", "Handicap"];
    return markets.map((mkt) => {
      const marketBets = settled.filter((b) => b.market === mkt);
      const totalPL = marketBets.reduce((sum, b) => sum + (b.kellyPL ?? 0), 0);
      const totalStaked = marketBets.reduce(
        (acc, b) => acc + (b.kellyStake || 0),
        0,
      );
      const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
      const wins = marketBets.filter((b) => b.result === "won").length;
      const clvBets = marketBets.filter((b) => b.clvPercent !== undefined);
      const avgClv =
        clvBets.length > 0
          ? clvBets.reduce((s, b) => s + (b.clvPercent ?? 0), 0) /
            clvBets.length
          : 0;
      const avgEdge =
        marketBets.length > 0
          ? marketBets.reduce(
              (sum, b) => sum + (b.baseNetEdgePercent ?? b.netEdgePercent ?? 0),
              0,
            ) / marketBets.length
          : 0;
      return {
        name: mkt,
        roi,
        bets: marketBets.length,
        wins,
        winRate: marketBets.length > 0 ? (wins / marketBets.length) * 100 : 0,
        avgClv,
        avgEdge,
      };
    });
  }, [settled]);

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
                  <AreaChart data={bankrollData}>
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

            <PaginatedTable
              data={[...bankrollData].reverse()}
              pageSize={pageSize}
              keyFn={(row) => row.betNum.toString()}
              columns={[
                {
                  label: "Bet #",
                  render: (row) => (
                    <span className="font-mono text-slate-500">
                      #{row.betNum}
                    </span>
                  ),
                },
                {
                  label: "Date",
                  render: (row) => <span className="text-xs">{row.date}</span>,
                },
                {
                  label: "Match",
                  render: (row) => (
                    <span className="font-medium text-slate-200">
                      {row.match}
                    </span>
                  ),
                },
                {
                  label: "Result",
                  render: (row) => (
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        row.result === "won"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : row.result === "lost"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {row.result}
                    </span>
                  ),
                },
                {
                  label: "P/L",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-mono font-bold ${row.pl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.pl > 0 ? "+" : ""}
                      {row.pl.toFixed(2)}
                    </span>
                  ),
                },
                {
                  label: "Bankroll",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-slate-200">
                      £{row.bankroll.toFixed(2)}
                    </span>
                  ),
                },
              ]}
            />
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
                  <LineChart data={expectedData}>
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

            <PaginatedTable
              data={[...expectedData].reverse()}
              pageSize={pageSize}
              keyFn={(row) => row.betNum.toString()}
              columns={[
                {
                  label: "Bet #",
                  render: (row) => (
                    <span className="font-mono text-slate-500">
                      #{row.betNum}
                    </span>
                  ),
                },
                {
                  label: "Match",
                  render: (row) => (
                    <span className="font-medium text-slate-200">
                      {row.match}
                    </span>
                  ),
                },
                {
                  label: "Edge %",
                  align: "right",
                  render: (row) => (
                    <span className="text-slate-400">
                      {row.edge.toFixed(1)}%
                    </span>
                  ),
                },
                {
                  label: "CLV %",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-mono ${
                        row.clv !== undefined
                          ? row.clv > 0
                            ? "text-emerald-400"
                            : "text-red-400"
                          : "text-slate-500"
                      }`}
                    >
                      {row.clv !== undefined
                        ? `${row.clv > 0 ? "+" : ""}${row.clv.toFixed(1)}%`
                        : "—"}
                    </span>
                  ),
                },
                {
                  label: "Kelly Stake",
                  align: "right",
                  render: (row) => (
                    <span className="text-slate-200 font-mono">
                      £{row.stake.toFixed(2)}
                    </span>
                  ),
                },
                {
                  label: "Exp. P/L",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-mono ${row.expectedGain >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      £{row.expectedGain.toFixed(2)}
                    </span>
                  ),
                },
                {
                  label: "Act. P/L",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-mono font-bold ${row.actualGain >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.actualGain > 0 ? "+" : ""}£
                      {row.actualGain.toFixed(2)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* 3. CLV Tracker */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">CLV Tracker</h3>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clvData.chart}>
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

              <div className="mt-6 flex justify-center gap-8 border-t border-slate-800 pt-6">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">
                    Average CLV
                  </p>
                  <p
                    className={`text-xl font-bold ${clvData.avgClv >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {clvData.avgClv > 0 ? "+" : ""}
                    {clvData.avgClv.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">
                    Beat The Close
                  </p>
                  <p className="text-xl font-bold text-slate-200">
                    {clvData.beatCount}{" "}
                    <span className="text-slate-500 text-sm">of</span>{" "}
                    {clvData.totalCount}
                    <span className="text-blue-400 ml-2">
                      ({clvData.beatRate.toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <PaginatedTable
              data={[...clvData.rows].reverse()}
              pageSize={pageSize}
              keyFn={(row) => row.id}
              columns={[
                {
                  label: "Bet #",
                  render: (row) => (
                    <span className="font-mono text-slate-500">
                      #{row.betNum}
                    </span>
                  ),
                },
                {
                  label: "Match",
                  render: (row) => (
                    <span className="font-medium text-slate-200">
                      {row.match}
                    </span>
                  ),
                },
                {
                  label: "Net Edge %",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-slate-400">
                      {row.netEdge.toFixed(1)}%
                    </span>
                  ),
                },
                {
                  label: "Your Odds",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-blue-300">
                      {row.odds.toFixed(2)}
                    </span>
                  ),
                },
                {
                  label: "Closing Odds",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-slate-400">
                      {row.closing?.toFixed(2) || "—"}
                    </span>
                  ),
                },
                {
                  label: "CLV %",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-mono font-bold ${row.clv > 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.clv > 0 ? "+" : ""}
                      {row.clv.toFixed(2)}%
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* 4. By Competition */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            By Competition
          </h3>
          {competitionData.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              No settled data.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={competitionData}
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
                        {competitionData.map((entry, index) => (
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

              <PaginatedTable
                data={competitionData}
                pageSize={pageSize}
                keyFn={(row) => row.name}
                columns={[
                  {
                    label: "Competition",
                    render: (row) => (
                      <span className="font-medium text-slate-200">
                        {row.name}
                      </span>
                    ),
                  },
                  { label: "Bets", align: "right", render: (row) => row.bets },
                  { label: "Won", align: "right", render: (row) => row.wins },
                  {
                    label: "Win Rate",
                    align: "right",
                    render: (row) => `${row.winRate.toFixed(1)}%`,
                  },
                  {
                    label: "Avg Edge",
                    align: "right",
                    render: (row) => (
                      <span className="text-slate-400">
                        {row.avgEdge.toFixed(1)}%
                      </span>
                    ),
                  },
                  {
                    label: "Avg CLV",
                    align: "right",
                    render: (row) => (
                      <span
                        className={
                          row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {row.avgClv > 0 ? "+" : ""}
                        {row.avgClv.toFixed(2)}%
                      </span>
                    ),
                  },
                  {
                    label: "ROI",
                    align: "right",
                    render: (row) => (
                      <span
                        className={`font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {row.roi > 0 ? "+" : ""}
                        {row.roi.toFixed(1)}%
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </section>

        {/* 5. By Odds Band */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            By Odds Band
          </h3>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={oddsBandData}
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
                      {oddsBandData.map((entry, index) => (
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

            <PaginatedTable
              data={oddsBandData}
              pageSize={pageSize}
              keyFn={(row) => row.name}
              columns={[
                {
                  label: "Odds Band",
                  render: (row) => (
                    <span className="font-medium text-slate-200">
                      {row.name}
                    </span>
                  ),
                },
                { label: "Bets", align: "right", render: (row) => row.bets },
                { label: "Won", align: "right", render: (row) => row.wins },
                {
                  label: "Win Rate",
                  align: "right",
                  render: (row) => `${row.winRate.toFixed(1)}%`,
                },
                {
                  label: "Avg CLV",
                  align: "right",
                  render: (row) => (
                    <span
                      className={
                        row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {row.avgClv > 0 ? "+" : ""}
                      {row.avgClv.toFixed(2)}%
                    </span>
                  ),
                },
                {
                  label: "ROI",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.roi > 0 ? "+" : ""}
                      {row.roi.toFixed(1)}%
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* 6. By Timing */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">By Timing</h3>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[300px] w-full">
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

            <PaginatedTable
              data={timingData}
              pageSize={pageSize}
              keyFn={(row) => row.name}
              columns={[
                {
                  label: "Timing",
                  render: (row) => (
                    <span className="font-medium text-slate-200">
                      {row.name}
                    </span>
                  ),
                },
                { label: "Bets", align: "right", render: (row) => row.bets },
                { label: "Won", align: "right", render: (row) => row.wins },
                {
                  label: "Win Rate",
                  align: "right",
                  render: (row) => `${row.winRate.toFixed(1)}%`,
                },
                {
                  label: "Avg CLV",
                  align: "right",
                  render: (row) => (
                    <span
                      className={
                        row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {row.avgClv > 0 ? "+" : ""}
                      {row.avgClv.toFixed(2)}%
                    </span>
                  ),
                },
                {
                  label: "ROI",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.roi > 0 ? "+" : ""}
                      {row.roi.toFixed(1)}%
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* 7. By Market */}
        <section>
          <h3 className="text-lg font-bold text-slate-300 mb-4">By Market</h3>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="h-[300px] w-full">
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

            <PaginatedTable
              data={marketData}
              pageSize={pageSize}
              keyFn={(row) => row.name}
              columns={[
                {
                  label: "Market",
                  render: (row) => (
                    <span className="font-medium text-slate-200">
                      {row.name}
                    </span>
                  ),
                },
                { label: "Bets", align: "right", render: (row) => row.bets },
                { label: "Won", align: "right", render: (row) => row.wins },
                {
                  label: "Win Rate",
                  align: "right",
                  render: (row) => `${row.winRate.toFixed(1)}%`,
                },
                {
                  label: "Avg Edge",
                  align: "right",
                  render: (row) => (
                    <span className="text-slate-400">
                      {row.avgEdge.toFixed(1)}%
                    </span>
                  ),
                },
                {
                  label: "Avg CLV",
                  align: "right",
                  render: (row) => (
                    <span
                      className={
                        row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {row.avgClv > 0 ? "+" : ""}
                      {row.avgClv.toFixed(2)}%
                    </span>
                  ),
                },
                {
                  label: "ROI",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`font-bold ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.roi > 0 ? "+" : ""}
                      {row.roi.toFixed(1)}%
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
