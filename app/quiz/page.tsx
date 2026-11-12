'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import QuizGauge from '@/components/quiz-gauge';
import { Leaderboard, stripWarmup } from '@/components/quiz-ui';
import { LETTERS, Lozenge, MilLogo, Ring } from '@/components/mil';
import { categories, Lang, QuizState, t } from '@/lib/quiz-i18n';

type Identity = { player_id: string; token: string; run_id: string };
const LANG_KEY = 'gala_quiz_lang';
const ID_KEY = 'gala_quiz_player';

const store = {
  get<T>(k: string): T | null { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* navigation privée */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* navigation privée */ } },
};

export default function QuizPlayer() {
  const [lang, setLang] = useState<Lang | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<QuizState | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [offline, setOffline] = useState(false);
  const [nickname, setNickname] = useState('');
  const [table, setTable] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ q: string; choice: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const idRef = useRef<Identity | null>(null);

  useEffect(() => {
    setLang(store.get<Lang>(LANG_KEY));
    const id = store.get<Identity>(ID_KEY); setIdentity(id); idRef.current = id;
    const saved = store.get<{ nickname: string; table: string }>('gala_quiz_form');
    if (saved) { setNickname(saved.nickname || ''); setTable(saved.table || ''); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!lang) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    return () => { document.documentElement.lang = 'fr'; document.documentElement.dir = 'ltr'; };
  }, [lang]);

  const refresh = useCallback(async () => {
    try {
      const id = idRef.current;
      const headers: Record<string, string> = {};
      if (id) { headers['x-quiz-player'] = id.player_id; headers['x-quiz-token'] = id.token; }
      const r = await fetch('/api/quiz/state', { cache: 'no-store', headers });
      if (!r.ok) throw new Error();
      const data: QuizState = await r.json();
      offset.current = new Date(data.server_now).getTime() - Date.now();
      // Nouvelle partie ou identité invalide : on repasse par l'inscription.
      if (id && (data.player === null || (data.run_id && data.run_id !== id.run_id))) {
        store.del(ID_KEY); idRef.current = null; setIdentity(null);
      }
      setState(data); setOffline(false);
    } catch { setOffline(true); }
  }, []);

  useEffect(() => {
    if (!ready) return;
    refresh();
    const poll = setInterval(refresh, 1500);
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [ready, refresh]);

  function chooseLang(l: Lang) { setLang(l); store.set(LANG_KEY, l); }

  async function join(e: React.FormEvent) {
    e.preventDefault(); if (!lang) return;
    const n = nickname.trim(); const tn = Number(table);
    if (!n || n.length > 30) return setError(t[lang].errors.nickname);
    if (!Number.isInteger(tn) || tn < 1 || tn > 500) return setError(t[lang].errors.table);
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/quiz/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: n, table_number: tn }) });
      const d = await r.json();
      if (!d.ok) { const key = (d.error || 'generic') as keyof typeof t.fr.errors; setError(t[lang].errors[key] || t[lang].errors.generic); return; }
      const id = { player_id: d.player_id, token: d.token, run_id: d.run_id };
      store.set(ID_KEY, id); store.set('gala_quiz_form', { nickname: n, table: String(tn) });
      idRef.current = id; setIdentity(id); refresh();
    } catch { setError(t[lang].errors.network); } finally { setBusy(false); }
  }

  async function answer(choice: number) {
    const id = idRef.current; const q = state?.question;
    if (!id || !q || pending || state?.player?.choice !== undefined) return;
    setPending({ q: q.id, choice });
    try {
      const r = await fetch('/api/quiz/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: id.player_id, token: id.token, question_id: q.id, choice }) });
      const d = await r.json();
      if (!d.ok) setPending(null);
      await refresh();
    } catch { setPending(null); }
  }

  function changePlayer() { store.del(ID_KEY); idRef.current = null; setIdentity(null); }

  if (!ready) return <Shell><p className="text-center text-xl pt-20">…</p></Shell>;

  // 1) Choix de la langue, dès l'entrée
  if (!lang) return (
    <Shell>
      <div className="text-center pt-6">
        <div className="flex justify-center mb-6"><MilLogo size={104} /></div>
        <h1 className="mil-title text-4xl leading-tight">Le grand quiz<br />du gala</h1>
        <h1 className="mil-title text-4xl leading-tight mt-2" dir="rtl" lang="he">החידון הגדול<br />של הגאלה</h1>
        <p className="mt-8 mb-5 text-lg font-bold">Choisissez votre langue · <span dir="rtl" lang="he">בחרו שפה</span></p>
        <div className="grid gap-4">
          <div className="mil-row"><Lozenge onClick={() => chooseLang('fr')} label="Français"><span className="text-3xl" aria-hidden>🇫🇷</span><span className="text-2xl font-black">Français</span></Lozenge></div>
          <div className="mil-row"><Lozenge onClick={() => chooseLang('he')} label="עברית"><span className="text-3xl" aria-hidden>🇮🇱</span><span className="text-2xl font-black" lang="he">עברית</span></Lozenge></div>
        </div>
      </div>
    </Shell>
  );

  const L = t[lang];
  const he = lang === 'he';
  const s = state;
  const me = s?.player && identity ? s.player : null;
  const q = s?.question;
  const opts = q ? (he ? q.options_he : q.options_fr) : [];
  const remaining = s?.deadline ? Math.max(0, Math.ceil((new Date(s.deadline).getTime() - (now + offset.current)) / 1000)) : 0;
  const myChoice = me?.choice ?? (pending && q && pending.q === q.id ? pending.choice : undefined);

  const header = (
    <header className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <MilLogo size={50} />
        <div className="min-w-0">
          <p className="font-black text-base leading-tight">{L.title}</p>
          {me && <p className="text-sm font-bold mil-gold">{me.nickname} · {L.myTable} {me.table_number}</p>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <button onClick={() => chooseLang(he ? 'fr' : 'he')} className="mil-chip" lang={he ? 'fr' : 'he'} aria-label={he ? 'Passer en français' : 'מעבר לעברית'}>{he ? '🇫🇷' : '🇮🇱'} {L.switchLang}</button>
      </div>
    </header>
  );

  const scoreBar = me && s?.status !== 'idle' && s?.status !== 'lobby' && (
    <div className="flex justify-center mb-5"><span className="mil-badge text-lg">💰 {me.score} {L.points}</span></div>
  );

  let body: React.ReactNode;
  if (!s) body = <Panel><p className="text-center text-lg">{offline ? L.errors.network : '…'}</p></Panel>;
  else if (s.status === 'idle') body = <Panel><p className="text-6xl text-center mb-4" aria-hidden>⛺</p><p className="text-center text-xl font-bold">{L.closed}</p></Panel>;
  else if (!me && s.status !== 'finished') body = (
    <Panel>
      <h1 className="mil-title text-3xl mb-1">{L.title}</h1>
      <p className="mb-6 mil-muted font-semibold">{L.subtitle}</p>
      <form onSubmit={join} className="space-y-5">
        <label>{L.nickname}<input className="mil-field" maxLength={30} autoComplete="nickname" value={nickname} onChange={e => setNickname(e.target.value)} required /></label>
        <label>{L.table}<input className="mil-field text-center !text-4xl" inputMode="numeric" pattern="[0-9]*" min={1} max={500} type="number" value={table} onChange={e => setTable(e.target.value)} required /></label>
        <button className="mil-btn" disabled={busy}>{busy ? L.joining : L.join} <span aria-hidden>💎</span></button>
        {error && <p role="alert" className="font-bold text-[#ffb4a8]">{error}</p>}
      </form>
    </Panel>
  );
  else if (s.status === 'lobby') body = (
    <Panel>
      <p className="text-6xl text-center mb-3 animate-bounce" aria-hidden>{s.index >= 0 ? '🏆' : '💎'}</p>
      <p className="text-center text-2xl font-black mb-7">{s.index >= 0 ? L.warmupDone : L.waitingStart}</p>
      <QuizGauge players={s.players} expected={s.expected_players} warmupPct={s.warmup_start_pct} gamePct={s.game_start_pct}
        labels={{ title: L.presence, warmup: L.warmupAt, game: L.gameAt }} />
      <p className="text-center mt-7 font-bold mil-gold">📲 {L.inviteFriends}</p>
    </Panel>
  );
  else if ((s.status === 'question' || s.status === 'reveal') && q) {
    const reveal = s.status === 'reveal' ? s.reveal : undefined;
    const ok = me?.correct === true; const none = myChoice === undefined;
    const closed = s.status === 'question' && remaining === 0;
    body = (
      <div>
        <QuestionHead lang={lang} s={s} remaining={remaining} />
        <div className="grid gap-3" role="group" aria-label={he ? q.question_he : q.question_fr}>
          {opts.map((o, i) => {
            const st = reveal ? (i === reveal.correct_index ? 'correct' : i === myChoice ? 'locked' : 'dim')
              : myChoice !== undefined ? (i === myChoice ? 'locked' : 'dim') : '';
            const clickable = s.status === 'question' && myChoice === undefined && !closed && !pending;
            return (
              <div key={i} className="mil-row">
                <Lozenge state={st} onClick={clickable ? () => answer(i) : undefined} label={`${LETTERS[i]} : ${o}`} tip={22}>
                  <span className="mil-letter text-2xl">{LETTERS[i]}</span><span className="mil-ans-text text-xl">{o}</span>
                </Lozenge>
              </div>
            );
          })}
        </div>
        {s.status === 'question' && (
          <p className="text-center mt-6 text-lg font-bold" role="status">
            {myChoice !== undefined ? <>🔒 {L.answered} <span className="mil-muted font-semibold">— {L.answeredHint}</span></> : closed ? <>⏰ {L.timeUp}</> : null}
          </p>
        )}
        {reveal && (
          <Panel className="mt-6 mil-pop">
            <p className="text-center text-3xl font-black">{none ? '🤔 ' + L.noAnswer : ok ? '🎉 ' + L.correct : '💪 ' + L.wrong}</p>
            {ok && !q.warmup && <p className="text-center text-2xl font-black mil-gold mt-1">+{me?.points} {L.points}</p>}
            {q.warmup && <p className="text-center text-sm mil-muted mt-1">{L.warmupNoPoints}</p>}
            <p className="mt-4 text-lg leading-relaxed">{he ? reveal.explanation_he : reveal.explanation_fr}</p>
            {reveal.source_label && <p className="mt-3 text-sm mil-muted">{L.source} : {reveal.source_url ? <a className="underline mil-gold" href={reveal.source_url} target="_blank" rel="noreferrer">{reveal.source_label}</a> : reveal.source_label}</p>}
            {me?.table_rank && !q.warmup && <p className="mt-5 text-center text-lg font-bold">{L.tableRank} : <span className="mil-title text-3xl">#{me.table_rank}</span></p>}
          </Panel>
        )}
        {reveal && <p className="text-center mt-4 mil-muted font-semibold">{L.waitingNext}</p>}
      </div>
    );
  } else if (s.status === 'finished') body = (
    <Panel>
      <p className="text-6xl text-center mb-3" aria-hidden>🏆</p>
      <p className="text-center text-3xl font-black">{L.finished}</p>
      {me && <><p className="text-center mt-5 text-lg mil-muted font-bold">{L.finalScore}</p><p className="text-center text-6xl mil-title">{me.score}</p>
        {me.table_rank && <p className="text-center mt-3 text-lg font-bold">{L.tableRank} : <span className="mil-gold">#{me.table_rank}</span></p>}</>}
      {s.tables && s.tables.length > 0 && <Leaderboard lang={lang} rows={s.tables.slice(0, 5)} highlight={me?.table_number} />}
    </Panel>
  );
  else body = <Panel><p className="text-center text-xl">{L.waitingNext}</p></Panel>;

  return (
    <Shell lang={lang}>
      {header}
      {offline && s && <p role="status" className="mb-3 text-center text-sm font-bold text-[#ffd08a]">{L.errors.network}</p>}
      {scoreBar}
      {body}
      {me && s?.status !== 'finished' && <button onClick={changePlayer} className="block mx-auto mt-10 text-sm underline mil-muted">{L.changePlayer}</button>}
    </Shell>
  );
}

function Shell({ children, lang }: { children: React.ReactNode; lang?: Lang }) {
  return <main className="mil" dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang || 'fr'}><div className="max-w-lg mx-auto px-4 pb-12 pt-6">{children}</div></main>;
}
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={'mil-panel ' + className}>{children}</section>; }

function QuestionHead({ lang, s, remaining }: { lang: Lang; s: QuizState; remaining: number }) {
  const L = t[lang]; const q = s.question!; const cat = categories[q.category];
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          {q.warmup
            ? <span className="mil-badge text-sm">🔥 {L.warmupBadge}</span>
            : <p className="font-black mil-gold text-lg">{L.question} {s.index + 1 - s.warmups} <span className="mil-muted font-bold">{L.of} {s.total - s.warmups}</span></p>}
          <p className="text-sm font-bold mil-muted mt-1">{q.warmup ? (q.warmup === 'seniors' ? L.warmupSeniors : L.warmupJuniors) : <>{cat?.emoji} {cat?.[lang]}</>}</p>
        </div>
        {s.status === 'question' && <Ring remaining={remaining} total={q.time_limit_s} size={78} />}
      </div>
      <div className="mil-row"><Lozenge question tip={22}><h1 className="text-[1.45rem] font-black leading-snug py-2">{stripWarmup(lang === 'he' ? q.question_he : q.question_fr)}</h1></Lozenge></div>
    </div>
  );
}
