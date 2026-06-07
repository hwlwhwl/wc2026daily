'use client';

import { useState, useEffect, useCallback } from 'react';
import { GROUP_GAMES, FLAGS, getActiveSessions } from '@/lib/daily/games';
import { calcPoints, calcPointsKO, fmtPts } from '@/lib/daily/scoring';
import type { PickEntry, ResultMap } from '@/lib/daily/scoring';

interface User {
  id: string;
  name: string;
  photo: string;
}

interface KOGame {
  id: string;
  round: string;
  home: string;
  away: string;
  date: string;
}

interface SessionData {
  key: string;
  label: string;
  pickOrder: string[];
  submittedBy: string[];
  picks: Record<string, Record<string, PickEntry>>;
}

interface GameState {
  gameName: string;
  started: boolean;
  users: User[];
  sessions: Record<string, SessionData>;
  results: ResultMap;
  koGames: KOGame[];
  currentSessionKey: string | null;
  currentPickerId: string | null;
}

interface PlayerStats {
  id: string;
  name: string;
  isBot: boolean;
  total: number;
  exact: number;
  correct: number;
  scored: number;
  sessionPts: Record<string, number | null>;
}

function avatarColor(name: string): string {
  const AVATAR_COLORS = [
    '#16a34a','#2563eb','#dc2626','#d97706','#7c3aed',
    '#db2777','#0891b2','#65a30d','#c2410c','#4f46e5','#059669','#b45309',
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ user, size = 32 }: { user: User | null; size?: number }) {
  if (!user) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-indigo-900 flex items-center justify-center flex-shrink-0 text-base"
      >
        🤖
      </div>
    );
  }
  if (user.photo) {
    return (
      <img
        src={user.photo}
        alt={user.name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-white/20 flex-shrink-0"
      />
    );
  }
  const color = avatarColor(user.name);
  const letter = user.name.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size, background: color, fontSize: Math.max(10, size * 0.38) }}
      className="rounded-full border border-white/20 flex items-center justify-center font-bold text-white flex-shrink-0"
    >
      {letter}
    </div>
  );
}

function computeStats(gs: GameState): PlayerStats[] {
  const activeSessions = getActiveSessions(gs.koGames);
  const koGameIds = new Set(gs.koGames.map((g) => g.id));

  function getSessionGames(sessKey: string) {
    const sess = activeSessions.find((s) => s.key === sessKey);
    if (!sess) return [];
    const groupGames = GROUP_GAMES.filter((g) => sess.dates.includes(g.date));
    const koGames = gs.koGames.filter((g) => sess.dates.includes(g.date));
    return [
      ...groupGames.map((g) => ({ ...g, id: String(g.id) })),
      ...koGames,
    ];
  }

  function scoreForPick(gameId: string, pick: PickEntry): number {
    const r = gs.results[gameId];
    if (!r) return 0;
    if (koGameIds.has(gameId)) return calcPointsKO(pick, r);
    return calcPoints(pick.h, pick.a, r.h, r.a);
  }

  // Compute for real players
  const playerStats: PlayerStats[] = gs.users.map((user) => {
    let total = 0, exact = 0, correct = 0, scored = 0;
    const sessionPts: Record<string, number | null> = {};

    for (const sess of activeSessions) {
      const sessData = gs.sessions[sess.key];
      if (!sessData || !sessData.picks[user.id]) {
        sessionPts[sess.key] = null;
        continue;
      }
      const userPicks = sessData.picks[user.id];
      const games = getSessionGames(sess.key);
      let sessPts = 0;
      let sessHasResult = false;

      for (const game of games) {
        const r = gs.results[game.id];
        if (!r) continue;
        sessHasResult = true;
        const pick = userPicks[game.id];
        if (!pick) continue;
        scored++;
        const pts = scoreForPick(game.id, pick);
        total += pts;
        sessPts += pts;
        const base = Math.floor(pts);
        if (base === 3) exact++;
        else if (base === 1) correct++;
      }
      sessionPts[sess.key] = sessHasResult ? sessPts : null;
    }

    return { id: user.id, name: user.name, isBot: false, total, exact, correct, scored, sessionPts };
  });

  // Compute for bot (always picks 1-1)
  {
    let total = 0, exact = 0, correct = 0, scored = 0;
    const sessionPts: Record<string, number | null> = {};
    const allGames = [
      ...GROUP_GAMES.map((g) => ({ ...g, id: String(g.id) })),
      ...gs.koGames,
    ];

    for (const sess of activeSessions) {
      const games = getSessionGames(sess.key);
      let sessPts = 0;
      let sessHasResult = false;

      for (const game of games) {
        const r = gs.results[game.id];
        if (!r) continue;
        sessHasResult = true;
        scored++;
        // Bot picks {h:1,a:1} for all games (no pen bonus since bot pens not in state)
        const pts = koGameIds.has(game.id)
          ? calcPointsKO({ h: 1, a: 1 }, r)
          : calcPoints(1, 1, r.h, r.a);
        total += pts;
        sessPts += pts;
        const base = Math.floor(pts);
        if (base === 3) exact++;
        else if (base === 1) correct++;
      }
      sessionPts[sess.key] = sessHasResult ? sessPts : null;
    }

    playerStats.push({
      id: '__bot__',
      name: 'Bot (1-1)',
      isBot: true,
      total,
      exact,
      correct,
      scored,
      sessionPts,
    });
  }

  // Sort everyone together by total ascending (fewest wins), then exact, then correct
  playerStats.sort((a, b) => a.total - b.total || b.exact - a.exact || b.correct - a.correct);

  return playerStats;
}

