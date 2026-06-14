'use client';

import { useEffect } from 'react';
import { TEAM_DOSSIER, FIFA_RANK, getH2H } from '@/lib/daily/dossiers';
import { FLAGS } from '@/lib/daily/games';

interface Props {
  home: string;
  away: string;
  onClose: () => void;
}

function RankBadge({ rank }: { rank: number }) {
  const color =
    rank <= 5 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
    rank <= 15 ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
    rank <= 30 ? 'bg-slate-500/20 text-slate-300 border-slate-500/40' :
    'bg-white/5 text-slate-500 border-white/10';
  return (
    <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded border ${color}`}>
      #{rank}
    </span>
  );
}

function H2HBar({ label, wins, draws, losses, gf, ga }: {
  label: string; wins: number; draws: number; losses: number; gf: number; ga: number;
}) {
  const total = wins + draws + losses;
  if (total === 0) return null;
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label} ({total} games)</div>
      <div className="flex rounded overflow-hidden h-2 mb-1">
        {wins > 0 && <div style={{ width: `${wPct}%` }} className="bg-green-500" />}
        {draws > 0 && <div style={{ width: `${dPct}%` }} className="bg-slate-500" />}
        {losses > 0 && <div style={{ width: `${lPct}%` }} className="bg-red-500" />}
      </div>
      <div className="flex text-xs gap-3 text-slate-400">
        <span className="text-green-400">{wins}W</span>
        <span className="text-slate-400">{draws}D</span>
        <span className="text-red-400">{losses}L</span>
        <span className="ml-auto">{gf}–{ga}</span>
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: string }) {
  const d = TEAM_DOSSIER[team];
  const rank = FIFA_RANK[team];
  const flag = FLAGS[team] ?? '';

  if (!d) {
    return (
      <div className="flex-1 p-4 text-slate-400 text-sm">
        No profile available for {team}.
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{flag}</span>
          <h3 className="text-lg font-bold text-white">{team}</h3>
          {rank && <RankBadge rank={rank} />}
        </div>
        {d.nickname && (
          <div className="text-xs text-slate-500 italic">{d.nickname}</div>
        )}
        <div className="text-xs text-slate-500 mt-0.5">
          Coach: <span className="text-slate-300">{d.coach}</span>
          {d.recent && <span className="ml-3 text-slate-500">{d.recent}</span>}
        </div>
      </div>

      {/* Style */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
          <span>⚽</span> Style of play
        </div>
        <p className="text-sm text-slate-300">{d.style}</p>
      </div>

      {/* Key Players */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
          <span>★</span> Key players
        </div>
        <div className="space-y-1.5">
          {d.keyPlayers.map((p) => (
            <div key={p.name} className="flex gap-2 text-sm">
              <span className="text-slate-600 font-mono text-xs mt-0.5 w-5 flex-shrink-0">{p.pos}</span>
              <div>
                <span className="font-medium text-white">{p.name}</span>
                <span className="text-slate-500 text-xs"> — {p.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths */}
      <div>
        <div className="text-xs font-semibold text-green-400/80 uppercase tracking-wide mb-1 flex items-center gap-1">
          <span>✓</span> Strengths
        </div>
        <ul className="space-y-0.5">
          {d.strengths.map((s) => (
            <li key={s} className="text-sm text-slate-300 flex gap-1.5">
              <span className="text-green-500 flex-shrink-0">+</span> {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Weaknesses */}
      <div>
        <div className="text-xs font-semibold text-red-400/80 uppercase tracking-wide mb-1 flex items-center gap-1">
          <span>△</span> Weaknesses
        </div>
        <ul className="space-y-0.5">
          {d.weaknesses.map((w) => (
            <li key={w} className="text-sm text-slate-300 flex gap-1.5">
              <span className="text-red-500 flex-shrink-0">−</span> {w}
            </li>
          ))}
        </ul>
      </div>

      {/* Outlook */}
      <div className="bg-white/5 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
          <span>👁</span> Outlook
        </div>
        <p className="text-sm text-slate-200 italic">{d.outlook}</p>
      </div>
    </div>
  );
}

export default function DossierModal({ home, away, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const h2h = getH2H(home, away);
  // When key is reversed, flip perspective for display
  const h2hKey = `${home}|${away}`;
  const isReversed = !(`${home}|${away}` in ({})) && !!h2h;
  void isReversed; // perspective always shown as home vs away via getH2H

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0f1a12] border border-white/15 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="text-base font-bold text-white">
            {FLAGS[home] ?? ''} {home} <span className="text-slate-500 font-normal">vs</span> {FLAGS[away] ?? ''} {away}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none p-1 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal body — scrollable */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* H2H section */}
          {h2h && (
            <div className="mb-5 bg-white/5 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Head to Head ({home} perspective)
              </div>
              {h2h.comp && (
                <H2HBar
                  label="Competitive"
                  wins={h2h.comp.w} draws={h2h.comp.d} losses={h2h.comp.l}
                  gf={h2h.comp.gf} ga={h2h.comp.ga}
                />
              )}
              {h2h.friendly && (
                <H2HBar
                  label="Friendlies"
                  wins={h2h.friendly.w} draws={h2h.friendly.d} losses={h2h.friendly.l}
                  gf={h2h.friendly.gf} ga={h2h.friendly.ga}
                />
              )}
            </div>
          )}

          {/* Team cards side by side */}
          <div className="flex gap-5 flex-col sm:flex-row">
            <TeamCard team={home} />
            <div className="hidden sm:block w-px bg-white/10 flex-shrink-0 self-stretch" />
            <TeamCard team={away} />
          </div>
        </div>
      </div>
    </div>
  );
}
