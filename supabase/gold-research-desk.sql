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
