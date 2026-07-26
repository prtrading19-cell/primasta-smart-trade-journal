# PRIMASTA TradeOS — Current Project State

> Generated: 2026-07-14
> Git branch: `main` | Working tree: clean
> Repo: https://github.com/prtrading19-cell/primasta-smart-trade-journal

---

## 1. Project Overview

An institutional-grade Gold/XAUUSD trading journal built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. Features include trade logging, AI-powered gold macro research, gold trade setup generation, lot/margin calculation, and a Bloomberg/TradingView-inspired dark terminal UI.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.6 |
| Styling | Tailwind CSS 3.4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (screenshots) |
| Charts | Recharts 2.13 |
| Icons | lucide-react 0.468 |
| PDF | jspdf + jspdf-autotable |
| AI | OpenAI Responses API (gpt-4.1, web_search) |
| Market Data | TwelveData API |
| Package Manager | pnpm |

---

## 3. Environment Variables

### Configured (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://kxzlfamzzhwifhdgvvze.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_R3Xts9IvaSaByr0CtXGjCg_H9pn8WS3
```

### Required (set in Vercel / server-side only)
```
OPENAI_API_KEY          — Used by gold auto-fill route (gpt-4.1)
TWELVE_DATA_API_KEY     — Used by xauusd market data route + live gold price fetch
```

### DO NOT MODIFY
- `.env`, `.env.local` files
- Supabase integration
- Authentication flow
- API keys

---

## 4. Design Theme

| Token | Value | Usage |
|---|---|---|
| `surface.base` | `#05070A` | Page background |
| `surface.card` | `#0F172A` | Card backgrounds |
| `surface.panel` | `#111827` | Panel backgrounds |
| `surface.elevated` | `#1A2332` | Elevated surfaces |
| `surface.hover` | `#1E293B` | Hover states |
| `gold` | `#D4AF37` | Primary accent, gold highlights |
| `gold-dim` | `#B8960F` | Muted gold |
| `profit` | `#16C784` | Win/profit/positive |
| `loss` | `#EA3943` | Loss/negative |
| `warning` | `#D4AF37` | Warning states |
| `text-primary` | `#F8FAFC` | Primary text |
| `text-secondary` | `#94A3B8` | Secondary text |
| `text-muted` | `#64748B` | Muted text |
| `border.subtle` | `#1E293B` | Subtle borders |
| `border` | `#253244` | Default borders |
| `border.emphasis` | `#334155` | Emphasized borders |

Custom shadows: `soft`, `glow`, `card-hover`. Animations: `fade-in`, `slide-up`, `slide-in-left`.

---

## 5. Directory Structure

