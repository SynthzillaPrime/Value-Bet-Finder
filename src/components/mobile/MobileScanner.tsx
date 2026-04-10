import React from "react";
import { TrackedBet, BetEdge } from "../../types";
import { LEAGUES } from "../../constants";

interface MobileScannerProps {
  bets: BetEdge[];
  trackedBets: TrackedBet[];
  bankroll: number;
  // Props accepted but unused in this visual prompt to match App.tsx requirements
  expandedBetId: string | null;
  setExpandedBetId: (id: string | null) => void;
  localSelectedExchangeKey: string | null;
  setLocalSelectedExchangeKey: (key: string | null) => void;
  isTracking: boolean;
  customCommission: string;
  setCustomCommission: (val: string) => void;
  handleCommissionSelect: (bet: BetEdge, commission: number) => void;
}

export const MobileScanner: React.FC<MobileScannerProps> = ({
  bets,
  trackedBets,
  bankroll,
  expandedBetId: _expandedBetId,
  setExpandedBetId: _setExpandedBetId,
  localSelectedExchangeKey: _localSelectedExchangeKey,
  setLocalSelectedExchangeKey,
  isTracking,
  customCommission: _customCommission,
  setCustomCommission: _setCustomCommission,
  handleCommissionSelect,
}) => {
  // 6. Skip already-tracked bets
  const activeBets = bets.filter(
    (bet) => !trackedBets.some((tb) => tb.id === bet.id),
  );

  // 7. Empty state
  if (activeBets.length === 0) {
    return (
      <div className="px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-800/50">
          <p className="text-slate-500 font-medium">
            No value bets — run a scan to find some.
          </p>
        </div>
      </div>
    );
  }

  const formatKickoff = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d = new Date(date);
    const day = days[d.getDay()];
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${hours}:${mins}`;
  };

  return (
    <div className="space-y-3 px-4 pb-24">
      {activeBets.map((bet) => (
        <div
          key={bet.id}
          className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Header section */}
          <div className="px-4 py-3.5 border-b border-slate-800/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                {LEAGUES.find((l) => l.key === bet.sportKey)?.name ||
                  bet.sportKey}
              </span>
              <span className="text-xs tabular-nums text-slate-500 font-medium">
                {formatKickoff(bet.kickoff)}
              </span>
            </div>
            <div className="text-white font-semibold text-base truncate">
              {bet.homeTeam} vs {bet.awayTeam}
            </div>
          </div>

          {/* Selection section */}
          <div className="px-4 py-3.5 flex justify-between items-center border-b border-slate-800/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Selection
              </span>
              <span className="text-white font-medium">{bet.selection}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                True Odds
              </span>
              <span className="text-white tabular-nums font-medium">
                {bet.fairPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Exchange rows section */}
          <div className="flex flex-col">
            {bet.offers.map((offer, idx) => {
              const isBest = idx === 0;
              const stake =
                Math.max(0, bankroll) * (offer.kellyPercent / 100) * 0.3;

              return (
                <div
                  key={offer.exchangeKey}
                  className={`relative flex items-center px-4 py-3 border-b border-slate-800/30 last:border-b-0 ${
                    isBest ? "bg-emerald-500/5" : ""
                  }`}
                >
                  {/* Accent bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isBest ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  />

                  <div className="flex-1">
                    <div
                      className={`text-sm font-semibold ${
                        isBest ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {offer.exchangeName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      2% commission
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-end min-w-[44px]">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          isBest ? "text-white" : "text-slate-300"
                        }`}
                      >
                        {offer.price.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                        Odds
                      </span>
                    </div>
                    <div className="flex flex-col items-end min-w-[44px]">
                      <span className="text-sm font-bold tabular-nums text-emerald-400">
                        +{offer.netEdgePercent.toFixed(1)}%
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                        Edge
                      </span>
                    </div>
                    <div className="flex flex-col items-end min-w-[54px]">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          isBest ? "text-white" : "text-slate-300"
                        }`}
                      >
                        £{stake.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                        Stake
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action section */}
          <div className="p-4">
            <button
              disabled={isTracking}
              onClick={() => {
                if (isTracking) return;
                const bestOffer = bet.offers[0];
                if (!bestOffer) return;
                setLocalSelectedExchangeKey(bestOffer.exchangeKey);
                handleCommissionSelect(bet, 2);
              }}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
            >
              {isTracking ? "Tracking..." : "Track Bet"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
