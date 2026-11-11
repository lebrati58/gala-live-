'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import GalaLogo from '@/components/gala-logo';
import QuizGauge from '@/components/quiz-gauge';
import { answerStyles, categories, Lang, QuizState, t } from '@/lib/quiz-i18n';
import { Leaderboard, stripWarmup } from '@/components/quiz-ui';

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

  if (!ready) return <Shell><p className="text-center text-xl">…</p></Shell>;

  // 1) Choix de la langue, dès l'entrée
  if (!lang) return (
    <Shell>
      <div className="text-center">
        <div className="flex justify-center mb-4"><GalaLogo size={96} /></div>
        <h1 className="text-3xl font-black mb-1">Le grand quiz du gala</h1>
        <h1 className="text-3xl font-black mb-8" dir="rtl" lang="he">החידון הגדול של הגאלה</h1>
        <p className="mb-4 text-lg font-semibold">Choisissez votre langue · <span dir="rtl" lang="he">בחרו שפה</span></p>
        <div className="grid gap-4">
          <button className="quiz-big-btn" onClick={() => chooseLang('fr')}><span className="text-4xl" aria-hidden>🇫🇷</span> Français</button>
          <button className="quiz-big-btn" onClick={() => chooseLang('he')} lang="he"><span className="text-4xl" aria-hidden>🇮🇱</span> עברית</button>
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
    <header className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0"><GalaLogo size={46} /><div className="min-w-0"><p className="font-black text-lg leading-tight truncate">{L.title}</p>{me && <p className="text-sm opacity-80 truncate">{me.nickname} · {L.myTable} {me.table_number} · {me.score} {L.points}</p>}</div></div>
      <button onClick={() => chooseLang(he ? 'fr' : 'he')} className="quiz-lang-btn" lang={he ? 'fr' : 'he'} aria-label={he ? 'Passer en français' : 'מעבר לעברית'}>{he ? '🇫🇷' : '🇮🇱'} {L.switchLang}</button>
    </header>
  );

  let body: React.ReactNode;
  if (!s) body = <Card><p className="text-center text-lg">{offline ? L.errors.network : '…'}</p></Card>;
  else if (s.status === 'idle') body = <Card><p className="text-6xl text-center mb-4" aria-hidden>⛺</p><p className="text-center text-xl font-semibold">{L.closed}</p></Card>;
  else if (!me && s.status !== 'finished') body = (
    <Card>
      <h1 className="text-2xl font-black mb-1">{L.title}</h1>
      <p className="mb-6 opacity-80">{L.subtitle}</p>
      <form onSubmit={join} className="space-y-5">
        <label className="block text-lg font-bold">{L.nickname}<input className="quiz-field" maxLength={30} autoComplete="nickname" value={nickname} onChange={e => setNickname(e.target.value)} required /></label>
        <label className="block text-lg font-bold">{L.table}<input className="quiz-field text-center text-3xl font-black" inputMode="numeric" pattern="[0-9]*" min={1} max={500} type="number" value={table} onChange={e => setTable(e.target.value)} required /></label>
        <button className="quiz-big-btn w-full" disabled={busy}>{busy ? L.joining : L.join} <span aria-hidden>🎉</span></button>
        {error && <p role="alert" className="text-rose-200 font-semibold">{error}</p>}
      </form>
    </Card>
  );
  else if (s.status === 'lobby') body = (
    <Card>
      <p className="text-6xl text-center mb-4 animate-bounce" aria-hidden>{s.index >= 0 ? '🏁' : '🎲'}</p>
      <p className="text-center text-2xl font-black mb-6">{s.index >= 0 ? L.warmupDone : L.waitingStart}</p>
      <QuizGauge players={s.players} expected={s.expected_players} warmupPct={s.warmup_start_pct} gamePct={s.game_start_pct}
        labels={{ title: L.presence, warmup: L.warmupAt, game: L.gameAt }} />
      <p className="text-center mt-6 font-semibold">📲 {L.inviteFriends}</p>
    </Card>
  );
  else if (s.status === 'question' && q) body = (
    <div>
      <QuestionHead lang={lang} s={s} remaining={remaining} />
      {myChoice !== undefined ? (
        <Card><p className="text-6xl text-center mb-3" aria-hidden>✅</p><p className="text-center text-2xl font-black">{L.answered}</p>
          <div className="mt-4 rounded-2xl p-4 text-white font-bold text-xl flex items-center gap-3" style={{ background: answerStyles[myChoice].bg }}><span aria-hidden className="text-2xl">{answerStyles[myChoice].shape}</span>{opts[myChoice]}</div>
          <p className="text-center mt-4 opacity-80">{L.answeredHint}</p></Card>
      ) : remaining === 0 ? <Card><p className="text-center text-2xl font-black">⏰ {L.timeUp}</p></Card> : (
        <div className="grid gap-3" role="group" aria-label={he ? q.question_he : q.question_fr}>
          {opts.map((o, i) => <button key={i} onClick={() => answer(i)} disabled={!!pending} className="quiz-answer" style={{ background: answerStyles[i].bg }}><span aria-hidden className="text-3xl shrink-0">{answerStyles[i].shape}</span><span>{o}</span></button>)}
        </div>
      )}
    </div>
  );
  else if (s.status === 'reveal' && q && s.reveal) {
    const ok = me?.correct === true; const none = myChoice === undefined;
    body = (
      <div>
        <QuestionHead lang={lang} s={s} remaining={0} />
        <Card>
          <p className="text-6xl text-center mb-2" aria-hidden>{none ? '🤔' : ok ? '🎉' : '💪'}</p>
          <p className="text-center text-3xl font-black mb-1">{none ? L.noAnswer : ok ? L.correct : L.wrong}</p>
          {ok && !q.warmup && <p className="text-center text-xl font-bold text-amber-200">+{me?.points} {L.points}</p>}
          {q.warmup && <p className="text-center text-sm opacity-80">{L.warmupNoPoints}</p>}
          <p className="mt-5 font-bold">{L.goodAnswerWas}</p>
          <div className="mt-2 rounded-2xl p-4 text-white font-bold text-xl flex items-center gap-3" style={{ background: answerStyles[s.reveal.correct_index].bg }}><span aria-hidden className="text-2xl">{answerStyles[s.reveal.correct_index].shape}</span>{opts[s.reveal.correct_index]}</div>
          <p className="mt-4 text-lg leading-relaxed">{he ? s.reveal.explanation_he : s.reveal.explanation_fr}</p>
          {s.reveal.source_label && <p className="mt-3 text-sm opacity-70">{L.source} : {s.reveal.source_url ? <a className="underline" href={s.reveal.source_url} target="_blank" rel="noreferrer">{s.reveal.source_label}</a> : s.reveal.source_label}</p>}
          {me?.table_rank && <p className="mt-5 text-center text-lg font-bold">{L.tableRank} : <span className="text-amber-200 text-2xl">#{me.table_rank}</span></p>}
        </Card>
        <p className="text-center mt-4 opacity-80">{L.waitingNext}</p>
      </div>
    );
  } else if (s.status === 'finished') body = (
    <Card>
      <p className="text-6xl text-center mb-3" aria-hidden>🏆</p>
      <p className="text-center text-3xl font-black">{L.finished}</p>
      {me && <><p className="text-center mt-4 text-lg">{L.finalScore}</p><p className="text-center text-5xl font-black text-amber-200">{me.score}</p>
        {me.table_rank && <p className="text-center mt-3 text-lg font-bold">{L.tableRank} : #{me.table_rank}</p>}</>}
      {s.tables && s.tables.length > 0 && <Leaderboard lang={lang} rows={s.tables.slice(0, 5)} highlight={me?.table_number} />}
    </Card>
  );
  else body = <Card><p className="text-center text-xl">{L.waitingNext}</p></Card>;

  return (
    <Shell lang={lang}>
      {header}
      {offline && s && <p role="status" className="mb-3 text-center text-sm text-amber-200">{L.errors.network}</p>}
      {body}
      {me && s?.status !== 'finished' && <button onClick={changePlayer} className="block mx-auto mt-8 text-sm underline opacity-60">{L.changePlayer}</button>}
    </Shell>
  );
}

function Shell({ children, lang }: { children: React.ReactNode; lang?: Lang }) {
  return <main className="quiz-screen min-h-screen" dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang || 'fr'}><div className="max-w-lg mx-auto p-4 pb-12 pt-6">{children}</div></main>;
}
function Card({ children }: { children: React.ReactNode }) { return <section className="quiz-card">{children}</section>; }

function QuestionHead({ lang, s, remaining }: { lang: Lang; s: QuizState; remaining: number }) {
  const L = t[lang]; const q = s.question!; const cat = categories[q.category];
  const pct = s.status === 'question' ? Math.min(100, (remaining / q.time_limit_s) * 100) : 0;
  return (
    <div className="mb-4">
      {q.warmup ? (
        <div className="quiz-warmup-badge mb-3">🔥 {L.warmupBadge} — {q.warmup === 'seniors' ? L.warmupSeniors : L.warmupJuniors}</div>
      ) : (
        <div className="flex items-center justify-between text-sm font-bold mb-2 opacity-90">
          <span>{cat?.emoji} {cat?.[lang]}</span>
          <span>{L.question} {s.index + 1 - s.warmups} {L.of} {s.total - s.warmups}</span>
        </div>
      )}
      {s.status === 'question' && <div className="flex items-center gap-3 mb-3"><div className="quiz-timer flex-1" aria-hidden><div style={{ width: pct + '%' }} /></div><span className="font-black text-2xl tabular-nums w-14 text-center" aria-live="off">{remaining}{L.secondsLeft}</span></div>}
      <h1 className="text-2xl font-black leading-snug">{stripWarmup(lang === 'he' ? q.question_he : q.question_fr)}</h1>
    </div>
  );
}

