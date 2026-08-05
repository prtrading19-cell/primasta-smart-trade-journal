-- PRIMASTA SMART TRADE JOURNAL - MT5 EXECUTION ENGINE FINAL UPGRADE
-- Additive-only migration for the Institutional Order Strategies (OCO, bracket,
-- scale-in, scale-out, basket) and the execution analytics layer.
-- No drops, no renames, no column removal. One new table only.
-- The in-memory ExecutionGroupStore remains authoritative; this table is a
-- best-effort persisted mirror (upsert on conflict group_id).

-- ============================================================================
-- 1. execution_groups
-- Linked-order groups. Each group owns multiple legs; a single approval
-- decides every leg. Leg status transitions are recorded in the immutable
-- execution_events trail (existing table) and mirrored here for reporting.
-- Columns mirror exactly what ExecutionGroupStore.persist() upserts, so the
-- additive migration and the store stay in sync.
-- ============================================================================

create table if not exists public.execution_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  group_id text not null,
  mode text not null,
  status text not null default 'pending',
  symbol text,
  legs_json jsonb not null default '[]'::jsonb,
  proposal_ids jsonb not null default '[]'::jsonb,
  note text,
  scale_out_levels jsonb not null default '[]'::jsonb,
  scale_out_original_volume numeric,
  scale_out_closed_volume numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, group_id)
);

create index if not exists execution_groups_user_status_idx on public.execution_groups(user_id, status);
create index if not exists execution_groups_user_created_idx on public.execution_groups(user_id, created_at desc);
create index if not exists execution_groups_user_mode_idx on public.execution_groups(user_id, mode);

alter table public.execution_groups enable row level security;

drop policy if exists "Users can insert own execution groups" on public.execution_groups;
create policy "Users can insert own execution groups"
on public.execution_groups for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own execution groups" on public.execution_groups;
create policy "Users can view own execution groups"
on public.execution_groups for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own execution groups" on public.execution_groups;
create policy "Users can update own execution groups"
on public.execution_groups for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists execution_groups_set_updated_at on public.execution_groups;
create trigger execution_groups_set_updated_at before update on public.execution_groups for each row execute function public.set_updated_at();
