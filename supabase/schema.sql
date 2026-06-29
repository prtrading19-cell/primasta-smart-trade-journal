-- PRIMASTA SMART TRADE JOURNAL
-- Run this in the Supabase SQL editor after creating your Supabase project.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-screenshots',
  'trade-screenshots',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  pair text not null,
  trade_type text not null check (trade_type in ('Buy', 'Sell')),
  strategy text not null,
  session text not null check (session in ('Asian', 'London', 'New York', 'London/New York overlap')),
  timeframe text not null check (timeframe in ('Daily', 'H4', 'H1', 'M15', 'M5')),
  entry_price numeric not null,
  stop_loss numeric not null,
  take_profit numeric not null,
  lot_size numeric not null,
  risk_amount numeric not null,
  entry_reason text not null,
  checklist jsonb not null default '{}'::jsonb,
  smc_checklist jsonb,
  htf_bias text,
  liquidity_swept text,
  entry_poi text,
  confirmation_timeframe text,
  setup_grade text,
  news_risk text,
  trading_rule_status text,
  a_plus_score integer,
  emotion_before text not null check (emotion_before in ('Calm', 'Confident', 'Fearful', 'Greedy', 'Impatient', 'Revenge')),
  screenshot_before text,
  status text not null default 'Open' check (status in ('Open', 'Closed')),
  exit_price numeric,
  final_result text check (final_result in ('Win', 'Loss', 'Break-even')),
  profit_loss numeric,
  r_multiple numeric,
  exit_reason text,
  mistake_made text,
  lesson_learned text,
  screenshot_after text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint closed_trade_requires_result check (
    status = 'Open'
    or (
      status = 'Closed'
      and exit_price is not null
      and final_result is not null
      and profit_loss is not null
      and r_multiple is not null
    )
  )
);

create table if not exists public.trading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  main_market text not null default 'Forex',
  allowed_pairs text not null default 'EURUSD, GBPUSD, USDJPY, XAUUSD',
  max_trades_per_day integer not null default 2,
  risk_per_trade text not null default '0.25% to 0.5%',
  minimum_risk_reward text not null default '1:2',
  stop_after_losses integer not null default 2,
  main_strategy text not null default 'Primasta setup',
  personal_rules text not null default 'No revenge trading
No overtrading
No moving stop loss
No trading without a stop loss
No trading without a clear setup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repair partially-created tables from earlier setup attempts.
-- If a table already existed, "create table if not exists" skips it, so these
-- statements make sure all app-required columns are present before indexes run.
alter table public.profiles add column if not exists id uuid;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz default now();

alter table public.trades add column if not exists id uuid default gen_random_uuid();
alter table public.trades add column if not exists user_id uuid;
alter table public.trades add column if not exists date date default current_date;
alter table public.trades add column if not exists pair text default '';
alter table public.trades add column if not exists trade_type text default 'Buy';
alter table public.trades add column if not exists strategy text default '';
alter table public.trades add column if not exists session text default 'London';
alter table public.trades add column if not exists timeframe text default 'H1';
alter table public.trades add column if not exists entry_price numeric default 0;
alter table public.trades add column if not exists stop_loss numeric default 0;
alter table public.trades add column if not exists take_profit numeric default 0;
alter table public.trades add column if not exists lot_size numeric default 0;
alter table public.trades add column if not exists risk_amount numeric default 0;
alter table public.trades add column if not exists entry_reason text default '';
alter table public.trades add column if not exists checklist jsonb default '{}'::jsonb;
alter table public.trades add column if not exists smc_checklist jsonb;
alter table public.trades add column if not exists htf_bias text;
alter table public.trades add column if not exists liquidity_swept text;
alter table public.trades add column if not exists entry_poi text;
alter table public.trades add column if not exists confirmation_timeframe text;
alter table public.trades add column if not exists setup_grade text;
alter table public.trades add column if not exists news_risk text;
alter table public.trades add column if not exists trading_rule_status text;
alter table public.trades add column if not exists a_plus_score integer;
alter table public.trades add column if not exists gold_research_report_id uuid;
alter table public.trades add column if not exists emotion_before text default 'Calm';
alter table public.trades add column if not exists screenshot_before text;
alter table public.trades add column if not exists status text default 'Open';
alter table public.trades add column if not exists exit_price numeric;
alter table public.trades add column if not exists final_result text;
alter table public.trades add column if not exists profit_loss numeric;
alter table public.trades add column if not exists r_multiple numeric;
alter table public.trades add column if not exists exit_reason text;
alter table public.trades add column if not exists mistake_made text;
alter table public.trades add column if not exists lesson_learned text;
alter table public.trades add column if not exists screenshot_after text;
alter table public.trades add column if not exists created_at timestamptz default now();
alter table public.trades add column if not exists updated_at timestamptz default now();

