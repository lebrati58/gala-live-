import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
const secret=()=>{const s=process.env.ADMIN_SESSION_SECRET;if(!s)throw Error('ADMIN_SESSION_SECRET missing');return s};
export function token(){return createHmac('sha256',secret()).update('gala-admin-v1').digest('hex')}
export function adminAuthorized(){const t=cookies().get('gala_admin')?.value||'';const expected=token();return t.length===expected.length&&timingSafeEqual(Buffer.from(t),Buffer.from(expected))}
export function passwordValid(input:string){const expected=process.env.ADMIN_PASSWORD||'';return !!expected&&input.length===expected.length&&timingSafeEqual(Buffer.from(input),Buffer.from(expected))}
