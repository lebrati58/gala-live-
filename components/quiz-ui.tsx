'use client';
import { Lang, t } from '@/lib/quiz-i18n';

// Le libellé « Échauffement 👴 » est déjà affiché dans le bandeau : on l'enlève de l'énoncé.
export const stripWarmup = (txt: string) => txt.replace(/^(Échauffement|חימום)\s*\S*\s*/, '');


export function Leaderboard({ lang, rows, highlight }: { lang: Lang; rows: { table_number: number; players: number; avg_points: number }[]; highlight?: number }) {
  const L = t[lang]; const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="mt-6">
      <h2 className="font-black text-xl mb-3">{L.leaderboard}</h2>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.table_number} className={'flex items-center justify-between rounded-xl px-4 py-3 ' + (r.table_number === highlight ? 'bg-amber-300 text-[#122238]' : 'bg-white/10')}>
            <span className="font-bold">{medals[i] || `#${i + 1}`} {L.myTable} {r.table_number} <span className="opacity-70 text-sm">({r.players} {L.players})</span></span>
            <span className="font-black tabular-nums">{r.avg_points} <span className="text-xs font-semibold opacity-70">{L.avg}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
