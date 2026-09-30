// Dungeon Knight v2: pixel souls-like dungeon crawler.
// Pick a hero, clear rooms, loot chests (lesson questions) for powers,
// stack armor/crit, beat the Slime King every 5 depths. Local legends board.
let knight=null;
const KNIGHT_STEPS=["Reading your pages","Digging the dungeon"];
function stopKnight(){ if(knight){knight.dead=true;} knight=null; try{window._examGame=null;}catch(_){} }
function tierForK(depth){ return depth<=2?'easy':depth<=5?'medium':'hard'; }
function biomeFor(depth){
  const b=[
    {name:'Moss Cavern',floor:'#20261f',tile:'#262e25',wall:'#10140f',accent:'#4ade80'},
    {name:'Ember Forge',floor:'#2a1c12',tile:'#312014',wall:'#140c06',accent:'#fb923c'},
    {name:'Frost Deep',floor:'#182130',tile:'#1d2839',wall:'#0a0f1a',accent:'#7dd3fc'},
    {name:'Shadow Crypt',floor:'#221a33',tile:'#28203c',wall:'#0f0a19',accent:'#c084fc'},
  ];
  return b[(depth-1)%b.length];
}
/* ================= PIXEL SPRITES ================= */
function pxMap(rows,pal){
  const w=Math.max(...rows.map(r=>r.length)),h=rows.length;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');
  rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){const col=pal[row[x]];if(!col)continue;g.fillStyle=col;g.fillRect(x,y,1,1);}});
  return c;
}
const PALM={O:'#14141f',S:'#c7ccd6',s:'#7d8494',G:'#f5b301',g:'#8a6106',R:'#d63b3b',r:'#8f1d1d',B:'#23232e',E:'#ff3b3b',W:'#f4f4f4',P:'#8b5cf6',p:'#5b21b6',M:'#5eead4',m:'#0f766e',F:'#ffcf9e',N:'#2b3a55',n:'#141c2e',T:'#8a6b46',t:'#5c4426',C:'#f97316'};
// heads are 16 wide x 7 tall; '.' = transparent
const HEADS=[
{name:'Goldcrest',desc:'Balanced blade',mods:{},head:[
".....GGGG.....",
"....GGGGGG....",
"....SSSSSS....",
"...OSSSSSSSO..",
"...OSFFFFFSO..",
"...OSFEFFESO..",
"...OSFFFFFSO..",
],accent:'#f5b301'},
{name:'Nightvisor',desc:'+1 Armor, -speed',mods:{armor:1,speed:-15},head:[
"....BBBBBB....",
"...BBBBBBBB...",
"...BBBBBBBB...",
"..OBBBBBBBBO..",
"..OBBEEEEBBO..",
"..OBBBBBBBBO..",
"..OSBBBBBBSO..",
],accent:'#23232e'},
{name:'Bloodplume',desc:'+1 Attack',mods:{dmg:1},head:[
".....RRR......",
"....RRRRR.....",
"....SSSSSS....",
"...OSSSSSSSO..",
"...OSFFFFFSO..",
"...OSFEFFESO..",
"...OSFFFFFSO..",
],accent:'#d63b3b'},
{name:'Crownking',desc:'+2 Max HP',mods:{maxhp:2},head:[
"...G.G..G.G...",
"...GGGGGGGG...",
"...SSSSSSSS...",
"..OSSSSSSSSO..",
"..OSFFFFFFSO..",
"..OSFEFFFESO..",
"..OSFFFFFFSO..",
],accent:'#f5b301'},
{name:'Hoodshade',desc:'+12% speed',mods:{speed:28},head:[
"....NNNNNN....",
"...NNNNNNNN...",
"..ONNNNNNNNO..",
"..ONNFFFFNNO..",
"..ONFEFFEFNO..",
"..ONNFFFFNNO..",
"...NNNNNNNN...",
],accent:'#2b3a55'},
{name:'Stormhelm',desc:'+8% crit',mods:{crit:8},head:[
".....PPPP.....",
"...PPPPPPPP...",
"...PSSSSSSSP..",
"..OPSSSSSSSPO.",
"..OPSFFFFFSPO.",
"..OPSFEFFESPO.",
"..OPSSSPPSSPO.",
],accent:'#8b5cf6'},
{name:'Mintpony',desc:'Fast hands (rate)',mods:{rate:-40},head:[
"..MM......MM..",
"..MMMMMMMMMM..",
"...MMMMMMMM...",
"..OMMMMMMMMO..",
"..OMFFFFFMMO..",
"..OMFEFFFMMO..",
"...MFFFFFMM...",
],accent:'#5eead4'},
{name:'Hornfiend',desc:'+2 Attack, -2 HP',mods:{dmg:2,maxhp:-2},head:[
"..R........R..",
"..RRBBBBBBRR..",
"...BBBBBBBB...",
"..OBBBBBBBBO..",
"..OBBEEEEBBO..",
"..OBBBBBBBBO..",
"...BBBBBBBB...",
],accent:'#8f1d1d'},
{name:'Violetmage',desc:'Piercing start',mods:{pierce:1},head:[
"....PPPPPP....",
"..PPPPPPPPPP..",
"..PPPPPPPPPP..",
"..OPFFFFFFPO..",
"..OPFEFFFEPO..",
"..OPFFFFFFPO..",
"...PPPPPPPP...",
],accent:'#8b5cf6'},
];
const TORSO=[
".....SSSS.....",
"....SSSSSS....",
"...SSrrrrSS...",
"...SSrrrrSS...",
"....SSSSSS....",
];
const LEGS_A=[
"....nnnnnn....",
"....nn..nn....",
"....nn..nn....",
"...ttt..ttt...",
];
const LEGS_B=[
"....nnnnnn....",
".....nnnn.....",
"....nn..nn....",
"...ttt..ttt...",
];
const SPR_FOE={
slimeA:[
".....OOOO.....",
"...OOggggOO...",
"..OggggggggO..",
"..OgWWggWWgO..",
".OggWWggWWggO.",
".OggggggggggO.",
"..OrrrrrrrrO..",
"...OOOOOOOO...",
],
slimeB:[
"..............",
".....OOOO.....",
"...OOggggOO...",
"..OggWWWWggO..",
".OgggWWWWgggO.",
".OggggggggggO.",
"..OrrrrrrrrO..",
"...OOOOOOOO...",
],
batA:[
"..............",
".OO........OO.",
".OWW......WWO.",
".OWWWBBBBWWWO.",
"..OWBBBBBBWO..",
"...OBBEEBBBO..",
"....BBBBBB....",
],
batB:[
"..............",
"..............",
".....BBBB.....",
"...BBBBBBBB...",
".WBBBBBBBBBBW.",
".WBBEEBBEEBBW.",
"...BBBBBBBB...",
"....BBBBBB....",
],
bruteA:[
"....OOOOOO....",
"..OOrrrrrrOO..",
"..OrRRRRRRrO..",
"..ORREERRERO..",
"..ORRRRRRRRO..",
"..OrrrrrrrrO..",
"...OOOOOOOO...",
"..TTTTTTTTTT..",
"..TTTTTTTTTT..",
"..OOOOOOOOOO..",
"...tt....tt...",
"...tt....tt...",
],
bossA:[
".....GGGG.....",
"....GGGGGG....",
"....OOOOOO....",
"..OOggggggOO..",
".OggggggggggO.",
".OgWWggggWWgO.",
".OgWWggggWWgO.",
"OgggggrrrrgggO",
"OggggrrrrrggO.",
"OggggrrrrrggO.",
".OgggrrrrggO..",
"..OgggggggO...",
"...OOOOOOO....",
],
};
const SPR_PROP={
chestShut:[
"................",
"..OOOOOOOOOOOO..",
".OTTTTTTTTTTTTO.",
".OTGGTTTTGGTTO..",
".OTTTTTTTTTTTTO.",
".OOOOOOOOOOOOOO.",
".OTTTTTTTTTTTTO.",
".OTTTTTTTTTTTTO.",
".OTTTTTTTTTTTTO.",
"..OOOOOOOOOOOO..",
],
chestOpen:[
"................",
"..OOOOOOOOOOOO..",
"................",
".OOOOOOOOOOOOOO.",
".OTTTTTTTTTTTTO.",
".OTWWTTTTTTWWTO.",
".OTTTTTTTTTTTTO.",
"..OOOOOOOOOOOO..",
],
coin:[
"..OOOO..",
".OGGGGO.",
"OGGgGGGO",
"OGgGGGGO",
"OGGGGGGO",
".OGGGGO.",
"..OOOO..",
],
heart:[
"..RR..RR..",
".RRRRRRRR.",
".RWRRRRRR.",
".RRRRRRRR.",
"..RRRRRR..",
"...RRRR...",
"....RR....",
],
};
function spriteCache(){
  const cache={heroes:[],foes:{},props:{}};
  HEADS.forEach(h=>{
    const frames=[LEGS_A,LEGS_B].map(legs=>{
      const rows=[...h.head,...TORSO,...legs];
      return pxMap(rows,Object.assign({},PALM));
    });
    cache.heroes.push({frames:frames,w:16,h:7+5+4});
  });
  Object.keys(SPR_FOE).forEach(k=>{cache.foes[k]=pxMap(SPR_FOE[k],{O:'#14141f',g:'#4ade80',W:'#fff',r:'#166534',R:'#d63b3b',B:'#3b3b4d',E:'#ff3b3b',T:'#8a6b46',t:'#5c4426',G:'#f5b301'});});
  Object.keys(SPR_PROP).forEach(k=>{cache.props[k]=pxMap(SPR_PROP[k],{O:'#14141f',T:'#8a6b46',G:'#f5b301',W:'#fde68a',R:'#d63b3b'});});
  return cache;
}
let SPR=null;
/* ================= META ================= */
function kLB(){
  try{const v=JSON.parse(localStorage.getItem('stb_knight_v1')||'[]');return Array.isArray(v)?v:[];}
  catch(_){return [];}
}
function kSave(name,score,depth,kills,hero){
  try{
    const lb=kLB();
    lb.push({n:String(name||'BAI').slice(0,16),s:score,l:depth,k:kills,h:hero||0,d:Date.now()});
    lb.sort((a,b)=>b.s-a.s);
    localStorage.setItem('stb_knight_v1',JSON.stringify(lb.slice(0,8)));
    try{localStorage.setItem('stb_knight_name',String(name||'BAI').slice(0,16));}catch(_){}
  }catch(_){}
}
function kBest(){try{const lb=kLB();return lb.length?lb[0].s:0;}catch(_){return 0;}}
function kName(){try{return localStorage.getItem('stb_knight_name')||'BAI';}catch(_){return 'BAI';}}
function kMuted(){try{return localStorage.getItem('stb_knight_mute')==='1';}catch(_){return false;}}
function kSetMuted(m){try{localStorage.setItem('stb_knight_mute',m?'1':'0');}catch(_){}}
if(!window._kKeys){
  window._kKeys={up:false,down:false,left:false,right:false,fire:false,open:false,joyx:0,joyy:0};
  const map={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  window.addEventListener('keydown',e=>{
    if(!knight)return;
    if(map[e.key]!==undefined){window._kKeys[map[e.key]]=true;e.preventDefault();}
    else if(e.key===' '){window._kKeys.fire=true;e.preventDefault();}
    else if(e.key==='e'||e.key==='E'){window._kKeys.open=true;}
    else if(e.key==='p'||e.key==='P'||e.key==='Escape'){togglePause();}
  });
  window.addEventListener('keyup',e=>{
    if(map[e.key]!==undefined)window._kKeys[map[e.key]]=false;
    else if(e.key===' ')window._kKeys.fire=false;
  });
}
/* ================= RUN ================= */
async function startKnight(){
  if(!prepared||docHash(combinedText)!==prepared.hash){err("Load your material to the AI first (step 1).");return;}
  testType='knight';
  stopKnight();
  if(!SPR)SPR=spriteCache();
  window._examGame='knight';
  showView('exam',true);
  buildKnightSelect();
}
async function selectKnight(hi){
  const H=HEADS[hi%HEADS.length];
  const id=++runId;
  showLoading(KNIGHT_STEPS);
  startBtn.disabled=true;
  try{
    stopKnight();
    let stock=[],resModel='',quotaErr=null;
    for(let a=0;a<3&&stock.length<4;a++){
      if(id!==runId)return;
      try{
        const r=await serverExam('mixed',6,'easy',prepared.sample);
        stock=stock.concat(r.questions||[]);
        if(!resModel)resModel=(r&&r.model)||'';
      }catch(e){
        const m=String((e&&e.message)||e||'');
        if(/rate-limited|busy \(\d+\)|429|503/i.test(m)){quotaErr=e;break;}
      }
    }
    if(!stock.length){if(quotaErr)throw quotaErr;throw new Error('AI returned no usable questions');}
    const mods=H.mods||{};
    knight={run:id,dead:false,over:false,paused:false,
      pools:{easy:stock},fetching:{},seen:{},
      depth:1,score:0,kills:0,gold:0,hero:hi,lastPower:'',muted:kMuted(),
      player:{x:480,y:330,r:12,
        hp:6+(mods.maxhp||0),maxhp:6+(mods.maxhp||0),
        armor:mods.armor||0,maxarmor:Math.max(mods.armor||0,3),
        dmg:1+(mods.dmg||0),crit:10+(mods.crit||0),
        rate:260+(mods.rate||0),shots:1,pierce:mods.pierce||0,
        speed:235+(mods.speed||0),
        face:0,cd:0,iface:0,step:0,hitT:0},
      powers:{},
      enemies:[],bullets:[],coins:[],pickups:[],chests:[],parts:[],floats:[],props:[],
      shake:0,place:'',model:resModel};
    hideLoading();window._examGame='knight';showView('exam',true);
    buildKnightDOM();
    genRoom();
    requestAnimationFrame(knightLoop);
  }catch(e){
    if(id!==runId)return;
    const msg=String((e&&e.message)||e||'');
    hideLoading();
    err(e.name==="AbortError"?"Cancelled.":"Could not dig the dungeon ("+msg+"). "+(/rate-limited|busy|429|503/i.test(msg)?"Wait ~1 min, then press Start again.":"Check internet and try again."));
  }finally{refreshFlow();}
}
function normQ(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
async function loadTierK(tier){
  const k=knight;if(!k)return;
  if(k.fetching[tier]){try{await k.fetching[tier];}catch(_){}return;}
  const pr=serverExam('mixed',5,tier,prepared.sample).then(res=>{
    if(knight===k){
      const fresh=((res.questions||[]).filter(q=>!k.seen[normQ(q.question)]));
      fresh.forEach(q=>{k.seen[normQ(q.question)]=1;});
      k.pools[tier]=(k.pools[tier]||[]).concat(fresh);
    }
  }).catch(()=>{});
  k.fetching[tier]=pr;
  try{await pr;}finally{delete k.fetching[tier];}
}
async function takeQK(tier){
  const k=knight;if(!k)return null;
  let p=k.pools[tier]||[];
  while(p.length&&k.seen[normQ(p[0].question)])p.shift();
  if(!p.length){await loadTierK(tier);if(knight!==k)return null;p=k.pools[tier]||[];}
  while(p.length&&k.seen[normQ(p[0].question)])p.shift();
  if(!p.length){
    for(const t of ['easy','medium','hard']){
      const q2=k.pools[t]||[];
      while(q2.length&&k.seen[normQ(q2[0].question)])q2.shift();
      if(q2.length){p=q2;break;}
    }
  }
  if(!p.length)return null;
  const q=p.shift();
  k.seen[normQ(q.question)]=1;
  return q;
}
/* ---------- hero select ---------- */
function buildKnightSelect(){
  $('quizMeta').textContent='· CHOOSE YOUR KNIGHT';
  $('shortNote').style.display='none';
  $('resultBox').innerHTML='';$('mistakeBox').innerHTML='';lastGrading=null;
  $('prog').style.display='none';$('progText').style.display='none';
  $('submitBtn').style.display='none';$('retryBtn').style.display='none';
  $('newBtn').style.display='none';$('printBtn').style.display='none';$('scoreBtn').style.display='none';
  const box=$('quizBox');box.classList.remove('two-col');
  let h='<div class="ksel-grid">';
  HEADS.forEach((hh,i)=>{
    const canvasId='ksel'+i;
    h+='<button class="ksel" data-h="'+i+'"><span class="ksel-face"><canvas id="'+canvasId+'" width="16" height="16"></canvas></span><b>'+escapeHtml(hh.name)+'</b><small>'+escapeHtml(hh.desc)+'</small></button>';
  });
  box.innerHTML=h+'</div><p class="desc" style="text-align:center">Nine souls, one dungeon. Pick wisely.</p>';
  HEADS.forEach((hh,i)=>{
    const cv=document.getElementById('ksel'+i);
    if(cv){
      const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
      const spr=SPR.heroes[i];
      g.clearRect(0,0,16,16);
      g.drawImage(spr.frames[0],0,0);
    }
  });
  box.querySelectorAll('.ksel').forEach(b=>b.onclick=()=>selectKnight(+b.dataset.h));
}
/* ---------- rooms ---------- */
function genRoom(){
  const k=knight;if(!k)return;
  const d=k.depth,boss=d%5===0;
  const R={x0:40,y0:64,x1:920,y1:500};
  k.room=R;
  k.props=[];
  for(let i=0;i<4;i++){
    const t=Math.random()<0.72?'crate':'barrel';
    k.props.push({x:140+Math.random()*680,y:120+Math.random()*320,r:15,hp:t==='crate'?2:1,type:t});
  }
  k.enemies=[];k.bullets=[];k.coins=[];k.pickups=[];k.parts=[];k.floats=[];
  k.bones=[];
  for(let i=0;i<3;i++)k.bones.push({x:R.x0+60+Math.random()*(R.x1-R.x0-120),y:R.y0+60+Math.random()*(R.y1-R.y0-120)});
  k.player.x=480;k.player.y=430;k.player.iface=1;
  const nFoe=boss?0:Math.min(2+Math.floor(d*0.7),7);
  for(let i=0;i<nFoe;i++){
    const r=Math.random();
    if(d>=3&&r<0.22)k.enemies.push(spawnFoe('brute',d));
    else if(r<0.55)k.enemies.push(spawnFoe('bat',d));
    else k.enemies.push(spawnFoe('slime',d));
  }
  if(boss)k.enemies.push(spawnFoe('boss',d));
  k.chests=[];
  const nCh=boss?2:1;
  for(let i=0;i<nCh;i++){
    k.chests.push({x:220+Math.random()*520,y:140+Math.random()*200,opened:false,bob:Math.random()*6});
  }
  k.portal={x:480,y:96,open:false};
  const biome=biomeFor(d);
  if(biome.name!==k.place){
    k.place=biome.name;
    const b=$('kBanner');
    if(b){b.textContent=biome.name+' · Depth '+d;void b.offsetWidth;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');}
  }
  paintKnightHUD();
}
function spawnFoe(t,d){
  const R=knight.room;
  let x=480,y=300,tries=0;
  do{
    x=R.x0+40+Math.random()*(R.x1-R.x0-80);
    y=R.y0+40+Math.random()*(R.y1-R.y0-80);
    tries++;
  }while(tries<20&&Math.hypot(x-480,y-430)<180);
  const base={
    slime:{r:14,hp:4+d*1.2,speed:55+d*2,dmg:1},
    bat:{r:10,hp:2+d*0.6,speed:115+d*3,dmg:1},
    brute:{r:17,hp:8+d*2,speed:46,dmg:1},
    boss:{r:32,hp:26+d*5,speed:44,dmg:2},
  }[t];
  return {x:x,y:y,r:base.r,hp:base.hp,maxhp:base.hp,speed:base.speed,dmg:base.dmg,type:t,flash:0,wob:Math.random()*6};
}
/* ---------- combat ---------- */
function nearestFoe(x,y){
  const k=knight;let best=null,bd=1e9;
  for(const e of k.enemies){const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;best=e;}}
  return bd<700?best:null;
}
function fireGuns(dt){
  const k=knight,p=k.player;
  p.cd-=dt*1000;
  if(!window._kKeys.fire||p.cd>0)return;
  const tgt=nearestFoe(p.x,p.y);
  const ang=tgt?Math.atan2(tgt.y-p.y,tgt.x-p.x):(p.face||0);
  p.face=ang;
  const n=p.shots;
  for(let i=0;i<n;i++){
    const off=n===1?0:(i-(n-1)/2)*0.14;
    const sp=540;
    k.bullets.push({x:p.x+Math.cos(ang)*18,y:p.y+Math.sin(ang)*18,vx:Math.cos(ang+off)*sp,vy:Math.sin(ang+off)*sp,dmg:p.dmg,pierce:p.pierce});
  }
  p.cd=p.rate;
  ksfx('shoot');
}
function hurtEnemy(e,dmg,hx,hy){
  const k=knight;
  let final=dmg,crit=false;
  if(Math.random()*100<k.player.crit){final=dmg*2;crit=true;}
  e.hp-=final;e.flash=0.12;
  k.floats.push({x:e.x,y:e.y-e.r-10,txt:(crit?'Critical ':'')+final,t:crit?1:0.7,color:crit?'#fbbf24':'#fca5a5'});
  ksfx('hit');
  if(e.hp<=0){
    k.kills++;k.score+=e.type==='boss'?150:15;
    const nc=e.type==='boss'?10:(1+Math.floor(Math.random()*3));
    for(let i=0;i<nc;i++){
      const a=Math.random()*Math.PI*2;
      k.coins.push({x:e.x,y:e.y,vx:Math.cos(a)*160,vy:Math.sin(a)*160,t:9});
    }
    if(Math.random()<0.08)k.pickups.push({x:e.x,y:e.y,kind:'heart',t:12});
    burstK(e.x,e.y,'#a3e635',16);
    ksfx('die');
    if(e.type==='boss'){k.shake=0.5;k.score+=100;}
  }else{
    const dx=e.x-hx,dy=e.y-hy,dd=Math.hypot(dx,dy)||1;
    e.x+=dx/dd*14;e.y+=dy/dd*14;
  }
}
function hurtPlayer(dmg,sx,sy){
  const k=knight,p=k.player;
  if(p.iface>0||k.over)return;
  let rem=dmg;
  if(p.armor>0){const ab=Math.min(p.armor,rem);p.armor-=ab;rem-=ab;ksfx('tick');}
  p.hp-=rem;p.iface=1.1;p.hitT=4;p.armorT=0;k.shake=0.35;
  const dx=p.x-sx,dy=p.y-sy,dd=Math.hypot(dx,dy)||1;
  p.x+=dx/dd*26;p.y+=dy/dd*26;
  ksfx('hurt');
  burstK(p.x,p.y,'#ef4444',10);
  if(p.hp<=0)knightGameOver();
  paintKnightHUD();
}
function explode(x,y){
  const k=knight;if(!k)return;
  k.shake=0.5;ksfx('boom');
  burstK(x,y,'#fb923c',26);burstK(x,y,'#ef4444',14);
  for(let j=k.enemies.length-1;j>=0;j--){
    const e=k.enemies[j];
    if(Math.hypot(e.x-x,e.y-y)<95){
      e.hp-=3;e.flash=0.15;
      k.floats.push({x:e.x,y:e.y-e.r-8,txt:'-3',t:0.7,color:'#fdba74'});
      if(e.hp<=0){k.kills++;k.score+=15;k.enemies.splice(j,1);burstK(e.x,e.y,'#a3e635',12);}
    }
  }
  const p=k.player;
  if(Math.hypot(p.x-x,p.y-y)<80)hurtPlayer(1,x,y);
}
function burstK(x,y,color,n){
  const k=knight;if(!k)return;
  for(let i=0;i<(n||10);i++){
    k.parts.push({x:x,y:y,vx:(Math.random()-0.5)*380,vy:-Math.random()*380-60,life:0.5+Math.random()*0.4,color:color});
  }
}
/* ---------- chests & powers ---------- */
const POWERS=[
  {id:'dmg',label:'+1 Attack Damage',w:3,max:p=>p.dmg>=6,apply:p=>{p.dmg++;}},
  {id:'rate',label:'Faster Blaster',w:3,max:p=>p.rate<=90,apply:p=>{p.rate=Math.max(90,p.rate*0.86);}},
  {id:'multi',label:'+1 Projectile',w:2,max:p=>p.shots>=3,apply:p=>{p.shots=Math.min(3,p.shots+1);}},
  {id:'pierce',label:'Piercing Shots',w:2,max:p=>p.pierce>=3,apply:p=>{p.pierce=Math.min(3,p.pierce+1);}},
  {id:'speed',label:'Swift Boots',w:2,max:p=>p.speed>=380,apply:p=>{p.speed=Math.min(380,p.speed*1.1);}},
  {id:'hp',label:'+2 Max HP & Heal',w:2,max:p=>p.maxhp>=14,apply:p=>{p.maxhp+=2;p.hp=Math.min(p.maxhp,p.hp+2);}},
  {id:'armor',label:'+2 Shield',w:3,max:p=>p.maxarmor>=8,apply:p=>{p.maxarmor+=2;p.armor=Math.min(p.maxarmor,p.armor+2);}},
  {id:'crit',label:'Lucky Charm (+8% crit)',w:2,max:p=>p.crit>=42,apply:p=>{p.crit+=8;}},
];
function tryOpenChest(){
  const k=knight;if(!k||k.over||k.paused||k.quizOpen)return;
  for(const c of k.chests){
    if(!c.opened&&Math.hypot(c.x-k.player.x,c.y-k.player.y)<78){openChest(c);return;}
  }
}
async function openChest(c){
  const k=knight;if(!k||c.opened)return;
  const tier=tierForK(k.depth);
  const q=await takeQK(tier);
  if(knight!==k)return;
  if(!q){k.floats.push({x:c.x,y:c.y-30,txt:'The chest is empty…',t:1.6,color:'#e2e8f0'});return;}
  c.opened=true;c.q=q;
  k.paused=true;k.quizOpen=c;
  ksfx('chest');
  const opts=(q.options&&q.options.length?q.options.slice():['True','False']);
  const order=opts.map((t,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  $('kQText').textContent=q.question;
  const box=$('kQOpts');box.innerHTML='';
  order.forEach(oi=>{
    const b=document.createElement('button');
    b.className='opt';b.textContent=String(opts[oi]);
    b.onclick=()=>answerChest(c,String(opts[oi]));
    box.appendChild(b);
  });
  $('kQuiz').style.display='';
}
function answerChest(c,v){
  const k=knight;if(!k)return;
  const q=c.q;
  const ok=(v||'').trim().toLowerCase()===(q.answer||'').trim().toLowerCase();
  $('kQuiz').style.display='none';
  k.paused=false;k.quizOpen=null;
  if(ok){
    k.score+=50;
    let pool=POWERS.filter(p=>!p.max(k.player)&&p.id!==k.lastPower);
    if(!pool.length)pool=POWERS.filter(p=>!p.max(k.player));
    if(!pool.length)pool=POWERS.slice();
    const tot=pool.reduce((a,p)=>a+p.w,0);
    let r=Math.random()*tot,pick=pool[0];
    for(const p of pool){r-=p.w;if(r<=0){pick=p;break;}}
    pick.apply(k.player);
    k.lastPower=pick.id;
    k.powers[pick.id]=(k.powers[pick.id]||0)+1;
    ksfx('power');
    k.floats.push({x:c.x,y:c.y-34,txt:pick.label,t:2.2,color:'#fbbf24'});
    burstK(c.x,c.y,'#fbbf24',18);
  }else{
    ksfx('hurt');k.shake=0.3;
    k.floats.push({x:c.x,y:c.y-34,txt:'Wrong! Ambush!',t:1.8,color:'#f87171'});
    for(let i=0;i<2&&k.enemies.length<9;i++)k.enemies.push(spawnFoe(Math.random()<0.5?'bat':'slime',k.depth));
  }
  paintKnightHUD();
}
/* ---------- pause + stats ---------- */
function togglePause(){
  const k=knight;if(!k||k.over||k.quizOpen)return;
  k.paused=!k.paused;
  const o=$('kPause');
  if(k.paused){paintStats();o.style.display='';}
  else o.style.display='none';
}
function powerChips(){
  const k=knight;
  const names={dmg:'DMG',rate:'RATE',multi:'MULTI',pierce:'PIERCE',speed:'SPEED',hp:'VITALITY',armor:'SHIELD',crit:'LUCK'};
  return Object.keys(k.powers).map(id=>'<span>'+(names[id]||id)+' ×'+k.powers[id]+'</span>').join('')||'<span>none yet — loot a chest</span>';
}
function paintStats(){
  const k=knight;if(!k)return;
  const p=k.player;
  $('kStats').innerHTML=
    statRow('Attack Damage',p.dmg+(p.crit>0?' <small>(crit '+p.crit+'%)</small>':''))+
    statRow('Shield',p.armor+' / '+p.maxarmor+' <small>(regen)</small>')+
    statRow('Health',Math.max(p.hp,0)+' / '+p.maxhp)+
    statRow('Fire rate',Math.round(60000/p.rate)+' /min')+
    statRow('Projectiles','×'+p.shots+(p.pierce?' + pierce '+p.pierce:''))+
    statRow('Move speed',Math.round(p.speed))+
    statRow('Depth / Kills / Score',k.depth+' / '+k.kills+' / '+k.score)+
    '<div class="k-powers">'+powerChips()+'</div>';
  const mb=$('kMuteBtn');if(mb)mb.textContent=k.muted?'Unmute sound':'Mute sound';
}
function statRow(k,v){return '<div class="k-stat"><span>'+k+'</span><b>'+v+'</b></div>';}
/* ---------- loop ---------- */
function knightLoop(t){
  const k=knight;
  if(!k||k.dead)return;
  const dt=Math.min((t-(k.last||t))/1000,0.033);
  k.last=t;
  if(!k.over&&!k.paused)stepKnight(dt,t);
  drawKnight(t);
  requestAnimationFrame(knightLoop);
}
function collideWalls(e,r){
  const R=knight.room;
  if(e.x-r<R.x0)e.x=R.x0+r;
  if(e.x+r>R.x1)e.x=R.x1-r;
  if(e.y-r<R.y0)e.y=R.y0+r;
  if(e.y+r>R.y1)e.y=R.y1-r;
  for(const pl of knight.props){
    if(pl.dead)continue;
    const dx=e.x-pl.x,dy=e.y-pl.y,d=Math.hypot(dx,dy),min=r+pl.r;
    if(d<min&&d>0.01){e.x=pl.x+dx/d*min;e.y=pl.y+dy/d*min;}
  }
}
function stepKnight(dt,now){
  const k=knight,p=k.player,keys=window._kKeys;
  if(keys.open){keys.open=false;tryOpenChest();}
  let mx=(keys.right?1:0)-(keys.left?1:0)+keys.joyx;
  let my=(keys.down?1:0)-(keys.up?1:0)+keys.joyy;
  const ml=Math.hypot(mx,my);
  if(ml>1){mx/=ml;my/=ml;}
  p.x+=mx*p.speed*dt;p.y+=my*p.speed*dt;
  if(ml>0.1){p.face=Math.atan2(my,mx);p.step+=dt*10;}
  if(p.iface>0)p.iface-=dt;
  if(p.hitT>0){p.hitT-=dt;}else{p.armorT=(p.armorT||0)+dt;}
  if(p.armor<p.maxarmor&&p.hitT<=0&&p.armorT>4){p.armorT=0;p.armor++;paintKnightHUD();}
  collideWalls(p,p.r);
  fireGuns(dt);
  for(let i=k.bullets.length-1;i>=0;i--){
    const b=k.bullets[i];
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    let dead=b.x<knight.room.x0||b.x>knight.room.x1||b.y<knight.room.y0||b.y>knight.room.y1;
    if(!dead)for(const pl of k.props){
      if(!pl.dead&&Math.hypot(b.x-pl.x,b.y-pl.y)<pl.r){
        pl.hp--;
        if(pl.hp<=0){pl.dead=true;breakProp(pl);}
        dead=true;break;
      }
    }
    if(!dead)for(let j=k.enemies.length-1;j>=0;j--){
      const e=k.enemies[j];
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+5){
        hurtEnemy(e,b.dmg,b.x,b.y);
        if(e.hp<=0)k.enemies.splice(j,1);
        if(b.pierce>0)b.pierce--;else dead=true;
        break;
      }
    }
    if(dead)k.bullets.splice(i,1);
  }
  for(const e of k.enemies){
    if(e.flash>0)e.flash-=dt;
    e.wob+=dt*6;
    const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
    e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;
    collideWalls(e,e.r);
    if(d<e.r+p.r+2)hurtPlayer(e.dmg,e.x,e.y);
    if(k.over)return;
  }
  for(let i=0;i<k.enemies.length;i++)for(let j=i+1;j<k.enemies.length;j++){
    const a=k.enemies[i],b=k.enemies[j];
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
    if(d<min&&d>0.01){const push=(min-d)/2;a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;}
  }
  for(let i=k.coins.length-1;i>=0;i--){
    const c=k.coins[i];
    c.t-=dt;
    c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=0.92;c.vy*=0.92;
    const d=Math.hypot(p.x-c.x,p.y-c.y);
    if(d<95){c.x+=(p.x-c.x)*Math.min(1,dt*8);c.y+=(p.y-c.y)*Math.min(1,dt*8);}
    if(d<24){k.coins.splice(i,1);k.score+=5;k.gold++;ksfx('coin');}
    else if(c.t<=0)k.coins.splice(i,1);
  }
  for(let i=k.pickups.length-1;i>=0;i--){
    const h=k.pickups[i];
    h.t-=dt;
    if(Math.hypot(p.x-h.x,p.y-h.y)<26){
      k.pickups.splice(i,1);
      p.hp=Math.min(p.maxhp,p.hp+2);
      k.floats.push({x:p.x,y:p.y-26,txt:'+2 HP',t:1.2,color:'#4ade80'});
      ksfx('power');paintKnightHUD();
    }else if(h.t<=0)k.pickups.splice(i,1);
  }
  k.parts=k.parts.filter(pt=>(pt.life-=dt)>0);
  k.parts.forEach(pt=>{pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=700*dt;});
  k.floats=k.floats.filter(f=>(f.t-=dt)>0);
  const anyFoe=k.enemies.length>0;
  k.portal.open=!anyFoe;
  if(!anyFoe&&Math.hypot(p.x-k.portal.x,p.y-k.portal.y)<30){
    k.score+=15*k.depth;
    k.player.hp=Math.min(k.player.maxhp,k.player.hp+1);
    k.depth++;
    const nt=tierForK(k.depth+1);
    if(nt!==tierForK(k.depth))loadTierK(nt);
    genRoom();
    ksfx('descend');
    return;
  }
  if(k.shake>0)k.shake-=dt;
}
function breakProp(pl){
  const k=knight;
  burstK(pl.x,pl.y,pl.type==='barrel'?'#fb923c':'#a8a29e',14);
  if(pl.type==='barrel'){explode(pl.x,pl.y);return;}
  ksfx('hit');
  const n=1+Math.floor(Math.random()*2);
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;
    k.coins.push({x:pl.x,y:pl.y,vx:Math.cos(a)*140,vy:Math.sin(a)*140,t:9});
  }
  if(Math.random()<0.14)k.pickups.push({x:pl.x,y:pl.y,kind:'heart',t:14});
}
function knightGameOver(){
  const k=knight;if(!k||k.over)return;
  k.over=true;
  ksfx('hurt');
  const lb=kLB();
  const isBest=k.score>0&&k.score>=(lb.length?lb[0].s:0);
  let h='<div class="mover-card"><h3>Dungeon claimed you</h3>'
    +'<div class="mover-score">'+k.score+' pts</div>'
    +'<div class="mover-sub">Depth '+k.depth+' · '+k.kills+' kills · '+k.gold+' gold'+(isBest?' · <b>NEW BEST!</b>':'')+'</div>'
    +'<div class="row mover-name"><input id="kName" maxlength="16" value="'+escapeHtml(kName())+'"/><button class="btn-dark" id="kSave">Save score</button></div>'
    +'<div class="mover-lb"><b>Legends</b>'+kLBHtml()+'</div>'
    +'<div class="row"><button class="btn-primary" id="kAgain">Delve again</button><button id="kChoose">Choose mode</button></div></div>';
  const o=$('kOver');o.innerHTML=h;o.style.display='';
  $('kSave').onclick=()=>{
    const nm=$('kName').value.trim()||'BAI';
    kSave(nm,k.score,k.depth,k.kills,k.hero);
    o.querySelector('.mover-lb').innerHTML='<b>Legends</b>'+kLBHtml();
    $('kSave').disabled=true;paintKnightHUD();
  };
  $('kAgain').onclick=()=>startKnight();
  $('kChoose').onclick=()=>showView('choose');
}
function kLBHtml(){
  const lb=kLB();
  if(!lb.length)return '<div class="mover-empty">No legends yet — be the first!</div>';
  return '<ol>'+lb.slice(0,5).map(e=>'<li><b>'+escapeHtml(e.n)+'</b><span>D'+e.l+'</span><span>'+e.s+' pts</span></li>').join('')+'</ol>';
}
/* ---------- dom ---------- */
function buildKnightDOM(){
  $('quizMeta').textContent='· DUNGEON KNIGHT';
  $('shortNote').style.display='none';
  $('resultBox').innerHTML='';$('mistakeBox').innerHTML='';lastGrading=null;
  $('prog').style.display='none';$('progText').style.display='none';
  $('submitBtn').style.display='none';$('retryBtn').style.display='none';
  $('newBtn').style.display='none';$('printBtn').style.display='none';$('scoreBtn').style.display='none';
  const box=$('quizBox');box.classList.remove('two-col');
  box.innerHTML='<div class="k-hud"><div class="k-bars"><div class="k-hp"><i id="kHpFill"></i><span id="kHpTxt"></span></div>'
    +'<div class="k-armor"><i id="kArmorFill"></i><span id="kArmorTxt"></span></div></div>'
    +'<span class="m-pill gold" id="kGold">0</span>'
    +'<span class="m-pill" id="kDepth"></span>'
    +'<span class="m-pill" id="kScore"></span>'
    +'<span class="m-pill dim" id="kBest"></span>'
    +'<span class="m-pill lives" id="kKills"></span>'
    +'<button id="kPauseBtn" title="Pause / stats">II</button></div>'
    +'<div class="k-load" id="kLoad"></div>'
    +'<div class="k-boss" id="kBossWrap" style="display:none"><span id="kBossName"></span><div class="k-bossbar"><i id="kBossFill"></i></div></div>'
    +'<div class="k-stage"><canvas id="kCanvas" width="960" height="540"></canvas>'
    +'<div id="kBanner"></div><div id="kQuiz" style="display:none"><div class="kq-card"><h3 id="kQTitle">Chest of Knowledge</h3><p id="kQText"></p><div id="kQOpts"></div></div></div>'
    +'<div id="kPause" style="display:none"><div class="kq-card"><h3 id="kQTitle2">Knight stats</h3><div id="kStats"></div>'
    +'<div class="row"><button class="btn-primary" id="kResume">Resume</button><button id="kMuteBtn">Mute sound</button></div>'
    +'<div class="row"><button id="kRestart">Restart run</button><button id="kQuit">Quit to menu</button></div></div></div>'
    +'<div id="kOver" style="display:none"></div></div>'
    +'<div class="k-touch"><div id="kJoy"><span id="kStick"></span></div>'
    +'<div class="k-btns"><button id="kOpen">OPEN</button><button id="kFire">FIRE</button></div></div>';
  $('kPauseBtn').onclick=()=>togglePause();
  $('kResume').onclick=()=>togglePause();
  $('kRestart').onclick=()=>{startKnight();};
  $('kQuit').onclick=()=>showView('choose');
  $('kMuteBtn').onclick=()=>{const m=!kMuted();kSetMuted(m);if(knight)knight.muted=m;paintStats();};
  $('kFire').addEventListener('pointerdown',e=>{e.preventDefault();window._kKeys.fire=true;});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>$('kFire').addEventListener(ev,e=>{e.preventDefault();window._kKeys.fire=false;}));
  $('kOpen').addEventListener('pointerdown',e=>{e.preventDefault();window._kKeys.open=true;});
  const joy=$('kJoy'),stick=$('kStick');
  let joyId=null;
  const setStick=(cx,cy)=>{
    const r=joy.getBoundingClientRect();
    const bx=r.left+r.width/2,by=r.top+r.height/2;
    let dx=cx-bx,dy=cy-by;
    const d=Math.hypot(dx,dy),max=r.width/2-10;
    if(d>max){dx=dx/d*max;dy=dy/d*max;}
    stick.style.transform='translate('+dx+'px,'+dy+'px)';
    window._kKeys.joyx=max?dx/max:0;window._kKeys.joyy=max?dy/max:0;
  };
  joy.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;joy.setPointerCapture&&joy.setPointerCapture(e.pointerId);setStick(e.clientX,e.clientY);});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)setStick(e.clientX,e.clientY);});
  const endJoy=e=>{if(e.pointerId===joyId){joyId=null;stick.style.transform='';window._kKeys.joyx=0;window._kKeys.joyy=0;}};
  joy.addEventListener('pointerup',endJoy);joy.addEventListener('pointercancel',endJoy);
}
function paintKnightHUD(){
  const k=knight;if(!k)return;
  const p=k.player;
  $('kHpFill').style.width=Math.max(p.hp/p.maxhp*100,0)+'%';
  $('kHpTxt').textContent='HP '+Math.max(p.hp,0)+'/'+p.maxhp;
  $('kArmorFill').style.width=(p.maxarmor>0?Math.max(p.armor/p.maxarmor*100,0):0)+'%';
  $('kArmorTxt').textContent='SHIELD '+Math.max(p.armor,0)+'/'+p.maxarmor;
  $('kGold').textContent=k.gold;
  $('kDepth').textContent='Depth '+k.depth+' · '+k.place;
  $('kScore').textContent=k.score+' pts';
  $('kBest').textContent='Best '+Math.max(kBest(),k.score);
  $('kKills').textContent='☠ '+k.kills;
  const r=Math.max(60,Math.round(60000/p.rate));
  $('kLoad').textContent='ATK '+p.dmg+(p.crit>10?' ('+p.crit+'% crit)':'')+' · '+r+'/min'+(p.shots>1?' · ×'+p.shots:'')+(p.pierce>0?' · Pierce '+p.pierce:'')+' · SPD '+Math.round(p.speed);
  const boss=k.enemies.find(e=>e.type==='boss');
  if(boss){
    $('kBossWrap').style.display='';
    $('kBossName').textContent='SLIME KING';
    $('kBossFill').style.width=Math.max(boss.hp/boss.maxhp*100,0)+'%';
  }else $('kBossWrap').style.display='none';
}
/* ---------- tiny synth ---------- */
let _kAC=null;
function ksfx(kind){
  try{
    if(knight&&knight.muted)return;
    if(kMuted())return;
    if(!_kAC)_kAC=new (window.AudioContext||window.webkitAudioContext)();
    const ac=_kAC;
    if(ac.state==='suspended')ac.resume();
    const seq=kind==='power'?[[523,0,.09],[659,.09,.09],[784,.18,.16]]
      :kind==='coin'?[[950,0,.06],[1400,.06,.1]]
      :kind==='chest'?[[392,0,.1],[523,.1,.1],[659,.2,.18]]
      :kind==='descend'?[[330,0,.12],[440,.12,.18]]
      :kind==='hurt'?[[200,0,.2]]
      :kind==='die'?[[300,0,.08],[150,.08,.15]]
      :kind==='shoot'?[[720,0,.05]]
      :kind==='boom'?[[120,0,.3],[80,.1,.35]]
      :kind==='tick'?[[1200,0,.04]]:[[440,0,.07]];
    seq.forEach(([f,t,d])=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.type=(kind==='hurt'||kind==='die'||kind==='boom')?'sawtooth':'square';
      o.frequency.value=f;
      g.gain.setValueAtTime(0.05,ac.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+t+d);
      o.connect(g);g.connect(ac.destination);
      o.start(ac.currentTime+t);o.stop(ac.currentTime+t+d+.02);
    });
  }catch(_){}
}
/* ---------- drawing ---------- */
function drawSprite(ctx,img,x,y,w,h,flip){
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(flip){ctx.translate(Math.round(x+w),Math.round(y));ctx.scale(-1,1);ctx.drawImage(img,0,0,Math.round(w),Math.round(h));}
  else ctx.drawImage(img,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  ctx.restore();
}
function drawKnight(now){
  const k=knight;if(!k)return;
  const cv=$('kCanvas');if(!cv)return;
  const ctx=cv.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  const R=k.room,biome=biomeFor(k.depth);
  ctx.save();
  if(k.shake>0)ctx.translate((Math.random()-0.5)*7,(Math.random()-0.5)*7);
  ctx.fillStyle=biome.wall;ctx.fillRect(0,0,960,540);
  // stone tile floor with bevels
  for(let ty=R.y0;ty<R.y1;ty+=40)for(let tx=R.x0;tx<R.x1;tx+=40){
    const alt=((tx+ty)/40)%2===0;
    ctx.fillStyle=alt?biome.floor:biome.tile;
    ctx.fillRect(tx,ty,40,40);
    ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(tx,ty,40,3);
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(tx,ty+37,40,3);
  }
  // wall border
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(R.x0-8,R.y0-8,R.x1-R.x0+16,8);ctx.fillRect(R.x0-8,R.y1,R.x1-R.x0+16,8);
  // torch glow corners
  const tg=ctx.createRadialGradient(70,90,4,70,90,130);
  tg.addColorStop(0,'rgba(251,191,36,.28)');tg.addColorStop(1,'transparent');
  ctx.fillStyle=tg;ctx.fillRect(0,0,240,240);
  // bones decor
  ctx.fillStyle='rgba(226,232,240,.5)';
  (k.bones||[]).forEach(b=>{ctx.fillRect(b.x,b.y,7,5);ctx.fillRect(b.x+1,b.y-3,3,3);});
  // portal
  const po=k.portal;
  const pg=ctx.createRadialGradient(po.x,po.y,4,po.x,po.y,44);
  pg.addColorStop(0,k.portal.open?'rgba(34,211,238,.9)':'rgba(100,116,139,.5)');
  pg.addColorStop(1,'transparent');
  ctx.fillStyle=pg;ctx.beginPath();ctx.arc(po.x,po.y,44,0,7);ctx.fill();
  ctx.fillStyle=k.portal.open?'#22d3ee':'#475569';
  ctx.fillRect(po.x-16,po.y-26,32,52);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(po.x-16,po.y-26,32,10);
  // props: crates + barrels
  k.props.forEach(pl=>{
    if(pl.dead)return;
    if(pl.type==='crate'){
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(pl.x-14,pl.y+8,30,6);
      ctx.fillStyle='#8a6b46';ctx.fillRect(pl.x-15,pl.y-15,30,30);
      ctx.fillStyle='#a9834f';ctx.fillRect(pl.x-15,pl.y-15,30,5);
      ctx.strokeStyle='#5c4426';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(pl.x-15,pl.y-15);ctx.lineTo(pl.x+15,pl.y+15);
      ctx.moveTo(pl.x+15,pl.y-15);ctx.lineTo(pl.x-15,pl.y+15);ctx.stroke();
    }else{
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(pl.x+2,pl.y+12,14,0,7);ctx.fill();
      ctx.fillStyle='#b91c1c';ctx.beginPath();ctx.arc(pl.x,pl.y,14,0,7);ctx.fill();
      ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(pl.x-3,pl.y-4,8,0,7);ctx.fill();
      ctx.fillStyle='#fbbf24';ctx.fillRect(pl.x-2,pl.y-4,4,8);
    }
  });
  // coins + hearts
  k.coins.forEach(c=>{drawSprite(ctx,SPR.props.coin,c.x-6,c.y-6,12,12);});
  k.pickups.forEach(hh=>{drawSprite(ctx,SPR.props.heart,hh.x-8,hh.y-7,16,14);});
  // chests
  const t=(now||0)/1000;
  k.chests.forEach(c=>{
    const bob=c.opened?0:Math.sin(t*3+c.bob)*3;
    drawSprite(ctx,c.opened?SPR.props.chestOpen:SPR.props.chestShut,c.x-20,c.y-15+bob,40,30);
    if(!c.opened&&Math.hypot(c.x-k.player.x,c.y-k.player.y)<78){
      ctx.fillStyle='#fff';ctx.font='bold 13px Inter,system-ui,sans-serif';ctx.textAlign='center';
      ctx.fillText('E',c.x,c.y-26+bob);
    }
  });
  // enemies
  k.enemies.forEach(e=>{
    let img=SPR.foes.slimeA,ww=e.r*2.6,hh=e.r*2.2;
    if(e.type==='bat'){img=Math.floor(e.wob*2)%2?SPR.foes.batA:SPR.foes.batB;ww=30;hh=22;}
    else if(e.type==='brute'){img=SPR.foes.bruteA;ww=40;hh=40;}
    else if(e.type==='boss'){img=SPR.foes.bossA;ww=72;hh=64;}
    else{img=Math.floor(e.wob)%2?SPR.foes.slimeA:SPR.foes.slimeB;}
    if(e.flash>0){ctx.save();ctx.globalAlpha=0.7+0.3*Math.sin(now/30);}
    drawSprite(ctx,img,e.x-ww/2,e.y-hh/2+(e.type==='slime'?Math.sin(e.wob)*2:0),ww,hh,e.x<k.player.x?false:true);
    if(e.flash>0)ctx.restore();
    if(e.hp<e.maxhp){
      ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(e.x-16,e.y-e.r-14,32,5);
      ctx.fillStyle='#ef4444';ctx.fillRect(e.x-16,e.y-e.r-14,32*Math.max(e.hp/e.maxhp,0),5);
    }
  });
  // bullets
  k.bullets.forEach(b=>{
    ctx.fillStyle='#fef08a';ctx.beginPath();ctx.arc(b.x,b.y,5,0,7);ctx.fill();
    ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(b.x,b.y,2.6,0,7);ctx.fill();
  });
  // player
  const p=k.player,hero=SPR.heroes[k.hero||0];
  if(!(p.iface>0&&Math.floor(now/110)%2===0)){
    const moving=Math.abs(((window._kKeys.left?1:0)-(window._kKeys.right?1:0))+window._kKeys.joyx)>0.2||Math.abs(window._kKeys.joyy)>0.2||window._kKeys.up||window._kKeys.down;
    const fr=moving?Math.floor(p.step)%2:0;
    drawSprite(ctx,hero.frames[fr],p.x-16,p.y-18,32,32,p.face<0);
  }
  // particles + floats
  k.parts.forEach(pt=>{ctx.globalAlpha=Math.min(pt.life*2,1);ctx.fillStyle=pt.color;ctx.fillRect(pt.x-2,pt.y-2,5,5);});
  ctx.globalAlpha=1;
  ctx.textAlign='center';ctx.font='bold 13px Inter,system-ui,sans-serif';
  k.floats.forEach(f=>{ctx.globalAlpha=Math.min(f.t*1.5,1);ctx.fillStyle=f.color;ctx.fillText(f.txt,f.x,f.y-(1.6-f.t)*26);});
  ctx.globalAlpha=1;
  ctx.restore();
}
