'use client';
import { Lang, t } from '@/lib/quiz-i18n';

// Le libellé « Échauffement 👴 » est déjà affiché dans le bandeau : on l'enlève de l'énoncé.
export const stripWarmup = (txt: string) => txt.replace(/^(Échauffement|חימום)\s*\S*\s*/, '');

// Classement des tables présenté comme l'échelle des gains.
export function Leaderboard({ lang, rows, highlight }: { lang: Lang; rows: { table_number: number; players: number; avg_points: number }[]; highlight?: number }) {
  const L = t[lang]; const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="mil-ladder mt-6">
      <h2 className="font-black text-xl mb-3 text-center mil-gold">{L.leaderboard}</h2>
      <ol style={{ flexDirection: 'column' }}>
        {rows.map((r, i) => (
          <li key={r.table_number} className={r.table_number === highlight ? 'current' : i < 3 ? 'milestone' : ''}>
            <span>{medals[i] || `${i + 1}.`} {L.myTable} {r.table_number} <span className="text-sm font-bold opacity-80">· {r.players} {L.players}</span></span>
            <span>{r.avg_points}</span>
          </li>
        ))}
      </ol>
      <p className="text-center text-sm mil-muted mt-2">{L.avg}</p>
    </div>
  );
}
