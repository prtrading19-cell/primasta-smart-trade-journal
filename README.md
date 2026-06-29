# PRIMASTA SMART TRADE JOURNAL

A clean, fully web-based Forex trading journal and performance dashboard built with Next.js, TypeScript, Tailwind CSS, Supabase authentication, and Supabase Postgres.

The production data layer is Supabase. The app includes a local demo mode only for previewing the UI when Supabase env vars are missing.

## Features

- User login, sign up, and logout through Supabase Auth
- Private per-user trades and trading plan with Supabase Row Level Security
- Private Supabase Storage bucket for trade screenshot uploads
- Fast new trade form that saves trades as Open by default
- A+ SMC strategy list with setup-specific helper descriptions
- Professional 15-point A+ SMC checklist with live A+ score, automatic setup grade, news-risk warning, and rule status
- SMC execution fields for HTF bias, swept liquidity, entry POI, confirmation timeframe, setup grade, news risk, and trading rule status
- No Trade / Setup Not Confirmed observations that can be saved without entry price, stop loss, take profit, or lot size
- PRIMASTA Gold Research Desk for manual Gold/XAUUSD driver analysis, saved research reports, full bias summaries, pre-trade checklist, session guide, PDF/CSV exports, and optional research attachment to trades
- Close Trade flow for adding only the final result details later
- Spreadsheet-style trading journal with tabs, filters, search, sorting, edit, delete, detail view, and per-trade PDF export
- Dashboard metrics and charts based only on closed trades
- Summary page with best/worst pair, SMC setup, strategy, session, setup-grade win rates, common mistakes, rule violations, A+ score counts, and monthly performance
- Exports for CSV, Excel-compatible `.xls`, JSON backup, full PDF report, monthly PDF report, open trades report, and closed trades report
- Responsive layout for desktop, tablet, and mobile
- Light mode, dark mode, and basic PWA manifest

## Important Calculation Rule

Open trades are shown in the dashboard and journal, but they do not affect:

- win rate
- total profit/loss
- total R
- average R
- profit factor
- drawdown
- summaries
- performance reports

Those calculations use closed trades only.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. In Supabase, open `SQL Editor`, paste the contents of `supabase/schema.sql`, and run it.

This creates the database tables, RLS policies, and a private Supabase Storage bucket named `trade-screenshots`.

If you already have an older PRIMASTA database, run `supabase/smc-a-plus-upgrade.sql` instead of recreating tables. It adds nullable SMC columns and preserves existing trades.

For the PRIMASTA Gold Research Desk, also run `supabase/gold-research-desk.sql`. It creates `gold_research_reports`, RLS policies, and the optional trade attachment column without deleting existing data.

4. Enable email/password auth:

- Supabase Dashboard
- Authentication
- Providers
- Email
- Enable Email provider

5. Copy your Supabase project URL and anon key into `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

6. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Mode

If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the app runs in demo mode so the UI can be reviewed locally. Demo mode uses browser storage and is not the production database.

For real multi-device access, set up Supabase and deploy with those env vars.

## Supabase Cloud Storage

Screenshot fields support two options:

- Paste an existing image link.
- Upload an image directly to Supabase Storage.

To enable uploads:

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run `supabase/schema.sql` in Supabase.
3. Sign in to the app.
4. Use `Upload to Supabase` on the New Trade form or Close Trade dialog.

The SQL creates a private `trade-screenshots` bucket with a 5 MB image limit. Files are saved under the signed-in user's ID, and storage policies only allow each user to view, upload, update, or delete their own screenshots.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Add these environment variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Use the default build settings:

- Build command: `npm run build`
- Output: Next.js default

5. Deploy. The app will be available from any browser on desktop, tablet, and mobile.

## Deploy to Netlify

1. Import the repository in Netlify.
2. Add the same Supabase environment variables.
3. Use:

```bash
npm run build
```

Netlify should detect Next.js automatically. If needed, install the official Netlify Next.js runtime.

## Database Tables

The Supabase schema creates:

- `profiles`
- `trades`
- `trading_plans`
- private Storage bucket: `trade-screenshots`

Every table has RLS enabled. Trades and plans are scoped to `auth.uid()`, so each trader can only read and change their own data.

## Suggested Next Steps

- Add Supabase Storage if you want real screenshot uploads instead of screenshot links.
- Add custom domain and HTTPS through Vercel or Netlify.
- Add stricter password and email confirmation policies in Supabase Auth for production.
