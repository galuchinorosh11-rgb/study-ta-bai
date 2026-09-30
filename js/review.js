// Study-guide rendering. Accepts (guide, modelFallback) or (envelope).
function renderReview(d,modelFallback){
  // Unwrap envelope {guide,model} if caller passed it by mistake.
  if(d&&!d.lessons&&d.guide) d=d.guide;
  if(!d||!Array.isArray(d.lessons)||!d.lessons.length)
    throw new Error('AI returned an empty guide — try again with more material.');
  const model=d.model||modelFallback||'';
  $('revMeta').textContent='· '+d.lessons.length+' lessons · '+(d.terms||[]).length+' key terms · AI'+(model?' · '+model:'');
  $('revSub').textContent=(d.title||'Study Guide');
  let h='';
  h+='<div class="rev-grid">'+d.lessons.map((l,i)=>
    '<div class="lesson"><div class="num">Lesson '+(i+1)+'</div><h3>'+escapeHtml(l.title)+'</h3>'
    +(l.simple?'<div class="simple">'+escapeHtml(l.simple)+'</div>':'')
    +(l.points&&l.points.length?'<ul>'+l.points.map(p=>'<li>'+escapeHtml(p)+'</li>').join('')+'</ul>':'')
    +(l.why?'<div class="why">Why it matters: '+escapeHtml(l.why)+'</div>':'')
    +'</div>').join('')+'</div>';
  if(d.terms&&d.terms.length){
    h+='<label class="lbl">Key terms</label><div class="terms">'+d.terms.map(t=>
      '<div class="term"><b>'+escapeHtml(t.term)+'</b> — '+escapeHtml(t.meaning)+'</div>').join('')+'</div>';
  }
  if(d.tips&&d.tips.length){
    h+='<label class="lbl">Exam tips</label><ol class="tips">'+d.tips.map(t=>'<li>'+escapeHtml(t)+'</li>').join('')+'</ol>';
  }
  $('revBox').innerHTML=h;
}
