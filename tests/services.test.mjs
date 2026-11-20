import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from '../netlify/functions/api.mjs';
import {token} from '../netlify/lib/core.mjs';
import {normalizeService,serviceOptions,filterRequests,DEFAULT_SERVICES} from '../shared/services.mjs';
process.env.SESSION_SECRET='test-only-secret-with-at-least-thirty-two-characters';

test('service names and filters handle spaces, case, sorting and combined search',()=>{
 assert.equal(normalizeService('  Services   techniques  '),'Services techniques');
 for(const bad of ['', 'x','x'.repeat(101),'<script>','Culture\u0000',42]) assert.throws(()=>normalizeService(bad));
 assert.deepEqual(serviceOptions(['Culture',' culture ','Sports']),['Culture','Sports']);
 const rows=[
  {id:1,service:'Sports',status:'done',name:'Camille',title:'Horaires',created_at:'2026-11-18'},
  {id:2,service:'Culture',status:'pending',name:'Alex',title:'Affiche',created_at:'2026-11-19'},
  {id:3,service:' culture ',status:'done',name:'Camille',title:'Festival',created_at:'2026-11-20'}
 ];
 assert.deepEqual(filterRequests(rows,{service:'Culture',status:'done',search:'camille'}).map(r=>r.id),[3]);
 assert.deepEqual(filterRequests(rows,{sort:'date'}).map(r=>r.id),[3,2,1]);
 assert.deepEqual(filterRequests(rows.slice(0,2),{sort:'service'}).map(r=>r.id),[2,1]);
});

test('shared catalog and protected deletion through the real API handler',async()=>{
 const pg=new PGlite();
 const blobs=new Map();
 const deleted=[];
 let failDelete=false;
 const storage={
  delete:async key=>{if(failDelete)throw new Error('Storage temporarily unavailable');deleted.push(key);blobs.delete(key);},
  get:async key=>blobs.get(key)||null,
  set:async(key,value)=>blobs.set(key,value)
 };
 const db={
  sql:async(strings,...values)=>{
   const query=strings.reduce((q,part,i)=>q+part+(i<values.length?'$'+(i+1):''),'');
   return (await pg.query(query,values)).rows;
  },
  pool:{connect:async()=>({query:(...args)=>pg.query(...args),release(){}})}
 };
 const handler=createHandler({getDb:()=>db,getFiles:()=>storage});
 const call=(action,body,admin=false,origin='https://example.com')=>{
  const headers={};if(body){headers['content-type']='application/json';headers.origin=origin;}
  if(admin)headers.cookie='sg_session='+token('admin');
  return handler(new Request('https://example.com/.netlify/functions/api?action='+action,{
   method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined
  }),{ip:'127.0.0.1'});
 };
 const input={name:'Camille',email:'camille@example.com',service:'  Vie   associative  ',title:'Actualiser une page',page:'https://www.saintgervais.com/',category:'Texte ou information',comment:'Informations actualisées'};
 try{
  await pg.exec(await fs.readFile(new URL('../netlify/database/migrations/20261119000100_initial.sql',import.meta.url),'utf8'));
  await pg.query("INSERT INTO requests(id,name,email,service,title,page,category,comment) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Alex','alex@example.com','  Patrimoine  ','Archives','https://example.com','Autre demande','Test')");
  await pg.exec(await fs.readFile(new URL('../netlify/database/migrations/20261120140000_services.sql',import.meta.url),'utf8'));
  const initial=await (await call('services')).json();
  for(const name of DEFAULT_SERVICES)assert.ok(initial.services.includes(name),name);
  assert.ok(initial.services.includes('Patrimoine'));
  const first=await call('submit',input);assert.equal(first.status,201);
  const ticket=await first.json();assert.equal(ticket.service,'Vie associative');
  assert.ok((await (await call('services')).json()).services.includes('Vie associative'));
  const duplicate=await call('submit',{...input,service:'VIE ASSOCIATIVE'});
  assert.equal((await duplicate.json()).service,'Vie associative');
  assert.equal((await pg.query("SELECT * FROM services WHERE lower(name)='vie associative'")).rows.length,1);
  assert.equal((await call('submit',{...input,service:'<bad>'})).status,400);
  const key=ticket.id+'/file.pdf';blobs.set(key,'PDF');
  await pg.query('UPDATE requests SET files=$1::jsonb WHERE id=$2',[JSON.stringify([{key,name:'file.pdf',type:'application/pdf'}]),ticket.id]);
  assert.equal((await call('delete',{id:ticket.id,confirm:true})).status,401);
  assert.equal((await call('delete',{id:ticket.id,confirm:true},true,'https://attacker.example')).status,403);
  assert.equal((await call('delete',{id:ticket.id},true)).status,400);
  assert.equal((await call('delete',{id:'bad',confirm:true},true)).status,400);
  assert.equal(deleted.length,0);
  failDelete=true;
  assert.equal((await call('delete',{id:ticket.id,confirm:true},true)).status,500);
  assert.equal((await pg.query('SELECT id FROM requests WHERE id=$1',[ticket.id])).rows.length,1);
  failDelete=false;
  assert.equal((await call('delete',{id:ticket.id,confirm:true},true)).status,200);
  assert.ok(!blobs.has(key));assert.deepEqual(deleted,[key]);
  const listed=await (await call('list',undefined,true)).json();assert.ok(!listed.rows.some(r=>r.id===ticket.id));
  assert.equal((await call('complete',{id:ticket.id},true)).status,404);
  assert.equal((await call('delete',{id:ticket.id,confirm:true},true)).status,200);
  // Service remains selectable even after all its requests are removed.
  for(const row of listed.rows.filter(r=>r.service==='Vie associative'))await call('delete',{id:row.id,confirm:true},true);
  assert.ok((await (await call('services')).json()).services.includes('Vie associative'));
 }finally{await pg.close();}
});
