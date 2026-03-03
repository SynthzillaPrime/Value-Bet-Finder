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
