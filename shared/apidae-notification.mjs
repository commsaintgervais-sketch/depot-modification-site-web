import {classifyPage} from './platforms.mjs';
import {requestReference} from './references.mjs';
export function apidaeRecap(request,attachments=[]) {
 const platform=classifyPage(request.page);
 if(platform.value!=='apidae')return null;
 return {
  'form-name':'apidae-recap','bot-field':'',
  subject:'Demande Apidae '+requestReference(request.id),
  reference:requestReference(request.id),reference_complete:request.id,
  fiche_apidae:platform.id,titre:request.title,nom:request.name,email:request.email,
  service:request.service,page:request.page,commentaire:request.comment,
  lien_partage:request.media_link||'',
  pieces_jointes:attachments.map(file=>file.name).join('\n')||'Aucune pièce jointe transmise',
  gestion:'https://depot-site-saint-gervais.netlify.app/#gestion'
 };
}
export async function sendApidaeRecap(request,attachments=[],fetcher=fetch) {
 const payload=apidaeRecap(request,attachments);
 if(!payload)return;
 const response=await fetcher('/__forms.html',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams(payload).toString(),signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw new Error('Le récapitulatif Apidae n’a pas pu être transmis. Votre demande reste enregistrée.');
}
