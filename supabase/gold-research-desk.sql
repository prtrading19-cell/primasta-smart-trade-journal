-- PRIMASTA GOLD RESEARCH DESK
-- Safe migration for an existing Supabase project.
-- This creates user-scoped Gold research reports and an optional trade attachment column.

create extension if not exists pgcrypto;

create table if not exists public.gold_research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  report_date date not null default current_date,
  driver_name text not null,
  input_headline text,
  input_summary text,
  news_headline text,
  news_summary text,
  current_value text,
  chart_observation text,
  source_link text,
  driver_fields jsonb,
  driver_specific_data jsonb,
  analysis_result jsonb,
  gold_bias text not null,
  impact_level text not null,
  time_sensitivity text not null,
  confidence_score integer not null default 0,
  explanation text not null default '',
  gold_meaning text not null default '',
  checklist_effect text not null,
  trading_caution text not null default '',
  final_guidance text not null default '',
  notes text
);

alter table public.gold_research_reports add column if not exists driver_fields jsonb;
alter table public.gold_research_reports add column if not exists news_headline text;
alter table public.gold_research_reports add column if not exists news_summary text;
alter table public.gold_research_reports add column if not exists driver_specific_data jsonb;
alter table public.gold_research_reports add column if not exists analysis_result jsonb;
alter table public.trades add column if not exists gold_research_report_id uuid references public.gold_research_reports(id) on delete set null;

create index if not exists gold_research_reports_user_date_idx on public.gold_research_reports(user_id, report_date desc);
create index if not exists gold_research_reports_user_driver_idx on public.gold_research_reports(user_id, driver_name);
create index if not exists gold_research_reports_user_bias_idx on public.gold_research_reports(user_id, gold_bias);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists gold_research_reports_set_updated_at on public.gold_research_reports;
create trigger gold_research_reports_set_updated_at before update on public.gold_research_reports for each row execute function public.set_updated_at();

alter table public.gold_research_reports enable row level security;

drop policy if exists "Users can insert own gold research" on public.gold_research_reports;
create policy "Users can insert own gold research"
on public.gold_research_reports for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own gold research" on public.gold_research_reports;
create policy "Users can view own gold research"
on public.gold_research_reports for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own gold research" on public.gold_research_reports;
create policy "Users can update own gold research"
on public.gold_research_reports for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own gold research" on public.gold_research_reports;
create policy "Users can delete own gold research"
on public.gold_research_reports for delete
using (auth.uid() = user_id);

create table if not exists public.daily_gold_research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null default current_date,
  gold_current_price text,
  sections_json jsonb not null default '[]'::jsonb,
  full_summary_json jsonb not null default '{}'::jsonb,
  overall_gold_bias text not null default 'Mixed-Wait',
  pre_trade_verdict text not null default 'Wait',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists daily_gold_research_reports_user_date_uidx on public.daily_gold_research_reports(user_id, report_date);
create index if not exists daily_gold_research_reports_user_created_idx on public.daily_gold_research_reports(user_id, created_at desc);
create index if not exists daily_gold_research_reports_user_bias_idx on public.daily_gold_research_reports(user_id, overall_gold_bias);

drop trigger if exists daily_gold_research_reports_set_updated_at on public.daily_gold_research_reports;
create trigger daily_gold_research_reports_set_updated_at before update on public.daily_gold_research_reports for each row execute function public.set_updated_at();

alter table public.daily_gold_research_reports enable row level security;

drop policy if exists "Users can insert own daily gold research" on public.daily_gold_research_reports;
create policy "Users can insert own daily gold research"
on public.daily_gold_research_reports for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own daily gold research" on public.daily_gold_research_reports;
create policy "Users can view own daily gold research"
on public.daily_gold_research_reports for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own daily gold research" on public.daily_gold_research_reports;
create policy "Users can update own daily gold research"
on public.daily_gold_research_reports for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own daily gold research" on public.daily_gold_research_reports;
create policy "Users can delete own daily gold research"
on public.daily_gold_research_reports for delete
using (auth.uid() = user_id);

create table if not exists public.gold_trade_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  research_report_id uuid references public.gold_research_reports(id) on delete set null,
  setup_date date not null default current_date,
  current_gold_price text,
  overall_gold_bias text,
  setup_verdict text not null default 'Wait',
  confidence text not null default 'Low',
  selected_strategy text,
  strategy_reason text,
  buy_side_liquidity text,
  sell_side_liquidity text,
  liquidity_target text,
  entry_area text,
  stop_loss_area text,
  take_profit_area text,
  risk_reward_ratio text,
  invalidation_level text,
  confirmation_needed text,
  main_risk text,
  final_guidance text,
  status text not null default 'Planned'
);

alter table public.trades add column if not exists gold_trade_setup_id uuid references public.gold_trade_setups(id) on delete set null;

create index if not exists gold_trade_setups_user_created_idx on public.gold_trade_setups(user_id, created_at desc);
create index if not exists gold_trade_setups_user_date_idx on public.gold_trade_setups(user_id, setup_date desc);
create index if not exists gold_trade_setups_user_status_idx on public.gold_trade_setups(user_id, status);

alter table public.gold_trade_setups enable row level security;

drop policy if exists "Users can insert own gold trade setups" on public.gold_trade_setups;
create policy "Users can insert own gold trade setups"
on public.gold_trade_setups for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own gold trade setups" on public.gold_trade_setups;
create policy "Users can view own gold trade setups"
on public.gold_trade_setups for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own gold trade setups" on public.gold_trade_setups;
create policy "Users can update own gold trade setups"
on public.gold_trade_setups for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own gold trade setups" on public.gold_trade_setups;
create policy "Users can delete own gold trade setups"
on public.gold_trade_setups for delete
using (auth.uid() = user_id);
