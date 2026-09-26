'use client';

import { useEffect, useState } from 'react';
import { browserSupabase } from '@/lib/supabase';
import type { Player } from '@/lib/types';

type Trend = {
  player: Player;
  count: number;
};

export default function TrendingPlayers() {
  const [rows, setRows] = useState<Trend[]>([]);

  useEffect(() => {
    (async () => {
      const s = browserSupabase();
      if (!s) return;

      const since = new Date(Date.now() - 86400000).toISOString();

      const { data } = await s
        .from('posts')
        .select('player_id')
        .gte('created_at', since)
        .not('player_id', 'is', null);

      if (!data?.length) return;

      const counts = new Map<string, number>();

      data.forEach((x: any) => {
        counts.set(
          x.player_id,
          (counts.get(x.player_id) || 0) + 1
        );
      });

      const players: Player[] = await fetch('/api/players').then((r) =>
        r.json()
      );

      const playerMap = new Map(
        players.map((player) => [player.id, player])
      );

      const trending = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id, count]) => ({
          player: playerMap.get(id),
          count,
        }))
        .filter(
          (item): item is Trend => item.player !== undefined
        );

      setRows(trending);
    })();
  }, []);

  return (
    <div className="trendGrid">
      {rows.length ? (
        rows.map((item, index) => (
          <a
            className="trendPlayer"
            href={`/players/${item.player.id}`}
            key={item.player.id}
          >
            <span className="trendRank">#{index + 1}</span>

            {item.player.headshot && (
              <img
                src={item.player.headshot}
                alt={item.player.name}
              />
            )}

            <div>
              <b>{item.player.name}</b>

              <small>
                {item.player.team} • {item.player.position}
              </small>

              <small>
                {item.count} community mention
                {item.count === 1 ? '' : 's'} • last 24h
              </small>
            </div>
          </a>
        ))
      ) : (
        <div className="card muted">
          Trending players will appear as the community tags players in
          posts during the last 24 hours.
        </div>
      )}
    </div>
  );
}
