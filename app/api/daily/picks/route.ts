import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSchema,
  getUserById,
  getConfig,
  getSessions,
  getSessionSubmitters,
  savePicks,
  getResults,
  getKOGames,
  addKOGame,
  createOrUpdateSession,
  getAllPicks,
  getUsers,
} from '@/lib/daily/db';
import { getActiveSessions, GROUP_GAMES, KO_BRACKET_TEMPLATE } from '@/lib/daily/games';
import { syncKOBracket, scoreGamePick, PickEntry } from '@/lib/daily/scoring';

export async function POST(req: NextRequest) {
  await ensureSchema();

  const body = await req.json();
  const { userId, sessionKey, picks } = body as {
    userId: string;
    sessionKey: string;
    picks: Record<string, PickEntry>;
  };

  if (!userId || !sessionKey || !picks) {
    return NextResponse.json({ error: 'Missing userId, sessionKey, or picks' }, { status: 400 });
  }

  // 1. User must exist
  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 2. Game must be started
  const started = await getConfig('started');
  if (started !== '1') {
    return NextResponse.json({ error: 'Game has not started yet' }, { status: 403 });
  }

  // 3. It must be this user's turn
  const [sessions, koGames, results] = await Promise.all([
    getSessions(),
    getKOGames(),
    getResults(),
  ]);

  const activeSessions = getActiveSessions(koGames);

  // Find current session & picker
  let currentSessionKey: string | null = null;
  let currentPickerId: string | null = null;

  for (const sess of activeSessions) {
    const dbSess = sessions.find((s) => s.key === sess.key);
    if (!dbSess) continue;
    const submittedBy = await getSessionSubmitters(sess.key);
    const allSubmitted = dbSess.pickOrder.every((uid) => submittedBy.includes(uid));
    if (!allSubmitted) {
      currentSessionKey = sess.key;
      currentPickerId = dbSess.pickOrder.find((uid) => !submittedBy.includes(uid)) ?? null;
      break;
    }
  }

  if (currentSessionKey !== sessionKey) {
    return NextResponse.json({ error: 'This is not the active session' }, { status: 400 });
  }

  if (currentPickerId !== userId) {
    return NextResponse.json({ error: 'It is not your turn to pick' }, { status: 403 });
  }

  // 4. Validate picks
  const dbSess = sessions.find((s) => s.key === sessionKey)!;

  // Get games for this session
  const sessInfo = activeSessions.find((s) => s.key === sessionKey)!;
  const sessionKOGames = koGames.filter((g) => sessInfo.dates.includes(g.date));
  const isKOGameId = new Set(sessionKOGames.map((g) => g.id));

  for (const [gameIdStr, pick] of Object.entries(picks)) {
    const h = Number(pick.h);
    const a = Number(pick.a);

    // KO game: if draw, pen scores must differ
    if (isKOGameId.has(gameIdStr)) {
      if (h === a) {
        const ph = pick.ph != null ? Number(pick.ph) : null;
        const pa = pick.pa != null ? Number(pick.pa) : null;
        if (ph === null || pa === null) {
          return NextResponse.json(
            { error: `KO game ${gameIdStr}: penalty scores required for a draw pick` },
            { status: 400 }
          );
        }
        if (ph === pa) {
          return NextResponse.json(
            { error: `KO game ${gameIdStr}: penalty scores must differ` },
            { status: 400 }
          );
        }
      }
    }
  }

  // 5. Save picks
  await savePicks(userId, sessionKey, picks);

  // 6. Check if session is now complete → advance/init next session
  const updatedSubmitters = await getSessionSubmitters(sessionKey);
  const sessionComplete = dbSess.pickOrder.every((uid) => updatedSubmitters.includes(uid));

  if (sessionComplete) {
    // Re-fetch everything for next session init
    const [freshSessions, freshKoGames, freshResults] = await Promise.all([
      getSessions(),
      getKOGames(),
      getResults(),
    ]);

    // Sync KO bracket in case new games are unlocked
    const freshAllPicks = await getAllPicks();
    const newKOGames = syncKOBracket(GROUP_GAMES, freshResults, freshKoGames, KO_BRACKET_TEMPLATE);

    const allKOGames = [...freshKoGames];
    for (const ng of newKOGames) {
      await addKOGame(ng);
      allKOGames.push(ng);
    }

    // Now init next session if needed
    const freshActiveSessions = getActiveSessions(allKOGames);
    const currentIdx = freshActiveSessions.findIndex((s) => s.key === sessionKey);

    if (currentIdx >= 0 && currentIdx + 1 < freshActiveSessions.length) {
      const nextSess = freshActiveSessions[currentIdx + 1];
      const nextDbSess = freshSessions.find((s) => s.key === nextSess.key);

      if (!nextDbSess) {
        // Need to create it — compute pick order
        const users = await getUsers();
        const pickOrder = computePickOrder(
          users,
          sessionKey,
          freshSessions,
          freshAllPicks,
          freshResults,
          freshKoGames
        );
        await createOrUpdateSession(nextSess.key, nextSess.label, pickOrder);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

function computePickOrder(
  users: { id: string; name: string; photo: string }[],
  prevSessionKey: string,
  sessions: { key: string; label: string; pickOrder: string[] }[],
  allPicks: Record<string, Record<string, PickEntry>>,
  results: Record<string, { h: number; a: number; ph?: number | null; pa?: number | null }>,
  koGames: { id: string; round: string; home: string; away: string; date: string }[]
): string[] {
  const activeSessions = getActiveSessions(koGames);
  const isKOGameId = new Set(koGames.map((g) => g.id));

  function getSessionGames(sessKey: string) {
    const sess = activeSessions.find((s) => s.key === sessKey);
    if (!sess) return [];
    const groupGames = GROUP_GAMES.filter((g) => sess.dates.includes(g.date));
    const koG = koGames.filter((g) => sess.dates.includes(g.date));
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
      pts += scoreGamePick(pick, r, isKOGameId.has(String(game.id)));
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

  return [...users]
    .sort((a, b) => {
      const aPrev = getSessionPoints(a.id, prevSessionKey);
      const bPrev = getSessionPoints(b.id, prevSessionKey);
      if (aPrev !== bPrev) return aPrev - bPrev;
      return getTotalPoints(a.id) - getTotalPoints(b.id);
    })
    .map((u) => u.id);
}
