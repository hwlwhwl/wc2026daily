import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';
import { GAMES } from '@/lib/games-data';

export async function GET() {
  const db = getDb();

  const users = db.prepare('SELECT id, name FROM users ORDER BY created_at').all() as {
    id: string;
    name: string;
  }[];

  const results = db.prepare('SELECT * FROM results').all() as {
    game_id: number;
    home_score: number;
    away_score: number;
  }[];

  const resultMap = new Map(results.map((r) => [r.game_id, r]));
  const completedGameIds = new Set(results.map((r) => r.game_id));

  const allPredictions = db
    .prepare('SELECT * FROM predictions')
    .all() as {
    user_id: string;
    game_id: number;
    home_score: number;
    away_score: number;
  }[];

  // Build leaderboard
  const leaderboard = users.map((user) => {
    const preds = allPredictions.filter((p) => p.user_id === user.id);
    let totalPoints = 0;
    let exactScores = 0;
    let correctResults = 0;
    let gamesScored = 0;

    for (const pred of preds) {
      const result = resultMap.get(pred.game_id);
      if (!result) continue;
      gamesScored++;
      const pts = calcPoints(pred.home_score, pred.away_score, result.home_score, result.away_score);
      totalPoints += pts;
      if (pts === 3) exactScores++;
      if (pts >= 1) correctResults++;
    }

    const predCount = preds.filter(
      (p) => p.home_score != null && p.away_score != null
    ).length;

    return {
      userId: user.id,
      name: user.name,
      totalPoints,
      exactScores,
      correctResults,
      gamesScored,
      predCount,
    };
  });

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints || b.exactScores - a.exactScores);

  // Build completed game details
  const completedGames = GAMES.filter((g) => completedGameIds.has(g.id)).map((game) => {
    const result = resultMap.get(game.id)!;
    const gamePreds = allPredictions
      .filter((p) => p.game_id === game.id && p.home_score != null)
      .map((p) => {
        const user = users.find((u) => u.id === p.user_id);
        const pts = calcPoints(p.home_score, p.away_score, result.home_score, result.away_score);
        return { name: user?.name ?? 'Unknown', homeScore: p.home_score, awayScore: p.away_score, points: pts };
      });

    return {
      id: game.id,
      group: game.group,
      matchday: game.matchday,
      home: game.home,
      away: game.away,
      date: game.date,
      actualHome: result.home_score,
      actualAway: result.away_score,
      predictions: gamePreds,
    };
  });

  // Aggregate stats
  const totalCompleted = completedGameIds.size;
  const totalGames = GAMES.length;

  return NextResponse.json({
    leaderboard,
    completedGames,
    stats: { totalCompleted, totalGames },
  });
}
