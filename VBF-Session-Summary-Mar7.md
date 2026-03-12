# VALUE BET FINDER — SESSION SUMMARY (March 7, 2026)

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
23. **✅ Scanner: full-width scan bar** — Removed sidebar layout. LeagueSelector + edge count + Run Scan in a single full-width bar. Removed "Last Scan" / "Found" info section.
24. **✅ Scanner: commission picker** — Expandable table row below bet. 0% / 2% / Custom only (0.75% removed). Exchange selector inline. Custom input: numeric only, no spinner arrows, 2 decimal places max.
25. **✅ Scanner: stake reactivity** — Stake column updates when user switches exchange in the expand row.
26. **✅ Scanner: edge prefix fix** — Hardcoded `+` removed, only shown when edge is positive.
27. **✅ Header: title fix** — Removed white-to-grey gradient on "Value Bet Finder". Now plain white.
28. **✅ Header: nav buttons** — Fixed-width buttons (`min-w-[100px]`), text only (icons removed), segmented control style. Removed "Professional Edge Scanner" subtitle.
29. **✅ Open Bets: restyled** — Consistent table columns matching scanner. Removed Date column (kickoff in Match cell). Removed Commission column. Removed Fetch CLV button. Removed market type from Selection. Fixed delete button layout jolt.
30. **✅ History: column restructure** — Columns: Match | Selection | Exchange | Odds | Edge | SP | CLV | Result | Stake | P/L | Action. "Closing" renamed to "SP". Removed date column. Selection as prominent bold text. Result is read-only (W/L/V toggle removed). Trophy icon removed. "Kelly" removed from Stake/P/L headers.
31. **✅ History: layout fixes** — Column widths via colgroup. Consistent row heights (constrained inner content). Delete button jolt fixed. Table width stable across filter changes. Font-sans on dropdowns.
32. **✅ Analysis: summary stats** — "Total Bets" subtext simplified to "X open" only.
33. **✅ Analysis: combined bankroll chart** — Merged "Bankroll Tracker" and "Expected vs Actual" into single "Bankroll" chart. Starting value from deposits, not £0. Both actual + expected lines.
34. **✅ Analysis: competition chart labels** — Removed diagonal x-axis labels. Horizontal with shorter names.
35. **✅ Analysis: Recharts font overrides** — Global CSS for `.recharts-text` etc. DM Sans set as Tailwind font-sans default.
36. **✅ Bankroll: summary redesign** — Replaced chunky stat cards with a spreadsheet table. Columns: Exchange | Net Dep. | Balance | Bets | Staked | P/L | ROI | Return. Totals row. Net Deposits = deposits - withdrawals (single figure, no confusion).
37. **✅ Bankroll: mini sparkline chart** — Balance over time chart below summary table, fills dead space to match New Transaction form height.
38. **✅ Bankroll: transaction history cleanup** — Removed notes column and note input from form. Auto-generated stake notes removed. Amount column no longer clipped. £0.00 bet_loss shows muted, not green. Export button matches History tab style. Pagination added (25 per page). Layout stability pass.
39. **✅ Bankroll: layout restructure** — Summary table + mini chart stacked on left, New Transaction form on right. Transaction history full-width below.

### Previously completed (earlier sessions):

- Supabase migration (from localStorage)
- PIN authentication
- Commission selector per bet at track time
- Default commission changed to 2% in scanner
- Competition selector defaults to 0 selected
- API quota footer with progress bar and reset date
- Date format: UK (DD/MM/YYYY)
- Open Bets: LEAGUES lookup, persistent Settle All button
- Analysis: Total Staked card, Bankroll Tracker, CLV Tracker, By Competition, By Market
- Dual edge tracking, pure Kelly conversion, Smarkets re-added
- Multi-exchange bankroll, determineBetResult consolidation
- Dead code deletion, Supabase-first writes, negative bankroll guard

---

## AESTHETICS — DESIGN SYSTEM

