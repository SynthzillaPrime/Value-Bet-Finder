import { BOOKMAKERS, EXCHANGES, MARKETS } from "../constants";
import {
  MatchResponse,
  BetEdge,
  HistoryResponse,
  ExchangeOffer,
  TrackedBet,
  Bookmaker,
  Market,
  Outcome,
} from "../types";
import { calculateBetStake } from "./betSettlement";

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
  used: number | null;
}

/**
 * Fetches the count of upcoming fixtures for specific leagues.
 * This endpoint is free and does not count towards the API quota.
 */
export const fetchLeagueFixtureCounts = async (
  apiKey: string,
  leagueKeys: string[],
): Promise<Record<string, number>> => {
  const now = new Date();
  const maxKickoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const results: { key: string; count: number }[] = [];

  for (let i = 0; i < leagueKeys.length; i++) {
    const leagueKey = leagueKeys[i];
    const url = `https://api.the-odds-api.com/v4/sports/${leagueKey}/events?apiKey=${apiKey}&dateFormat=iso`;

    try {
      let response = await fetch(url);

      // Handle rate limit with one retry
      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = await fetch(url);
      }

      if (!response.ok) {
        results.push({ key: leagueKey, count: 0 });
      } else {
        const events = (await response.json()) as any[];
        const upcomingCount = events.filter((event: any) => {
          const kickoff = new Date(event.commence_time);
          return kickoff > now && kickoff <= maxKickoff;
        }).length;
        results.push({ key: leagueKey, count: upcomingCount });
      }
    } catch (error) {
      console.error(`Error fetching fixtures for ${leagueKey}`, error);
      results.push({ key: leagueKey, count: 0 });
    }

    // Stagger requests: 200ms delay between each league (except the last one)
    if (i < leagueKeys.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  const counts: Record<string, number> = {};
  results.forEach((res) => {
    counts[res.key] = res.count;
  });
  return counts;
};

/**
 * Fetches odds for a single league
 */
const fetchLeagueOdds = async (
  apiKey: string,
  leagueKey: string,
): Promise<FetchResult> => {
  // h2h = 1X2
  const url = `https://api.the-odds-api.com/v4/sports/${leagueKey}/odds?apiKey=${apiKey}&regions=uk&markets=${MARKETS}&oddsFormat=decimal&bookmakers=${BOOKMAKERS}`;

  try {
    const response = await fetch(url);

    // Check for quota header
    const remainingHeader = response.headers.get("x-requests-remaining");
    const usedHeader = response.headers.get("x-requests-used");
    const remaining = remainingHeader ? parseInt(remainingHeader, 10) : null;
    const used = usedHeader ? parseInt(usedHeader, 10) : null;

    if (!response.ok) {
      if (response.status === 401) throw new Error("AUTH_ERROR");
      if (response.status === 429) {
        // Rate limit hit - wait 1s and retry once
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retryResponse = await fetch(url);

        const retryRemaining = retryResponse.headers.get(
          "x-requests-remaining",
        );
        const retryUsed = retryResponse.headers.get("x-requests-used");
        const rem = retryRemaining ? parseInt(retryRemaining, 10) : null;
        const usd = retryUsed ? parseInt(retryUsed, 10) : null;

        if (retryResponse.ok) {
          const data = await retryResponse.json();
          return { data: data as MatchResponse[], remaining: rem, used: usd };
        }

        if (retryResponse.status === 429) throw new Error("QUOTA_EXCEEDED");
        return { data: [], remaining: rem, used: usd };
      }
      console.warn(`Failed to fetch ${leagueKey}: ${response.statusText}`);
      return { data: [], remaining, used };
    }

    if (remaining !== null && remaining <= 0) {
      throw new Error("QUOTA_EXCEEDED");
    }

    const data = await response.json();
    return { data: data as MatchResponse[], remaining, used };
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === "AUTH_ERROR" || msg === "QUOTA_EXCEEDED") throw error;
    console.error(`Error fetching ${leagueKey}`, error);
    return { data: [], remaining: null, used: null };
  }
};

/**
 * Step 1: Fetch raw data from API
 */
