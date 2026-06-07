// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupGame {
  id: number;
  g: string;   // group letter A-L
  md: number;  // matchday 1-3
  home: string;
  away: string;
  date: string; // YYYY-MM-DD
}

export interface KOGame {
  id: string;
  round: string;
  home: string;
  away: string;
  date: string;
}

export interface KOTemplate {
  id: string;
  round: string;
  homeSlot: string;
  awaySlot: string;
  date: string;
}

export interface Session {
  key: string;
  label: string;
  dates: string[];
  knockout?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Flags, ISO codes, team colors
// ─────────────────────────────────────────────────────────────────────────────

export const FLAGS: Record<string, string> = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czechia': '🇨🇿',
  'Canada': '🇨🇦',
  'Bosnia and Herz.': '🇧🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  'Haiti': '🇭🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turkey': '🇹🇷',
  'Germany': '🇩🇪',
  'Curaçao': '🇨🇼',
  'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵',
  'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪',
  'Egypt': '🇪🇬',
  'Iran': '🇮🇷',
  'New Zealand': '🇳🇿',
  'Spain': '🇪🇸',
  'Cape Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦',
  'Uruguay': '🇺🇾',
  'France': '🇫🇷',
  'Senegal': '🇸🇳',
  'Iraq': '🇮🇶',
  'Norway': '🇳🇴',
  'Argentina': '🇦🇷',
  'Algeria': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordan': '🇯🇴',
  'Portugal': '🇵🇹',
  'DR Congo': '🇨🇩',
  'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
};

export const ISO2: Record<string, string> = {
  'Mexico': 'mx',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Czechia': 'cz',
  'Canada': 'ca',
  'Bosnia and Herz.': 'ba',
  'Qatar': 'qa',
  'Switzerland': 'ch',
  'Brazil': 'br',
  'Morocco': 'ma',
  'Haiti': 'ht',
  'Scotland': 'gb-sct',
  'USA': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turkey': 'tr',
  'Germany': 'de',
  'Curaçao': 'cw',
  'Ivory Coast': 'ci',
  'Ecuador': 'ec',
  'Netherlands': 'nl',
  'Japan': 'jp',
  'Sweden': 'se',
  'Tunisia': 'tn',
  'Belgium': 'be',
  'Egypt': 'eg',
  'Iran': 'ir',
  'New Zealand': 'nz',
  'Spain': 'es',
  'Cape Verde': 'cv',
  'Saudi Arabia': 'sa',
  'Uruguay': 'uy',
  'France': 'fr',
  'Senegal': 'sn',
  'Iraq': 'iq',
  'Norway': 'no',
  'Argentina': 'ar',
  'Algeria': 'dz',
  'Austria': 'at',
  'Jordan': 'jo',
  'Portugal': 'pt',
  'DR Congo': 'cd',
  'Uzbekistan': 'uz',
  'Colombia': 'co',
  'England': 'gb-eng',
  'Croatia': 'hr',
  'Ghana': 'gh',
  'Panama': 'pa',
};

export const TEAM_COLORS: Record<string, string> = {
  'Mexico': '#006847',
  'South Africa': '#007A4D',
  'South Korea': '#CD2E3A',
  'Czechia': '#D7141A',
  'Canada': '#FF0000',
  'Bosnia and Herz.': '#002395',
  'Qatar': '#8D153A',
  'Switzerland': '#FF0000',
  'Brazil': '#009C3B',
  'Morocco': '#C1272D',
  'Haiti': '#00209F',
  'Scotland': '#003F87',
  'USA': '#B22234',
  'Paraguay': '#D52B1E',
  'Australia': '#00008B',
  'Turkey': '#E30A17',
  'Germany': '#1a1a1a',
  'Curaçao': '#003DA5',
  'Ivory Coast': '#F77F00',
  'Ecuador': '#FFD100',
  'Netherlands': '#FF6600',
  'Japan': '#BC002D',
  'Sweden': '#006AA7',
  'Tunisia': '#E70013',
  'Belgium': '#ED2939',
  'Egypt': '#CE1126',
  'Iran': '#239F40',
  'New Zealand': '#00247D',
  'Spain': '#AA151B',
  'Cape Verde': '#003893',
  'Saudi Arabia': '#006C35',
  'Uruguay': '#75AADB',
  'France': '#002395',
  'Senegal': '#00853F',
  'Iraq': '#CE1126',
  'Norway': '#EF2B2D',
  'Argentina': '#74ACDF',
  'Algeria': '#006233',
  'Austria': '#ED2939',
  'Jordan': '#007A3D',
  'Portugal': '#006600',
  'DR Congo': '#0047AB',
  'Uzbekistan': '#1EB53A',
  'Colombia': '#FCD116',
  'England': '#CF091F',
  'Croatia': '#CC0000',
  'Ghana': '#006B3F',
  'Panama': '#DA121A',
};

