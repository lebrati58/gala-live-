import { createClient } from '@supabase/supabase-js';
export function db() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error('Supabase server configuration missing');
 if(isPublicKey(key)) throw new Error('SUPABASE_SERVICE_ROLE_KEY contient la clé publique (anon) : mettre la clé service_role/secret dans Vercel');
 return createClient(url,key,{auth:{persistSession:false}});
}

// Détecte une clé publique collée par erreur à la place de la clé secrète.
function isPublicKey(key:string){
 if(key.startsWith('sb_publishable_')) return true;
 const part=key.split('.')[1];
 if(!part) return false;
 try{return JSON.parse(Buffer.from(part,'base64url').toString()).role==='anon'}catch{return false}
}
