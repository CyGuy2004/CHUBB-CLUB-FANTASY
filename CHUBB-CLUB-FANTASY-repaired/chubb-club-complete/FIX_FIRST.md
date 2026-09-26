# Chubb Club core fix

1. Upload the contents of this `chubb-club-complete` folder to the folder Render deploys.
2. In Supabase SQL Editor, run `supabase/migrations/004_core_repair.sql` once. It is safe to re-run.
3. Keep these Render environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
4. Render build command: `npm install && npm run build`
5. Render start command: `npm start`

Core behavior in this build:
- account/profile loading no longer stays on an endless loading state;
- profile rows can be repaired/created for authenticated users;
- weekly NFL schedule loads into the non-wagering Pick'em page and saved selections persist to Supabase;
- Start/Sit, rankings, trades, waivers and homepage share the same fantasy metric endpoint;
- ESPN fantasy projection/season-point adapter is used when available, with a fallback fantasy feed;
- player pages use the same fantasy metrics and no longer import removed functions;
- ESPN headshots fall back to Sleeper player images;
- TypeScript target is ES2017 to prevent the Map/matchAll iterator build failures seen on Render.

Yahoo Fantasy league linking is intentionally not faked. It requires a Yahoo developer app and OAuth credentials before private Yahoo league/team data can be connected.
