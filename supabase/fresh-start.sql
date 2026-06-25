-- PRIMASTA SMART TRADE JOURNAL - FRESH START
-- Use this if an earlier partial setup created broken tables.
-- WARNING: this deletes existing journal tables and their data.

drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.trading_plans cascade;
drop table if exists public.trades cascade;
drop table if exists public.profiles cascade;

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

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.trades (
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

create table public.trading_plans (
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

create index trades_user_date_idx on public.trades(user_id, date desc);
create index trades_user_status_idx on public.trades(user_id, status);
create index trades_user_pair_idx on public.trades(user_id, pair);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trades_set_updated_at before update on public.trades for each row execute function public.set_updated_at();
create trigger trading_plans_set_updated_at before update on public.trading_plans for each row execute function public.set_updated_at();

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

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.trades enable row level security;
alter table public.trading_plans enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can insert own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can view own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users can update own trades" on public.trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trades" on public.trades for delete using (auth.uid() = user_id);

create policy "Users can insert own trading plan" on public.trading_plans for insert with check (auth.uid() = user_id);
create policy "Users can view own trading plan" on public.trading_plans for select using (auth.uid() = user_id);
create policy "Users can update own trading plan" on public.trading_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trading plan" on public.trading_plans for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own screenshots" on storage.objects;
create policy "Users can view own screenshots"
on storage.objects for select
using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can upload own screenshots" on storage.objects;
create policy "Users can upload own screenshots"
on storage.objects for insert
with check (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own screenshots" on storage.objects;
create policy "Users can update own screenshots"
on storage.objects for update
using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own screenshots" on storage.objects;
create policy "Users can delete own screenshots"
on storage.objects for delete
using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
