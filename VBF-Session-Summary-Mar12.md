# VALUE BET FINDER — SESSION SUMMARY (March 12, 2026)

Use this to continue in a new AI chat. Share alongside the GitHub repo.

---

## WHAT THE APP IS

A personal sports betting tool that finds mathematically profitable bets on exchanges (Matchbook, Smarkets) by comparing their odds against Pinnacle's sharp lines as a fair value benchmark. Built with React 18 + TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL), Recharts, hosted on Vercel. Odds data from The Odds API (£25/month, 10,000 requests). PIN-based auth. No backend server — entirely client-side talking to Supabase and The Odds API.

The user (Paul) scans for value bets across 20 European football competitions, tracks them with Kelly criterion staking, settles them after matches finish (fetching results + closing odds), and analyses performance over time.

---

## CURRENT STATE OF THE CODEBASE

### Completed — refactoring prompts (session 1):

1. **✅ Settlement transaction ordering** — `supabaseUpdateBet` runs before `insertTransaction`. Prevents orphaned settlement transactions.
2. **✅ Supabase read error handling** — `loadError` state, try/catch in `loadData`, retry screen on failure.
3. **✅ CLV nullish coalescing fix** — `?? 0` instead of `|| 0` across SummaryStats.tsx and AnalysisView.tsx.
4. **✅ Multiple cleanup items** — Renamed `remainingRequests` → `requestsRemaining`, removed dead code, fixed README, deleted React 19 import map.
5. **✅ Extract useTrackedBets hook** — Tracked bets state, CRUD, Kelly math moved from App.tsx.
6. **✅ Extract useBankroll hook** — Transactions, balances, bankroll moved from App.tsx.
7. **✅ Extract useScanner hook** — API key, fetch status, scan logic moved from App.tsx. App.tsx now ~100-120 lines.
8. **✅ Extract PaginatedTable component** — Replaces seven copy-pasted pagination patterns.
9. **✅ Refactor AnalysisView with useMemo** — All data aggregations memoized, inline tables replaced with PaginatedTable.
10. **✅ CSV export for tracked bets** — "Export All" / "Export Filtered" dropdown in BetHistoryView.
11. **✅ React error boundaries** — Per-view isolation, resets on tab switch.
12. **✅ Supabase read functions throw on error** — `fetchAllBets`/`fetchAllTransactions` now throw instead of returning empty arrays.
13. **✅ Extract Kelly math utility** — `calculateBetStake` in betSettlement.ts, shared by useTrackedBets and edgeFinder.
14. **✅ Extract settlement logic into useTrackedBets** — `settleBet` and `settleAll` on the hook. OpenBetsView and BetHistoryView delegate to hook.

### Completed — code review fixes (session 2):

15. **✅ Supabase write functions throw on error** — `insertBet`, `updateBet`, `deleteBet`, `insertTransaction` now throw instead of returning boolean.
16. **✅ Bankroll P/L fix** — Total P/L stat now includes `bet_placed` transactions (stake deductions). Filter dropdown includes "Bet Placed" option.
17. **✅ Batch of small fixes** — CLV filter `??` consistency, removed duplicate Fetch CLV button, Y-axis `domain={["auto", "auto"]}` for negative values, branding to "Value Bet Finder", added 0.75% commission quick-select, Recharts formatter typing.

### Hotfixes from testing (session 2):

18. **✅ Remove `best_exchange` column references** — Gemini invented a non-existent column. Removed from insert (handleTrackBet) and update (settlement) paths. Correct columns are `exchange_key` and `exchange_name`.
19. **✅ Fix exchange field mapping** — `handleTrackBet` now populates `exchange_key` and `exchange_name` (both not null in schema).
20. **✅ Fix local state update after tracking** — `handleTrackBet` now adds the new bet to `trackedBets` state after successful Supabase insert.
21. **✅ Fix `insertTransaction` to use shared Supabase client** — Was making a raw fetch without API key. Now uses the same `supabase` client as other write functions.

### Completed — aesthetics overhaul (session 3):

