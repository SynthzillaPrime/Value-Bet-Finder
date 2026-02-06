import React, { useState } from "react";
import { BetEdge } from "../types";
import { Clock, Check, MessageSquare } from "lucide-react";

interface Props {
  bet: BetEdge;
  onTrack: (bet: BetEdge, notes?: string) => void;
  isTracked: boolean;
}

export const BetCard: React.FC<Props> = ({ bet, onTrack, isTracked }) => {
  const [step, setStep] = useState<"initial" | "exchange" | "notes">("initial");
  const [selectedOffer, setSelectedOffer] = useState<
    (typeof bet.offers)[0] | null
  >(null);
  const [notes, setNotes] = useState("");
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

      {/* Footer Action */}
      <div className="mt-auto space-y-4">
        {step === "exchange" && !isTracked && (
          <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 text-[10px] uppercase font-bold text-slate-400">
              Select Exchange
            </div>
            <div className="p-1 flex flex-col gap-1">
              {(bet.offers || []).map((offer) => (
                <button
                  key={offer.exchangeKey}
                  onClick={() => {
                    setSelectedOffer(offer);
                    setStep("notes");
                  }}
                  className="w-full flex justify-between items-center px-3 py-2 rounded hover:bg-slate-800 transition-colors group/item"
                >
                  <span className="text-xs text-slate-300 group-hover/item:text-white">
                    {offer.exchangeName}
                  </span>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {offer.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "notes" && !isTracked && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3">
            <div className="px-1 flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Tracking: {selectedOffer?.exchangeName} @{" "}
                {selectedOffer?.price.toFixed(2)}
              </span>
            </div>
            <div className="relative px-1">
              <MessageSquare className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Add a note (optional)..."
                maxLength={50}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {!isTracked && step === "initial" ? (
            <button
              onClick={() => setStep("exchange")}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
            >
              Track Bet
            </button>
          ) : !isTracked && step !== "initial" ? (
            <div className="flex-1 flex gap-2">
              <button
                onClick={() => {
                  if (step === "notes") {
                    setStep("exchange");
                  } else {
                    setStep("initial");
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-all"
              >
                Back
              </button>
              {step === "notes" && (
                <button
                  onClick={() => {
                    if (selectedOffer) {
                      const modifiedBet = {
                        ...bet,
                        exchangeKey: selectedOffer.exchangeKey,
                        exchangeName: selectedOffer.exchangeName,
                        exchangePrice: selectedOffer.price,
                        netEdgePercent: selectedOffer.netEdgePercent,
                        kellyPercent: selectedOffer.kellyPercent,
                      };
                      onTrack(modifiedBet, notes);
                    }
                    setStep("initial");
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
                >
                  Confirm
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 py-2 bg-slate-800 text-slate-500 rounded-lg text-sm font-semibold border border-slate-700 text-center">
              Tracked
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
