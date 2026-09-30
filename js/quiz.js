// Exam rendering + grading (questions always come from the AI server).
function renderQuiz(short,asked,model){
  try{window._examGame=null;}catch(_){}
  $('quizMeta').textContent='· '+questions.length+' questions · '+questions.filter(q=>q.kind==="mcq").length+' MCQ · '+questions.filter(q=>q.kind==="tf").length+' T/F · '+difficulty+' · AI'+(model?' · '+model:'');
  const sn=$('shortNote');
  if(short>0){sn.style.display="block";sn.textContent='Heads up: your notes yielded '+questions.length+' solid questions out of '+asked+' asked. Add more material for longer exams.';}
  else sn.style.display="none";
  $('resultBox').innerHTML="";$('resultBox').onclick=null;$('resultBox').style.cursor='';$('resultBox').title='';
  $('mistakeBox').innerHTML="";lastGrading=null;closeScoreModal();
  $('prog').style.display="";$('progText').style.display="";
  $('submitBtn').style.display="";$('submitBtn').onclick=gradeQuiz;$('retryBtn').style.display="none";$('newBtn').style.display="none";$('printBtn').style.display="none";$('scoreBtn').style.display="none";
  const box=$('quizBox');box.classList.toggle('two-col',twoCol);box.innerHTML="";
  questions.forEach((q,i)=>{
    const div=document.createElement("div");div.className="quiz-q";div.id="q"+i;
    let inner='<div class="qmeta">Question '+(i+1)+' of '+questions.length+' — '+(q.kind==="mcq"?"Multiple choice":"True / False")+'</div>'
      +'<div class="qstem">'+escapeHtml(q.question||"")+'</div>';
    if(q.kind==="mcq")inner+=q.options.map(o=>'<button class="opt" data-q="'+i+'" data-v="'+escapeHtml(o)+'">'+escapeHtml(o)+'</button>').join("");
    else inner+='<div class="tf-row"><button class="opt" data-q="'+i+'" data-v="True">True</button><button class="opt" data-q="'+i+'" data-v="False">False</button></div>';
    inner+='<div class="explain" id="exp'+i+'" style="display:none"></div><div class="src" id="src'+i+'"></div>';
    div.innerHTML=inner;box.appendChild(div);
  });
  box.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{
    const qi=+b.dataset.q;questions[qi].user=b.dataset.v;
    document.querySelectorAll('[data-q="'+qi+'"]').forEach(x=>x.classList.remove("selected"));
    b.classList.add("selected");updateProg();
  });
  updateProg();
}
function updateProg(){
  const a=questions.filter(q=>q.user!=null).length;
  $('prog').style.width=(questions.length?a/questions.length*100:0)+"%";
  $('progText').textContent=a+" / "+questions.length+" answered";
}
function gradeQuiz(){
  if(!questions.length)return;
  if(questions.some(q=>q.user==null)&&!confirm("Some unanswered. Submit anyway?"))return;
  let score=0;
  questions.forEach((q,i)=>{
    const ok=(q.user||"").trim().toLowerCase()===(q.answer||"").trim().toLowerCase();
    if(ok)score++;
    const div=$('q'+i);div.classList.add("graded",ok?"correct":"wrong");
    div.querySelectorAll(".opt").forEach(b=>{
      b.disabled=true;const v=b.dataset.v;
      const isAns=v.trim().toLowerCase()===q.answer.trim().toLowerCase();
      if(isAns)b.classList.add("right");else if(v===q.user)b.classList.add("selected");else b.classList.add("dim");
    });
    const ex=$('exp'+i);ex.style.display="block";
    ex.innerHTML=(ok?"<b>Correct.</b> ":"<b>Incorrect.</b> You: <b>"+escapeHtml(q.user||"—")+"</b> · Answer: <b>"+escapeHtml(q.answer)+"</b><br/>")+escapeHtml(q.explanation||"");
    if(q.source)$('src'+i).textContent='Source: "'+q.source+'"';
  });
  const pct=Math.round(score/questions.length*100);
  const msg=pct>=90?"Excellent — exam ready.":pct>=75?"Good — quick review left.":pct>=50?"Passing — review and retake.":"Review notes and try again.";
  $('resultBox').innerHTML='<div class="result"><div style="font-size:13px;color:#a5b4fc">Score</div><div class="score">'+score+'/'+questions.length+' ('+pct+'%)</div><div>'+msg+'</div></div>';
  $('submitBtn').style.display="none";$('retryBtn').style.display="";$('newBtn').style.display="";$('printBtn').style.display="";$('scoreBtn').style.display="";
  const wrong=[];
  questions.forEach((q,i)=>{ if((q.user||"").trim().toLowerCase()!==(q.answer||"").trim().toLowerCase())wrong.push(i); });
  lastGrading={score,total:questions.length,wrong,pct,msg};
  renderMistakes();
  const rb=$('resultBox');
  rb.style.cursor='pointer';rb.title='Show score card';
  rb.onclick=()=>openScoreModal();
  openScoreModal();
}
/* ---------- written answers: enumeration + identification ---------- */
function normAnswer(s){return String(s||"").toLowerCase().replace(/[^a-z0-9ñ ]/gi," ").replace(/\s+/g," ").trim();}
function renderWritten(short,asked,model){
  try{window._examGame=null;}catch(_){}
  const nEnum=questions.filter(q=>q.kind==="enum").length;
  $('quizMeta').textContent='· '+questions.length+' questions · '+(nEnum?nEnum+' enumeration':'identification')+' · '+difficulty+' · AI'+(model?' · '+model:'');
  const sn=$('shortNote');
  if(short>0){sn.style.display="block";sn.textContent='Heads up: your notes yielded '+questions.length+' solid questions out of '+asked+' asked. Add more material for longer exams.';}
  else sn.style.display="none";
  $('resultBox').innerHTML="";$('resultBox').onclick=null;$('resultBox').style.cursor='';$('resultBox').title='';
  $('mistakeBox').innerHTML="";lastGrading=null;closeScoreModal();
  $('submitBtn').style.display="";$('submitBtn').onclick=gradeWritten;
  $('retryBtn').style.display="none";$('newBtn').style.display="none";$('printBtn').style.display="none";$('scoreBtn').style.display="none";
  $('prog').style.display="";$('progText').style.display="";
  const box=$('quizBox');box.classList.remove('two-col');box.innerHTML="";
  questions.forEach((q,i)=>{
    const div=document.createElement("div");div.className="quiz-q";div.id="q"+i;
    let inner='<div class="qmeta">Question '+(i+1)+' of '+questions.length+' — '+(q.kind==="enum"?"Enumeration":"Identification")+'</div>'
      +'<div class="qstem">'+escapeHtml(q.question||"")+'</div>';
    if(q.kind==="enum"){
      inner+=q.answers.map((a,k)=>'<input class="w-input" data-q="'+i+'" data-i="'+k+'" placeholder="Item '+(k+1)+' of '+q.answers.length+'" autocomplete="off"/>').join("");
    }else{
      inner+='<input class="w-input" data-q="'+i+'" placeholder="Type your answer…" autocomplete="off"/>';
    }
    inner+='<div class="explain" id="exp'+i+'" style="display:none"></div><div class="src" id="src'+i+'"></div>';
    div.innerHTML=inner;box.appendChild(div);
  });
  box.querySelectorAll(".w-input").forEach(el=>el.addEventListener("input",updateProgWritten));
  updateProgWritten();
}
function updateProgWritten(){
  const inputs=[...document.querySelectorAll('#quizBox .w-input')];
  const filled=inputs.filter(el=>el.value.trim()!=="").length;
  $('prog').style.width=(inputs.length?filled/inputs.length*100:0)+"%";
  $('progText').textContent=filled+" / "+inputs.length+" answered";
}
function gradeWritten(){
  if(!questions.length)return;
  if(![...document.querySelectorAll('#quizBox .w-input')].some(el=>el.value.trim()!=="")&&!confirm("Nothing answered. Submit anyway?"))return;
  let score=0;
  questions.forEach((q,i)=>{
    const div=$('q'+i);
    if(q.kind==="enum"){
      const inputs=[...document.querySelectorAll('input.w-input[data-q="'+i+'"]')];
      const entered=inputs.map(el=>el.value);
      const exp=q.answers.map(normAnswer);
      const used=new Array(exp.length).fill(false);
      let hits=0;
      entered.forEach(ev=>{
        const nv=normAnswer(ev);
        if(!nv)return;
        const k=exp.findIndex((e,j)=>!used[j]&&e===nv);
        if(k>=0){used[k]=true;hits++;}
      });
      const ok=hits===exp.length;
      if(ok)score++;
      inputs.forEach(el=>{
        el.disabled=true;
        const nv=normAnswer(el.value);
        el.classList.add(nv!==""&&exp.includes(nv)?"right":(nv!==""?"wrong":"dim"));
      });
      q.user=entered.map(e=>e.trim()).filter(Boolean).join(" | ")||"—";
      div.classList.add("graded",ok?"correct":"wrong");
      const ex=$('exp'+i);ex.style.display="block";
      ex.innerHTML=(ok?"<b>Complete!</b> ":"<b>"+hits+"/"+exp.length+" correct.</b> Expected: <b>"+escapeHtml(q.answers.join(" · "))+"</b><br/>")+escapeHtml(q.explanation||"");
    }else{
      const el=document.querySelector('input.w-input[data-q="'+i+'"]');
      const uv=el?el.value:"";
      if(el)el.disabled=true;
      const nv=normAnswer(uv);
      const acc=[q.answer].concat(q.alternates||[]).map(normAnswer);
      const ok=nv!==""&&acc.includes(nv);
      if(el)el.classList.add(ok?"right":"wrong");
      if(ok)score++;
      q.user=uv.trim()||"—";
      div.classList.add("graded",ok?"correct":"wrong");
      const ex=$('exp'+i);ex.style.display="block";
      ex.innerHTML=(ok?"<b>Correct.</b> ":"<b>Incorrect.</b> You: <b>"+escapeHtml(q.user)+"</b> · Answer: <b>"+escapeHtml(q.answer)+"</b><br/>")+escapeHtml(q.explanation||"");
      if(q.source)$('src'+i).textContent='Source: "'+q.source+'"';
    }
  });
  const pct=Math.round(score/questions.length*100);
  const msg=pct>=90?"Excellent — exam ready.":pct>=75?"Good — quick review left.":pct>=50?"Passing — review and retake.":"Review notes and try again.";
  $('resultBox').innerHTML='<div class="result"><div style="font-size:13px;color:#a5b4fc">Score</div><div class="score">'+score+'/'+questions.length+' ('+pct+'%)</div><div>'+msg+'</div></div>';
  const rb2=$('resultBox');
  rb2.style.cursor='pointer';rb2.title='Show score card';
  rb2.onclick=()=>openScoreModal();
  $('submitBtn').style.display="none";$('retryBtn').style.display="";$('newBtn').style.display="";$('printBtn').style.display="";$('scoreBtn').style.display="";
  const wrong=[];
  questions.forEach((q,i)=>{
    if(q.kind==="enum"){
      const exp=q.answers.map(normAnswer);
      const got=String(q.user==="—"?"":q.user).split(" | ").map(normAnswer).filter(Boolean);
      const used=new Array(exp.length).fill(false);
      let hits=0;
      got.forEach(g=>{const k=exp.findIndex((e,j)=>!used[j]&&e===g);if(k>=0){used[k]=true;hits++;}});
      if(hits!==exp.length)wrong.push(i);
    }else{
      const nv=normAnswer(q.user==="—"?"":q.user);
      const acc=[q.answer].concat(q.alternates||[]).map(normAnswer);
      if(nv===""||!acc.includes(nv))wrong.push(i);
    }
  });
  lastGrading={score,total:questions.length,wrong,pct,msg};
  renderMistakes();
  openScoreModal();
}
/* ---------- score modal + focus list ---------- */
let lastGrading=null;
function openScoreModal(){
  const g=lastGrading;if(!g)return;
  $('scoreTitle').textContent=g.pct>=90?"Excellent!":g.pct>=75?"Good job!":g.pct>=50?"Keep going!":"Don't give up!";
  $('scoreMsg').textContent=g.msg;
  $('scoreFrac').textContent=g.score+'/'+g.total;
  $('scoreRight').textContent=g.score+' right';
  $('scoreWrong').textContent=(g.total-g.score)+' wrong';
  $('reviewMissBtn').textContent=g.wrong.length?('Review mistakes ('+g.wrong.length+')'):'See focus list';
  const C=2*Math.PI*52,fg=$('ringFg');
  fg.style.transition='none';fg.style.strokeDasharray=C;fg.style.strokeDashoffset=C;
  const pctEl=$('scorePct');pctEl.textContent='0%';
  $('scoreModal').classList.add('open');
  $('scoreModal').setAttribute('aria-hidden','false');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fg.style.transition='stroke-dashoffset 1s ease-out';
    fg.style.strokeDashoffset=C*(1-g.pct/100);
    const t0=performance.now();
    (function tick(t){const p=Math.min((t-t0)/900,1);pctEl.textContent=Math.round(g.pct*p)+'%';if(p<1)requestAnimationFrame(tick);})(t0);
  }));
}
function closeScoreModal(){
  const m=$('scoreModal');if(!m)return;
  m.classList.remove('open');m.setAttribute('aria-hidden','true');
}
function renderMistakes(){
  const box=$('mistakeBox');if(!box)return;
  const g=lastGrading;
  if(!g){box.innerHTML="";return;}
  if(!g.wrong.length){
    box.innerHTML='<div class="mistakes"><h3>Focus list</h3><div class="perfect">Flawless — nothing to fix. Raise the difficulty or hit Regenerate for a fresh set.</div></div>';
    return;
  }
  let h='<div class="mistakes"><h3>Focus list — '+g.wrong.length+' to fix</h3>'
    +'<p class="desc">Your wrong answers with the correct facts. Make memory hooks, read them, then retake.</p>'
    +'<div class="row"><button id="hooksBtn">Make memory hooks</button></div><div class="status" id="hooksStatus"></div>';
  g.wrong.forEach((qi,k)=>{
    const q=questions[qi];
    h+='<div class="miss"><div class="qmeta">Question '+(qi+1)+'</div>'
      +'<div class="qstem">'+escapeHtml(q.question||"")+'</div>'
      +'<div class="ans-row you"><span>You</span><b>'+escapeHtml(q.user||"—")+'</b></div>'
      +'<div class="ans-row right"><span>Correct</span><b>'+escapeHtml(q.answer||"")+'</b></div>'
      +'<div class="why">'+escapeHtml(q.explanation||"")+'</div>'
      +'<div class="hook" id="hook'+k+'" style="display:none"></div></div>';
  });
  box.innerHTML=h+'</div>';
  $('hooksBtn').onclick=makeHooks;
}
async function makeHooks(){
  const g=lastGrading;if(!g||!g.wrong.length)return;
  const btn=$('hooksBtn'),st=$('hooksStatus');
  btn.disabled=true;st.className='status';st.textContent='Writing memory hooks…';
  try{
    const items=g.wrong.map(qi=>({question:questions[qi].question,answer:questions[qi].answer}));
    const res=await serverHooks(items);
    (res.hooks||[]).forEach((hk,k)=>{
      const el=$('hook'+k);
      if(el&&hk){el.style.display="";el.innerHTML='<b>Remember:</b> '+escapeHtml(hk);}
    });
    st.className='status ok';st.textContent='Hooks ready — read them, then retake.';
  }catch(e){st.className='status err';st.textContent='Could not make hooks: '+((e&&e.message)||e);}
  finally{btn.disabled=false;}
}
$('scoreClose').onclick=closeScoreModal;
$('scoreBtn').onclick=()=>{if(lastGrading)openScoreModal();};
$('scoreModal').addEventListener('click',e=>{if(e.target===$('scoreModal'))closeScoreModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeScoreModal();});
$('reviewMissBtn').onclick=()=>{closeScoreModal();renderMistakes();const b=$('mistakeBox');if(b)b.scrollIntoView({behavior:'smooth',block:'start'});};
$('viewTestBtn').onclick=()=>{closeScoreModal();const q=$('quizBox');if(q)q.scrollIntoView({behavior:'smooth',block:'start'});};
$('scoreRetakeBtn').onclick=()=>{closeScoreModal();retakeQuiz();const q=$('quizBox');if(q)q.scrollIntoView({behavior:'smooth',block:'start'});};
function retakeQuiz(){
  questions=questions.map(q=>({...q,user:null}));
  const saved=questions;
  const written=saved.length>0&&(saved[0].kind==="enum"||saved[0].kind==="ident");
  $('resultBox').innerHTML="";$('resultBox').onclick=null;$('resultBox').style.cursor='';$('resultBox').title='';$('mistakeBox').innerHTML="";lastGrading=null;closeScoreModal();$('submitBtn').style.display="";$('submitBtn').onclick=written?gradeWritten:gradeQuiz;$('retryBtn').style.display="none";$('newBtn').style.display="none";$('printBtn').style.display="none";$('scoreBtn').style.display="none";
  const box=$('quizBox');box.innerHTML="";
  saved.forEach((q,i)=>{
    const div=document.createElement("div");div.className="quiz-q";div.id="q"+i;
    let inner='<div class="qmeta">Question '+(i+1)+' of '+saved.length+'</div><div class="qstem">'+escapeHtml(q.question)+'</div>';
    if(q.kind==="enum")inner+=q.answers.map((a,k)=>'<input class="w-input" data-q="'+i+'" data-i="'+k+'" placeholder="Item '+(k+1)+' of '+q.answers.length+'" autocomplete="off"/>').join("");
    else if(q.kind==="ident")inner+='<input class="w-input" data-q="'+i+'" placeholder="Type your answer…" autocomplete="off"/>';
    else if(q.kind==="mcq")inner+=q.options.map(o=>'<button class="opt" data-q="'+i+'" data-v="'+escapeHtml(o)+'">'+escapeHtml(o)+'</button>').join("");
    else inner+='<div class="tf-row"><button class="opt" data-q="'+i+'" data-v="True">True</button><button class="opt" data-q="'+i+'" data-v="False">False</button></div>';
    div.innerHTML=inner+'<div class="explain" id="exp'+i+'" style="display:none"></div><div class="src" id="src'+i+'"></div>';
    box.appendChild(div);
  });
  box.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{const qi=+b.dataset.q;questions[qi].user=b.dataset.v;document.querySelectorAll('[data-q="'+qi+'"]').forEach(x=>x.classList.remove("selected"));b.classList.add("selected");updateProg();});
  box.querySelectorAll(".w-input").forEach(el=>el.addEventListener("input",updateProgWritten));
  if(written)updateProgWritten();else updateProg();
}
