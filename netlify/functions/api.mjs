import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { normalizeService } from '../../shared/services.mjs';
import { deleteRequest } from '../lib/requests.mjs';
import { env, equal, token, verify, authenticated, validate } from '../lib/core.mjs';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail=(message,status=400)=>json({error:message},status);
const store=()=>getStore({name:`sg-files-${env('CONTEXT')==='production'?'production':env('DEPLOY_ID')||'local'}`,consistency:'strong'});
export function createHandler({getDb=getDatabase,getFiles=store}={}) {
return async function handler(req,context={}) {
 try {
 const url=new URL(req.url), action=url.searchParams.get('action');
 if(!['GET','POST'].includes(req.method)) return fail('Méthode non autorisée.',405);
 if(req.method==='POST' && req.headers.get('origin')!==url.origin) return fail('Origine non autorisée.',403);
 const db=getDb();
 if(action==='services' && req.method==='GET') {
  const services=await db.sql`SELECT name FROM services ORDER BY lower(name)`;
  return json({services:services.map(s=>s.name)});
 }
 if(action==='login' && req.method==='POST') {
  if(!env('ADMIN_CODE')) return fail('Le code administrateur doit être configuré dans Netlify.',503);
  const ip=context.ip||'unknown';
  const [attempt]=await db.sql`INSERT INTO login_attempts(ip,attempts) VALUES(${ip},1) ON CONFLICT(ip) DO UPDATE SET attempts=CASE WHEN login_attempts.since < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END, since=CASE WHEN login_attempts.since < now()-interval '15 minutes' THEN now() ELSE login_attempts.since END RETURNING attempts`;
  if(attempt.attempts>5) return fail('Trop de tentatives. Réessayez dans 15 minutes.',429);
  const body=await req.json(); if(!equal(String(body.code||''),env('ADMIN_CODE'))) return fail('Code incorrect.',401);
  await db.sql`DELETE FROM login_attempts WHERE ip=${ip}`;
  return json({ok:true},200,{'Set-Cookie':`sg_session=${token('admin')}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`});
 }
 if(action==='logout' && req.method==='POST') return json({ok:true},200,{'Set-Cookie':'sg_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
 if(action==='submit' && req.method==='POST') {
  if(Number(req.headers.get('content-length'))>30000) return fail('Demande trop volumineuse.',413);
  const body=await req.json(); if(body.website) return fail('Formulaire refusé.');
  let data; try { data=validate(body); data.service=normalizeService(data.service); } catch(error) { return fail(error.message); }
  const id=randomUUID();
  const [created]=await db.sql`WITH service_row AS (
   INSERT INTO services(name) VALUES(${data.service})
   ON CONFLICT (lower(name)) DO UPDATE SET name=services.name RETURNING name
  ) INSERT INTO requests(id,name,email,service,title,page,category,comment,media_link)
  SELECT ${id},${data.name},${data.email},name,${data.title},${data.page},${data.category},${data.comment},${data.media_link} FROM service_row RETURNING service`;
  return json({id,service:created.service,uploadToken:token(id,1800)},201);
 }
 if(action==='upload' && req.method==='POST') {
  const id=url.searchParams.get('id'); if(!verify(req.headers.get('authorization')?.replace('Bearer ','')||'',id)) return fail('Dépôt expiré.',401);
  if(Number(req.headers.get('content-length'))>4200000) return fail('Fichier trop volumineux (4 Mo maximum).',413);
  const form=await req.formData(), file=form.get('file');
  if(!file || !file.size || file.size>4000000 || !['application/pdf','image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'].includes(file.type)) return fail('Format non accepté ou fichier supérieur à 4 Mo.');
  const [row]=await db.sql`SELECT files FROM requests WHERE id=${id}`; if(!row || row.files.length>=5) return fail('Maximum 5 pièces jointes.');
  const key=`${id}/${randomUUID()}`, name=file.name.slice(0,180); await getFiles().set(key,await file.arrayBuffer());
  const [updated]=await db.sql`UPDATE requests SET files=files || ${JSON.stringify([{key,name,type:file.type,size:file.size}])}::jsonb WHERE id=${id} AND jsonb_array_length(files)<5 RETURNING id`;
  if(!updated) {await getFiles().delete(key);return fail('Maximum 5 pièces jointes.');}
  return json({ok:true});
 }
 if(!authenticated(req)) return fail('Connectez-vous à l’espace de gestion.',401);
 if(action==='list' && req.method==='GET') {const rows=await db.sql`SELECT * FROM requests ORDER BY created_at DESC`;return json({rows});}
 if(action==='file' && req.method==='GET') {
  const id=url.searchParams.get('id'),key=url.searchParams.get('key'); const [r]=await db.sql`SELECT files FROM requests WHERE id=${id}`;const f=r?.files.find(f=>f.key===key);if(!f)return fail('Fichier introuvable.',404);
  const data=await getFiles().get(key,{type:'stream'});if(!data)return fail('Fichier introuvable.',404);return new Response(data,{headers:{'Content-Type':f.type,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(action==='delete' && req.method==='POST') {
  const {id,confirm}=await req.json();
  if(confirm!==true) return fail('Confirmez la suppression de cette demande.');
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return fail('Référence invalide.');
  await deleteRequest(db,getFiles(),id);
  return json({ok:true});
 }
 if(action==='complete' && req.method==='POST') {
  const {id}=await req.json();
  const [row]=await db.sql`UPDATE requests SET status='done', completed_at=COALESCE(completed_at,now()) WHERE id=${id} RETURNING *`;
  if(!row)return fail('Demande introuvable.',404);
  return json({ok:true});
 }
 return fail('Action inconnue.',404);
 }catch(error){console.error('API error',error.message);return fail('Impossible de terminer cette opération. Vérifiez la configuration Netlify ou réessayez.',500);}
}
}
export default createHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowLimit:60,windowSize:60}};
