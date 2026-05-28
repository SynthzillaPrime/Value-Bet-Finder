import React from "react";
import {
  BankrollTransaction,
  ExchangeBankroll,
  TrackedBet,
} from "../../types";

interface MobileBankrollProps {
  transactions: BankrollTransaction[];
  exchangeBankrolls: ExchangeBankroll;
  trackedBets: TrackedBet[];
}

export const MobileBankroll: React.FC<MobileBankrollProps> = ({
  transactions,
  exchangeBankrolls,
}) => {
  const exchanges: ("matchbook" | "smarkets")[] = ["matchbook", "smarkets"];

  const exchangeStats = exchanges.map((ex) => {
    const exTransactions = transactions.filter((t) => t.exchange === ex);

    const netDeposits = exTransactions
      .filter((t) => ["deposit", "withdrawal", "adjustment"].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = exchangeBankrolls[ex];

    const betsCount = exTransactions.filter((t) => t.type === "bet_placed")
      .length;

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

    const roi = staked > 0 ? (profitLoss / staked) * 100 : null;

    return {
      key: ex,
      name: ex.charAt(0).toUpperCase() + ex.slice(1),
      label: ex === "matchbook" ? "Primary" : "Secondary",
      netDeposits,
      balance,
      betsCount,
      staked,
      profitLoss,
      roi,
    };
  });

  const totalBalance = exchangeStats.reduce((sum, s) => sum + s.balance, 0);
  const totalPL = exchangeStats.reduce((sum, s) => sum + s.profitLoss, 0);
  const totalDeposits = exchangeStats.reduce(
    (sum, s) => sum + s.netDeposits,
    0,
  );
  const totalStaked = exchangeStats.reduce((sum, s) => sum + s.staked, 0);
  const totalROI = totalStaked > 0 ? (totalPL / totalStaked) * 100 : null;

  const formatPL = (val: number) => {
    const color = val >= 0 ? "text-emerald-400" : "text-red-400";
    const prefix = val >= 0 ? "+" : "-";
    return (
      <span className={`${color} tabular-nums`}>
        {prefix}£{Math.abs(val).toFixed(2)}
      </span>
    );
  };

  const formatROI = (val: number | null) => {
    if (val === null) return <span className="text-slate-500">N/A</span>;
    const color = val >= 0 ? "text-emerald-400" : "text-red-400";
    return (
      <span className={`${color} tabular-nums`}>
        {val >= 0 ? "+" : ""}
        {val.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <h1 className="text-[17px] font-bold px-5 pt-4 pb-3 text-white">
        Bankroll
      </h1>

      <div className="px-4 space-y-3 pb-24">
        {/* Total Summary Card */}
        <div className="rounded-2xl bg-slate-900/60 border border-emerald-500/20 overflow-hidden p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                Total Balance
              </span>
              <span className="text-[28px] font-bold text-white tabular-nums">
                £{totalBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                Total P/L
              </span>
              <span className="text-[28px] font-bold tabular-nums">
                {formatPL(totalPL)}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-3 grid grid-cols-3 gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Deposited
              </span>
              <span className="text-[14px] font-bold text-slate-200 tabular-nums">
                £{totalDeposits.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Staked
              </span>
              <span className="text-[14px] font-bold text-slate-200 tabular-nums">
                £{totalStaked.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                ROI
              </span>
              <span className="text-[14px] font-bold tabular-nums">
                {formatROI(totalROI)}
              </span>
            </div>
          </div>
        </div>

        {/* Exchange Cards */}
        {exchangeStats.map((stat) => (
          <div
            key={stat.key}
            className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800/40">
              <span className="text-[13px] font-bold text-slate-200">
                {stat.name}
              </span>
              <span className="text-slate-500 text-[10px] uppercase tracking-tighter">
                {stat.label}
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  Balance
                </span>
                <span className="text-[16px] font-bold text-white tabular-nums">
                  £{stat.balance.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  P/L
                </span>
                <span className="text-[16px] font-bold tabular-nums">
                  {formatPL(stat.profitLoss)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  Bets
                </span>
                <span className="text-[14px] font-bold text-slate-300 tabular-nums">
                  {stat.betsCount}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  ROI
                </span>
                <span className="text-[14px] font-bold tabular-nums">
                  {formatROI(stat.roi)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Desktop Nudge */}
        <div className="mx-4 mt-4 p-4 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center">
          <span className="text-slate-500 text-[12px]">
            Transaction history and deposits available on desktop
          </span>
        </div>
      </div>
    </div>
  );
};
