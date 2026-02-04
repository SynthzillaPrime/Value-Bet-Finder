import { LeagueOption } from "./types";

// ----------------------------------------------------------------------
// OPTIONAL: PASTE YOUR API KEY BELOW TO SKIP THE INPUT SCREEN
// Example: export const HARDCODED_API_KEY = "abc123456...";
// ----------------------------------------------------------------------
export const HARDCODED_API_KEY: string =
  import.meta.env.VITE_ODDS_API_KEY || "";

export const LEAGUES: LeagueOption[] = [
  { key: "soccer_epl", name: "Premier League" },
  { key: "soccer_efl_champ", name: "Championship" },
  { key: "soccer_spain_la_liga", name: "La Liga" },
  { key: "soccer_germany_bundesliga", name: "Bundesliga" },
  { key: "soccer_italy_serie_a", name: "Serie A" },
  { key: "soccer_france_ligue_one", name: "Ligue 1" },
  { key: "soccer_uefa_champs_league", name: "Champions League" },
  { key: "soccer_uefa_europa_league", name: "Europa League" },
  { key: "americanfootball_nfl", name: "NFL" },
  { key: "basketball_nba", name: "NBA" },
  { key: "baseball_mlb", name: "MLB" },
  { key: "icehockey_nhl", name: "NHL" },
  { key: "mma_mixed_martial_arts", name: "UFC/MMA" },
];

export const EXCHANGES = [
  { key: "smarkets", name: "Smarkets", commission: 0.02 },
  { key: "betfair_ex_uk", name: "Betfair", commission: 0.05 },
  { key: "matchbook", name: "Matchbook", commission: 0.015 },
];

export const BOOKMAKERS = `pinnacle,${EXCHANGES.map((e) => e.key).join(",")}`;
export const MIN_EDGE = 0; // Configurable minimum edge
