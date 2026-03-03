import { createClient } from "@supabase/supabase-js";
import { TrackedBet, BankrollTransaction } from "../types";

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
  best_exchange: bet.bestExchange,
  fair_price: bet.fairPrice,
  fair_price_at_bet: bet.fairPriceAtBet,
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
  clv_percent: bet.clvPercent ?? null,
  hours_before_kickoff: bet.hoursBeforeKickoff,
  timing_bucket: bet.timingBucket,
  notes: bet.notes || null,

  kelly_stake: bet.kellyStake,
  kelly_pl: bet.kellyPL ?? null,
  base_net_edge_percent: bet.baseNetEdgePercent ?? null,
  base_kelly_percent: bet.baseKellyPercent ?? null,
  base_kelly_stake: bet.baseKellyStake ?? null,
  commission: bet.commission ?? null,
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
  exchangeKey: row.exchange_key,
  exchangeName: row.exchange_name,
  exchangePrice: Number(row.exchange_price),
  bestExchange: row.best_exchange || row.exchange_key,
  fairPrice: Number(row.fair_price),
  fairPriceAtBet: Number(row.fair_price_at_bet),
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
  clvPercent: row.clv_percent != null ? Number(row.clv_percent) : undefined,
  hoursBeforeKickoff: Number(row.hours_before_kickoff),
  timingBucket: row.timing_bucket,
  notes: row.notes || undefined,

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

// ============================================
// Bankroll Transactions — CRUD
// ============================================

const txToRow = (tx: BankrollTransaction): Record<string, any> => ({
  id: tx.id,
  timestamp: tx.timestamp,
  exchange: tx.exchange,
  type: tx.type,
  amount: tx.amount,
  note: tx.note || null,
  bet_id: tx.betId || null,
});

const rowToTx = (row: any): BankrollTransaction => ({
  id: row.id,
  timestamp: Number(row.timestamp),
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
