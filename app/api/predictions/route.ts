import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const db = getDb();
  const rows = db
    .prepare('SELECT game_id, home_score, away_score FROM predictions WHERE user_id = ?')
    .all(userId);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { userId, predictions } = await req.json();
  if (!userId || !Array.isArray(predictions)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const upsert = db.prepare(`
    INSERT INTO predictions (user_id, game_id, home_score, away_score, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, game_id)
    DO UPDATE SET home_score = excluded.home_score,
                  away_score = excluded.away_score,
                  updated_at = excluded.updated_at
  `);

  const saveAll = db.transaction(
    (items: Array<{ gameId: number; homeScore: number; awayScore: number }>) => {
      for (const p of items) {
        upsert.run(userId, p.gameId, p.homeScore, p.awayScore);
      }
    }
  );

  saveAll(predictions);
  return NextResponse.json({ saved: predictions.length });
}
