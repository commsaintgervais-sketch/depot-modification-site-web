import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {apidaeRecap,sendApidaeRecap} from '../shared/apidae-notification.mjs';
import {requestReference} from '../shared/references.mjs';
const request={id:'ab12cd34-1234-4321-9876-123456789012',page:'https://www.saintgervais.com/autre/fiche-fr-4247481/',name:'Camille',email:'agent@saintgervais.com',service:'Culture',title:'Horaires & accès',comment:'Deux lignes\navec accents é',media_link:''};
test('recap preserves the receipt reference and all fields match the static form',()=>{
 const payload=apidaeRecap(request,[{name:'plan.pdf',key:'private-secret'}]);
 assert.equal(payload.reference,requestReference(request.id));
 assert.equal(payload.fiche_apidae,'4247481');
 assert.equal(payload.pieces_jointes,'plan.pdf');
 assert.ok(!JSON.stringify(payload).includes('private-secret'));
 const html=readFileSync(new URL('../public/__forms.html',import.meta.url),'utf8');
 for(const key of Object.keys(payload))assert.ok(html.includes('name="'+key+'"'),key);
});
test('only Apidae requests submit an encoded recap',async()=>{
 const calls=[];
 const fake=async(...args)=>{calls.push(args);return {ok:true};};
 await sendApidaeRecap({...request,page:'https://www.saintgervais.com/mairie/'},[],fake);
 assert.equal(calls.length,0);
 await sendApidaeRecap(request,[],fake);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'/__forms.html');
 const body=new URLSearchParams(calls[0][1].body);
 assert.equal(body.get('titre'),request.title);
 assert.equal(body.get('commentaire'),request.comment);
 assert.equal(body.get('email'),request.email);
 assert.equal(body.get('bot-field'),'');
});
test('failed notifications reject independently of the saved request',async()=>{
 await assert.rejects(sendApidaeRecap(request,[],async()=>({ok:false})),/reste enregistrée/);
 await assert.rejects(sendApidaeRecap(request,[],async()=>{throw Error('offline');}),/offline/);
 assert.equal(request.id,'ab12cd34-1234-4321-9876-123456789012');
});
