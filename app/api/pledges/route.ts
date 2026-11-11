import {NextRequest,NextResponse} from 'next/server';import {db} from '@/lib/supabase';
export async function POST(req:NextRequest){try{
 const p=await req.json();const name=String(p.first_name||'').trim(),contact=String(p.phone_or_email||'').trim(),amount=Number(p.amount),pct=p.percentages||{};
 const keys=['projet_a','projet_b','projet_c'];
 if(!name||name.length>80||contact.length<3||contact.length>200||!Number.isFinite(amount)||amount<=0||amount>100000000||!keys.every(k=>Number.isInteger(pct[k])&&pct[k]>=0&&pct[k]<=100)||keys.reduce((n,k)=>n+pct[k],0)!==100)return NextResponse.json({error:'Données invalides'},{status:400});
 const {error}=await db().from('pledges').insert({first_name:name,phone_or_email:contact,amount,percentages:Object.fromEntries(keys.map(k=>[k,pct[k]])),status:'pending'});if(error)throw error;
 const {data}=await db().from('gala_settings').select('smile_url').eq('id',1).single();
 return NextResponse.json({ok:true,smile_url:data?.smile_url||''});
 }catch{return NextResponse.json({error:'Impossible d’enregistrer la promesse'},{status:500})}}
