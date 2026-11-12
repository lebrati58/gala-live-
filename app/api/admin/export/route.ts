import {NextResponse} from 'next/server';
import {adminAuthorized} from '@/lib/auth';
import {db} from '@/lib/supabase';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const safe = (value: unknown) => {
  const text = String(value ?? '');
  return /^[\s]*[=+@\-\t\r]/.test(text) ? "'" + text : text;
};

export async function GET() {
  if (!adminAuthorized()) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const rows: any[] = [];
    const pageSize = 1000;
    for (let start=0; ; start+=pageSize) {
      const {data,error} = await db().from('pledges').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,start+pageSize-1);
      if (error) throw error;
      rows.push(...(data||[]));
      if (!data || data.length<pageSize) break;
      if (start>=999000) throw new Error('Export limit reached');
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator='Gala Live';
    const add = (name:string, headers:string[], data:(string|number)[][]) => {
      const sheet=workbook.addWorksheet(name);
      sheet.addRow(headers);
      for(const row of data) sheet.addRow(row);
      sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
      sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF183153'}};
      sheet.views=[{state:'frozen',ySplit:1}];
      sheet.autoFilter={from:'A1',to:sheet.getRow(1).getCell(headers.length).address};
      sheet.columns=headers.map((_,i)=>({width:Math.min(45,Math.max(15,...data.slice(0,100).map(r=>String(r[i]??'').length+2)))}));
      return sheet;
    };
    add('Promesses de dons',['ID','Date','Prénom','Contact','Montant (ILS)','Statut','Répartition JSON'],
      rows.map(p=>[safe(p.id),safe(p.created_at),safe(p.first_name),safe(p.phone_or_email),Number(p.amount)||0,safe(p.status),safe(JSON.stringify(p.percentages??{}))]));
    const active=rows.filter(p=>p.status!=='cancelled');
    const paid=rows.filter(p=>p.status==='paid');
    const total=(a:any[])=>Math.round(a.reduce((s,p)=>s+(Number(p.amount)||0),0)*100)/100;
    add('Statistiques',['Indicateur','Valeur'],[
      ['Nombre de promesses',rows.length],['Promesses actives',active.length],['Paiements confirmés',paid.length],
      ['Montant promis actif (ILS)',total(active)],['Montant marqué payé (ILS)',total(paid)],
      ['Promesses annulées',rows.filter(p=>p.status==='cancelled').length]
    ]);
    const projectIds=['projet_a','projet_b','projet_c'];
    const {data:settings,error:settingsError}=await db().from('gala_settings').select('project_names').eq('id',1).maybeSingle();
    if(settingsError) throw settingsError;
    const projectNames=(settings?.project_names||{}) as Record<string,string>;
    add('Projets',['Projet','Montant promis actif (ILS)','Montant marqué payé (ILS)'],projectIds.map(id=>{
      const allocated=(arr:any[])=>Math.round(arr.reduce((sum,p)=>{
        const pct=Number(p.percentages?.[id]??0);
        return sum+(Number(p.amount)||0)*(Number.isFinite(pct)?pct:0)/100;
      },0)*100)/100;
      return [safe(projectNames[id]||id),allocated(active),allocated(paid)];
    }));
    add('Participants',['Information'],[['Non disponible : module participants non connecté']]);
    add('Quiz',['Information'],[['Non disponible : module quiz non connecté']]);
    add('Classement',['Information'],[['Non disponible : scores par table non connectés']]);
    const bytes=await workbook.xlsx.writeBuffer();
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    return new NextResponse(bytes as BodyInit,{headers:{
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':`attachment; filename="gala-live-${stamp}.xlsx"`,
      'Cache-Control':'private, no-store'
    }});
  } catch(e) {
    console.error('Admin export failed',e);
    return NextResponse.json({error:'Export impossible'},{status:500});
  }
}
