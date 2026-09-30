// App wiring: router, loading, upload UI, start flows. Runs last.
const fileInput=$('fileInput'), drop=$('drop'), fileList=$('fileList'),
pasteBox=$('pasteBox'), preview=$('preview'), startBtn=$('startBtn'), genStatus=$('genStatus'),
analyzeBtn=$('analyzeBtn'), prepStatus=$('prepStatus'), chooseCard=$('chooseCard'),
chooseLock=$('chooseLock'), matSummary=$('matSummary');
function ok(m){ genStatus.className='status ok'; genStatus.textContent=m; }
function err(m){ genStatus.className='status'; genStatus.classList.add('err'); genStatus.textContent=m; }
function info(m){ genStatus.className='status'; genStatus.textContent=m; }
function pok(m){ prepStatus.className='status ok'; prepStatus.textContent=m; }
function perr(m){ prepStatus.className='status'; prepStatus.classList.add('err'); prepStatus.textContent=m; }
function pinfo(m){ prepStatus.className='status'; prepStatus.textContent=m; }
// Staged flow state: prepared holds the AI-loaded snapshot so step 2 starts instantly.
let prepared=null; // {sample, hash, title, model}
function docHash(s){ let h=5381; for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36)+'_'+s.length; }
/* ---------- dark mode (persisted, follows OS on first visit) ---------- */
function syncThemeIcon(){
  const dark=document.documentElement.classList.contains('dark');
  $('icoMoon').style.display=dark?'none':'';
  $('icoSun').style.display=dark?'':'none';
  $('themeBtn').setAttribute('aria-checked',dark?'true':'false');
}
$('themeBtn').onclick=()=>{
  const dark=!document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark',dark);
  try{localStorage.setItem('stb-theme',dark?'dark':'light');}catch(_){}
  syncThemeIcon();
};
syncThemeIcon();

/* ---------- router: upload → choose → exam/review ---------- */
const VIEWS=['upload','choose','exam','review'];
let currentView='upload';
function setStep(n){
  [1,2,3].forEach(i=>{
    const el=$('st'+i);
    if(!el)return;
    el.classList.toggle('on',i===n);
    el.classList.toggle('done',i<n);
  });
}
function showView(name,keepGame){
  if(name==='choose'&&(!prepared||docHash(combinedText)!==prepared.hash)){name='upload';pinfo("Load your material to the AI first.");}
  if((name==='exam'&&!questions.length&&!window._examGame))name=(prepared&&docHash(combinedText)===prepared.hash)?'choose':'upload';
  VIEWS.forEach(v=>$('view-'+v).classList.toggle('active',v===name));
  currentView=name;
  $('backBtn').style.display=name==='upload'?'none':'';
  setStep(name==='upload'?1:name==='choose'?2:3);
  if(!keepGame){
  if(typeof stopSpeedTimer==='function')stopSpeedTimer();
  if(typeof stopKnight==='function')stopKnight();
  }
  $('mainScroll').scrollTo({top:0,behavior:'smooth'});
}
function goBack(){
  runId++;apiCancel();hideLoading();
  if(currentView==='exam'||currentView==='review')showView((prepared&&docHash(combinedText)===prepared.hash)?'choose':'upload');
  else if(currentView==='choose')showView('upload');
}
$('backBtn').onclick=goBack;
$('logoBtn').onclick=()=>{runId++;apiCancel();showView('upload');};
$('editBtn').onclick=()=>showView('upload');

/* ---------- loading overlay ---------- */
let loadTimer=null, loadBarTimer=null, loadSecTimer=null;
const EXAM_STEPS=["Reading your pages","Picking the important facts","Writing your questions","Adding tricky wrong options","Polishing explanations"];
const REVIEW_STEPS=["Reading your pages","Finding the big ideas","Simplifying the lessons","Listing key terms","Writing exam tips"];
function showLoading(steps){
  $('loading').classList.add('active');
  const stepEl=$('loadStep'),bar=$('loadBarFill'),msg=$('loadMsg');
  const t0=Date.now();
  msg.textContent="Connecting to AI…";
  let i=0;stepEl.textContent=steps[0];
  clearInterval(loadTimer);clearInterval(loadBarTimer);clearInterval(loadSecTimer);
  loadTimer=setInterval(()=>{i=(i+1)%steps.length;stepEl.textContent=steps[i];},1400);
  let p=4;bar.style.width='4%';
  loadBarTimer=setInterval(()=>{p=Math.min(p+4+Math.random()*10,92);bar.style.width=p+'%';},450);
  loadSecTimer=setInterval(()=>{msg.textContent="Working… "+Math.round((Date.now()-t0)/1000)+"s elapsed";},1000);
}
function hideLoading(){
  clearInterval(loadTimer);clearInterval(loadBarTimer);clearInterval(loadSecTimer);
  $('loadBarFill').style.width='100%';
  setTimeout(()=>$('loading').classList.remove('active'),250);
}
$('cancelBtn').onclick=()=>{runId++;apiCancel();hideLoading();showView(currentView==='exam'||currentView==='review'?'choose':'upload');info("Cancelled.");};

