import { getTurso } from '../turso';
import { PickEntry, ResultMap } from './scoring';

// ─────────────────────────────────────────────────────────────────────────────
// Schema init (runs once per process)
// ─────────────────────────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const db = getTurso();
    await db.batch(
      [
        {
          sql: `CREATE TABLE IF NOT EXISTS daily_users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            photo TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS daily_config (
            key TEXT PRIMARY KEY,
            value TEXT
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS daily_sessions (
            key TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            pick_order TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS daily_picks (
            user_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            session_key TEXT NOT NULL,
            home_score INTEGER NOT NULL,
            away_score INTEGER NOT NULL,
            pen_home INTEGER,
            pen_away INTEGER,
            submitted_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (user_id, game_id)
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS daily_results (
            game_id TEXT PRIMARY KEY,
            home_score INTEGER NOT NULL,
            away_score INTEGER NOT NULL,
            pen_home INTEGER,
            pen_away INTEGER,
            entered_at TEXT DEFAULT (datetime('now'))
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS daily_ko_games (
            id TEXT PRIMARY KEY,
            round TEXT NOT NULL,
            home_team TEXT NOT NULL,
            away_team TEXT NOT NULL,
            game_date TEXT NOT NULL
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS daily_bot_pens (
            game_id TEXT PRIMARY KEY,
            pen_home INTEGER NOT NULL,
            pen_away INTEGER NOT NULL
          )`,
          args: [],
        },
      ],
      'write'
    );
  })();
  return _initPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export async function getConfig(key: string): Promise<string | null> {
  const db = getTurso();
  const res = await db.execute({ sql: 'SELECT value FROM daily_config WHERE key = ?', args: [key] });
  if (res.rows.length === 0) return null;
  return res.rows[0][0] as string | null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: 'INSERT INTO daily_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [key, value],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<{ id: string; name: string; photo: string }[]> {
  const db = getTurso();
  const res = await db.execute({ sql: 'SELECT id, name, photo FROM daily_users ORDER BY created_at', args: [] });
  return res.rows.map((r) => ({
    id: r[0] as string,
    name: r[1] as string,
    photo: (r[2] as string) ?? '',
  }));
}

export async function getUserById(id: string): Promise<{ id: string; name: string; photo: string } | null> {
  const db = getTurso();
  const res = await db.execute({ sql: 'SELECT id, name, photo FROM daily_users WHERE id = ?', args: [id] });
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return { id: r[0] as string, name: r[1] as string, photo: (r[2] as string) ?? '' };
}

export async function createUser(id: string, name: string): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: 'INSERT INTO daily_users (id, name, photo) VALUES (?, ?, ?)',
    args: [id, name, ''],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<{ key: string; label: string; pickOrder: string[] }[]> {
  const db = getTurso();
  const res = await db.execute({ sql: 'SELECT key, label, pick_order FROM daily_sessions ORDER BY created_at', args: [] });
  return res.rows.map((r) => ({
    key: r[0] as string,
    label: r[1] as string,
    pickOrder: JSON.parse(r[2] as string) as string[],
  }));
}

