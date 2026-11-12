import { NextRequest, NextResponse } from 'next/server';
import { isUuid, quizDb, quizEnv } from '@/lib/quiz-db';

export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const player = req.headers.get('x-quiz-player');
    const token = req.headers.get('x-quiz-token');
    const { data, error } = await quizDb().rpc('quiz_state_get', {
      p_env: quizEnv(),
      p_player: isUuid(player) ? player : null,
      p_token: typeof token === 'string' ? token.slice(0, 100) : null,
      p_full: false,
    });
    if (error) throw error;
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
