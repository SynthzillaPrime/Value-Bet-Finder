import { useState, useMemo, useCallback } from "react";
import { MatchResponse, FetchStatus } from "../types";
import {
  fetchOddsData,
  calculateEdges,
  fetchLeagueFixtureCounts,
} from "../services/edgeFinder";
import { LEAGUES } from "../constants";
import { HARDCODED_API_KEY } from "../constants";

const STORAGE_KEY = "ods_api_key";

export const useScanner = () => {
  const [apiKey, setApiKeyInternal] = useState<string | null>(() => {
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
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(() =>
    LEAGUES.filter((l) => l.group === "Top European").map((l) => l.key),
  );
  const [fixtureCounts, setFixtureCounts] = useState<Record<string, number>>(
    {},
  );
  const [isCheckingFixtures, setIsCheckingFixtures] = useState(false);
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
      // Filter selected leagues to only those with known fixtures (if counts are loaded)
      const hasFixtureData = Object.keys(fixtureCounts).length > 0;
      const activeSelected = hasFixtureData
        ? selectedLeagues.filter((key) => (fixtureCounts[key] || 0) > 0)
        : selectedLeagues;

      if (activeSelected.length === 0 && selectedLeagues.length > 0) {
        setRawMatches([]);
        setStatus("empty");
        return;
      }

      const {
        matches,
        remainingRequests: remaining,
        usedRequests: used,
      } = await fetchOddsData(
        apiKey,
        activeSelected.length > 0 ? activeSelected : selectedLeagues,
      );
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

  const setApiKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKeyInternal(key);
    setStatus("idle");
    setErrorMessage("");
  };

  const loadFixtureCounts = useCallback(async () => {
    if (!apiKey) return;
    setIsCheckingFixtures(true);
    try {
      const allLeagueKeys = LEAGUES.map((l) => l.key);
      const counts = await fetchLeagueFixtureCounts(apiKey, allLeagueKeys);
      setFixtureCounts(counts);
    } catch (error) {
      console.error("Failed to load fixture counts:", error);
    } finally {
      setIsCheckingFixtures(false);
    }
  }, [apiKey]);

  const handleClearKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyInternal(null);
    setStatus("no-key");
    setRawMatches([]);
  };

  return {
    apiKey,
    status,
    bets,
    requestsRemaining,
    requestsUsed,
    fixtureCounts,
    isCheckingFixtures,
    loadFixtureCounts,
    lastUpdated,
    errorMessage,
    setErrorMessage,
    selectedLeagues,
    setSelectedLeagues,
    runScan,
    setApiKey,
    handleClearKey,
  };
};
