import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { ensureSchema, getConfig, setConfig, getUsers } from '@/lib/daily/db';
import { buildGroupSessions } from '@/lib/daily/games';
import { getTurso as getTursoClient } from '@/lib/turso';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const body = await req.json();
  const { adminCode, action } = body as { adminCode: string; action: string; [key: string]: unknown };

  // 'verify' action just checks the admin code
  if (action === 'verify') {
    if (adminCode !== process.env.DAILY_ADMIN_CODE) {
      return NextResponse.json({ error: 'Invalid admin code' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  }

  if (adminCode !== process.env.DAILY_ADMIN_CODE) {
    return NextResponse.json({ error: 'Invalid admin code' }, { status: 401 });
  }

  if (action === 'start') {
    const alreadyStarted = await getConfig('started');
    if (alreadyStarted === '1') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    const users = await getUsers();
    if (users.length === 0) {
      return NextResponse.json({ error: 'No players registered' }, { status: 400 });
    }

    // Mark as started
    await setConfig('started', '1');

    // Create first session (session 0) with shuffled pick order
    const firstSession = buildGroupSessions()[0];
    const pickOrder = shuffleArray(users.map((u) => u.id));

    const db = getTursoClient();
    await db.execute({
      sql: `INSERT INTO daily_sessions (key, label, pick_order) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET label = excluded.label, pick_order = excluded.pick_order`,
      args: [firstSession.key, firstSession.label, JSON.stringify(pickOrder)],
    });

    return NextResponse.json({ ok: true, sessionKey: firstSession.key });
  }

  if (action === 'set_name') {
    const name = (body as { name?: string }).name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    await setConfig('game_name', name);
    return NextResponse.json({ ok: true });
  }

  if (action === 'reset') {
    const db = getTursoClient();
    await db.batch(
      [
        { sql: 'DELETE FROM daily_picks', args: [] },
        { sql: 'DELETE FROM daily_results', args: [] },
        { sql: 'DELETE FROM daily_sessions', args: [] },
        { sql: 'DELETE FROM daily_ko_games', args: [] },
        { sql: 'DELETE FROM daily_bot_pens', args: [] },
        { sql: 'DELETE FROM daily_users', args: [] },
        { sql: "DELETE FROM daily_config WHERE key = 'started'", args: [] },
      ],
      'write'
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
