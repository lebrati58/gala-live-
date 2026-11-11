'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import QuizGauge from '@/components/quiz-gauge';
import { stripWarmup } from '@/components/quiz-ui';
import { LETTERS, Lozenge, MilLogo, Ring } from '@/components/mil';
import { categories, QuizState } from '@/lib/quiz-i18n';

// Écran géant façon « Qui veut gagner des millions », entièrement bilingue :
// français à gauche (LTR), hébreu à droite (RTL).
const RESULTS_AFTER_MS = 8000; // 8 s sur la bonne réponse, puis l'écran des résultats

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
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#050a24', light: '#ffffff' } })
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
  const qrBox = (px: number) => qr ? <div className="bg-white rounded-2xl p-2 shadow-[0_0_0_4px_#f5c542,0_0_40px_rgba(245,197,66,.4)]" style={{ width: px }} dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code" role="img" /> : null;
  const gaugeLabels = { title: 'Présence · נוכחות', warmup: 'Échauffement à · חימום ב-', game: 'Grand jeu à · משחק ב-' };
  const showResults = s?.status === 'reveal' && q && s.reveal && now + offset.current - new Date(s.updated_at).getTime() > RESULTS_AFTER_MS;

  let body: React.ReactNode = null;
  if (!s) body = <Center><p className="text-4xl">{offline ? 'Connexion…' : '…'}</p></Center>;
  else if (s.status === 'idle') body = (
    <Center>
      <MilLogo size={220} />
      <Bi fr="Le grand quiz arrive bientôt !" he="!החידון הגדול מגיע בקרוב" cls="mil-title text-7xl mt-12" center />
    </Center>
  );
  else if (s.status === 'lobby') body = (
    <div className="h-full grid grid-cols-[auto_1fr] gap-20 items-center px-10">
      <div className="text-center">
        {qrBox(400)}
        <p className="mt-5 text-3xl font-black tracking-wide mil-gold" dir="ltr">{joinUrl}</p>
      </div>
      <div>
        <Bi fr={s.index >= 0 ? 'Échauffement terminé !' : 'Scannez pour jouer !'} he={s.index >= 0 ? '!החימום הסתיים' : '!סרקו כדי לשחק'} cls="mil-title text-7xl leading-tight mb-4" />
        <Bi fr={s.index >= 0 ? 'Le grand jeu démarre à ' + s.game_start_pct + ' % de la salle' : 'Français ou עברית : choisissez votre langue sur votre téléphone'}
            he={s.index >= 0 ? `המשחק הגדול מתחיל ב-${s.game_start_pct}% מהאולם` : 'צרפתית או עברית: בוחרים שפה בטלפון'} cls="text-3xl font-bold mil-muted mb-14" />
        <QuizGauge big hideHint players={s.players} expected={s.expected_players} warmupPct={s.warmup_start_pct} gamePct={s.game_start_pct} labels={gaugeLabels} />
        {!s.auto_start && <p className="mt-10 text-2xl mil-muted">Démarrage manuel · התחלה ידנית</p>}
      </div>
    </div>
  );
  else if (showResults) body = <Results s={s} />;
  else if ((s.status === 'question' || s.status === 'reveal') && q) {
    const reveal = s.status === 'reveal' ? s.reveal : undefined;
    const answers = s.answers || 0;
    const answerPct = Math.min(100, Math.round((answers / Math.max(1, s.expected_players)) * 100));
    const cat = categories[q.category];
    body = (
      <div className="h-full grid grid-cols-[1fr_330px] gap-10">
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-6 mb-6">
            <div>
              {q.warmup
                ? <span className="mil-badge text-2xl">🔥 Échauffement · חימום — {q.warmup === 'seniors' ? 'facile pour les anciens · קל לוותיקים 👴' : 'facile pour les jeunes · קל לצעירים 🧒'}</span>
                : <p className="text-3xl font-black"><span className="mil-gold">Question {s.index + 1 - s.warmups}</span> <span className="mil-muted">/ {s.total - s.warmups}</span> <span className="mil-muted text-2xl ms-4">{cat?.emoji} {cat?.fr} · <span lang="he">{cat?.he}</span></span></p>}
            </div>
            {s.status === 'question'
              ? <Ring remaining={remaining} total={q.time_limit_s} size={136} />
              : <span className="mil-badge text-3xl">⏰ Réponse ! · !תשובה</span>}
          </div>
          <div className="flex-1 flex flex-col justify-center gap-9">
            <div className="mil-row">
              <Lozenge question tip={50}>
                <div className="grid grid-cols-2 gap-10 w-full py-5 items-center">
                  <h1 className="text-[2.7rem] font-black leading-tight text-start" dir="ltr" lang="fr">{stripWarmup(q.question_fr)}</h1>
                  <h1 className="text-[2.7rem] font-black leading-tight text-start" dir="rtl" lang="he">{stripWarmup(q.question_he)}</h1>
                </div>
              </Lozenge>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {q.options_fr.map((o, i) => (
                <div key={i} className="mil-row">
                  <Lozenge tip={40} state={reveal ? (reveal.correct_index === i ? 'correct' : 'dim') : ''}>
                    <span className="mil-letter text-4xl">{LETTERS[i]}</span>
                    <div className="flex-1 grid grid-cols-2 gap-4 items-center py-2">
                      <span className="mil-ans-text text-[2rem]" dir="ltr" lang="fr">{o}</span>
                      <span className="mil-ans-text text-[2rem] text-start" dir="rtl" lang="he">{q.options_he[i]}</span>
                    </div>
                  </Lozenge>
                </div>
              ))}
            </div>
          </div>
          {reveal ? (
            <div className="mil-panel mt-6 grid grid-cols-2 gap-10 text-2xl leading-snug">
              <p dir="ltr" lang="fr">{reveal.explanation_fr}</p>
              <p dir="rtl" lang="he">{reveal.explanation_he}</p>
              {reveal.source_label && <p className="col-span-2 text-base mil-muted">Source · מקור : {reveal.source_label}</p>}
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex justify-between text-2xl font-black mb-3">
                <span>🗳️ {answers} réponses · תשובות</span>
                <span dir="ltr" className="tabular-nums mil-gold">{answerPct} % de la salle · מהאולם</span>
              </div>
              <div className="quiz-gauge h-10" dir="ltr"><div className="quiz-gauge-fill" style={{ width: answerPct + '%' }} /></div>
            </div>
          )}
        </div>
        <Ladder s={s} />
      </div>
    );
  } else if (s.status === 'finished') body = <Final s={s} />;

  return (
    <main className="mil h-screen overflow-hidden flex flex-col px-12 py-9">
      <header className="flex items-center justify-between mb-7 gap-6">
        <div className="flex items-center gap-5"><MilLogo size={86} />
          <div><p className="mil-title text-[2.6rem] leading-none">Le grand quiz du gala</p><p className="mil-title text-[2.2rem] leading-tight mt-1" dir="rtl" lang="he">החידון הגדול של הגאלה</p></div></div>
        <div className="flex items-center gap-5">
          {s && s.status !== 'idle' && s.status !== 'lobby' && <div className="text-end text-xl font-bold"><p className="mil-gold">📲 {joinUrl}</p><p className="mil-muted">{s.players} joueurs · שחקנים</p></div>}
          {s && s.status !== 'idle' && s.status !== 'lobby' && qrBox(120)}
          {offline && <span className="text-[#ff8f8f] text-xl font-bold">● Connexion interrompue</span>}
        </div>
      </header>
      <div className="flex-1 min-h-0">{body}</div>
    </main>
  );
}

