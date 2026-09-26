# Projection feed repair

This build fixes the fantasy projection adapter so Sleeper player/trending calls and Sleeper projection/stat calls use their correct separate hosts.

- Weekly projections: api.sleeper.com/projections/nfl/regular/2026/{week}
- Season stats: api.sleeper.com/stats/nfl/regular/2026
- Player/trending data: api.sleeper.app
- ESPN fantasy data remains a best-effort fallback only when a real weekly PROJ value is returned.
- Missing values remain unavailable rather than being converted to fake 0.0 projections.
