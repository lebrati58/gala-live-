import {NextResponse} from 'next/server';import {db} from '@/lib/supabase';
export const dynamic='force-dynamic';
export async function GET(){try{const {data,error}=await db().from('pledges').select('first_name,amount,percentages,created_at,status').neq('status','cancelled').order('created_at',{ascending:false}).limit(5000);if(error)throw error;return NextResponse.json(data||[],{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Données indisponibles'},{status:503})}}
