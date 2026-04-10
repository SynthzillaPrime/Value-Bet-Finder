import { LeagueOption } from "./types";

// ----------------------------------------------------------------------
// OPTIONAL: PASTE YOUR API KEY BELOW TO SKIP THE INPUT SCREEN
// Example: export const HARDCODED_API_KEY = "abc123456...";
// ----------------------------------------------------------------------
export const HARDCODED_API_KEY: string =
  import.meta.env.VITE_ODDS_API_KEY || "";

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
    key: "soccer_spain_segunda_division",
    name: "La Liga 2",
    group: "Top European",
  },
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
  {
    key: "soccer_uefa_europa_conference_league",
    name: "Conference League",
    group: "Top European",
  },
  { key: "soccer_fa_cup", name: "FA Cup", group: "Top European" },
  { key: "soccer_england_efl_cup", name: "EFL Cup", group: "Top European" },

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
    key: "soccer_finland_veikkausliiga",
    name: "Veikkausliiga (Finland)",
    group: "Other European",
  },
  {
    key: "soccer_greece_super_league",
    name: "Greek Super League",
    group: "Other European",
  },
  {
    key: "soccer_league_of_ireland",
    name: "League of Ireland",
    group: "Other European",
  },
  {
    key: "soccer_norway_eliteserien",
    name: "Eliteserien (Norway)",
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
    key: "soccer_sweden_superettan",
    name: "Superettan (Sweden)",
    group: "Other European",
  },
  {
    key: "soccer_switzerland_superleague",
    name: "Swiss Superleague",
    group: "Other European",
  },
  {
    key: "soccer_turkey_super_league",
    name: "Turkey Super League",
    group: "Other European",
  },
  {
    key: "soccer_germany_liga3",
    name: "3. Liga (Germany)",
    group: "Other European",
  },

  // Domestic Cups
  {
    key: "soccer_italy_coppa_italia",
    name: "Coppa Italia",
    group: "Domestic Cups",
  },
  {
    key: "soccer_spain_copa_del_rey",
    name: "Copa del Rey",
    group: "Domestic Cups",
  },
  {
    key: "soccer_france_coupe_de_france",
    name: "Coupe de France",
    group: "Domestic Cups",
  },
  {
    key: "soccer_germany_dfb_pokal",
    name: "DFB-Pokal",
    group: "Domestic Cups",
  },

  // International
  {
    key: "soccer_uefa_nations_league",
    name: "UEFA Nations League",
    group: "International",
  },
  {
    key: "soccer_fifa_world_cup_qualifiers_europe",
    name: "FIFA WCQ Europe",
    group: "International",
  },
  {
    key: "soccer_fifa_world_cup_qualifiers_south_america",
    name: "FIFA WCQ South America",
    group: "International",
  },
  {
    key: "soccer_uefa_euro_qualification",
    name: "UEFA Euro Qualification",
    group: "International",
  },
  {
    key: "soccer_africa_cup_of_nations",
    name: "Africa Cup of Nations",
    group: "International",
  },
  {
    key: "soccer_concacaf_gold_cup",
    name: "CONCACAF Gold Cup",
    group: "International",
  },
  {
    key: "soccer_conmebol_copa_america",
    name: "Copa América",
    group: "International",
  },
  {
    key: "soccer_fifa_world_cup",
    name: "FIFA World Cup",
    group: "International",
  },
  {
    key: "soccer_fifa_world_cup_womens",
    name: "FIFA Women's World Cup",
    group: "International",
  },
  {
    key: "soccer_uefa_european_championship",
    name: "UEFA Euro",
    group: "International",
  },
  {
    key: "soccer_fifa_club_world_cup",
    name: "FIFA Club World Cup",
    group: "International",
  },
  {
    key: "soccer_uefa_champs_league_qualification",
    name: "UCL Qualification",
    group: "International",
  },
  {
    key: "soccer_uefa_champs_league_women",
    name: "Women's Champions League",
    group: "International",
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
  { key: "soccer_japan_j_league", name: "J League", group: "Rest of World" },
  { key: "soccer_korea_kleague1", name: "K League 1", group: "Rest of World" },
  { key: "soccer_mexico_ligamx", name: "Liga MX", group: "Rest of World" },
  {
    key: "soccer_saudi_arabia_pro_league",
    name: "Saudi Pro League",
    group: "Rest of World",
  },
  { key: "soccer_usa_mls", name: "MLS", group: "Rest of World" },
  {
    key: "soccer_concacaf_leagues_cup",
    name: "Leagues Cup",
    group: "Rest of World",
  },
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
