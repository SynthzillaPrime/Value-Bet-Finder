import { useState, useMemo, useCallback } from "react";
import { BankrollTransaction, ExchangeBankroll } from "../types";
import { fetchAllTransactions, insertTransaction } from "../services/supabase";

export const useBankroll = (onError: (msg: string) => void) => {
  const [transactions, setTransactions] = useState<BankrollTransaction[]>([]);

  const exchangeBankrolls = useMemo(() => {
    const totals: ExchangeBankroll = { matchbook: 0, smarkets: 0 };
    transactions.forEach((t) => {
      if (totals[t.exchange] !== undefined) {
        totals[t.exchange] += t.amount;
      }
    });
    return totals;
  }, [transactions]);

  const bankroll = useMemo(() => {
    return exchangeBankrolls.matchbook + exchangeBankrolls.smarkets;
  }, [exchangeBankrolls]);

  const loadTransactions = useCallback(async () => {
    try {
      const txs = await fetchAllTransactions();
      setTransactions(txs);
      return txs;
    } catch (error) {
      console.error("Failed to load transactions:", error);
      throw error;
    }
  }, []);

  /**
   * Internal logic to persist and update state.
   * Throws error so callers can handle it.
   */
  const addTransactionDirect = useCallback(async (t: BankrollTransaction) => {
    const success = await insertTransaction(t);
    if (!success) {
      throw new Error("Failed to insert transaction into Supabase");
    }
    setTransactions((prev) => [...prev, t]);
  }, []);

  /**
   * User-facing wrapper for manual transaction entries.
   * Handles error notification internally.
   */
  const handleAddTransaction = useCallback(
    async (t: BankrollTransaction) => {
      try {
        await addTransactionDirect(t);
      } catch (error) {
        console.error("Failed to add transaction:", error);
        onError("Failed to save transaction.");
        throw error;
      }
    },
    [addTransactionDirect, onError]
  );

  return {
    transactions,
    exchangeBankrolls,
    bankroll,
    handleAddTransaction,
    loadTransactions,
    addTransactionDirect,
  };
};