// ─────────────────────────────────────────────────────────────────────────────
// All 72 group stage games
// ─────────────────────────────────────────────────────────────────────────────

export const GROUP_GAMES: GroupGame[] = [
  // MD1
  { id: 1,  g: 'A', md: 1, home: 'Mexico',        away: 'South Africa',    date: '2026-06-11' },
  { id: 2,  g: 'A', md: 1, home: 'South Korea',   away: 'Czechia',         date: '2026-06-12' },
  { id: 3,  g: 'B', md: 1, home: 'Canada',        away: 'Bosnia and Herz.',date: '2026-06-12' },
  { id: 4,  g: 'B', md: 1, home: 'Qatar',         away: 'Switzerland',     date: '2026-06-13' },
  { id: 5,  g: 'C', md: 1, home: 'Brazil',        away: 'Morocco',         date: '2026-06-13' },
  { id: 6,  g: 'C', md: 1, home: 'Haiti',         away: 'Scotland',        date: '2026-06-14' },
  { id: 7,  g: 'D', md: 1, home: 'USA',           away: 'Paraguay',        date: '2026-06-13' },
  { id: 8,  g: 'D', md: 1, home: 'Australia',     away: 'Turkey',          date: '2026-06-14' },
  { id: 9,  g: 'E', md: 1, home: 'Germany',       away: 'Curaçao',         date: '2026-06-14' },
  { id: 10, g: 'E', md: 1, home: 'Ivory Coast',   away: 'Ecuador',         date: '2026-06-15' },
  { id: 11, g: 'F', md: 1, home: 'Netherlands',   away: 'Japan',           date: '2026-06-14' },
  { id: 12, g: 'F', md: 1, home: 'Sweden',        away: 'Tunisia',         date: '2026-06-15' },
  { id: 13, g: 'G', md: 1, home: 'Belgium',       away: 'Egypt',           date: '2026-06-15' },
  { id: 14, g: 'G', md: 1, home: 'Iran',          away: 'New Zealand',     date: '2026-06-16' },
  { id: 15, g: 'H', md: 1, home: 'Spain',         away: 'Cape Verde',      date: '2026-06-15' },
  { id: 16, g: 'H', md: 1, home: 'Saudi Arabia',  away: 'Uruguay',         date: '2026-06-15' },
  { id: 17, g: 'I', md: 1, home: 'France',        away: 'Senegal',         date: '2026-06-16' },
  { id: 18, g: 'I', md: 1, home: 'Iraq',          away: 'Norway',          date: '2026-06-16' },
  { id: 19, g: 'J', md: 1, home: 'Argentina',     away: 'Algeria',         date: '2026-06-17' },
  { id: 20, g: 'J', md: 1, home: 'Austria',       away: 'Jordan',          date: '2026-06-17' },
  { id: 21, g: 'K', md: 1, home: 'Portugal',      away: 'DR Congo',        date: '2026-06-17' },
  { id: 22, g: 'K', md: 1, home: 'Uzbekistan',    away: 'Colombia',        date: '2026-06-18' },
  { id: 23, g: 'L', md: 1, home: 'England',       away: 'Croatia',         date: '2026-06-17' },
  { id: 24, g: 'L', md: 1, home: 'Ghana',         away: 'Panama',          date: '2026-06-18' },
  // MD2
  { id: 25, g: 'A', md: 2, home: 'Mexico',        away: 'South Korea',     date: '2026-06-19' },
  { id: 26, g: 'A', md: 2, home: 'Czechia',       away: 'South Africa',    date: '2026-06-18' },
  { id: 27, g: 'B', md: 2, home: 'Canada',        away: 'Qatar',           date: '2026-06-18' },
  { id: 28, g: 'B', md: 2, home: 'Switzerland',   away: 'Bosnia and Herz.',date: '2026-06-18' },
  { id: 29, g: 'C', md: 2, home: 'Scotland',      away: 'Morocco',         date: '2026-06-19' },
  { id: 30, g: 'C', md: 2, home: 'Brazil',        away: 'Haiti',           date: '2026-06-20' },
  { id: 31, g: 'D', md: 2, home: 'USA',           away: 'Australia',       date: '2026-06-19' },
  { id: 32, g: 'D', md: 2, home: 'Turkey',        away: 'Paraguay',        date: '2026-06-20' },
  { id: 33, g: 'E', md: 2, home: 'Germany',       away: 'Ivory Coast',     date: '2026-06-20' },
  { id: 34, g: 'E', md: 2, home: 'Ecuador',       away: 'Curaçao',         date: '2026-06-21' },
  { id: 35, g: 'F', md: 2, home: 'Netherlands',   away: 'Sweden',          date: '2026-06-20' },
  { id: 36, g: 'F', md: 2, home: 'Tunisia',       away: 'Japan',           date: '2026-06-21' },
  { id: 37, g: 'G', md: 2, home: 'Belgium',       away: 'Iran',            date: '2026-06-21' },
  { id: 38, g: 'G', md: 2, home: 'New Zealand',   away: 'Egypt',           date: '2026-06-22' },
  { id: 39, g: 'H', md: 2, home: 'Spain',         away: 'Saudi Arabia',    date: '2026-06-21' },
  { id: 40, g: 'H', md: 2, home: 'Uruguay',       away: 'Cape Verde',      date: '2026-06-21' },
  { id: 41, g: 'I', md: 2, home: 'France',        away: 'Iraq',            date: '2026-06-22' },
  { id: 42, g: 'I', md: 2, home: 'Norway',        away: 'Senegal',         date: '2026-06-23' },
  { id: 43, g: 'J', md: 2, home: 'Argentina',     away: 'Austria',         date: '2026-06-22' },
  { id: 44, g: 'J', md: 2, home: 'Jordan',        away: 'Algeria',         date: '2026-06-23' },
  { id: 45, g: 'K', md: 2, home: 'Portugal',      away: 'Uzbekistan',      date: '2026-06-23' },
  { id: 46, g: 'K', md: 2, home: 'Colombia',      away: 'DR Congo',        date: '2026-06-24' },
  { id: 47, g: 'L', md: 2, home: 'England',       away: 'Ghana',           date: '2026-06-23' },
  { id: 48, g: 'L', md: 2, home: 'Panama',        away: 'Croatia',         date: '2026-06-24' },
  // MD3
  { id: 49, g: 'A', md: 3, home: 'South Africa',  away: 'South Korea',     date: '2026-06-25' },
  { id: 50, g: 'A', md: 3, home: 'Czechia',       away: 'Mexico',          date: '2026-06-25' },
  { id: 51, g: 'B', md: 3, home: 'Switzerland',   away: 'Canada',          date: '2026-06-24' },
  { id: 52, g: 'B', md: 3, home: 'Bosnia and Herz.', away: 'Qatar',        date: '2026-06-24' },
  { id: 53, g: 'C', md: 3, home: 'Morocco',       away: 'Haiti',           date: '2026-06-24' },
  { id: 54, g: 'C', md: 3, home: 'Scotland',      away: 'Brazil',          date: '2026-06-24' },
  { id: 55, g: 'D', md: 3, home: 'Turkey',        away: 'USA',             date: '2026-06-26' },
  { id: 56, g: 'D', md: 3, home: 'Paraguay',      away: 'Australia',       date: '2026-06-26' },
  { id: 57, g: 'E', md: 3, home: 'Curaçao',       away: 'Ivory Coast',     date: '2026-06-25' },
  { id: 58, g: 'E', md: 3, home: 'Ecuador',       away: 'Germany',         date: '2026-06-25' },
  { id: 59, g: 'F', md: 3, home: 'Tunisia',       away: 'Netherlands',     date: '2026-06-26' },
  { id: 60, g: 'F', md: 3, home: 'Japan',         away: 'Sweden',          date: '2026-06-26' },
  { id: 61, g: 'G', md: 3, home: 'New Zealand',   away: 'Belgium',         date: '2026-06-27' },
  { id: 62, g: 'G', md: 3, home: 'Egypt',         away: 'Iran',            date: '2026-06-27' },
  { id: 63, g: 'H', md: 3, home: 'Cape Verde',    away: 'Saudi Arabia',    date: '2026-06-27' },
  { id: 64, g: 'H', md: 3, home: 'Uruguay',       away: 'Spain',           date: '2026-06-27' },
  { id: 65, g: 'I', md: 3, home: 'Norway',        away: 'France',          date: '2026-06-26' },
  { id: 66, g: 'I', md: 3, home: 'Senegal',       away: 'Iraq',            date: '2026-06-26' },
  { id: 67, g: 'J', md: 3, home: 'Algeria',       away: 'Austria',         date: '2026-06-28' },
  { id: 68, g: 'J', md: 3, home: 'Jordan',        away: 'Argentina',       date: '2026-06-28' },
  { id: 69, g: 'K', md: 3, home: 'Colombia',      away: 'Portugal',        date: '2026-06-28' },
  { id: 70, g: 'K', md: 3, home: 'DR Congo',      away: 'Uzbekistan',      date: '2026-06-28' },
  { id: 71, g: 'L', md: 3, home: 'Panama',        away: 'England',         date: '2026-06-27' },
  { id: 72, g: 'L', md: 3, home: 'Croatia',       away: 'Ghana',           date: '2026-06-27' },
];

