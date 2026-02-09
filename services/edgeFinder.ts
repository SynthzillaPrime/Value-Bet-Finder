import { BOOKMAKERS, EXCHANGES, MARKETS } from "../constants";
import {
  MatchResponse,
  BetEdge,
  HistoryResponse,
  ExchangeOffer,
  TrackedBet,
} from "../types";

/**
 * Removes the vigorish (margin) from a set of odds to find the "fair" probability/price.
 * Uses the multiplicative method.
 */
export const stripVig = (
  outcomes: { price: number; name: string }[],
): Record<string, number> | null => {
  if (!outcomes || outcomes.length < 2) return null;

  const oddsList = outcomes.map((o) => o.price);
  const implied = oddsList.map((o) => 1 / o);
  const totalImplied = implied.reduce((a, b) => a + b, 0);

  // If total implied probability is invalid
  if (totalImplied === 0) return null;

  const fairPrices: Record<string, number> = {};

  outcomes.forEach((outcome, index) => {
    const fairProb = implied[index] / totalImplied;
    fairPrices[outcome.name] = 1 / fairProb;
  });

  return fairPrices;
};

interface FetchResult {
  data: MatchResponse[];
  remaining: number | null;
}

/**
 * Fetches odds for a single league
 */
const fetchLeagueOdds = async (
  apiKey: string,
  leagueKey: string,
): Promise<FetchResult> => {
  // h2h = 1X2, totals = Over/Under (btts not supported by this endpoint)
  const url = `https://api.the-odds-api.com/v4/sports/${leagueKey}/odds?apiKey=${apiKey}&regions=uk,eu,us&markets=${MARKETS}&oddsFormat=decimal&bookmakers=${BOOKMAKERS}`;

  try {
    const response = await fetch(url);

    // Check for quota header
    const remainingHeader = response.headers.get("x-requests-remaining");
    const remaining = remainingHeader ? parseInt(remainingHeader, 10) : null;

    if (!response.ok) {
      if (response.status === 401) throw new Error("AUTH_ERROR");
      if (response.status === 429) throw new Error("QUOTA_EXCEEDED");
      console.warn(`Failed to fetch ${leagueKey}: ${response.statusText}`);
      return { data: [], remaining };
    }

    if (remaining !== null && remaining <= 0) {
      throw new Error("QUOTA_EXCEEDED");
    }

    const data = await response.json();
    return { data: data as MatchResponse[], remaining };
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === "AUTH_ERROR" || msg === "QUOTA_EXCEEDED") throw error;
    console.error(`Error fetching ${leagueKey}`, error);
    return { data: [], remaining: null };
  }
};

/**
 * Step 1: Fetch raw data from API
 */
export const fetchOddsData = async (
  apiKey: string,
  selectedLeagues: string[],
): Promise<{ matches: MatchResponse[]; remainingRequests: number | null }> => {
  const fetchPromises = selectedLeagues.map((leagueKey) =>
    fetchLeagueOdds(apiKey, leagueKey),
  );
  const results = await Promise.all(fetchPromises);

  const flatMatches = results.flatMap((r) => r.data);
  const remainingCounts = results
    .map((r) => r.remaining)
    .filter((r): r is number => r !== null);
  const remainingRequests =
    remainingCounts.length > 0 ? Math.min(...remainingCounts) : null;

  return { matches: flatMatches, remainingRequests };
};

/**
 * Step 2: Process local data to find edges
 */
export const calculateEdges = (matches: MatchResponse[]): BetEdge[] => {
  const allBets: BetEdge[] = [];

  // Filter out matches that have already started or are more than 48 hours away
  const now = new Date();
  const maxKickoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcomingMatches = matches.filter((m) => {
    const kickoff = new Date(m.commence_time);
    return kickoff > now && kickoff <= maxKickoff;
  });

  for (const match of upcomingMatches) {
    const pinnacle = match.bookmakers.find((b) => b.key === "pinnacle");

    if (!pinnacle) continue;

    const matchDate = new Date(match.commence_time);

    for (const pinnMarket of pinnacle.markets) {
      // Get fair prices for this market from Pinnacle
      const fairPrices = stripVig(pinnMarket.outcomes);
      if (!fairPrices) continue;

      // Determine Market Name
      let marketName = pinnMarket.key;
      if (pinnMarket.key === "h2h") marketName = "Match Result";
      else if (pinnMarket.key === "totals") marketName = "Over/Under";
      else if (pinnMarket.key === "spreads") marketName = "Handicap";

      // Iterate through each selection (outcome) in the Pinnacle market
      for (const outcome of pinnMarket.outcomes) {
        const selection =
          outcome.point !== undefined
            ? `${outcome.name} ${outcome.point > 0 ? "+" : ""}${outcome.point}`
            : outcome.name;
        const fairPrice = fairPrices[outcome.name];

        if (!fairPrice) continue;

        // Find offers from all exchanges
        const offers: ExchangeOffer[] = [];

        for (const exConfig of EXCHANGES) {
          const exchangeBookie = match.bookmakers.find(
            (b) => b.key === exConfig.key,
          );
          if (!exchangeBookie) continue;

          const exMarket = exchangeBookie.markets.find(
            (m) => m.key === pinnMarket.key,
          );
          if (!exMarket) continue;

          const exOutcome = exMarket.outcomes.find(
            (o) => o.name === outcome.name && o.point === outcome.point,
          );
          if (!exOutcome) continue;

          // Calculate Net Edge considering commission
          // Effective Odds = 1 + (DecimalOdds - 1) * (1 - CommissionRate)
          const effectiveOdds =
            1 + (exOutcome.price - 1) * (1 - exConfig.commission);
          const netEdge = (effectiveOdds / fairPrice - 1) * 100;

          // Kelly Criterion
          const b = effectiveOdds - 1;
          const p = 1 / fairPrice;
          const q = 1 - p;
          const kellyFraction = (b * p - q) / b;
          const kellyPercent = Math.max(0, kellyFraction * 100);

          offers.push({
            exchangeKey: exConfig.key,
            exchangeName: exConfig.name,
            price: exOutcome.price,
            netEdgePercent: netEdge,
            kellyPercent,
          });
        }

        // Sort offers by Net Edge (Descending)
        offers.sort((a, b) => b.netEdgePercent - a.netEdgePercent);

        const bestOffer = offers[0];

        // If best offer exists and meets criteria (Min 2% net edge + Odds range 1.5-10.0)
        if (
          bestOffer &&
          bestOffer.netEdgePercent >= 2 &&
          bestOffer.price >= 1.5 &&
          bestOffer.price <= 10.0
        ) {
          // Calculate raw edge for the best offer
          const rawEdge = (bestOffer.price / fairPrice - 1) * 100;

          allBets.push({
            id: `${match.id}-${pinnMarket.key}-${selection}`,
            match: `${match.home_team} vs ${match.away_team}`,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            sport: match.sport_title,
            sportKey: match.sport_key,
            kickoff: matchDate,
            selection: selection,
            market: marketName,

            exchangeKey: bestOffer.exchangeKey,
            exchangeName: bestOffer.exchangeName,
            exchangePrice: bestOffer.price,

            offers: offers, // Store all offers for display

            fairPrice: fairPrice,
            edgePercent: rawEdge,
            netEdgePercent: bestOffer.netEdgePercent,
            kellyPercent: bestOffer.kellyPercent,
          });
        }
      }
    }
  }

  // Sort by kickoff date (soonest first)
  return allBets.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
};

