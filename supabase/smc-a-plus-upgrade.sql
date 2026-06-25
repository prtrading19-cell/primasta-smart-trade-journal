-- PRIMASTA SMART TRADE JOURNAL - SMC A+ UPGRADE
-- Safe migration for an existing Supabase project.
-- This script only adds nullable columns and preserves existing trade data.

alter table public.trades add column if not exists htf_bias text;
alter table public.trades add column if not exists liquidity_swept text;
alter table public.trades add column if not exists entry_poi text;
alter table public.trades add column if not exists confirmation_timeframe text;
alter table public.trades add column if not exists setup_grade text;
alter table public.trades add column if not exists news_risk text;
alter table public.trades add column if not exists trading_rule_status text;
alter table public.trades add column if not exists a_plus_score integer;
alter table public.trades add column if not exists smc_checklist jsonb;

update public.trades
set smc_checklist = checklist
where smc_checklist is null
  and checklist is not null;

update public.trades
set a_plus_score = (
  select count(*)::integer
  from jsonb_each(coalesce(smc_checklist, checklist, '{}'::jsonb))
  where value = 'true'::jsonb
)
where a_plus_score is null;

create index if not exists trades_user_setup_grade_idx on public.trades(user_id, setup_grade);
create index if not exists trades_user_a_plus_score_idx on public.trades(user_id, a_plus_score);
