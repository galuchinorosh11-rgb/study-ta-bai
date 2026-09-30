// Shared helpers + global state (loaded first).
const $ = id => document.getElementById(id);
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

let combinedText="", fileTexts=[], mode="mixed", testType="mixed",
    difficulty="easy", questions=[], twoCol=false;
let runId=0; // stale-result guard: only the latest run may render
