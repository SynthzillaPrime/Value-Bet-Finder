import React, { useState } from "react";
import { BetEdge, ExchangeBankroll } from "../types";
import { Clock, Check, RefreshCw } from "lucide-react";

interface Props {
  bet: BetEdge;
  onTrack: (
    bet: BetEdge,
    commission: number,
    selectedExchange: string,
  ) => Promise<void>;
  isTracked: boolean;
  bankroll: number;
  exchangeBankrolls?: ExchangeBankroll;
}

export const BetCard: React.FC<Props> = ({
  bet,
  onTrack,
  isTracked,
  bankroll,
  exchangeBankrolls,
}) => {
  const [showCommissionPicker, setShowCommissionPicker] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedExchangeKey, setSelectedExchangeKey] = useState(
    bet.bestExchange,
  );

  const selectedOffer =
    bet.offers.find((o) => o.exchangeKey === selectedExchangeKey) ||
    bet.offers[0];
  const kellyStake =
    Math.max(0, bankroll) * (selectedOffer.kellyPercent / 100) * 0.3;
  const [customCommission, setCustomCommission] = useState("");

  const borderColor = "border-slate-800";
  const bgGradient = "bg-slate-900";

  // Format date: "Sat 01 Feb, 15:00"
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

  const handleTrackClick = () => {
    setShowCommissionPicker(true);
  };

  const handleCommissionSelect = async (commission: number) => {
    setIsTracking(true);
    try {
      await onTrack(bet, commission, selectedExchangeKey);
      setShowCommissionPicker(false);
    } catch (error) {
      console.error("Tracking failed:", error);
    } finally {
      setIsTracking(false);
    }
  };

  const handleCustomSubmit = () => {
    if (isTracking) return;
    const val = parseFloat(customCommission);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      handleCommissionSelect(val);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (isTracking) return;
    if (e.key === "Enter") handleCustomSubmit();
    if (e.key === "Escape") {
      setShowCommissionPicker(false);
      setCustomCommission("");
    }
  };

  return (
    <div
      className={`${bgGradient} border ${borderColor} rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all duration-200 relative overflow-hidden group flex flex-col`}
    >
      {/* Top Row: League & Time */}
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-800 px-2 py-1 rounded border border-slate-700">
          {bet.sport}
        </span>
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <Clock className="w-3 h-3" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Matchup */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white leading-tight group-hover:text-blue-300 transition-colors">
          {bet.homeTeam}
        </h3>
        <p className="text-xs text-slate-500 my-0.5">vs</p>
        <h3 className="text-lg font-bold text-white leading-tight group-hover:text-blue-300 transition-colors">
          {bet.awayTeam}
        </h3>
      </div>

      {/* Header Info */}
      <div className="flex justify-between items-center mb-3 px-1">
        <div>
          <span className="text-xs text-slate-400 block mb-0.5">Selection</span>
          <span className="text-sm font-bold text-white bg-slate-800 px-2 py-1 rounded border border-slate-700">
            {bet.selection}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block mb-0.5">True Odds</span>
          <span className="text-sm font-bold text-slate-300 font-mono">
            {bet.fairPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Exchange Comparison Table */}
      <div className="bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden mb-4">
        <div className="grid grid-cols-12 bg-slate-900/50 py-1.5 px-3 border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          <div className="col-span-5">Exchange</div>
          <div className="col-span-3 text-right">Odds</div>
          <div className="col-span-4 text-right">Net Edge</div>
        </div>
        <div className="flex flex-col">
          {bet.offers &&
            bet.offers.map((offer, idx) => {
              const isBest = idx === 0;
              return (
                <div
                  key={offer.exchangeKey}
                  className={`grid grid-cols-12 py-2 px-3 items-center ${isBest ? "bg-emerald-500/5" : ""}`}
                >
                  <div className="col-span-5 flex items-center gap-1.5">
                    {isBest && <Check className="w-3 h-3 text-emerald-500" />}
                    <span
                      className={`text-xs ${isBest ? "text-white font-medium" : "text-slate-400 ml-4.5"}`}
                    >
                      {offer.exchangeName}
                    </span>
                  </div>
                  <div className="col-span-3 text-right font-mono text-sm text-slate-300">
                    {offer.price.toFixed(2)}
                  </div>
                  <div className="col-span-4 text-right flex items-center justify-end gap-2">
                    <span
                      className={`text-sm font-bold ${offer.netEdgePercent > 0 ? "text-emerald-400" : "text-slate-500"}`}
                    >
                      {offer.netEdgePercent > 0 ? "+" : ""}
                      {offer.netEdgePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          {/* Fallback if offers array is missing (legacy data) */}
          {!bet.offers && (
            <div className="grid grid-cols-12 py-2 px-3 items-center bg-emerald-500/5">
              <div className="col-span-5 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-xs text-white font-medium ml-1">
                  {bet.exchangeName}
                </span>
              </div>
              <div className="col-span-3 text-right font-mono text-sm text-slate-300">
                {bet.exchangePrice.toFixed(2)}
              </div>
              <div className="col-span-4 text-right">
                <span className="text-sm font-bold text-emerald-400">
                  {bet.netEdgePercent > 0 ? "+" : ""}
                  {bet.netEdgePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stake Info */}
      <div className="mb-4 px-1 flex justify-between items-end">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
            Suggested Stake
          </span>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">
              £{kellyStake.toFixed(2)}
            </span>
            <div className="flex flex-col gap-0.5">
              {exchangeBankrolls && (
                <span className="text-[10px] text-slate-400 italic">
                  {selectedOffer.exchangeName} balance: £
                  {exchangeBankrolls[
                    selectedOffer.exchangeKey as keyof ExchangeBankroll
                  ]?.toFixed(2) || "0.00"}
                </span>
              )}
              {bankroll <= 0 && (
                <span className="text-[10px] text-amber-500/80 italic">
                  Deposit funds to continue
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
            Staking Method
          </span>
          <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            30% Kelly
          </span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-auto">
        {!isTracked ? (
          <>
            {!showCommissionPicker ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    Select Exchange
                  </span>
                  <div className="flex gap-2">
                    {bet.offers.map((offer) => (
                      <button
                        key={offer.exchangeKey}
                        disabled={isTracking}
                        onClick={() =>
                          setSelectedExchangeKey(offer.exchangeKey)
                        }
                        className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          selectedExchangeKey === offer.exchangeKey
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {offer.exchangeName}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleTrackClick}
                  disabled={bankroll <= 0}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
                >
                  {bankroll <= 0 ? "Insufficient bankroll" : "Track Bet"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Commission rate
                </p>
                <div className="flex gap-1.5 items-center">
                  <button
                    disabled={isTracking}
                    onClick={() => handleCommissionSelect(0)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-md bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                  >
                    0%
                  </button>
                  <button
                    disabled={isTracking}
                    onClick={() => handleCommissionSelect(0.75)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-md bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
                  >
                    0.75%
                  </button>
                  <button
                    disabled={isTracking}
                    onClick={() => handleCommissionSelect(2)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-md bg-amber-900/30 text-amber-400 border border-amber-500/30 hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                  >
                    2%
                  </button>
                  <div className="flex items-center gap-0.5 flex-1">
                    <input
                      type="number"
                      disabled={isTracking}
                      min="0"
                      max="100"
                      step="1"
                      value={customCommission}
                      onChange={(e) => setCustomCommission(e.target.value)}
                      onKeyDown={handleCustomKeyDown}
                      placeholder="Custom"
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                      autoFocus
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
                {isTracking ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-blue-400 text-[10px] font-bold uppercase">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Tracking...
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowCommissionPicker(false);
                      setCustomCommission("");
                    }}
                    className="w-full py-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="w-full py-2 bg-slate-800 text-slate-500 rounded-lg text-sm font-semibold border border-slate-700 text-center">
            Tracked
          </div>
        )}
      </div>
    </div>
  );
};
