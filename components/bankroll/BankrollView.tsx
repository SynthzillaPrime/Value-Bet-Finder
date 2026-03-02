import React, { useState } from "react";
import { ArrowUpCircle, History, ChevronDown, Download } from "lucide-react";
import { BankrollTransaction, ExchangeBankroll } from "../../types";

interface Props {
  transactions: BankrollTransaction[];
  exchangeBankrolls: ExchangeBankroll;
  onAddTransaction: (tx: BankrollTransaction) => void;
}

export const BankrollView: React.FC<Props> = ({
  transactions,
  exchangeBankrolls,
  onAddTransaction,
}) => {
  const [newTx, setNewTx] = useState<{
    exchange: "matchbook" | "smarkets";
    type: "deposit" | "withdrawal" | "adjustment";
    amount: string;
    note: string;
  }>({
    exchange: "matchbook",
    type: "deposit",
    amount: "",
    note: "",
  });

  const [typeFilter, setTypeFilter] = useState("All Types");
  const [exchangeFilter, setExchangeFilter] = useState("All Exchanges");

  const totalBalance = exchangeBankrolls.matchbook + exchangeBankrolls.smarkets;

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
      const matchType =
        typeFilter === "All Types" ||
        t.type.replace("_", " ").toLowerCase() === typeFilter.toLowerCase();
      const matchExchange =
        exchangeFilter === "All Exchanges" ||
        t.exchange.toLowerCase() === exchangeFilter.toLowerCase();
      return matchType && matchExchange;
    });

  // Calculate Matchbook statistics
  const deposits = transactions
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + t.amount, 0);
  const withdrawals = Math.abs(
    transactions
      .filter((t) => t.type === "withdrawal")
      .reduce((sum, t) => sum + t.amount, 0),
  );
  const adjustments = transactions
    .filter((t) => t.type === "adjustment")
    .reduce((sum, t) => sum + t.amount, 0);
  const pl = transactions
    .filter((t) => ["bet_win", "bet_loss", "bet_void"].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Summary */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-tighter">
              Matchbook Balance
            </span>
            <span className="text-lg font-mono font-bold text-white">
              £{exchangeBankrolls.matchbook.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-tighter">
              Smarkets Balance
            </span>
            <span className="text-lg font-mono font-bold text-white">
              £{exchangeBankrolls.smarkets.toFixed(2)}
            </span>
          </div>
          <div className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-xl shadow-lg shadow-blue-900/10">
            <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1 tracking-tighter">
              Total Bankroll
            </span>
            <span className="text-lg font-mono font-bold text-white">
              £{totalBalance.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-tighter">
              Total Deposits
            </span>
            <span className="text-lg font-mono font-bold text-white">
              £{deposits.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-tighter">
              Total Withdrawals
            </span>
            <span className="text-lg font-mono font-bold text-white">
              £{withdrawals.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-tighter">
              Total Adjustments
            </span>
            <span className="text-lg font-mono font-bold text-white">
              £{adjustments.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-tighter">
              Total Profit/Loss
            </span>
            <span
              className={`text-lg font-mono font-bold ${pl >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {pl >= 0 ? "+" : "-"}£{Math.abs(pl).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Transaction Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-lg">
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600 transition-all"
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

        {/* Transaction History Table */}
        <div className="lg:col-span-2 space-y-6">
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
                    onChange={(e) => setExchangeFilter(e.target.value)}
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
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8 min-w-[130px]"
                  >
                    <option>All Types</option>
                    <option>Deposit</option>
                    <option>Withdrawal</option>
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
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer pr-8 min-w-[120px]"
                  >
                    <option value="" disabled>
                      Export...
                    </option>
                    <option value="all">Export All</option>
                    <option value="filtered">Export Filtered</option>
                  </select>
                  <Download className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase tracking-wider bg-slate-800/10">
                    <th className="px-6 py-3 font-medium">Date & Time</th>
                    <th className="px-6 py-3 font-medium">Exchange</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Note</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-300">
                  {sortedTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-600 italic"
                      >
                        No transactions found.
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
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                            <span className="text-slate-300">
                              {new Date(t.timestamp).toLocaleDateString(
                                "en-GB",
                              )}
                            </span>
                            <div className="text-[10px]">
                              {new Date(t.timestamp).toLocaleTimeString(
                                "en-GB",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                },
                              )}
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
                          <td className="px-6 py-4 text-slate-400 italic max-w-xs truncate">
                            {t.note || "-"}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-mono font-bold text-sm ${isPositive ? "text-emerald-400" : "text-red-400"} whitespace-nowrap`}
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