// Échelle des questions, comme l'échelle des gains (bas = 1re question).
function Ladder({ s }: { s: QuizState }) {
  const game = Math.max(0, s.total - s.warmups);
  const cur = s.index - s.warmups; // -1 pendant l'échauffement
  return (
    <aside className="mil-ladder self-center">
      <ol>
        {s.warmups > 0 && <li className={'warm ' + (cur < 0 ? 'current' : 'done')}><span>🔥</span><span>Échauffement</span></li>}
        {Array.from({ length: game }, (_, i) => (
          <li key={i} className={i === cur ? 'current' : i < cur ? 'done' : (i + 1) % 5 === 0 || i === game - 1 ? 'milestone' : ''} style={{ fontSize: game > 14 ? '1.15rem' : '1.35rem' }}>
            <span>{i + 1}</span><span>{i === game - 1 ? '🏆 Finale' : (i + 1) % 5 === 0 ? '◆ Palier' : '◆'}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function Results({ s }: { s: QuizState }) {
  const q = s.question!, r = s.reveal!;
  const answered = r.distribution.reduce((a, b) => a + b, 0);
  const good = r.distribution[r.correct_index] || 0;
  const goodPct = answered ? Math.round((good / answered) * 100) : 0;
  const roomPct = Math.min(100, Math.round((answered / Math.max(1, s.expected_players)) * 100));
  const max = Math.max(1, ...r.distribution);
  return (
    <div className="h-full grid grid-cols-[1.25fr_1fr] gap-12">
      <div className="mil-panel flex flex-col">
        <Bi fr={q.warmup ? 'Le public a voté — échauffement' : `Le public a voté — question ${s.index + 1 - s.warmups}`}
            he={q.warmup ? 'הקהל הצביע — חימום' : `הקהל הצביע — שאלה ${s.index + 1 - s.warmups}`} cls="mil-title text-5xl leading-tight mb-6" />
        <div className="mil-audience flex-1 min-h-0">
          {r.distribution.map((n, i) => {
            const pct = answered ? Math.round((n / answered) * 100) : 0;
            return (
              <div key={i} className="bar-wrap">
                <span className={'pct text-4xl ' + (i === r.correct_index ? 'text-[#7af5a6]' : '')}>{pct}%</span>
                <div className={'bar ' + (i === r.correct_index ? 'ok' : '')} style={{ height: `${Math.max(3, (n / max) * 100) * 0.62}%` }} />
                <span className="lbl text-4xl">◆ {LETTERS[i]}{i === r.correct_index ? ' ✔' : ''}</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-8 mt-6 text-2xl font-bold">
          <p><span className="mil-title text-6xl">{goodPct}%</span><br />de bonnes réponses · <span lang="he">תשובות נכונות</span></p>
          <p><span className="mil-title text-6xl">{roomPct}%</span><br />de la salle a joué · <span lang="he">מהאולם השתתפו</span></p>
        </div>
      </div>
      <div className="flex flex-col justify-center">
        {q.warmup ? (
          <div className="mil-panel text-center">
            <p className="text-7xl mb-6" aria-hidden>🔥</p>
            <Bi fr={s.next_is_warmup ? 'Prochaine question d’échauffement…' : 'Échauffement terminé ! Le grand jeu arrive…'}
                he={s.next_is_warmup ? 'שאלת החימום הבאה מגיעה…' : 'החימום הסתיים! המשחק הגדול מתקרב…'} cls="text-4xl font-black leading-snug" center />
            <p className="text-2xl mil-muted mt-6">Pour le plaisir, sans points · בשביל הכיף, בלי נקודות</p>
          </div>
        ) : (
          <TablesLadder rows={(s.tables || []).slice(0, 8)} title="Classement des tables · דירוג השולחנות" />
        )}
      </div>
    </div>
  );
}

function TablesLadder({ rows, title, start = 0 }: { rows: { table_number: number; players: number; avg_points: number }[]; title: string; start?: number }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="mil-ladder">
      <p className="mil-title text-3xl text-center mb-4">{title}</p>
      {rows.length === 0 ? <p className="text-center text-2xl mil-muted py-6">—</p> : (
        <ol style={{ flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <li key={r.table_number} className={start + i === 0 ? 'current' : start + i < 3 ? 'milestone' : ''} style={{ fontSize: '1.7rem', padding: '8px 22px' }}>
              <span>{medals[start + i] || `${start + i + 1}.`} Table {r.table_number} <span className="text-lg font-bold opacity-80">· {r.players} 👤</span></span>
              <span>{r.avg_points}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-center text-lg mil-muted mt-3">points par joueur · נקודות לשחקן</p>
    </div>
  );
}

function Final({ s }: { s: QuizState }) {
  const rows = s.tables || [];
  const top = rows.slice(0, 3), order = [1, 0, 2].filter(i => top[i]);
  const heights = [340, 260, 200], medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="h-full flex flex-col">
      <Bi fr="🏆 Bravo à tous !" he="!כל הכבוד לכולם 🏆" cls="mil-title text-7xl text-center mb-8" center />
      <div className="flex-1 grid grid-cols-[3fr_2fr] gap-14 items-end">
        <div className="flex items-end justify-center gap-8">
          {order.map(i => (
            <div key={top[i].table_number} className="text-center w-64 mil-pop" style={{ animationDelay: `${(2 - i) * 0.4}s` }}>
              <p className="text-8xl mb-2" aria-hidden>{medals[i]}</p>
              <p className="text-5xl font-black">Table {top[i].table_number}</p>
              <p className="text-3xl mil-muted mb-4" dir="rtl" lang="he">שולחן {top[i].table_number}</p>
              <div className="mil-podium" style={{ height: heights[i] }}><span className="text-6xl font-black tabular-nums">{top[i].avg_points}</span><span className="text-lg font-bold">pts / joueur · נק׳ לשחקן</span></div>
            </div>
          ))}
        </div>
        {rows.length > 3 && <TablesLadder rows={rows.slice(3, 10)} start={3} title="La suite · ההמשך" />}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) { return <div className="h-full flex flex-col items-center justify-center text-center">{children}</div>; }
function Bi({ fr, he, cls, center }: { fr: string; he: string; cls: string; center?: boolean }) {
  return <div className={cls}><p dir="ltr" lang="fr" className={center ? 'text-center' : ''}>{fr}</p><p dir="rtl" lang="he" className={center ? 'text-center' : ''}>{he}</p></div>;
}
