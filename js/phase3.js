/* ================= phase3.js — Pandal Construction ================= */
'use strict';
PHASES.construction=(()=>{
let t=0,working=false,paused=false,workT=0,dayDone=true,truck=null,workers=[],eventsLeftToday=1;
let milestones={theme:false,lights:false,flowers:false};
const BUILD_DAYS=6; // days 13..18
const WORK_SEC=13; // seconds of animation per work day
let ui;

function crewStats(){
  let speed=0,risk=0,n=0;
  for(const k of ['structure','electric','paint','soundEng']){
    const tier=G.contractors[k];
    if(tier>0){const ct=CONTRACTOR_TYPES.find(c=>c.id===k).tiers[tier-1];speed+=ct.speed;risk+=ct.risk;n++;}
  }
  if(n===0)return{speed:.3,risk:3,count:0};
  return{speed:speed/n,risk:risk/n,count:n};
}
function materialBonus(){
  let b=1;
  if(G.purchases.flowers)b+=.08;
  if(G.purchases.lights)b+=.08;
  if(G.purchases.soundM)b+=.06;
  if(G.purchases.genset)b+=.06;
  b+=G.alloc.infra*.06;
  return b;
}

function enter(){
  t=0;working=false;dayDone=true;truck=null;eventsLeftToday=1;
  milestones={theme:false,lights:false,flowers:false};
  G.tod=.33;
  workers=[];
  const n=6+crewStats().count*2;
  for(let i=0;i<n;i++)workers.push({x:rand(1050,230),y:640+rand(60,-10),
    c:pick(['#f59e0b','#0891b2','#16a34a','#e11d48','#7c3aed','#b45309','#334155']),walk:rand(10),job:i%3});
  banner('Phase 3 — Pandal Construction','Days 13–18 · Watch the mandap rise — and survive the chaos',3200);
  buildUI();
}
function exit(){if(ui){ui.remove();ui=null}}

function buildUI(){
  ui=el('div','');
  ui.style.cssText='position:absolute;left:50%;transform:translateX(-50%);bottom:14px;z-index:30;display:flex;gap:10px;align-items:center;background:rgba(15,10,30,.82);border:1px solid rgba(255,180,80,.4);border-radius:16px;padding:10px 16px;color:#ffe9c9';
  ui.innerHTML=`
    <div style="min-width:220px">
      <div style="font-size:.68rem;letter-spacing:.1em;opacity:.75">CONSTRUCTION PROGRESS</div>
      <div class="bar" style="margin-top:4px"><div class="bar-fill" id="cProg" style="width:0%"></div></div>
      <div style="font-size:.68rem;margin-top:4px">Durability <span id="cDur">100</span>% · Morale <span id="cMor">80</span>% · ${weatherInfo().icon} ${weatherInfo().name}</div>
    </div>
    <button class="btn big" id="btnWork">🔨 Start Work Day</button>
    <button class="btn ghost" id="btnSkipDay" disabled>🌙 End Day</button>`;
  $('#game').appendChild(ui);
  $('#btnWork').onclick=startWork;
  $('#btnSkipDay').onclick=endDay;
  refreshUI();
}
function refreshUI(){
  const p=$('#cProg');if(p){p.style.width=G.construction.progress+'%';
    $('#cDur').textContent=Math.round(G.construction.durability);
    $('#cMor').textContent=Math.round(G.construction.morale);}
}

/* ---------- work day ---------- */
function startWork(){
  if(working||!dayDone)return;
  Audio_.init();
  working=true;dayDone=false;workT=0;eventsLeftToday=1;
  $('#btnWork').disabled=true;
  sfx('truck');
  truck={x:-220,dir:1};
}
function update(dt){
  t+=dt;
  if(working&&!paused){
    workT+=dt;
    G.tod=clamp(.33+workT*.03,.33,.78); // day passes while working
    // progress accrual (a full work day ≈ WORK_SEC seconds of animation)
    if(G.construction.progress<100){
      const crew=crewStats();
      const rate=(100/(5*WORK_SEC))*crew.speed*materialBonus()*(G.weather==='rain'?.6:1)*(G.construction.morale/80);
      G.construction.progress=clamp(G.construction.progress+rate*dt,0,100);
      refreshUI();
      checkMilestones(true);
    }
    // hammering sfx & sparks
    if(Math.random()<dt*3){sfx('hammer');const w=pick(workers);
      Particles.spawn(w.x,w.y-30,{color:'#fbbf24',vy:-90,g:200,life:.5,size:2});}
    // truck delivery once mid-day
    if(truck){
      truck.x+=180*dt;
      if(truck.x>330&&truck.x<340){Particles.smoke(430,600,6);truck.x=340;}
      if(truck.x>340&&workT>3)truck=null;
    }
    // random event?
    const crew2=crewStats();
    const evChance=(G.weather==='rain'?2.4:1)*crew2.risk*.5;
    if(workT>2.2&&eventsLeftToday>0&&Math.random()<evChance*dt*.35&&G.construction.progress<100){
      eventsLeftToday--;working=false;fireEvent();
    }
    // day complete?
    if(workT>WORK_SEC||G.construction.progress>=100)finishWork();
  }else if(!working){
    G.tod=clamp(G.tod+dt*.004,.3,.8);
  }
  // worker wander
  for(const w of workers){
    w.walk+=dt*(working?1.6:.4);
    if(working){w.x+=Math.sin(t*.7+w.y)*22*dt;w.x=clamp(w.x,200,1090);}
  }
  Particles.update(dt);
}
function finishWork(){
  if(!working&&dayDone)return;
  working=false;dayDone=true;paused=false;
  const bw=$('#btnWork');if(bw)bw.disabled=true;
  const bs=$('#btnSkipDay');if(bs)bs.disabled=false;
  sfx('good');
  toast(`🔨 Day's work done — progress ${Math.round(G.construction.progress)}%`,'good');
  checkMilestones();
  if(G.construction.progress>=100)setTimeout(offerAgaman,700);
}
function offerAgaman(){
  if(G.phase!=='construction')return;
  showDialog({avatar:'🎉',name:'Construction Complete!',role:'The mandap stands tall',
    text:`The pandal is ready — ${G.theme?G.theme.name:'decorations pending'}. The whole lane is taking selfies!<br><br>The idol is being finished at the workshop. Tomorrow: <b>Agaman — the grand arrival procession!</b>`,
    choices:[{label:'🐘 Proceed to Agaman →',run:()=>{closeDialog();G.day=19;rollWeather();setPhase('agaman');}}]});
}
function endDay(){
  if(working)return;
  if(G.construction.progress>=100){offerAgaman();return;}
  if(G.day>=18){
    if(G.construction.progress<100){
      showDialog({avatar:'⚠️',name:'Deadline!',role:'Day 18 — Ganesh Chaturthi is tomorrow',
        text:`The pandal is only ${Math.round(G.construction.progress)}% done! Volunteers pull an all-nighter (₹2,000 overtime) to finish what they can.`,
        choices:[{label:'😮‍💨 All-nighter (₹2,000)',run:()=>{closeDialog();gainMoney(-2000,'Overtime');
          G.construction.progress=clamp(G.construction.progress+22,0,100);
          G.construction.durability=clamp(G.construction.durability-8,10,100);
          G.satisfaction-=G.construction.progress<100?6:0;
          G.day=19;setPhase('agaman');}}]});
      return;
    }
  }
  nextDay(1);dayDone=true;workT=0;
  $('#btnWork').disabled=false;$('#btnSkipDay').disabled=true;
  G.tod=.33;
  checkMilestones();
  banner(`Day ${G.day} · ${weatherInfo().icon} ${weatherInfo().name}`,'',1600);
  refreshUI();
}

/* ---------- milestones: customization ---------- */
function checkMilestones(live){
  const p=G.construction.progress;
  if(p>=25&&!milestones.theme){milestones.theme=true;chooseTheme();return}
  if(p>=55&&!milestones.lights){milestones.lights=true;chooseLights();return}
  if(p>=78&&!milestones.flowers){milestones.flowers=true;chooseFlowers();return}
}
function optionSheet(title,sub,opts,onPick){
  paused=true; // work pauses while the creative decision is pending
  const p=$('#panel');p.classList.remove('hidden');
  p.innerHTML=`<div class="sheet"><h2>${title}</h2><div class="sub">${sub}</div>
    <div class="grid-cards" id="optGrid"></div></div>`;
  const g=p.querySelector('#optGrid');
  const all=[...opts,{icon:'⏭️',name:'Keep it simple (skip)',cost:0,cre:0,id:null,skip:true,desc:'Save every rupee — no fancy extras here.'}];
  for(const o of all){
    const c=el('div','card');
    c.style.cursor='pointer';
    c.innerHTML=`<h3>${o.icon} ${o.name}</h3><div class="desc">${o.desc||''}</div>
      <div class="price">${o.cost?fmt(o.cost):'Free'}</div><div class="t-desc">Creativity +${o.cre}</div>`;
    c.onclick=()=>{
      if(o.cost>G.money){toast('Not enough money for this!','bad');return}
      if(o.cost)gainMoney(-o.cost,null);
      sfx('good');p.classList.add('hidden');onPick(o.skip?null:o);
      Particles.confetti(innerWidth/2,innerHeight/3,20);
      paused=false;
      refreshUI();
    };
    g.appendChild(c);
  }
}
function chooseTheme(){
  optionSheet('🎨 Direct the Painters — Choose Pandal Theme','The artists await your vision. This defines your pandal\'s identity.',
    THEMES.map(th=>({...th,desc:th.ecoBonus?'Eco bonus: counts as green decoration!':''})),
    th=>{if(!th){toast('Plain whitewash it is — budget saved.');return}
      G.theme=th;
      if(th.ecoBonus)G.eco.naturalColors=true;
      toast(`🎨 Theme selected: ${th.name}`,'good');
      G.construction.progress=clamp(G.construction.progress+4,0,100);refreshUI();});
}
function chooseLights(){
  optionSheet('💡 Lighting Design','Evening aarti and programs will shine under these lights.',
    LIGHTS,li=>{if(!li){toast('Lights skipped — evenings will be dim.');return}
      G.lights=li;toast(`💡 Lighting: ${li.name}`,'good');
      if(!G.purchases.lights&&li.id!=='none'){toast('No lighting rig bought at market — effect reduced','bad');G.lights=LIGHTS[0];}
      refreshUI();});
}
function chooseFlowers(){
  optionSheet('💐 Floral Arrangements','Marigold magic for the entrance and stage.',
    FLOWERS,fl=>{if(!fl){toast('No floral budget — the stage stays simple.');return}
      G.flowers=fl;toast(`💐 Florals: ${fl.name}`,'good');
      if(!G.purchases.flowers&&fl.id!=='basic'){toast('No flower stock purchased — using basic strings','bad');G.flowers=FLOWERS[0];}
      refreshUI();});
}

/* ---------- dynamic interruptions ---------- */
const EVENTS=[
  {id:'traffic',cond:()=>true,run(){
    showDialog({avatar:'🚚',name:'Material Truck Stuck!',role:'Logistics crisis',cls:'event-modal',
      text:'The bamboo truck is gridlocked at the junction! Traffic is piling up and horns are blaring. The driver calls you, panicking.',
      choices:[
        {label:'👮 Send volunteers to reroute traffic',hint:'Uses 2 volunteers',run:()=>{
          closeDialog();G.stats.eventsSolved++;
          if(G.volunteers>2){toast('👥 Volunteers cleared the jam like pros!','good');G.construction.morale=clamp(G.construction.morale+5,0,100);}
          else{toast('Not enough hands — small delay anyway','bad');G.construction.progress=clamp(G.construction.progress-4,0,100);}
          resume();}},
        {label:'💰 Hire a tow + pay the fine',hint:'₹1,500',run:()=>{closeDialog();gainMoney(-1500,'Tow & fine');G.stats.eventsSolved++;toast('Truck freed quickly','good');resume();}},
        {label:'⏳ Just wait it out',hint:'Progress −8%',danger:true,run:()=>{closeDialog();G.stats.eventsFailed++;
          G.construction.progress=clamp(G.construction.progress-8,0,100);G.construction.morale=clamp(G.construction.morale-8,0,100);
          toast('Hours lost. Workers are grumbling.','bad');resume();}},
      ]});}},
  {id:'rain',cond:()=>G.weather==='rain',run(){
    showDialog({avatar:'🌧️',name:'Unseasonal Downpour!',role:'Weather emergency',cls:'event-modal',
      text:'Black clouds burst open! Fresh fabric and bamboo are soaking. Workers are running for cover.',
      choices:[
        {label:'🧵 Emergency tarpaulin cover-up',hint:'₹1,200 · saves the site',run:()=>{closeDialog();gainMoney(-1200,'Tarps');G.stats.eventsSolved++;
          toast('Everything covered in time!','good');resume();}},
        {label:'💪 Keep working in the rain!',hint:'Risk: morale & durability',danger:true,run:()=>{closeDialog();
          if(Math.random()<.4){G.stats.eventsFailed++;G.construction.morale=clamp(G.construction.morale-18,0,100);
            G.construction.durability=clamp(G.construction.durability-12,0,100);
            toast('A worker slips and the fabric tears! Morale down.','bad');sfx('bad');}
          else{G.stats.eventsSolved++;G.construction.morale=clamp(G.construction.morale-8,0,100);
            toast('Brutal, but the crew pushed through. Chai for everyone!','good');gainMoney(-500,'Chai & snacks');}
          resume();}},
        {label:'🛑 Stop work for the day',hint:'Safe but slow',run:()=>{closeDialog();G.construction.progress=clamp(G.construction.progress-6,0,100);
          toast('Site secured. A rest day isn\'t the worst...','');resume();}},
      ]});}},
  {id:'dispute',cond:()=>crewStats().count>1,run(){
    showDialog({avatar:'🤬',name:'Contractor Team Fight!',role:'Painter vs structural crew',cls:'event-modal',
      text:'"YOU moved MY scaffold!!" — "YOUR paint dripped on MY bamboo!!" The two crews face off near the platform. Work has stopped.',
      choices:[
        {label:'🕊️ Mediate personally + samosa peace treaty',hint:`Rep check (${Math.round(G.reputation)})`,run:()=>{closeDialog();
          if(Math.random()<clamp(.35+G.reputation/130,.2,.9)){G.stats.eventsSolved++;gainRep(3,'Peacemaker');
            G.construction.morale=clamp(G.construction.morale+10,0,100);toast('Samosas solved everything. Crews are laughing.','good');}
          else{G.stats.eventsFailed++;G.construction.morale=clamp(G.construction.morale-10,0,100);
            toast('They respect you... barely. Work resumes slowly.','');}
          resume();}},
        {label:'💵 Pay both teams a bonus to cool off',hint:'₹2,000',run:()=>{closeDialog();gainMoney(-2000,'Peace bonus');G.stats.eventsSolved++;
          G.construction.morale=clamp(G.construction.morale+5,0,100);toast('Money talks. Work resumes.','good');resume();}},
        {label:'😤 Shout them all into silence',hint:'Morale risk',danger:true,run:()=>{closeDialog();
          G.construction.morale=clamp(G.construction.morale-15,0,100);G.construction.progress=clamp(G.construction.progress-3,0,100);
          toast('Silence... but sullen silence. Morale drops.','bad');resume();}},
      ]});}},
  {id:'inspector',cond:()=>true,run(){
    showDialog({avatar:'🧾',name:'Municipal Inspector Visit',role:'"Permission papers. Now."',cls:'event-modal',
      text:'A municipal inspector arrives with a clipboard: "Pandal permission? Fire safety? Show me everything." Some papers are... creatively interpreted.',
      choices:[
        {label:'📁 Everything is in order, sir!',hint:`${G.alloc.security>0||G.purchases.genset?'Strong':'Weak'} paperwork`,run:()=>{closeDialog();
          if(G.alloc.security>0||G.purchases.genset){G.stats.eventsSolved++;gainRep(2,'Rule-following mandal');
            toast('He stamps APPROVED and even compliments the safety kit.','good');}
          else{G.stats.eventsFailed++;gainMoney(-2500,'Fine');
            toast('₹2,500 fine for "irregularities". Ouch.','bad');}
          resume();}},
        {label:'🙏 Sweet-talk + "visit us at aarti, sir"',hint:'Rep check',danger:true,run:()=>{closeDialog();
          if(Math.random()<clamp(.2+G.reputation/120,.1,.8)){G.stats.eventsSolved++;gainRep(-1,'Bending rules');
            toast('"Hmm... I will come for aarti." He walks away.','');}
          else{G.stats.eventsFailed++;gainMoney(-4000,'Fine + penalty');gainRep(-4,'Inspector offended');
            toast('He was NOT amused. Double fine + reputation hit.','bad');}
          resume();}},
      ]});}},
  {id:'short',cond:()=>G.contractors.electric<=1,run(){
    showDialog({avatar:'⚡',name:'Electrical Short Circuit!',role:'Sparks near the canopy',cls:'event-modal',
      text:'ZAP! The jugaad wiring shorts out — sparks fly near the fabric! Everyone freezes.',
      choices:[
        {label:'🧯 Cut the main line, grab extinguisher',hint:'Safe',run:()=>{closeDialog();G.stats.eventsSolved++;
          G.construction.progress=clamp(G.construction.progress-3,0,100);
          toast('Crisis averted. Rewiring costs an afternoon.','good');resume();}},
        {label:'🔧 Fix it live — no time to waste!',hint:'RISKY',danger:true,run:()=>{closeDialog();
          if(Math.random()<.5){G.stats.eventsSolved++;toast('Barely fixed with tape and prayer...','');}
          else{G.stats.eventsFailed++;gainMoney(-1500,'Medical bill');G.construction.durability=clamp(G.construction.durability-8,0,100);
            G.construction.morale=clamp(G.construction.morale-12,0,100);
            toast('A worker gets a shock! Hospital bill paid. Hire better electricians!','bad');sfx('bad');}
          resume();}},
      ]});}},
];
function fireEvent(){
  const pool=EVENTS.filter(e=>e.cond());
  pick(pool).run();
}
function resume(){
  refreshUI();
  working=true;
}

/* ---------- draw ---------- */
function draw(ctx,Wpx,Hpx){
  const fit=fitTransform(ctx,Wpx,Hpx);
  ctx.clearRect(-fit.ox,-fit.oy,Wpx,Hpx);
  drawSky(ctx,VW,VH,G.tod);
  if(G.weather==='cloudy'||G.weather==='rain')drawClouds(ctx,VW,VH,t,G.weather==='rain'?'rgba(120,125,140,.9)':'rgba(255,255,255,.8)');
  // distant buildings
  drawBuildingSide(ctx,0,300,180,300,'rgba(255,214,120,.15)',true);
  drawBuildingSide(ctx,1100,260,180,340,'rgba(255,214,120,.15)',true);
  // ground
  ctx.fillStyle='#6e8a50';ctx.fillRect(0,560,VW,160);
  ctx.fillStyle='#8a7455';ctx.fillRect(0,640,VW,80);
  // fence
  ctx.strokeStyle='#b98a3a';ctx.lineWidth=5;
  for(let x=20;x<VW;x+=70){ctx.beginPath();ctx.moveTo(x,620);ctx.lineTo(x,660);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,632);ctx.lineTo(VW,632);ctx.stroke();
  // banner board
  ctx.fillStyle='#7c2d12';ctx.fillRect(60,480,18,160);ctx.fillRect(200,480,18,160);
  ctx.fillStyle='#fbbf24';roundRect(ctx,40,440,200,54,8);ctx.fill();
  ctx.fillStyle='#7c2d12';ctx.font='900 15px Segoe UI';ctx.textAlign='center';
  ctx.fillText('श्री गणेश मंडल',140,462);
  ctx.font='700 11px Segoe UI';ctx.fillText(`EST. 1972 · DAY ${G.day}/30`,140,480);

  // THE PANDAL
  const theme=G.theme||{c1:'#ff9933',c2:'#e11d48',c3:'#fbbf24'};
  drawPandal(ctx,640,640,430,330,G.construction.progress/100,{theme,t,
    lights:!!G.lights&&G.lights.id!=='none',lightColors:G.lights?G.lights.colors:['#ffe08a'],
    idolTier:null});
  // material piles
  if(G.construction.progress<70){
    ctx.fillStyle='#b98a3a';
    for(let i=0;i<6-G.construction.progress/14;i++){roundRect(ctx,980+i*16,620-i*6,90,8,3);ctx.fill();}
    ctx.fillStyle='#e8dcc8';roundRect(ctx,1000,650,70,26,6);ctx.fill();
  }
  // truck
  if(truck)drawTruckSide(ctx,truck.x,660,.9,'#c2410c');
  // workers
  for(const w of workers){
    drawPersonSide(ctx,w.x,w.y,.85,{color:w.c,walk:w.walk});
    if(working&&w.job===0&&Math.sin(t*9+w.x)>.6){ctx.font='12px Segoe UI';ctx.textAlign='center';ctx.fillText('🔨',w.x+10,w.y-42);}
  }
  // rain / heat fx
  if(G.weather==='rain')drawRain(ctx,VW,VH,t,1);
  if(G.weather==='heat'){ctx.fillStyle='rgba(255,160,40,.08)';ctx.fillRect(0,0,VW,VH);}
  // evening diyas near fence
  if(G.tod>.6)drawDiyas(ctx,320,652,6,t);
  nightTint(ctx,VW,VH,G.tod,.4);
  Particles.draw(ctx,null);
}
function onAction(){Audio_.init();}
return {enter,exit,update,draw,onAction};
})();
