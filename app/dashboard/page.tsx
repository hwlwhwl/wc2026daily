import { TEAM_FLAGS } from '@/lib/games-data';

interface LeaderboardEntry {
  userId: string;
  name: string;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
  gamesScored: number;
  predCount: number;
}

interface CompletedGame {
  id: number;
  group: string;
  matchday: number;
  home: string;
  away: string;
  date: string;
  actualHome: number;
  actualAway: number;
  predictions: Array<{
    name: string;
    homeScore: number;
    awayScore: number;
    points: number;
  }>;
}

interface DashboardData {
  leaderboard: LeaderboardEntry[];
  completedGames: CompletedGame[];
  stats: { totalCompleted: number; totalGames: number };
}

async function getDashboardData(): Promise<DashboardData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/dashboard`, { cache: 'no-store' });
  return res.json();
}

const RANK_COLORS = ['text-gold-light', 'text-slate-300', 'text-amber-600'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

function ResultBadge({ pts }: { pts: number }) {
  if (pts === 3) return <span className="text-xs bg-green-900/50 text-green-400 border border-green-700/50 px-1.5 py-0.5 rounded">Exact</span>;
  if (pts === 1) return <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/40 px-1.5 py-0.5 rounded">Result ✓</span>;
  return <span className="text-xs bg-white/5 text-slate-500 border border-white/10 px-1.5 py-0.5 rounded">Wrong</span>;
}

export default async function DashboardPage() {
  const { leaderboard, completedGames, stats } = await getDashboardData();

  const maxPoints = leaderboard[0]?.totalPoints ?? 0;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Leaderboard</h1>
        <p className="text-slate-500 text-sm">
          {stats.totalCompleted} of {stats.totalGames} group stage games completed
        </p>
      </div>

      {/* Tournament progress bar */}
      <div className="mb-8 bg-pitch-light border border-white/10 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Tournament progress</span>
          <span>{stats.totalCompleted}/{stats.totalGames} games</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(stats.totalCompleted / stats.totalGames) * 100}%` }}
          />
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          No predictions yet. <a href="/predict" className="text-green-400 hover:underline">Be the first!</a>
        </div>
      ) : (
        <div className="bg-pitch-light border border-white/10 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-white/10">
                <th className="px-4 py-3 text-left w-8">#</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Exact</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Result ✓</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Scored</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Predicted</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr
                  key={entry.userId}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className={i < 3 ? RANK_COLORS[i] : 'text-slate-500'}>
                      {i < 3 ? RANK_ICONS[i] : i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{entry.name}</div>
                    {/* Points bar */}
                    {maxPoints > 0 && (
                      <div className="mt-1 h-1 bg-white/10 rounded-full w-32 overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(entry.totalPoints / maxPoints) * 100}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-gold-light text-base">
                      {entry.totalPoints}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-green-400">
                    {entry.exactScores}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-yellow-400">
                    {entry.correctResults}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-slate-400">
                    {entry.gamesScored}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-slate-500">
                    {entry.predCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Completed games breakdown */}
      {completedGames.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Results & Predictions</h2>
          <div className="space-y-4">
            {completedGames.map((game) => (
              <div
                key={game.id}
                className="bg-pitch-light border border-white/10 rounded-xl overflow-hidden"
              >
                {/* Game header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-pitch-dark/50">
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                    Group {game.group} · MD{game.matchday}
                  </span>
                  <div className="flex-1 flex items-center justify-center gap-3 font-semibold">
                    <span>{TEAM_FLAGS[game.home]} {game.home}</span>
                    <span className="text-xl font-bold text-gold-light tabular-nums">
                      {game.actualHome} – {game.actualAway}
                    </span>
                    <span>{game.away} {TEAM_FLAGS[game.away]}</span>
                  </div>
                  <span className="text-xs text-slate-500">{game.date}</span>
                </div>

                {/* Predictions */}
                {game.predictions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">No predictions submitted</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {game.predictions
                      .sort((a, b) => b.points - a.points)
                      .map((pred, pi) => (
                        <div
                          key={pi}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm"
                        >
                          <span className="text-slate-300 w-32 truncate font-medium">{pred.name}</span>
                          <span className="text-slate-400 font-mono tabular-nums">
                            {pred.homeScore} – {pred.awayScore}
                          </span>
                          <div className="ml-auto flex items-center gap-2">
                            <ResultBadge pts={pred.points} />
                            <span className={`font-bold tabular-nums ${
                              pred.points === 3 ? 'text-green-400' :
                              pred.points === 1 ? 'text-yellow-400' : 'text-slate-600'
                            }`}>
                              +{pred.points}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {completedGames.length === 0 && leaderboard.length > 0 && (
        <div className="text-center py-8 text-slate-500 bg-pitch-light border border-white/10 rounded-xl">
          <div className="text-3xl mb-2">⏳</div>
          Results will appear here once games have been played and an admin enters the scores.
        </div>
      )}
    </main>
  );
}