export async function createOrUpdateSession(key: string, label: string, pickOrder: string[]): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO daily_sessions (key, label, pick_order) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET label = excluded.label, pick_order = excluded.pick_order`,
    args: [key, label, JSON.stringify(pickOrder)],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Picks
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllPicks(): Promise<Record<string, Record<string, PickEntry>>> {
  const db = getTurso();
  const res = await db.execute({
    sql: 'SELECT user_id, game_id, home_score, away_score, pen_home, pen_away FROM daily_picks',
    args: [],
  });
  const out: Record<string, Record<string, PickEntry>> = {};
  for (const r of res.rows) {
    const userId = r[0] as string;
    const gameId = r[1] as string;
    const h = r[2] as number;
    const a = r[3] as number;
    const ph = r[4] as number | null;
    const pa = r[5] as number | null;
    if (!out[userId]) out[userId] = {};
    out[userId][gameId] = { h, a, ph: ph ?? null, pa: pa ?? null };
  }
  return out;
}

export async function getSessionSubmitters(sessionKey: string): Promise<string[]> {
  const db = getTurso();
  const res = await db.execute({
    sql: 'SELECT DISTINCT user_id FROM daily_picks WHERE session_key = ?',
    args: [sessionKey],
  });
  return res.rows.map((r) => r[0] as string);
}

export async function savePicks(
  userId: string,
  sessionKey: string,
  picks: Record<string, PickEntry>
): Promise<void> {
  const db = getTurso();
  const statements = Object.entries(picks).map(([gameId, pick]) => ({
    sql: `INSERT INTO daily_picks (user_id, game_id, session_key, home_score, away_score, pen_home, pen_away)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, game_id) DO UPDATE SET
            session_key = excluded.session_key,
            home_score = excluded.home_score,
            away_score = excluded.away_score,
            pen_home = excluded.pen_home,
            pen_away = excluded.pen_away,
            submitted_at = datetime('now')`,
    args: [userId, gameId, sessionKey, pick.h, pick.a, pick.ph ?? null, pick.pa ?? null],
  }));
  if (statements.length > 0) {
    await db.batch(statements, 'write');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

export async function getResults(): Promise<ResultMap> {
  const db = getTurso();
  const res = await db.execute({
    sql: 'SELECT game_id, home_score, away_score, pen_home, pen_away FROM daily_results',
    args: [],
  });
  const out: ResultMap = {};
  for (const r of res.rows) {
    const gameId = r[0] as string;
    out[gameId] = {
      h: r[1] as number,
      a: r[2] as number,
      ph: r[3] as number | null,
      pa: r[4] as number | null,
    };
  }
  return out;
}

export async function saveResult(
  gameId: string,
  h: number,
  a: number,
  ph?: number | null,
  pa?: number | null
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO daily_results (game_id, home_score, away_score, pen_home, pen_away)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(game_id) DO UPDATE SET
            home_score = excluded.home_score,
            away_score = excluded.away_score,
            pen_home = excluded.pen_home,
            pen_away = excluded.pen_away,
            entered_at = datetime('now')`,
    args: [gameId, h, a, ph ?? null, pa ?? null],
  });
}

export async function deleteResult(gameId: string): Promise<void> {
  const db = getTurso();
  await db.execute({ sql: 'DELETE FROM daily_results WHERE game_id = ?', args: [gameId] });
}

// ─────────────────────────────────────────────────────────────────────────────
// KO Games
// ─────────────────────────────────────────────────────────────────────────────

export async function getKOGames(): Promise<{ id: string; round: string; home: string; away: string; date: string }[]> {
  const db = getTurso();
  const res = await db.execute({
    sql: 'SELECT id, round, home_team, away_team, game_date FROM daily_ko_games ORDER BY game_date',
    args: [],
  });
  return res.rows.map((r) => ({
    id: r[0] as string,
    round: r[1] as string,
    home: r[2] as string,
    away: r[3] as string,
    date: r[4] as string,
  }));
}

export async function addKOGame(g: {
  id: string;
  round: string;
  home: string;
  away: string;
  date: string;
}): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO daily_ko_games (id, round, home_team, away_team, game_date)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            round = excluded.round,
            home_team = excluded.home_team,
            away_team = excluded.away_team,
            game_date = excluded.game_date`,
    args: [g.id, g.round, g.home, g.away, g.date],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bot pens
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrCreateBotPens(gameId: string): Promise<{ ph: number; pa: number }> {
  const db = getTurso();
  const res = await db.execute({
    sql: 'SELECT pen_home, pen_away FROM daily_bot_pens WHERE game_id = ?',
    args: [gameId],
  });
  if (res.rows.length > 0) {
    return { ph: res.rows[0][0] as number, pa: res.rows[0][1] as number };
  }
  // Generate random non-equal pens 0-4
  let ph: number, pa: number;
  do {
    ph = Math.floor(Math.random() * 5);
    pa = Math.floor(Math.random() * 5);
  } while (ph === pa);
  await db.execute({
    sql: 'INSERT INTO daily_bot_pens (game_id, pen_home, pen_away) VALUES (?, ?, ?)',
    args: [gameId, ph, pa],
  });
  return { ph, pa };
}
