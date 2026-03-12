import React, { useMemo } from "react";
import { TrackedBet, BankrollTransaction } from "../types";
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
  transactions: BankrollTransaction[];
}

export const AnalysisView: React.FC<Props> = ({ bets, transactions }) => {
  const pageSize = 10;

  const settled = useMemo(() => {
    return bets.filter((b) => b.result !== undefined && b.result !== "void");
  }, [bets]);

  // 1. Combined Bankroll & Expected Data
  const bankrollData = useMemo(() => {
    const settledBets = [...bets]
      .filter((b) => b.result !== undefined && b.result !== "void")
      .sort((a, b) => a.placedAt - b.placedAt);

    const nonBetTransactions = transactions.filter(
      (t) =>
        t.type === "deposit" ||
        t.type === "withdrawal" ||
        t.type === "adjustment",
    );

    return settledBets.reduce((acc: any[], bet, idx) => {
      // Calculate starting bankroll from all non-bet transactions up to this bet's placement
      const startingBankroll = nonBetTransactions
        .filter((t) => t.timestamp <= bet.placedAt)
        .reduce((sum, t) => sum + t.amount, 0);

      const prevActualPL = acc.length > 0 ? acc[acc.length - 1].actualPL : 0;
      const prevExpectedPL =
        acc.length > 0 ? acc[acc.length - 1].expectedPL : 0;

      const edge = bet.baseNetEdgePercent ?? bet.netEdgePercent ?? 0;
      const expectedGain = (edge / 100) * bet.kellyStake;
      const actualGain = bet.kellyPL ?? 0;

      const currentActualPL = prevActualPL + actualGain;
      const currentExpectedPL = prevExpectedPL + expectedGain;

      acc.push({
        betNum: idx + 1,
        date: new Date(bet.placedAt).toLocaleDateString("en-GB"),
        match: `${bet.homeTeam} vs ${bet.awayTeam}`,
        result: bet.result,
        edge: edge,
        clv: bet.clvPercent,
        stake: bet.kellyStake,
        expectedGain: expectedGain,
        actualGain: actualGain,
        actualPL: currentActualPL,
        expectedPL: currentExpectedPL,
        actual: startingBankroll + currentActualPL,
        expected: startingBankroll + currentExpectedPL,
      });
      return acc;
    }, []);
  }, [bets, transactions]);

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
      let compName = LEAGUES.find((l) => l.key === b.sportKey)?.name || b.sport;

      // Truncate long competition names for chart display
      const mapping: Record<string, string> = {
        "Champions League": "UCL",
        "Europa League": "UEL",
        "Conference League": "UECL",
        "Premier League": "EPL",
        "La Liga": "LaLiga",
        Bundesliga: "Bund",
        "Serie A": "SerieA",
        "Ligue 1": "Ligue1",
        Championship: "Champ",
      };

      if (mapping[compName]) {
        compName = mapping[compName];
      } else if (compName.length > 12) {
        compName = compName.substring(0, 10) + "...";
      }

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
    const markets = ["Match Result"];
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <SummaryStats bets={bets} />

      <div className="space-y-12">
        {/* 1. Bankroll */}
        <section className="w-full">
          <h3 className="text-lg font-bold text-slate-300 mb-4">Bankroll</h3>
          <div className="space-y-6 w-full">
            <div className="w-full bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-sm">
              <div className="h-[350px] w-full">
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
                          stopOpacity={0.2}
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
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Bet #",
                        position: "insideBottom",
                        offset: -5,
                        fontSize: 10,
                        fill: "#64748b",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `£${value}`}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                      itemStyle={{
                        color: "#f8fafc",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                      labelFormatter={(val) => `Bet #${val}`}
                      formatter={(value: any, name: string | undefined) => {
                        return [
                          `£${Number(value).toFixed(2)}`,
                          name === "Actual Bankroll"
                            ? "Actual Bankroll"
                            : "Expected Bankroll",
                        ];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                    <Area
                      name="Actual Bankroll"
                      type="monotone"
                      dataKey="actual"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorBankroll)"
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
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400 max-w-2xl mx-auto">
                <span className="font-bold text-slate-300 uppercase mr-2">
                  Explanation:
                </span>
                Expected = Starting bankroll + sum of (edge × stake). Actual =
                Starting bankroll + real P/L. Lines converging over time = edge
                is real.
              </p>
            </div>

            <PaginatedTable
              data={[...bankrollData].reverse()}
              pageSize={pageSize}
              keyFn={(row) => row.betNum.toString()}
              columns={[
                {
                  label: "Bet #",
                  render: (row) => (
                    <span className="tabular-nums text-slate-500">
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
                      className={`tabular-nums ${
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
                    <span className="text-slate-200 tabular-nums">
                      £{row.stake.toFixed(2)}
                    </span>
                  ),
                },
                {
                  label: "Exp. P/L",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`tabular-nums ${row.expectedGain >= 0 ? "text-emerald-400" : "text-red-400"}`}
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
                      className={`tabular-nums font-bold ${row.actualGain >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.actualGain > 0 ? "+" : ""}£
                      {row.actualGain.toFixed(2)}
                    </span>
                  ),
                },
                {
                  label: "Bankroll",
                  align: "right",
                  render: (row) => (
                    <span className="tabular-nums text-slate-200 font-bold">
                      £{row.actual.toFixed(2)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* 3. CLV Tracker */}
        <section className="w-full">
          <h3 className="text-lg font-bold text-slate-300 mb-4">CLV Tracker</h3>
          <div className="space-y-6 w-full">
            <div className="w-full bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-sm">
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
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
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
                        fontFamily: "DM Sans, sans-serif",
                      }}
                      itemStyle={{
                        color: "#f8fafc",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                      formatter={(value: any) => {
                        return [`${Number(value).toFixed(2)}%`, "CLV"];
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
                    <span className="tabular-nums text-slate-500">
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
                  label: "Odds",
                  align: "right",
                  render: (row) => (
                    <span className="tabular-nums text-blue-300 font-bold">
                      {row.odds.toFixed(2)}
                    </span>
                  ),
                },
                {
                  label: "SP",
                  align: "right",
                  render: (row) => (
                    <span className="tabular-nums text-slate-400">
                      {row.closing?.toFixed(2) || "—"}
                    </span>
                  ),
                },
                {
                  label: "Edge",
                  align: "right",
                  render: (row) => (
                    <span className="tabular-nums text-slate-400 font-bold">
                      {row.netEdge.toFixed(1)}%
                    </span>
                  ),
                },
                {
                  label: "CLV",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`tabular-nums font-bold ${row.clv > 0 ? "text-emerald-400" : "text-red-400"}`}
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
        <section className="w-full">
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            By Competition
          </h3>
          {competitionData.length === 0 ? (
            <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              No settled data.
            </div>
          ) : (
            <div className="space-y-6 w-full">
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={competitionData}
                      margin={{ left: 0, right: 0, top: 10, bottom: 30 }}
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
                        tick={{
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 10,
                        }}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tick={{
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 12,
                        }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          color: "#f8fafc",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                        itemStyle={{
                          color: "#f8fafc",
                          fontFamily: "DM Sans, sans-serif",
                        }}
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
                      <span className="tabular-nums text-slate-400 font-bold">
                        {row.avgEdge.toFixed(1)}%
                      </span>
                    ),
                  },
                  {
                    label: "Avg CLV",
                    align: "right",
                    render: (row) => (
                      <span
                        className={`tabular-nums font-bold ${
                          row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
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
        <section className="w-full">
          <h3 className="text-lg font-bold text-slate-300 mb-4">
            By Odds Band
          </h3>
          <div className="space-y-6 w-full">
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-sm">
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
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
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
                        fontFamily: "DM Sans, sans-serif",
                      }}
                      itemStyle={{
                        color: "#f8fafc",
                        fontFamily: "DM Sans, sans-serif",
                      }}
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
                      className={`tabular-nums font-bold ${
                        row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
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
        <section className="w-full">
          <h3 className="text-lg font-bold text-slate-300 mb-4">By Timing</h3>
          <div className="space-y-6 w-full">
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-sm">
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
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
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
                        fontFamily: "DM Sans, sans-serif",
                      }}
                      itemStyle={{
                        color: "#f8fafc",
                        fontFamily: "DM Sans, sans-serif",
                      }}
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
                      className={`tabular-nums font-bold ${
                        row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
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
        <section className="w-full">
          <h3 className="text-lg font-bold text-slate-300 mb-4">By Market</h3>
          <div className="space-y-6 w-full">
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-sm">
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
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 12 }}
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
                        fontFamily: "DM Sans, sans-serif",
                      }}
                      itemStyle={{
                        color: "#f8fafc",
                        fontFamily: "DM Sans, sans-serif",
                      }}
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
                    <span className="tabular-nums text-slate-400 font-bold">
                      {row.avgEdge.toFixed(1)}%
                    </span>
                  ),
                },
                {
                  label: "Avg CLV",
                  align: "right",
                  render: (row) => (
                    <span
                      className={`tabular-nums font-bold ${
                        row.avgClv >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
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
