# Chubb Club repair build

This build is based on the uploaded matchup-ranks project.

Fixed:
- Waiver rows remain links to `/players/[id]`.
- Player profiles remain enabled.
- Missing provider projections no longer render as fake `0.0` values.
- Rankings, home board, Start/Sit, Trades and Waivers now show an em dash / unavailable when the provider returns no projection.
- Start/Sit will not issue a recommendation when either weekly projection is unavailable.
- Existing Supabase account/profile code and migrations are preserved.
- Pick'em schedule/logo API and account favorite-team avatar code are preserved.
- Matchup badges use the requested color convention: favorable = red, tough = green.

Important data note:
ESPN documents PROJ and OPRK on its fantasy product, but the JSON endpoint used by this project is not a supported public ESPN developer API and can return no projection data. Yahoo Fantasy Sports API requires OAuth credentials. This build therefore never labels invented values as ESPN/Yahoo projections.
