// Flashcards: flip through AI-made cards, mark Know / Learning.
let flashCards=[], flashIdx=0, flashKnown=0, flashLearning=0, flashModel='';
const FLASH_STEPS=["Reading your pages","Picking key ideas","Writing your flashcards"];
async function startFlash(retried){
  if(!prepared||docHash(combinedText)!==prepared.hash){err("Load your material to the AI first (step 1).");return;}
  testType='flash';
  const n=10;
  const id=++runId;
  showLoading(FLASH_STEPS);
  startBtn.disabled=true;
  try{
    const res=await serverExam('flash',n,difficulty,prepared.sample);
    if(id!==runId)return;
    flashCards=res.questions.map(q=>({front:q.question,back:q.answer}));
    flashIdx=0;flashKnown=0;flashLearning=0;flashModel=res.model||'';
    renderFlash();
    hideLoading();window._examGame='flash';showView('exam');
  }catch(e){
    if(id!==runId)return;
    const msg=String((e&&e.message)||e||'');
    if(!retried&&/rate-limited|busy \(\d+\)|429|503/i.test(msg)){
      info("AI is busy (quota) — retrying once in 8s… don't click.");
      await new Promise(r=>setTimeout(r,8000));
      if(id!==runId)return;
      hideLoading();
      return startFlash(true);
    }
    hideLoading();
    err(e.name==="AbortError"?"Cancelled.":"Could not build flashcards ("+msg+"). "+(/rate-limited|busy|429|503/i.test(msg)?"Wait ~1 min, then press Start again.":"Check internet and try again."));
  }finally{if(!retried){refreshFlow();}}
}
function renderFlash(){
  questions=[];
  $('quizMeta').textContent='· '+flashCards.length+' flashcards'+(flashModel?' · AI · '+flashModel:'');
  $('shortNote').style.display="none";
  $('resultBox').innerHTML="";$('resultBox').onclick=null;$('mistakeBox').innerHTML="";lastGrading=null;
  $('prog').style.display="none";$('progText').style.display="none";
  $('submitBtn').style.display="none";$('retryBtn').style.display="none";
  $('newBtn').style.display="";$('printBtn').style.display="none";$('scoreBtn').style.display="none";
  const box=$('quizBox');box.classList.remove('two-col');
  box.innerHTML='<div class="flash-wrap">'
    +'<div class="flash-top"><span id="flashCount"></span><span id="flashBuckets"></span><button id="flashShuffle">Shuffle</button></div>'
    +'<div class="flashcard" id="flashCard" title="Click to flip"><div class="fin" id="flashInner">'
    +'<div class="fface ffront" id="flashFront"></div><div class="fface fback" id="flashBack"></div>'
    +'</div></div><div class="flash-hint">Click the card to flip</div>'
    +'<div class="row flash-btns"><button id="flashPrev">← Prev</button>'
    +'<button class="btn-dark" id="flashKnow">Got it ✓</button>'
    +'<button id="flashMiss">Still learning</button>'
    +'<button id="flashNext">Next →</button></div></div>';
  $('flashCard').onclick=()=>$('flashInner').classList.toggle('flipped');
  $('flashPrev').onclick=()=>{flashIdx=(flashIdx-1+flashCards.length)%flashCards.length;paintFlash();};
  $('flashNext').onclick=()=>{flashIdx=(flashIdx+1)%flashCards.length;paintFlash();};
  $('flashKnow').onclick=()=>{flashKnown++;flashIdx=(flashIdx+1)%flashCards.length;paintFlash();};
  $('flashMiss').onclick=()=>{flashLearning++;flashIdx=(flashIdx+1)%flashCards.length;paintFlash();};
  $('flashShuffle').onclick=()=>{
    for(let i=flashCards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[flashCards[i],flashCards[j]]=[flashCards[j],flashCards[i]];}
    flashIdx=0;paintFlash();
  };
  paintFlash();
}
function paintFlash(){
  if(!flashCards.length)return;
  $('flashInner').classList.remove('flipped');
  $('flashFront').textContent=flashCards[flashIdx].front;
  $('flashBack').textContent=flashCards[flashIdx].back;
  $('flashCount').textContent='Card '+(flashIdx+1)+' of '+flashCards.length;
  $('flashBuckets').textContent='✓ '+flashKnown+' · ↻ '+flashLearning;
}