/* ---------- upload UI ---------- */
function refreshFlow(){
  const len=combinedText.trim().length;
  const ready=len>=200;
  // Step 1 button: enabled when material present; label tells if already loaded.
  analyzeBtn.disabled=!ready;
  if(!ready)analyzeBtn.textContent="Upload material first";
  else if(prepared&&docHash(combinedText)===prepared.hash)analyzeBtn.textContent="Loaded to AI — analyze again if edited";
  else if(prepared)analyzeBtn.textContent="Material changed — load to AI again";
  else analyzeBtn.textContent="Load to AI →";
  // Step 2: visible only when snapshot matches current text.
  const unlocked=!!(prepared&&docHash(combinedText)===prepared.hash);
  chooseCard.classList.toggle('locked',!unlocked);
  chooseLock.style.display=unlocked?'none':'';
  matSummary.style.display=unlocked?'':'none';
  startBtn.disabled=!unlocked;
  if(!unlocked)startBtn.textContent="Load material first ↑";
  else startBtn.textContent=mode==="review"?"Make my review":mode==="flash"?"Show flashcards":mode==="speed"?"Start speed round →":mode==="knight"?"Enter dungeon →":mode==="enum"?"Start enumeration →":mode==="ident"?"Start identification →":"Start test →";
}
function refreshStartBtn(){ refreshFlow(); }
function updateStats(){
  const words=combinedText.trim()?combinedText.trim().split(/\s+/).length:0;
  const sample=combinedText.length>120000?sampleWholeDoc(combinedText,12000):combinedText;
  const sents=splitSentences(sample);
  const keys=extractKeywords(sample);
  const facts=scoreSentences(sents,keys).filter(s=>s.score>2).length;
  $('wordCount').textContent=words;
  $('sentCount').textContent=sents.length+(combinedText.length>120000?"+":"");
  $('keyCount').textContent=facts;
  preview.textContent=(combinedText.slice(0,2000)||"No text yet.")+(combinedText.length>2000?"\n…(+"+((combinedText.length-2000)/1000).toFixed(0)+"k more chars loaded)":"");
  // Keep upload clean: only show the confirm panel once there's something to read.
  const cp=$('confirmPanel');
  const hasAny=!!combinedText.trim().length;
  if(cp){
    cp.style.display=hasAny?'':'none';
    const grid=cp.closest('.upload-grid');
    if(grid)grid.classList.toggle('solo',!hasAny);
  }
  refreshStartBtn();
}
function rebuildCombined(){
  combinedText=[...fileTexts.map(f=>f.text),pasteBox.value.trim()].join("\n\n").replace(/\n{3,}/g,"\n\n").slice(0,400000);
  // Editing material invalidates the AI snapshot (cheap local check, no AI call).
  if(prepared&&docHash(combinedText)!==prepared.hash){
    prepared=null;
    pinfo("Material edited — press “Load to AI” again.");
  }
  updateStats();
}
function renderFiles(){
  fileList.innerHTML="";
  fileTexts.forEach((f,i)=>{
    const li=document.createElement("li");
    li.innerHTML='<span><b></b> <span style="color:#64748b"></span></span><button>Remove</button>';
    li.querySelector("b").textContent=f.name;
    const pages=f.pages?(' · '+f.pages+' pages'):'';
    li.querySelector("span span").textContent='('+(f.text.length/1000).toFixed(1)+'k chars'+pages+')';
    li.querySelector("button").onclick=()=>{fileTexts.splice(i,1);renderFiles();rebuildCombined();};
    fileList.appendChild(li);
  });
  const total=fileTexts.reduce((a,f)=>a+f.text.length,0);
  if(fileTexts.length)$('fileStatus').textContent=fileTexts.length+' file(s) · '+(total/1000).toFixed(1)+'k chars total · full text used';
  else $('fileStatus').textContent='';
}
drop.onclick=e=>{if(e.target.tagName!=="BUTTON")fileInput.click();};
["dragover","dragenter"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over");}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over");}));
drop.addEventListener("drop",e=>handleFiles(e.dataTransfer.files));
fileInput.onchange=()=>handleFiles(fileInput.files);
let pasteT=null;
pasteBox.addEventListener("input",()=>{clearTimeout(pasteT);pasteT=setTimeout(rebuildCombined,300);});
$('sampleBtn').onclick=()=>{pasteBox.value="Photosynthesis is the process by which green plants make food using sunlight, water and carbon dioxide. Chlorophyll is the green pigment that captures light energy in leaves. Mitochondria is known as the powerhouse of the cell because it produces ATP. The human heart has four chambers: two atria and two ventricles. Water boils at 100 degrees Celsius at sea level. The Philippines declared independence on June 12, 1898. Jose Rizal is the national hero of the Philippines. Earthquakes are caused by the sudden movement of tectonic plates. Jupiter is the largest planet in the solar system. Democracy is a system of government where power comes from the people.";rebuildCombined();};
$('clearBtn').onclick=()=>{fileTexts=[];pasteBox.value="";renderFiles();rebuildCombined();};

