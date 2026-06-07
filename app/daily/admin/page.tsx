'use client';

import { useState, useEffect, useCallback } from 'react';
import { GROUP_GAMES, KO_BRACKET_TEMPLATE, FLAGS, getActiveSessions } from '@/lib/daily/games';
import type { PickEntry } from '@/lib/daily/scoring';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
  results: Record<string, { h: number; a: number; ph?: number | null; pa?: number | null }>;
  koGames: KOGame[];
  currentSessionKey: string | null;
  currentPickerId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPN helpers
// ─────────────────────────────────────────────────────────────────────────────

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

const ESPN_TEAM_MAP: Record<string, string> = {
  'united states':                'USA',
  'us':                           'USA',
  'bosnia and herzegovina':       'Bosnia and Herz.',
  'bosnia-herzegovina':           'Bosnia and Herz.',
  'bosnia & herzegovina':         'Bosnia and Herz.',
  'czech republic':               'Czechia',
  'ivory coast':                  'Ivory Coast',
  "cote d'ivoire":                'Ivory Coast',
  "côte d'ivoire":                'Ivory Coast',
  'korea republic':               'South Korea',
  'republic of korea':            'South Korea',
  'cabo verde':                   'Cape Verde',
  'saudi arabia':                 'Saudi Arabia',
  'new zealand':                  'New Zealand',
  'dr congo':                     'DR Congo',
  'democratic republic of congo': 'DR Congo',
  'congo dr':                     'DR Congo',
  'congo, the democratic republic of the': 'DR Congo',
  'curacao':                      'Curaçao',
};

function espnNorm(name: string): string {
  if (!name) return '';
  return ESPN_TEAM_MAP[name.toLowerCase().trim()] || name;
}

