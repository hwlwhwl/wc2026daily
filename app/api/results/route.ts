import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { gameId, homeScore, awayScore } = await req.json();

  if (gameId == null || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO results (game_id, home_score, away_score, entered_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(game_id) DO UPDATE SET
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      entered_at = excluded.entered_at
  `).run(gameId, homeScore, awayScore);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get('gameId');
  if (!gameId) return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });

  const db = getDb();
  db.prepare('DELETE FROM results WHERE game_id = ?').run(Number(gameId));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM results ORDER BY game_id').all();
  return NextResponse.json(rows);
}
