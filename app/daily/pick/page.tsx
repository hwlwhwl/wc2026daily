'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GROUP_GAMES, FLAGS, getActiveSessions } from '@/lib/daily/games';
import type { PickEntry } from '@/lib/daily/scoring';
import { FIFA_RANK } from '@/lib/daily/dossiers';
import DossierModal from '@/app/daily/components/DossierModal';

interface User {
  id: string;
  name: string;
  photo: string;
}

interface SessionData {
  key: string;
  label: string;
  pickOrder: string[];
  submittedBy: string[];
  picks: Record<string, Record<string, PickEntry>>;
}

interface KOGame {
  id: string;
  round: string;
  home: string;
  away: string;
  date: string;
}

interface GameState {
  gameName: string;
  started: boolean;
  users: User[];
  sessions: Record<string, SessionData>;
  results: Record<string, { h: number; a: number; ph?: number | null; pa?: number | null }>;
  koGames: KOGame[];
  currentSessionKey: string | null;
  currentPickerId: string | null;
}

type AnyGame = { id: string | number; home: string; away: string; date: string };

function avatarColor(name: string): string {
  const AVATAR_COLORS = [
    '#16a34a','#2563eb','#dc2626','#d97706','#7c3aed',
    '#db2777','#0891b2','#65a30d','#c2410c','#4f46e5','#059669','#b45309',
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ user, size = 36 }: { user: User | null; size?: number }) {
  if (!user) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-indigo-900 border-2 border-indigo-400/30 flex items-center justify-center flex-shrink-0 text-lg"
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
        className="rounded-full object-cover border-2 border-white/20 flex-shrink-0"
      />
    );
  }
  const color = avatarColor(user.name);
  const letter = user.name.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size, background: color, fontSize: Math.max(10, size * 0.38) }}
      className="rounded-full border-2 border-white/20 flex items-center justify-center font-bold text-white flex-shrink-0"
    >
      {letter}
    </div>
  );
}

