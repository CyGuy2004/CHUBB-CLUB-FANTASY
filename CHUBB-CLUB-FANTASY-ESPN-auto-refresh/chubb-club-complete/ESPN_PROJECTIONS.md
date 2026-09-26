# ESPN projections

The server now refreshes ESPN fantasy data every 5 minutes. It tries the configured ESPN league first (`ESPN_LEAGUE_ID`, default `1567061434`), then falls back to ESPN's season player/default-league feeds when the league is private or inaccessible.

Weekly projection values are only labeled `ESPN PROJ` when ESPN actually returns a weekly projected `appliedTotal`. Missing values remain unavailable rather than becoming fake zero projections.

The ESPN fantasy JSON endpoints are not an officially supported public developer API and may change. No ESPN password, SWID, espn_s2 cookie, or browser session is stored in this project.
