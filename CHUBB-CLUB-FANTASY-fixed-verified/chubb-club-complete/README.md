# Chubb Club Fantasy — full rebuild

A Next.js fantasy-football/community application prepared for Render + Supabase.

## Included
- Current fantasy-relevant NFL player directory (requires current team; filters inactive/retired records)
- ESPN-ID headshot mapping when the upstream player record supplies an ESPN ID
- Player profile route with explicit provider-ready slots for current stats, weekly matchup and news
- Expert ranking center for Cyrus, Aiden, Gerardo and Nehemiah + consensus model
- Start/Sit and Trade Analyzer UI/model architecture
- Subscriber Waivers & Sleepers board
- Community, player tagging, weekly community sentiment surfaces
- Pick'em (non-wagering)
- Login/signup wired to Supabase when env vars are present
- Free / Subscriber / Expert / Admin data model
- Expert ranking/picks/advice schema
- League/team import-ready schema
- RLS starter policies
- Render blueprint and Node 20 pin

## Important data rule
The app does not fabricate stats/news/rankings. The player identity directory can work immediately. Current stats, news, projections, editorial/reference rankings, and private ESPN league imports need a provider/API that permits your intended use. Keep these behind adapters rather than scraping proprietary pages.

## Render
Use Node. Build: `npm install && npm run build`. Start: `npm start`.

## Supabase setup
1. Create a free Supabase project.
2. Open SQL Editor and run `supabase/migrations/001_chubb_club.sql`.
3. In Render, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Keep service-role keys server-only; never expose them in `NEXT_PUBLIC_*` variables.
5. Set the lead admin role manually in Supabase after that account signs up: `update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');`

## Production follow-up
Before charging users, verify commercial rights/licensing for every player/stat/news/ranking/headshot source and add a real payment provider with server-side payment confirmation.

## September 2026 usability rebuild
- Start/Sit now compares real selected players using weekly projection + season fantasy points + ranks.
- Trade Analyzer supports multi-player sides and a rest-of-season value comparison.
- Rankings populate from current projection/stat feeds and support PPR, half-PPR and standard.
- Waivers uses 24-hour add trends plus projections to surface targets/sleepers.
- Player pages show weekly projections, season fantasy points, stat categories, matchup and player-related news.
- Headshots use ESPN IDs first with Sleeper CDN fallback.
- Homepage was rebuilt as a compact fantasy dashboard with ESPN/Yahoo Sports news adapters.
- Existing Supabase auth/account code and migrations were preserved.

Data adapters intentionally live in `lib/` so providers can be replaced without rewriting the UI. Do not expose provider secrets in `NEXT_PUBLIC_*` variables.
