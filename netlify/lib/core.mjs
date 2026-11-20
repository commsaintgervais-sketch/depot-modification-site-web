import { createHmac, timingSafeEqual } from 'node:crypto';
export const env = key => globalThis.Netlify?.env.get(key) ?? process.env[key];
export function sign(value) { const secret=env('SESSION_SECRET'); if(!secret || secret.length<32) throw new Error('SESSION_SECRET doit contenir au moins 32 caractères.'); return createHmac('sha256',secret).update(value).digest('hex'); }
export function equal(a,b) { const x=Buffer.from(a||''), y=Buffer.from(b||''); return x.length===y.length && timingSafeEqual(x,y); }
export function token(subject,seconds=28800) { const data=Buffer.from(JSON.stringify({subject,expires:Date.now()+seconds*1000})).toString('base64url'); return `${data}.${sign(data)}`; }
export function verify(value,subject) { try {const [data,sig]=value.split('.'); const payload=JSON.parse(Buffer.from(data,'base64url')); return equal(sig,sign(data)) && payload.subject===subject && payload.expires>Date.now();} catch{return false;} }
export function authenticated(req) { return verify((req.headers.get('cookie')||'').split('; ').find(x=>x.startsWith('sg_session='))?.slice(11)||'','admin'); }
export function validate(input) {
 const out={}; for(const [key,max] of Object.entries({name:100,email:200,service:100,title:180,page:2000,category:60,comment:10000,media_link:2000})) {out[key]=String(input[key]||'').trim(); if(out[key].length>max) throw new Error(`Champ trop long : ${key}`);}
 for(const key of ['name','email','service','title','page','category','comment']) if(!out[key]) throw new Error('Merci de compléter les champs obligatoires.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new Error('Adresse e-mail invalide.');
 for(const key of ['page','media_link']) if(out[key]) {let u;try{u=new URL(out[key]);}catch{throw new Error('Lien invalide.');}if(!['https:','http:'].includes(u.protocol)) throw new Error('Utilisez un lien http ou https.');}
 if(!['Texte ou information','Photo ou document','Événement','Autre demande'].includes(out.category)) throw new Error('Type de demande invalide.');
 return out;
}
export const safeCSV = value => '"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
