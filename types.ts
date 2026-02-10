export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface MatchResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface HistoryResponse {
  timestamp: string;
  previous_timestamp: string;
  next_timestamp: string;
  data: MatchResponse[];
}

export interface ExchangeOffer {
  exchangeKey: string;
  exchangeName: string;
  price: number;
  netEdgePercent: number;
  kellyPercent: number;
}

export interface BetEdge {
  id: string;
  match: string;
  sport: string;
  sportKey: string;
  kickoff: Date;
  selection: string;
  market: string;

  // Best Exchange Info (for sorting/tracking)
  exchangeKey: string;
  exchangeName: string;
  exchangePrice: number;

  // All offers for this selection
  offers: ExchangeOffer[];

  fairPrice: number;
  edgePercent: number;
  netEdgePercent: number;
  kellyPercent: number; // Suggested stake % (Full Kelly) based on best offer
  homeTeam: string;
  awayTeam: string;
}

export interface TrackedBet extends BetEdge {
  placedAt: number; // Timestamp
  fairPriceAtBet: number; // Snapshot of fair price when placed
  closingRawPrice?: number; // Pinnacle raw price at kickoff
  closingFairPrice?: number; // Pinnacle no-vig price at kickoff
  clvPercent?: number; // (MyOdds / ClosingFairPrice - 1) * 100
  status: "open" | "closed";
  result?: "won" | "lost" | "void";
  homeScore?: number;
  awayScore?: number;

  hoursBeforeKickoff: number;
  timingBucket: "48hr+" | "24-48hr" | "12-24hr" | "<12hr";
  notes?: string;
  flatStake: number;
  flatPL?: number;
  kellyStake: number;
  kellyPL?: number;

  // Legacy fields for migration
  smarketsPrice?: number;
}

export interface ExchangeBankroll {
  smarkets: number;
  betfair: number;
  matchbook: number;
}

export interface BankrollTransaction {
  id: string;
  timestamp: number;
  exchange: "smarkets" | "betfair" | "matchbook";
  type:
    | "deposit"
    | "withdrawal"
    | "bet_win"
    | "bet_loss"
    | "bet_void"
    | "adjustment";
  amount: number; // positive for deposits/wins, negative for withdrawals/losses
  note?: string;
  betId?: string; // links to TrackedBet if it's from a bet
}

export interface LeagueOption {
  key: string;
  name: string;
}

export type FetchStatus = "idle" | "loading" | "success" | "error" | "no-key";
