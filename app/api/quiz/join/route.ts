import { NextRequest, NextResponse } from 'next/server';
import { quizDb, quizEnv } from '@/lib/quiz-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nickname = String(body?.nickname ?? '').trim().slice(0, 30);
    const table = Number(body?.table_number);
    if (!nickname) return NextResponse.json({ ok: false, error: 'nickname' }, { status: 400 });
    if (!Number.isInteger(table) || table < 1 || table > 500) return NextResponse.json({ ok: false, error: 'table' }, { status: 400 });
    const { data, error } = await quizDb().rpc('quiz_join', { p_env: quizEnv(), p_nickname: nickname, p_table: table });
    if (error) throw error;
    return NextResponse.json(data, { status: data?.ok ? 200 : 409 });
  } catch {
    return NextResponse.json({ ok: false, error: 'generic' }, { status: 500 });
  }
}
