import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPage,matchesPlatform,pagePath} from '../shared/platforms.mjs';
import {filterRequests} from '../shared/services.mjs';
const event='https://www.saintgervais.com/jai-envie/evenement-et-animation/agenda/concert-un-requiem-allemand-johannes-brahms-saint-gervais-les-bains-fr-6892509/';
const shop='https://www.saintgervais.com/jai-envie/commerces-services/atelier-photo-boris-molinier-saint-gervais-les-bains-fr-4247481/';
test('classifies both provided URL trees and extracts the Apidae identifier',()=>{
 assert.deepEqual(classifyPage(event),{value:'apidae',label:'Apidae',id:'6892509'});
 assert.deepEqual(classifyPage(shop),{value:'apidae',label:'Apidae',id:'4247481'});
 assert.equal(classifyPage(event+'?source=test#horaires').id,'6892509');
 assert.equal(classifyPage(shop.replace('www.','').replace(/\/$/,'')).value,'apidae');
 assert.equal(classifyPage('  '+event+'  ').value,'apidae');
 assert.deepEqual(classifyPage('https://saintgervais.com/jai-envie/commerces-services/nouvelle-fiche/'),{value:'apidae',label:'Apidae',id:null});
});
test('classifies other pages, malformed values and lookalike domains as Site Web',()=>{
 for(const value of [
 'https://www.saintgervais.com/mairie/',
 'https://www.saintgervais.com/jai-envie/evenement-et-animation/agenda/',
 'https://www.saintgervais.com/jai-envie/commerces-services/',
 'https://www.saintgervais.com/jai-envie/commerces-services-bis/fiche-fr-123/',
 event.replace('www.saintgervais.com','www.saintgervais.com.example.org'),
 event.replace('www.saintgervais.com','example.org'),
 'https://www.saintgervais.com/?next='+encodeURIComponent(event),
 'https://www.saintgervais.com/autre/fiche-fr-123/',
 event.replace('https:','ftp:'),'javascript:alert(1)','not a URL','',null
 ])assert.deepEqual(classifyPage(value),{value:'web',label:'Site Web',id:null},String(value));
});
test('combines destination, service, status and search on existing requests',()=>{
 const rows=[
 {id:1,page:event,service:'Culture',status:'pending',name:'Camille',title:'Concert',created_at:'2026-11-20'},
 {id:2,page:shop,service:'Communication',status:'done',name:'Alex',title:'Photo',created_at:'2026-11-21'},
 {id:3,page:'https://www.saintgervais.com/mairie/',service:'Culture',status:'pending',name:'Camille',title:'Horaires',created_at:'2026-11-22'}
 ];
 assert.deepEqual(filterRequests(rows,{platform:'apidae'}).map(r=>r.id),[2,1]);
 assert.deepEqual(filterRequests(rows,{platform:'web'}).map(r=>r.id),[3]);
 assert.deepEqual(filterRequests(rows,{platform:'apidae',service:'culture',status:'pending',search:'6892509'}).map(r=>r.id),[1]);
 assert.deepEqual(filterRequests(rows,{search:'Site Web'}).map(r=>r.id),[3]);
 assert.deepEqual(filterRequests(rows,{platform:'apidae',status:'done'}).map(r=>r.id),[2]);
 assert.ok(matchesPlatform(rows[0],''));
 assert.equal(pagePath(event),new URL(event).pathname);
 assert.equal(pagePath('invalid'),'invalid');
});
