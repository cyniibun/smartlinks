alter table public.workspace_subscriptions
add column if not exists billing_interval text,
add column if not exists stripe_price_id text,
add column if not exists current_period_starts_at timestamptz;

update public.workspace_subscriptions
set billing_interval = 'monthly'
where billing_interval is null;

alter table public.workspace_subscriptions
alter column billing_interval set default 'monthly';

alter table public.workspace_subscriptions
alter column billing_interval set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_subscriptions_billing_interval_check'
      and conrelid = 'public.workspace_subscriptions'::regclass
  ) then
    alter table public.workspace_subscriptions
    add constraint workspace_subscriptions_billing_interval_check
    check (billing_interval in ('monthly','annual'));
  end if;
end $$;

create index if not exists workspace_subscriptions_stripe_price_idx
on public.workspace_subscriptions (stripe_price_id);

create index if not exists workspace_subscriptions_interval_idx
on public.workspace_subscriptions (billing_interval);
