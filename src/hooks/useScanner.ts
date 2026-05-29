import { useState, useMemo, useCallback } from "react";
import { MatchResponse, FetchStatus } from "../types";
import {
  fetchOddsData,
  calculateEdges,
  fetchLeagueFixtureCounts,
} from "../services/edgeFinder";
import { findArbitrageOpportunities } from "../services/arbFinder";
import { LEAGUES, HARDCODED_API_KEY } from "../constants";

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
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [fixtureCounts, setFixtureCounts] = useState<Record<string, number>>(
    {},
  );
  const [isCheckingFixtures, setIsCheckingFixtures] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [arbMatches, setArbMatches] = useState<MatchResponse[]>([]);

  const bets = useMemo(() => {
    if (rawMatches.length === 0) return [];
    return calculateEdges(rawMatches);
  }, [rawMatches]);

  const arbs = useMemo(() => {
    if (arbMatches.length === 0) return [];
    const results = findArbitrageOpportunities(arbMatches);
    console.log(`Arb scan complete: found ${results.length} arbs`, results);
    return results;
  }, [arbMatches]);

  const runScan = useCallback(async () => {
    if (!apiKey) {
      setStatus("no-key");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // 1. Value Bet Scan (Football/Selected Leagues)
      const hasFixtureData = Object.keys(fixtureCounts).length > 0;
      const activeSelected = hasFixtureData
        ? selectedLeagues.filter((key) => (fixtureCounts[key] || 0) > 0)
        : selectedLeagues;

      if (activeSelected.length > 0 || selectedLeagues.length === 0) {
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

        if (matches.length === 0 && activeSelected.length > 0) {
          setStatus("empty");
        } else {
          setStatus("idle");
        }
      }

      // 2. Dedicated Arb Scan (Tennis/US Sports)
      const usSportKeys = [
        "americanfootball_nfl",
        "basketball_nba",
        "icehockey_nhl",
      ];

      try {
        // Dynamically discover active tennis tournament keys
        const sportsUrl = `https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`;
        const sportsResponse = await fetch(sportsUrl);
        let tennisKeys: string[] = [];

        if (sportsResponse.ok) {
          const allSports = (await sportsResponse.json()) as any[];
          tennisKeys = allSports
            .filter((s: any) => s.group === "Tennis" && s.active === true)
            .map((s: any) => s.key);
        }

        const arbSportKeys = [...tennisKeys, ...usSportKeys];

        // Dedicated arb fetch with regions=uk,eu to capture Smarkets/Matchbook
        const arbResults: MatchResponse[] = [];
        const now = new Date();

        for (const key of arbSportKeys) {
          const url = `https://api.the-odds-api.com/v4/sports/${key}/odds?apiKey=${apiKey}&regions=uk,eu&markets=h2h&oddsFormat=decimal&bookmakers=matchbook,smarkets`;
          const res = await fetch(url);
          if (res.ok) {
            const data = (await res.json()) as MatchResponse[];
            const preMatchCount = data.filter(
              (m) => new Date(m.commence_time) > now,
            ).length;
            console.log(
              `Arb Fetch [${key}]: ${preMatchCount} pre-match events`,
            );
            arbResults.push(...data);
          }
        }
        setArbMatches(arbResults);
      } catch (arbErr) {
        console.error("Arb-specific fetch failed:", arbErr);
        // Continue without failing the main scan
      }

      setLastUpdated(new Date());
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
    arbs,
  };
};