/**
 * Backward compatibility wrapper if needed, or strictly for one-shot calls
 */
export const scanForEdges = async (
  apiKey: string,
  selectedLeagues: string[],
): Promise<{ bets: BetEdge[]; remainingRequests: number | null }> => {
  const { matches, remainingRequests } = await fetchOddsData(
    apiKey,
    selectedLeagues,
  );
  const bets = calculateEdges(matches);
  return { bets, remainingRequests };
};

interface ClosingLineResult {
  rawPrice: number;
  fairPrice: number;
}

/**
 * Fetches the closing line from history and calculates the Fair Closing Price
 * (Pinnacle No-Vig)
 */
export const fetchClosingLineForBet = async (
  apiKey: string,
  bet: BetEdge,
): Promise<ClosingLineResult | null> => {
  // ISO string is required for the date param
  const dateStr = bet.kickoff.toISOString().split(".")[0] + "Z";

  const url = `https://api.the-odds-api.com/v4/sports/${bet.sportKey}/odds-history?apiKey=${apiKey}&regions=eu,uk&markets=${MARKETS}&date=${dateStr}&bookmakers=pinnacle`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("History API failed", response.status);
      return null;
    }

    const json = (await response.json()) as HistoryResponse;
    const match = json.data.find(
      (m) =>
        m.id.split(":")[0] === bet.id.split("-")[0] ||
        m.home_team === bet.homeTeam,
    );

    if (!match) return null;

    const pinnacle = match.bookmakers.find((b) => b.key === "pinnacle");
    if (!pinnacle) return null;

    // Map market name back to key
    let marketKey = "h2h";
    if (bet.market === "Over/Under") marketKey = "totals";
    else if (bet.market === "Handicap") marketKey = "spreads";

    const market = pinnacle.markets.find((m) => m.key === marketKey);

    if (!market) return null;

    const outcome = market.outcomes.find((o) => {
      const selection =
        o.point !== undefined
          ? `${o.name} ${o.point > 0 ? "+" : ""}${o.point}`
          : o.name;
      return selection === bet.selection;
    });
    if (!outcome) return null;

    // Calculate fair prices for the whole market at close
    const fairPrices = stripVig(market.outcomes);
    if (!fairPrices || !fairPrices[outcome.name]) return null;

    return {
      rawPrice: outcome.price,
      fairPrice: fairPrices[outcome.name],
    };
  } catch (e) {
    console.error("Error fetching closing line", e);
    return null;
  }
};

interface ScoreResult {
  completed: boolean;
  homeScore?: number;
  awayScore?: number;
}

export const fetchMatchResult = async (
  apiKey: string,
  bet: TrackedBet,
): Promise<ScoreResult | null> => {
  const url = `https://api.the-odds-api.com/v4/sports/${bet.sportKey}/scores?apiKey=${apiKey}&daysFrom=3`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Scores API failed: ${response.statusText}`);
      return null;
    }

    const matches = await response.json();
    const match = matches.find(
      (m: any) => m.home_team === bet.homeTeam && m.away_team === bet.awayTeam,
    );

    if (!match) return null;

    if (!match.completed) {
      return { completed: false };
    }

    let homeScore: number | undefined;
    let awayScore: number | undefined;

    if (match.scores && Array.isArray(match.scores)) {
      const home = match.scores.find((s: any) => s.name === bet.homeTeam);
      const away = match.scores.find((s: any) => s.name === bet.awayTeam);

      if (home) homeScore = parseInt(home.score, 10);
      if (away) awayScore = parseInt(away.score, 10);
    }

    return {
      completed: true,
      homeScore,
      awayScore,
    };
  } catch (e) {
    console.error("Error fetching match result", e);
    return null;
  }
};
