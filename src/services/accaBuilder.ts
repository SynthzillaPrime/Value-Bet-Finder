import {
  MatchResponse,
  AccaLegCandidate,
  AccaOffer,
  AccaEstimate,
  PaperAcca,
} from "../types";
import {
  BETFRED_ACCA_FLEX,
  ACCA_MAX_LEG_ODDS,
  ACCA_REFERENCE_BOOKMAKERS,
} from "../constants";
import { stripVig } from "./edgeFinder";

export const buildLegCandidates = (
  matches: MatchResponse[],
  date: Date,
): AccaLegCandidate[] => {
  const candidates: AccaLegCandidate[] = [];
  const now = new Date();
  
  // Format target date as local calendar string (YYYY-MM-DD)
  const targetDateStr = date.toLocaleDateString('en-CA');

  for (const match of matches) {
    const kickoff = new Date(match.commence_time);
    const kickoffDateStr = kickoff.toLocaleDateString('en-CA');

    // Filter: Same local calendar day AND still in the future
    if (kickoffDateStr !== targetDateStr || kickoff <= now) {
      continue;
    }

    const pinnacleBookie = match.bookmakers.find((b) => b.key === "pinnacle");
    if (!pinnacleBookie) continue;

    const pinnMarket = pinnacleBookie.markets.find((m) => m.key === "h2h");
    if (!pinnMarket) continue;

    const fairPrices = stripVig(pinnMarket.outcomes);
    if (!fairPrices) continue;

    // Process home and away selections (skipping Draw)
    const outcomesToProcess = pinnMarket.outcomes.filter(
      (o) => o.name === match.home_team || o.name === match.away_team
    );

    for (const outcome of outcomesToProcess) {
      const pinnacleFair = fairPrices[outcome.name];
      const pinnacleProb = 1 / pinnacleFair;

      // Find highest price among reference bookmakers
      let refPrice: number | null = null;
      let refBookmaker: string | null = null;

      for (const refKey of ACCA_REFERENCE_BOOKMAKERS) {
        const bookie = match.bookmakers.find((b) => b.key === refKey);
        const market = bookie?.markets.find((m) => m.key === "h2h");
        const selection = market?.outcomes.find((o) => o.name === outcome.name);
        
        if (selection && (refPrice === null || selection.price > refPrice)) {
          refPrice = selection.price;
          refBookmaker = refKey;
        }
      }

      const valueRatio = refPrice ? refPrice / pinnacleFair : null;
      const effectivePrice = refPrice ?? pinnacleFair;

      // Filter: effectivePrice between minLegOdds and ACCA_MAX_LEG_ODDS
      if (
        effectivePrice >= BETFRED_ACCA_FLEX.minLegOdds &&
        effectivePrice <= ACCA_MAX_LEG_ODDS
      ) {
        candidates.push({
          id: `${match.id}-${outcome.name}`,
          sportKey: match.sport_key,
          sportTitle: match.sport_title,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          kickoff,
          selection: outcome.name,
          pinnacleFair,
          pinnacleProb,
          refPrice,
          refBookmaker,
          valueRatio,
        });
      }
    }
  }

  // Sort by valueRatio descending, nulls last
  return candidates.sort((a, b) => {
    if (a.valueRatio === null && b.valueRatio === null) return 0;
    if (a.valueRatio === null) return 1;
    if (b.valueRatio === null) return -1;
    return b.valueRatio - a.valueRatio;
  });
};

export const suggestAcca = (
  candidates: AccaLegCandidate[],
  legCount: number,
): AccaLegCandidate[] => {
  const selected: AccaLegCandidate[] = [];
  const usedMatchIds = new Set<string>();

  for (const cand of candidates) {
    if (selected.length >= legCount) break;
    
    // Extract match ID from candidate ID (which is matchId-selection)
    const matchId = cand.id.split('-')[0];
    if (!usedMatchIds.has(matchId)) {
      selected.push(cand);
      usedMatchIds.add(matchId);
    }
  }

  return selected;
};

export const estimateAcca = (
  legs: { prob: number; odds: number }[],
  stake: number,
  offer: AccaOffer,
): AccaEstimate => {
  const combinedOdds = legs.reduce((acc, leg) => acc * leg.odds, 1);
  const probAllWin = legs.reduce((acc, leg) => acc * leg.prob, 1);
  
  // Prob exactly one loses: Sum over each leg (P(this leg loses) * P(all other legs win))
  let probExactlyOneLoses = 0;
  for (let i = 0; i < legs.length; i++) {
    let probThisScenario = (1 - legs[i].prob);
    for (let j = 0; j < legs.length; j++) {
      if (i === j) continue;
      probThisScenario *= legs[j].prob;
    }
    probExactlyOneLoses += probThisScenario;
  }

  const winPayout = stake * combinedOdds;
  
  // Bonus calculation
  let bonusRate = 0;
  if (legs.length >= offer.minLegs) {
    const legKeys = Object.keys(offer.bonusByLegs).map(Number).sort((a, b) => b - a);
    const maxLegsInTable = legKeys[0];
    
    if (legs.length >= maxLegsInTable) {
      bonusRate = offer.bonusByLegs[maxLegsInTable];
    } else {
      bonusRate = offer.bonusByLegs[legs.length] || 0;
    }
  }
  const bonusAmount = bonusRate * (winPayout - stake);
  const totalWinReturn = winPayout + bonusAmount;

  // Refund calculation
  let refundAmount = 0;
  if (legs.length >= offer.minLegs) {
    const baseRefund = Math.min(stake, offer.refundCap);
    refundAmount = offer.refundType === "cash" 
      ? baseRefund 
      : baseRefund * offer.freeBetValue;
  }

  const expectedReturn = (probAllWin * totalWinReturn) + (probExactlyOneLoses * refundAmount);
  const expectedProfit = expectedReturn - stake;
  const evPercent = (expectedProfit / stake) * 100;

  return {
    combinedOdds,
    probAllWin,
    probExactlyOneLoses,
    winPayout,
    bonusAmount,
    totalWinReturn,
    refundAmount,
    expectedReturn,
    expectedProfit,
    evPercent,
  };
};

