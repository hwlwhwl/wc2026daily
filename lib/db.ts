import Database from 'better-sqlite3';
import path from 'path';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(path.join(process.cwd(), 'predictor.db'));
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS predictions (
      user_id TEXT NOT NULL REFERENCES users(id),
      game_id INTEGER NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS results (
      game_id INTEGER PRIMARY KEY,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      entered_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return _db;
}

export interface UserRow {
  id: string;
  name: string;
  created_at: string;
}

export interface PredictionRow {
  user_id: string;
  game_id: number;
  home_score: number | null;
  away_score: number | null;
  updated_at: string;
}

export interface ResultRow {
  game_id: number;
  home_score: number;
  away_score: number;
  entered_at: string;
}
