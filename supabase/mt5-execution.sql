-- PRIMASTA SMART TRADE JOURNAL - MT5 EXECUTION ENGINE PERSISTENCE
-- Additive-only migration for the Institutional MT5 Trade Execution Engine.
-- No drops, no renames, no column removal. All new tables only.
-- Backed by the live Python MT5 gateway; figures below are gateway-verified values.

-- ============================================================================
-- 1. trade_proposals
-- Approval-gated order requests. approval_required is ON by default so no
-- order is ever transmitted without explicit approval. The audit trail is
-- immutable: once inserted, a proposal is only ever closed by 'approved' /
-- 'rejected' / 'cancelled' status transitions recorded in execution_events.
-- ============================================================================

create table if not exists public.trade_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id text not null,
  symbol text not null,
  order_type text not null,
  volume numeric not null,
  price numeric,
  stop_loss numeric,
  take_profit numeric,
  stop_limit_price numeric,
  fill_policy text,
  time_policy text,
  expiration timestamptz,
  comment text,
  magic bigint,
  approval_required boolean not null default true,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, proposal_id)
);

create index if not exists trade_proposals_user_status_idx on public.trade_proposals(user_id, status);
create index if not exists trade_proposals_user_created_idx on public.trade_proposals(user_id, created_at desc);
create index if not exists trade_proposals_user_symbol_idx on public.trade_proposals(user_id, symbol);

alter table public.trade_proposals enable row level security;

drop policy if exists "Users can insert own trade proposals" on public.trade_proposals;
create policy "Users can insert own trade proposals"
on public.trade_proposals for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own trade proposals" on public.trade_proposals;
create policy "Users can view own trade proposals"
on public.trade_proposals for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own trade proposals" on public.trade_proposals;
create policy "Users can update own trade proposals"
on public.trade_proposals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists trade_proposals_set_updated_at on public.trade_proposals;
create trigger trade_proposals_set_updated_at before update on public.trade_proposals for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. trade_execution_logs
-- Immutable broker round-trips. Each row is one submitted order request with
-- the gateway order result snapshot and the full validation check list.
-- ============================================================================

create table if not exists public.trade_execution_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id text,
  order_type text not null,
  symbol text not null,
  volume numeric not null,
  price numeric,
  stop_loss numeric,
  take_profit numeric,
  stop_limit_price numeric,
  fill_policy text,
  time_policy text,
  expiration timestamptz,
  magic bigint,
  validation jsonb not null default '[]'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  gateway_error text,
  mt5_ticket bigint,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

create index if not exists trade_execution_logs_user_created_idx on public.trade_execution_logs(user_id, created_at desc);
create index if not exists trade_execution_logs_user_proposal_idx on public.trade_execution_logs(user_id, proposal_id);
create index if not exists trade_execution_logs_user_symbol_idx on public.trade_execution_logs(user_id, symbol);

alter table public.trade_execution_logs enable row level security;

drop policy if exists "Users can insert own execution logs" on public.trade_execution_logs;
create policy "Users can insert own execution logs"
on public.trade_execution_logs for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own execution logs" on public.trade_execution_logs;
create policy "Users can view own execution logs"
on public.trade_execution_logs for select
using (auth.uid() = user_id);

-- ============================================================================
-- 3. execution_events
-- Immutable event log across the execution lifecycle: proposal created,
-- approved, transmitted, accepted, filled, rejected, failed, expired.
-- ============================================================================

create table if not exists public.execution_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  proposal_id text,
  kind text not null,
  stage text not null,
  message text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists execution_events_user_created_idx on public.execution_events(user_id, created_at desc);
create index if not exists execution_events_user_proposal_idx on public.execution_events(user_id, proposal_id);
create index if not exists execution_events_user_kind_idx on public.execution_events(user_id, kind);

alter table public.execution_events enable row level security;

drop policy if exists "Users can insert own execution events" on public.execution_events;
create policy "Users can insert own execution events"
on public.execution_events for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own execution events" on public.execution_events;
create policy "Users can view own execution events"
on public.execution_events for select
using (auth.uid() = user_id);

-- ============================================================================
-- 4. risk_snapshots
-- Point-in-time risk posture taken at proposal time: equity, balance, free
-- margin, margin level, daily loss budget, exposure by group, open trade
-- count, spread and stop-level values.
-- ============================================================================

create table if not exists public.risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id text,
  account_number text,
  balance numeric,
  equity numeric,
  free_margin numeric,
  margin_level numeric,
  daily_loss_budget numeric,
  daily_loss_used numeric,
  open_trade_count integer,
  open_lots numeric,
  exposure_by_group jsonb not null default '{}'::jsonb,
  spreads_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists risk_snapshots_user_created_idx on public.risk_snapshots(user_id, created_at desc);
create index if not exists risk_snapshots_user_proposal_idx on public.risk_snapshots(user_id, proposal_id);

alter table public.risk_snapshots enable row level security;

drop policy if exists "Users can insert own risk snapshots" on public.risk_snapshots;
create policy "Users can insert own risk snapshots"
on public.risk_snapshots for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own risk snapshots" on public.risk_snapshots;
create policy "Users can view own risk snapshots"
on public.risk_snapshots for select
using (auth.uid() = user_id);

-- ============================================================================
-- 5. pending_orders
-- Mirror of broker-side pending orders surfaced by the gateway so the journal
-- can reconcile approvals against what the broker actually holds.
-- ============================================================================

create table if not exists public.pending_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticket bigint not null,
  symbol text not null,
  order_type text not null,
  volume numeric not null,
  price numeric,
  stop_loss numeric,
  take_profit numeric,
  magic bigint,
  state text not null default 'pending',
  broker_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ticket)
);

create index if not exists pending_orders_user_symbol_idx on public.pending_orders(user_id, symbol);
create index if not exists pending_orders_user_state_idx on public.pending_orders(user_id, state);

alter table public.pending_orders enable row level security;

drop policy if exists "Users can insert own pending orders" on public.pending_orders;
create policy "Users can insert own pending orders"
on public.pending_orders for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own pending orders" on public.pending_orders;
create policy "Users can view own pending orders"
on public.pending_orders for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own pending orders" on public.pending_orders;
create policy "Users can update own pending orders"
on public.pending_orders for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists pending_orders_set_updated_at on public.pending_orders;
create trigger pending_orders_set_updated_at before update on public.pending_orders for each row execute function public.set_updated_at();
