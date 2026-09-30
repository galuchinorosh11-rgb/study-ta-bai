// Speed round: same mixed questions, one at a time against a 20s clock.
let speedIdx=0, speedStreak=0, speedTimer=null, speedLeft=0, speedLock=false;
const SPEED_SECS=20, SPEED_STEPS=["Reading your pages","Writing speedy questions"];
async function startSpeed(retried){
  if(!prepared||docHash(combinedText)!==prepared.hash){err("Load your material to the AI first (step 1).");return;}
  testType='speed';
  const n=Math.min(parseInt($('qNum').value),25);
  const id=++runId;
  showLoading(SPEED_STEPS);
  startBtn.disabled=true;
  try{
    const res=await serverExam('mixed',n,difficulty,prepared.sample);
    if(id!==runId)return;
    questions=res.questions.map(q=>({...q,user:null}));
    speedIdx=0;speedStreak=0;
    window._speedShort=res.short||0;window._speedAsked=n;window._speedModel=res.model||'';
    hideLoading();showView('exam',true);
    renderSpeedQ();
  }catch(e){
    if(id!==runId)return;
    const msg=String((e&&e.message)||e||'');
    if(!retried&&/rate-limited|busy \(\d+\)|429|503/i.test(msg)){
      info("AI is busy (quota) — retrying once in 8s… don't click.");
      await new Promise(r=>setTimeout(r,8000));
      if(id!==runId)return;
      hideLoading();
      return startSpeed(true);
    }
    hideLoading();
    err(e.name==="AbortError"?"Cancelled.":"Could not build speed round ("+msg+"). "+(/rate-limited|busy|429|503/i.test(msg)?"Wait ~1 min, then press Start again.":"Check internet and try again."));
  }finally{if(!retried){refreshFlow();}}
}
function renderSpeedQ(){
  stopSpeedTimer();
  const total=questions.length;
  if(speedIdx>=total){return finishSpeed();}
  const q=questions[speedIdx];
  $('quizMeta').textContent='· SPEED ROUND · question '+(speedIdx+1)+' of '+total+' · streak '+speedStreak;
  $('shortNote').style.display="none";
  $('resultBox').innerHTML="";$('mistakeBox').innerHTML="";
  $('prog').style.display="none";$('progText').style.display="none";
  $('submitBtn').style.display="none";$('retryBtn').style.display="none";
  $('newBtn').style.display="none";$('printBtn').style.display="none";$('scoreBtn').style.display="none";
  speedLock=false;speedLeft=SPEED_SECS;
  const box=$('quizBox');box.classList.remove('two-col');
  let inner='<div class="speed-hud"><div class="speed-info"><b>Q '+(speedIdx+1)+'/'+total+'</b><span id="speedStreak">streak '+speedStreak+'</span></div>'
    +'<div class="speed-timer"><i id="speedFill"></i></div></div>'
    +'<div class="quiz-q"><div class="qmeta">'+(q.kind==="mcq"?"Multiple choice":"True / False")+' · '+SPEED_SECS+'s</div>'
    +'<div class="qstem">'+escapeHtml(q.question||"")+'</div>';
  if(q.kind==="mcq")inner+=q.options.map(o=>'<button class="opt" data-v="'+escapeHtml(o)+'">'+escapeHtml(o)+'</button>').join("");
  else inner+='<div class="tf-row"><button class="opt" data-v="True">True</button><button class="opt" data-v="False">False</button></div>';
  box.innerHTML=inner+'</div>';
  box.querySelectorAll(".opt").forEach(b=>b.onclick=()=>speedAnswer(b.dataset.v));
  speedTimer=setInterval(speedTick,100);
}
function speedTick(){
  speedLeft-=0.1;
  const f=$('speedFill');
  if(f)f.style.width=Math.max(speedLeft/SPEED_SECS*100,0)+"%";
  if(speedLeft<=0)speedAnswer(null);
}
function stopSpeedTimer(){if(speedTimer){clearInterval(speedTimer);speedTimer=null;}}
function speedAnswer(v){
  if(speedLock)return;
  speedLock=true;stopSpeedTimer();
  const q=questions[speedIdx];
  q.user=v;
  const ok=v!==null&&(v||"").trim().toLowerCase()===(q.answer||"").trim().toLowerCase();
  if(ok)speedStreak++;else speedStreak=0;
  document.querySelectorAll('#quizBox .opt').forEach(b=>{
    b.disabled=true;
    const isAns=(b.dataset.v||"").trim().toLowerCase()===q.answer.trim().toLowerCase();
    if(isAns)b.classList.add("right");else if(b.dataset.v===v)b.classList.add("selected");else b.classList.add("dim");
  });
  setTimeout(()=>{speedIdx++;renderSpeedQ();},650);
}
function finishSpeed(){
  stopSpeedTimer();
  $('prog').style.display="";$('progText').style.display="";
  renderQuiz(window._speedShort||0,window._speedAsked||questions.length,window._speedModel||'');
  gradeQuiz();
}
