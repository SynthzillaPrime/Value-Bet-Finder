import React, { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { TrackedBet, BetEdge, ExchangeOffer } from "../types";
import { LEAGUES } from "../constants";

interface ScannerTableProps {
  bets: BetEdge[];
  trackedBets: TrackedBet[];
  bankroll: number;
  expandedBetId: string | null;
  setExpandedBetId: (id: string | null) => void;
  localSelectedExchangeKey: string | null;
  setLocalSelectedExchangeKey: (key: string | null) => void;
  isTracking: boolean;
  customCommission: string;
  setCustomCommission: (val: string) => void;
  handleCommissionSelect: (bet: BetEdge, commission: number) => void;
}

export const ScannerTable: React.FC<ScannerTableProps> = ({
  bets,
  trackedBets,
  bankroll,
  expandedBetId,
  setExpandedBetId,
  localSelectedExchangeKey,
  setLocalSelectedExchangeKey,
  isTracking,
  customCommission,
  setCustomCommission,
  handleCommissionSelect,
}) => {
  const expandRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (expandedBetId && expandRef.current) {
      setTimeout(() => {
        expandRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 50);
    }
  }, [expandedBetId]);

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-slate-500">
              <th className="px-6 py-3 border-b border-slate-800/50">Match</th>
              <th className="px-6 py-3 border-b border-slate-800/50">
                Selection
              </th>
              <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                True Odds
              </th>
              <th className="px-6 py-3 border-b border-slate-800/50">
                Exchange
              </th>
              <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                Odds
              </th>
              <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                Edge
              </th>
              <th className="px-6 py-3 border-b border-slate-800/50 text-right">
                Stake
              </th>
              <th className="px-6 py-3 border-b border-slate-800/50 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet, index) => {
              const isTracked = trackedBets.some((tb) => tb.id === bet.id);
              const isExpanded = expandedBetId === bet.id;
              const activeOffer =
                isExpanded && localSelectedExchangeKey
                  ? bet.offers.find(
                      (o: ExchangeOffer) =>
                        o.exchangeKey === localSelectedExchangeKey,
                    ) || bet.offers[0]
                  : bet.offers[0];

              const mainOffer = bet.offers[0];
              // Applied "Kelly Staking" fix (removed 30% from label/logic handled in App.tsx or here as requested)
              // The prompt asked to remove "30% Kelly Staking" from the SummaryStats card.
              // For the stake calculation here, we keep the logic from App.tsx.
              const kellyStake =
                Math.max(0, bankroll) * (activeOffer.kellyPercent / 100) * 0.3;
              const formattedDate =
                bet.kickoff.toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                }) +
                ", " +
                bet.kickoff.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

              return (
                <React.Fragment key={bet.id}>
                  {/* Primary Row */}
                  <tr
                    className={`group hover:bg-slate-800/30 transition-colors ${
                      index !== 0 ? "border-t border-slate-800/50" : ""
                    }`}
                  >
                    <td className="px-6 py-3.5" rowSpan={bet.offers.length}>
                      <div className="font-medium text-slate-200">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {LEAGUES.find((l) => l.key === bet.sportKey)?.name ||
                            bet.sport}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formattedDate}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5" rowSpan={bet.offers.length}>
                      <div className="text-[15px] font-extrabold text-white">
                        {bet.selection}
                      </div>
                    </td>
                    <td
                      className="px-6 py-3.5 text-right"
                      rowSpan={bet.offers.length}
                    >
                      <div className="font-semibold text-slate-500">
                        {bet.fairPrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-300">
                        {mainOffer.exchangeName}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="font-bold text-white tabular-nums">
                        {mainOffer.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="font-bold text-emerald-400">
                        {mainOffer.netEdgePercent > 0 ? "+" : ""}
                        {mainOffer.netEdgePercent.toFixed(1)}%
                      </div>
                    </td>
                    <td
                      className="px-6 py-3.5 text-right"
                      rowSpan={bet.offers.length}
                    >
                      <div className="font-extrabold text-white">
                        £{kellyStake.toFixed(2)}
                      </div>
                    </td>
                    <td
                      className="px-6 py-3.5 text-center"
                      rowSpan={bet.offers.length}
                    >
                      {isTracked ? (
                        <span className="text-slate-600 text-sm font-medium">
                          Tracked
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (expandedBetId === bet.id) {
                              setExpandedBetId(null);
                            } else {
                              setExpandedBetId(bet.id);
                              setLocalSelectedExchangeKey(
                                mainOffer.exchangeKey,
                              );
                            }
                          }}
                          className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-colors shadow-lg ${
                            expandedBetId === bet.id
                              ? "bg-slate-700 text-slate-300 shadow-none"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                          }`}
                        >
                          {expandedBetId === bet.id ? "Cancel" : "Track Bet"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Sub-rows for additional offers */}
                  {bet.offers.slice(1).map((offer: ExchangeOffer) => (
                    <tr
                      key={offer.exchangeKey}
                      className="group hover:bg-slate-800/30 transition-colors border-none"
                    >
                      <td className="px-6 py-1.5">
                        <div className="font-normal text-slate-500">
                          {offer.exchangeName}
                        </div>
                      </td>
                      <td className="px-6 py-1.5 text-right">
                        <div className="font-semibold text-slate-500 tabular-nums">
                          {offer.price.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-1.5 text-right">
                        <div className="font-medium text-slate-500">
                          {offer.netEdgePercent > 0 ? "+" : ""}
                          {offer.netEdgePercent.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Expansion Row for Commission Picker */}
                  {expandedBetId === bet.id && (
                    <tr
                      ref={expandRef}
                      className="bg-slate-950/50 border-t border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <td colSpan={8} className="px-6 py-4">
                        <div className="flex items-center justify-end gap-6">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
                              Commission:
                            </span>
                            <div className="flex gap-2">
                              <button
                                disabled={isTracking}
                                onClick={() => handleCommissionSelect(bet, 0)}
                                className="px-3 py-1 text-xs font-bold rounded-md bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                              >
                                0%
                              </button>
                              <button
                                disabled={isTracking}
                                onClick={() => handleCommissionSelect(bet, 2)}
                                className="px-3 py-1 text-xs font-bold rounded-md bg-amber-900/30 text-amber-400 border border-amber-500/30 hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                              >
                                2%
                              </button>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={isTracking}
                                  value={customCommission}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (
                                      val === "" ||
                                      /^\d*\.?\d{0,2}$/.test(val)
                                    ) {
                                      setCustomCommission(val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleCommissionSelect(
                                        bet,
                                        parseFloat(customCommission),
                                      );
                                      return;
                                    }

                                    // Allow control keys
                                    const allowedKeys = [
                                      "Backspace",
                                      "Delete",
                                      "Tab",
                                      "Escape",
                                      "Enter",
                                      "ArrowLeft",
                                      "ArrowRight",
                                      "ArrowUp",
                                      "ArrowDown",
                                      ".",
                                    ];
                                    if (
                                      !allowedKeys.includes(e.key) &&
                                      !/^\d$/.test(e.key)
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onBlur={() => {
                                    if (customCommission)
                                      handleCommissionSelect(
                                        bet,
                                        parseFloat(customCommission),
                                      );
                                  }}
                                  placeholder="Custom %"
                                  className="w-20 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="w-px h-6 bg-slate-800" />

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
                              Exchange:
                            </span>
                            <div className="flex gap-2">
                              {bet.offers.map((offer: ExchangeOffer) => (
                                <button
                                  key={offer.exchangeKey}
                                  disabled={isTracking}
                                  onClick={() =>
                                    setLocalSelectedExchangeKey(
                                      offer.exchangeKey,
                                    )
                                  }
                                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors border ${
                                    localSelectedExchangeKey ===
                                    offer.exchangeKey
                                      ? "bg-blue-600 border-blue-500 text-white"
                                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                                  }`}
                                >
                                  {offer.exchangeName}
                                </button>
                              ))}
                            </div>
                          </div>

                          {isTracking ? (
                            <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Tracking...
                            </div>
                          ) : (
                            <button
                              onClick={() => setExpandedBetId(null)}
                              className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
