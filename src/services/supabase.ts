import { createClient } from "@supabase/supabase-js";
import { TrackedBet, BankrollTransaction, PaperAcca } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// PIN Authentication
// ============================================

const PIN_STORAGE_KEY = "vbf_pin_session";

export const isPinSetUp = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "pin_hash")
    .single();
  if (error || !data) return false;
  return true;
};

const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "pin_" + Math.abs(hash).toString(36);
};

export const setPin = async (pin: string): Promise<boolean> => {
  const hashed = hashPin(pin);
  const { error } = await supabase.from("app_config").upsert({
    key: "pin_hash",
    value: hashed,
  });
  if (error) {
    console.error("Failed to set PIN", error);
    return false;
  }
  localStorage.setItem(PIN_STORAGE_KEY, hashed);
  return true;
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  const hashed = hashPin(pin);
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "pin_hash")
    .single();
  if (error || !data) return false;
  const isValid = data.value === hashed;
  if (isValid) localStorage.setItem(PIN_STORAGE_KEY, hashed);
  return isValid;
};

export const isSessionValid = async (): Promise<boolean> => {
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  if (!storedHash) return false;
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "pin_hash")
    .single();
  if (error || !data) return false;
  return data.value === storedHash;
};

export const clearSession = () => {
  localStorage.removeItem(PIN_STORAGE_KEY);
};

// ============================================
// Tracked Bets — CRUD
// ============================================

const betToRow = (bet: TrackedBet): Record<string, any> => ({
  id: bet.id,
  match: `${bet.homeTeam} vs ${bet.awayTeam}`,
  home_team: bet.homeTeam,
  away_team: bet.awayTeam,
  sport: bet.sport,
  sport_key: bet.sportKey,
  selection: bet.selection,
  market: bet.market,
  exchange_key: bet.exchangeKey,
  exchange_name: bet.exchangeName,
  exchange_price: bet.exchangePrice,
  fair_price: bet.fairPrice,
  fair_price_at_bet: bet.fairPriceAtBet,
  season: bet.season,
  edge_percent: bet.edgePercent,
  net_edge_percent: bet.netEdgePercent,
  kelly_percent: bet.kellyPercent,
  offers: bet.offers || [],
  kickoff: new Date(bet.kickoff).toISOString(),
  placed_at: bet.placedAt,
  status: bet.status,
  result: bet.result || null,
  home_score: bet.homeScore ?? null,
  away_score: bet.awayScore ?? null,
  closing_raw_price: bet.closingRawPrice ?? null,
  closing_fair_price: bet.closingFairPrice ?? null,
  closing_pinnacle_prices: bet.closingPinnaclePrices ?? null,
  clv_percent: bet.clvPercent ?? null,
  hours_before_kickoff: bet.hoursBeforeKickoff,
  timing_bucket: bet.timingBucket,
  notes: bet.notes || null,

  flat_stake: bet.flatStake ?? 1,
  kelly_stake: bet.kellyStake,
  kelly_pl: bet.kellyPL ?? null,
  base_net_edge_percent: bet.baseNetEdgePercent ?? null,
  base_kelly_percent: bet.baseKellyPercent ?? null,
  base_kelly_stake: bet.baseKellyStake ?? null,
  commission: bet.commission ?? null,
  pinnacle_prices_at_bet: bet.pinnaclePricesAtBet ?? null,
  betfair_price: bet.betfairPrice ?? null,
});

const rowToBet = (row: any): TrackedBet => ({
  id: row.id,
  match: row.match,
  homeTeam: row.home_team,
  awayTeam: row.away_team,
  sport: row.sport,
  sportKey: row.sport_key,
  selection: row.selection,
  market: row.market,
  exchangeKey: row.exchange_key || row.exchange,
  exchangeName: row.exchange_name,
  exchangePrice: Number(row.exchange_price),
  fairPrice: Number(row.fair_price),
  fairPriceAtBet: Number(row.fair_price_at_bet),
  season: row.season,
  edgePercent: Number(row.edge_percent),
  netEdgePercent: Number(row.net_edge_percent),
  kellyPercent: Number(row.kelly_percent),
  offers: row.offers || [],
  kickoff: new Date(row.kickoff),
  placedAt: Number(row.placed_at),
  status: row.status,
  result: row.result || undefined,
  homeScore: row.home_score ?? undefined,
  awayScore: row.away_score ?? undefined,
  closingRawPrice:
    row.closing_raw_price != null ? Number(row.closing_raw_price) : undefined,
  closingFairPrice:
    row.closing_fair_price != null ? Number(row.closing_fair_price) : undefined,
  closingPinnaclePrices: row.closing_pinnacle_prices ?? undefined,
  clvPercent: row.clv_percent != null ? Number(row.clv_percent) : undefined,
  hoursBeforeKickoff: Number(row.hours_before_kickoff),
  timingBucket: row.timing_bucket,
  notes: row.notes || undefined,

  flatStake: Number(row.flat_stake ?? 1),
  kellyStake: Number(row.kelly_stake),
  kellyPL: row.kelly_pl != null ? Number(row.kelly_pl) : undefined,
  baseNetEdgePercent:
    row.base_net_edge_percent != null
      ? Number(row.base_net_edge_percent)
      : undefined,
  baseKellyPercent:
    row.base_kelly_percent != null ? Number(row.base_kelly_percent) : undefined,
  baseKellyStake:
    row.base_kelly_stake != null ? Number(row.base_kelly_stake) : undefined,
  commission: row.commission != null ? Number(row.commission) : undefined,
  pinnaclePricesAtBet: row.pinnacle_prices_at_bet ?? undefined,
  betfairPrice: row.betfair_price != null ? Number(row.betfair_price) : undefined,
});

