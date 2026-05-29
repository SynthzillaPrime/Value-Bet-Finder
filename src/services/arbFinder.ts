import {
  MatchResponse,
  ArbOpportunity,
  ArbLeg,
  Bookmaker,
  Market,
  Outcome,
} from "../types";

/**
 * Finds arbitrage opportunities (back-back only) from the provided odds data.
 *
 * Rules:
 * - Pre-match only (commence_time in the future).
 * - Only process events where both Matchbook and Smarkets have odds.
 * - Take the best back price across both exchanges for each outcome.
 * - Apply flat 2% commission to each leg.
 * - Net return = 1 + (price - 1) * 0.98.
 * - Net implied probability = 1 / net return.
 * - Arb if sum of net implied probabilities < 1.0 (100%).
 * - Arb percentage = (1 - sum of net implied) * 100.
 * - Only flag if arb percentage >= 0.5%.
 * - Default total stake £10, split proportional to net implied probability.
 */
export const findArbitrageOpportunities = (
  matches: MatchResponse[],
): ArbOpportunity[] => {
  const now = new Date();
  const opportunities: ArbOpportunity[] = [];
  const COMMISSION = 0.02;
  const DEFAULT_TOTAL_STAKE = 10;
  const MIN_ARB_PERCENTAGE = 0.5;

  for (const match of matches) {
    const commenceTime = new Date(match.commence_time);

    // Rule: Pre-match only
    if (commenceTime <= now) continue;

    // Rule: Only process events where both Matchbook and Smarkets have odds
    const matchbook = match.bookmakers.find(
      (b: Bookmaker) => b.key === "matchbook",
    );
    const smarkets = match.bookmakers.find(
      (b: Bookmaker) => b.key === "smarkets",
    );

    if (!matchbook || !smarkets) continue;

    // We only process 'h2h' (Match Result) markets for now
    const mbMarket = matchbook.markets.find((m: Market) => m.key === "h2h");
    const smMarket = smarkets.markets.find((m: Market) => m.key === "h2h");

    if (!mbMarket || !smMarket) continue;

    // Ensure they have the same outcomes
    if (mbMarket.outcomes.length !== smMarket.outcomes.length) continue;

    const legs: ArbLeg[] = [];
    let totalNetImpliedProb = 0;

    for (let i = 0; i < mbMarket.outcomes.length; i++) {
      const mbOutcome = mbMarket.outcomes[i];
      // Find matching outcome in Smarkets (matching by name)
      const smOutcome = smMarket.outcomes.find(
        (o: Outcome) => o.name === mbOutcome.name,
      );

      if (!smOutcome) break;

      // Rule: Take the best back price across both exchanges
      const bestPrice = Math.max(mbOutcome.price, smOutcome.price);
      const bestExchange =
        mbOutcome.price >= smOutcome.price ? "Matchbook" : "Smarkets";

      // Rule: Apply flat 2% commission (Net return = 1 + (price - 1) * 0.98)
      const netReturn = 1 + (bestPrice - 1) * (1 - COMMISSION);
      const netImpliedProb = 1 / netReturn;

      totalNetImpliedProb += netImpliedProb;

      legs.push({
        exchangeName: bestExchange,
        selectionName: mbOutcome.name,
        decimalOdds: bestPrice,
        betType: "back",
        recommendedStake: 0, // Will be calculated later
      });
    }

    // If we broke out of the loop (missing outcome), skip
    if (legs.length !== mbMarket.outcomes.length) continue;

    // Rule: Arb if sum of net implied probabilities < 1.0
    if (totalNetImpliedProb < 1.0) {
      const arbPercentage = (1 - totalNetImpliedProb) * 100;

      // Rule: Only flag if arb percentage >= 0.5%
      if (arbPercentage >= MIN_ARB_PERCENTAGE) {
        // Calculate stakes and profit
        // Stake_i = (NetImpliedProb_i / TotalNetImpliedProb) * TotalStake
        // This ensures equal profit across all outcomes.
        // Profit = (TotalStake / TotalNetImpliedProb) - TotalStake

        const guaranteedProfit =
          DEFAULT_TOTAL_STAKE / totalNetImpliedProb - DEFAULT_TOTAL_STAKE;

        for (let i = 0; i < legs.length; i++) {
          const legNetReturn = 1 + (legs[i].decimalOdds - 1) * (1 - COMMISSION);
          const legNetImpliedProb = 1 / legNetReturn;
          legs[i].recommendedStake =
            (legNetImpliedProb / totalNetImpliedProb) * DEFAULT_TOTAL_STAKE;
        }

        opportunities.push({
          id: `arb-${match.id}`,
          sportKey: match.sport_key,
          matchName: `${match.home_team} vs ${match.away_team}`,
          commenceTime: match.commence_time,
          arbType: "back-back",
          arbPercentage: Number(arbPercentage.toFixed(2)),
          guaranteedProfit: Number(guaranteedProfit.toFixed(2)),
          totalStake: DEFAULT_TOTAL_STAKE,
          legs: legs,
        });
      }
    }

    // --- Pass 2: Back-Lay Arbitrage ---
    // Rule: For each outcome, find best back price and best lay price across both exchanges.
    // Rule: Commission applies only to the winning side of each leg (2%).
    // Rule: Back leg net win = stake_back * (back_price - 1) * 0.98
    // Rule: Lay leg liability = stake_lay * (lay_price - 1), no commission
    // Rule: Lay leg net win = stake_lay * 0.98
    // Rule: Back leg loss = stake_back

    const mbLayMarket = matchbook.markets.find(
      (m: Market) => m.key === "h2h_lay",
    );
    const smLayMarket = smarkets.markets.find(
      (m: Market) => m.key === "h2h_lay",
    );

    // Only proceed if at least one exchange provides lay data for this event
    if (mbLayMarket || smLayMarket) {
      for (let i = 0; i < mbMarket.outcomes.length; i++) {
        const outcomeName = mbMarket.outcomes[i].name;

        // Best back price
        const mbBack =
          mbMarket.outcomes.find((o: Outcome) => o.name === outcomeName)
            ?.price || 0;
        const smBack =
          smMarket.outcomes.find((o: Outcome) => o.name === outcomeName)
            ?.price || 0;
        const bestBack = Math.max(mbBack, smBack);
        const bestBackExchange = mbBack >= smBack ? "Matchbook" : "Smarkets";

        // Best lay price
        const mbLay =
          mbLayMarket?.outcomes.find((o: Outcome) => o.name === outcomeName)
            ?.price || Infinity;
        const smLay =
          smLayMarket?.outcomes.find((o: Outcome) => o.name === outcomeName)
            ?.price || Infinity;
        const bestLay = Math.min(mbLay, smLay);
        const bestLayExchange = mbLay <= smLay ? "Matchbook" : "Smarkets";

        if (bestBack > 0 && bestLay < Infinity) {
          // Solve for equal profit:
          // S_L = S_b * (0.98 * P_b + 0.02) / (P_L - 0.02)
          const backStake = DEFAULT_TOTAL_STAKE;
          const layStake =
            (backStake * (0.98 * bestBack + 0.02)) / (bestLay - 0.02);
          const profit = layStake * 0.98 - backStake;
          const arbPercentage = (profit / backStake) * 100;

          if (arbPercentage >= MIN_ARB_PERCENTAGE) {
            opportunities.push({
              id: `arb-bl-${match.id}-${i}`,
              sportKey: match.sport_key,
              matchName: `${match.home_team} vs ${match.away_team}`,
              commenceTime: match.commence_time,
              arbType: "back-lay",
              arbPercentage: Number(arbPercentage.toFixed(2)),
              guaranteedProfit: Number(profit.toFixed(2)),
              totalStake: backStake,
              totalLayLiability: Number((layStake * (bestLay - 1)).toFixed(2)),
              legs: [
                {
                  exchangeName: bestBackExchange,
                  selectionName: outcomeName,
                  decimalOdds: bestBack,
                  betType: "back",
                  recommendedStake: Number(backStake.toFixed(2)),
                },
                {
                  exchangeName: bestLayExchange,
                  selectionName: outcomeName,
                  decimalOdds: bestLay,
                  betType: "lay",
                  recommendedStake: Number(layStake.toFixed(2)),
                  liability: Number((layStake * (bestLay - 1)).toFixed(2)),
                },
              ],
            });
          }
        }
      }
    }
  }

  return opportunities;
};
