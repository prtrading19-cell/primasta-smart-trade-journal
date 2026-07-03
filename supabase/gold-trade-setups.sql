-- PRIMASTA GOLD TRADE SETUP ASSISTANT
-- Safe migration for saved Gold trade setup plans.

create extension if not exists pgcrypto;

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
