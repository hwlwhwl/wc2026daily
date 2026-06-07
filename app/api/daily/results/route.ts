import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSchema,
  saveResult,
  deleteResult,
  getResults,
  getKOGames,
  addKOGame,
  getSessions,
  getUsers,
  getAllPicks,
  createOrUpdateSession,
} from '@/lib/daily/db';
import { GROUP_GAMES, KO_BRACKET_TEMPLATE, getActiveSessions } from '@/lib/daily/games';
import { syncKOBracket, scoreGamePick, PickEntry } from '@/lib/daily/scoring';

export async function GET() {
  await ensureSchema();
  const results = await getResults();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const body = await req.json();
  const { adminCode, gameId, homeScore, awayScore, penHome, penAway } = body as {
    adminCode: string;
    gameId: string;
    homeScore: number;
    awayScore: number;
    penHome?: number | null;
    penAway?: number | null;
  };

  if (adminCode !== process.env.DAILY_ADMIN_CODE) {
    return NextResponse.json({ error: 'Invalid admin code' }, { status: 401 });
  }

  if (!gameId || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await saveResult(gameId, Number(homeScore), Number(awayScore), penHome ?? null, penAway ?? null);

  // Sync KO bracket
  await syncAndInitSessions();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureSchema();

  const adminCode = req.nextUrl.searchParams.get('adminCode');
  const gameId = req.nextUrl.searchParams.get('gameId');

  if (adminCode !== process.env.DAILY_ADMIN_CODE) {
    return NextResponse.json({ error: 'Invalid admin code' }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
  }

  await deleteResult(gameId);

  // Sync KO bracket
  await syncAndInitSessions();

  return NextResponse.json({ ok: true });
}

async function syncAndInitSessions() {
  const [existingKOGames, results, sessions, users, allPicks] = await Promise.all([
    getKOGames(),
    getResults(),
    getSessions(),
    getUsers(),
    getAllPicks(),
  ]);

  const newKOGames = syncKOBracket(GROUP_GAMES, results, existingKOGames, KO_BRACKET_TEMPLATE);
  const allKOGames = [...existingKOGames];

  for (const ng of newKOGames) {
    await addKOGame(ng);
    allKOGames.push(ng);
  }

  if (newKOGames.length === 0) return;

  // For each new KO game, check if its session needs to be initialized
  const activeSessions = getActiveSessions(allKOGames);
  const isKOGameId = new Set(allKOGames.map((g) => g.id));

  function getSessionGames(sessKey: string) {
    const sess = activeSessions.find((s) => s.key === sessKey);
    if (!sess) return [];
    const groupGames = GROUP_GAMES.filter((g) => sess.dates.includes(g.date));
    const koG = allKOGames.filter((g) => sess.dates.includes(g.date));
    return [...groupGames.map((g) => ({ ...g, id: String(g.id) })), ...koG];
  }

  function getSessionPoints(userId: string, sessKey: string): number {
    const userPicks = allPicks[userId];
    if (!userPicks) return 0;
    const games = getSessionGames(sessKey);
    let pts = 0;
    for (const game of games) {
      const r = results[String(game.id)];
      if (!r) continue;
      const pick = userPicks[String(game.id)];
      if (!pick) continue;
      pts += scoreGamePick(pick as PickEntry, r, isKOGameId.has(String(game.id)));
    }
    return pts;
  }

  function getTotalPoints(userId: string): number {
    let total = 0;
    for (const sess of activeSessions) {
      total += getSessionPoints(userId, sess.key);
    }
    return total;
  }

  // Find sessions that contain the new KO games and need initialization
  for (const ng of newKOGames) {
    const sess = activeSessions.find((s) => s.dates.includes(ng.date));
    if (!sess) continue;

    const alreadyExists = sessions.find((s) => s.key === sess.key);
    if (alreadyExists) continue;

    // Find the most recent completed session before this one
    const sessIdx = activeSessions.findIndex((s) => s.key === sess.key);
    if (sessIdx <= 0) continue; // no previous session, can't compute order yet

    const prevSessKey = activeSessions[sessIdx - 1].key;
    const prevDbSess = sessions.find((s) => s.key === prevSessKey);
    if (!prevDbSess) continue; // previous session not initialized either, skip

    const pickOrder = [...users]
      .sort((a, b) => {
        const aPrev = getSessionPoints(a.id, prevSessKey);
        const bPrev = getSessionPoints(b.id, prevSessKey);
        if (aPrev !== bPrev) return aPrev - bPrev;
        return getTotalPoints(a.id) - getTotalPoints(b.id);
      })
      .map((u) => u.id);

    await createOrUpdateSession(sess.key, sess.label, pickOrder);
  }
}