export const fetchAllBets = async (): Promise<TrackedBet[]> => {
  const { data, error } = await supabase
    .from("tracked_bets")
    .select("*")
    .order("placed_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch bets: " + error.message);
  }

  return (data || []).map(rowToBet);
};

export const insertBet = async (bet: TrackedBet): Promise<void> => {
  const { error } = await supabase.from("tracked_bets").insert(betToRow(bet));
  if (error) {
    throw new Error("Failed to insert bet: " + error.message);
  }
};

export const updateBet = async (bet: TrackedBet): Promise<void> => {
  const { error } = await supabase
    .from("tracked_bets")
    .update(betToRow(bet))
    .eq("id", bet.id);
  if (error) {
    throw new Error("Failed to update bet: " + error.message);
  }
};

export const deleteBet = async (id: string): Promise<void> => {
  const { error } = await supabase.from("tracked_bets").delete().eq("id", id);
  if (error) {
    throw new Error("Failed to delete bet: " + error.message);
  }
};

export const deleteTransactionByBetId = async (betId: string): Promise<void> => {
  const { error } = await supabase
    .from("bankroll_transactions")
    .delete()
    .eq("bet_id", betId);

  if (error) {
    throw new Error("Failed to delete transaction: " + error.message);
  }
};

// ============================================
// Bankroll Transactions — CRUD
// ============================================

const txToRow = (tx: BankrollTransaction): Record<string, any> => ({
  id: tx.id,
  timestamp: tx.timestamp,
  season: tx.season,
  exchange: tx.exchange,
  type: tx.type,
  amount: tx.amount,
  note: tx.note || null,
  bet_id: tx.betId || null,
});

const rowToTx = (row: any): BankrollTransaction => ({
  id: row.id,
  timestamp: Number(row.timestamp),
  season: row.season,
  exchange: row.exchange || "matchbook",
  type: row.type,
  amount: Number(row.amount),
  note: row.note || undefined,
  betId: row.bet_id || undefined,
});

export const fetchAllTransactions = async (): Promise<
  BankrollTransaction[]
> => {
  const { data, error } = await supabase
    .from("bankroll_transactions")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch transactions: " + error.message);
  }

  return (data || []).map(rowToTx);
};

export const insertTransaction = async (
  tx: BankrollTransaction,
): Promise<void> => {
  const { error } = await supabase
    .from("bankroll_transactions")
    .insert(txToRow(tx));

  if (error) {
    throw new Error("Failed to insert transaction: " + error.message);
  }
};

export const updateTransaction = async (
  tx: BankrollTransaction,
): Promise<void> => {
  const { error } = await supabase
    .from("bankroll_transactions")
    .update(txToRow(tx))
    .eq("id", tx.id);

  if (error) {
    throw new Error("Failed to update transaction: " + error.message);
  }
};

// ============================================
// Paper Accas — CRUD
// ============================================

const accaToRow = (acca: PaperAcca): Record<string, any> => ({
  id: acca.id,
  created_at: acca.createdAt,
  season: acca.season,
  bookmaker: acca.bookmaker,
  offer_type: acca.offerType,
  offer_terms: acca.offerTerms,
  refund_cap: acca.refundCap,
  stake: acca.stake,
  legs: acca.legs.map((leg) => ({
    ...leg,
    kickoff: new Date(leg.kickoff).toISOString(),
  })),
  num_legs: acca.numLegs,
  combined_odds: acca.combinedOdds,
  first_kickoff: new Date(acca.firstKickoff).toISOString(),
  status: acca.status,
  returns: acca.returns,
  free_bet_face: acca.freeBetFace,
  free_bet_value: acca.freeBetValue,
  net_pl: acca.netPl,
  notes: acca.notes,
  source: acca.source,
  est_ev: acca.estEv,
  est_p_win: acca.estPWin,
  est_p_refund: acca.estPRefund,
});

