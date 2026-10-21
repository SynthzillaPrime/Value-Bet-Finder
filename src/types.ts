export interface AccaOffer {
  bookmaker: string;
  minLegs: number;
  minLegOdds: number;
  refundType: "cash" | "free_bet";
  refundCap: number;
  freeBetValue: number; // e.g., 0.75 for 75% conversion
  bonusByLegs: Record<number, number>; // e.g., { 5: 0.05, 6: 0.1 }
  defaultStake: number;
}

export interface AccaLegCandidate {
  id: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  selection: string;
  pinnacleFair: number;
  pinnacleProb: number;
  refPrice: number | null;
  refBookmaker: string | null;
  valueRatio: number | null;
}

export interface AccaEstimate {
  combinedOdds: number;
  probAllWin: number;
  probExactlyOneLoses: number;
  winPayout: number; // stake * combinedOdds
  bonusAmount: number;
  totalWinReturn: number; // winPayout + bonusAmount
  refundAmount: number;
  expectedReturn: number;
  expectedProfit: number;
  evPercent: number;
}

export interface AccaLeg {
  selection: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  sportKey: string;
  kickoff: Date;
  odds: number;
  refPrice: number | null;
  pinnacleFair: number;
  valueRatio: number | null;
  result: "won" | "lost" | null;
}

export interface PaperAcca {
  id: string;
  createdAt: string;
  season: string;
  bookmaker: string;
  offerType: string;
  offerTerms: any;
  refundCap: number;
  stake: number;
  legs: AccaLeg[];
  numLegs: number;
  combinedOdds: number;
  firstKickoff: Date;
  status: "open" | "won" | "lost" | "refunded" | "void";
  returns: number | null;
  freeBetFace: number | null;
  freeBetValue: number | null;
  netPl: number | null;
  notes: string | null;
  source: string;
  estEv: number | null;
  estPWin: number | null;
  estPRefund: number | null;
}

/**
 * Application-wide type definitions.
 */
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
  pinnaclePricesAtBet?: { home: number; draw: number; away: number };
  betfairPrice?: number;
}

export interface TrackedBet extends BetEdge {
  placedAt: number; // Timestamp
  fairPriceAtBet: number; // Snapshot of fair price when placed
  season: string;
  closingRawPrice?: number; // Pinnacle raw price at kickoff
  closingFairPrice?: number; // Pinnacle no-vig price at kickoff
  closingPinnaclePrices?: { home: number; draw: number; away: number };
  clvPercent?: number; // (MyOdds / ClosingFairPrice - 1) * 100
  status: "open" | "closed";
  result?: "won" | "lost" | "void";
  homeScore?: number;
  awayScore?: number;

  hoursBeforeKickoff: number;
  timingBucket: "48hr+" | "24-48hr" | "12-24hr" | "<12hr";
  notes?: string;

  flatStake?: number;
  kellyStake: number;
  kellyPL?: number;

  // Base edge/kelly calculated at permanent 2% commission — used for analysis
  baseNetEdgePercent?: number;
  baseKellyPercent?: number;
  baseKellyStake?: number;

  // Commission rate applied to this specific bet (percentage, e.g. 0, 0.75, 2)
  // This is on NET WINNINGS only — you pay nothing on losses
  commission?: number;

  // Legacy fields for migration
  smarketsPrice?: number;
}

export interface ExchangeBankroll {
  matchbook: number;
  smarkets: number;
}

export interface BankrollTransaction {
  id: string;
  timestamp: number;
  season: string;
  exchange: "matchbook" | "smarkets";
  type:
    | "deposit"
    | "withdrawal"
    | "bet_win"
    | "bet_loss"
    | "bet_void"
    | "bet_placed"
    | "adjustment";
  amount: number; // positive for deposits/wins, negative for withdrawals/losses
  note?: string;
  betId?: string; // links to TrackedBet if it's from a bet
}

export interface LeagueOption {
  key: string;
  name: string;
  group: string;
}

export type FetchStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "no-key"
  | "empty";
