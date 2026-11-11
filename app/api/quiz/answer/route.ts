import { NextRequest, NextResponse } from 'next/server';
import { isUuid, quizDb, quizEnv } from '@/lib/quiz-db';

export const fetchCache = 'force-no-store';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { player_id, token, question_id } = body ?? {};
    const choice = Number(body?.choice);
    if (!isUuid(player_id) || !isUuid(question_id) || typeof token !== 'string' || !Number.isInteger(choice) || choice < 0 || choice > 3)
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
    const { data, error } = await quizDb().rpc('quiz_answer', {
      p_env: quizEnv(), p_player: player_id, p_token: token.slice(0, 100), p_question: question_id, p_choice: choice,
    });
    if (error) throw error;
    return NextResponse.json(data, { status: data?.ok ? 200 : 409 });
  } catch {
    return NextResponse.json({ ok: false, error: 'generic' }, { status: 500 });
  }
}
