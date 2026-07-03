-- PRIMASTA DAILY GOLD RESEARCH REPORTS
-- Safe migration for AI auto-filled daily Gold research.
-- This keeps the existing gold_research_reports table unchanged.

create extension if not exists pgcrypto;

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

alter table public.daily_gold_research_reports add column if not exists gold_current_price text;
alter table public.daily_gold_research_reports add column if not exists sections_json jsonb not null default '[]'::jsonb;
alter table public.daily_gold_research_reports add column if not exists full_summary_json jsonb not null default '{}'::jsonb;
alter table public.daily_gold_research_reports add column if not exists overall_gold_bias text not null default 'Mixed-Wait';
alter table public.daily_gold_research_reports add column if not exists pre_trade_verdict text not null default 'Wait';
alter table public.daily_gold_research_reports add column if not exists created_at timestamptz not null default now();
alter table public.daily_gold_research_reports add column if not exists updated_at timestamptz not null default now();

create unique index if not exists daily_gold_research_reports_user_date_uidx on public.daily_gold_research_reports(user_id, report_date);
create index if not exists daily_gold_research_reports_user_created_idx on public.daily_gold_research_reports(user_id, created_at desc);
create index if not exists daily_gold_research_reports_user_bias_idx on public.daily_gold_research_reports(user_id, overall_gold_bias);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
