import { createClient } from '@supabase/supabase-js';

// Le quiz n'utilise QUE la clé publique (anon) et des fonctions SQL dédiées.
// Il n'a aucun accès aux tables de dons (pledges, gala_settings).
export function quizDb() {
  const url = process.env.QUIZ_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.QUIZ_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Quiz database configuration missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Partie de quiz distincte en production et en préproduction (preview / local).
export function quizEnv(): 'production' | 'preview' {
  return process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
}

export function quizAdminKey() {
  const k = process.env.QUIZ_ADMIN_KEY;
  if (!k) throw new Error('QUIZ_ADMIN_KEY missing');
  return k;
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