export const legResult = (
  selection: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
): "won" | "lost" => {
  if (selection === homeTeam) {
    return homeScore > awayScore ? "won" : "lost";
  }
  if (selection === awayTeam) {
    return awayScore > homeScore ? "won" : "lost";
  }
  // This function assumes H2H outcomes excluding Draw as per requirements
  return "lost";
};

export const fetchScoresBySport = async (
  apiKey: string,
  sportKey: string,
): Promise<MatchResponse[]> => {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?apiKey=${apiKey}&daysFrom=3`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data as MatchResponse[];
  } catch (error) {
    console.error(`Error fetching scores for ${sportKey}:`, error);
    return [];
  }
};

export const settleAcca = (
  acca: PaperAcca,
  scoresBySport: Record<string, MatchResponse[]>,
): { updatedAcca: PaperAcca; changed: boolean } => {
  if (acca.status !== "open") return { updatedAcca: acca, changed: false };

  // Manual settlement check
  const hasIncompleteInfo = acca.legs.some(
    (leg) => !leg.sportKey || !leg.homeTeam || !leg.awayTeam,
  );
  if (hasIncompleteInfo) {
    // If it's old/manual, we don't settle automatically
    return { updatedAcca: acca, changed: false };
  }

  const updatedLegs = [...acca.legs];
  let allLegsFinished = true;

  for (let i = 0; i < updatedLegs.length; i++) {
    const leg = updatedLegs[i];
    const sportScores = scoresBySport[leg.sportKey] || [];
    // The scores endpoint returns matches with a 'completed' boolean and 'scores' array
    const matchScore = sportScores.find(
      (m: any) => m.home_team === leg.homeTeam && m.away_team === leg.awayTeam,
    );

    if (!matchScore || !(matchScore as any).completed) {
      allLegsFinished = false;
      break;
    }

    const scores = (matchScore as any).scores;
    if (!scores || scores.length < 2) {
      allLegsFinished = false;
      break;
    }

    const homeScore = scores.find((s: any) => s.name === leg.homeTeam)?.score;
    const awayScore = scores.find((s: any) => s.name === leg.awayTeam)?.score;

    if (homeScore === undefined || awayScore === undefined) {
      allLegsFinished = false;
      break;
    }

    updatedLegs[i] = {
      ...leg,
      result: legResult(leg.selection, leg.homeTeam, leg.awayTeam, Number(homeScore), Number(awayScore)),
    };
  }

  if (!allLegsFinished) {
    return { updatedAcca: acca, changed: false };
  }

  // All legs finished, determine outcome
  const lostLegs = updatedLegs.filter((l) => l.result === "lost").length;
  let returns = 0;
  let resultLabel: "won" | "lost" | "refunded" = "lost";

  if (lostLegs === 0) {
    resultLabel = "won";
    // payout = stake * combinedOdds
    const payout = acca.stake * acca.combinedOdds;
    // We need to re-derive bonusRate
    let bonusRate = 0;
    const legCount = acca.numLegs;
    if (legCount >= BETFRED_ACCA_FLEX.minLegs) {
      const legKeys = Object.keys(BETFRED_ACCA_FLEX.bonusByLegs).map(Number).sort((a, b) => b - a);
      const maxLegsInTable = legKeys[0];
      if (legCount >= maxLegsInTable) {
        bonusRate = BETFRED_ACCA_FLEX.bonusByLegs[maxLegsInTable];
      } else {
        bonusRate = BETFRED_ACCA_FLEX.bonusByLegs[legCount] || 0;
      }
    }
    const bonus = bonusRate * (payout - acca.stake);
    returns = payout + bonus;
  } else if (lostLegs === 1) {
    resultLabel = "refunded";
    returns = Math.min(acca.stake, acca.refundCap);
  } else {
    resultLabel = "lost";
    returns = 0;
  }

  return {
    updatedAcca: {
      ...acca,
      legs: updatedLegs,
      status: "closed",
      returns,
      netPl: returns - acca.stake,
      notes: acca.notes ? `${acca.notes} (Settled: ${resultLabel})` : `Settled: ${resultLabel}`,
    },
    changed: true,
  };
};
