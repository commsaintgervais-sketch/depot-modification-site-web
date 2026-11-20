export const DEFAULT_SERVICES = ['Accueil / État civil','Administration générale','Communication','Culture','Bibliothèque','Services techniques','Urbanisme','Enfance / Jeunesse','Sports','Police municipale','CCAS / Action sociale','Finances','Ressources humaines'];
export function normalizeService(value) {
 if(typeof value!=='string') throw new Error('Indiquez le nom du service.');
 const name=value.normalize('NFC').trim().replace(/\s+/g,' ');
 if(name.length<2||name.length>100||/[\u0000-\u001f\u007f<>]/.test(name)) throw new Error('Le nom du service doit contenir de 2 à 100 caractères, sans balises.');
 return name;
}
export const serviceKey=value=>String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('fr');
export const matchesService=(request,service)=>!service||serviceKey(request.service)===serviceKey(service);
export function serviceOptions(values) {
 const names=new Map();
 for(const value of values) {const name=String(value||'').trim().replace(/\s+/g,' '); if(name&&!names.has(serviceKey(name)))names.set(serviceKey(name),name);}
 return [...names.values()].sort((a,b)=>a.localeCompare(b,'fr'));
}
export function filterRequests(rows,{service='',status='all',search='',sort='date'}={}) {
 const query=serviceKey(search);
 return rows.filter(r=>matchesService(r,service)&&(status==='all'||r.status===status)&&serviceKey([r.title,r.name,r.service].join(' ')).includes(query))
 .sort((a,b)=>(sort==='service'?a.service.localeCompare(b.service,'fr'):0)||new Date(b.created_at)-new Date(a.created_at));
}