22. **✅ Scanner: table layout** — Replaced BetCard grid with a spreadsheet-style HTML table. Columns: Match | Selection | True Odds | Exchange | Odds | Edge | Stake | Action. Multi-exchange bets use sub-rows with rowSpan for shared cells.
23. **✅ Scanner: full-width scan bar** — Removed sidebar layout. LeagueSelector + edge count + Run Scan in a single full-width bar.
24. **✅ Scanner: commission picker** — Expandable table row below bet. 0% / 2% / Custom only. Exchange selector inline.
25. **✅ Scanner: stake reactivity** — Stake column updates when user switches exchange in the expand row.
26. **✅ Scanner: edge prefix fix** — Hardcoded `+` removed, only shown when edge is positive.
27. **✅ Header: title fix** — Removed white-to-grey gradient on "Value Bet Finder". Now plain white.
28. **✅ Header: nav buttons** — Fixed-width buttons, text only (icons removed), segmented control style.
29. **✅ Open Bets: restyled** — Consistent table columns matching scanner.
30. **✅ History: column restructure** — Columns: Match | Selection | Exchange | Odds | Edge | SP | CLV | Result | Stake | P/L | Action.
31. **✅ History: layout fixes** — Column widths via colgroup. Consistent row heights. Delete button jolt fixed.
32. **✅ Analysis: summary stats** — "Total Bets" subtext simplified to "X open" only.
33. **✅ Analysis: combined bankroll chart** — Merged "Bankroll Tracker" and "Expected vs Actual" into single "Bankroll" chart.
34. **✅ Analysis: competition chart labels** — Removed diagonal x-axis labels. Horizontal with shorter names.
35. **✅ Analysis: Recharts font overrides** — Global CSS for `.recharts-text` etc. DM Sans set as Tailwind font-sans default.
36. **✅ Bankroll: summary redesign** — Spreadsheet table. Columns: Exchange | Net Dep. | Balance | Bets | Staked | P/L | ROI | Return.
37. **✅ Bankroll: mini sparkline chart** — Balance over time chart below summary table.
38. **✅ Bankroll: transaction history cleanup** — Removed notes column. £0.00 bet_loss shows muted. Pagination added.
39. **✅ Bankroll: layout restructure** — Summary table + sparkline stacked on left, New Transaction form on right.

### Completed — code review & polish (session 4):

40. **✅ Re-add settlement to BetHistoryView** — `onSettleBet` prop restored. RefreshCw re-settle button in Action column alongside delete. Passed from App.tsx.
41. **✅ Dead code cleanup** — Deleted BetCard.tsx (legacy, no longer imported). Removed `flatStake: 1` from useTrackedBets (dead property, DB default handles it). Removed `onCancel` prop from ApiKeyInput.
42. **✅ Edge prefix fix in History** — Changed from hardcoded `+` to conditional `{edge > 0 ? "+" : ""}`.
43. **✅ Root font-sans** — Moved `font-sans` to root div in App.tsx. Stripped per-element `font-sans` classes from PaginatedTable, SummaryStats, BankrollView, AnalysisView, BetHistoryView dropdowns.
44. **✅ settleAll distinguishes skipped from failed** — `settleBet` returns `'settled' | 'skipped' | 'failed'` instead of boolean. `settleAll` reports three counts. In-play matches counted as skipped, not failures.
45. **✅ Extract shared breakdown stats utility** — `calculateBreakdownStats` function in AnalysisView replaces ~60 lines of duplicated aggregation logic across competition, odds band, timing, and market memos.
46. **✅ Unify pagination styling** — All tabs now use the BankrollView pagination pattern: bordered buttons, uppercase tracking, consistent text sizing.
47. **✅ Unify delete button and selection styling** — History delete button widened to match Open Bets (`w-[80px]`, "Confirm?" text). Open Bets selection column constrained to `h-[48px]` with `line-clamp-2`.
48. **✅ LEAGUES reordered** — Grouped by: Top Leagues (EPL through Scottish Prem), Second Divisions (Championship through League Two), European Cups (UCL, UEL, UECL), Domestic Cups (FA Cup, EFL Cup).
49. **✅ Free fixture count pre-check** — New `fetchLeagueFixtureCounts` function uses free `/v4/sports/{key}/events` endpoint. "Check Fixtures" button in LeagueSelector shows per-league match counts. "With Fixtures" button selects only leagues with fixtures > 0. Scan auto-skips empty leagues. Requests staggered with 200ms delay to avoid rate limiting.
50. **✅ Aesthetics consistency batch** — "30% Kelly Staking" → "Kelly Staking" in SummaryStats. History odds changed from `text-blue-300` to `text-white`. OpenBetsView league text styled consistently. OpenBetsView table headers got `font-bold`. Sparkline capped at `max-h-[160px]`. metadata.json description updated.
51. **✅ Unified tab layouts and table styling** — Removed redundant h2 tab headings from Open Bets, History, Analysis (nav already shows active tab). All table wrappers unified to `bg-slate-900/50 border border-slate-800/50 rounded-2xl`. All header borders unified to `border-b border-slate-800/50`.
52. **✅ Font mismatch fixed** — Root cause was `font-mono` class on numeric cells rendering as Consolas/Courier. Replaced all `font-mono` with `tabular-nums` across AnalysisView, BetHistoryView, OpenBetsView, BankrollView. All numbers now render in DM Sans with tabular spacing.

