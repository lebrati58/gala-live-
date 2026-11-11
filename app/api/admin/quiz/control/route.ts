import { NextRequest, NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/auth';
import { quizAdminKey, quizDb, quizEnv } from '@/lib/quiz-db';

export const dynamic = 'force-dynamic';
const ACTIONS = ['open', 'next', 'reveal', 'finish', 'close'];
const MESSAGES: Record<string, string> = {
  'no active question': 'Aucune question active.',
  'quiz not running': 'Le quiz n’est pas ouvert.',
  'no question running': 'Aucune question en cours.',
  'quiz not opened': 'Le quiz n’a jamais été ouvert.',
};

// État complet (classement de toutes les tables) pour le panneau admin.
export async function GET() {
  if (!adminAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await quizDb().rpc('quiz_state_get', { p_env: quizEnv(), p_full: true });
  return error ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ ...data, env: quizEnv() }, { headers: { 'Cache-Control': 'no-store' } });
}

// Réglages : convives attendus, paliers de présence (échauffement / jeu), démarrage automatique.
export async function PUT(req: NextRequest) {
  if (!adminAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const expected = Number(b?.expected_players), w = Number(b?.warmup_start_pct), g = Number(b?.game_start_pct);
  if (!Number.isInteger(expected) || expected < 1 || expected > 5000) return NextResponse.json({ error: 'Nombre de convives : entre 1 et 5000.' }, { status: 400 });
  if (![w, g].every(v => Number.isInteger(v) && v >= 1 && v <= 100) || w > g)
    return NextResponse.json({ error: 'Paliers entre 1 et 100 %, celui de l’échauffement inférieur ou égal à celui du jeu.' }, { status: 400 });
  const { data, error } = await quizDb().rpc('quiz_admin_settings', {
    p_key: quizAdminKey(), p_env: quizEnv(), p_expected: expected, p_warmup_pct: w, p_game_pct: g, p_auto: b?.auto_start !== false,
  });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ...data, env: quizEnv() });
}

export async function POST(req: NextRequest) {
  if (!adminAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action } = await req.json();
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  const { data, error } = await quizDb().rpc('quiz_admin_control', { p_key: quizAdminKey(), p_env: quizEnv(), p_action: action });
  if (error) return NextResponse.json({ error: MESSAGES[error.message] || error.message }, { status: 409 });
  return NextResponse.json({ ...data, env: quizEnv() });
}