### Design direction
Desktop-first spreadsheet/table aesthetic. Optimised for desktop; usable on mobile but not optimised (Android app planned separately). One font throughout (DM Sans). Dark theme. Minimal use of cards/pills — data lives in uniform table columns. Selection (the thing you're betting on) is always the visually boldest element.

### Font
DM Sans loaded via Google Fonts `<link>` in index.html. Set as Tailwind `font-sans` default in the tailwind.config script. Body font-family set explicitly.

### Colour usage
- Text: white (`text-white`) for hero values, `text-slate-200/300` for primary, `text-slate-400/500` for secondary/muted
- Positive values: `text-emerald-400`
- Negative values: `text-red-400`
- Accent: `bg-emerald-500` (Run Scan, active nav tab, logo)
- Action buttons: `bg-blue-600` (Track Bet, Apply Transaction)
- Backgrounds: `bg-slate-950` (page), `bg-slate-900/50` (cards/wrappers), `bg-slate-800/50` (table headers)
- Borders: `border-slate-800`, `border-slate-700/50`

### Table conventions (all tabs)
- Header: `bg-slate-800/50`, `text-[10px] uppercase tracking-wider font-bold text-slate-500`
- Numeric cells: right-aligned, `tabular-nums font-bold`, `whitespace-nowrap`
- Text cells: left-aligned
- Selection column: `text-[15px] font-extrabold text-white` — always the boldest text
- Match column: team names in `font-semibold text-slate-200`, league + kickoff below in `text-[10px/11px] text-slate-500`
- Exchange column: best = `font-bold text-slate-300`, others = `font-normal text-slate-500`. No tick icon.
- Sub-rows: tighter padding, shared cells via rowSpan
- Expand rows: `bg-slate-950/50 border-t border-slate-800`, inline commission + exchange pickers
- Delete button: fixed-width container (`min-w-[80px]`) so Confirm state doesn't jolt layout
- Row heights: constrained inner content divs (`h-[48px] overflow-hidden`) for consistency

### Commission picker
- Options: 0% (green tint), 2% (amber tint), Custom (slate)
- 0.75% removed
- Custom input: `inputMode="decimal"`, no spinner arrows, rejects non-numeric, 2dp max
- Appears as expandable row below bet, not modal

### Nav
- Segmented control style (shared borders, no individual rounding)
- Text only, no icons
- Fixed-width buttons (`min-w-[100px]`)
- Active: `bg-emerald-500 text-slate-950 font-bold`

---

## AESTHETICS — KNOWN ISSUES

1. **Font mismatch in PaginatedTable and transaction history table.** DM Sans not applying despite global CSS overrides and Tailwind config. Likely a specificity issue or the Tailwind CDN script not processing the fontFamily extension. Needs DevTools inspection to identify what CSS rule is winning. Both tables show a different (system?) font from the rest of the app.

2. **Recharts axis/tooltip fonts.** Global `.recharts-text` CSS override added but may not cover all chart text elements. Inline SVG `font-family` attributes in Recharts can override CSS. Needs verification across all charts.

3. **Mobile responsiveness.** Desktop-optimised. Tables will need horizontal scroll on small screens. No dedicated mobile layout — Android app is the planned mobile solution. Current mobile state: functional but cramped.

---

## AESTHETICS — ROADMAP

### Short term
- Fix PaginatedTable / transaction history font mismatch (DevTools diagnostic)
- Verify Recharts fonts across all Analysis charts
- Review Analysis tab breakdown tables (Competition, Odds Band, Timing, Market) for column consistency with other tabs
- General spacing/padding consistency pass across all tabs

### Medium term
- Bankroll tab: balance over time chart (full-width, below transaction history or as a toggle)
- Loading skeletons instead of plain "Loading..." text
- Empty state designs (no bets, no transactions, no scan results)
- Scanner: loading animation refinement

### Long term (Android app)
- Complete rethink of mobile layout — cards/stacked views instead of tables
- Touch-friendly commission picker
- Swipe gestures for settle/delete
- React Native component library separate from web

---

## KEY ARCHITECTURE DECISIONS

- **Staking:** 30% fractional Kelly only. Kelly stake = totalBankroll × (kellyPercent / 100) × 0.3
- **Commission:** Per-bet commission stored at track time. Scanner uses 2% permanent rate. Options: 0%, 2%, custom.
- **Dual edges:** baseNetEdgePercent (at 2%) for analysis consistency. netEdgePercent (at actual commission) for real P/L.
- **Multi-exchange:** Matchbook + Smarkets. Single API call. Per-bet exchange field (`exchange_key` + `exchange_name`). Separate bankroll balances. Kelly from total.
- **Data:** Supabase is sole source of truth. localStorage only for PIN session and API key. All writes are Supabase-first — state only updates on confirmed save.
- **Settlement:** Win P/L = (exchangePrice - 1) × kellyStake × (1 - commission/100). Loss P/L = -kellyStake. Bet update saved before transaction insert.
- **Result determination:** Single `determineBetResult` in betSettlement.ts. Returns 'won' | 'lost' | 'void'.
- **Nullish handling:** All CLV/Kelly P/L use `?? 0` (not `|| 0`).
- **Kelly math:** Single `calculateBetStake` function in betSettlement.ts, shared by scanner and tracking.
- **Bankroll accounting:** Net Deposits = deposits - withdrawals (single figure). Balance = Net Deposits + P/L. Stake ROI = P/L ÷ Staked. Bankroll Return = P/L ÷ Net Deposits. Bet loss transactions show as muted £0.00, not green +£0.00.

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
├── App.tsx                          # Auth, data loading, view routing. Wires three hooks. Scanner table inline.
├── constants.ts                     # Exchange configs, league definitions
├── types.ts                         # TrackedBet, BankrollTransaction, ExchangeBankroll
├── hooks/
│   ├── useScanner.ts                # API key, fetch status, odds, edges, selected leagues
│   ├── useTrackedBets.ts            # Tracked bets CRUD, Kelly math (via calculateBetStake), settlement
│   └── useBankroll.ts               # Transactions, exchange balances, total bankroll
├── services/
│   ├── edgeFinder.ts                # API calls, odds fetching, edge calculation (via calculateBetStake)
│   ├── betSettlement.ts             # P/L helpers, determineBetResult, calculateBetStake
│   └── supabase.ts                  # Supabase client, CRUD (all throw on error), PIN auth
├── components/
│   ├── ErrorBoundary.tsx            # Wraps each view, catches crashes
│   ├── PaginatedTable.tsx           # Reusable paginated table (KNOWN: font mismatch)
│   ├── BetCard.tsx                  # Legacy — no longer imported in App.tsx (scanner uses table now)
│   ├── LeagueSelector.tsx           # Competition picker
│   ├── PinLock.tsx                  # PIN auth screen
│   ├── OpenBetsView.tsx             # Open bets table, Settle All
│   ├── BetHistoryView.tsx           # History table, CSV export, filters
│   ├── AnalysisView.tsx             # Charts/tables with useMemo, PaginatedTable
│   ├── bankroll/BankrollView.tsx    # Summary table + sparkline + form + transaction history
│   └── stats/SummaryStats.tsx       # Summary stat cards (Analysis tab)
```

---

## WORKFLOW CONTEXT

Paul writes prompts here, then feeds them to Gemini in Zed (IDE) to implement. Prompts reference files by name (prefixed with @) and describe what to change conceptually — they should NOT quote specific code since the codebase evolves between prompts. Each prompt should be self-contained and focused on one change.

**Key Gemini pitfall:** Gemini invents database columns that don't exist (e.g. `best_exchange`, `exchange` instead of `exchange_key`/`exchange_name`). When debugging Supabase errors, check the Network tab response body for the actual PostgREST error — it's more specific than the app-level error messages. Always reference the actual schema in prompts when DB columns are involved.

---

## IMMEDIATE TODO

1. Fix PaginatedTable / transaction history font mismatch (DevTools diagnostic)
2. Deploy and verify tracking + settlement work end-to-end
3. Use the app for 1-2 weeks — place real bets, note actual friction points
4. Export CSV backups weekly
5. Clean up duplicate/test bets from debugging session in Supabase

## KNOWN TECHNICAL DEBT

- **No tests** — Zero unit or integration tests.
- **Legacy DB columns** — `flat_stake`, `flat_pl`, `exchange` (nullable) still in `tracked_bets`. Can be dropped.
- **Legacy BetCard.tsx** — No longer used (scanner is a table now) but file still exists. Can be deleted.
- **Security acceptable for personal tool** — PIN hash weak (32-bit), API keys in client bundle, session in localStorage, RLS permissive.
- **No loading skeletons** — Initial load shows "Loading your data..." with no skeleton UI.
- **CLV fetch requires higher API tier** — The Odds API history endpoint returns 401. CLV data won't populate until plan is upgraded or an alternative source is found.
- **Font mismatch** — PaginatedTable and bankroll transaction history render in wrong font. Root cause undiagnosed.

## FUTURE ROADMAP

**Scanner improvements:**
- Sort bet cards by highest edge
- Hide offers below a minimum edge threshold (e.g. 1%) — fixes tiny Smarkets stakes on negative/marginal EV
- Show indicator when only one exchange has data (Smarkets often missing)
- When both exchanges show the same price, default to the exchange with the lower bankroll balance to rebalance
- League names and ordering improvements in LEAGUES constant

**Data & analysis:**
- Consensus pricing — Betfair as secondary sharp reference alongside Pinnacle
- CLV-adjusted edge display in analysis tables
- Season archive feature (end of 2025/26 season)
- Supabase backup strategy

**Aesthetics:**
- Fix font mismatch (PaginatedTable, transaction history, Recharts)
- Analysis breakdown table column consistency
- Bankroll: full-width balance over time chart
- Loading skeletons and empty state designs
- General spacing/padding consistency pass
- Android app: complete mobile UI rethink (cards, swipe, touch-friendly)

**Expansion:**
- Other sports beyond football (verify determineBetResult handles different score formats)
- API cost tracking — requests per scan, daily/weekly usage chart, alerting near 10k monthly limit

**Platform:**
- Android app (React Native, reuse hooks as shared business logic)
