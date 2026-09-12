import { LeagueOption } from "./types";

// ----------------------------------------------------------------------
// OPTIONAL: PASTE YOUR API KEY BELOW TO SKIP THE INPUT SCREEN
// Example: export const HARDCODED_API_KEY = "abc123456...";
// ----------------------------------------------------------------------
export const HARDCODED_API_KEY: string =
  import.meta.env.VITE_ODDS_API_KEY || "";

export const CURRENT_SEASON: string = "2026/27";

export const LEAGUES: LeagueOption[] = [
  // Top European
  { key: "soccer_epl", name: "Premier League", group: "Top European" },
  { key: "soccer_spain_la_liga", name: "La Liga", group: "Top European" },
  {
    key: "soccer_germany_bundesliga",
    name: "Bundesliga",
    group: "Top European",
  },
  { key: "soccer_italy_serie_a", name: "Serie A", group: "Top European" },
  { key: "soccer_france_ligue_one", name: "Ligue 1", group: "Top European" },
  {
    key: "soccer_portugal_primeira_liga",
    name: "Primeira Liga",
    group: "Top European",
  },
  {
    key: "soccer_netherlands_eredivisie",
    name: "Eredivisie",
    group: "Top European",
  },
  { key: "soccer_spl", name: "Scottish Premiership", group: "Top European" },
  { key: "soccer_efl_champ", name: "Championship", group: "Top European" },
  {
    key: "soccer_germany_bundesliga2",
    name: "Bundesliga 2",
    group: "Top European",
  },
  { key: "soccer_italy_serie_b", name: "Serie B", group: "Top European" },
  { key: "soccer_france_ligue_two", name: "Ligue 2", group: "Top European" },
  { key: "soccer_england_league1", name: "League One", group: "Top European" },
  { key: "soccer_england_league2", name: "League Two", group: "Top European" },
  {
    key: "soccer_uefa_champs_league",
    name: "Champions League",
    group: "Top European",
  },
  {
    key: "soccer_uefa_europa_league",
    name: "Europa League",
    group: "Top European",
  },
  { key: "soccer_fa_cup", name: "FA Cup", group: "Top European" },

  // Other European
  {
    key: "soccer_austria_bundesliga",
    name: "Austrian Bundesliga",
    group: "Other European",
  },
  {
    key: "soccer_belgium_first_div",
    name: "Belgian First Div",
    group: "Other European",
  },
  {
    key: "soccer_denmark_superliga",
    name: "Denmark Superliga",
    group: "Other European",
  },
  {
    key: "soccer_greece_super_league",
    name: "Greek Super League",
    group: "Other European",
  },
  {
    key: "soccer_poland_ekstraklasa",
    name: "Ekstraklasa (Poland)",
    group: "Other European",
  },
  {
    key: "soccer_sweden_allsvenskan",
    name: "Allsvenskan (Sweden)",
    group: "Other European",
  },
  {
    key: "soccer_turkey_super_league",
    name: "Turkey Super League",
    group: "Other European",
  },

  // Rest of World
  {
    key: "soccer_argentina_primera_division",
    name: "Primera División (Argentina)",
    group: "Rest of World",
  },
  { key: "soccer_australia_aleague", name: "A-League", group: "Rest of World" },
  {
    key: "soccer_brazil_campeonato",
    name: "Brazil Série A",
    group: "Rest of World",
  },
  {
    key: "soccer_brazil_serie_b",
    name: "Brazil Série B",
    group: "Rest of World",
  },
  {
    key: "soccer_chile_campeonato",
    name: "Primera División (Chile)",
    group: "Rest of World",
  },
  {
    key: "soccer_china_superleague",
    name: "Chinese Super League",
    group: "Rest of World",
  },
  {
    key: "soccer_conmebol_copa_libertadores",
    name: "Copa Libertadores",
    group: "Rest of World",
  },
  {
    key: "soccer_conmebol_copa_sudamericana",
    name: "Copa Sudamericana",
    group: "Rest of World",
  },
  { key: "soccer_usa_mls", name: "MLS", group: "Rest of World" },
];

// Commission rates used by the SCANNER for edge calculation display.
// Actual commission per bet is set by the user at track time.
// Matchbook: 2% standard
// Smarkets: 2% standard (used as market validator only, not for betting)
export const EXCHANGES = [
  { key: "smarkets", name: "Smarkets", commission: 0.02 },
  { key: "matchbook", name: "Matchbook", commission: 0.02 },
];

export const BOOKMAKERS = `pinnacle,${EXCHANGES.map((e) => e.key).join(",")}`;
export const MARKETS = "h2h";

export const MAX_STAKE_FRACTION = 0.01;

import { BankrollTransaction } from "./types";

export const isNonBetTransaction = (t: BankrollTransaction): boolean => {
  return ["deposit", "withdrawal", "adjustment"].includes(t.type);
};

export const isBetTransaction = (t: BankrollTransaction): boolean => {
  return ["bet_placed", "bet_win", "bet_loss", "bet_void"].includes(t.type);
};
