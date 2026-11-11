import { NextRequest, NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/auth';
import { isUuid, quizAdminKey, quizDb } from '@/lib/quiz-db';

export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const CATS = ['ei_israel', 'eeif', 'scoutisme', 'israel'];
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const opts = (v: unknown) => (Array.isArray(v) && v.length === 4 ? v.map(o => str(o, 120)) : null);

export async function GET() {
  if (!adminAuthorized()) return unauthorized();
  const { data, error } = await quizDb().rpc('quiz_admin_questions', { p_key: quizAdminKey() });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!adminAuthorized()) return unauthorized();
  const b = await req.json();
  const q = {
    id: isUuid(b?.id) ? b.id : undefined,
    position: Number.isInteger(b?.position) ? b.position : undefined,
    category: CATS.includes(b?.category) ? b.category : null,
    question_fr: str(b?.question_fr, 400), question_he: str(b?.question_he, 400),
    options_fr: opts(b?.options_fr), options_he: opts(b?.options_he),
    correct_index: Number(b?.correct_index),
    explanation_fr: str(b?.explanation_fr, 600), explanation_he: str(b?.explanation_he, 600),
    source_label: str(b?.source_label, 200), source_url: str(b?.source_url, 500),
    time_limit_s: Number(b?.time_limit_s) || 20, active: b?.active !== false,
  };
  const problems: string[] = [];
  if (!q.category) problems.push('catégorie');
  if (q.question_fr.length < 3 || q.question_he.length < 3) problems.push('question FR et HE');
  if (!q.options_fr || !q.options_he || [...q.options_fr, ...q.options_he].some(o => !o)) problems.push('les 4 réponses en FR et en HE');
  if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index > 3) problems.push('bonne réponse');
  if (q.time_limit_s < 5 || q.time_limit_s > 120) problems.push('durée (5 à 120 s)');
  if (q.source_url && !/^https:\/\//.test(q.source_url)) problems.push('lien source (https://)');
  if (problems.length) return NextResponse.json({ error: 'À compléter : ' + problems.join(', ') }, { status: 400 });
  const { data, error } = await quizDb().rpc('quiz_admin_save_question', { p_key: quizAdminKey(), p_q: q });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true, id: data });
}

export async function DELETE(req: NextRequest) {
  if (!adminAuthorized()) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { error } = await quizDb().rpc('quiz_admin_delete_question', { p_key: quizAdminKey(), p_id: id });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
