VALUE BET FINDER — UPDATED PROJECT BRIEF
Generated from Claude conversation — February 2026

PROJECT OVERVIEW
A value betting tool that finds mathematical edges on betting exchanges by comparing their odds to Pinnacle's sharp line. The user tracks bets, measures Closing Line Value (CLV), and builds data to prove the methodology works.
User's motivation: Entertainment + skin in the game, not get-rich-quick. Previously bet casually on hunches, now wants a data-driven approach with value as an added bonus.

PROOF OF CONCEPT PLAN
Duration: 3 months (until end of Premier League season)
Approach: Paper trading — track bets at £1 stake without placing real money. Build data to validate the methodology before risking capital.
Success metric: Having 3 months of solid data. If ROI is negative, tweak parameters (fewer longshots, different markets, etc.) and continue.

LOCKED PARAMETERS
ParameterDecisionMinimum net edge2% (after commission)Odds range1.50 to 10.00SportsFootball only (for proof of concept)LeaguesSee full list below

LEAGUES TO INCLUDE
Top Leagues (Currently in app)

Premier League (soccer_epl)
Championship (soccer_efl_champ)
La Liga (soccer_spain_la_liga)
Bundesliga (soccer_germany_bundesliga)
Serie A (soccer_italy_serie_a)
Ligue 1 (soccer_france_ligue_one)
Champions League (soccer_uefa_champs_league)
Europa League (soccer_uefa_europa_league)

Adding

FA Cup (soccer_fa_cup)
EFL Cup (soccer_england_efl_cup)
League One (soccer_england_league1)
League Two (soccer_england_league2)
La Liga 2 (soccer_spain_segunda_division)
Bundesliga 2 (soccer_germany_bundesliga2)
Serie B (soccer_italy_serie_b)
Ligue 2 (soccer_france_ligue_two)
Primeira Liga (soccer_portugal_primeira_liga)
Eredivisie (soccer_netherlands_eredivisie)
Scottish Premiership (soccer_spl)
Conference League (soccer_uefa_europa_conference_league)

Removing

NFL, NBA, MLB, NHL, UFC (US sports — excluded from proof of concept)

Total: 20 football leagues

API QUOTA NOTES
How requests work:

Each league costs 1 request per market per region when you refresh
20 leagues × 3 markets = ~60 requests per refresh
Historical odds (for CLV) = 1 request per bet you check

Starter plan ($25/month):

10,000 requests = ~330/day
At 60 per refresh, that's ~5 full refreshes per day
Should be enough if you're selective

Saving quota:

Use the league filter — only refresh leagues with games that day
Don't spam refresh constantly
Only fetch CLV after matches finish
| Markets | Match Result (h2h), Over/Under (totals), Handicap/Spreads |
| Exchanges | All 3 — Smarkets (2%), Betfair (5%), Matchbook (1.5%) |
| Sharp benchmark | Pinnacle no-vig odds |
| Tracking approach | Manual — user clicks "Track" on bets they'd actually take |
| Stake tracking | Both flat £1 AND 30% fractional Kelly |
| Simulated bankroll | Starting at £100 |
| API plan | Paid ($25/month) for CLV via historical odds endpoint |


MARKETS EXPLANATION
MarketDescriptionAvailable?h2h (Match Result)Home / Draw / Away✅ Yestotals (Over/Under)Over/Under goals (e.g., Over 2.5)✅ Yesspreads (Handicap)e.g., Arsenal -1.5✅ To addBTTSBoth Teams to Score❌ Not available in The Odds API

TIMING BUCKETS
For analysing when bets are placed relative to kickoff:
BucketRange48hr+More than 48 hours before kickoff24-48hr24 to 48 hours before12-24hr12 to 24 hours before<12hrLess than 12 hours before

