-- Epic 3B: Gold Research Engine v2 Persistence Layer Upgrade
-- Additive-only migration. No drops, no renames, no data loss.
-- All new columns are nullable to preserve existing rows.

-- ============================================================================
-- 1. Extend gold_research_reports with driver scoring metadata
-- ============================================================================

-- Driver scoring fields
alter table public.gold_research_reports add column if not exists driver_strength text;
alter table public.gold_research_reports add column if not exists driver_confidence integer;
alter table public.gold_research_reports add column if not exists driver_weight numeric;
alter table public.gold_research_reports add column if not exists driver_contribution numeric;
alter table public.gold_research_reports add column if not exists driver_category text;
alter table public.gold_research_reports add column if not exists confidence_explanation text;

-- Future driver fields (unused until later Epics)
alter table public.gold_research_reports add column if not exists trend text;
alter table public.gold_research_reports add column if not exists momentum text;
alter table public.gold_research_reports add column if not exists historical_change text;
alter table public.gold_research_reports add column if not exists economic_surprise text;

-- Expanded analysis JSONB (flexible storage for v2 analysis objects)
alter table public.gold_research_reports add column if not exists driver_analysis_v2 jsonb;

-- ============================================================================
-- 2. Extend daily_gold_research_reports with category + decision engine
-- ============================================================================

-- Category scores JSONB: stores CategoryScoreObject[] for all 9 categories
-- Format: [{ categoryId, categoryTitle, score, bias, confidence, reason, weight, weightedScore, alignmentScore, alignmentStrength, hasConflict, driverContributions: [...], timestamp }]
alter table public.daily_gold_research_reports add column if not exists category_scores_json jsonb;

-- Decision engine output JSONB: stores GoldDecisionEngineOutput foundation
-- Format: { macroScore, technicalScore, institutionalScore, sentimentScore, riskScore, finalGoldScore, overallBias, overallConfidence, reasoningSummary, riskWarnings: [...], driverAlignment, alignmentStrength, timestamp }
alter table public.daily_gold_research_reports add column if not exists decision_engine_json jsonb;

-- Expanded sections for future drivers beyond the original 9
-- New drivers (Economic Growth, Gold ETF Flows, etc.) are stored here
alter table public.daily_gold_research_reports add column if not exists expanded_sections_json jsonb;

-- Version marker for schema versioning
alter table public.daily_gold_research_reports add column if not exists schema_version integer default 1;

-- ============================================================================
-- 3. New table: gold_category_scores
-- Stores individual category score records for historical tracking
-- ============================================================================

create table if not exists public.gold_category_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_report_id uuid references public.daily_gold_research_reports(id) on delete cascade,
  category_id text not null,
  category_title text not null,
  score numeric not null default 0,
  bias text not null default 'Neutral',
  confidence integer not null default 0,
  reason text not null default '',
  weight numeric not null default 0,
  weighted_score numeric not null default 0,
  driver_contributions jsonb not null default '[]'::jsonb,
  alignment_score numeric not null default 0,
  alignment_strength text not null default 'None',
  has_conflict boolean not null default false,
  driver_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gold_category_scores_user_daily_idx on public.gold_category_scores(user_id, daily_report_id);
create index if not exists gold_category_scores_user_category_idx on public.gold_category_scores(user_id, category_id);
create index if not exists gold_category_scores_user_created_idx on public.gold_category_scores(user_id, created_at desc);

alter table public.gold_category_scores enable row level security;

drop policy if exists "Users can insert own category scores" on public.gold_category_scores;
create policy "Users can insert own category scores"
on public.gold_category_scores for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own category scores" on public.gold_category_scores;
create policy "Users can view own category scores"
on public.gold_category_scores for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own category scores" on public.gold_category_scores;
create policy "Users can update own category scores"
on public.gold_category_scores for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own category scores" on public.gold_category_scores;
create policy "Users can delete own category scores"
on public.gold_category_scores for delete
using (auth.uid() = user_id);

drop trigger if exists gold_category_scores_set_updated_at on public.gold_category_scores;
create trigger gold_category_scores_set_updated_at before update on public.gold_category_scores for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. New table: gold_decision_engine_outputs
-- Foundation storage for future Decision Engine outputs
-- ============================================================================

create table if not exists public.gold_decision_engine_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_report_id uuid references public.daily_gold_research_reports(id) on delete cascade,
  macro_score numeric not null default 0,
  technical_score numeric not null default 0,
  institutional_score numeric not null default 0,
  sentiment_score numeric not null default 0,
  risk_score numeric not null default 0,
  final_gold_score numeric not null default 0,
  overall_bias text not null default 'Neutral',
  overall_confidence integer not null default 0,
  decision text not null default 'Wait',
  reasoning_summary text not null default '',
  risk_warnings jsonb not null default '[]'::jsonb,
  supporting_drivers jsonb not null default '[]'::jsonb,
  conflicting_drivers jsonb not null default '[]'::jsonb,
  driver_alignment numeric not null default 0,
  alignment_strength text not null default 'None',
  category_scores_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gold_decision_engine_outputs_user_daily_idx on public.gold_decision_engine_outputs(user_id, daily_report_id);
create index if not exists gold_decision_engine_outputs_user_created_idx on public.gold_decision_engine_outputs(user_id, created_at desc);
create index if not exists gold_decision_engine_outputs_user_bias_idx on public.gold_decision_engine_outputs(user_id, overall_bias);

alter table public.gold_decision_engine_outputs enable row level security;

drop policy if exists "Users can insert own decision engine outputs" on public.gold_decision_engine_outputs;
create policy "Users can insert own decision engine outputs"
on public.gold_decision_engine_outputs for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own decision engine outputs" on public.gold_decision_engine_outputs;
create policy "Users can view own decision engine outputs"
on public.gold_decision_engine_outputs for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own decision engine outputs" on public.gold_decision_engine_outputs;
create policy "Users can update own decision engine outputs"
on public.gold_decision_engine_outputs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own decision engine outputs" on public.gold_decision_engine_outputs;
create policy "Users can delete own decision engine outputs"
on public.gold_decision_engine_outputs for delete
using (auth.uid() = user_id);

drop trigger if exists gold_decision_engine_outputs_set_updated_at on public.gold_decision_engine_outputs;
create trigger gold_decision_engine_outputs_set_updated_at before update on public.gold_decision_engine_outputs for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. Indexes for new query patterns
-- ============================================================================

create index if not exists gold_research_reports_driver_category_idx on public.gold_research_reports(user_id, driver_category) where driver_category is not null;
create index if not exists gold_research_reports_driver_strength_idx on public.gold_research_reports(user_id, driver_strength) where driver_strength is not null;
create index if not exists daily_gold_research_reports_schema_version_idx on public.daily_gold_research_reports(user_id, schema_version) where schema_version > 1;