alter table public.trading_plans add column if not exists id uuid default gen_random_uuid();
alter table public.trading_plans add column if not exists user_id uuid;
alter table public.trading_plans add column if not exists main_market text default 'Forex';
alter table public.trading_plans add column if not exists allowed_pairs text default 'EURUSD, GBPUSD, USDJPY, XAUUSD';
alter table public.trading_plans add column if not exists max_trades_per_day integer default 2;
alter table public.trading_plans add column if not exists risk_per_trade text default '0.25% to 0.5%';
alter table public.trading_plans add column if not exists minimum_risk_reward text default '1:2';
alter table public.trading_plans add column if not exists stop_after_losses integer default 2;
alter table public.trading_plans add column if not exists main_strategy text default 'Primasta setup';
alter table public.trading_plans add column if not exists personal_rules text default 'No revenge trading
No overtrading
No moving stop loss
No trading without a stop loss
No trading without a clear setup';
alter table public.trading_plans add column if not exists created_at timestamptz default now();
alter table public.trading_plans add column if not exists updated_at timestamptz default now();

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

create index if not exists trades_user_date_idx on public.trades(user_id, date desc);
create index if not exists trades_user_status_idx on public.trades(user_id, status);
create index if not exists trades_user_pair_idx on public.trades(user_id, pair);
create unique index if not exists trading_plans_user_id_unique_idx on public.trading_plans(user_id);
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

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at before update on public.trades for each row execute function public.set_updated_at();

drop trigger if exists trading_plans_set_updated_at on public.trading_plans;
create trigger trading_plans_set_updated_at before update on public.trading_plans for each row execute function public.set_updated_at();

drop trigger if exists gold_research_reports_set_updated_at on public.gold_research_reports;
create trigger gold_research_reports_set_updated_at before update on public.gold_research_reports for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data ->> 'name', new.email)
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email;

  insert into public.trading_plans (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.trades enable row level security;
alter table public.trading_plans enable row level security;
alter table public.gold_research_reports enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert own trades" on public.trades;
create policy "Users can insert own trades"
on public.trades for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own trades" on public.trades;
create policy "Users can view own trades"
on public.trades for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own trades" on public.trades;
create policy "Users can update own trades"
on public.trades for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own trades" on public.trades;
create policy "Users can delete own trades"
on public.trades for delete
using (auth.uid() = user_id);

drop policy if exists "Users can insert own trading plan" on public.trading_plans;
create policy "Users can insert own trading plan"
on public.trading_plans for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own trading plan" on public.trading_plans;
create policy "Users can view own trading plan"
on public.trading_plans for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own trading plan" on public.trading_plans;
create policy "Users can update own trading plan"
on public.trading_plans for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own trading plan" on public.trading_plans;
create policy "Users can delete own trading plan"
on public.trading_plans for delete
using (auth.uid() = user_id);

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

drop policy if exists "Users can view own screenshots" on storage.objects;
create policy "Users can view own screenshots"
on storage.objects for select
using (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own screenshots" on storage.objects;
create policy "Users can upload own screenshots"
on storage.objects for insert
with check (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own screenshots" on storage.objects;
create policy "Users can update own screenshots"
on storage.objects for update
using (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own screenshots" on storage.objects;
create policy "Users can delete own screenshots"
on storage.objects for delete
using (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);
