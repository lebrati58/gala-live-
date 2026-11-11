'use client';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import GalaLogo from '@/components/gala-logo';
import QuizGauge from '@/components/quiz-gauge';
import { answerStyles, categories, QuizState } from '@/lib/quiz-i18n';

type Q = {
  id?: string; position: number; category: string; warmup: '' | 'seniors' | 'juniors';
  question_fr: string; question_he: string; options_fr: string[]; options_he: string[]; correct_index: number;
  explanation_fr: string; explanation_he: string; source_label: string; source_url: string; time_limit_s: number; active: boolean;
};
type AdminState = QuizState & { env: 'production' | 'preview'; error?: string };

const emptyQ = (position: number): Q => ({
  position, category: 'israel', warmup: '', question_fr: '', question_he: '', options_fr: ['', '', '', ''], options_he: ['', '', '', ''],
  correct_index: 0, explanation_fr: '', explanation_he: '', source_label: '', source_url: '', time_limit_s: 20, active: true,
});
const STATUS: Record<string, string> = { idle: 'Fermé', lobby: 'Salle d’attente (inscriptions)', question: 'Question en cours', reveal: 'Réponse affichée', finished: 'Terminé' };

export default function QuizAdmin() {
  const [st, setSt] = useState<AdminState | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [editing, setEditing] = useState<Q | null>(null);
  const [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const [settings, setSettings] = useState({ expected_players: 300, warmup_start_pct: 50, game_start_pct: 80, auto_start: true });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [qrSvg, setQrSvg] = useState(''), [joinUrl, setJoinUrl] = useState('');

  const loadState = useCallback(async () => {
    const r = await fetch('/api/admin/quiz/control', { cache: 'no-store' });
    if (r.status === 401) { window.location.href = '/admin/login'; return; }
    if (r.ok) setSt(await r.json());
  }, []);
  const loadQuestions = useCallback(async () => {
    const r = await fetch('/api/admin/quiz/questions', { cache: 'no-store' });
    if (r.ok) setQuestions((await r.json()).map((q: Q & { warmup: string | null }) => ({ ...q, warmup: q.warmup || '' })));
  }, []);

  useEffect(() => {
    loadState(); loadQuestions();
    const url = window.location.origin + '/quiz'; setJoinUrl(url);
    QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' }).then(setQrSvg).catch(() => {});
    const t = setInterval(loadState, 2000); return () => clearInterval(t);
  }, [loadState, loadQuestions]);

  useEffect(() => {
    if (st && !settingsDirty) setSettings({ expected_players: st.expected_players, warmup_start_pct: st.warmup_start_pct, game_start_pct: st.game_start_pct, auto_start: st.auto_start });
  }, [st, settingsDirty]);

  function flash(m: string, isErr = false) { if (isErr) { setErr(m); setMsg(''); } else { setMsg(m); setErr(''); } setTimeout(() => { setMsg(''); setErr(''); }, 5000); }

  async function control(action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    const r = await fetch('/api/admin/quiz/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const d = await r.json();
    if (!r.ok) return flash(d.error || 'Erreur', true);
    setSt(d);
  }
  async function saveSettings() {
    const r = await fetch('/api/admin/quiz/control', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    const d = await r.json();
    if (!r.ok) return flash(d.error || 'Erreur', true);
    setSt(d); setSettingsDirty(false); flash('Réglages enregistrés');
  }
  async function saveQuestion(q: Q) {
    const r = await fetch('/api/admin/quiz/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    const d = await r.json();
    if (!r.ok) return flash(d.error || 'Erreur', true);
    flash('Question enregistrée'); setEditing(null); loadQuestions();
  }
  async function removeQuestion(q: Q) {
    if (!q.id || !window.confirm('Supprimer définitivement cette question ?\n\n' + q.question_fr)) return;
    const r = await fetch('/api/admin/quiz/questions?id=' + q.id, { method: 'DELETE' });
    if (!r.ok) return flash('Suppression impossible', true);
    flash('Question supprimée'); loadQuestions();
  }
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= questions.length) return;
    const a = questions[i], b = questions[j];
    await Promise.all([saveSilently({ ...a, position: b.position }), saveSilently({ ...b, position: a.position === b.position ? a.position + dir : a.position })]);
    loadQuestions();
  }
  async function saveSilently(q: Q) { await fetch('/api/admin/quiz/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) }); }
  async function toggleActive(q: Q) { await saveSilently({ ...q, active: !q.active }); loadQuestions(); }

  function downloadQr() {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qr-quiz-gala.svg'; a.click();
  }

  const running = st && ['lobby', 'question', 'reveal'].includes(st.status);
  const cur = st?.question;
  const activeCount = questions.filter(q => q.active).length;
  const warmCount = questions.filter(q => q.active && q.warmup).length;

  return (
    <main className="max-w-6xl mx-auto p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4"><GalaLogo size={60} /><h1 className="text-3xl md:text-4xl gold font-bold">Quiz · Admin</h1></div>
        <div className="flex flex-wrap gap-2 items-center">
          {st && <span className={'rounded-full px-3 py-1 text-sm font-bold ' + (st.env === 'production' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900')}>{st.env === 'production' ? '● PRODUCTION' : '● PRÉPROD'}</span>}
          <a className="btn !py-2 !px-4 text-sm" href="/quiz/ecran" target="_blank" rel="noreferrer">Écran géant ↗</a>
          <a className="btn !py-2 !px-4 text-sm" href="/quiz" target="_blank" rel="noreferrer">Vue joueur ↗</a>
          <a className="text-sm underline" href="/admin">← Dons</a>
        </div>
      </div>
      {(msg || err) && <p role="status" className={'mb-4 rounded-xl px-4 py-3 font-semibold ' + (err ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800')}>{err || msg}</p>}

      <div className="grid lg:grid-cols-[3fr_2fr] gap-5 mb-5">
        <section className="panel">
          <h2 className="text-2xl font-bold mb-3">Pilotage en direct</h2>
          {st ? <>
            <p className="text-lg"><strong>État :</strong> {STATUS[st.status]}{st.status === 'lobby' && st.index >= 0 ? ' — échauffement terminé, attente du palier de jeu' : ''}</p>
            <p className="mb-1"><strong>Joueurs inscrits :</strong> {st.players}{cur ? <> · <strong>Réponses :</strong> {st.answers}</> : null}</p>
            {cur && <p className="mb-3"><strong>{cur.warmup ? '🔥 Échauffement' : `Question ${st.index + 1 - st.warmups} / ${st.total - st.warmups}`} :</strong> {cur.question_fr}</p>}
            {running && <div className="quiz-admin-gauge rounded-2xl p-4 mb-4"><QuizGauge players={st.players} expected={st.expected_players} warmupPct={st.warmup_start_pct} gamePct={st.game_start_pct} labels={{ title: 'Présence', warmup: 'Échauffement à', game: 'Jeu à' }} /></div>}
            <div className="flex flex-wrap gap-2 mt-3">
              <button className="btn" onClick={() => control('open', running ? 'Une partie est en cours. Ouvrir une NOUVELLE partie remet tous les scores à zéro. Continuer ?' : undefined)}>{running ? '↺ Nouvelle partie' : '▶ Ouvrir le quiz'}</button>
              <button className="btn" disabled={!running} onClick={() => control('next')}>{st.status === 'lobby' ? (st.next_is_warmup ? '🔥 Lancer l’échauffement' : '🏁 Lancer le grand jeu') : '⏭ Question suivante'}</button>
              <button className="btn" disabled={st.status !== 'question'} onClick={() => control('reveal')}>👁 Révéler maintenant</button>
              <button className="btn" disabled={!running} onClick={() => control('finish', 'Terminer le quiz et afficher le podium ?')}>🏆 Terminer</button>
              <button className="btn !bg-white !text-[#172c43]" disabled={st.status === 'idle'} onClick={() => control('close', 'Fermer le quiz ? Les joueurs ne pourront plus s’inscrire.')}>■ Fermer</button>
            </div>
            <p className="text-sm text-slate-500 mt-3">À la fin du chrono, la réponse s’affiche automatiquement. Les échauffements s’enchaînent seuls ; les questions du grand jeu attendent votre clic sur « Question suivante ».</p>
          </> : <p>Chargement…</p>}
        </section>

        <section className="panel">
          <h2 className="text-2xl font-bold mb-3">QR code unique</h2>
          <div className="flex gap-4 items-center">
            {qrSvg && <div className="w-36 shrink-0" dangerouslySetInnerHTML={{ __html: qrSvg }} role="img" aria-label="QR code du quiz" />}
            <div><p className="text-sm break-all mb-3">{joinUrl}</p><button className="btn !py-2 text-sm" onClick={downloadQr}>Télécharger (SVG)</button>
              <p className="text-xs text-slate-500 mt-2">Le même QR sert au français et à l’hébreu : chacun choisit sa langue en arrivant.</p></div>
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <section className="panel">
          <h2 className="text-2xl font-bold mb-3">Réglages de la salle</h2>
          <div className="grid grid-cols-3 gap-3">
            <label>Convives attendus<input className="field" type="number" min={1} max={5000} value={settings.expected_players} onChange={e => { setSettingsDirty(true); setSettings({ ...settings, expected_players: Number(e.target.value) }); }} /></label>
            <label>Échauffement à (%)<input className="field" type="number" min={1} max={100} value={settings.warmup_start_pct} onChange={e => { setSettingsDirty(true); setSettings({ ...settings, warmup_start_pct: Number(e.target.value) }); }} /></label>
            <label>Grand jeu à (%)<input className="field" type="number" min={1} max={100} value={settings.game_start_pct} onChange={e => { setSettingsDirty(true); setSettings({ ...settings, game_start_pct: Number(e.target.value) }); }} /></label>
          </div>
          <label className="flex items-center gap-2 mt-4"><input type="checkbox" checked={settings.auto_start} onChange={e => { setSettingsDirty(true); setSettings({ ...settings, auto_start: e.target.checked }); }} /> Démarrage automatique quand les paliers sont atteints</label>
          <p className="text-sm text-slate-500 mt-2">Avec {settings.expected_players} convives : échauffement à {Math.ceil(settings.expected_players * settings.warmup_start_pct / 100)} inscrits, grand jeu à {Math.ceil(settings.expected_players * settings.game_start_pct / 100)} inscrits.</p>
          <button className="btn mt-4" disabled={!settingsDirty} onClick={saveSettings}>Enregistrer les réglages</button>
        </section>

        <section className="panel">
          <h2 className="text-2xl font-bold mb-3">Classement des tables</h2>
          <p className="text-sm text-slate-500 mb-3">Moyenne des points par joueur (les tables nombreuses ne sont pas avantagées). Échauffements non comptés.</p>
          {st?.tables && st.tables.length > 0 ? (
            <div className="max-h-72 overflow-y-auto"><table className="w-full text-left"><thead><tr><th>#</th><th>Table</th><th>Joueurs</th><th>Total</th><th>Moyenne</th></tr></thead>
              <tbody>{st.tables.map((r, i) => <tr key={r.table_number} className="border-t"><td className="py-1">{i + 1}</td><td>{r.table_number}</td><td>{r.players}</td><td>{r.total}</td><td className="font-bold">{r.avg_points}</td></tr>)}</tbody></table></div>
          ) : <p className="text-slate-500">Aucun joueur pour l’instant.</p>}
        </section>
      </div>

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Questions ({activeCount} actives dont {warmCount} d’échauffement)</h2>
          <button className="btn" onClick={() => setEditing(emptyQ((questions.at(-1)?.position || 0) + 10))}>＋ Nouvelle question</button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Les modifications s’appliquent à la prochaine partie ouverte. Les échauffements passent toujours en premier.</p>
        <ol className="space-y-2">
          {questions.map((q, i) => (
            <li key={q.id} className={'rounded-xl border p-3 flex flex-wrap items-center gap-3 ' + (q.active ? '' : 'opacity-50')}>
              <div className="flex flex-col"><button aria-label="Monter" className="px-2" onClick={() => move(i, -1)}>▲</button><button aria-label="Descendre" className="px-2" onClick={() => move(i, 1)}>▼</button></div>
              <div className="flex-1 min-w-[240px]">
                <p className="text-xs font-bold text-slate-500">{q.warmup ? `🔥 Échauffement (${q.warmup === 'seniors' ? 'anciens' : 'jeunes'})` : `${categories[q.category]?.emoji} ${categories[q.category]?.fr}`} · {q.time_limit_s} s{q.source_label ? '' : ' · ⚠ sans source'}</p>
                <p className="font-semibold">{q.question_fr}</p>
                <p dir="rtl" lang="he" className="text-slate-600">{q.question_he}</p>
                <p className="text-sm mt-1">✔ <span style={{ color: answerStyles[q.correct_index].bg }} className="font-bold">{answerStyles[q.correct_index].shape}</span> {q.options_fr[q.correct_index]} · <span dir="rtl" lang="he">{q.options_he[q.correct_index]}</span></p>
              </div>
              <div className="flex gap-2">
                <button className="btn !py-2 !px-3 text-sm" onClick={() => setEditing({ ...q })}>Modifier</button>
                <button className="btn !py-2 !px-3 text-sm !bg-white !text-[#172c43]" onClick={() => toggleActive(q)}>{q.active ? 'Désactiver' : 'Activer'}</button>
                <button className="btn !py-2 !px-3 text-sm !bg-rose-700 !border-rose-700" onClick={() => removeQuestion(q)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {editing && <Editor q={editing} onCancel={() => setEditing(null)} onSave={saveQuestion} />}
    </main>
  );
}

function Editor({ q: initial, onCancel, onSave }: { q: Q; onCancel: () => void; onSave: (q: Q) => void }) {
  const [q, setQ] = useState<Q>(initial);
  const setOpt = (lang: 'fr' | 'he', i: number, v: string) => {
    const key = lang === 'fr' ? 'options_fr' : 'options_he'; const next = [...q[key]]; next[i] = v; setQ({ ...q, [key]: next });
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Éditer la question">
      <form className="panel max-w-4xl mx-auto my-6" onSubmit={e => { e.preventDefault(); onSave(q); }}>
        <h2 className="text-2xl font-bold mb-4">{q.id ? 'Modifier la question' : 'Nouvelle question'}</h2>
        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <label>Catégorie<select className="field" value={q.category} onChange={e => setQ({ ...q, category: e.target.value })}>{Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.fr}</option>)}</select></label>
          <label>Type<select className="field" value={q.warmup} onChange={e => setQ({ ...q, warmup: e.target.value as Q['warmup'] })}><option value="">Grand jeu (noté)</option><option value="seniors">Échauffement — anciens 👴</option><option value="juniors">Échauffement — jeunes 🧒</option></select></label>
          <label>Durée (s)<input className="field" type="number" min={5} max={120} value={q.time_limit_s} onChange={e => setQ({ ...q, time_limit_s: Number(e.target.value) })} /></label>
          <label>Ordre<input className="field" type="number" value={q.position} onChange={e => setQ({ ...q, position: Number(e.target.value) })} /></label>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <label>Question 🇫🇷<textarea className="field" rows={2} maxLength={400} value={q.question_fr} onChange={e => setQ({ ...q, question_fr: e.target.value })} required /></label>
          <label>שאלה 🇮🇱<textarea className="field" dir="rtl" lang="he" rows={2} maxLength={400} value={q.question_he} onChange={e => setQ({ ...q, question_he: e.target.value })} required /></label>
        </div>
        <fieldset className="mt-4"><legend className="font-semibold mb-2">Réponses — cochez la bonne</legend>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center mb-2">
              <label className="flex items-center gap-2 font-bold" style={{ color: answerStyles[i].bg }}><input type="radio" name="correct" checked={q.correct_index === i} onChange={() => setQ({ ...q, correct_index: i })} /> {answerStyles[i].shape}</label>
              <input className="field !mt-0" placeholder={`Réponse ${answerStyles[i].label} (FR)`} maxLength={120} value={q.options_fr[i]} onChange={e => setOpt('fr', i, e.target.value)} required />
              <input className="field !mt-0" dir="rtl" lang="he" placeholder={`תשובה ${answerStyles[i].label}`} maxLength={120} value={q.options_he[i]} onChange={e => setOpt('he', i, e.target.value)} required />
            </div>
          ))}
        </fieldset>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <label>Explication 🇫🇷<textarea className="field" rows={3} maxLength={600} value={q.explanation_fr} onChange={e => setQ({ ...q, explanation_fr: e.target.value })} /></label>
          <label>הסבר 🇮🇱<textarea className="field" dir="rtl" lang="he" rows={3} maxLength={600} value={q.explanation_he} onChange={e => setQ({ ...q, explanation_he: e.target.value })} /></label>
          <label>Source (nom)<input className="field" maxLength={200} value={q.source_label} onChange={e => setQ({ ...q, source_label: e.target.value })} placeholder="ex. Wikipedia — …" /></label>
          <label>Source (lien https://)<input className="field" maxLength={500} value={q.source_url} onChange={e => setQ({ ...q, source_url: e.target.value })} /></label>
        </div>
        <label className="flex items-center gap-2 mt-4"><input type="checkbox" checked={q.active} onChange={e => setQ({ ...q, active: e.target.checked })} /> Question active</label>
        <div className="flex gap-3 mt-6"><button className="btn">Enregistrer</button><button type="button" className="btn !bg-white !text-[#172c43]" onClick={onCancel}>Annuler</button></div>
      </form>
    </div>
  );
}