// ─────────────────────────────────────────────────────────────────────────────
// KO Bracket Template — 32 games
// ─────────────────────────────────────────────────────────────────────────────

export const KO_BRACKET_TEMPLATE: KOTemplate[] = [
  // Round of 32 — Jul 3–8
  // Path A → QF1 → SF1
  { id: 'r32-01', round: 'Round of 32',  homeSlot: '1A',       awaySlot: '2B',       date: '2026-07-03' },
  { id: 'r32-02', round: 'Round of 32',  homeSlot: '1C',       awaySlot: '2D',       date: '2026-07-03' },
  { id: 'r32-03', round: 'Round of 32',  homeSlot: '1I',       awaySlot: '2J',       date: '2026-07-04' },
  { id: 'r32-04', round: 'Round of 32',  homeSlot: 'T1',       awaySlot: 'T2',       date: '2026-07-04' },
  // Path B → QF2 → SF1
  { id: 'r32-05', round: 'Round of 32',  homeSlot: '1B',       awaySlot: '2A',       date: '2026-07-04' },
  { id: 'r32-06', round: 'Round of 32',  homeSlot: '1D',       awaySlot: '2C',       date: '2026-07-05' },
  { id: 'r32-07', round: 'Round of 32',  homeSlot: '1K',       awaySlot: '2L',       date: '2026-07-05' },
  { id: 'r32-08', round: 'Round of 32',  homeSlot: 'T3',       awaySlot: 'T4',       date: '2026-07-05' },
  // Path C → QF3 → SF2
  { id: 'r32-09', round: 'Round of 32',  homeSlot: '1E',       awaySlot: '2F',       date: '2026-07-06' },
  { id: 'r32-10', round: 'Round of 32',  homeSlot: '1G',       awaySlot: '2H',       date: '2026-07-06' },
  { id: 'r32-11', round: 'Round of 32',  homeSlot: '1J',       awaySlot: '2I',       date: '2026-07-06' },
  { id: 'r32-12', round: 'Round of 32',  homeSlot: 'T5',       awaySlot: 'T6',       date: '2026-07-07' },
  // Path D → QF4 → SF2
  { id: 'r32-13', round: 'Round of 32',  homeSlot: '1F',       awaySlot: '2E',       date: '2026-07-07' },
  { id: 'r32-14', round: 'Round of 32',  homeSlot: '1H',       awaySlot: '2G',       date: '2026-07-07' },
  { id: 'r32-15', round: 'Round of 32',  homeSlot: '1L',       awaySlot: '2K',       date: '2026-07-07' },
  { id: 'r32-16', round: 'Round of 32',  homeSlot: 'T7',       awaySlot: 'T8',       date: '2026-07-08' },
  // Round of 16 — Jul 10–13
  { id: 'r16-1',  round: 'Round of 16',  homeSlot: 'W(r32-01)', awaySlot: 'W(r32-02)', date: '2026-07-10' },
  { id: 'r16-2',  round: 'Round of 16',  homeSlot: 'W(r32-03)', awaySlot: 'W(r32-04)', date: '2026-07-10' },
  { id: 'r16-3',  round: 'Round of 16',  homeSlot: 'W(r32-05)', awaySlot: 'W(r32-06)', date: '2026-07-11' },
  { id: 'r16-4',  round: 'Round of 16',  homeSlot: 'W(r32-07)', awaySlot: 'W(r32-08)', date: '2026-07-11' },
  { id: 'r16-5',  round: 'Round of 16',  homeSlot: 'W(r32-09)', awaySlot: 'W(r32-10)', date: '2026-07-12' },
  { id: 'r16-6',  round: 'Round of 16',  homeSlot: 'W(r32-11)', awaySlot: 'W(r32-12)', date: '2026-07-12' },
  { id: 'r16-7',  round: 'Round of 16',  homeSlot: 'W(r32-13)', awaySlot: 'W(r32-14)', date: '2026-07-13' },
  { id: 'r16-8',  round: 'Round of 16',  homeSlot: 'W(r32-15)', awaySlot: 'W(r32-16)', date: '2026-07-13' },
  // Quarter-finals — Jul 17–18
  { id: 'qf-1',   round: 'Quarter-final', homeSlot: 'W(r16-1)', awaySlot: 'W(r16-2)', date: '2026-07-17' },
  { id: 'qf-2',   round: 'Quarter-final', homeSlot: 'W(r16-3)', awaySlot: 'W(r16-4)', date: '2026-07-17' },
  { id: 'qf-3',   round: 'Quarter-final', homeSlot: 'W(r16-5)', awaySlot: 'W(r16-6)', date: '2026-07-18' },
  { id: 'qf-4',   round: 'Quarter-final', homeSlot: 'W(r16-7)', awaySlot: 'W(r16-8)', date: '2026-07-18' },
  // Semi-finals — Jul 21–22
  { id: 'sf-1',   round: 'Semi-final',   homeSlot: 'W(qf-1)',  awaySlot: 'W(qf-2)',  date: '2026-07-21' },
  { id: 'sf-2',   round: 'Semi-final',   homeSlot: 'W(qf-3)',  awaySlot: 'W(qf-4)',  date: '2026-07-22' },
  // 3rd Place — Jul 25, Final — Jul 26
  { id: '3rd',    round: '3rd Place',    homeSlot: 'L(sf-1)',  awaySlot: 'L(sf-2)',  date: '2026-07-25' },
  { id: 'final',  round: 'Final',        homeSlot: 'W(sf-1)',  awaySlot: 'W(sf-2)',  date: '2026-07-26' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Session builders
// ─────────────────────────────────────────────────────────────────────────────

export function buildGroupSessions(): Session[] {
  const allDates = Array.from(new Set(GROUP_GAMES.map((g) => g.date))).sort();
  const sessions: Session[] = [];
  sessions.push({ key: 's-day1-2', label: 'Jun 11–12', dates: ['2026-06-11', '2026-06-12'] });
  for (const d of allDates) {
    if (d === '2026-06-11' || d === '2026-06-12') continue;
    const parts = d.split('-');
    const dd = parseInt(parts[2]);
    sessions.push({ key: `s-${d}`, label: `Jun ${dd}`, dates: [d] });
  }
  return sessions;
}

const GROUP_SESSIONS = buildGroupSessions();

export function getActiveSessions(koGames: KOGame[]): Session[] {
  const sessions: Session[] = [...GROUP_SESSIONS];
  const koDates = Array.from(new Set(koGames.map((g) => g.date))).sort();
  for (const d of koDates) {
    const parts = d.split('-');
    const m = parseInt(parts[1]);
    const dd = parseInt(parts[2]);
    const monthLabel = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
    sessions.push({ key: `s-${d}`, label: `${monthLabel} ${dd}`, dates: [d], knockout: true });
  }
  return sessions;
}