export const fetchOddsData = async (
  apiKey: string,
  selectedLeagues: string[],
): Promise<{
  matches: MatchResponse[];
  remainingRequests: number | null;
  usedRequests: number | null;
}> => {
  const results: FetchResult[] = [];
  for (let i = 0; i < selectedLeagues.length; i++) {
    const result = await fetchLeagueOdds(apiKey, selectedLeagues[i]);
    results.push(result);

    // Stagger requests: 200ms delay between each league (except the last one)
    if (i < selectedLeagues.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  const flatMatches = results.flatMap((r) => r.data);

  const remainingCounts = results
    .map((r) => r.remaining)
    .filter((r): r is number => r !== null);
  const remainingRequests =
    remainingCounts.length > 0 ? Math.min(...remainingCounts) : null;

  const usedCounts = results
    .map((r) => r.used)
    .filter((r): r is number => r !== null);
  const usedRequests = usedCounts.length > 0 ? Math.max(...usedCounts) : null;

  return { matches: flatMatches, remainingRequests, usedRequests };
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
    const pinnacle = match.bookmakers.find(
      (b: Bookmaker) => b.key === "pinnacle",
    );

    if (!pinnacle) continue;

    const matchDate = new Date(match.commence_time);

    for (const pinnMarket of pinnacle.markets as Market[]) {
      // Get fair prices for this market from Pinnacle
      const fairPrices = stripVig(pinnMarket.outcomes as Outcome[]);
      if (!fairPrices) continue;

      // Only process h2h markets
      if (pinnMarket.key !== "h2h") continue;
      const marketName = "Match Result";

      // Iterate through each selection (outcome) in the Pinnacle market
      for (const outcome of pinnMarket.outcomes) {
        const selection = outcome.name;
        const fairPrice = fairPrices[outcome.name];

        if (!fairPrice) continue;

        // Find offers from all exchanges
        const offers: ExchangeOffer[] = [];

        for (const exConfig of EXCHANGES) {
          const exchangeBookie = match.bookmakers.find(
            (b: Bookmaker) => b.key === exConfig.key,
          );
          if (!exchangeBookie) continue;

          const exMarket = exchangeBookie.markets.find(
            (m: Market) => m.key === "h2h",
          );
          if (!exMarket) continue;

          const exOutcome = exMarket.outcomes.find(
            (o: Outcome) => o.name === outcome.name,
          );
          if (!exOutcome) continue;

          // Calculate Net Edge and Kelly considering commission
          const { netEdgePercent: netEdge, kellyPercent } = calculateBetStake({
            price: exOutcome.price,
            fairPrice,
            bankroll: 0,
            commission: exConfig.commission * 100,
            kellyFraction: 0.3,
          });

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

export interface ClosingLineResult {
  closingRawPrice: number;
  closingFairPrice: number;
  clvPercent: number;
}

/**
 * Fetches the closing line from history and calculates the Fair Closing Price
 * (Pinnacle No-Vig)
 */
export const fetchClosingLine = async (
  apiKey: string,
  bet: TrackedBet | BetEdge,
): Promise<ClosingLineResult | null> => {
  // ISO string is required for the date param
  const kickoffDate = new Date(bet.kickoff);
  const dateStr = kickoffDate.toISOString().split(".")[0] + "Z";

  const url = `https://api.the-odds-api.com/v4/sports/${bet.sportKey}/odds-history?apiKey=${apiKey}&regions=uk&markets=${MARKETS}&date=${dateStr}&bookmakers=pinnacle`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("History API failed", response.status);
      return null;
    }

    const json = (await response.json()) as HistoryResponse;
    const match = json.data.find(
      (m: MatchResponse) =>
        m.id.split(":")[0] === bet.id.split("-")[0] ||
        m.home_team === bet.homeTeam,
    );

    if (!match) return null;

    const pinnacle = match.bookmakers.find(
      (b: Bookmaker) => b.key === "pinnacle",
    );
    if (!pinnacle) return null;

    // Map market name back to key - only h2h supported
    if (bet.market !== "Match Result") return null;
    const market = pinnacle.markets.find((m: Market) => m.key === "h2h");

    if (!market) return null;

    const outcome = market.outcomes.find(
      (o: Outcome) => o.name === bet.selection,
    );
    if (!outcome) return null;

    // Calculate fair prices for the whole market at close
    const fairPrices = stripVig(market.outcomes);
    if (!fairPrices || !fairPrices[outcome.name]) return null;

    const closingFairPrice = fairPrices[outcome.name];
    const clvPercent = (bet.exchangePrice / closingFairPrice - 1) * 100;

    return {
      closingRawPrice: outcome.price,
      closingFairPrice: closingFairPrice,
      clvPercent,
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
  // Calculate daysFrom dynamically based on kickoff
  const now = Date.now();
  const kickoff = new Date(bet.kickoff).getTime();
  const diffDays = Math.ceil((now - kickoff) / (1000 * 60 * 60 * 24));
  // API limit for daysFrom is 3. We clamp between 3 and 3 (effectively always 3)
  // while keeping the calculation logic for future reference.
  const daysFrom = Math.min(3, Math.max(3, diffDays + 1));

  const url = `https://api.the-odds-api.com/v4/sports/${bet.sportKey}/scores?apiKey=${apiKey}&daysFrom=${daysFrom}`;

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
