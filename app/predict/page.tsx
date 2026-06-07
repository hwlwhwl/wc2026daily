'use client';

import { useState, useEffect, useCallback } from 'react';
import { GAMES_BY_GROUP, TEAM_FLAGS, GROUPS } from '@/lib/games-data';

const GROUP_KEYS = Object.keys(GROUPS);
const TOTAL_GAMES = Object.values(GAMES_BY_GROUP).flat().length;

type Scores = Record<number, { home: string; away: string }>;

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(0, Number(value || 0) - 1)))}
          className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-sm transition-colors"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          max={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 text-center bg-pitch-dark border border-white/20 rounded text-white text-lg font-bold py-1 focus:outline-none focus:border-green-500"
          placeholder="–"
        />
        <button
          type="button"
          onClick={() => onChange(String(Number(value || 0) + 1))}
          className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-sm transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function PredictPage() {
  const [step, setStep] = useState<'login' | 'predict' | 'done'>('login');
  const [name, setName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [groupIndex, setGroupIndex] = useState(0);
  const [scores, setScores] = useState<Scores>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wc2026_user');
    if (stored) {
      const { id, name: n } = JSON.parse(stored);
      setUserId(id);
      setName(n);
      setStep('predict');
      loadExistingPredictions(id);
    }
  }, []);

  async function loadExistingPredictions(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/predictions?userId=${id}`);
      const data = await res.json();
      const loaded: Scores = {};
      for (const row of data) {
        if (row.home_score != null) {
          loaded[row.game_id] = {
            home: String(row.home_score),
            away: String(row.away_score),
          };
        }
      }
      setScores(loaded);
    } catch {}
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      localStorage.setItem('wc2026_user', JSON.stringify({ id: data.id, name: data.name }));
      setUserId(data.id);
      setStep('predict');
    } catch {
      alert('Error creating profile. Please try again.');
    }
    setLoading(false);
  }

  function setScore(gameId: number, side: 'home' | 'away', value: string) {
    setScores((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], home: prev[gameId]?.home ?? '', away: prev[gameId]?.away ?? '', [side]: value },
    }));
    setSaveStatus('idle');
  }

  const currentGroup = GROUP_KEYS[groupIndex];
  const currentGames = GAMES_BY_GROUP[currentGroup] ?? [];

  const predictedCount = Object.values(scores).filter(
    (s) => s.home !== '' && s.away !== ''
  ).length;

  const currentGroupComplete = currentGames.every(
    (g) => scores[g.id]?.home !== undefined && scores[g.id]?.home !== '' &&
            scores[g.id]?.away !== undefined && scores[g.id]?.away !== ''
  );

  const saveCurrentGroup = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const predictions = currentGames
        .filter((g) => scores[g.id]?.home !== '' && scores[g.id]?.away !== '')
        .map((g) => ({
          gameId: g.id,
          homeScore: Number(scores[g.id].home),
          awayScore: Number(scores[g.id].away),
        }));

      await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, predictions }),
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
    setSaving(false);
  }, [userId, currentGames, scores]);

  async function handleNextGroup() {
    await saveCurrentGroup();
    if (groupIndex < GROUP_KEYS.length - 1) {
      setGroupIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setStep('done');
    }
  }

  function handleLogout() {
    if (!confirm('Switch to a different user? Your predictions are saved.')) return;
    localStorage.removeItem('wc2026_user');
    setUserId(null);
    setName('');
    setScores({});
    setStep('login');
  }

  if (step === 'login') {
    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📝</div>
          <h1 className="text-3xl font-bold text-white mb-2">Enter your name</h1>
          <p className="text-slate-400">We'll save your predictions as you go.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-pitch-light border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-green-500"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors rounded-xl py-3 font-semibold text-lg"
          >
            {loading ? 'Loading…' : 'Start predicting →'}
          </button>
        </form>
      </main>
    );
  }

  if (step === 'done') {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-3">All done!</h1>
        <p className="text-slate-400 mb-2">
          You predicted {predictedCount} of {TOTAL_GAMES} games.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Come back to update predictions any time before kick-off.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/dashboard"
            className="block bg-green-600 hover:bg-green-500 transition-colors rounded-xl py-3 font-semibold text-lg"
          >
            View leaderboard →
          </a>
          <button
            onClick={() => { setGroupIndex(0); setStep('predict'); }}
            className="block w-full bg-pitch-light hover:bg-white/10 border border-white/10 transition-colors rounded-xl py-3 font-semibold"
          >
            Edit predictions
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-slate-400 text-sm">Predicting as</div>
          <div className="font-semibold text-white">{name}</div>
        </div>
        <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-300">
          Switch user
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>
            Group {groupIndex + 1} of {GROUP_KEYS.length}
          </span>
          <span>{predictedCount}/{TOTAL_GAMES} games predicted</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(predictedCount / TOTAL_GAMES) * 100}%` }}
          />
        </div>
      </div>

      {/* Group navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {GROUP_KEYS.map((g, i) => {
          const gGames = GAMES_BY_GROUP[g];
          const complete = gGames.every(
            (gg) => scores[gg.id]?.home !== undefined && scores[gg.id]?.home !== ''
          );
          return (
            <button
              key={g}
              onClick={() => setGroupIndex(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                i === groupIndex
                  ? 'bg-green-600 text-white'
                  : complete
                  ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                  : 'bg-pitch-light text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {complete && i !== groupIndex ? '✓ ' : ''}
              {g}
            </button>
          );
        })}
      </div>

      {/* Group header */}
      <div className="bg-pitch-light border border-white/10 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-bold text-white">Group {currentGroup}</h2>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-400">
            {currentGames.length} games
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {GROUPS[currentGroup].map((team) => (
            <span key={team} className="text-sm text-slate-300">
              {TEAM_FLAGS[team]} {team}
            </span>
          ))}
        </div>
      </div>

      {/* Games */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading…</div>
      ) : (
        <div className="space-y-3 mb-6">
          {[1, 2, 3].map((matchday) => {
            const mdGames = currentGames.filter((g) => g.matchday === matchday);
            return (
              <div key={matchday}>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 ml-1">
                  Matchday {matchday} — {mdGames[0]?.date}
                  {matchday === 3 ? ' (simultaneous)' : ''}
                </div>
                {mdGames.map((game) => {
                  const s = scores[game.id] ?? { home: '', away: '' };
                  const bothFilled = s.home !== '' && s.away !== '';
                  return (
                    <div
                      key={game.id}
                      className={`bg-pitch-dark border rounded-xl p-4 mb-2 transition-colors ${
                        bothFilled
                          ? 'border-green-700/50'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Home team */}
                        <div className="flex-1 text-right">
                          <div className="font-medium text-white text-sm">
                            {TEAM_FLAGS[game.home]} {game.home}
                          </div>
                        </div>

                        {/* Score inputs */}
                        <div className="flex items-center gap-2">
                          <ScoreInput
                            value={s.home}
                            onChange={(v) => setScore(game.id, 'home', v)}
                            label=""
                          />
                          <span className="text-slate-600 font-bold">–</span>
                          <ScoreInput
                            value={s.away}
                            onChange={(v) => setScore(game.id, 'away', v)}
                            label=""
                          />
                        </div>

                        {/* Away team */}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-white text-sm">
                            {TEAM_FLAGS[game.away]} {game.away}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Save & navigate */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => { setGroupIndex((i) => Math.max(0, i - 1)); window.scrollTo({ top: 0 }); }}
          disabled={groupIndex === 0}
          className="px-4 py-2.5 bg-pitch-light border border-white/10 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="text-green-400 text-sm">Saved ✓</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400 text-sm">Save failed</span>
          )}
          <button
            onClick={handleNextGroup}
            disabled={saving}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 transition-colors rounded-xl font-semibold"
          >
            {saving
              ? 'Saving…'
              : groupIndex === GROUP_KEYS.length - 1
              ? 'Finish →'
              : `Next: Group ${GROUP_KEYS[groupIndex + 1]} →`}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-600 mt-4">
        Predictions are saved when you move between groups.
      </p>
    </main>
  );
}
