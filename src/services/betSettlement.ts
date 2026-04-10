import { TrackedBet } from "../types";

/**
 * Shared Kelly stake calculation logic.
 * Computes effective odds (post-commission), net edge, Kelly percentage, and recommended stake.
 */
export const calculateBetStake = (params: {
  price: number; // exchange odds
  fairPrice: number; // Pinnacle no-vig fair price
  bankroll: number; // total bankroll
  commission: number; // actual commission percentage (e.g. 0, 2)
  kellyFraction: number; // fractional Kelly multiplier (e.g. 0.3 for 30%)
}): {
  effectiveOdds: number;
  netEdgePercent: number;
  kellyPercent: number;
  kellyStake: number;
} => {
  const { price, fairPrice, bankroll, commission, kellyFraction } = params;

  // Calculate effectiveOdds = 1 + (price - 1) * (1 - commission / 100)
  const effectiveOdds = 1 + (price - 1) * (1 - commission / 100);

  // Calculate netEdgePercent = (effectiveOdds / fairPrice - 1) * 100
  const netEdgePercent = (effectiveOdds / fairPrice - 1) * 100;

  // Calculate Kelly fraction: b = effectiveOdds - 1, p = 1 / fairPrice, q = 1 - p
  const b = effectiveOdds - 1;
  const p = 1 / fairPrice;
  const q = 1 - p;

  // kellyPercent = Math.max(0, ((b * p - q) / b) * 100)
  const kellyPercent = Math.max(0, ((b * p - q) / b) * 100);

  // Calculate kellyStake = bankroll * (kellyPercent / 100) * kellyFraction
  const kellyStake = bankroll * (kellyPercent / 100) * kellyFraction;

  return {
    effectiveOdds,
    netEdgePercent,
    kellyPercent,
    kellyStake,
  };
};
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
 * Calculate Kelly P/L for a settled bet.
 * Commission is on NET WINNINGS only — you pay nothing on losses.
 */
export const calculatePL = (
  bet: TrackedBet,
  result: "won" | "lost" | "void",
): { kellyPL: number } => {
  const commissionRate = getCommissionRate(bet);

  let kellyPL = 0;

  if (result === "won") {
    // Profit = (odds - 1), commission on profit only
    const grossProfit = bet.exchangePrice - 1;
    kellyPL = bet.kellyStake * grossProfit * (1 - commissionRate);
  } else if (result === "lost") {
    kellyPL = -bet.kellyStake;
  }
  // void = 0

  return { kellyPL };
};

/**
 * Determines the result of a bet based on the final scores.
 * Handles Match Result, Over/Under, and Handicap markets.
 */
export function determineBetResult(
  bet: TrackedBet,
  homeScore: number,
  awayScore: number,
): "won" | "lost" | "void" {
  if (bet.market === "Match Result") {
    if (bet.selection === bet.homeTeam) {
      return homeScore > awayScore ? "won" : "lost";
    } else if (bet.selection === bet.awayTeam) {
      return awayScore > homeScore ? "won" : "lost";
    } else if (bet.selection.toLowerCase() === "draw") {
      return homeScore === awayScore ? "won" : "lost";
    }
  } else if (bet.market === "Over/Under") {
    const parts = bet.selection.split(" ");
    const type = parts[0]; // "Over" or "Under"
    const line = parseFloat(parts[1]);
    const total = homeScore + awayScore;

    if (type === "Over") {
      if (total > line) return "won";
      if (total < line) return "lost";
      return "void";
    } else if (type === "Under") {
      if (total < line) return "won";
      if (total > line) return "lost";
      return "void";
    }
  } else if (bet.market === "Handicap") {
    const parts = bet.selection.split(" ");
    const point = parseFloat(parts[parts.length - 1]);
    const team = parts.slice(0, -1).join(" ");

    if (team === bet.homeTeam) {
      const adjusted = homeScore + point;
      if (adjusted > awayScore) return "won";
      if (adjusted < awayScore) return "lost";
      return "void";
    } else if (team === bet.awayTeam) {
      const adjusted = awayScore + point;
      if (adjusted > homeScore) return "won";
      if (adjusted < homeScore) return "lost";
      return "void";
    }
  }

  return "lost";
}
