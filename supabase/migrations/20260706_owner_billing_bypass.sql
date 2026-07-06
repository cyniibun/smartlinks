-- Permanent account-level billing bypass for the internal owner.
alter table public.profiles add column if not exists billing_bypass boolean not null default false;

update public.profiles p
set billing_bypass = true
from auth.users u
where p.id = u.id
  and lower(u.email) = 'joe@cyniical.productions';

-- Preserve the entitlement even if the Auth user is created after this migration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, billing_bypass)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name', lower(coalesce(new.email, '')) = 'joe@cyniical.productions')
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    billing_bypass = public.profiles.billing_bypass or excluded.billing_bypass;
  return new;
end;
$$;

-- Profile owners may edit presentation fields, but never their own billing entitlement.
revoke update on table public.profiles from authenticated;
grant update (username, full_name) on table public.profiles to authenticated;

comment on column public.profiles.billing_bypass is
  'Server-managed entitlement. When true, plan limits and future Stripe paywalls must not restrict this account.';
