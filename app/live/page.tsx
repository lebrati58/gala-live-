'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'framer-motion';
import {CircleCheck,HeartHandshake,Users,TrendingUp} from 'lucide-react';
type P={first_name:string;amount:number;percentages:Record<string,number>;created_at:string;status:'pending'|'paid'|'cancelled'};
const ids=['projet_a','projet_b','projet_c'];
const money=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n)+' ₪';
export default function Live(){
 const [pledges,setPledges]=useState<P[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [error,setError]=useState(false);
 const [flash,setFlash]=useState(false);
 const previous=useRef<number|null>(null);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   try{
    const response=await fetch('/api/live',{cache:'no-store'});
    if(!response.ok)throw Error('Unavailable');
    const data=await response.json();
    if(!Array.isArray(data))throw Error('Invalid response');
    if(!active)return;
    const sum=data.reduce((n:number,p:P)=>n+Number(p.amount),0);
    if(previous.current!==null&&sum>previous.current){setFlash(true);setTimeout(()=>{if(active)setFlash(false)},1800)}
    previous.current=sum;setPledges(data);setError(false);
   }catch{if(active)setError(true)}
  };
  const settings=()=>fetch('/api/public-settings',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active&&d.project_names)setNames(d.project_names)}).catch(()=>{});
  refresh();settings();const timer=setInterval(refresh,3000);const settingsTimer=setInterval(settings,30000);
  return()=>{active=false;clearInterval(timer);clearInterval(settingsTimer)};
 },[]);
 const total=useMemo(()=>pledges.reduce((n,p)=>n+Number(p.amount),0),[pledges]);
 const paid=useMemo(()=>pledges.filter(p=>p.status==='paid').reduce((n,p)=>n+Number(p.amount),0),[pledges]);
 const pending=total-paid;
 return <main className="min-h-screen bg-[#080b14] text-white p-5 md:p-10 lg:p-14 overflow-hidden">
  <header className="flex items-center justify-between gap-4 mb-8 md:mb-12">
   <div><p className="text-xs md:text-sm tracking-[.4em] text-amber-300 uppercase">Soirée de solidarité</p><h1 className="text-3xl md:text-5xl font-black tracking-tight">GALA <span className="gold">LIVE</span></h1></div>
   <span className={error?'text-rose-300':'text-emerald-300'} aria-live="polite">{error?'● Connexion interrompue':'● Actualisation toutes les 3 s'}</span>
  </header>
  <section className="relative rounded-3xl border border-amber-300/30 bg-gradient-to-br from-[#242034] via-[#141827] to-[#0d1321] p-7 md:p-12 mb-6 text-center shadow-2xl">
   <HeartHandshake className="mx-auto text-amber-300 mb-3" size={36}/>
   <h2 className="uppercase tracking-[.25em] text-sm md:text-xl text-amber-100">Total des promesses de dons</h2>
   <motion.p key={total} initial={{opacity:.65,scale:.97}} animate={{opacity:1,scale:1}} transition={{duration:.6}} className="gold font-black text-5xl sm:text-7xl md:text-8xl lg:text-9xl my-6 tabular-nums">{money(total)}</motion.p>
   <p className="text-slate-300 text-base md:text-xl">Engagements enregistrés · paiements non nécessairement effectués</p>
   <AnimatePresence>{flash&&<motion.div initial={{opacity:0,scale:.7}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="absolute top-5 right-6 text-amber-300 text-3xl" aria-hidden="true">✦ ✨ ✦</motion.div>}</AnimatePresence>
  </section>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
   <div className="panel"><div className="flex items-center gap-2 text-emerald-300"><CircleCheck size={20}/> Dons marqués payés</div><p className="text-3xl md:text-4xl font-bold mt-3 tabular-nums">{money(paid)}</p><p className="text-xs text-slate-400 mt-2">Statut confirmé manuellement dans l'administration, sans vérification Smile automatique</p></div>
   <div className="panel"><div className="flex items-center gap-2 text-amber-300"><TrendingUp size={20}/> Promesses en attente</div><p className="text-3xl md:text-4xl font-bold mt-3 tabular-nums">{money(pending)}</p></div>
   <div className="panel"><div className="flex items-center gap-2 text-slate-300"><Users size={20}/> Nombre de promesses</div><p className="text-3xl md:text-4xl font-bold mt-3 tabular-nums">{pledges.length}</p></div>
  </div>
  <div className="grid lg:grid-cols-2 gap-6">
   <section className="panel"><h2 className="text-2xl gold font-bold mb-6">Répartition par projet</h2>{ids.map(id=>{const sum=pledges.reduce((n,p)=>n+Number(p.amount)*Number(p.percentages[id]||0)/100,0);const percent=total?sum/total*100:0;return <div key={id} className="mb-7"><div className="flex justify-between gap-3 mb-2"><span className="font-semibold">{names[id]||id}</span><span className="text-right">{money(sum)} · {percent.toFixed(1)} %</span></div><div className="h-4 bg-slate-700 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:percent+'%'}} transition={{duration:1}} className="h-full bg-amber-300 rounded-full"/></div></div>})}</section>
   <section className="panel"><h2 className="text-2xl gold font-bold mb-6">Dernières promesses</h2><div className="space-y-2">{pledges.slice(0,7).map((p,i)=><motion.div key={p.created_at+i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="flex justify-between items-center gap-3 border-b border-slate-700 py-3"><span className="font-semibold">{p.first_name}</span><span className="flex items-center gap-3"><strong>{money(Number(p.amount))}</strong><span className={p.status==='paid'?'text-emerald-300 text-xs':'text-amber-200 text-xs'}>{p.status==='paid'?'Payé*':'Promis'}</span></span></motion.div>)}</div></section>
  </div>
  <footer className="mt-7 text-sm text-slate-400">* « Payé » signifie marqué comme tel par un administrateur ; aucune confirmation bancaire automatique n'est actuellement intégrée.</footer>
 </main>;
}
