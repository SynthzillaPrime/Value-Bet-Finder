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
  { key: "soccer_fa_cup", name: "FA Cup" },
  { key: "soccer_england_efl_cup", name: "EFL Cup" },
  { key: "soccer_england_league1", name: "League One" },
  { key: "soccer_england_league2", name: "League Two" },
  { key: "soccer_spain_segunda_division", name: "La Liga 2" },
  { key: "soccer_germany_bundesliga2", name: "Bundesliga 2" },
  { key: "soccer_italy_serie_b", name: "Serie B" },
  { key: "soccer_france_ligue_two", name: "Ligue 2" },
  { key: "soccer_portugal_primeira_liga", name: "Primeira Liga" },
  { key: "soccer_netherlands_eredivisie", name: "Eredivisie" },
  { key: "soccer_spl", name: "Scottish Premiership" },
  { key: "soccer_uefa_europa_conference_league", name: "Conference League" },
];

export const EXCHANGES = [
  { key: "smarkets", name: "Smarkets", commission: 0.02 },
  { key: "betfair_ex_uk", name: "Betfair", commission: 0.05 },
  { key: "matchbook", name: "Matchbook", commission: 0.015 },
];

export const BOOKMAKERS = `pinnacle,${EXCHANGES.map((e) => e.key).join(",")}`;
export const MARKETS = "h2h,totals,spreads";
