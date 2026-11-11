'use client';
// Jauge de présence : inscrits / convives attendus, avec les paliers échauffement et jeu.
export default function QuizGauge({ players, expected, warmupPct, gamePct, big = false, labels }: {
  players: number; expected: number; warmupPct: number; gamePct: number; big?: boolean;
  labels: { title: string; warmup: string; game: string };
}) {
  const pct = expected > 0 ? Math.min(100, Math.round((players / expected) * 100)) : 0;
  const reachedGame = pct >= gamePct, reachedWarm = pct >= warmupPct;
  const fill = reachedGame ? 'linear-gradient(90deg,#2e9b5f,#5fd08f)' : reachedWarm ? 'linear-gradient(90deg,#d99a1e,#f3c75b)' : 'linear-gradient(90deg,#2f6fd0,#6aa4f2)';
  return (
    <div className="w-full" role="img" aria-label={`${labels.title} : ${pct} % (${players} / ${expected})`}>
      <div className="flex items-end justify-between mb-2 gap-3">
        <span className={'font-bold ' + (big ? 'text-2xl' : 'text-base')}>{labels.title}</span>
        <span className={'font-black tabular-nums ' + (big ? 'text-6xl' : 'text-3xl')} dir="ltr">{pct}<span className={big ? 'text-3xl' : 'text-xl'}> %</span></span>
      </div>
      <div className={'quiz-gauge ' + (big ? 'h-16' : 'h-8')} dir="ltr">
        <div className="quiz-gauge-fill" style={{ width: pct + '%', background: fill }} />
        <Marker at={warmupPct} reached={reachedWarm} label={`⛺ ${warmupPct} %`} big={big} />
        <Marker at={gamePct} reached={reachedGame} label={`🏁 ${gamePct} %`} big={big} />
      </div>
      <div className={'flex justify-between quiz-muted ' + (big ? 'text-xl mt-10' : 'text-sm mt-7')}>
        <span dir="ltr" className="tabular-nums">{players} / {expected}</span>
        <span>{reachedGame ? '🏁' : reachedWarm ? labels.game + ' ' + gamePct + ' %' : labels.warmup + ' ' + warmupPct + ' %'}</span>
      </div>
    </div>
  );
}

function Marker({ at, reached, label, big }: { at: number; reached: boolean; label: string; big: boolean }) {
  return (
    <div className="absolute top-0 bottom-0" style={{ left: at + '%' }} aria-hidden>
      <div className={'h-full w-1 -translate-x-1/2 ' + (reached ? 'bg-white' : 'bg-white/60')} />
      <span className={'absolute -translate-x-1/2 whitespace-nowrap font-bold ' + (big ? 'text-lg -bottom-8' : 'text-xs -bottom-5')}>{label}</span>
    </div>
  );
}
