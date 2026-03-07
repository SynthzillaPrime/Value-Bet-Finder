import * as React from "react";
import { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { ArrowUpCircle, History, ChevronDown, Download } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { BankrollTransaction, ExchangeBankroll, TrackedBet } from "../../types";

interface Props {
  transactions: BankrollTransaction[];
  exchangeBankrolls: ExchangeBankroll;
  onAddTransaction: (t: BankrollTransaction) => Promise<void>;
  trackedBets: TrackedBet[];
}

export const BankrollView: React.FC<Props> = ({
  transactions,
  exchangeBankrolls,
  onAddTransaction,
  trackedBets,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState<{
    exchange: "matchbook" | "smarkets";
    type: "deposit" | "withdrawal" | "adjustment";
    amount: string;
  }>({
    exchange: "matchbook",
    type: "deposit",
    amount: "",
  });

  const [typeFilter, setTypeFilter] = useState("All Types");
  const [exchangeFilter, setExchangeFilter] = useState("All Exchanges");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const exportTransactionsToCSV = (
    targetTxs: BankrollTransaction[] = transactions,
  ) => {
    const headers = ["Date", "Time", "Exchange", "Type", "Amount", "Note"];
    const rows = targetTxs.map((t) => [
      new Date(t.timestamp).toLocaleDateString("en-GB"),
      `"${new Date(t.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}"`,
      t.exchange,
      t.type.replace("_", " "),
      t.amount.toFixed(2),
      t.note || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `vbf-transactions-${dateStr}.csv`);
    link.click();
  };

  const handleAddTx = async () => {
    const amount = parseFloat(newTx.amount);
    if (isNaN(amount) || amount === 0 || isAdding) return;

    setIsAdding(true);
    try {
      await onAddTransaction({
        id: `tx-${Date.now()}`,
        timestamp: Date.now(),
        exchange: newTx.exchange,
        type: newTx.type,
        amount: newTx.type === "withdrawal" ? -Math.abs(amount) : amount,
      });

      setNewTx({ ...newTx, amount: "" });
    } catch (error) {
      console.error("Failed to add transaction:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const sortedTransactions = [...transactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((t) => {
      const matchType =
        typeFilter === "All Types" ||
        t.type.replace("_", " ").toLowerCase() === typeFilter.toLowerCase();
      const matchExchange =
        exchangeFilter === "All Exchanges" ||
        t.exchange.toLowerCase() === exchangeFilter.toLowerCase();
      return matchType && matchExchange;
    });

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = sortedTransactions.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  // Calculate Matchbook statistics
  const getExchangeStats = (ex: "matchbook" | "smarkets") => {
    const exTransactions = transactions.filter((t) => t.exchange === ex);
    const netDeposits = exTransactions
      .filter((t) => ["deposit", "withdrawal", "adjustment"].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = exchangeBankrolls[ex];
    const bets = exTransactions.filter((t) => t.type === "bet_placed").length;
    const staked = Math.abs(
      exTransactions
        .filter((t) => t.type === "bet_placed")
        .reduce((sum, t) => sum + t.amount, 0),
    );
    const profitLoss = exTransactions
      .filter((t) =>
        ["bet_placed", "bet_win", "bet_loss", "bet_void"].includes(t.type),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      name: ex.charAt(0).toUpperCase() + ex.slice(1),
      netDeposits,
      balance,
      bets,
      staked,
      profitLoss,
      stakeRoi: staked !== 0 ? (profitLoss / staked) * 100 : null,
      ret: netDeposits !== 0 ? (profitLoss / netDeposits) * 100 : null,
    };
  };

  const matchbookStats = getExchangeStats("matchbook");
  const smarketsStats = getExchangeStats("smarkets");

  const totalStats = {
    netDeposits: matchbookStats.netDeposits + smarketsStats.netDeposits,
    balance: matchbookStats.balance + smarketsStats.balance,
    bets: matchbookStats.bets + smarketsStats.bets,
    staked: matchbookStats.staked + smarketsStats.staked,
    profitLoss: matchbookStats.profitLoss + smarketsStats.profitLoss,
    stakeRoi:
      matchbookStats.staked + smarketsStats.staked !== 0
        ? ((matchbookStats.profitLoss + smarketsStats.profitLoss) /
            (matchbookStats.staked + smarketsStats.staked)) *
          100
        : null,
    ret:
      matchbookStats.netDeposits + smarketsStats.netDeposits !== 0
        ? ((matchbookStats.profitLoss + smarketsStats.profitLoss) /
            (matchbookStats.netDeposits + smarketsStats.netDeposits)) *
          100
        : null,
  };

  const chartData = useMemo(() => {
    const settledBets = [...trackedBets]
      .filter((b) => b.status === "closed" && b.kellyPL !== undefined)
      .sort((a, b) => a.placedAt - b.placedAt);

    // Starting balance = total net deposits from non-bet transactions
    const startingBalance = transactions
      .filter((t) => !t.betId)
      .reduce((sum, t) => sum + t.amount, 0);

    let runningBalance = startingBalance;
    const data = settledBets.map((bet, idx) => {
      runningBalance += bet.kellyPL || 0;
      return {
        betNum: idx + 1,
        balance: runningBalance,
      };
    });

    if (data.length === 0) {
      return [{ betNum: 0, balance: startingBalance }];
    }

    return data;
  }, [trackedBets, transactions]);

  const isPositivePL = totalStats.profitLoss >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch mb-6">
        {/* Left Panel: Summary Table + Chart Stacked */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-auto" />
                <col className="w-[85px]" />
                <col className="w-[85px]" />
                <col className="w-[50px]" />
                <col className="w-[85px]" />
                <col className="w-[80px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
              </colgroup>
              <thead>
                <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase tracking-wider bg-slate-800/50 font-bold">
                  <th className="px-6 py-3 whitespace-nowrap">Exchange</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">
                    Net Dep.
                  </th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">
                    Bets
                  </th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">
                    Staked
                  </th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">
                    P/L
                  </th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">
                    ROI
                  </th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">
                    Return
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {[matchbookStats, smarketsStats].map((stats) => (
                  <tr
                    key={stats.name}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-3 font-bold text-slate-300 whitespace-nowrap text-xs">
                      {stats.name}
                    </td>
                    <td className="px-6 py-3 font-mono font-bold text-right text-white whitespace-nowrap text-xs">
                      £{stats.netDeposits.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 font-mono font-bold text-right text-white whitespace-nowrap text-xs">
                      £{stats.balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 font-mono font-bold text-right text-white whitespace-nowrap text-xs">
                      {stats.bets}
                    </td>
                    <td className="px-6 py-3 font-mono font-bold text-right text-white whitespace-nowrap text-xs">
                      £{stats.staked.toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-3 font-mono font-bold text-right whitespace-nowrap text-xs ${
                        stats.profitLoss >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {stats.profitLoss >= 0 ? "+£" : "-£"}
                      {Math.abs(stats.profitLoss).toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-3 font-mono font-bold text-right whitespace-nowrap text-xs ${
                        stats.stakeRoi !== null
                          ? stats.stakeRoi >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                          : "text-slate-500"
                      }`}
                    >
                      {stats.stakeRoi !== null
                        ? `${stats.stakeRoi >= 0 ? "+" : ""}${stats.stakeRoi.toFixed(
                            1,
                          )}%`
                        : "—"}
                    </td>
                    <td
                      className={`px-6 py-3 font-mono font-bold text-right whitespace-nowrap text-xs ${
                        stats.ret !== null
                          ? stats.ret >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                          : "text-slate-500"
                      }`}
                    >
                      {stats.ret !== null
                        ? `${stats.ret >= 0 ? "+" : ""}${stats.ret.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-950/50">
                  <td className="px-6 py-3 text-[13px] font-extrabold text-white whitespace-nowrap">
                    Total
                  </td>
                  <td className="px-6 py-3 text-[13px] font-extrabold text-white font-mono text-right whitespace-nowrap">
                    £{totalStats.netDeposits.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-[13px] font-extrabold text-white font-mono text-right whitespace-nowrap">
                    £{totalStats.balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-[13px] font-extrabold text-white font-mono text-right whitespace-nowrap">
                    {totalStats.bets}
                  </td>
                  <td className="px-6 py-3 text-[13px] font-extrabold text-white font-mono text-right whitespace-nowrap">
                    £{totalStats.staked.toFixed(2)}
                  </td>
                  <td
                    className={`px-6 py-3 text-[13px] font-extrabold font-mono text-right whitespace-nowrap ${
                      totalStats.profitLoss >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {totalStats.profitLoss >= 0 ? "+£" : "-£"}
                    {Math.abs(totalStats.profitLoss).toFixed(2)}
                  </td>
                  <td
                    className={`px-6 py-3 text-[13px] font-extrabold font-mono text-right whitespace-nowrap ${
                      totalStats.stakeRoi !== null
                        ? totalStats.stakeRoi >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                        : "text-slate-500"
                    }`}
                  >
                    {totalStats.stakeRoi !== null
                      ? `${
                          totalStats.stakeRoi >= 0 ? "+" : ""
                        }${totalStats.stakeRoi.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td
                    className={`px-6 py-3 text-[13px] font-extrabold font-mono text-right whitespace-nowrap ${
                      totalStats.ret !== null
                        ? totalStats.ret >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                        : "text-slate-500"
                    }`}
                  >
                    {totalStats.ret !== null
                      ? `${totalStats.ret >= 0 ? "+" : ""}${totalStats.ret.toFixed(
                          1,
                        )}%`
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sparkline Chart */}
          <div className="flex-1 p-4 min-h-[100px] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Balance
                </p>
                <p className="text-[18px] font-extrabold text-white">
                  £{totalStats.balance.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Profit / Loss
                </p>
                <p
                  className={`text-[18px] font-extrabold ${isPositivePL ? "text-emerald-400" : "text-red-400"}`}
                >
                  {isPositivePL ? "+£" : "-£"}
                  {Math.abs(totalStats.profitLoss).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid display="none" />
                  <XAxis dataKey="betNum" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorBal)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                Bet #1
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                Bet #{chartData.length}
              </span>
            </div>
          </div>
        </div>

        {/* Add Transaction Form */}
        <div className="w-full lg:w-[280px] flex-shrink-0">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-4 shadow-lg h-full flex flex-col">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-blue-400" />
              New Transaction
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Exchange
                </label>
                <div className="flex gap-2">
                  {(["matchbook", "smarkets"] as const).map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setNewTx({ ...newTx, exchange: ex })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                        newTx.exchange === ex
                          ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/20"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Transaction Type
                </label>
                <select
                  value={newTx.type}
                  onChange={(e) =>
                    setNewTx({ ...newTx, type: e.target.value as any })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Amount (£)
                </label>
                <input
                  type="number"
                  value={newTx.amount}
                  placeholder="0.00"
                  onChange={(e) =>
                    setNewTx({ ...newTx, amount: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                onClick={handleAddTx}
                disabled={
                  isAdding || !newTx.amount || parseFloat(newTx.amount) <= 0
                }
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Apply Transaction"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Table - Full Width */}
      <div className="w-full space-y-6 font-sans">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/20">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Transaction History
            </h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={exchangeFilter}
                  onChange={(e) => {
                    setExchangeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8 min-w-[130px]"
                >
                  <option>All Exchanges</option>
                  <option>Matchbook</option>
                  <option>Smarkets</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8 min-w-[130px]"
                >
                  <option>All Types</option>
                  <option>Deposit</option>
                  <option>Withdrawal</option>
                  <option>Bet Placed</option>
                  <option>Bet Win</option>
                  <option>Bet Loss</option>
                  <option>Bet Void</option>
                  <option>Adjustment</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
              <div className="relative flex-1 sm:flex-none">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value === "all")
                      exportTransactionsToCSV(transactions);
                    if (e.target.value === "filtered")
                      exportTransactionsToCSV(sortedTransactions);
                    e.target.value = "";
                  }}
                  className="font-sans bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-400 outline-none appearance-none cursor-pointer pr-8 min-w-[115px] transition-all shadow-lg shadow-emerald-900/20"
                >
                  <option
                    value=""
                    disabled
                    className="font-sans bg-slate-900 text-slate-400"
                  >
                    Export
                  </option>
                  <option
                    value="all"
                    className="font-sans bg-slate-900 text-white"
                  >
                    Export All
                  </option>
                  <option
                    value="filtered"
                    className="font-sans bg-slate-900 text-white"
                  >
                    Export Filtered
                  </option>
                </select>
                <Download className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-white pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase tracking-wider bg-slate-800/50 font-bold">
                  <th className="px-6 py-3 whitespace-nowrap">Date & Time</th>
                  <th className="px-6 py-3 whitespace-nowrap">Exchange</th>
                  <th className="px-6 py-3 whitespace-nowrap">Type</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap min-w-[90px] pr-6">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-300">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-600 italic"
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t) => {
                    const isZero = Math.abs(t.amount) < 0.005;
                    const isPositive = t.amount > 0;
                    const typeColor =
                      t.type === "deposit"
                        ? "text-blue-400"
                        : t.type === "withdrawal"
                          ? "text-amber-400"
                          : t.type === "bet_win"
                            ? "text-emerald-400"
                            : t.type === "bet_loss"
                              ? "text-red-400"
                              : "text-slate-400";

                    return (
                      <tr
                        key={t.id}
                        className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          <span className="text-slate-300">
                            {new Date(t.timestamp).toLocaleDateString("en-GB")}
                          </span>
                          <div className="text-[10px]">
                            {new Date(t.timestamp).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium uppercase text-[10px] whitespace-nowrap">
                          {t.exchange}
                        </td>
                        <td
                          className={`px-6 py-4 font-bold uppercase text-[10px] ${typeColor} whitespace-nowrap`}
                        >
                          {t.type.replace("_", " ")}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-mono font-bold text-sm ${
                            isZero
                              ? "text-slate-500"
                              : isPositive
                                ? "text-emerald-400"
                                : "text-red-400"
                          } whitespace-nowrap min-w-[90px] pr-6`}
                        >
                          {isZero ? "" : isPositive ? "+" : "-"}£
                          {Math.abs(t.amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {sortedTransactions.length > 0 && (
            <div className="flex items-center justify-between bg-slate-800/20 border-t border-slate-800 px-6 py-3">
              <div className="text-xs text-slate-500 font-sans">
                Showing{" "}
                <span className="font-bold text-slate-300">
                  {Math.min(
                    (page - 1) * ITEMS_PER_PAGE + 1,
                    sortedTransactions.length,
                  )}
                  -{Math.min(page * ITEMS_PER_PAGE, sortedTransactions.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-300">
                  {sortedTransactions.length}
                </span>{" "}
                transactions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
