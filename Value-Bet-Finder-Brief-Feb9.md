# VALUE BET FINDER — PROJECT BRIEF

*Updated: February 9, 2026*

---

## PROJECT OVERVIEW

A value betting tool that finds mathematical edges on betting exchanges by comparing their odds to Pinnacle's sharp line. The user tracks bets, measures Closing Line Value (CLV), and builds data to prove the methodology works.

**User's motivation:** Entertainment + skin in the game, not get-rich-quick. Previously bet casually on hunches, now wants a data-driven approach.

---

## PROOF OF CONCEPT PLAN

**Duration:** 3 months (until end of Premier League season)

**Approach:** Paper trading — track bets at £1 flat stake, also tracking Kelly stakes. Build data to validate methodology.

**Success metric:** Having 3 months of solid data. If ROI is negative, tweak parameters and continue.

---

## LOCKED PARAMETERS

| Parameter | Decision |
|-----------|----------|
| Minimum net edge | 2% (after commission) — hardcoded, no slider |
| Odds range | 1.50 to 10.00 |
| Max time before kickoff | 48 hours |
| Sports | Football only |
| Leagues | 20 European competitions (see below) |
| Markets | Match Result (h2h), Over/Under (totals), Handicap (spreads) |
| Exchanges | Smarkets (2%), Betfair (5%), Matchbook (1.5%) |
| Sharp benchmark | Pinnacle no-vig odds |
| Tracking | Manual — user clicks "Track Bet" and selects exchange |
| Stakes | Both flat £1 AND 30% fractional Kelly |
| API plan | Paid ($25/month) for CLV via historical odds endpoint |

---

## LEAGUES (20 TOTAL)

### England
- Premier League (`soccer_epl`)
- Championship (`soccer_efl_champ`)
- League One (`soccer_england_league1`)
- League Two (`soccer_england_league2`)
- FA Cup (`soccer_fa_cup`)
- EFL Cup (`soccer_england_efl_cup`)

### Spain
- La Liga (`soccer_spain_la_liga`)
- La Liga 2 (`soccer_spain_segunda_division`)

### Germany
- Bundesliga (`soccer_germany_bundesliga`)
- Bundesliga 2 (`soccer_germany_bundesliga2`)

### Italy
- Serie A (`soccer_italy_serie_a`)
- Serie B (`soccer_italy_serie_b`)

### France
- Ligue 1 (`soccer_france_ligue_one`)
- Ligue 2 (`soccer_france_ligue_two`)

### Other
- Primeira Liga (`soccer_portugal_primeira_liga`)
- Eredivisie (`soccer_netherlands_eredivisie`)
- Scottish Premiership (`soccer_spl`)

### European Competitions
- Champions League (`soccer_uefa_champs_league`)
- Europa League (`soccer_uefa_europa_league`)
- Conference League (`soccer_uefa_europa_conference_league`)

### REMOVED
- NFL, NBA, MLB, NHL, UFC (US sports excluded)

---

## APP STRUCTURE — 4 TABS

### 1. Bet Finder (Search icon)
- Manual "Fetch Odds" button (no auto-fetch)
- Competition dropdown with checkboxes (no counter badge)
- Shows bet cards for selections with 2%+ edge
- Each card shows all 3 exchanges with odds and net edge
- Checkmark indicates best exchange
- "Track Bet" button opens exchange picker, then notes input
- Only shows matches within 48 hours

### 2. Recent Bets (Activity icon, no counter badge)
- Last 10 tracked bets
- Quick view of recent activity

### 3. Analysis (BarChart3 icon)
- Summary stats cards (5 total)
- View Analysis dropdown with chart options
- Export/Import CSV buttons
- Full Bet History table

### 4. Bankroll (Wallet icon)
- Exchange balances (Smarkets, Matchbook, Betfair)
- Total balance across all exchanges
- Add transaction form (deposit, withdrawal, adjustment)
- Transaction history

---

## SUMMARY STATS (5 CARDS)

| Card | Shows |
|------|-------|
| Total Bets | X bets, Y settled |
| Win Rate | X.X%, Y wins |
| Avg CLV | X.X%, X.X% beat close |
| Flat ROI | +X.X%, +£X.XX total P/L |
| Kelly ROI | X.X%, £X.XX bank |

- All percentages use 1 decimal place (0.0%)
- Positive values in green, negative in red
- If no bankroll deposits, show "No bankroll" not "£100"

---

## ANALYSIS CHARTS (8 OPTIONS)

1. **Bankroll Over Time** — Line chart of actual bankroll from deposits + P/L
2. **Expected vs Actual** — Two lines: expected (cumulative edge × stakes) vs actual P/L
3. **CLV Over Time** — Line chart with zero reference line
4. **By Competition** — Bar chart comparing ROI across leagues
5. **By Odds Band** — Bar chart: 1.50-3.00, 3.00-6.00, 6.00-10.00
6. **By Timing** — Bar chart: 48hr+, 24-48hr, 12-24hr, <12hr
7. **By Market** — Bar chart: Match Result, Over/Under, Handicap
8. **By Exchange** — Bar chart comparing exchanges + commission paid

Each chart has a data table below it.

---

## BANKROLL & TRANSACTION SYSTEM

### Transaction Types
- `deposit` — money added to exchange
- `withdrawal` — money removed from exchange
- `adjustment` — manual correction (e.g., fix rounding errors)
- `bet_win` — winnings from settled bet (auto-created)
- `bet_loss` — loss from settled bet (auto-created)
- `bet_push` — stake returned, no P/L (auto-created)
- `bet_void` — match voided, stake returned (auto-created)