function ScoreBtn({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {label && <div className="text-xs text-slate-500">{label}</div>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-sm transition-colors"
        >
          −
        </button>
        <div className="w-10 text-center text-white text-lg font-bold">{value}</div>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-sm transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function DailyPickPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPicks, setCurrentPicks] = useState<Record<string, PickEntry>>({});
  const [gameErrors, setGameErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pollCountdown, setPollCountdown] = useState(10);
  const [dossierGame, setDossierGame] = useState<{ home: string; away: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('wc2026_daily_user');
    if (!stored) {
      router.push('/daily');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/state');
      if (res.ok) {
        const data = await res.json();
        setGameState(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Polling when it's not user's turn
  useEffect(() => {
    if (!gameState || !user) return;
    const isMyTurn = gameState.currentPickerId === user.id && gameState.currentSessionKey !== null;

    // Clear existing intervals
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (!isMyTurn && gameState.currentSessionKey) {
      // Poll every 10 seconds
      setPollCountdown(10);
      pollRef.current = setInterval(() => {
        fetchState();
        setPollCountdown(10);
      }, 10000);
      countdownRef.current = setInterval(() => {
        setPollCountdown((c) => Math.max(0, c - 1));
      }, 1000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [gameState?.currentPickerId, gameState?.currentSessionKey, user?.id, fetchState]);

  // Initialize current picks when it becomes my turn
  useEffect(() => {
    if (!gameState || !user) return;
    if (gameState.currentPickerId !== user.id || !gameState.currentSessionKey) return;

    const sessKey = gameState.currentSessionKey;
    const sessInfo = getActiveSessions(gameState.koGames).find((s) => s.key === sessKey);
    if (!sessInfo) return;

    const sessionGames = getSessionGames(sessKey, gameState);
    const initialPicks: Record<string, PickEntry> = {};
    for (const game of sessionGames) {
      initialPicks[String(game.id)] = { h: 0, a: 0 };
    }
    setCurrentPicks(initialPicks);
    setGameErrors({});
  }, [gameState?.currentPickerId, gameState?.currentSessionKey, user?.id]);

  function getSessionGames(sessKey: string, gs: GameState): AnyGame[] {
    const activeSessions = getActiveSessions(gs.koGames);
    const sess = activeSessions.find((s) => s.key === sessKey);
    if (!sess) return [];
    const groupGames = GROUP_GAMES.filter((g) => sess.dates.includes(g.date));
    const koGames = gs.koGames.filter((g) => sess.dates.includes(g.date));
    return [
      ...groupGames.map((g) => ({ ...g, id: g.id })),
      ...koGames,
    ];
  }

  function updatePick(gameId: string, field: 'h' | 'a' | 'ph' | 'pa', value: number) {
    setCurrentPicks((prev) => {
      const existing = prev[gameId] ?? { h: 0, a: 0 };
      return { ...prev, [gameId]: { ...existing, [field]: value } };
    });
    setGameErrors((prev) => {
      const next = { ...prev };
      delete next[gameId];
      return next;
    });
  }

  async function handleSubmit() {
    if (!user || !gameState?.currentSessionKey) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/daily/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sessionKey: gameState.currentSessionKey,
          picks: currentPicks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Submit failed');
        setSubmitting(false);
        return;
      }
      // Success: refetch
      await fetchState();
      setCurrentPicks({});
    } catch {
      setSubmitError('Network error. Please try again.');
    }
    setSubmitting(false);
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (!user || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 animate-pulse">Loading…</div>
      </div>
    );
  }

  // ─── Not started ─────────────────────────────────────────────────────────────
  if (!gameState.started) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-white mb-2">Game hasn't started yet</h2>
        <p className="text-slate-400">Check back soon!</p>
        <button
          onClick={fetchState}
          className="mt-6 px-4 py-2 bg-pitch-light border border-white/10 rounded-lg text-slate-300 hover:text-white text-sm"
        >
          Refresh
        </button>
      </div>
    );
  }

  // ─── All done ─────────────────────────────────────────────────────────────────
  if (!gameState.currentSessionKey) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">All picked!</h2>
        <p className="text-slate-400 mb-6">Waiting for today's results to come in.</p>
        <a
          href="/daily/board"
          className="inline-block bg-green-600 hover:bg-green-500 transition-colors rounded-lg px-6 py-3 font-semibold"
        >
          View Leaderboard →
        </a>
      </div>
    );
  }

  const sessKey = gameState.currentSessionKey;
  const sessData = gameState.sessions[sessKey];
  const activeSessions = getActiveSessions(gameState.koGames);
  const sessInfo = activeSessions.find((s) => s.key === sessKey);
  const sessionGames = getSessionGames(sessKey, gameState);
  const isKOSet = new Set(gameState.koGames.map((g) => g.id));
  const isMyTurn = gameState.currentPickerId === user.id;
  const currentPickerUser = gameState.users.find((u) => u.id === gameState.currentPickerId) ?? null;

  const pickOrder = sessData?.pickOrder ?? [];

  // ─── Waiting screen ──────────────────────────────────────────────────────────
  if (!isMyTurn) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-pitch-light border border-white/10 rounded-xl p-5">
          <div className="text-sm text-slate-500 mb-1">Session</div>
          <div className="text-xl font-bold text-white mb-3">{sessInfo?.label}</div>

          {/* Pick order chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {pickOrder.map((pid) => {
              const p = gameState.users.find((u) => u.id === pid);
              const done = sessData?.submittedBy?.includes(pid);
              const isCurrent = pid === gameState.currentPickerId;
              return (
                <div
                  key={pid}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                    done
                      ? 'bg-green-900/30 border-green-700/50 text-green-400'
                      : isCurrent
                      ? 'bg-yellow-900/40 border-yellow-600/50 text-yellow-300 animate-pulse'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {p ? (
                    <Avatar user={p} size={20} />
                  ) : (
                    <span>🤖</span>
                  )}
                  <span>{p?.name ?? 'Bot'}</span>
                  {done && <span>✓</span>}
                </div>
              );
            })}
          </div>

          <p className="text-slate-400 text-sm">
            Waiting for{' '}
            <strong className="text-white">{currentPickerUser?.name ?? 'someone'}</strong>{' '}
            to submit their picks…
            <span className="text-slate-600 ml-2">({pollCountdown}s)</span>
          </p>
        </div>

        {/* Submitted picks so far */}
        {sessData && Object.keys(sessData.picks).length > 0 && (
          <div className="bg-pitch-light border border-white/10 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3">Picks so far</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-white/10">
                    <th className="pb-2 pr-3">Game</th>
                    {pickOrder
                      .filter((pid) => sessData.submittedBy?.includes(pid))
                      .map((pid) => {
                        const p = gameState.users.find((u) => u.id === pid);
                        return (
                          <th key={pid} className="pb-2 px-2 text-center">
                            {p?.name ?? 'Bot'}
                          </th>
                        );
                      })}
                  </tr>
                </thead>
                <tbody>
                  {sessionGames.map((game) => {
                    const gid = String(game.id);
                    const hFlag = FLAGS[game.home] ?? '';
                    const aFlag = FLAGS[game.away] ?? '';
                    return (
                      <tr key={gid} className="border-b border-white/5">
                        <td className="py-1.5 pr-3 text-slate-300 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDossierGame({ home: game.home, away: game.away })}
                            className="text-left hover:text-blue-400 transition-colors"
                          >
                            {hFlag} {game.home} vs {aFlag} {game.away}
                          </button>
                        </td>
                        {pickOrder
                          .filter((pid) => sessData.submittedBy?.includes(pid))
                          .map((pid) => {
                            const pick = sessData.picks[pid]?.[gid];
                            return (
                              <td key={pid} className="py-1.5 px-2 text-center font-mono text-slate-200">
                                {pick ? `${pick.h}-${pick.a}` : '—'}
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={fetchState}
          className="w-full py-2 bg-pitch-light border border-white/10 rounded-lg text-slate-400 hover:text-white text-sm transition-colors"
        >
          Refresh now
        </button>

        {dossierGame && (
          <DossierModal
            home={dossierGame.home}
            away={dossierGame.away}
            onClose={() => setDossierGame(null)}
          />
        )}
      </div>
    );
  }

  // ─── My turn — Pick form ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Session header */}
      <div className="bg-pitch-light border border-white/10 rounded-xl p-5">
        <div className="text-sm text-slate-500 mb-1">Your turn to pick!</div>
        <div className="text-xl font-bold text-white mb-1">{sessInfo?.label}</div>
        <div className="text-sm text-slate-400">{sessionGames.length} games</div>

        {/* Pick order chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {pickOrder.map((pid) => {
            const p = gameState.users.find((u) => u.id === pid);
            const done = sessData?.submittedBy?.includes(pid);
            const isCurrent = pid === user.id;
            return (
              <div
                key={pid}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                  done
                    ? 'bg-green-900/30 border-green-700/50 text-green-400'
                    : isCurrent
                    ? 'bg-blue-900/40 border-blue-500/50 text-blue-300 ring-1 ring-blue-500'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
              >
                {p ? <Avatar user={p} size={20} /> : <span>🤖</span>}
                <span>{isCurrent ? 'You' : (p?.name ?? 'Bot')}</span>
                {done && <span>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Games */}
      {sessionGames.map((game) => {
        const gid = String(game.id);
        const pick = currentPicks[gid] ?? { h: 0, a: 0 };
        const isKO = isKOSet.has(game.id as string);
        const isDraw = pick.h === pick.a;
        const err = gameErrors[gid];
        const hFlag = FLAGS[game.home] ?? '';
        const aFlag = FLAGS[game.away] ?? '';

        return (
          <div
            key={gid}
            className={`bg-pitch-light border rounded-xl p-4 transition-colors ${
              err ? 'border-red-700/60' : 'border-white/10'
            }`}
          >
            {/* Game label */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-slate-500">
                {game.date}
                {isKO && <span className="ml-2 text-yellow-500 font-medium">KO</span>}
              </div>
              <button
                type="button"
                onClick={() => setDossierGame({ home: game.home, away: game.away })}
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors px-2 py-0.5 rounded border border-white/10 hover:border-blue-500/40"
                title="Team profiles"
              >
                ℹ Scout
              </button>
            </div>

            {/* Score input */}
            <div className="flex items-center gap-3 justify-center">
              <div className="flex-1 text-right">
                <div className="font-semibold text-white text-sm">
                  {hFlag} {game.home}
                </div>
                {FIFA_RANK[game.home] && (
                  <div className="text-xs text-slate-600">#{FIFA_RANK[game.home]}</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ScoreBtn value={pick.h} onChange={(v) => updatePick(gid, 'h', v)} label="" />
                <span className="text-slate-600 font-bold text-lg">–</span>
                <ScoreBtn value={pick.a} onChange={(v) => updatePick(gid, 'a', v)} label="" />
              </div>

              <div className="flex-1 text-left">
                <div className="font-semibold text-white text-sm">
                  {aFlag} {game.away}
                </div>
                {FIFA_RANK[game.away] && (
                  <div className="text-xs text-slate-600">#{FIFA_RANK[game.away]}</div>
                )}
              </div>
            </div>

            {/* KO: penalty inputs when draw */}
            {isKO && isDraw && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-xs text-slate-500 mb-2 text-center">
                  Draw — add penalty score prediction
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <div className="text-xs text-slate-400 text-right flex-1">{game.home} pens</div>
                  <div className="flex items-center gap-2">
                    <ScoreBtn
                      value={pick.ph ?? 0}
                      onChange={(v) => updatePick(gid, 'ph', v)}
                      label=""
                    />
                    <span className="text-slate-600">–</span>
                    <ScoreBtn
                      value={pick.pa ?? 0}
                      onChange={(v) => updatePick(gid, 'pa', v)}
                      label=""
                    />
                  </div>
                  <div className="text-xs text-slate-400 flex-1">{game.away} pens</div>
                </div>
                {pick.ph != null && pick.pa != null && pick.ph === pick.pa && (
                  <p className="text-red-400 text-xs text-center mt-1">
                    Penalty scores must differ
                  </p>
                )}
              </div>
            )}

            {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
          </div>
        );
      })}

      {/* Submit */}
      {submitError && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
          {submitError}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-xl py-3 font-bold text-lg"
      >
        {submitting ? 'Submitting…' : 'Submit Picks →'}
      </button>

      {/* Dossier modal */}
      {dossierGame && (
        <DossierModal
          home={dossierGame.home}
          away={dossierGame.away}
          onClose={() => setDossierGame(null)}
        />
      )}
    </div>
  );
}