const rowToAcca = (row: any): PaperAcca => ({
  id: row.id,
  createdAt: row.created_at,
  season: row.season,
  bookmaker: row.bookmaker,
  offerType: row.offer_type,
  offerTerms: row.offer_terms,
  refundCap: Number(row.refund_cap),
  stake: Number(row.stake),
  legs: (row.legs || []).map((leg: any) => ({
    ...leg,
    kickoff: new Date(leg.kickoff),
    odds: Number(leg.odds),
    refPrice: leg.refPrice != null ? Number(leg.refPrice) : null,
    pinnacleFair: Number(leg.pinnacleFair),
    valueRatio: leg.valueRatio != null ? Number(leg.valueRatio) : null,
  })),
  numLegs: Number(row.num_legs),
  combinedOdds: Number(row.combined_odds),
  firstKickoff: new Date(row.first_kickoff),
  status: row.status,
  returns: row.returns != null ? Number(row.returns) : null,
  freeBetFace: row.free_bet_face != null ? Number(row.free_bet_face) : null,
  freeBetValue: row.free_bet_value != null ? Number(row.free_bet_value) : null,
  netPl: row.net_pl != null ? Number(row.net_pl) : null,
  notes: row.notes,
  source: row.source,
  estEv: row.est_ev != null ? Number(row.est_ev) : null,
  estPWin: row.est_p_win != null ? Number(row.est_p_win) : null,
  estPRefund: row.est_p_refund != null ? Number(row.est_p_refund) : null,
} as PaperAcca);

export const fetchPaperAccas = async (): Promise<PaperAcca[]> => {
  const { data, error } = await supabase
    .from("paper_accas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch accas: " + error.message);
  }

  return (data || []).map(rowToAcca);
};

export const insertPaperAcca = async (acca: PaperAcca): Promise<void> => {
  const { error } = await supabase.from("paper_accas").insert(accaToRow(acca));
  if (error) {
    throw new Error("Failed to insert acca: " + error.message);
  }
};

export const updatePaperAcca = async (
  id: string,
  fields: Partial<PaperAcca>,
): Promise<void> => {
  // Convert fields to snake_case row format
  const rowUpdates: Record<string, any> = {};

  if (fields.season !== undefined) rowUpdates.season = fields.season;
  if (fields.bookmaker !== undefined) rowUpdates.bookmaker = fields.bookmaker;
  if (fields.offerType !== undefined) rowUpdates.offer_type = fields.offerType;
  if (fields.offerTerms !== undefined) rowUpdates.offer_terms = fields.offerTerms;
  if (fields.refundCap !== undefined) rowUpdates.refund_cap = fields.refundCap;
  if (fields.stake !== undefined) rowUpdates.stake = fields.stake;
  if (fields.legs !== undefined) {
    rowUpdates.legs = fields.legs.map((leg) => ({
      ...leg,
      kickoff: new Date(leg.kickoff).toISOString(),
    }));
  }
  if (fields.numLegs !== undefined) rowUpdates.num_legs = fields.numLegs;
  if (fields.combinedOdds !== undefined)
    rowUpdates.combined_odds = fields.combinedOdds;
  if (fields.firstKickoff !== undefined)
    rowUpdates.first_kickoff = new Date(fields.firstKickoff).toISOString();
  if (fields.status !== undefined) rowUpdates.status = fields.status;
  if (fields.returns !== undefined) rowUpdates.returns = fields.returns;
  if (fields.freeBetFace !== undefined)
    rowUpdates.free_bet_face = fields.freeBetFace;
  if (fields.freeBetValue !== undefined)
    rowUpdates.free_bet_value = fields.freeBetValue;
  if (fields.netPl !== undefined) rowUpdates.net_pl = fields.netPl;
  if (fields.notes !== undefined) rowUpdates.notes = fields.notes;
  if (fields.source !== undefined) rowUpdates.source = fields.source;
  if (fields.estEv !== undefined) rowUpdates.est_ev = fields.estEv;
  if (fields.estPWin !== undefined) rowUpdates.est_p_win = fields.estPWin;
  if (fields.estPRefund !== undefined)
    rowUpdates.est_p_refund = fields.estPRefund;

  const { error } = await supabase
    .from("paper_accas")
    .update(rowUpdates)
    .eq("id", id);

  if (error) {
    throw new Error("Failed to update acca: " + error.message);
  }
};