```
primasta-smart-trade-journal/
├── .env.local                          # Supabase keys
├── .eslintrc.json
├── .gitignore
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── tailwind.config.ts                  # Institutional theme tokens
├── tsconfig.json
├── public/
│   └── manifest.json
├── manual-patches/                     # Manual patch files
├── supabase/
│   ├── schema.sql                      # Main schema (501 lines)
│   ├── fresh-start.sql
│   ├── gold-research-desk.sql
│   ├── gold-trade-setups.sql
│   ├── daily-gold-research-reports.sql
│   ├── lot-margin-calculator.sql
│   └── smc-a-plus-upgrade.sql
└── src/
    ├── app/
    │   ├── layout.tsx                  # Root layout (Inter font, dark class)
    │   ├── page.tsx                    # Root redirect
    │   ├── globals.css
    │   ├── dashboard/page.tsx          # Dashboard home
    │   ├── trades/page.tsx             # Trade management terminal
    │   ├── trades/[id]/page.tsx        # Trade detail view
    │   ├── new-trade/page.tsx          # New trade form
    │   ├── journal/page.tsx            # Trade journal table
    │   ├── summary/page.tsx            # Summary/analytics
    │   ├── plan/page.tsx               # Trading plan
    │   ├── gold-research/page.tsx      # Gold research desk
    │   ├── gold-research/history/page.tsx
    │   ├── calculator/page.tsx         # Lot/margin calculator
    │   ├── calculator/history/page.tsx
    │   ├── export/page.tsx             # PDF/CSV export
    │   ├── account/page.tsx            # Account settings
    │   └── api/
    │       ├── gold-research/
    │       │   ├── auto-fill/route.ts      # AI auto-fill (gpt-4.1 + web_search)
    │       │   └── generate-setup/route.ts # Trade setup generation
    │       ├── market-data/
    │       │   └── xauusd/route.ts         # TwelveData market data
    │       └── analyze-gold-driver/route.ts # Driver analysis API
    ├── components/
    │   ├── AppShell.tsx                # App shell with sidebar + topbar
    │   ├── Sidebar.tsx                 # Navigation sidebar
    │   ├── TopBar.tsx                  # Top navigation bar
    │   ├── ThemeToggle.tsx             # Dark/light theme toggle
    │   ├── AuthForm.tsx                # Sign in/up form
    │   ├── DashboardCard.tsx           # Dashboard metric cards
    │   ├── MetricCard.tsx              # Metric display cards
    │   ├── TradeForm.tsx               # Trade entry form
    │   ├── JournalTable.tsx            # Trade journal table
    │   ├── CloseTradeDialog.tsx        # Close trade modal
    │   ├── StatusBadge.tsx             # Status badges
    │   ├── ScreenshotInput.tsx         # Screenshot upload
    │   ├── GoldResearchDesk.tsx        # 9-section gold research UI
    │   ├── GoldResearchHistory.tsx     # Research history list
    │   ├── LotMarginCalculator.tsx     # Lot/margin calculator UI
    │   └── LotMarginHistory.tsx        # Calculator history
    ├── context/
    │   └── AppDataContext.tsx          # Global data context (Supabase + localStorage fallback)
    ├── lib/
    │   ├── supabase.ts                 # Supabase client init
    │   ├── storage.ts                  # LocalStorage helpers
    │   ├── calculations.ts             # Dashboard metrics
    │   ├── format.ts                   # Formatting utilities
    │   ├── exporters.ts                # PDF/CSV export
    │   ├── goldResearch.ts             # Gold driver analysis engine (9 drivers)
    │   ├── goldAutoResearch.ts         # Auto-fill normalization + summary builder
    │   ├── goldTradeSetup.ts           # Trade setup calculations
    │   ├── goldResearchExporters.ts    # Gold research PDF export
    │   └── lotMargin.ts                # Lot/margin math
    └── types/
        ├── trade.ts                    # Trade, Checklist, Plan types
        ├── goldResearch.ts             # Gold research types (9 sections)
        ├── goldTradeSetup.ts           # Gold trade setup types
        └── lotMargin.ts                # Lot/margin types
```

---

## 6. Pages & Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Root redirect to `/dashboard` |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard with metrics, charts |
| `/trades` | `app/trades/page.tsx` | Trade management terminal |
| `/trades/[id]` | `app/trades/[id]/page.tsx` | Individual trade detail |
| `/new-trade` | `app/new-trade/page.tsx` | New trade entry form |
| `/journal` | `app/journal/page.tsx` | Trade journal table view |
| `/summary` | `app/summary/page.tsx` | Performance summary/analytics |
| `/plan` | `app/plan/page.tsx` | Trading plan editor |
| `/gold-research` | `app/gold-research/page.tsx` | Gold Research Desk (9 sections) |
| `/gold-research/history` | `app/gold-research/history/page.tsx` | Saved research reports |
| `/calculator` | `app/calculator/page.tsx` | Lot size & margin calculator |
| `/calculator/history` | `app/calculator/history/page.tsx` | Calculator history |
| `/export` | `app/export/page.tsx` | PDF/CSV export |
| `/account` | `app/account/page.tsx` | Account/auth settings |

---

## 7. API Routes