function matchGameToESPN(
  espnHome: string,
  espnAway: string,
  gs: GameState
): { id: string | number; home: string; away: string } | null {
  const h = espnNorm(espnHome);
  const a = espnNorm(espnAway);
  const all: { id: string | number; home: string; away: string }[] = [
    ...GROUP_GAMES,
    ...gs.koGames,
  ];
  return (
    all.find(
      (g) =>
        g.home.toLowerCase() === h.toLowerCase() &&
        g.away.toLowerCase() === a.toLowerCase()
    ) ||
    all.find(
      (g) =>
        g.home.toLowerCase() === a.toLowerCase() &&
        g.away.toLowerCase() === h.toLowerCase()
    ) ||
    null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminCode, setAdminCode] = useState('');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState('');
  const [message, setMessage] = useState('');
  const [espnStatus, setEspnStatus] = useState('');
  const [fetching, setFetching] = useState(false);

  // Inline result editing state: { [gameId]: { h: string, a: string, ph: string, pa: string } }
  const [resultInputs, setResultInputs] = useState<
    Record<string, { h: string; a: string; ph: string; pa: string }>
  >({});

  // Load from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('daily_admin_code');
    if (stored) {
      setAdminCode(stored);
      setAuthenticated(true);
    }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/state');
      if (res.ok) {
        const data = await res.json();
        setGameState(data);
        setGameName(data.gameName || '');
        // Populate result inputs from existing results
        setResultInputs((prev) => {
          const next = { ...prev };
          for (const [gid, r] of Object.entries(data.results as Record<string, { h: number; a: number; ph?: number | null; pa?: number | null }>)) {
            if (!next[gid]) {
              next[gid] = {
                h: String(r.h),
                a: String(r.a),
                ph: r.ph != null ? String(r.ph) : '',
                pa: r.pa != null ? String(r.pa) : '',
              };
            }
          }
          return next;
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (authenticated) fetchState();
  }, [authenticated, fetchState]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/daily/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode: adminCodeInput, action: 'verify' }),
      });
      if (!res.ok) {
        setAuthError('Invalid admin code');
        return;
      }
      sessionStorage.setItem('daily_admin_code', adminCodeInput);
      setAdminCode(adminCodeInput);
      setAuthenticated(true);
    } catch {
      setAuthError('Network error');
    }
  }

  async function callAdmin(body: Record<string, unknown>) {
    const res = await fetch('/api/daily/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCode, ...body }),
    });
    if (res.status === 401) {
      setAuthenticated(false);
      sessionStorage.removeItem('daily_admin_code');
      setAuthError('Invalid admin code — please re-enter');
      throw new Error('Unauthorized');
    }
    return res;
  }

  async function handleSetName() {
    try {
      await callAdmin({ action: 'set_name', name: gameName });
      setMessage('Name saved');
      setTimeout(() => setMessage(''), 2000);
    } catch {}
  }

  async function handleStart() {
    if (!gameState) return;
    if (!confirm(`Start game with ${gameState.users.length} players?`)) return;
    setLoading(true);
    try {
      const res = await callAdmin({ action: 'start' });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? 'Error');
      } else {
        setMessage('Game started!');
        await fetchState();
      }
    } catch {}
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleReset() {
    if (!confirm('Reset ALL game data? This cannot be undone.')) return;
    if (!confirm('Are you really sure? All picks, results and sessions will be deleted.')) return;
    try {
      await callAdmin({ action: 'reset' });
      setMessage('Game reset');
      await fetchState();
    } catch {}
    setTimeout(() => setMessage(''), 3000);
  }

  async function saveResult(gameId: string) {
    const inp = resultInputs[gameId];
    if (!inp) return;
    const h = parseInt(inp.h);
    const a = parseInt(inp.a);
    if (isNaN(h) || isNaN(a)) return;
    const ph = inp.ph !== '' ? parseInt(inp.ph) : null;
    const pa = inp.pa !== '' ? parseInt(inp.pa) : null;

    try {
      const res = await fetch('/api/daily/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode, gameId, homeScore: h, awayScore: a, penHome: ph, penAway: pa }),
      });
      if (res.status === 401) {
        setAuthenticated(false);
        sessionStorage.removeItem('daily_admin_code');
        return;
      }
      if (res.ok) {
        await fetchState();
      }
    } catch {}
  }

  async function deleteResult(gameId: string) {
    try {
      const res = await fetch(`/api/daily/results?adminCode=${encodeURIComponent(adminCode)}&gameId=${encodeURIComponent(gameId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setResultInputs((prev) => {
          const next = { ...prev };
          delete next[gameId];
          return next;
        });
        await fetchState();
      }
    } catch {}
  }

  async function fetchESPN() {
    if (!gameState) return;
    setFetching(true);
    setEspnStatus('Fetching…');
    const todayStr = new Date().toISOString().split('T')[0];
    const datesSet = new Set([todayStr.replace(/-/g, '')]);
    for (const g of [...GROUP_GAMES, ...gameState.koGames]) {
      if (!gameState.results[String(g.id)] && g.date && g.date <= todayStr) {
        datesSet.add(g.date.replace(/-/g, ''));
      }
    }
    const dates = Array.from(datesSet);

    let updated = 0;
    for (const dateStr of dates) {
      try {
        const resp = await fetch(`${ESPN_SCOREBOARD}?dates=${dateStr}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) continue;
        const data = await resp.json();

        for (const ev of (data.events || [])) {
          const comp = ev.competitions?.[0];
          if (!comp?.status?.type?.completed) continue;

          const hc = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === 'home');
          const ac = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === 'away');
          if (!hc || !ac) continue;

          const scoreH = parseInt(hc.score);
          const scoreA = parseInt(ac.score);
          if (isNaN(scoreH) || isNaN(scoreA)) continue;

          const game = matchGameToESPN(
            hc.team?.displayName || hc.team?.name || '',
            ac.team?.displayName || ac.team?.name || '',
            gameState
          );
          if (!game) continue;

          const gid = String(game.id);
          const cur = gameState.results[gid];

          let ph: number | null = null;
          let pa: number | null = null;

          // Preserve manually-entered pens if 90-min score is unchanged
          if (cur && cur.h === scoreH && cur.a === scoreA && cur.ph != null) {
            ph = cur.ph;
            pa = cur.pa ?? null;
          }

          // Try to parse penalty result from ESPN notes
          if (scoreH === scoreA) {
            for (const note of (comp.notes || [])) {
              const txt = note.headline || note.text || '';
              const m = txt.match(/(\S[\w\s]*?)\s+wins\s+(\d+)[–\-](\d+)\s+on\s+pen/i);
              if (m) {
                const winner = espnNorm(m[1].trim());
                const pA = parseInt(m[2]);
                const pB = parseInt(m[3]);
                const winHome = game.home.toLowerCase() === winner.toLowerCase();
                ph = winHome ? pA : pB;
                pa = winHome ? pB : pA;
                break;
              }
            }
          }

          // Only save if changed
          const changed =
            !cur ||
            cur.h !== scoreH ||
            cur.a !== scoreA ||
            cur.ph !== ph ||
            cur.pa !== pa;

          if (changed) {
            await fetch('/api/daily/results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                adminCode,
                gameId: gid,
                homeScore: scoreH,
                awayScore: scoreA,
                penHome: ph,
                penAway: pa,
              }),
            });
            updated++;
          }
        }
      } catch (e) {
        console.warn('ESPN fetch error:', e);
      }
    }

    setEspnStatus(`Last fetched: ${new Date().toLocaleTimeString()} — ${updated} update${updated !== 1 ? 's' : ''}`);
    if (updated > 0) await fetchState();
    setFetching(false);
  }

  // ─── Auth gate ─────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto py-20">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin</h1>
        <form onSubmit={handleAuth} className="space-y-3">
          <input
            type="password"
            placeholder="Admin code"
            value={adminCodeInput}
            onChange={(e) => setAdminCodeInput(e.target.value)}
            className="w-full bg-pitch-light border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 placeholder:text-slate-600"
            autoFocus
          />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 transition-colors rounded-lg py-3 font-semibold"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 animate-pulse">Loading…</div>
      </div>
    );
  }

  const activeSessions = getActiveSessions(gameState.koGames);
  const koGameIds = new Set(gameState.koGames.map((g) => g.id));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <div className="flex items-center gap-3">
          {message && <span className="text-green-400 text-sm">{message}</span>}
          <button
            onClick={fetchState}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('daily_admin_code');
              setAuthenticated(false);
            }}
            className="text-xs text-red-600 hover:text-red-400"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Setup ── */}
      <section className="bg-pitch-light border border-white/10 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white text-lg">Setup</h2>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Game name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onBlur={handleSetName}
              className="flex-1 bg-pitch-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
            <button
              onClick={handleSetName}
              className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm text-white"
            >
              Save
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-400 mb-2">
            Registered players ({gameState.users.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {gameState.users.length === 0 ? (
              <span className="text-slate-600 text-sm">No players yet</span>
            ) : (
              gameState.users.map((u) => (
                <span
                  key={u.id}
                  className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-sm text-slate-300"
                >
                  {u.name}
                </span>
              ))
            )}
          </div>
        </div>

        {!gameState.started ? (
          <button
            onClick={handleStart}
            disabled={loading || gameState.users.length === 0}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg font-semibold"
          >
            {loading ? 'Starting…' : 'Start Game'}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <span>✓</span>
            <span>Game is running</span>
          </div>
        )}
      </section>

      {/* ── ESPN Auto-Fetch ── */}
      {gameState.started && (
        <section className="bg-pitch-light border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-white text-lg">ESPN Auto-Fetch</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchESPN}
              disabled={fetching}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 transition-colors rounded-lg text-sm font-medium"
            >
              {fetching ? 'Fetching…' : 'Fetch Now'}
            </button>
            {espnStatus && (
              <span className="text-slate-400 text-xs">{espnStatus}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Fetches completed results from the ESPN scoreboard API and saves them automatically.
          </p>
        </section>
      )}

      {/* ── Results Entry ── */}
      {gameState.started && (
        <section className="space-y-3">
          <h2 className="font-semibold text-white text-lg">Results Entry</h2>
          {activeSessions.map((sess) => {
            const sessGroupGames = GROUP_GAMES.filter((g) => sess.dates.includes(g.date));
            const sessKOGames = gameState.koGames.filter((g) => sess.dates.includes(g.date));
            const allGames = [
              ...sessGroupGames.map((g) => ({ ...g, id: String(g.id), isKO: false })),
              ...sessKOGames.map((g) => ({ ...g, isKO: true })),
            ];
            if (allGames.length === 0) return null;

            return (
              <details key={sess.key} className="bg-pitch-light border border-white/10 rounded-xl overflow-hidden">
                <summary className="px-5 py-3 cursor-pointer text-slate-300 font-medium hover:text-white">
                  {sess.label} ({allGames.length} games)
                </summary>
                <div className="px-5 pb-4 space-y-2">
                  {allGames.map((game) => {
                    const gid = game.id;
                    const existing = gameState.results[gid];
                    const inp = resultInputs[gid] ?? { h: '', a: '', ph: '', pa: '' };
                    const isDraw =
                      inp.h !== '' && inp.a !== '' && parseInt(inp.h) === parseInt(inp.a);
                    const hasResult = !!existing;

                    return (
                      <div key={gid} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-400 w-5">{hasResult ? '✓' : '○'}</span>
                        <span className="text-sm text-slate-300 flex-1 min-w-[180px]">
                          {FLAGS[game.home] ?? ''} {game.home} vs {FLAGS[game.away] ?? ''} {game.away}
                          {game.isKO && (
                            <span className="ml-1 text-xs text-yellow-500">KO</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            placeholder="H"
                            value={inp.h}
                            onChange={(e) =>
                              setResultInputs((prev) => ({
                                ...prev,
                                [gid]: { ...inp, h: e.target.value },
                              }))
                            }
                            onBlur={() => saveResult(gid)}
                            className="w-12 bg-pitch-dark border border-white/20 rounded px-1 py-1 text-white text-sm text-center focus:outline-none focus:border-green-500"
                          />
                          <span className="text-slate-600">–</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            placeholder="A"
                            value={inp.a}
                            onChange={(e) =>
                              setResultInputs((prev) => ({
                                ...prev,
                                [gid]: { ...inp, a: e.target.value },
                              }))
                            }
                            onBlur={() => saveResult(gid)}
                            className="w-12 bg-pitch-dark border border-white/20 rounded px-1 py-1 text-white text-sm text-center focus:outline-none focus:border-green-500"
                          />
                        </div>

                        {/* KO: penalty inputs when draw */}
                        {game.isKO && isDraw && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">pens:</span>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              placeholder="PH"
                              value={inp.ph}
                              onChange={(e) =>
                                setResultInputs((prev) => ({
                                  ...prev,
                                  [gid]: { ...inp, ph: e.target.value },
                                }))
                              }
                              onBlur={() => saveResult(gid)}
                              className="w-12 bg-pitch-dark border border-white/20 rounded px-1 py-1 text-white text-sm text-center focus:outline-none focus:border-green-500"
                            />
                            <span className="text-slate-600">–</span>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              placeholder="PA"
                              value={inp.pa}
                              onChange={(e) =>
                                setResultInputs((prev) => ({
                                  ...prev,
                                  [gid]: { ...inp, pa: e.target.value },
                                }))
                              }
                              onBlur={() => saveResult(gid)}
                              className="w-12 bg-pitch-dark border border-white/20 rounded px-1 py-1 text-white text-sm text-center focus:outline-none focus:border-green-500"
                            />
                          </div>
                        )}

                        {hasResult && (
                          <button
                            onClick={() => deleteResult(gid)}
                            className="text-red-700 hover:text-red-500 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </section>
      )}

      {/* ── KO Bracket Status ── */}
      {gameState.started && (
        <section className="space-y-3">
          <h2 className="font-semibold text-white text-lg">KO Bracket</h2>
          <div className="bg-pitch-light border border-white/10 rounded-xl p-5">
            {KO_BRACKET_TEMPLATE.map((tmpl) => {
              const ko = gameState.koGames.find((g) => g.id === tmpl.id);
              const result = ko ? gameState.results[ko.id] : null;
              return (
                <div key={tmpl.id} className="flex items-center gap-2 py-1 border-b border-white/5 text-sm">
                  <span className={ko ? 'text-green-400' : 'text-slate-600'}>{ko ? '✓' : '○'}</span>
                  <span className="text-slate-500 w-16 text-xs">{tmpl.round.replace('Round of ', 'R')}</span>
                  {ko ? (
                    <>
                      <span className="text-slate-300">
                        {FLAGS[ko.home] ?? ''} {ko.home}
                      </span>
                      <span className="text-slate-600">vs</span>
                      <span className="text-slate-300">
                        {FLAGS[ko.away] ?? ''} {ko.away}
                      </span>
                      <span className="text-slate-500 text-xs ml-auto">{ko.date}</span>
                      {result && (
                        <span className="text-white font-mono text-xs">
                          {result.h}-{result.a}
                          {result.ph != null ? ` (${result.ph}-${result.pa} pens)` : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-600 text-xs">
                      {tmpl.homeSlot} vs {tmpl.awaySlot} — {tmpl.date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Danger Zone ── */}
      <section className="bg-red-950/20 border border-red-900/30 rounded-xl p-5">
        <h2 className="font-semibold text-red-400 text-lg mb-3">Danger Zone</h2>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 transition-colors rounded-lg text-sm font-medium text-white"
        >
          Reset Game
        </button>
        <p className="text-xs text-slate-600 mt-2">
          Deletes all picks, results, sessions, and users. Tables are preserved.
        </p>
      </section>
    </div>
  );
}
