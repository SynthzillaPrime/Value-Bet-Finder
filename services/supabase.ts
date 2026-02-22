import { createClient } from "@supabase/supabase-js";
import { TrackedBet, BankrollTransaction } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// PIN Authentication
// ============================================

const PIN_STORAGE_KEY = "vbf_pin_session";

/**
 * Check if a PIN has been set up in Supabase
 */
export const isPinSetUp = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "pin_hash")
    .single();

  if (error || !data) return false;
  return true;
};

/**
 * Simple hash for PIN (not cryptographically strong, but fine for this use case)
 */
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "pin_" + Math.abs(hash).toString(36);
};

/**
 * Set the PIN for first-time setup
 */
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

/**
 * Verify a PIN attempt
 */
export const verifyPin = async (pin: string): Promise<boolean> => {
  const hashed = hashPin(pin);

  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "pin_hash")
    .single();

  if (error || !data) return false;

  const isValid = data.value === hashed;
  if (isValid) {
    localStorage.setItem(PIN_STORAGE_KEY, hashed);
  }
  return isValid;
};

/**
 * Check if the current session is authenticated (PIN previously verified)
 */
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

/**
 * Clear the session (logout)
 */
export const clearSession = () => {
  localStorage.removeItem(PIN_STORAGE_KEY);
};

// ============================================
// Tracked Bets — CRUD
// ============================================

/**
 * Convert a TrackedBet to a Supabase row (camelCase → snake_case)
 */
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
  flat_stake: bet.flatStake,
  flat_pl: bet.flatPL ?? null,
  kelly_stake: bet.kellyStake,
  kelly_pl: bet.kellyPL ?? null,
});

/**
 * Convert a Supabase row back to a TrackedBet (snake_case → camelCase)
 */
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
  closingRawPrice: row.closing_raw_price != null ? Number(row.closing_raw_price) : undefined,
  closingFairPrice: row.closing_fair_price != null ? Number(row.closing_fair_price) : undefined,
  clvPercent: row.clv_percent != null ? Number(row.clv_percent) : undefined,
  hoursBeforeKickoff: Number(row.hours_before_kickoff),
  timingBucket: row.timing_bucket,
  notes: row.notes || undefined,
  flatStake: Number(row.flat_stake),
  flatPL: row.flat_pl != null ? Number(row.flat_pl) : undefined,
  kellyStake: Number(row.kelly_stake),
  kellyPL: row.kelly_pl != null ? Number(row.kelly_pl) : undefined,
});

/**
 * Fetch all tracked bets from Supabase
 */
export const fetchAllBets = async (): Promise<TrackedBet[]> => {
  const { data, error } = await supabase
    .from("tracked_bets")
    .select("*")
    .order("placed_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch bets", error);
    return [];
  }

  return (data || []).map(rowToBet);
};

/**
 * Insert a new tracked bet
 */
export const insertBet = async (bet: TrackedBet): Promise<boolean> => {
  const { error } = await supabase.from("tracked_bets").insert(betToRow(bet));

  if (error) {
    console.error("Failed to insert bet", error);
    return false;
  }
  return true;
};

/**
 * Insert multiple bets (for CSV import)
 */
export const insertBets = async (bets: TrackedBet[]): Promise<boolean> => {
  const rows = bets.map(betToRow);
  const { error } = await supabase.from("tracked_bets").insert(rows);

  if (error) {
    console.error("Failed to insert bets", error);
    return false;
  }
  return true;
};

/**
 * Update an existing tracked bet
 */
export const updateBet = async (bet: TrackedBet): Promise<boolean> => {
  const { error } = await supabase
    .from("tracked_bets")
    .update(betToRow(bet))
    .eq("id", bet.id);

  if (error) {
    console.error("Failed to update bet", error);
    return false;
  }
  return true;
};

/**
 * Delete a tracked bet
 */
export const deleteBet = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from("tracked_bets")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete bet", error);
    return false;
  }
  return true;
};

// ============================================
// Bankroll Transactions — CRUD
// ============================================

/**
 * Convert a BankrollTransaction to a Supabase row
 */
const txToRow = (tx: BankrollTransaction): Record<string, any> => ({
  id: tx.id,
  timestamp: tx.timestamp,
  exchange: tx.exchange,
  type: tx.type,
  amount: tx.amount,
  note: tx.note || null,
  bet_id: tx.betId || null,
});

/**
 * Convert a Supabase row back to a BankrollTransaction
 */
const rowToTx = (row: any): BankrollTransaction => ({
  id: row.id,
  timestamp: Number(row.timestamp),
  exchange: row.exchange,
  type: row.type,
  amount: Number(row.amount),
  note: row.note || undefined,
  betId: row.bet_id || undefined,
});

/**
 * Fetch all transactions from Supabase
 */
export const fetchAllTransactions = async (): Promise<BankrollTransaction[]> => {
  const { data, error } = await supabase
    .from("bankroll_transactions")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Failed to fetch transactions", error);
    return [];
  }

  return (data || []).map(rowToTx);
};

/**
 * Insert a new transaction
 */
export const insertTransaction = async (tx: BankrollTransaction): Promise<boolean> => {
  const { error } = await supabase
    .from("bankroll_transactions")
    .insert(txToRow(tx));

  if (error) {
    console.error("Failed to insert transaction", error);
    return false;
  }
  return true;
};

/**
 * Insert multiple transactions (for CSV import)
 */
export const insertTransactions = async (txs: BankrollTransaction[]): Promise<boolean> => {
  const rows = txs.map(txToRow);
  const { error } = await supabase
    .from("bankroll_transactions")
    .insert(rows);

  if (error) {
    console.error("Failed to insert transactions", error);
    return false;
  }
  return true;
};

// ============================================
// Migration: localStorage → Supabase
// ============================================

/**
 * One-time migration of existing localStorage data to Supabase
 */
export const migrateLocalStorageToSupabase = async (): Promise<{
  bets: number;
  transactions: number;
}> => {
  let betsMigrated = 0;
  let txMigrated = 0;

  // Migrate bets
  const storedBets = localStorage.getItem("tracked_bets");
  if (storedBets) {
    try {
      const parsed = JSON.parse(storedBets);
      const bets: TrackedBet[] = parsed.map((b: any) => ({
        ...b,
        kickoff: new Date(b.kickoff),
        exchangeName: b.exchangeName || "Smarkets",
        exchangeKey: b.exchangeKey || "smarkets",
        exchangePrice: b.exchangePrice || b.smarketsPrice || 0,
      }));

      if (bets.length > 0) {
        // Check if Supabase already has data
        const { data: existing } = await supabase
          .from("tracked_bets")
          .select("id")
          .limit(1);

        if (!existing || existing.length === 0) {
          const success = await insertBets(bets);
          if (success) {
            betsMigrated = bets.length;
            // Don't delete localStorage yet — keep as backup
          }
        }
      }
    } catch (e) {
      console.error("Failed to migrate bets", e);
    }
  }

  // Migrate transactions
  const storedTx = localStorage.getItem("bankroll_transactions");
  if (storedTx) {
    try {
      const txs: BankrollTransaction[] = JSON.parse(storedTx);

      if (txs.length > 0) {
        const { data: existing } = await supabase
          .from("bankroll_transactions")
          .select("id")
          .limit(1);

        if (!existing || existing.length === 0) {
          const success = await insertTransactions(txs);
          if (success) {
            txMigrated = txs.length;
          }
        }
      }
    } catch (e) {
      console.error("Failed to migrate transactions", e);
    }
  }

  return { bets: betsMigrated, transactions: txMigrated };
};