### `POST /api/gold-research/auto-fill`
- **File:** `src/app/api/gold-research/auto-fill/route.ts`
- **Purpose:** AI-generated gold macro research report
- **AI Model:** `gpt-4.1` (forced `web_search` tool, `search_context_size: "high"`)
- **Flow:**
  1. `fetchLiveGoldPrice()` — Independent TwelveData price fetch
  2. `requestStructuredReport()` — OpenAI Responses API with JSON schema
  3. `parseStructuredReport()` — Extract parsed JSON from response
  4. `normalizeAutoFillResponse()` — Sanitize all fields
  5. `withLivePrice()` — Override AI price with live TwelveData price
- **Key safeguards:**
  - `goldCurrentPrice` removed from AI's JSON schema — AI cannot fabricate it
  - `normalizeAutoFillResponse()` hardcodes `goldCurrentPrice: ""`
  - Live price fetched independently via `fetchLiveGoldPrice()`
  - Result always shows `$<price> (live, Twelve Data)`
  - 7-day freshness rule enforced in prompts
  - `tool_choice: "required"` — forces web search every time

### `GET /api/market-data/xauusd`
- **File:** `src/app/api/market-data/xauusd/route.ts`
- **Purpose:** Fetch live XAU/USD market data from TwelveData
- **Data:** current price, daily high/low, previous day H/L, swing H/L, suggested liquidity/support/resistance
- **Symbols tried:** `XAU/USD` then `XAUUSD`
- **Source:** TwelveData only (no multi-provider engine)

### `POST /api/gold-research/generate-setup`
- **File:** `src/app/api/gold-research/generate-setup/route.ts`
- **Purpose:** Generate trade setup from research + user inputs

### `POST /api/analyze-gold-driver`
- **File:** `src/app/api/analyze-gold-driver/route.ts`
- **Purpose:** Analyze individual gold driver with AI

---

## 8. Data Layer

### Supabase Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profiles | `id`, `name`, `email` |
| `trades` | Trade records | `id`, `user_id`, `date`, `pair`, `trade_type`, `strategy`, `entry_price`, `stop_loss`, `take_profit`, `lot_size`, `status`, `smc_checklist`, `gold_research_report_id`, `gold_trade_setup_id` |
| `trading_plans` | Trading plans | `user_id` (unique), `main_market`, `allowed_pairs`, `max_trades_per_day`, `risk_per_trade` |
| `gold_research_reports` | Manual driver analyses | `driver_name`, `gold_bias`, `impact_level`, `confidence_score`, `driver_fields` |
| `daily_gold_research_reports` | AI auto-fill reports | `report_date`, `gold_current_price`, `sections_json`, `full_summary_json` |
| `gold_trade_setups` | Gold trade setups | `research_report_id`, `setup_verdict`, `confidence`, `selected_strategy` |
| `lot_margin_calculations` | Calculator history | `account_balance`, `symbol`, `calculated_lot_size`, `margin_required` |

### Data Flow (`AppDataContext`)
- **Cloud mode:** Supabase CRUD with RLS policies (user_id scoped)
- **Local mode:** localStorage fallback when Supabase not configured
- **Demo mode:** `DEMO_USER` used when Supabase env vars missing
- All tables have RLS enabled with per-user policies
- Auth triggers auto-create `profiles` and `trading_plans` rows

---

## 9. Core Libraries

### `goldResearch.ts` (790 lines)
- 9 driver analyzers: DXY, US Yields, Real Yields, Fed Tone, CPI/PCE, NFP/Jobs, Geopolitics, ETF/Central Bank, Custom News
- Each returns: `goldBias`, `impactLevel`, `confidenceScore`, `checklistEffect`, `explanation`, `goldMeaning`, `bullishGoldClues`, `bearishGoldClues`, `keyConflictOrRisk`, `finalGuidance`
- `buildGoldBiasSummary()` — Aggregates all driver reports into overall bias
- `getGoldChecklistResult()` — Pre-trade checklist scoring

