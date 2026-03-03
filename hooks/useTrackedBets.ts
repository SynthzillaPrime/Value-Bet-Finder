import { useState, useCallback } from "react";
import {
  TrackedBet,
  BetEdge,
  BankrollTransaction,
  ExchangeBankroll,
} from "../types";
import {
  insertBet,
  updateBet as supabaseUpdateBet,
  deleteBet as supabaseDeleteBet,
  fetchAllBets,
} from "../services/supabase";

export const useTrackedBets = (
  bankroll: number,
  addTransactionDirect: (t: BankrollTransaction) => Promise<void>,
  onError: (msg: string) => void,
) => {
  const [trackedBets, setTrackedBets] = useState<TrackedBet[]>([]);

  const loadTrackedBets = useCallback(async () => {
    const bets = await fetchAllBets();
    setTrackedBets(bets);
    return bets;
  }, []);

  const handleTrackBet = async (
    bet: BetEdge,
    commission: number,
    selectedExchange: string,
  ) => {
    if (bankroll <= 0) return;
    const now = Date.now();
    const hoursBeforeKickoff = (bet.kickoff.getTime() - now) / (1000 * 60 * 60);
    let timingBucket: "48hr+" | "24-48hr" | "12-24hr" | "<12hr" = "<12hr";

    if (hoursBeforeKickoff >= 48) timingBucket = "48hr+";
    else if (hoursBeforeKickoff >= 24) timingBucket = "24-48hr";
    else if (hoursBeforeKickoff >= 12) timingBucket = "12-24hr";

    // Find the offer for the selected exchange
    const offer =
      bet.offers.find((o) => o.exchangeKey === selectedExchange) ||
      bet.offers[0];

    // Recalculate net edge with the actual commission rate for this bet
    const commissionFraction = commission / 100;
    const effectiveOdds = 1 + (offer.price - 1) * (1 - commissionFraction);
    const actualNetEdge = (effectiveOdds / bet.fairPrice - 1) * 100;

    // Kelly with actual commission
    const b = effectiveOdds - 1;
    const p = 1 / bet.fairPrice;
    const q = 1 - p;
    const kellyFraction = (b * p - q) / b;
    const kellyPercent = Math.max(0, kellyFraction * 100);

    const fractionalKellyStake = bankroll * ((kellyPercent / 100) * 0.3);

    // Create a transaction to subtract the stake immediately
    const stakeTransaction: BankrollTransaction = {
      id: `stake-${bet.id}-${now}`,
      timestamp: now,
      exchange: selectedExchange as "matchbook" | "smarkets",
      type: "bet_placed",
      amount: -fractionalKellyStake,
      betId: bet.id,
      note: `Stake for ${bet.match} on ${offer.exchangeName}`,
    };

    // Base edge at permanent 2% rate (for clean analysis)
    const baseCommissionFraction = 0.02;
    const baseEffectiveOdds =
      1 + (offer.price - 1) * (1 - baseCommissionFraction);
    const baseNetEdge = (baseEffectiveOdds / bet.fairPrice - 1) * 100;

    const baseB = baseEffectiveOdds - 1;
    const baseP = 1 / bet.fairPrice;
    const baseQ = 1 - baseP;
    const baseKellyFraction = (baseB * baseP - baseQ) / baseB;
    const baseKellyPercent = Math.max(0, baseKellyFraction * 100);
    const baseKellyStake = bankroll * ((baseKellyPercent / 100) * 0.3);

    const newTrackedBet: TrackedBet = {
      ...bet,
      exchangeKey: offer.exchangeKey,
      exchangeName: offer.exchangeName,
      exchangePrice: offer.price,
      placedAt: now,
      fairPriceAtBet: bet.fairPrice,
      status: "open",
      hoursBeforeKickoff,
      timingBucket,
      kellyStake: fractionalKellyStake,
      commission,
      netEdgePercent: actualNetEdge,
      kellyPercent,
      baseNetEdgePercent: baseNetEdge,
      baseKellyPercent: baseKellyPercent,
      baseKellyStake: baseKellyStake,
    };

    try {
      // Persist to Supabase first
      await insertBet(newTrackedBet);
      await addTransactionDirect(stakeTransaction);

      // Update local state
      setTrackedBets((prev) => [...prev, newTrackedBet]);
    } catch (error) {
      console.error("Failed to save bet:", error);
      onError("Failed to track bet. Please try again.");
      throw error;
    }
  };

  const handleUpdateTrackedBet = async (updatedBet: TrackedBet) => {
    const oldBet = trackedBets.find((b) => b.id === updatedBet.id);
    let transaction: BankrollTransaction | null = null;

    // If the bet just settled, create a bankroll transaction
    if (
      oldBet &&
      !oldBet.result &&
      updatedBet.result &&
      updatedBet.kellyPL !== undefined
    ) {
      const amount = updatedBet.kellyStake + updatedBet.kellyPL;
      const bankrollKey: keyof ExchangeBankroll =
        (updatedBet.exchangeKey as keyof ExchangeBankroll) || "matchbook";

      let type: BankrollTransaction["type"] = "bet_win";
      if (updatedBet.result === "lost") type = "bet_loss";
      else if (updatedBet.result === "void") type = "bet_void";

      transaction = {
        id: `settle-${updatedBet.id}-${Date.now()}`,
        timestamp: Date.now(),
        exchange: bankrollKey,
        type,
        amount: amount,
        betId: updatedBet.id,
      };
    }

    try {
      // Persist to Supabase: Update bet first, then insert transaction
      await supabaseUpdateBet(updatedBet);

      if (transaction) {
        await addTransactionDirect(transaction);
      }

      // Update local state
      setTrackedBets((prev) =>
        prev.map((b) => (b.id === updatedBet.id ? updatedBet : b)),
      );
    } catch (error) {
      console.error("Failed to save update:", error);
      onError("Failed to save changes to database.");
      throw error;
    }
  };

  const handleDeleteTrackedBet = async (id: string) => {
    try {
      await supabaseDeleteBet(id);
      setTrackedBets((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete bet:", error);
      onError("Failed to delete bet from database.");
      throw error;
    }
  };

  return {
    trackedBets,
    setTrackedBets,
    loadTrackedBets,
    handleTrackBet,
    handleUpdateTrackedBet,
    handleDeleteTrackedBet,
  };
};
