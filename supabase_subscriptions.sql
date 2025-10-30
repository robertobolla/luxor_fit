-- Subscriptions table to manage Stripe subscription state with 7-day trial logic

-- 1) Table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text check (status in ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- 2) Update trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.update_updated_at_column();

-- 3) Indexes
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_subscription_id on public.subscriptions(stripe_subscription_id);

-- 4) RLS
alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self on public.subscriptions
for select using (auth.uid()::text = user_id);

drop policy if exists subscriptions_insert_self on public.subscriptions;
create policy subscriptions_insert_self on public.subscriptions
for insert with check (auth.uid()::text = user_id);

drop policy if exists subscriptions_update_self on public.subscriptions;
create policy subscriptions_update_self on public.subscriptions
for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- 5) Helper view (optional): derived is_active flag
create or replace view public.v_user_subscription as
  select
    s.user_id,
    s.status,
    s.trial_start,
    s.trial_end,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    greatest(
      case when s.status in ('active','past_due') then 1 else 0 end,
      case when now() between coalesce(s.trial_start, now() - interval '1 day') and coalesce(s.trial_end, now() - interval '1 day') then 1 else 0 end
    ) = 1 as is_active
  from public.subscriptions s;

grant select on public.v_user_subscription to authenticated;