BET TRACKER — DATA TO CAPTURE
At time of tracking (when user clicks "Track")
FieldDescriptionMatchTeams, league, kickoff timeSelectionWhat you're betting on (Arsenal Win, Over 2.5, etc.)MarketMatch Result, Over/Under, or HandicapExchangeWhich exchange has best priceYour oddsThe price you're "taking"Pinnacle true oddsThe no-vig benchmarkRaw edge %Before commissionNet edge %After commissionKelly stake %What full Kelly suggestsFractional Kelly stake30% of Kelly (actual recommended stake)Fractional Kelly £ amountBased on current bankrollTime trackedTimestampHours before kickoffCalculatedTiming bucket48hr+, 24-48hr, 12-24hr, or <12hrNotesOptional, few words only
After the match (when user fetches results/CLV)
FieldDescriptionResultWon / Lost / PushClosing odds (Pinnacle)Pinnacle's raw price at kickoffClosing true oddsPinnacle no-vig at closeCLV %(Your odds ÷ Closing true odds - 1) × 100P/L (flat £1)+£X if won, -£1 if lostP/L (Kelly)Based on fractional Kelly stake at time of bet

BANKROLL SIMULATION

Starting bankroll: £100
Track running total after each settled bet
Calculate both flat stake and Kelly stake results
Show bankroll growth/decline over time


SUMMARY STATS TO DISPLAY

Total bets tracked
Total settled (with results)
Win rate %
Average CLV %
Beat-the-close rate % (how often CLV > 0)
ROI (flat £1 staking)
ROI (Kelly staking)
Current simulated bankroll (flat)
Current simulated bankroll (Kelly)


ANALYSIS DIMENSIONS
After 3 months, slice data by:

League — which leagues are most profitable?
Odds band — 1.50-3.00 vs 3.00-6.00 vs 6.00-10.00
Market — Match Result vs Over/Under vs Handicap
Exchange — Smarkets vs Matchbook vs Betfair
Timing — bets placed 48hr+ out vs day of match
Edge band — 2-3% edge vs 5%+ edge


KELLY CRITERION EXPLANATION
Formula: Kelly % = Edge % ÷ (Odds - 1)
Example:

5% edge at odds 3.00
Kelly = 5% ÷ 2.00 = 2.5% of bankroll

Fractional Kelly (30%):

Reduces volatility
Actual stake = Kelly suggestion × 0.30
So 2.5% becomes 0.75% of bankroll


WHAT'S NOT BEING BUILT (FOR NOW)

BTTS market (not available in API)
US sports (excluded from proof of concept)
Outlier validator (user will eyeball when one exchange is off)
Final score display (just won/lost is enough)
Betfair back/lay midpoint calculation (would need direct Betfair API)
"Change Key" button (not needed — key is set via environment variable)


FUTURE CONSIDERATIONS (POST PROOF OF CONCEPT)

Add US sports with Circa as benchmark instead of Pinnacle
Add horse racing (would need Betfair API, different project)
Add BTTS if alternative data source found
Implement outlier warnings for suspicious edges
Consensus true odds (average Pinnacle + Betfair)


TECHNICAL NOTES
Environment Variables

VITE_ODDS_API_KEY — stored in Vercel (production) and .env.local (local)
.env.local is in .gitignore — never committed

API Endpoints Used

/v4/sports/{sport}/odds — live odds (h2h, totals, spreads)
/v4/sports/{sport}/scores — results (free)
/v4/sports/{sport}/odds-history — historical/closing odds (paid only, needed for CLV)

Exchanges in API

smarkets — 2% commission
betfair_ex_uk — 5% commission
matchbook — 1.5% commission
pinnacle — benchmark only (can't bet from UK)


BUILD CHECKLIST

 Upgrade to paid Odds API plan ($25/month)
 Add spreads/handicap market to scanner
 Add new European leagues (FA Cup, EFL Cup, League One, League Two, La Liga 2, Bundesliga 2, Serie B, Ligue 2, Primeira Liga, Eredivisie, Scottish Prem, Conference League)
 Remove US sports from interface (NFL, NBA, MLB, NHL, UFC)
 Remove "Change Key" button (not needed)
 Add "hours before kickoff" calculation
 Add timing bucket field (48hr+, 24-48hr, 12-24hr, <12hr)
 Add notes field (short text)
 Add flat £1 P/L column
 Add Kelly P/L column
 Add simulated bankroll tracker (starting £100)
 Add summary stats dashboard
 Improve error handling (distinguish quota exceeded vs invalid key)
 Test CLV calculation with paid API
 Verify quota tracker works correctly with paid plan (check it counts both odds and historical endpoints)


Document created as reference for ongoing development with Gemini/Claude
