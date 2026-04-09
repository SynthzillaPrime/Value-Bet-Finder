import { useState, useMemo, useCallback } from "react";
import { BankrollTransaction, ExchangeBankroll } from "../types";
import {
  fetchAllTransactions,
  insertTransaction,
  updateTransaction,
} from "../services/supabase";

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
    try {
      await insertTransaction(t);
      setTransactions((prev) => [...prev, t]);
    } catch (error) {
      console.error("Failed to insert transaction:", error);
      throw error;
    }
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
    [addTransactionDirect, onError],
  );

  const updateTransactionByBetId = useCallback(
    async (
      betId: string,
      updates: { type: BankrollTransaction["type"]; amount: number },
    ) => {
      const original = transactions.find(
        (t) => t.betId === betId && t.type === "bet_placed",
      );

      if (!original) {
        console.warn(
          `No 'bet_placed' transaction found for bet ${betId}. This is expected for legacy bets.`,
        );
        return;
      }

      const updatedTx: BankrollTransaction = {
        ...original,
        ...updates,
        timestamp: Date.now(),
      };

      try {
        await updateTransaction(updatedTx);
        setTransactions((prev) =>
          prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)),
        );
      } catch (error) {
        console.error("Failed to update transaction:", error);
        throw error;
      }
    },
    [transactions],
  );

  return {
    transactions,
    exchangeBankrolls,
    bankroll,
    handleAddTransaction,
    loadTransactions,
    addTransactionDirect,
    updateTransactionByBetId,
  };
};
