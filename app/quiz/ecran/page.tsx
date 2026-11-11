'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import GalaLogo from '@/components/gala-logo';
import QuizGauge from '@/components/quiz-gauge';
import { stripWarmup } from '@/components/quiz-ui';
import { answerStyles, categories, QuizState, t } from '@/lib/quiz-i18n';

// Écran géant : tout est affiché dans les deux langues en même temps,
// le français à gauche (LTR) et l'hébreu à droite (RTL).
export default function QuizScreen() {
  const [s, setS] = useState<QuizState | null>(null);
  const [qr, setQr] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);

  useEffect(() => {
    const url = window.location.origin + '/quiz';
    setJoinUrl(url.replace(/^https?:\/\//, ''));
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#122238', light: '#ffffff' } })
      .then(setQr).catch(() => setQr(''));
    let active = true;
    const refresh = async () => {
      try {
        const r = await fetch('/api/quiz/state', { cache: 'no-store' });
        if (!r.ok) throw new Error();
        const d: QuizState = await r.json();
        if (!active) return;
        offset.current = new Date(d.server_now).getTime() - Date.now();
        setS(d); setOffline(false);
      } catch { if (active) setOffline(true); }
    };
    refresh();
    const poll = setInterval(refresh, 1000);
    const tick = setInterval(() => setNow(Date.now()), 200);
    return () => { active = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const q = s?.question;
  const remaining = s?.deadline ? Math.max(0, Math.ceil((new Date(s.deadline).getTime() - (now + offset.current)) / 1000)) : 0;
  const qrBlock = (size: string) => qr ? <div className={'bg-white rounded-2xl p-2 ' + size} dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code" role="img" /> : null;
  const gaugeLabels = { title: 'Présence · נוכחות', warmup: 'Échauffement à · חימום ב-', game: 'Grand jeu à · משחק ב-' };

  let body: React.ReactNode = null;
  if (!s) body = <Center><p className="text-4xl">{offline ? 'Connexion…' : '…'}</p></Center>;
  else if (s.status === 'idle') body = (
    <Center>
      <p className="text-9xl mb-6" aria-hidden>⛺</p>
      <Bi fr="Le grand quiz arrive bientôt !" he="החידון הגדול מגיע בקרוב!" cls="text-6xl font-black" />
    </Center>
  );
  else if (s.status === 'lobby') body = (
    <div className="grid grid-cols-[auto_1fr] gap-14 items-center h-full">
      <div className="text-center">
        {qrBlock('w-[min(38vh,420px)]')}
        <p className="mt-4 text-2xl font-bold tracking-wide" dir="ltr">{joinUrl}</p>
      </div>
      <div>
        <Bi fr={s.index >= 0 ? 'Échauffement terminé ! Le grand jeu arrive…' : 'Scannez pour jouer !'}
            he={s.index >= 0 ? 'החימום הסתיים! המשחק הגדול מתקרב…' : 'סרקו כדי לשחק!'} cls="text-6xl font-black mb-3" />
        <Bi fr="Français ou עברית : choisissez votre langue sur votre téléphone" he="צרפתית או עברית: בוחרים שפה בטלפון" cls="text-2xl quiz-muted mb-12" />
        <QuizGauge big players={s.players} expected={s.expected_players} warmupPct={s.warmup_start_pct} gamePct={s.game_start_pct} labels={gaugeLabels} />
        {!s.auto_start && <p className="mt-8 text-xl quiz-muted">Démarrage manuel · התחלה ידנית</p>}
      </div>
    </div>
  );
  else if (s.status === 'reveal' && q && s.reveal && now + offset.current - new Date(s.updated_at).getTime() > RESULTS_AFTER_MS)
    body = <Results s={s} />;
  else if ((s.status === 'question' || s.status === 'reveal') && q) {
    const reveal = s.status === 'reveal' ? s.reveal : undefined;
    const dist = reveal?.distribution || [0, 0, 0, 0];
    const maxDist = Math.max(1, ...dist);
    const answers = s.answers || 0;
    const answerPct = Math.min(100, Math.round((answers / Math.max(1, s.expected_players)) * 100));
    const cat = categories[q.category];
    const timePct = s.status === 'question' ? Math.min(100, (remaining / q.time_limit_s) * 100) : 0;
    body = (
      <div className="flex flex-col h-full gap-5">
        <div className="flex items-center justify-between gap-6">
          {q.warmup
            ? <span className="quiz-warmup-badge text-2xl">🔥 Échauffement · חימום — {q.warmup === 'seniors' ? 'facile pour les anciens 👴 קל לוותיקים' : 'facile pour les jeunes 🧒 קל לצעירים'}</span>
            : <span className="text-2xl font-bold quiz-muted">{cat?.emoji} {cat?.fr} · <span lang="he">{cat?.he}</span> — Question {s.index + 1 - s.warmups} / {s.total - s.warmups}</span>}
          {s.status === 'question'
            ? <div className="quiz-clock" style={{ ['--p' as string]: timePct }} aria-label={`${remaining} s`}><span>{remaining}</span></div>
            : <span className="text-3xl font-black text-amber-300">⏰ Réponse ! · !תשובה</span>}
        </div>
        <div className="grid grid-cols-2 gap-10">
          <h1 className="text-5xl font-black leading-tight" dir="ltr" lang="fr">{stripWarmup(q.question_fr)}</h1>
          <h1 className="text-5xl font-black leading-tight" dir="rtl" lang="he">{stripWarmup(q.question_he)}</h1>
        </div>
        <div className="grid grid-cols-2 gap-5 flex-1 content-start">
          {q.options_fr.map((o, i) => {
            const isCorrect = reveal && reveal.correct_index === i;
            const dim = reveal && !isCorrect;
            return (
              <div key={i} className="quiz-screen-answer" style={{ background: answerStyles[i].bg, opacity: dim ? 0.35 : 1, outline: isCorrect ? '6px solid #fff' : 'none' }}>
                <span className="text-5xl shrink-0" aria-hidden>{isCorrect ? '✔' : answerStyles[i].shape}</span>
                <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                  <span dir="ltr" lang="fr">{o}</span>
                  <span dir="rtl" lang="he">{q.options_he[i]}</span>
                </div>
                {reveal && <span className="quiz-dist" style={{ width: `${(dist[i] / maxDist) * 100}%` }} aria-hidden />}
                {reveal && <span className="text-3xl font-black tabular-nums shrink-0">{dist[i]}</span>}
              </div>
            );
          })}
        </div>
        {reveal ? (
          <div className="grid grid-cols-2 gap-10 text-2xl leading-snug bg-white/10 rounded-3xl p-6">
            <p dir="ltr" lang="fr">{reveal.explanation_fr}</p>
            <p dir="rtl" lang="he">{reveal.explanation_he}</p>
            {reveal.source_label && <p className="col-span-2 text-base quiz-muted">Source · מקור : {reveal.source_label}</p>}
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-2xl font-bold mb-2">
              <span>{answers} réponses · תשובות</span>
              <span dir="ltr" className="tabular-nums">{answerPct} % de la salle · מהאולם</span>
            </div>
            <div className="quiz-gauge h-12" dir="ltr"><div className="quiz-gauge-fill" style={{ width: answerPct + '%', background: 'linear-gradient(90deg,#d99a1e,#f3c75b)' }} /></div>
          </div>
        )}
      </div>
    );
  } else if (s.status === 'finished') body = (
    <div className="h-full flex flex-col">
      <Bi fr="🏆 Bravo à tous !" he="🏆 !כל הכבוד לכולם" cls="text-6xl font-black text-center mb-8" center />
      {s.tables && s.tables.length > 0 ? <TopTables rows={s.tables} /> : <p className="text-3xl text-center quiz-muted">—</p>}
    </div>
  );

  return (
    <main className="quiz-screen quiz-big-screen h-screen overflow-hidden flex flex-col p-10">
      <header className="flex items-center justify-between mb-8 gap-6">
        <div className="flex items-center gap-5"><GalaLogo size={84} />
          <div><p className="text-4xl font-black">Le grand quiz du gala</p><p className="text-3xl font-black quiz-muted" dir="rtl" lang="he">החידון הגדול של הגאלה</p></div></div>
        <div className="flex items-center gap-5">
          {s && s.status !== 'idle' && s.status !== 'lobby' && <div className="text-right text-xl font-bold"><p>📲 {joinUrl}</p><p className="quiz-muted">{s.players} joueurs · שחקנים</p></div>}
          {s && s.status !== 'idle' && s.status !== 'lobby' && qrBlock('w-28')}
          {offline && <span className="text-rose-300 text-xl">● Connexion interrompue</span>}
        </div>
      </header>
      <div className="flex-1 min-h-0">{body}</div>
    </main>
  );
}

// Après chaque réponse : 8 s sur la bonne réponse, puis l'écran des résultats.
const RESULTS_AFTER_MS = 8000;

function Results({ s }: { s: QuizState }) {
  const q = s.question!, r = s.reveal!;
  const answered = r.distribution.reduce((a, b) => a + b, 0);
  const good = r.distribution[r.correct_index] || 0;
  const goodPct = answered ? Math.round((good / answered) * 100) : 0;
  const roomPct = Math.min(100, Math.round((answered / Math.max(1, s.expected_players)) * 100));
  const last = s.index + 1 >= s.total;
  return (
    <div className="h-full flex flex-col gap-8">
      <Bi fr={q.warmup ? '🔥 Résultats de l’échauffement' : `📊 Résultats — question ${s.index + 1 - s.warmups} / ${s.total - s.warmups}`}
          he={q.warmup ? '🔥 תוצאות החימום' : `📊 תוצאות — שאלה ${s.index + 1 - s.warmups} מתוך ${s.total - s.warmups}`} cls="text-5xl font-black" />
      <div className="grid grid-cols-2 gap-8">
        <Stat big={`${goodPct} %`} fr="de bonnes réponses" he="תשובות נכונות" sub={`${good} / ${answered}`}
              fill={goodPct} color="linear-gradient(90deg,#2e9b5f,#5fd08f)" />
        <Stat big={`${roomPct} %`} fr="de la salle a joué" he="מהאולם השתתפו" sub={`${answered} / ${s.expected_players}`}
              fill={roomPct} color="linear-gradient(90deg,#d99a1e,#f3c75b)" />
      </div>
      {q.warmup
        ? <Bi fr={s.next_is_warmup ? 'Prochaine question d’échauffement dans un instant…' : 'Échauffement terminé ! Le grand jeu arrive…'}
              he={s.next_is_warmup ? 'שאלת החימום הבאה תכף מגיעה…' : 'החימום הסתיים! המשחק הגדול מתקרב…'} cls="text-3xl font-bold quiz-muted text-center" center />
        : s.tables && s.tables.length > 0
          ? <TopTables rows={s.tables} small />
          : null}
      {!q.warmup && last && <p className="text-2xl text-center quiz-muted">Dernière question ! Le podium arrive… · !השאלה האחרונה</p>}
    </div>
  );
}

function Stat({ big, fr, he, sub, fill, color }: { big: string; fr: string; he: string; sub: string; fill: number; color: string }) {
  return (
    <div className="bg-white/10 rounded-3xl p-8">
      <p className="text-8xl font-black tabular-nums" dir="ltr">{big}</p>
      <p className="text-3xl font-bold mt-2">{fr}</p>
      <p className="text-3xl font-bold quiz-muted" dir="rtl" lang="he">{he}</p>
      <div className="quiz-gauge h-8 mt-6" dir="ltr"><div className="quiz-gauge-fill" style={{ width: fill + '%', background: color }} /></div>
      <p className="text-xl quiz-muted mt-2 tabular-nums" dir="ltr">{sub}</p>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) { return <div className="h-full flex flex-col items-center justify-center text-center">{children}</div>; }
function Bi({ fr, he, cls, center }: { fr: string; he: string; cls: string; center?: boolean }) {
  return <div className={cls}><p dir="ltr" lang="fr" className={center ? 'text-center' : ''}>{fr}</p><p dir="rtl" lang="he" className={center ? 'text-center' : ''}>{he}</p></div>;
}

function TopTables({ rows, small = false }: { rows: { table_number: number; players: number; avg_points: number }[]; small?: boolean }) {
  const medals = ['🥇', '🥈', '🥉'];
  const top = rows.slice(0, 3), rest = rows.slice(3, small ? 8 : 10);
  const order = [1, 0, 2].filter(i => top[i]);
  const heights = small ? ['h-36', 'h-28', 'h-20'] : ['h-72', 'h-56', 'h-44'];
  return (
    <div className="flex-1 min-h-0 grid grid-cols-[3fr_2fr] gap-12 items-end">
      <div className="flex items-end justify-center gap-6">
        {order.map(i => (
          <div key={top[i].table_number} className="text-center w-56">
            <p className={(small ? 'text-5xl' : 'text-7xl') + ' mb-1'} aria-hidden>{medals[i]}</p>
            <p className={(small ? 'text-3xl' : 'text-4xl') + ' font-black'}>Table {top[i].table_number}</p>
            <p className="text-2xl quiz-muted mb-2"><span dir="rtl" lang="he">שולחן {top[i].table_number}</span></p>
            <div className={'quiz-podium ' + heights[i]}><span className={(small ? 'text-3xl' : 'text-4xl') + ' font-black tabular-nums'}>{top[i].avg_points}</span><span className="text-lg">pts / joueur · נק׳ לשחקן</span></div>
          </div>
        ))}
      </div>
      {rest.length > 0 && <ol className={'space-y-3 self-center ' + (small ? 'text-xl' : 'text-2xl')}>{rest.map((r, i) => (
        <li key={r.table_number} className="flex justify-between bg-white/10 rounded-2xl px-6 py-2 font-bold"><span>#{i + 4} Table {r.table_number}</span><span className="tabular-nums">{r.avg_points}</span></li>
      ))}</ol>}
    </div>
  );
}