/* ---------- mode + options ---------- */
document.querySelectorAll("#modeCards .mode-card").forEach(c=>c.onclick=()=>{
  document.querySelectorAll("#modeCards .mode-card").forEach(x=>x.classList.remove("active"));
  c.classList.add("active");mode=c.dataset.mode;
  $('countDiffWrap').style.display=(mode==="review"||mode==="flash"||mode==="knight")?"none":"";
  refreshStartBtn();
});
document.querySelectorAll("#diffPills .pill").forEach(p=>p.onclick=()=>{document.querySelectorAll("#diffPills .pill").forEach(x=>x.classList.remove("active"));p.classList.add("active");difficulty=p.dataset.diff;});
$('qNum').oninput=e=>$('qNumLabel').textContent=e.target.value;

/* ---------- staged flows: 1) load to AI, 2) pick style (instant start) ---------- */
const PREP_STEPS=["Reading your pages","Checking AI quota","Extracting the big ideas","Listing key terms","Material ready"];
$('startBtn').onclick=()=>{
  if(!prepared||docHash(combinedText)!==prepared.hash){err("Load your material to the AI first (step 1).");chooseCard.scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(mode==="review")return startReview();
  return startExam(mode);
};
analyzeBtn.onclick=()=>startPrepare();
async function startPrepare(){
  if(combinedText.trim().length<200){perr("Add more material first (upload a file or paste notes).");return;}
  const id=++runId;
  showLoading(PREP_STEPS);
  analyzeBtn.disabled=true;
  pinfo("Loading material to AI… (one quick call, ~5s)");
  try{
    const sample=sampleWholeDoc(combinedText,12000);
    const res=await serverPrepare(sampleWholeDoc(combinedText,6000));
    if(id!==runId)return;
    prepared={sample,hash:docHash(combinedText),title:(res.prep&&res.prep.title)||'Your material',model:res.model||''};
    const bl=(res.prep&&res.prep.bullets||[]).slice(0,5).map(escapeHtml);
    const tm=(res.prep&&res.prep.terms||[]).slice(0,8).map(escapeHtml);
    matSummary.innerHTML='<div class="prep-top"><b>“'+escapeHtml(prepared.title)+'” loaded to AI</b><span> · '+Number(res.words||0).toLocaleString()+' words — pick a style, it starts instantly.</span></div>'
      +'<details class="prep-more"><summary>Key points &amp; terms</summary>'
      +(bl.length?'<ul>'+bl.map(b=>'<li>'+b+'</li>').join('')+'</ul>':'')
      +(tm.length?'<div class="prep-terms">Key terms: '+tm.join(' · ')+'</div>':'')
      +'</details>';
    pok("Loaded — pick your study style.");
    refreshFlow();
    hideLoading();
    showView('choose');
  }catch(e){
    if(id!==runId)return;
    hideLoading();
    const msg=String((e&&e.message)||e||'');
    perr(e.name==="AbortError"?"Cancelled.":"Could not load ("+msg+"). "+(/rate-limited|busy|429|503/i.test(msg)?"Quota busy — wait ~1 min and press again.":"Check internet and try again."));
  }finally{refreshFlow();}
}
async function startExam(kind,retried){
  if(!prepared||docHash(combinedText)!==prepared.hash){err("Load your material to the AI first (step 1).");return;}
  if(kind==="enum"||kind==="ident")return startWritten(kind,retried);
  if(kind==="flash")return startFlash(retried);
  if(kind==="speed")return startSpeed(retried);
  if(kind==="knight")return startKnight();
  testType=kind;
  const n=Math.min(parseInt($('qNum').value),25);
  const id=++runId;
  showLoading(EXAM_STEPS);
  startBtn.disabled=true;
  try{
    const res=await serverExam(kind,n,difficulty,prepared.sample);
    if(id!==runId)return; // cancelled or superseded
    questions=res.questions.map(q=>({...q,user:null}));
    renderQuiz(res.short||0,n,res.model);
    hideLoading();showView('exam');
  }catch(e){
    if(id!==runId)return;
    const msg=String((e&&e.message)||e||'');
    // Transient quota (429/503): wait ~8s and retry once automatically.
    if(!retried&&/rate-limited|busy \(\d+\)|429|503/i.test(msg)){
      info("AI is busy (quota) — retrying once in 8s… don't click.");
      await new Promise(r=>setTimeout(r,8000));
      if(id!==runId)return;
      hideLoading();
      return startExam(kind,true);
    }
    hideLoading();
    err(e.name==="AbortError"?"Cancelled.":"Could not build exam ("+msg+"). "+(/rate-limited|busy|429|503/i.test(msg)?"Wait ~1 min, then press Start again.":"Check internet and try again."));
  }finally{if(!retried){refreshFlow();}}
}
const WRITTEN_STEPS=["Reading your pages","Picking list-worthy facts","Writing your questions","Checking the answers"];
async function startWritten(kind,retried){
  if(!prepared||docHash(combinedText)!==prepared.hash){err("Load your material to the AI first (step 1).");return;}
  testType=kind;
  const n=Math.min(parseInt($('qNum').value),25);
  const id=++runId;
  showLoading(WRITTEN_STEPS);
  startBtn.disabled=true;
  try{
    const res=await serverExam(kind,n,difficulty,prepared.sample);
    if(id!==runId)return;
    questions=res.questions.map(q=>({...q,user:null}));
    renderWritten(res.short||0,n,res.model);
    hideLoading();showView('exam');
  }catch(e){
    if(id!==runId)return;
    const msg=String((e&&e.message)||e||'');
    if(!retried&&/rate-limited|busy \(\d+\)|429|503/i.test(msg)){
      info("AI is busy (quota) — retrying once in 8s… don't click.");
      await new Promise(r=>setTimeout(r,8000));
      if(id!==runId)return;
      hideLoading();
      return startWritten(kind,true);
    }
    hideLoading();
    err(e.name==="AbortError"?"Cancelled.":"Could not build exam ("+msg+"). "+(/rate-limited|busy|429|503/i.test(msg)?"Wait ~1 min, then press Start again.":"Check internet and try again."));
  }finally{if(!retried){refreshFlow();}}
}
async function startReview(retried){
  if(!prepared||docHash(combinedText)!==prepared.hash){err("Load your material to the AI first (step 1).");return;}
  const id=retried?runId:++runId;
  showLoading(REVIEW_STEPS);
  startBtn.disabled=true;
  try{
    const res=await serverReview(prepared.sample);
    if(id!==runId)return;
    const guide=res.guide||res;
    renderReview(guide,res.model||guide.model);
    hideLoading();showView('review');
  }catch(e){
    if(id!==runId)return;
    const msg=String((e&&e.message)||e||'');
    if(!retried&&/rate-limited|busy \(\d+\)|429|503/i.test(msg)){
      info("AI is busy (quota) — retrying once in 8s… don't click.");
      await new Promise(r=>setTimeout(r,8000));
      if(id!==runId)return;
      hideLoading();
      return startReview(true);
    }
    hideLoading();
    err(e.name==="AbortError"?"Cancelled.":"Could not build guide ("+msg+"). "+(/rate-limited|busy|429|503/i.test(msg)?"Wait ~1 min, then press Start again.":"Check internet and try again."));
  }finally{if(!retried)refreshFlow();}
}
$('testAiBtn').onclick=async()=>{
  info("Testing AI connection…");
  try{
    const res=await serverTest();
    ok("AI connected ("+(res.model||'Gemini')+") — reply: "+String(res.reply||'OK').slice(0,80));
  }catch(e){ err("AI test failed: "+(e.message||e)); }
};

/* ---------- exam + review buttons ---------- */
$('submitBtn').onclick=gradeQuiz;
$('retryBtn').onclick=retakeQuiz;
$('newBtn').onclick=()=>{if(prepared&&docHash(combinedText)===prepared.hash){showView('choose');startExam(testType);}else{showView('upload');refreshFlow();pinfo("Press “Load to AI” first.");}};
$('printBtn').onclick=()=>window.print();
$('revTestBtn').onclick=()=>{mode="mixed";document.querySelectorAll("#modeCards .mode-card").forEach(x=>x.classList.toggle("active",x.dataset.mode==="mixed"));$('countDiffWrap').style.display="";refreshFlow();showView('choose');if(prepared&&docHash(combinedText)===prepared.hash)startExam("mixed");else info("Press “Load to AI” first, then start the test.");};
$('revPrintBtn').onclick=()=>window.print();

rebuildCombined();

/* ---------- build tag: proves which versions actually loaded ---------- */
try{
  const cssm=(document.querySelector('link[href*="style.css"]')||{href:''}).href.match(/[?&]v=(\d+)/);
  const jsm=(document.currentScript&&document.currentScript.src||'').match(/[?&]v=(\d+)/);
  const el=$('revTag');
  if(el)el.textContent='· ui'+(cssm?' css'+cssm[1]:'')+(jsm?' js'+jsm[1]:'');
}catch(_){}
