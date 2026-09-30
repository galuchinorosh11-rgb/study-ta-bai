// AI client — same-origin POST to api.php by default (the key lives on the server, never here).
// Split deploy (Pages frontend + PHP elsewhere): set window.STB_API_URL to the backend URL.
const API_URL = (typeof window !== 'undefined' && window.STB_API_URL) || 'api.php';
let currentCtrl=null;
function apiCancel(){ if(currentCtrl){try{currentCtrl.abort();}catch(_){} currentCtrl=null;} }
async function apiPost(payload,timeoutMs){
  currentCtrl=new AbortController();
  const t=setTimeout(()=>{try{currentCtrl.abort();}catch(_){}},timeoutMs||100000);
  try{
    const r=await fetch(API_URL,{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),signal:currentCtrl.signal});
    return await r.json();
  }finally{clearTimeout(t);currentCtrl=null;}
}
async function serverExam(kind,n,difficulty,notes){
  const res=await apiPost({action:'exam',kind,n,difficulty,notes},110000);
  if(!res||!res.ok)throw new Error((res&&res.error)||'AI failed');
  return res;
}
// FIX: return the whole envelope (callers need res.guide AND res.model)
// Tolerant to both shapes: {guide,model} envelope OR bare guide object.
async function serverReview(notes){
  const res=await apiPost({action:'review',notes},110000);
  if(!res||!res.ok)throw new Error((res&&res.error)||'AI failed');
  // Normal shape: {ok, guide:{...}, model}
  if(res.guide&&Array.isArray(res.guide.lessons))return {guide:res.guide,model:res.model||res.guide.model||''};
  // Legacy/bare shape: res itself IS the guide
  if(Array.isArray(res.lessons))return {guide:res,model:res.model||''};
  throw new Error((res&&res.error)||'AI returned an empty guide');
}
async function serverPrepare(notes){
  const res=await apiPost({action:'prepare',notes},60000);
  if(!res||!res.ok||!res.prep)throw new Error((res&&res.error)||'AI failed');
  return res;
}
async function serverHooks(items){
  const res=await apiPost({action:'hooks',items},90000);
  if(!res||!res.ok||!res.hooks)throw new Error((res&&res.error)||'AI failed');
  return res;
}
async function serverTest(){
  const res=await apiPost({action:'test'},60000);
  if(!res||!res.ok)throw new Error((res&&res.error)||'AI failed');
  return res;
}