### Previously completed (earlier sessions):

- Supabase migration (from localStorage)
- PIN authentication
- Commission selector per bet at track time
- Default commission changed to 2% in scanner
- Competition selector defaults to 0 selected
- API quota footer with progress bar and reset date
- Date format: UK (DD/MM/YYYY)
- Open Bets: LEAGUES lookup, persistent Settle All button
- Analysis: Total Staked card, CLV Tracker, By Competition, By Market
- Dual edge tracking, pure Kelly conversion, Smarkets re-added
- Multi-exchange bankroll, determineBetResult consolidation
- Dead code deletion, Supabase-first writes, negative bankroll guard

---

## AESTHETICS — DESIGN SYSTEM

### Design direction
Desktop-first spreadsheet/table aesthetic. One font throughout (DM Sans). Dark theme. Minimal use of cards/pills — data lives in uniform table columns. Selection (the thing you're betting on) is always the visually boldest element. No redundant tab headings — the nav bar shows which tab is active.

### Font
DM Sans loaded via Google Fonts `<link>` in index.html. Set as Tailwind `font-sans` default via CDN config script. `font-sans` applied once on root div in App.tsx, cascades everywhere. Numeric cells use `tabular-nums` (not `font-mono`) for alignment in DM Sans.

### Colour usage
- Text: white (`text-white`) for hero values and odds, `text-slate-200/300` for primary, `text-slate-400/500` for secondary/muted
- Positive values: `text-emerald-400`
- Negative values: `text-red-400`
- Accent: `bg-emerald-500` (Run Scan, active nav tab, logo)
- Action buttons: `bg-blue-600` (Track Bet, Apply Transaction)
- Backgrounds: `bg-slate-950` (page), `bg-slate-900/50` (table wrappers), `bg-slate-800/50` (table headers)
- Borders: `border-slate-800/50` (table wrappers and header borders, unified across all tabs)

### Table conventions (all tabs)
- Wrapper: `bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm`
- Header: `bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-800/50`
- Numeric cells: right-aligned, `tabular-nums font-bold`, `whitespace-nowrap`
- Text cells: left-aligned
- Selection column: `text-[15px] font-extrabold text-white` — always the boldest text, constrained to `h-[48px]` with `line-clamp-2`
- Match column: team names in `font-semibold text-slate-200`, league below in `text-[10px] font-bold uppercase text-slate-500`, kickoff in `text-[10px/11px] text-slate-500`
- Delete button: `w-[80px]` fixed container, confirm shows "Confirm?" text
- Pagination: `bg-slate-800/20 border-t border-slate-800 px-6 py-3`, buttons with `bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] uppercase tracking-wider font-bold`

### Commission picker
- Options: 0% (green tint), 2% (amber tint), Custom (slate)
- Custom input: `inputMode="decimal"`, no spinner arrows, rejects non-numeric, 2dp max
- Appears as expandable row below bet, not modal

### Nav
- Segmented control style (shared borders, no individual rounding)
- Text only, no icons
- Fixed-width buttons (`min-w-[100px]`)
- Active: `bg-emerald-500 text-slate-950 font-bold`

---

## KEY ARCHITECTURE DECISIONS

- **Staking:** 30% fractional Kelly only. Kelly stake = totalBankroll × (kellyPercent / 100) × 0.3
- **Commission:** Per-bet commission stored at track time. Scanner uses 2% permanent rate. Options: 0%, 2%, custom.
- **Dual edges:** baseNetEdgePercent (at 2%) for analysis consistency. netEdgePercent (at actual commission) for real P/L.
- **Multi-exchange:** Matchbook + Smarkets. Single API call. Per-bet exchange field (`exchange_key` + `exchange_name`). Separate bankroll balances. Kelly from total.
- **Data:** Supabase is sole source of truth. localStorage only for PIN session and API key. All writes are Supabase-first — state only updates on confirmed save.
- **Settlement:** Win P/L = (exchangePrice - 1) × kellyStake × (1 - commission/100). Loss P/L = -kellyStake. Bet update saved before transaction insert. `settleBet` returns 'settled' | 'skipped' | 'failed'. `settleAll` reports three counts — in-play matches are skipped, not failures.
- **Result determination:** Single `determineBetResult` in betSettlement.ts. Returns 'won' | 'lost' | 'void'.
- **Nullish handling:** All CLV/Kelly P/L use `?? 0` (not `|| 0`).
- **Kelly math:** Single `calculateBetStake` function in betSettlement.ts, shared by scanner and tracking.
- **Bankroll accounting:** Net Deposits = deposits - withdrawals (single figure). Balance = Net Deposits + P/L. Stake ROI = P/L ÷ Staked. Bankroll Return = P/L ÷ Net Deposits. Bet loss transactions show as muted £0.00, not green +£0.00. Analysis tab P/L shows settled bets only; Bankroll tab P/L includes open stakes.
- **API credit optimisation:** Free `/v4/sports/{key}/events` endpoint used for fixture pre-checking (no quota cost, rate-limited — sequential requests with 200ms delays). Scan auto-skips leagues with 0 fixtures in next 48 hours. LeagueSelector shows per-league fixture counts after "Check Fixtures". "With Fixtures" button selects only active leagues.

---

## DATABASE SCHEMA (Supabase)

### tracked_bets
Key columns: `exchange_key` (text, not null), `exchange_name` (text, not null), `exchange_price`, `fair_price`, `closing_fair_price`, `net_edge_percent`, `base_net_edge_percent`, `clv_percent`, `kelly_percent`, `kelly_stake`, `kelly_pl`, `base_kelly_percent`, `base_kelly_stake`, `commission`, `result`, `status` (default 'open'), `sport_key`, `placed_at`, `kickoff`, `hours_before_kickoff`, `timing_bucket`.

Legacy columns still in table: `flat_stake` (default 1), `flat_pl`, `exchange` (nullable, added accidentally — can be dropped).

### bankroll_transactions
Deposits, withdrawals, bet_placed, bet_win, bet_loss, bet_void. Tagged with exchange (matchbook/smarkets). Notes field retained in schema for backward compatibility but no longer written to or displayed.

### app_config
Key-value store for PIN hash.

RLS enabled on all tables. Policies: allow all access to public role.

---

## PROJECT STRUCTURE

```
src/
├── App.tsx                          # Auth, data loading, view routing. Wires three hooks. Scanner table inline (~400 lines).
├── constants.ts                     # Exchange configs, LEAGUES (grouped: top leagues, second divs, European cups, domestic cups)
├── types.ts                         # TrackedBet, BankrollTransaction, ExchangeBankroll
├── hooks/
│   ├── useScanner.ts                # API key, fetch status, odds, edges, selected leagues, fixture counts
│   ├── useTrackedBets.ts            # Tracked bets CRUD, Kelly math (via calculateBetStake), settlement (settleBet/settleAll)
│   └── useBankroll.ts               # Transactions, exchange balances, total bankroll
├── services/
│   ├── edgeFinder.ts                # API calls, odds fetching, edge calculation, fetchLeagueFixtureCounts, fetchClosingLine, fetchMatchResult
│   ├── betSettlement.ts             # calculateBetStake, calculatePL, determineBetResult, getCommissionRate
│   └── supabase.ts                  # Supabase client, CRUD (all throw on error), PIN auth
├── components/
│   ├── ErrorBoundary.tsx            # Wraps each view, catches crashes
│   ├── PaginatedTable.tsx           # Reusable paginated table (unified styling)
│   ├── LeagueSelector.tsx           # Competition picker with Check Fixtures / With Fixtures / Select All / Clear All
│   ├── PinLock.tsx                  # PIN auth screen
│   ├── OpenBetsView.tsx             # Open bets table, Settle All (skipped vs failed distinction)
│   ├── BetHistoryView.tsx           # History table, CSV export, filters, re-settle button
│   ├── AnalysisView.tsx             # Charts/tables with useMemo, PaginatedTable, calculateBreakdownStats utility
│   ├── bankroll/BankrollView.tsx    # Summary table + sparkline + form + transaction history
│   └── stats/SummaryStats.tsx       # Summary stat cards (Analysis tab)
```

Dead files deleted: BetCard.tsx, BetTracker.tsx, AnalysisDashboard.tsx, localStorage migration code.

---

## WORKFLOW CONTEXT

Paul writes prompts here, then feeds them to Gemini in Zed (IDE) to implement. Prompts reference files by name (prefixed with @) and describe what to change conceptually — they should NOT quote specific code since the codebase evolves between prompts. Each prompt should be self-contained and focused on one change.

**Key Gemini pitfall:** Gemini invents database columns that don't exist (e.g. `best_exchange`, `exchange` instead of `exchange_key`/`exchange_name`). When debugging Supabase errors, check the Network tab response body for the actual PostgREST error — it's more specific than the app-level error messages. Always reference the actual schema in prompts when DB columns are involved.

---

## IMMEDIATE TODO

1. Use the app for 1-2 weeks — place real bets, note actual friction points
2. Export CSV backups weekly
3. Clean up duplicate/test bets from debugging sessions in Supabase

## KNOWN TECHNICAL DEBT

- **No tests** — Zero unit or integration tests.
- **Legacy DB columns** — `flat_stake`, `flat_pl`, `exchange` (nullable) still in `tracked_bets`. Can be dropped.
- **Scanner inline in App.tsx** — ~200 lines of scanner table JSX in App.tsx. Works but means App.tsx is ~400+ lines. Extract to ScannerView component when convenient.
- **Security acceptable for personal tool** — PIN hash weak (32-bit), API keys in client bundle, session in localStorage, RLS permissive.
- **No loading skeletons** — Initial load shows "Loading your data..." with no skeleton UI.
- **No CLV capture** — The Odds API history endpoint returns 401 (requires higher tier). Automated closing line capture not yet implemented. Two approaches identified: (A) in-app polling via setInterval while app is open, snapshots Pinnacle odds for bets approaching kickoff; (B) Supabase Edge Function on a cron, runs server-side regardless of app state. Option B preferred for reliability but requires more setup.
- **Sparkline chart shows net P/L per bet** — Doesn't show the dip when stakes are placed, only the net outcome. Acceptable for sparkline size.

## FUTURE ROADMAP

**CLV capture (high priority):**
- Automated closing line capture before kickoff — either in-app polling (Option A) or Supabase Edge Function cron (Option B)
- Captures Pinnacle's current odds for tracked open bets near kickoff using the live odds endpoint (1 credit per bet)
- Removes need for the £30/month historical API tier

**Scanner improvements:**
- Sort bet cards by highest edge
- Hide offers below a minimum edge threshold (e.g. 1%) — fixes tiny Smarkets stakes on negative/marginal EV
- Show indicator when only one exchange has data (Smarkets often missing)
- When both exchanges show the same price, default to the exchange with the lower bankroll balance to rebalance

**Data & analysis:**
- Consensus pricing — Betfair as secondary sharp reference alongside Pinnacle
- CLV-adjusted edge display in analysis tables
- Season archive feature (end of 2025/26 season)
- Supabase backup strategy

**Aesthetics:**
- Loading skeletons and empty state designs
- Mobile: functional but cramped — Android app is the planned mobile solution

**Expansion:**
- Other sports beyond football (verify determineBetResult handles different score formats)
- API cost tracking — requests per scan, daily/weekly usage chart, alerting near 10k monthly limit

**Platform:**
- Android app (React Native, reuse hooks as shared business logic)
