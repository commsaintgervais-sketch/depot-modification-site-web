import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('migration, shared persistence, attachments and idempotent treatment',async()=>{
 const db=new PGlite();
 try{
 await db.exec(await fs.readFile(new URL('../netlify/database/migrations/20261119000100_initial.sql',import.meta.url),'utf8'));
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 await db.query('INSERT INTO requests(id,name,email,service,title,page,category,comment) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,'Camille','camille@example.com','Culture','Horaires','https://www.saintgervais.com/','Texte ou information','Mise à jour']);
 let {rows:[row]}=await db.query('SELECT * FROM requests WHERE id=$1',[id]);assert.equal(row.status,'pending');assert.deepEqual(row.files,[]);
 await db.query('UPDATE requests SET files=files || $1::jsonb WHERE id=$2 AND jsonb_array_length(files)<5',[JSON.stringify([{key:'private-file',name:'document.pdf'}]),id]);
 await db.query("UPDATE requests SET status='done',completed_at=COALESCE(completed_at,now()) WHERE id=$1",[id]);
 const first=(await db.query('SELECT * FROM requests WHERE id=$1',[id])).rows[0];
 await db.query("UPDATE requests SET status='done',completed_at=COALESCE(completed_at,now()) WHERE id=$1",[id]);
 const second=(await db.query('SELECT * FROM requests WHERE id=$1',[id])).rows[0];
 assert.equal(second.status,'done');assert.equal(second.completed_at.toISOString(),first.completed_at.toISOString());assert.equal(second.files[0].name,'document.pdf');
 const report=await db.query("SELECT * FROM requests WHERE (completed_at AT TIME ZONE 'Europe/Paris')::date = (now() AT TIME ZONE 'Europe/Paris')::date");assert.equal(report.rows.length,1);
 }finally{await db.close();}
});
