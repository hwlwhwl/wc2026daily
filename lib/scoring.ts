export type Outcome = 'home' | 'draw' | 'away';

export function getOutcome(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

export function calcPoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  if (predHome === actualHome && predAway === actualAway) return 3;
  if (getOutcome(predHome, predAway) === getOutcome(actualHome, actualAway)) return 1;
  return 0;
}

export interface UserStats {
  userId: string;
  name: string;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
  gamesScored: number;
}
