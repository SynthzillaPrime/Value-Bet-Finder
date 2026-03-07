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
import {
  calculateBetStake,
  determineBetResult,
  calculatePL,
} from "../services/betSettlement";
import { fetchClosingLine, fetchMatchResult } from "../services/edgeFinder";

export const useTrackedBets = (
  bankroll: number,
  addTransactionDirect: (t: BankrollTransaction) => Promise<void>,
  onError: (msg: string) => void,
  apiKey: string,
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
    const {
      netEdgePercent: actualNetEdge,
      kellyPercent,
      kellyStake: fractionalKellyStake,
    } = calculateBetStake({
      price: offer.price,
      fairPrice: bet.fairPrice,
      bankroll,
      commission,
      kellyFraction: 0.3,
    });

    // Create a transaction to subtract the stake immediately
    const stakeTransaction: BankrollTransaction = {
      id: `stake-${bet.id}-${now}`,
      timestamp: now,
      exchange: selectedExchange as "matchbook" | "smarkets",
      type: "bet_placed",
      amount: -fractionalKellyStake,
      betId: bet.id,
    };

    // Base edge at permanent 2% rate (for clean analysis)
    const {
      netEdgePercent: baseNetEdge,
      kellyPercent: baseKellyPercent,
      kellyStake: baseKellyStake,
    } = calculateBetStake({
      price: offer.price,
      fairPrice: bet.fairPrice,
      bankroll,
      commission: 2,
      kellyFraction: 0.3,
    });

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
      flatStake: 1,
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

      // Update local state - add to top of list as it's the most recent
      setTrackedBets((prev) => [newTrackedBet, ...prev]);
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

  const settleBet = async (
    betId: string,
    forceResult?: "won" | "lost" | "void",
  ): Promise<boolean> => {
    const bet = trackedBets.find((b) => b.id === betId);
    if (!bet) return false;

    if (bet.result && !forceResult) return true;

    let clvData = {
      closingRawPrice: bet.closingRawPrice,
      closingFairPrice: bet.closingFairPrice,
      clvPercent: bet.clvPercent,
    };

    // Fetch CLV if missing
    if (clvData.clvPercent === undefined) {
      const result = await fetchClosingLine(apiKey, bet);
      if (result) {
        clvData = {
          closingRawPrice: result.closingRawPrice,
          closingFairPrice: result.closingFairPrice,
          clvPercent: result.clvPercent,
        };
      }
    }

    let result: "won" | "lost" | "void" | undefined = forceResult;
    let homeScore = bet.homeScore;
    let awayScore = bet.awayScore;

    if (!result) {
      const scoreResult = await fetchMatchResult(apiKey, bet);
      if (!scoreResult || !scoreResult.completed) return false;

      homeScore = scoreResult.homeScore;
      awayScore = scoreResult.awayScore;
      if (homeScore === undefined || awayScore === undefined) return false;

      result = determineBetResult(bet, homeScore, awayScore);
    }

    if (!result) return false;

    const { kellyPL } = calculatePL(bet, result);

    try {
      await handleUpdateTrackedBet({
        ...bet,
        result,
        kellyPL,
        homeScore,
        awayScore,
        ...clvData,
        status: "closed",
      });
      return true;
    } catch (e) {
      console.error(`Failed to settle bet ${betId}:`, e);
      return false;
    }
  };

  const settleAll = async (): Promise<{ settled: number; failed: number }> => {
    const betsToSettle = trackedBets.filter((b) => !b.result);
    let settled = 0;
    let failed = 0;

    for (const bet of betsToSettle) {
      const success = await settleBet(bet.id);
      if (success) {
        settled++;
      } else {
        failed++;
      }

      // Small delay to avoid API rate limits
      if (settled + failed < betsToSettle.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    return { settled, failed };
  };

  return {
    trackedBets,
    setTrackedBets,
    loadTrackedBets,
    handleTrackBet,
    handleUpdateTrackedBet,
    handleDeleteTrackedBet,
    settleBet,
    settleAll,
  };
};