### `goldAutoResearch.ts` (223 lines)
- `GOLD_AUTO_DRIVER_NAMES` — 9 auto-fill section names
- `normalizeAutoFillResponse()` — Sanitizes AI output, hardcodes `goldCurrentPrice: ""`
- `buildAutoGoldSummary()` — Computes full summary from sections
- `createEmptyAutoFillResponse()` — Empty state

### `goldTradeSetup.ts` (272 lines)
- `calculateGoldSetupRiskReward()` — R:R ratio calculation
- `buildManualGoldTradeSetup()` — Manual setup generation
- `enforceGoldTradeSetupRules()` — Post-generation validation
- `matchGoldStrategy()` — Strategy matching from inputs

### `calculations.ts`
- `calculateMetrics(trades)` → `DashboardMetrics` (win rate, profit factor, total P/L, etc.)

### `lotMargin.ts`
- Full lot size and margin calculation with warnings, risk status, and guidance

---

## 10. Type System

### `trade.ts`
- **Enums:** `TradeType`, `TradeStatus`, `TradeResult`, `Session`, `Timeframe`, `Emotion`, `HtfBias`, `LiquiditySwept`, `EntryPoi`, `ConfirmationTimeframe`, `SetupGrade`, `NewsRisk`, `TradingRuleStatus`
- **Interfaces:** `Trade`, `NewTradeInput`, `ClosingDetails`, `TradingPlan`
- **Constants:** `CHECKLIST_LABELS` (15 items), `STRATEGIES` (22 strategies), `STRATEGY_DESCRIPTIONS`, `PAIRS` (10 pairs)
- **A+ Critical Checks:** 9 critical checklist items for A+ grade

### `goldResearch.ts`
- **Driver types:** `GoldDriverName` (9), `GoldBias`, `GoldImpactLevel`, `GoldTimeSensitivity`
- **Auto-fill types:** `GoldAutoDriverName` (9), `GoldAutoImpact`, `GoldAutoOverallBias`, `GoldAutoPreTradeVerdict`
- **Key interfaces:** `GoldAutoResearchSection` (26 fields), `GoldAutoFullSummary`, `GoldAutoFillResponse`, `DailyGoldResearchReport`
- **Checklist:** 10-item gold research checklist
- **Session windows:** 6 trading sessions with SAST times
- **Constants:** `GOLD_PERSONAL_RULE`, `GOLD_RESEARCH_CHECKLIST_LABELS`

### `goldTradeSetup.ts`
- **Types:** `GoldSetupVerdict` (Buy Setup, Sell Setup, Wait, Pending Confirmation), `GoldSetupConfidence`
- **Key interfaces:** `GoldTradeSetupInputs`, `GoldTradeSetupResult`, `GoldTradeSetup`, `GoldTradeSetupResearchSummary`

---

## 11. Supabase SQL Migrations

| File | Purpose |
|---|---|
| `schema.sql` | Main schema: profiles, trades, trading_plans, gold_research_reports, daily_gold_research_reports, gold_trade_setups, lot_margin_calculations, RLS policies, triggers, indexes, storage bucket |
| `fresh-start.sql` | Clean slate migration |
| `gold-research-desk.sql` | Gold research desk tables |
| `gold-trade-setups.sql` | Gold trade setup tables |
| `daily-gold-research-reports.sql` | Daily research report tables |
| `lot-margin-calculator.sql` | Calculator tables |
| `smc-a-plus-upgrade.sql` | SMC A+ upgrade columns |

---

## 12. Git History (18 commits)

