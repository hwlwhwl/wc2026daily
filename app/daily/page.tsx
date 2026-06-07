'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RegisteredUser {
  id: string;
  name: string;
  photo: string;
}

function avatarColor(name: string): string {
  const COLORS = [
    '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
    '#db2777', '#0891b2', '#65a30d', '#c2410c', '#4f46e5', '#059669', '#b45309',
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

function PlayerAvatar({ user, size = 40 }: { user: RegisteredUser; size?: number }) {
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

export default function DailyHomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wc2026_daily_user');
    if (stored) {
      router.push('/daily/pick');
      return;
    }
    setChecking(false);
    // Load registered players
    fetch('/api/daily/users')
      .then((r) => r.json())
      .then((data: RegisteredUser[]) => {
        setRegisteredUsers(Array.isArray(data) ? data : []);
        setUsersLoaded(true);
      })
      .catch(() => setUsersLoaded(true));
  }, [router]);

  function handleSelectUser(user: RegisteredUser) {
    localStorage.setItem('wc2026_daily_user', JSON.stringify({ id: user.id, name: user.name }));
    router.push('/daily/pick');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // If name matches an existing user exactly (case-insensitive), use that profile
    const existing = registeredUsers.find(
      (u) => u.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleSelectUser(existing);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/daily/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to register');
        setLoading(false);
        return;
      }
      const data = await res.json();
      localStorage.setItem('wc2026_daily_user', JSON.stringify({ id: data.id, name: data.name }));
      router.push('/daily/pick');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 animate-pulse">Loading…</div>
      </div>
    );
  }

  const hasRegistered = usersLoaded && registeredUsers.length > 0;

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">⚽</div>
        <h1 className="text-3xl font-bold text-white mb-2">WC2026 Daily Pick'em</h1>
        <p className="text-slate-400 text-sm">
          Pick scores each day — fewest points at the end wins.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-pitch-light border border-white/10 rounded-xl p-5 mb-8 space-y-3 text-sm text-slate-300">
        <h2 className="font-semibold text-white text-base">How it works</h2>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="text-green-400 mt-0.5">1.</span>
            <span>Each day you pick scores for all games on that date.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-400 mt-0.5">2.</span>
            <span>
              Players pick one at a time in{' '}
              <strong className="text-white">sequential order</strong>. Yesterday's worst performer
              picks first — so bad luck becomes an advantage.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-400 mt-0.5">3.</span>
            <span>
              Scoring: <strong className="text-white">3 pts</strong> exact score,{' '}
              <strong className="text-white">1 pt</strong> correct result, 0 for miss. Fewest total
              points wins.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-400 mt-0.5">4.</span>
            <span>
              Knockout games: if you pick a draw, add penalty score predictions for a decimal bonus.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-400 mt-0.5">5.</span>
            <span>
              The <strong className="text-white">🤖 1:1 Bot</strong> always picks 1–1 — it's on
              the leaderboard as a benchmark but isn't ranked.
            </span>
          </li>
        </ul>
      </div>

      {/* Profile picker / login */}
      <div className="bg-pitch-light border border-white/10 rounded-xl p-6 space-y-5">
        {/* Existing players */}
        {hasRegistered && !showNewForm && (
          <>
            <div>
              <h2 className="font-semibold text-white mb-3">Who's playing?</h2>
              <div className="flex flex-col gap-2">
                {registeredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-pitch-dark border border-white/10 hover:border-green-500/50 hover:bg-white/5 rounded-xl transition-colors text-left group"
                  >
                    <PlayerAvatar user={u} size={36} />
                    <span className="font-medium text-white group-hover:text-green-400 transition-colors">
                      {u.name}
                    </span>
                    <span className="ml-auto text-slate-600 text-sm group-hover:text-green-500">→</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full py-2.5 border border-dashed border-white/20 hover:border-green-500/50 rounded-xl text-slate-400 hover:text-green-400 text-sm transition-colors"
              >
                + I'm a new player
              </button>
            </div>
          </>
        )}

        {/* New player form (shown when no existing users OR "new player" clicked) */}
        {(!hasRegistered || showNewForm) && (
          <>
            {showNewForm && (
              <button
                onClick={() => setShowNewForm(false)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                ← Back to profiles
              </button>
            )}
            <h2 className="font-semibold text-white">
              {hasRegistered ? 'New player' : 'Enter your name to join'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-pitch-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 placeholder:text-slate-600"
                autoFocus
                required
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg py-3 font-semibold"
              >
                {loading ? 'Joining…' : 'Join the game →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