export default function LeaderboardPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/state');
      if (res.ok) setGameState(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchState();
    const iv = setInterval(fetchState, 30000);
    return () => clearInterval(iv);
  }, [fetchState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!gameState || !gameState.started) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-white mb-2">Leaderboard</h2>
        <p className="text-slate-400">Game hasn't started yet.</p>
      </div>
    );
  }

  const stats = computeStats(gameState);
  const activeSessions = getActiveSessions(gameState.koGames);
  const sessionsWithResults = activeSessions.filter((sess) =>
    stats.some((s) => s.sessionPts[sess.key] !== null)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{gameState.gameName}</h1>
        <button
          onClick={fetchState}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Main table */}
      <div className="bg-pitch-light border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-500 text-left">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-2">Player</th>
              <th className="py-3 px-3 text-right">Points</th>
              <th className="py-3 px-3 text-right">Correct</th>
              <th className="py-3 px-3 text-right">Exact</th>
              <th className="py-3 px-3 text-right">Scored</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Compute human ranks (ties share same rank; bot gets —)
              let humanPos = 0;
              let lastRank = 0;
              let lastPts = NaN;
              let lastExact = NaN;
              const ranks: (string | number)[] = stats.map((s) => {
                if (s.isBot) return '—';
                humanPos++;
                if (s.total !== lastPts || s.exact !== lastExact) {
                  lastRank = humanPos;
                }
                lastPts = s.total;
                lastExact = s.exact;
                return lastRank;
              });

              return stats.map((s, idx) => {
              const user = gameState.users.find((u) => u.id === s.id) ?? null;
              const rank = ranks[idx];
              return (
                <tr
                  key={s.id}
                  className={`border-b border-white/5 ${s.isBot ? 'opacity-60' : ''}`}
                >
                  <td className="py-3 px-4 text-slate-500 font-mono text-xs">{rank}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Avatar user={user} size={28} />
                      <span className="text-white font-medium">{s.name}</span>
                      {s.isBot && (
                        <span className="text-xs text-slate-500">(KO pen bonus excluded)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold font-mono text-white">
                    {fmtPts(s.total)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">{s.correct}</td>
                  <td className="py-3 px-3 text-right text-slate-300">{s.exact}</td>
                  <td className="py-3 px-3 text-right text-slate-500">{s.scored}</td>
                </tr>
              );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* Day-by-day breakdown */}
      {sessionsWithResults.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Session Breakdown</h2>
          {sessionsWithResults.map((sess) => (
            <details key={sess.key} className="bg-pitch-light border border-white/10 rounded-xl overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer text-slate-300 font-medium hover:text-white flex items-center justify-between">
                <span>{sess.label}</span>
                <span className="text-slate-500 text-xs">▼</span>
              </summary>
              <div className="px-5 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-left border-b border-white/10">
                      <th className="py-2 pr-3">Player</th>
                      <th className="py-2 px-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => {
                      const pts = s.sessionPts[sess.key];
                      return (
                        <tr key={s.id} className="border-b border-white/5">
                          <td className="py-1.5 pr-3 text-slate-300">{s.name}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-white">
                            {pts !== null ? fmtPts(pts) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Games in this session */}
                <div className="mt-3 space-y-1">
                  {(() => {
                    const sessInfo = activeSessions.find((s) => s.key === sess.key);
                    if (!sessInfo) return null;
                    const groupGames = GROUP_GAMES.filter((g) => sessInfo.dates.includes(g.date));
                    const koGames = gameState.koGames.filter((g) => sessInfo.dates.includes(g.date));
                    const allGames = [
                      ...groupGames.map((g) => ({ ...g, id: String(g.id) })),
                      ...koGames,
                    ];
                    const sessData = gameState.sessions[sess.key];
                    return allGames.map((game) => {
                      const r = gameState.results[game.id];
                      const hFlag = FLAGS[game.home] ?? '';
                      const aFlag = FLAGS[game.away] ?? '';
                      return (
                        <div
                          key={game.id}
                          className="flex items-center gap-2 text-xs text-slate-400 py-1 border-b border-white/5"
                        >
                          <span className="flex-1">
                            {hFlag} {game.home} vs {aFlag} {game.away}
                          </span>
                          <span className="font-mono text-white">
                            {r ? `${r.h}-${r.a}` : '—'}
                          </span>
                          {sessData &&
                            stats
                              .filter((s) => !s.isBot && sessData.picks[s.id])
                              .map((s) => {
                                const pick = sessData.picks[s.id]?.[game.id];
                                return (
                                  <span key={s.id} className="font-mono text-slate-500">
                                    {pick ? `${pick.h}-${pick.a}` : '—'}
                                  </span>
                                );
                              })}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