```
a85c873 fix: enforce recent news (7-day cutoff) in auto-fill prompts, require date on all news items
4943d7b revert: remove unrequested multi-provider market data rewrite
dcec48c fix: pull live gold price from Twelve Data instead of trusting LLM guess
9f5634b fix: upgrade AI model to gpt-4.1, enforce web_search on every request, clean sourceLink format
ce6c6fb fix: Gold Research page always shows all 9 research sections with institutional theme
8198f3e Phase 1 - Institutional dashboard redesign
65ee32f Redesign Gold research terminal
ab24439 Add Twelve Data Gold market data assistant
1bfa900 Clarify Gold setup assisted mode
1bfc437 Add Gold trade setup assistant
98b9722 Use cheaper Gold auto-fill model
bfa9f63 Fix Gold Research auto-fill parsing
bd061a6 Add Gold Research AI auto-fill
a52565e Add lot size and margin calculator
c9f993d Upgrade Gold Research core summary structure
8d699b1 Upgrade Gold Research driver analysis
c9a9ad3 Add PRIMASTA Gold Research Desk
384d2e1 Add SH+BMS RTO strategy
7887296 Initial PRIMASTA SMART TRADE JOURNAL app
```

---

## 13. Critical Bug Fixes (Completed)

### Bug #1: Trades page 404
- **Root cause:** `src/app/trades/page.tsx` was missing
- **Fix:** Created the file (commit `ce6c6fb` era)

### Bug #2: AI fabricating gold prices
- **Root cause:** OpenAI gpt-4o-mini was not reliably using web_search, sometimes returning memorized prices
- **Fix (multi-commit):**
  1. Upgraded to `gpt-4.1` (`9f5634b`)
  2. Added `tool_choice: "required"`, `search_context_size: "high"`, `max_output_tokens: 6000`
  3. Removed `goldCurrentPrice` from AI's JSON schema entirely
  4. `normalizeAutoFillResponse()` hardcodes `goldCurrentPrice: ""` to block AI-passed price
  5. Added `fetchLiveGoldPrice()` — independent TwelveData price fetch
  6. Added `withLivePrice()` — overrides AI price with `$<price> (live, Twelve Data)` (`dcec48c`)
  7. Added 7-day freshness rule + date requirements in prompts (`a85c873`)

### Revert: Multi-provider market data
- **Issue:** `marketDataEngine.ts` was created without request
- **Fix:** Deleted file, reverted `xauusd/route.ts` to original TwelveData-only version, restored all fallback text in `GoldResearchDesk.tsx` (`4943d7b`)

---

## 14. Known Constraints & Rules

### DO NOT
- Modify `.env` files
- Modify Supabase integration, authentication, API keys
- Delete or alter existing trade records
- Introduce multi-provider market data engines
- Remove the TwelveData-only source constraint
- Use `&&` in shell commands (Windows PowerShell — use `;`)

### PRESERVE
- All 18 commits of git history
- All Supabase tables, RLS policies, triggers
- All trade data in database
- Gold price always from TwelveData live source
- AI auto-fill: gpt-4.1 with forced web_search

---

## 15. Active TODO Items

| # | Item | Status |
|---|---|---|
| 1 | Write CURRENT_PROJECT_STATE.md | **IN PROGRESS** |
| 2 | Build out remaining Phase 2+ institutional redesign features | Pending |
| 3 | Remaining pages (journal, summary, plan, export, calculator, account) may need institutional theme pass | Pending |
| 4 | `lot_margin_calculations` table not in main `schema.sql` — only in separate migration file | Noted |
| 5 | `GoldResearchDesk.tsx` uses many hardcoded fallback strings — verify all match originals | Verified |

---

## 16. NPM Scripts

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"typecheck": "tsc --noEmit"
```

---

## 17. Key Components

### `GoldResearchDesk.tsx`
- Always renders all 9 research sections (never hides any)
- Each section shows: driver name, current data value, direction, news headline/summary, chart observation, source link, gold impact badge, reason
- Auto-fill button calls `/api/gold-research/auto-fill`
- Market data panel shows live XAU/USD from TwelveData
- 10-item gold research checklist with scoring
- Institutional dark theme with gold accents

### `AppDataContext.tsx` (1201 lines)
- Single source of truth for all app data
- Handles Supabase ↔ localStorage duality
- All CRUD operations: trades, gold research, daily research, trade setups, lot calculations, plans
- Normalization functions for Supabase row ↔ TypeScript type conversion

---

*This document captures the complete project state as of commit `a85c873`. Any new agent starting work on this project should read this file first.*
