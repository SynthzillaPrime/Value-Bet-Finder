import { TrackedBet } from "../types";
import { EXCHANGES } from "../constants";

/**
 * Get the commission rate for a bet.
 * Uses the per-bet commission if set, otherwise falls back to EXCHANGES constant.
 * Commission is stored as a percentage (e.g. 2 means 2%).
 */
export const getCommissionRate = (bet: TrackedBet): number => {
  if (bet.commission !== undefined && bet.commission !== null) {
    return bet.commission / 100; // Convert percentage to fraction
  }
  // Fallback for legacy bets without per-bet commission
  const exchange = EXCHANGES.find((ex) => ex.key === bet.exchangeKey);
  return exchange ? exchange.commission : 0;
};

/**
 * Calculate flat and kelly P/L for a settled bet.
 * Commission is on NET WINNINGS only — you pay nothing on losses.
 */
export const calculatePL = (
  bet: TrackedBet,
  result: "won" | "lost" | "void",
): { flatPL: number; kellyPL: number } => {
  const commissionRate = getCommissionRate(bet);

  let flatPL = 0;
  let kellyPL = 0;

  if (result === "won") {
    // Profit = (odds - 1), commission on profit only
    const grossProfit = bet.exchangePrice - 1;
    flatPL = grossProfit * (1 - commissionRate);
    kellyPL = bet.kellyStake * grossProfit * (1 - commissionRate);
  } else if (result === "lost") {
    flatPL = -1;
    kellyPL = -bet.kellyStake;
  }
  // void = 0 for both

  return { flatPL, kellyPL };
};
