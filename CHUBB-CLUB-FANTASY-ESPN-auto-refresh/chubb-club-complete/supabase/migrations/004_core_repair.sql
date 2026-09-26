-- Chubb Club core account + Pick'em repair. Safe to run after 001/002.
-- This migration is idempotent so it can be re-run if needed.

-- Ensure signed-in users can insert/update their own profile.
drop policy if exists "profile own insert" on public.profiles;
create policy "profile own insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profile own update" on public.profiles;
create policy "profile own update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Make new-account profile creation resilient to duplicate usernames.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired text;
  final_username text;
begin
  desired := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1), 'member'), '[^a-zA-Z0-9_]', '', 'g'));
  if length(desired) < 3 then desired := 'member'; end if;
  final_username := left(desired, 24);
  if exists(select 1 from public.profiles where username = final_username) then
    final_username := left(final_username, 17) || '_' || left(new.id::text, 6);
  end if;
  insert into public.profiles(id, username, display_name)
  values(new.id, final_username, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), final_username))
  on conflict(id) do nothing;
  return new;
end;
$$;

-- Repair any auth users that do not yet have profiles.
insert into public.profiles(id, username, display_name)
select u.id,
       left(lower(regexp_replace(coalesce(nullif(u.raw_user_meta_data->>'username',''), split_part(u.email,'@',1), 'member'), '[^a-zA-Z0-9_]', '', 'g')),17)
       || '_' || left(u.id::text,6),
       coalesce(nullif(u.raw_user_meta_data->>'display_name',''), nullif(u.raw_user_meta_data->>'username',''), split_part(u.email,'@',1), 'Member')
from auth.users u
left join public.profiles p on p.id=u.id
where p.id is null
on conflict(id) do nothing;

-- Pick'em writes need a deterministic conflict key for upsert.
create unique index if not exists pickem_user_season_week_game_idx
on public.pickem_picks(user_id, season, week, game_id);
