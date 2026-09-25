# Chubb Club Fantasy

A Next.js fantasy-football platform starter for Chubb Club.

## Included now
- Chubb Club branded responsive site
- Live active NFL player directory through Sleeper's public player feed
- Automatic player-ID mapping (Sleeper ID + ESPN ID when supplied upstream)
- Automatic ESPN CDN headshot URL when an ESPN ID exists, with graceful fallback
- Player profile pages
- ESPN-backed player stat adapter when an ESPN ID and upstream stats are available
- Rankings UI for Cyrus, Aiden, Gerardo, Nehemiah + consensus
- Start/Sit and Trade Analyzer shells wired to the shared player directory
- Community, league, expert-advice and subscription product design

## Important data note
Sleeper documents its API as free for non-commercial use and asks commercial users to contact them about licensing. The ESPN endpoints/CDN used here are public-facing but are not presented as a commercial data license. Before charging subscribers, replace/approve providers as needed. The code keeps data access behind API routes so providers can be swapped without rebuilding the UI.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Render
Create a Web Service from this GitHub repo:
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Node 20+

No secret keys are needed for the current live player directory.

## Next production integrations
Supabase auth/database, expert ranking editor, league/social persistence, subscription billing, licensed projections/injuries, and fantasy-platform imports.
