-- Run after 001_chubb_club.sql
create table if not exists public.premium_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'inactive' check(status in ('inactive','pending','active','expired')),
  provider text,
  provider_reference text,
  activated_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.premium_entitlements enable row level security;
create policy "entitlement own read" on public.premium_entitlements for select using(auth.uid()=user_id);

-- New signups use the username entered on the signup form.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare desired text;
begin
  desired := coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1));
  insert into public.profiles(id,username,display_name)
  values(new.id, desired, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), desired));
  return new;
end; $$;
