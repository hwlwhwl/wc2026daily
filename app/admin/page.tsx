'use client';

import { useState, useEffect } from 'react';
import { GAMES, GAMES_BY_GROUP, TEAM_FLAGS, GROUPS } from '@/lib/games-data';

interface Result {
  game_id: number;
  home_score: number;
  away_score: number;
}

const GROUP_KEYS = Object.keys(GROUPS);

export default function AdminPage() {
  const [results, setResults] = useState<Record<number, Result>>({});
  const [pendingScores, setPendingScores] = useState<Record<number, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('A');

  useEffect(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((data: Result[]) => {
        const map: Record<number, Result> = {};
        for (const r of data) map[r.game_id] = r;
        setResults(map);
      });
  }, []);

  function setPending(gameId: number, side: 'home' | 'away', val: string) {
    setPendingScores((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], home: prev[gameId]?.home ?? '', away: prev[gameId]?.away ?? '', [side]: val },
    }));
  }

  async function saveResult(gameId: number) {
    const pending = pendingScores[gameId];
    if (!pending || pending.home === '' || pending.away === '') {
      alert('Enter both scores');
      return;
    }
    setSaving(gameId);
    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          homeScore: Number(pending.home),
          awayScore: Number(pending.away),
        }),
      });
      setResults((prev) => ({
        ...prev,
        [gameId]: { game_id: gameId, home_score: Number(pending.home), away_score: Number(pending.away) },
      }));
      setPendingScores((prev) => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    } catch {
      alert('Save failed');
    }
    setSaving(null);
  }

  async function deleteResult(gameId: number) {
    if (!confirm('Remove this result?')) return;
    setDeleting(gameId);
    try {
      await fetch(`/api/results?gameId=${gameId}`, { method: 'DELETE' });
      setResults((prev) => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    } catch {
      alert('Delete failed');
    }
    setDeleting(null);
  }

  const completedCount = Object.keys(results).length;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin — Enter Results</h1>
        <p className="text-slate-500 text-sm mt-1">
          {completedCount} of {GAMES.length} results entered
        </p>
      </div>

      <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-3 mb-6 text-sm text-amber-300">
        ⚠️ This page has no password protection. Share the link only with trusted admins.
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {GROUP_KEYS.map((g) => {
          const gGames = GAMES_BY_GROUP[g];
          const doneCount = gGames.filter((gg) => results[gg.id]).length;
          return (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                g === selectedGroup
                  ? 'bg-green-600 text-white'
                  : doneCount === gGames.length
                  ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                  : 'bg-pitch-light text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {doneCount === gGames.length ? '✓ ' : ''}{g}
              {doneCount > 0 && doneCount < gGames.length && (
                <span className="ml-1 text-xs opacity-60">{doneCount}/{gGames.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Games in selected group */}
      <div className="space-y-3">
        {GAMES_BY_GROUP[selectedGroup]?.map((game) => {
          const result = results[game.id];
          const pending = pendingScores[game.id];
          const editHome = pending?.home ?? (result ? String(result.home_score) : '');
          const editAway = pending?.away ?? (result ? String(result.away_score) : '');
          const isDirty = pending !== undefined;

          return (
            <div
              key={game.id}
              className={`bg-pitch-dark border rounded-xl p-4 ${
                result ? 'border-green-700/40' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-500">
                  MD{game.matchday} · {game.date}
                </span>
                {result && (
                  <span className="text-xs bg-green-900/40 text-green-400 border border-green-700/40 px-2 py-0.5 rounded ml-auto">
                    Result entered
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 text-right font-medium text-white text-sm">
                  {TEAM_FLAGS[game.home]} {game.home}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={editHome}
                    onChange={(e) => setPending(game.id, 'home', e.target.value)}
                    className="w-14 text-center bg-pitch-mid border border-white/20 rounded text-white text-lg font-bold py-1.5 focus:outline-none focus:border-green-500"
                    placeholder="–"
                  />
                  <span className="text-slate-600 font-bold">–</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={editAway}
                    onChange={(e) => setPending(game.id, 'away', e.target.value)}
                    className="w-14 text-center bg-pitch-mid border border-white/20 rounded text-white text-lg font-bold py-1.5 focus:outline-none focus:border-green-500"
                    placeholder="–"
                  />
                </div>

                <div className="flex-1 text-left font-medium text-white text-sm">
                  {game.away} {TEAM_FLAGS[game.away]}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                {result && !isDirty && (
                  <button
                    onClick={() => deleteResult(game.id)}
                    disabled={deleting === game.id}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 px-3 py-1.5 rounded bg-red-900/20 border border-red-800/30 transition-colors"
                  >
                    {deleting === game.id ? 'Removing…' : 'Remove result'}
                  </button>
                )}
                <button
                  onClick={() => saveResult(game.id)}
                  disabled={saving === game.id || (!isDirty && !!result)}
                  className="text-xs px-4 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 transition-colors font-medium"
                >
                  {saving === game.id ? 'Saving…' : result && !isDirty ? 'Saved ✓' : 'Save result'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
