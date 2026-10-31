import { LeagueOption, AccaOffer } from "./types";

// ----------------------------------------------------------------------
// OPTIONAL: PASTE YOUR API KEY BELOW TO SKIP THE INPUT SCREEN
// Example: export const HARDCODED_API_KEY = "abc123456...";
// ----------------------------------------------------------------------
export const HARDCODED_API_KEY: string =
  import.meta.env.VITE_ODDS_API_KEY || "";

export const CURRENT_SEASON: string = "2026/27";

export const LEAGUES: LeagueOption[] = [
  // Top European
  // Top flights, big five
  { key: "soccer_epl", name: "Premier League", group: "Top Leagues" },
  { key: "soccer_spain_la_liga", name: "La Liga", group: "Top Leagues" },
  { key: "soccer_germany_bundesliga", name: "Bundesliga", group: "Top Leagues" },
  { key: "soccer_italy_serie_a", name: "Serie A", group: "Top Leagues" },
  { key: "soccer_france_ligue_one", name: "Ligue 1", group: "Top Leagues" },

  // Second tier and below
  { key: "soccer_efl_champ", name: "Championship", group: "Lower Leagues" },
  { key: "soccer_england_league1", name: "League One", group: "Lower Leagues" },
  { key: "soccer_england_league2", name: "League Two", group: "Lower Leagues" },
  { key: "soccer_germany_bundesliga2", name: "2. Bundesliga", group: "Lower Leagues" },
  { key: "soccer_italy_serie_b", name: "Serie B", group: "Lower Leagues" },
  { key: "soccer_france_ligue_two", name: "Ligue 2", group: "Lower Leagues" },

  // Other European top flights
  { key: "soccer_spl", name: "Scottish Premiership", group: "Other European" },
  { key: "soccer_portugal_primeira_liga", name: "Primeira Liga", group: "Other European" },
  { key: "soccer_netherlands_eredivisie", name: "Eredivisie", group: "Other European" },
  { key: "soccer_austria_bundesliga", name: "Austrian Bundesliga", group: "Other European" },
  { key: "soccer_belgium_first_div", name: "Belgian Pro League", group: "Other European" },
  { key: "soccer_denmark_superliga", name: "Danish Superliga", group: "Other European" },
  { key: "soccer_greece_super_league", name: "Greek Super League", group: "Other European" },
  { key: "soccer_poland_ekstraklasa", name: "Ekstraklasa", group: "Other European" },
  { key: "soccer_sweden_allsvenskan", name: "Allsvenskan", group: "Other European" },
  { key: "soccer_turkey_super_league", name: "Süper Lig", group: "Other European" },

  // UEFA club competitions
  { key: "soccer_uefa_champs_league", name: "Champions League", group: "European Competitions" },
  { key: "soccer_uefa_europa_league", name: "Europa League", group: "European Competitions" },
  { key: "soccer_uefa_europa_conference_league", name: "Conference League", group: "European Competitions" },

  // Domestic cups. Most re-added Oct 2026: the 25/26 pilot started in March,
  // when these had few or no fixtures left, so zero bets meant nothing.
  { key: "soccer_fa_cup", name: "FA Cup", group: "Domestic Cups" },
  { key: "soccer_england_efl_cup", name: "EFL Cup", group: "Domestic Cups" },
  { key: "soccer_spain_copa_del_rey", name: "Copa del Rey", group: "Domestic Cups" },
  { key: "soccer_italy_coppa_italia", name: "Coppa Italia", group: "Domestic Cups" },
  { key: "soccer_germany_dfb_pokal", name: "DFB-Pokal", group: "Domestic Cups" },
  { key: "soccer_france_coupe_de_france", name: "Coupe de France", group: "Domestic Cups" },

  // Rest of the world
  { key: "soccer_usa_mls", name: "MLS", group: "Rest of World" },
  { key: "soccer_brazil_campeonato", name: "Brasileirão Série A", group: "Rest of World" },
  { key: "soccer_brazil_serie_b", name: "Brasileirão Série B", group: "Rest of World" },
  { key: "soccer_argentina_primera_division", name: "Argentine Primera", group: "Rest of World" },
  { key: "soccer_chile_campeonato", name: "Chilean Primera", group: "Rest of World" },
  { key: "soccer_conmebol_copa_libertadores", name: "Copa Libertadores", group: "Rest of World" },
  { key: "soccer_conmebol_copa_sudamericana", name: "Copa Sudamericana", group: "Rest of World" },
  { key: "soccer_australia_aleague", name: "A-League", group: "Rest of World" },
  { key: "soccer_china_superleague", name: "Chinese Super League", group: "Rest of World" },

  // Competitive internationals only, never friendlies
  { key: "soccer_uefa_nations_league", name: "UEFA Nations League", group: "Internationals" },
  { key: "soccer_uefa_euro_qualification", name: "Euro Qualifiers", group: "Internationals" },
];

// Commission rates used by the SCANNER for edge calculation display.
// Actual commission per bet is set by the user at track time.
// Matchbook: 2% standard
// Smarkets: 2% standard (used as market validator only, not for betting)
export const EXCHANGES = [
  { key: "smarkets", name: "Smarkets", commission: 0.02 },
  { key: "matchbook", name: "Matchbook", commission: 0.02 },
];

export const ACCA_REFERENCE_BOOKMAKERS = [
  "williamhill",
  "paddypower",
  "ladbrokes_uk",
];

export const BOOKMAKERS = `pinnacle,${EXCHANGES.map((e) => e.key).join(
  ","
)},betfair_ex_uk,${ACCA_REFERENCE_BOOKMAKERS.join(",")}`;

export const BETFRED_ACCA_FLEX: AccaOffer = {
  bookmaker: "Betfred",
  minLegs: 5,
  minLegOdds: 1.5,
  refundType: "cash",
  refundCap: 10,
  freeBetValue: 0.75,
  bonusByLegs: {
    5: 0.05,
    6: 0.1,
    7: 0.15,
    8: 0.2,
    9: 0.25,
    10: 0.3,
    11: 0.4,
  },
  defaultStake: 5,
};

export const ACCA_MAX_LEG_ODDS = 1.9;

export const MARKETS = "h2h";

export const MAX_STAKE_FRACTION = 0.01;

import { BankrollTransaction } from "./types";

export const isNonBetTransaction = (t: BankrollTransaction): boolean => {
  return ["deposit", "withdrawal", "adjustment"].includes(t.type);
};

export const isBetTransaction = (t: BankrollTransaction): boolean => {
  return ["bet_placed", "bet_win", "bet_loss", "bet_void"].includes(t.type);
};
