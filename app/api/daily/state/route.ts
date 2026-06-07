import { NextResponse } from 'next/server';
import {
  ensureSchema,
  getConfig,
  getUsers,
  getSessions,
  getAllPicks,
  getSessionSubmitters,
  getResults,
  getKOGames,
} from '@/lib/daily/db';
import { getActiveSessions, GROUP_GAMES } from '@/lib/daily/games';
import type { PickMap } from '@/lib/daily/scoring';

export async function GET() {
  await ensureSchema();

  const [gameName, startedVal, users, dbSessions, allPicks, results, koGames] = await Promise.all([
    getConfig('game_name'),
    getConfig('started'),
    getUsers(),
    getSessions(),
    getAllPicks(),
    getResults(),
    getKOGames(),
  ]);

  const started = startedVal === '1';
  const activeSessions = getActiveSessions(koGames);

  // Build sessions map
  const sessionsMap: Record<
    string,
    {
      key: string;
      label: string;
      pickOrder: string[];
      submittedBy: string[];
      picks: Record<string, PickMap>;
    }
  > = {};

  for (const sess of dbSessions) {
    const submittedBy = await getSessionSubmitters(sess.key);

    // Determine game IDs for this session
    const sessInfo = activeSessions.find((s) => s.key === sess.key);
    const sessionGameIds = new Set<string>();
    if (sessInfo) {
      for (const g of GROUP_GAMES.filter((g) => sessInfo.dates.includes(g.date))) {
        sessionGameIds.add(String(g.id));
      }
      for (const g of koGames.filter((g) => sessInfo.dates.includes(g.date))) {
        sessionGameIds.add(g.id);
      }
    }

    // Build picks per user, filtered to this session's games
    const picksForSession: Record<string, PickMap> = {};
    for (const [userId, userPicks] of Object.entries(allPicks)) {
      if (!submittedBy.includes(userId)) continue;
      const sessionPicks: PickMap = {};
      for (const [gameId, pick] of Object.entries(userPicks)) {
        if (sessionGameIds.size === 0 || sessionGameIds.has(gameId)) {
          sessionPicks[gameId] = pick;
        }
      }
      if (Object.keys(sessionPicks).length > 0) {
        picksForSession[userId] = sessionPicks;
      }
    }

    sessionsMap[sess.key] = {
      key: sess.key,
      label: sess.label,
      pickOrder: sess.pickOrder,
      submittedBy,
      picks: picksForSession,
    };
  }

  // Determine current session and picker
  let currentSessionKey: string | null = null;
  let currentPickerId: string | null = null;

  for (const sess of activeSessions) {
    const dbSess = dbSessions.find((s) => s.key === sess.key);
    if (!dbSess) continue;

    const submittedBy = sessionsMap[sess.key]?.submittedBy ?? [];
    const allSubmitted = dbSess.pickOrder.every((uid) => submittedBy.includes(uid));
    if (!allSubmitted) {
      currentSessionKey = sess.key;
      currentPickerId = dbSess.pickOrder.find((uid) => !submittedBy.includes(uid)) ?? null;
      break;
    }
  }

  return NextResponse.json({
    gameName: gameName ?? "WC2026 Daily Pick'em",
    started,
    users,
    sessions: sessionsMap,
    results,
    koGames,
    currentSessionKey,
    currentPickerId,
  });
}
