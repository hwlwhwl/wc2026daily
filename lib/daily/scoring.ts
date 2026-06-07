import { GroupGame, KOGame, KOTemplate } from './games';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ResultMap = Record<string, { h: number; a: number; ph?: number | null; pa?: number | null }>;

export type PickEntry = { h: number; a: number; ph?: number | null; pa?: number | null };

export type PickMap = Record<string, PickEntry>;

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

export function calcPoints(predH: number, predA: number, actH: number, actA: number): number {
  if (predH === actH && predA === actA) return 3;
  const pOut = predH > predA ? 'H' : predH < predA ? 'A' : 'D';
  const aOut = actH  > actA  ? 'H' : actH  < actA  ? 'A' : 'D';
  return pOut === aOut ? 1 : 0;
}

export function calcPointsKO(
  pick: PickEntry,
  res: { h: number; a: number; ph?: number | null; pa?: number | null }
): number {
  let pts = calcPoints(pick.h, pick.a, res.h, res.a);

  // Penalty bonus: actual went to pens AND player predicted a draw with penalty picks
  if (pts > 0 && res.ph != null && pick.h === pick.a && pick.ph != null) {
    pts += Math.abs((pick.ph ?? 0) - (pick.pa ?? 0)) / 10;
  }

  return pts;
}

export function scoreGamePick(
  pick: PickEntry,
  res: { h: number; a: number; ph?: number | null; pa?: number | null },
  isKO: boolean
): number {
  if (isKO) return calcPointsKO(pick, res);
  return calcPoints(pick.h, pick.a, res.h, res.a);
}

export function fmtPts(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Standings
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamStanding {
  name: string;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  played: number;
  group: string;
}

export function getGroupStandings(
  grp: string,
  groupGames: GroupGame[],
  results: ResultMap
): TeamStanding[] {
  const grpGames = groupGames.filter((g) => g.g === grp);
  const teams: Record<string, TeamStanding> = {};

  for (const g of grpGames) {
    if (!teams[g.home]) teams[g.home] = { name: g.home, pts: 0, gf: 0, ga: 0, gd: 0, played: 0, group: grp };
    if (!teams[g.away]) teams[g.away] = { name: g.away, pts: 0, gf: 0, ga: 0, gd: 0, played: 0, group: grp };
  }

  for (const g of grpGames) {
    const r = results[String(g.id)];
    if (!r) continue;
    const ht = teams[g.home];
    const at = teams[g.away];
    ht.played++;
    at.played++;
    ht.gf += r.h;
    ht.ga += r.a;
    ht.gd = ht.gf - ht.ga;
    at.gf += r.a;
    at.ga += r.h;
    at.gd = at.gf - at.ga;
    if (r.h > r.a)      { ht.pts += 3; }
    else if (r.h < r.a) { at.pts += 3; }
    else                { ht.pts += 1; at.pts += 1; }
  }

  return Object.values(teams).sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)
  );
}

export function getBest3rdPlaceTeams(groupGames: GroupGame[], results: ResultMap): TeamStanding[] {
  const thirds: TeamStanding[] = [];
  for (const grp of 'ABCDEFGHIJKL'.split('')) {
    const st = getGroupStandings(grp, groupGames, results);
    if (st.length >= 3) thirds.push({ ...st[2], group: grp });
  }
  thirds.sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)
  );
  return thirds.slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bracket resolution
// ─────────────────────────────────────────────────────────────────────────────

export function resolveKOSlot(
  slot: string,
  groupGames: GroupGame[],
  results: ResultMap,
  koGames: KOGame[]
): string | null {
  // Group winner/runner-up: '1A', '2L', etc.
  const gpM = slot.match(/^([12])([A-L])$/);
  if (gpM) {
    const pos = parseInt(gpM[1]) - 1;
    const grp = gpM[2];
    const grpGames = groupGames.filter((g) => g.g === grp);
    if (!grpGames.every((g) => results[String(g.id)])) return null;
    const st = getGroupStandings(grp, groupGames, results);
    return st[pos] ? st[pos].name : null;
  }

  // Best 3rd-place teams: 'T1'–'T8' — need all 12 groups done
  const tM = slot.match(/^T([1-8])$/);
  if (tM) {
    const idx = parseInt(tM[1]) - 1;
    const allDone = 'ABCDEFGHIJKL'.split('').every((g) =>
      groupGames.filter((gg) => gg.g === g).every((gg) => results[String(gg.id)])
    );
    if (!allDone) return null;
    const best8 = getBest3rdPlaceTeams(groupGames, results);
    return best8[idx] ? best8[idx].name : null;
  }

  // Winner of a KO game: 'W(r32-01)', 'W(sf-1)', etc.
  const wM = slot.match(/^W\(([^)]+)\)$/);
  if (wM) {
    const gid = wM[1];
    const ko = koGames.find((g) => g.id === gid);
    if (!ko) return null;
    const res = results[ko.id];
    if (!res) return null;
    if (res.h > res.a) return ko.home;
    if (res.a > res.h) return ko.away;
    // Draw: pen result must be present AND decisive (ph !== pa)
    if (res.ph != null && res.pa != null && res.ph !== res.pa) return res.ph > res.pa ? ko.home : ko.away;
    return null;
  }

  // Loser of a KO game: 'L(sf-1)', 'L(sf-2)' — used for 3rd place
  const lM = slot.match(/^L\(([^)]+)\)$/);
  if (lM) {
    const gid = lM[1];
    const ko = koGames.find((g) => g.id === gid);
    if (!ko) return null;
    const res = results[ko.id];
    if (!res) return null;
    if (res.h > res.a) return ko.away;
    if (res.a > res.h) return ko.home;
    // Draw: pen result must be present AND decisive (ph !== pa)
    if (res.ph != null && res.pa != null && res.ph !== res.pa) return res.ph > res.pa ? ko.away : ko.home;
    return null;
  }

  return null;
}

/**
 * Iterates the KO bracket template, resolves both slots for each entry,
 * and returns ONLY the newly resolved games (those not already in `existing`).
 */
export function syncKOBracket(
  groupGames: GroupGame[],
  results: ResultMap,
  existing: KOGame[],
  templates: KOTemplate[]
): KOGame[] {
  const newGames: KOGame[] = [];

  for (const tmpl of templates) {
    const alreadyExists = existing.find((g) => g.id === tmpl.id);
    if (alreadyExists) continue;

    const home = resolveKOSlot(tmpl.homeSlot, groupGames, results, existing);
    const away = resolveKOSlot(tmpl.awaySlot, groupGames, results, existing);

    if (home && away) {
      newGames.push({ id: tmpl.id, round: tmpl.round, home, away, date: tmpl.date });
    }
  }

  return newGames;
}