### Key Rules
- Exchange bankrolls start at £0 (user adds deposits when ready)
- Manual adjustments do NOT affect ROI calculations
- ROI only calculated from bet_win and bet_loss transactions
- Commission deducted on wins:
  - Smarkets: profit × 0.98
  - Matchbook: profit × 0.985
  - Betfair: profit × 0.95
- Bankroll persists in localStorage

---

## BET TRACKING — DATA CAPTURED

### At Time of Tracking
| Field | Description |
|-------|-------------|
| Match | "Home vs Away" |
| League | Competition name |
| Selection | What you're betting on |
| Market | Match Result, Over/Under, or Handicap |
| Exchange | User-selected from picker |
| Your Odds | Price at the exchange |
| Pinnacle True Odds | No-vig benchmark |
| Net Edge % | After commission |
| Timing Bucket | 48hr+, 24-48hr, 12-24hr, <12hr |
| Hours Before Kickoff | Calculated |
| Notes | Optional, max 50 chars |
| Flat Stake | £1 |
| Kelly Stake | Based on edge and current bankroll |
| Kickoff Time | Match start |
| Tracked At | Timestamp |

### After Match Settles
| Field | Description |
|-------|-------------|
| Result | won, lost, push, void |
| Closing True Odds | Pinnacle no-vig at kickoff (paid API) |
| CLV % | (Your odds ÷ Closing odds - 1) × 100 |
| Flat P/L | +£(odds-1) if won, -£1 if lost, £0 if push/void |
| Kelly P/L | Based on Kelly stake, commission-adjusted |

---

## FULL BET HISTORY TABLE COLUMNS

- Event (match + date)
- Selection (+ market type)
- Timing (bucket + hours out)
- Odds (+ exchange)
- CLV %
- Result
- Action (fetch result, delete)

**Note:** No SCORE column — we only care about result, not the score.

---

## CSV EXPORT/IMPORT

### Export Format (19 columns)
Match, League, Selection, Market, Exchange, Your Odds, Pinnacle True Odds, Net Edge %, Timing Bucket, Notes, Result, Closing True Odds, CLV %, Flat Stake, Flat P/L, Kelly Stake, Kelly P/L, Kickoff, Tracked At

### Import
- Accepts CSV matching export format
- Skips duplicates (based on Match + Selection + Kickoff)
- Shows success message with count imported

---

## API CONFIGURATION

### Environment Variables
- `VITE_ODDS_API_KEY` — stored in Vercel (production) and `.env.local` (local)
- `.env.local` is in `.gitignore` — never committed

### Quota Management
- ~60 requests per full refresh (20 leagues × 3 markets)
- Use competition filter to only refresh leagues with games that day
- Historical odds (CLV) = 1 request per bet
- Starter plan: 10,000/month (~330/day)

### Error Handling
- 401 → "Invalid API Key"
- 429 or quota exceeded → "API quota exceeded. Resets monthly."

---

## CURRENT STATUS (Feb 9, 2026)

### ✅ COMPLETED
- Core bet finder with edge calculations
- 20 European leagues, US sports removed
- 3 markets (h2h, totals, spreads)
- Track Bet flow with exchange picker and notes
- Timing buckets and hours calculation
- Summary stats dashboard
- All 8 analysis chart views (structure)
- Transaction-based bankroll system
- Per-exchange bankroll tracking
- Commission deduction on wins
- Export CSV
- Import CSV
- 4-tab structure (Bet Finder, Recent Bets, Analysis, Bankroll)
- localStorage persistence bug fixed
- Odds capped at 1.50-10.00
- Matches capped at 48hr out
- Removed: counters on tabs/buttons, SCORE column, stake % on cards

### 🔧 NEEDS FIXING
- X-axis labels on bar charts (diagonal, should be horizontal or properly angled)
- Charts not plotting data (filtering logic issue)
- Bankroll Over Time showing £100 instead of actual deposits

### 📊 FIRST TEST RESULTS (14 bets)
- 4 wins, 9 losses, 1 open
- Win rate: 30.8%
- Flat ROI: +54.6% (+£7.10)
- Average odds: ~5.4
- All bets on Matchbook except 1 on Smarkets

---

## TECHNICAL NOTES

### Key Files
- `App.tsx` — main app, state management, localStorage
- `components/BetTracker.tsx` — Recent Bets view
- `components/AnalysisView.tsx` — Analysis tab with charts
- `components/BankrollView.tsx` — Bankroll tab
- `components/BetCard.tsx` — Individual bet card in scanner
- `components/LeagueSelector.tsx` — Competition dropdown
- `services/edgeFinder.ts` — API calls, edge calculations
- `types.ts` — TypeScript interfaces
- `constants.ts` — leagues, exchanges, markets config

### Data Persistence
- Tracked bets: localStorage key `tracked_bets`
- Transactions: localStorage key `bankroll_transactions`
- Each browser/URL has separate localStorage

### Git Workflow
- `shipit` = `git add . && git commit -m "update" && git push`
- Vercel auto-deploys on push
- Use `git checkout <hash> -- <file>` to revert specific files

---

## PROMPTING TIPS FOR AI ASSISTANTS

### Do
- One small change at a time
- Reference files with `@filename`
- Be specific: "Add X prop to Y component"
- Test after each change

### Don't
- Multiple fixes in one prompt
- Ask to "rewrite the whole file"
- Large complex prompts
- Keep prompting when rate limited (wait)

### If AI Goes Wrong
- Stop it immediately
- Reject changes or Ctrl+Z
- Hard reset: `git checkout -- <filename>`
- Break into smaller prompts

---

## FUTURE CONSIDERATIONS

- Cloud sync (Supabase) for multi-device
- US sports with Circa as benchmark
- Horse racing (separate project, needs Betfair API)
- BTTS market if alternative data source found
- Automated result fetching ("Fetch All Results" button)

---

*This document is the source of truth for Value Bet Finder development.*
