export const PLATFORMS = [
 {value:'apidae',label:'Apidae'},
 {value:'web',label:'Site Web'}
];
// Compute from the URL on every read so existing requests are classified too.
export function classifyPage(value) {
 const fallback={value:'web',label:'Site Web',id:null};
 try {
  const url=new URL(String(value||'').trim());
  if(!['https:','http:'].includes(url.protocol)||!['saintgervais.com','www.saintgervais.com'].includes(url.hostname))return fallback;
  const path=url.pathname.toLowerCase();
  const match=path.match(/(?:^|[-/])fr-(\d+)\/?$/);
  if(!match)return fallback;
  return {value:'apidae',label:'Apidae',id:match[1]};
 }catch{return fallback;}
}
export const matchesPlatform=(request,platform)=>!platform||classifyPage(request.page).value===platform;
export function pagePath(value) {
 try{return new URL(value).pathname;}catch{return String(value||'');}
}
