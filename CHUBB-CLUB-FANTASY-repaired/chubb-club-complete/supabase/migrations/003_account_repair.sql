-- Run once in Supabase SQL Editor after migrations 001 and 002.
-- Repairs profiles for users created before the username trigger was updated.
create policy "profile own insert" on public.profiles for insert with check(auth.uid()=id);
insert into public.profiles(id,username,display_name)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'username',''), split_part(u.email,'@',1)) || case when exists(select 1 from public.profiles p where p.username=coalesce(nullif(u.raw_user_meta_data->>'username',''), split_part(u.email,'@',1))) then '_'||left(u.id::text,6) else '' end,
       coalesce(nullif(u.raw_user_meta_data->>'display_name',''),nullif(u.raw_user_meta_data->>'username',''),split_part(u.email,'@',1))
from auth.users u left join public.profiles p on p.id=u.id where p.id is null
on conflict(id) do nothing;
