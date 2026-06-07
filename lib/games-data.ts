// 2026 FIFA World Cup — group assignments are approximate based on the Dec 2024 draw.
// Update GROUPS below if any team placement differs from the official schedule.

export interface Game {
  id: number;
  group: string;
  matchday: number;
  home: string;
  away: string;
  date: string;
}

export const TEAM_FLAGS: Record<string, string> = {
  USA: '🇺🇸', France: '🇫🇷', Morocco: '🇲🇦', 'South Korea': '🇰🇷',
  Canada: '🇨🇦', Germany: '🇩🇪', Nigeria: '🇳🇬', Iran: '🇮🇷',
  Mexico: '🇲🇽', Brazil: '🇧🇷', Romania: '🇷🇴', Australia: '🇦🇺',
  Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Japan: '🇯🇵', Algeria: '🇩🇿',
  Spain: '🇪🇸', Colombia: '🇨🇴', 'Saudi Arabia': '🇸🇦', Cameroon: '🇨🇲',
  Portugal: '🇵🇹', Ecuador: '🇪🇨', Senegal: '🇸🇳', Uzbekistan: '🇺🇿',
  Netherlands: '🇳🇱', Chile: '🇨🇱', Egypt: '🇪🇬', Jordan: '🇯🇴',
  Belgium: '🇧🇪', Uruguay: '🇺🇾', 'South Africa': '🇿🇦', 'New Zealand': '🇳🇿',
  Croatia: '🇭🇷', Peru: '🇵🇪', Iraq: '🇮🇶', Jamaica: '🇯🇲',
  Denmark: '🇩🇰', Paraguay: '🇵🇾', 'DR Congo': '🇨🇩', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Switzerland: '🇨🇭', Austria: '🇦🇹', Mali: '🇲🇱', Honduras: '🇭🇳',
  Poland: '🇵🇱', Serbia: '🇷🇸', Turkey: '🇹🇷', Panama: '🇵🇦',
};

// [Team 1, Team 2, Team 3, Team 4]
// Games: MD1: 1v2, 3v4 | MD2: 1v3, 2v4 | MD3: 1v4, 2v3
export const GROUPS: Record<string, [string, string, string, string]> = {
  A: ['USA', 'France', 'Morocco', 'South Korea'],
  B: ['Canada', 'Germany', 'Nigeria', 'Iran'],
  C: ['Mexico', 'Brazil', 'Romania', 'Australia'],
  D: ['Argentina', 'England', 'Japan', 'Algeria'],
  E: ['Spain', 'Colombia', 'Saudi Arabia', 'Cameroon'],
  F: ['Portugal', 'Ecuador', 'Senegal', 'Uzbekistan'],
  G: ['Netherlands', 'Chile', 'Egypt', 'Jordan'],
  H: ['Belgium', 'Uruguay', 'South Africa', 'New Zealand'],
  I: ['Croatia', 'Peru', 'Iraq', 'Jamaica'],
  J: ['Denmark', 'Paraguay', 'DR Congo', 'Scotland'],
  K: ['Switzerland', 'Austria', 'Mali', 'Honduras'],
  L: ['Poland', 'Serbia', 'Turkey', 'Panama'],
};

// Approximate group stage dates (June 11–26 2026)
const GROUP_DATES: Record<string, [string, string, string]> = {
  A: ['2026-06-11', '2026-06-16', '2026-06-21'],
  B: ['2026-06-12', '2026-06-17', '2026-06-22'],
  C: ['2026-06-12', '2026-06-17', '2026-06-22'],
  D: ['2026-06-13', '2026-06-18', '2026-06-23'],
  E: ['2026-06-13', '2026-06-18', '2026-06-23'],
  F: ['2026-06-14', '2026-06-19', '2026-06-24'],
  G: ['2026-06-14', '2026-06-19', '2026-06-24'],
  H: ['2026-06-15', '2026-06-20', '2026-06-25'],
  I: ['2026-06-15', '2026-06-20', '2026-06-25'],
  J: ['2026-06-16', '2026-06-21', '2026-06-26'],
  K: ['2026-06-16', '2026-06-21', '2026-06-26'],
  L: ['2026-06-17', '2026-06-22', '2026-06-26'],
};

function buildGames(): Game[] {
  const games: Game[] = [];
  let id = 1;

  for (const [group, teams] of Object.entries(GROUPS)) {
    const [t1, t2, t3, t4] = teams;
    const [d1, d2, d3] = GROUP_DATES[group];

    // Matchday 1
    games.push({ id: id++, group, matchday: 1, home: t1, away: t2, date: d1 });
    games.push({ id: id++, group, matchday: 1, home: t3, away: t4, date: d1 });
    // Matchday 2
    games.push({ id: id++, group, matchday: 2, home: t1, away: t3, date: d2 });
    games.push({ id: id++, group, matchday: 2, home: t2, away: t4, date: d2 });
    // Matchday 3
    games.push({ id: id++, group, matchday: 3, home: t1, away: t4, date: d3 });
    games.push({ id: id++, group, matchday: 3, home: t2, away: t3, date: d3 });
  }

  return games;
}

export const GAMES: Game[] = buildGames();

export const GAMES_BY_GROUP: Record<string, Game[]> = Object.keys(GROUPS).reduce(
  (acc, g) => ({ ...acc, [g]: GAMES.filter((game) => game.group === g) }),
  {}
);
