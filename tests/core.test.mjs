import test from 'node:test';
import assert from 'node:assert/strict';
import {token,verify,authenticated,validate,safeCSV} from '../netlify/lib/core.mjs';
process.env.SESSION_SECRET='test-only-secret-with-at-least-thirty-two-characters';
const valid={name:'Camille',email:'camille@example.com',service:'Culture',title:'Horaires',page:'https://www.saintgervais.com/',category:'Texte ou information',comment:'Nouveaux horaires'};
test('validates required contact information and safe URLs',()=>{assert.equal(validate(valid).name,'Camille');for(const patch of [{email:'invalid'},{name:''},{page:'javascript:alert(1)'},{media_link:'file:///etc/passwd'},{comment:'x'.repeat(10001)},{category:'bad'}])assert.throws(()=>validate({...valid,...patch}));});
test('rejects expired, modified and wrong-scope tokens',()=>{const good=token('admin');assert.ok(verify(good,'admin'));assert.ok(!verify(good,'upload'));assert.ok(!verify(good+'a','admin'));assert.ok(!verify(token('admin',-1),'admin'));assert.ok(!verify('malformed','admin'));});
test('protects admin endpoints with signed cookies',()=>{assert.ok(authenticated(new Request('https://example.com',{headers:{cookie:`sg_session=${token('admin')}`}})));assert.ok(!authenticated(new Request('https://example.com',{headers:{cookie:`sg_session=${token('some-upload')}`}})));assert.ok(!authenticated(new Request('https://example.com')));});
test('CSV escapes quotes and neutralizes spreadsheet formulas',()=>{assert.equal(safeCSV('=1+1'),'"\'=1+1"');assert.equal(safeCSV('texte "test"'),'"texte ""test"""');});
