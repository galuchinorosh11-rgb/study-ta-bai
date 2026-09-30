// File reading: text, PDF (all pages), DOCX. Returns clean plain text.
function pageToText(tc){
  const items=(tc.items||[]).filter(it=>it.str!=null&&it.str!=="");
  if(!items.length)return "";
  let out="",lastStartX=null,lastEndX=null,lastY=null,lastH=10;
  for(const it of items){
    const tr=it.transform||[0,0,0,10,0,0];
    const x=tr[4],y=tr[5];
    const h=Math.abs(tr[3])||Math.abs(tr[0])||10;
    const hasW=typeof it.width==="number";
    const endX=hasW?x+it.width:null;
    if(lastY!==null&&Math.abs(y-lastY)>Math.max(2.5,lastH*0.35)){
      out=out.trimEnd()+"\n";lastStartX=null;lastEndX=null;
    }else if(lastStartX!==null){
      let needSpace;
      if(hasW&&lastEndX!==null){needSpace=(x-lastEndX)>Math.max(1,lastH*0.15);}
      else{needSpace=(x-lastStartX)>lastH*0.6;}
      if(needSpace&&out&&!out.endsWith("\n")&&!out.endsWith(" ")&&!out.endsWith("-"))out+=" ";
    }
    out+=it.str;
    lastStartX=x;lastEndX=endX;lastY=y;lastH=h;
    if(it.hasEOL){out=out.trimEnd()+"\n";lastStartX=null;lastEndX=null;lastY=null;}
  }
  return out;
}
function sanitizeExtracted(t){
  return String(t||"")
    .replace(/ﬁ/g,"fi").replace(/ﬂ/g,"fl").replace(/ﬀ/g,"ff").replace(/ﬃ/g,"ffi").replace(/ﬄ/g,"ffl")
    .normalize("NFKC")
    .replace(/[­\u00AD]/g,"")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"")
    .replace(/(\p{L})-\n(\p{L})/gu,"$1$2")
    .replace(/[ \t\u00A0]+/g," ")
    .split("\n").map(l=>l.trim()).filter(l=>l.length>0).join("\n");
}
async function readAnyFile(f,onProg){
  const ext=f.name.split(".").pop().toLowerCase();
  if(ext==="pdf"){
    if(typeof pdfjsLib==="undefined")throw new Error("PDF needs internet once. Use .txt offline.");
    pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    let pdf;
    try{pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;}
    catch(e){if(/password|encrypt/i.test(e.message||""))throw new Error("PDF is password-protected. Unlock it first.");throw e;}
    const total=pdf.numPages;
    let out="";
    for(let i=1;i<=total;i++){
      const p=await pdf.getPage(i);
      const c=await p.getTextContent();
      let t=sanitizeExtracted(pageToText(c));
      if(!t.trim())t=sanitizeExtracted(c.items.map(s=>s.str).join(" "));
      out+=t+"\n\n";
      if(onProg)onProg({done:i,total});
      if(i%5===0)await new Promise(r=>setTimeout(r,0));
    }
    await pdf.destroy().catch(()=>{});
    return {text:sanitizeExtracted(out).replace(/\n{3,}/g,"\n\n").trim(),pages:total};
  }
  if(ext==="docx"){
    if(typeof mammoth==="undefined")throw new Error("DOCX needs internet once.");
    const r=await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()});return {text:sanitizeExtracted(r.value),pages:0};
  }
  if(["png","jpg","jpeg","gif","bmp","webp"].includes(ext))throw new Error("Images not supported.");
  return {text:sanitizeExtracted(await f.text()),pages:0};
}
async function handleFiles(files){
  const st=$('fileStatus'), fileInput=$('fileInput');
  fileInput.disabled=true;
  for(const f of files){
    try{
      st.textContent='Reading '+f.name+'…';
      const res=await readAnyFile(f,(p)=>{st.textContent='Reading '+f.name+'… page '+p.done+'/'+p.total;});
      if(res.text.trim().length<50){
        alert('"'+f.name+'" — almost no selectable text found. If scanned, export/OCR to a text PDF or copy-paste the lesson.');
        st.textContent='';continue;
      }
      fileTexts.push({name:f.name,text:'--- '+f.name+(res.pages?' ('+res.pages+' pages)':'')+' ---\n'+res.text,pages:res.pages||0});
      st.textContent='Read '+f.name+': '+(res.pages?res.pages+' pages, ':'')+(res.text.length/1000).toFixed(1)+'k chars';
    }catch(e){alert('Could not read '+f.name+': '+e.message);st.textContent='';}
  }
  fileInput.disabled=false;
  renderFiles();rebuildCombined();
}
