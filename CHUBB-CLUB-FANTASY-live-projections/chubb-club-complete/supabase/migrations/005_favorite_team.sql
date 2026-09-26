-- Favorite NFL team for account avatar. Safe to run more than once.
alter table public.profiles add column if not exists favorite_team text;
alter table public.profiles add column if not exists favorite_team_logo text;
