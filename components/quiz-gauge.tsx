'use client';
// Jauge de présence : inscrits / convives attendus, avec les paliers échauffement et jeu.
export default function QuizGauge({ players, expected, warmupPct, gamePct, big = false, hideHint = false, labels }: {
  players: number; expected: number; warmupPct: number; gamePct: number; big?: boolean; hideHint?: boolean;
  labels: { title: string; warmup: string; game: string };
}) {
  const pct = expected > 0 ? Math.min(100, Math.round((players / expected) * 100)) : 0;
  const reachedGame = pct >= gamePct, reachedWarm = pct >= warmupPct;
  return (
    <div className="w-full" role="img" aria-label={`${labels.title} : ${pct} % (${players} / ${expected})`}>
      <div className="flex items-end justify-between mb-3 gap-3">
        <span className={'font-extrabold ' + (big ? 'text-3xl' : 'text-lg')}>{labels.title}</span>
        <span className={'font-black tabular-nums mil-title ' + (big ? 'text-7xl' : 'text-4xl')} dir="ltr">{pct}<span className={big ? 'text-4xl' : 'text-2xl'}> %</span></span>
      </div>
      <div className={'quiz-gauge ' + (big ? 'h-16' : 'h-9')} dir="ltr">
        <div className={'quiz-gauge-fill' + (reachedGame ? ' green' : '')} style={{ width: pct + '%' }} />
        <Marker at={warmupPct} reached={reachedWarm} label={`🔥 ${warmupPct} %`} big={big} />
        <Marker at={gamePct} reached={reachedGame} label={`🏆 ${gamePct} %`} big={big} />
      </div>
      <div className={'flex justify-between mil-muted font-bold ' + (big ? 'text-2xl mt-11' : 'text-base mt-8')}>
        <span dir="ltr" className="tabular-nums">{players} / {expected}</span>
        {!hideHint && <span>{reachedGame ? '🏆' : reachedWarm ? labels.game + ' ' + gamePct + ' %' : labels.warmup + ' ' + warmupPct + ' %'}</span>}
      </div>
    </div>
  );
}

function Marker({ at, reached, label, big }: { at: number; reached: boolean; label: string; big: boolean }) {
  return (
    <div className="absolute top-0 bottom-0" style={{ left: at + '%' }} aria-hidden>
      <div className={'h-full w-[3px] -translate-x-1/2 ' + (reached ? 'bg-white' : 'bg-white/50')} />
      <span className={'absolute -translate-x-1/2 whitespace-nowrap font-black ' + (reached ? 'text-white ' : 'mil-muted ') + (big ? 'text-xl -bottom-9' : 'text-sm -bottom-6')}>{label}</span>
    </div>
  );
}
