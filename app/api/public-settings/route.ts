import {NextResponse} from 'next/server';import {db} from '@/lib/supabase';
export const dynamic='force-dynamic';
export async function GET(){try{const {data,error}=await db().from('gala_settings').select('project_names,smile_url').eq('id',1).single();if(error)throw error;return NextResponse.json(data)}catch{return NextResponse.json({error:'Configuration indisponible'},{status:503})}}
