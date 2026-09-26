export type EspnNewsItem = {
  title: string;
  description: string;
  link: string;
  published: string;
};

const RSS = 'https://www.espn.com/espn/rss/nfl/news';

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function tag(block: string, name: string) {
  const match = block.match(
    new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i')
  );

  return match ? decode(match[1].trim()) : '';
}

export async function getEspnNews(
  limit = 8
): Promise<EspnNewsItem[]> {
  try {
    const response = await fetch(RSS, {
      next: { revalidate: 900 },
      headers: {
        'User-Agent': 'ChubbClubFantasy/1.0',
      },
    });

    if (!response.ok) return [];

    const xml = await response.text();

    const matches = Array.from(
      xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)
    );

    return matches
      .slice(0, limit)
      .map((match) => ({
        title: tag(match[1], 'title'),
        description: tag(match[1], 'description')
          .replace(/<[^>]+>/g, '')
          .trim(),
        link: tag(match[1], 'link'),
        published: tag(match[1], 'pubDate'),
      }))
      .filter((item) => item.title && item.link);
  } catch {
    return [];
  }
}

export type EspnGame = {
  home: string;
  away: string;
  date: string;
  status: string;
};

export async function getEspnGames(): Promise<EspnGame[]> {
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
      {
        next: { revalidate: 900 },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.events || []).map((event: any) => {
      const competition = event.competitions?.[0];

      const home = competition?.competitors?.find(
        (team: any) => team.homeAway === 'home'
      );

      const away = competition?.competitors?.find(
        (team: any) => team.homeAway === 'away'
      );

      return {
        home: home?.team?.abbreviation || '',
        away: away?.team?.abbreviation || '',
        date: event.date || '',
        status:
          event.status?.type?.shortDetail ||
          event.status?.type?.description ||
          '',
      };
    });
  } catch {
    return [];
  }
}

export function matchupFor(team: string, games: EspnGame[]) {
  const normalizedTeam = team?.toUpperCase();

  for (const game of games) {
    if (game.home.toUpperCase() === normalizedTeam) {
      return {
        opponent: game.away,
        home: true,
        date: game.date,
        status: game.status,
      };
    }

    if (game.away.toUpperCase() === normalizedTeam) {
      return {
        opponent: game.home,
        home: false,
        date: game.date,
        status: game.status,
      };
    }
  }

  return null;
}
