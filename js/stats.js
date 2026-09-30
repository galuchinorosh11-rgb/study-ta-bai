// Lightweight text stats for the home counters (no question building here — AI does that).
const STOP=new Set("a,an,the,and,or,but,if,then,else,when,while,of,at,by,for,with,about,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,don,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,ought,i,you,he,she,it,we,they,their,this,that,these,those,as,also,may,might,must,shall,ang,mga,sa,ng,na,ug,og,kay,pero,kana,kini,siya,ako,ikaw,kami".split(","));
function sampleWholeDoc(text,max){
  text=text.replace(/\s+/g," ").trim();
  if(text.length<=max)return text;
  const parts=5,chunk=Math.floor(max/parts),out=[];
  for(let i=0;i<parts;i++){
    const start=Math.floor(i*(text.length-chunk)/(parts-1));
    let c=text.slice(start,start+chunk);
    if(i>0)c=c.replace(/^[^\.]+\.\s/,"");
    out.push(c);
  }
  return out.join("\n…\n");
}
function splitSentences(t){
  return (t.replace(/\s+/g," ").match(/[^.!?]+[.!?]+["']?/g)||[]).map(s=>s.trim())
    .filter(s=>{const w=s.split(" ").length;return w>=7&&w<=35&&s.length>40&&/[a-zA-Z]{3,}/.test(s);});
}
function extractKeywords(text){
  const freq={};
  text.toLowerCase().replace(/[^a-z0-9ñü\s\-\.]/gi," ").split(/\s+/).forEach(w=>{
    w=w.replace(/^\W+|\W+$/g,"");
    if(w.length>=4&&!STOP.has(w)&&/[a-z]/i.test(w))freq[w]=(freq[w]||0)+1;
  });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
}
function scoreSentences(sents,keys){
  const keySet=new Set(keys.slice(0,80).map(k=>k.toLowerCase()));
  return sents.map(s=>{
    let sc=0;const low=s.toLowerCase();
    if(/\b(is|are|was|were|refers to|defined as|means|consists of|known as|called)\b/.test(low))sc+=3;
    if(/\b\d+\b/.test(s))sc+=2;
    if(/\b[A-Z][a-z]+\b/.test(s))sc+=1;
    const hits=s.toLowerCase().split(/[^a-z0-9]+/).filter(w=>keySet.has(w)).length;
    sc+=Math.min(hits,4);
    return {s,score:sc};
  }).sort((a,b)=>b.score-a.score);
}
