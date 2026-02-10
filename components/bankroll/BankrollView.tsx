import React, { useState } from "react";
import { BankrollTransaction, ExchangeBankroll } from "../../types";
import {
  Wallet,
  ArrowUpCircle,
  History,
  ChevronDown,
  Download,
} from "lucide-react";

interface Props {
  transactions: BankrollTransaction[];
  exchangeBankrolls: ExchangeBankroll;
  onAddTransaction: (t: BankrollTransaction) => void;
}

export const BankrollView: React.FC<Props> = ({
  transactions,
  exchangeBankrolls,
  onAddTransaction,
}) => {
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

  const [exFilter, setExFilter] = useState("All Exchanges");
  const [typeFilter, setTypeFilter] = useState("All Types");

  const totalBalance =
    exchangeBankrolls.smarkets +
    exchangeBankrolls.matchbook +
    exchangeBankrolls.betfair;

  const exportTransactionsToCSV = (
    targetTxs: BankrollTransaction[] = transactions,
  ) => {
    const headers = ["Date", "Time", "Exchange", "Type", "Amount"];
    const rows = targetTxs.map((t) => [
      new Date(t.timestamp).toLocaleDateString(),
      `"${new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}"`,
      t.exchange,
      t.type.replace("_", " "),
      t.amount.toFixed(2),
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

  const handleAddTx = () => {
    const amount = parseFloat(newTx.amount);
    if (isNaN(amount) || amount === 0) return;

    onAddTransaction({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      exchange: newTx.exchange,
      type: newTx.type,
      amount: newTx.type === "withdrawal" ? -Math.abs(amount) : amount,
      note: newTx.note,
    });

    setNewTx({ ...newTx, amount: "", note: "" });
  };

  const sortedTransactions = [...transactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((t) => {
      const matchEx =
        exFilter === "All Exchanges" || t.exchange === exFilter.toLowerCase();
      const matchType =
        typeFilter === "All Types" ||
        t.type.replace("_", " ").toLowerCase() === typeFilter.toLowerCase();
      return matchEx && matchType;
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Total */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-500" />
            Bankroll Management
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Track deposits, withdrawals, and exchange balances.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Total Combined Balance
          </span>
          <span className="text-3xl font-mono font-bold text-emerald-400">
            £{totalBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Exchange Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["smarkets", "matchbook", "betfair"] as const).map((ex) => {
          const exTxs = transactions.filter((t) => t.exchange === ex);
          const deposits = exTxs
            .filter((t) => t.type === "deposit")
            .reduce((sum, t) => sum + t.amount, 0);
          const withdrawals = Math.abs(
            exTxs
              .filter((t) => t.type === "withdrawal")
              .reduce((sum, t) => sum + t.amount, 0),
          );
          const adjustments = exTxs
            .filter((t) => t.type === "adjustment")
            .reduce((sum, t) => sum + t.amount, 0);
          const pl = exTxs
            .filter((t) => ["bet_win", "bet_loss", "bet_void"].includes(t.type))
            .reduce((sum, t) => sum + t.amount, 0);

          return (
            <div
              key={ex}
              className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl space-y-3 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">
                {ex}
              </h3>
              <p className="text-2xl font-mono font-bold text-slate-100">
                £{exchangeBankrolls[ex].toFixed(2)}
              </p>
              <div className="space-y-1 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Deposits:</span>
                  <span className="text-xs font-mono text-slate-200">
                    £{deposits.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Withdrawals:</span>
                  <span className="text-xs font-mono text-slate-200">
                    £{withdrawals.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Adjustments:</span>
                  <span className="text-xs font-mono text-slate-200">
                    £{adjustments.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">P/L:</span>
                  <span
                    className={`text-xs font-mono font-bold ${pl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {pl >= 0 ? "+" : "-"}£{Math.abs(pl).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-blue-400" />
              New Transaction
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Exchange
                </label>
                <select
                  value={newTx.exchange}
                  onChange={(e) =>
                    setNewTx({ ...newTx, exchange: e.target.value as any })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="smarkets">Smarkets</option>
                  <option value="matchbook">Matchbook</option>
                  <option value="betfair">Betfair</option>
                </select>
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={newTx.note}
                  placeholder="e.g. Initial funding"
                  maxLength={50}
                  onChange={(e) => setNewTx({ ...newTx, note: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                onClick={handleAddTx}
                disabled={!newTx.amount || parseFloat(newTx.amount) <= 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
              >
                Apply Transaction
              </button>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Transaction History
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={exFilter}
                    onChange={(e) => setExFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8 min-w-[180px]"
                  >
                    <option>All Exchanges</option>
                    <option>Smarkets</option>
                    <option>Matchbook</option>
                    <option>Betfair</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8 min-w-[180px]"
                  >
                    <option>All Types</option>
                    <option>Deposit</option>
                    <option>Withdrawal</option>
                    <option>Bet Win</option>
                    <option>Bet Loss</option>
                    <option>Bet Void</option>
                    <option>Adjustment</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8 min-w-[180px]"
                  >
                    <option value="" disabled>
                      Export...
                    </option>
                    <option value="all">Export All Transactions</option>
                    <option value="filtered">
                      Export Filtered Transactions
                    </option>
                  </select>
                  <Download className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Exchange</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-300">
                  {sortedTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-600 italic"
                      >
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    sortedTransactions.map((t) => {
                      const isPositive = t.amount >= 0;
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
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(t.timestamp).toLocaleDateString()}
                            <div className="text-[10px]">
                              {new Date(t.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold uppercase tracking-tight text-slate-400">
                            {t.exchange}
                          </td>
                          <td
                            className={`px-6 py-4 font-bold uppercase text-[10px] ${typeColor}`}
                          >
                            {t.type.replace("_", " ")}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-mono font-bold text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {isPositive ? "+" : "-"}£
                            {Math.abs(t.amount).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
