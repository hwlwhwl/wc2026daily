import Link from 'next/link';
import { GAMES, GROUPS } from '@/lib/games-data';

export default function Home() {
  const groupKeys = Object.keys(GROUPS);

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl font-bold mb-3 text-white">
          World Cup 2026 Predictor
        </h1>
        <p className="text-slate-400 text-lg">
          Predict the score of all {GAMES.length} group stage games and compete with friends.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <Link
          href="/predict"
          className="block bg-green-600 hover:bg-green-500 transition-colors rounded-xl p-6 text-center"
        >
          <div className="text-3xl mb-2">📝</div>
          <div className="font-semibold text-lg mb-1">Make My Predictions</div>
          <div className="text-green-200 text-sm">Fill in your scores for all group stage games</div>
        </Link>

        <Link
          href="/dashboard"
          className="block bg-pitch-light hover:bg-white/10 border border-white/10 transition-colors rounded-xl p-6 text-center"
        >
          <div className="text-3xl mb-2">📊</div>
          <div className="font-semibold text-lg mb-1">View Leaderboard</div>
          <div className="text-slate-400 text-sm">See how everyone is doing</div>
        </Link>
      </div>

      <div className="bg-pitch-light border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold mb-4 text-slate-300">How scoring works</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { pts: '3 pts', label: 'Exact score', color: 'text-green-400' },
            { pts: '1 pt', label: 'Correct result', color: 'text-yellow-400' },
            { pts: '0 pts', label: 'Wrong result', color: 'text-slate-500' },
          ].map((row) => (
            <div key={row.pts} className="bg-pitch-dark rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${row.color}`}>{row.pts}</div>
              <div className="text-sm text-slate-400 mt-1">{row.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 bg-pitch-light border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold mb-4 text-slate-300">{groupKeys.length} Groups · {GAMES.length} Games</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {groupKeys.map((g) => (
            <div key={g} className="bg-pitch-dark rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Group {g}</div>
              {GROUPS[g].map((team) => (
                <div key={team} className="text-xs text-slate-300 truncate">{team}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
