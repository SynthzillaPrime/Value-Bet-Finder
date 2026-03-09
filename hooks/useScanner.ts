import { useState, useMemo, useCallback } from "react";
import { MatchResponse, FetchStatus } from "../types";
import { fetchOddsData, calculateEdges } from "../services/edgeFinder";
import { HARDCODED_API_KEY } from "../constants";

const STORAGE_KEY = "ods_api_key";

export const useScanner = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    if (HARDCODED_API_KEY && HARDCODED_API_KEY.length > 5)
      return HARDCODED_API_KEY;
    return null;
  });

  const [status, setStatus] = useState<FetchStatus>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const hasKey =
      stored || (HARDCODED_API_KEY && HARDCODED_API_KEY.length > 5);
    return hasKey ? "idle" : "no-key";
  });

  const [rawMatches, setRawMatches] = useState<MatchResponse[]>([]);
  const [requestsRemaining, setRequestsRemaining] = useState<number | null>(
    null,
  );
  const [requestsUsed, setRequestsUsed] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const bets = useMemo(() => {
    if (rawMatches.length === 0) return [];
    return calculateEdges(rawMatches);
  }, [rawMatches]);

  const runScan = useCallback(async () => {
    if (!apiKey) {
      setStatus("no-key");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const {
        matches,
        remainingRequests: remaining,
        usedRequests: used,
      } = await fetchOddsData(apiKey, selectedLeagues);
      setRawMatches(matches);
      setRequestsRemaining(remaining);
      setRequestsUsed(used);
      setLastUpdated(new Date());

      if (matches.length === 0) {
        setStatus("empty");
      } else {
        setStatus("idle");
      }
    } catch (error: any) {
      console.error("Scan failed:", error);
      setStatus("error");
      setErrorMessage(
        error.message ||
          "Failed to fetch odds. Check your API key or connection.",
      );
    }
  }, [apiKey, selectedLeagues]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setStatus("idle");
    setErrorMessage("");
  };

  const handleClearKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setStatus("no-key");
    setRawMatches([]);
  };

  return {
    apiKey,
    status,
    bets,
    requestsRemaining,
    requestsUsed,
    lastUpdated,
    errorMessage,
    setErrorMessage,
    selectedLeagues,
    setSelectedLeagues,
    runScan,
    handleSaveKey,
    handleClearKey,
  };
};
