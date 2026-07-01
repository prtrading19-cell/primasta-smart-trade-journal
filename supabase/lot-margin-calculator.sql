-- PRIMASTA LOT SIZE & MARGIN CALCULATOR
-- Safe migration for an existing Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.lot_margin_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  account_balance numeric not null default 0,
  account_currency text not null default 'USD',
  risk_type text not null default 'Percentage',
  risk_percentage numeric not null default 0,
  fixed_risk_amount numeric not null default 0,
  symbol text not null default 'XAUUSD',
  trade_type text not null default 'Buy',
  entry_price numeric not null default 0,
  stop_loss_price numeric not null default 0,
  take_profit_price numeric,
  leverage numeric not null default 0,
  contract_size numeric not null default 0,
  pip_size numeric not null default 0,
  pip_value_per_lot numeric not null default 0,
  lot_step numeric not null default 0,
  min_lot numeric not null default 0,
  max_lot numeric not null default 0,
  current_market_price numeric,
  conversion_rate numeric not null default 1,
  calculated_lot_size numeric not null default 0,
  raw_lot_size numeric not null default 0,
  risk_amount numeric not null default 0,
  stop_distance numeric not null default 0,
  stop_distance_in_pips numeric,
  risk_per_lot numeric not null default 0,
  estimated_loss numeric not null default 0,
  estimated_profit numeric,
  risk_reward_ratio numeric,
  notional_value numeric not null default 0,
  margin_required numeric not null default 0,
  margin_used_percentage numeric not null default 0,
  estimated_free_balance_after_margin numeric not null default 0,
  final_risk_status text not null default 'Invalid Trade',
  guidance text not null default '',
  warnings jsonb not null default '[]'::jsonb,
  is_valid boolean not null default false,
  notes text
);

create index if not exists lot_margin_calculations_user_created_idx on public.lot_margin_calculations(user_id, created_at desc);
create index if not exists lot_margin_calculations_user_symbol_idx on public.lot_margin_calculations(user_id, symbol);

alter table public.lot_margin_calculations enable row level security;

drop policy if exists "Users can insert own lot calculations" on public.lot_margin_calculations;
create policy "Users can insert own lot calculations"
on public.lot_margin_calculations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own lot calculations" on public.lot_margin_calculations;
create policy "Users can view own lot calculations"
on public.lot_margin_calculations for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own lot calculations" on public.lot_margin_calculations;
create policy "Users can update own lot calculations"
on public.lot_margin_calculations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own lot calculations" on public.lot_margin_calculations;
create policy "Users can delete own lot calculations"
on public.lot_margin_calculations for delete
using (auth.uid() = user_id);
