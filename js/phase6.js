/* ================= phase6.js — Visarjan (Immersion) + Final Scorecard ================= */
'use strict';
PHASES.visarjan=(()=>{
let state='convoy',t=0,pos=0,order=[],fireworks=[],ui=null,immT=0,ended=false;
const CORRECT=['dhol','chain','truck','crowd','clean'];
const ITEMS=[
  {id:'dhol',icon:'🥁',name:'Dhol-Tasha Troupe'},
  {id:'truck',icon:'🚚',name:'Main Idol Truck'},
  {id:'clean',icon:'🧹',name:'Clean-up Squad + Ambulance'},
  {id:'chain',icon:'🧑‍🤝‍🧑',name:'Volunteer Human Chain'},
  {id:'crowd',icon:'🙏',name:'Devotee Crowd'},
];

function enter(){
  state='convoy';t=0;pos=0;order=[];fireworks=[];immT=0;ended=false;
  G.tod=.6;
  banner('Phase 6 — Visarjan','Day 30 · Ganpati Bappa Morya, Aaglya Baras Lavkar Yeh!',3200);
  showConvoyPlanner();
}
function exit(){Audio_.stopDhol();if(ui){ui.remove();ui=null}}

/* ---------- convoy sequencing ---------- */
function showConvoyPlanner(){
  const p=$('#panel');p.classList.remove('hidden');
  const shuffled=[...ITEMS].sort(()=>Math.random()-.5);
  p.innerHTML=`<div class="sheet"><h2>🚚 Sequence the Visarjan Convoy</h2>
    <div class="sub">Traffic police need the parade order. Tap units in the order they will march — front of parade first.<br>
    <i>Hint from the inspector: music leads, volunteers protect the idol, the truck rides at the heart, devotees follow, and the city is left clean.</i></div>
    <div class="grid-cards" id="unitGrid"></div>
    <div class="mt"><b>Marching order:</b> <span id="orderLine" style="letter-spacing:.2em;font-size:1.3rem"></span></div>
    <div class="row mt"><button class="btn ghost" id="btnResetOrder">↩ Reset</button>
    <button class="btn big" id="btnStartConvoy" disabled>Start the Final Procession →</button></div></div>`;
  const g=p.querySelector('#unitGrid');
  for(const it of shuffled){
    const c=el('div','card');c.style.cursor='pointer';
    c.innerHTML=`<h3 style="font-size:1.6rem">${it.icon}</h3><div class="t-name">${it.name}</div>`;
    c.onclick=()=>{
      if(order.includes(it.id))return;
      sfx('click');order.push(it.id);
      c.style.opacity=.4;c.style.borderColor='#16a34a';
      p.querySelector('#orderLine').textContent=order.map(id=>ITEMS.find(i=>i.id===id).icon).join(' → ');
      if(order.length===ITEMS.length)p.querySelector('#btnStartConvoy').disabled=false;
    };
    g.appendChild(c);
  }
  p.querySelector('#btnResetOrder').onclick=()=>{order=[];showConvoyPlanner()};
  p.querySelector('#btnStartConvoy').onclick=()=>{
    p.classList.add('hidden');
    let correct=0;order.forEach((id,i)=>{if(id===CORRECT[i])correct++});
    const bonus=correct*2;
    G.satisfaction=clamp(G.satisfaction+bonus-4,0,100);
    if(correct===5){toast('🌟 PERFECT convoy order! Police give a salute.','good');gainRep(4,'Flawless logistics');G.stats.eventsSolved++;}
    else toast(`Convoy order ${correct}/5 correct (${bonus>4?'decent':'messy'} traffic flow)`,'');
    startProcession();
  };
}

/* ---------- procession ---------- */
function startProcession(){
  state='procession';pos=0;
  Audio_.startDhol(165);
  ui=el('div','');
  ui.style.cssText='position:absolute;left:50%;transform:translateX(-50%);bottom:12px;z-index:30;display:flex;gap:10px;align-items:center;background:rgba(15,10,30,.85);border:1px solid rgba(255,180,80,.4);border-radius:16px;padding:10px 16px;color:#ffe9c9';
  ui.innerHTML=`<div style="min-width:220px"><div style="font-size:.66rem;opacity:.75;letter-spacing:.1em">DISTANCE TO ${G.eco.tank?'ECO TANK':'THE GHAT'}</div>
    <div class="bar" style="margin-top:4px"><div class="bar-fill blue" id="vDist" style="width:0%"></div></div></div>
    <button class="btn" id="vChant">📣 Chant! (E)</button>`;
  $('#game').appendChild(ui);
  $('#vChant').onclick=()=>onAction();
}

function update(dt){
  t+=dt;
  if(state==='procession'){
    pos+=dt*9;
    G.tod=clamp(.6+pos/110*.3,.6,.92);
    if(Math.random()<dt*2)fireworks.push({x:rand(1150,130),y:rand(230,70),t0:t});
    $('#vDist')&&($('#vDist').style.width=clamp(pos/100,0,100)+'%');
    if(pos>=100){state='immersion';immT=0;Audio_.stopDhol();sfx('conch');
      if(ui){ui.remove();ui=null}}
    if(Math.random()<dt*.6)Particles.petals(rand(1200,100),rand(500,300),3);
  }
  if(state==='immersion'){
    immT+=dt;
    G.tod=clamp(.92+immT*.004,.92,.99);
    if(Math.random()<dt*1.4)fireworks.push({x:rand(1150,130),y:rand(240,80),t0:t});
    if(immT>4.2&&!ended){ended=true;showEcoReport();}
  }
  Particles.update(dt);
}
function onAction(){
  Audio_.init();
  if(state==='procession'){
    sfx('crowd');Particles.floatText(rand(900,300),rand(420,340),pick(['GANPATI BAPPA MORYA!','🙌','AAGLYA BARAS LAVKAR YEH!','#fbbf24']),'#fff');
    if(Math.random()<.25)fireworks.push({x:rand(1100,180),y:rand(220,80),t0:t});
  }
}

function showEcoReport(){
  const eco=G.eco;
  const lines=[];
  lines.push(eco.clay?'🌱 <b>Clay (shadu) idol</b> — dissolves harmlessly. The water thanks you.':'🏭 Plaster idol — it will take weeks to dissolve, harming aquatic life.');
  lines.push(eco.naturalColors?'🎨 <b>Natural vegetable colors</b> — no toxic paint in the water.':'🎨 Chemical paints leaching into the water...');
  lines.push(eco.tank?'🌊 <b>Artificial immersion tank</b> used — the river/lake stays pristine!':'🏞️ Immersion in the natural water body — municipal penalty & eco damage.');
  const mult=ecoMultiplier();
  showDialog({avatar:'🌊',name:'Visarjan Complete',role:`Day 30 · Eco report · Multiplier ×${mult.toFixed(2)}`,
    text:`Bappa bids farewell as the crowd chants one last time...<br><br>${lines.join('<br>')}`,
    choices:[{label:'🏆 View Final Scorecard →',run:()=>{closeDialog();setPhase('score');}}]});
}

/* ---------- draw ---------- */
let crowdSeed=[];
function ensureCrowd(){if(crowdSeed.length)return;
  for(let i=0;i<110;i++)crowdSeed.push({o:rand(5000),s:rand(1.15,.6),c:pick(['#e11d48','#f59e0b','#16a34a','#0891b2','#7c3aed','#be185d','#fff','#334155']),side:i%2});}
function draw(ctx,Wpx,Hpx){
  ensureCrowd();
  const fit=fitTransform(ctx,Wpx,Hpx);
  ctx.clearRect(-fit.ox,-fit.oy,Wpx,Hpx);
  drawSky(ctx,VW,VH,G.tod);
  const scroll=pos*30;
  if(state==='procession'){
    for(let i=0;i<8;i++){
      const bx=((i*400-scroll*.4)%2900+2900)%2900-500;
      drawBuildingSide(ctx,bx,220+((i*53)%90),230,380-((i*53)%90),'rgba(255,214,120,.3)',true);
    }
    // ghats silhouette far ahead when close
    if(pos>70){ctx.fillStyle='rgba(20,30,60,.8)';
      ctx.beginPath();ctx.moveTo(1100,560);ctx.lineTo(1280,520);ctx.lineTo(1280,560);ctx.fill();}
    ctx.fillStyle='#3b3948';ctx.fillRect(0,555,VW,165);
    ctx.strokeStyle='rgba(255,220,120,.35)';ctx.setLineDash([20,16]);ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(0,640);ctx.lineTo(VW,640);ctx.stroke();ctx.setLineDash([]);
    // crowd
    for(const c of crowdSeed){
      const cx=((c.o-scroll*1.02)%4400+4400)%4400-400;
      if(cx<-60||cx>VW+60)continue;
      const bounce=Math.sin(t*7+c.o)*3;
      drawPersonSide(ctx,cx,c.side?545+bounce:712+bounce,{scale:c.s,color:c.c,walk:t*2+c.o});
    }
    // dhol troupe ahead
    drawDholPlayer(ctx,760-((scroll*.3)%240)+240,655,1,t);
    drawDholPlayer(ctx,860-((scroll*.3)%240)+240,655,1,t+.7);
    // human chain
    for(let i=0;i<8;i++)drawPersonSide(ctx,560+i*30,668,{scale:.8,color:i%2?'#ff9933':'#16a34a',walk:t*3+i});
    // main truck with idol
    const bounce=Math.sin(t*8)*1.5;
    drawTruckSide(ctx,380,622,1.2,'#7c2d12');
    drawMarigoldGarland(ctx,290,590+bounce,480,590+bounce,12,t);
    drawGanesha(ctx,340,580+bounce,.8,{tier:G.idol.eco?1:G.idol.tier,eco:G.idol.eco,t});
    // crowd behind truck
    for(let i=0;i<12;i++)drawPersonSide(ctx,150+i*26+Math.sin(t*3+i)*4,700,{scale:.85,color:crowdSeed[i+40].c,walk:t*2+i});
    // clean-up squad at back
    drawPersonSide(ctx,60,690,{scale:.85,color:'#f8fafc',walk:t*2});
    ctx.font='14px Segoe UI';ctx.textAlign='center';ctx.fillText('🧹',60,650);
    drawBunting(ctx,0,230,VW,t);
    fireworks=fireworks.filter(f=>drawFirework(ctx,f.x,f.y,f.t0,t));
    nightTint(ctx,VW,VH,G.tod,.25);
    Particles.draw(ctx,null);
    return;
  }
  if(state==='immersion'){
    // water scene
    const tank=G.eco.tank;
    drawBuildingSide(ctx,-30,260,200,300,'rgba(255,214,120,.25)',true);
    // water
    const wg=ctx.createLinearGradient(0,520,0,720);
    wg.addColorStop(0,'#1e3a5f');wg.addColorStop(1,'#0d1f38');
    ctx.fillStyle='#4a4258';ctx.fillRect(0,480,VW,80);
    ctx.fillStyle=wg;ctx.fillRect(0,540,VW,180);
    // waves
    ctx.strokeStyle='rgba(160,200,255,.25)';ctx.lineWidth=2;
    for(let wy=0;wy<6;wy++){
      ctx.beginPath();
      for(let wx=0;wx<=VW;wx+=20)ctx.lineTo(wx,560+wy*26+Math.sin(t*2+wx*.02+wy)*4);
      ctx.stroke();
    }
    if(tank){ // concrete tank edges
      ctx.fillStyle='#7a7a86';ctx.fillRect(300,545,680,14);ctx.fillRect(300,545,14,120);ctx.fillRect(966,545,14,120);
      ctx.font='700 13px Segoe UI';ctx.fillStyle='#ffe9c9';ctx.textAlign='center';
      ctx.fillText('MUNICIPAL ECO IMMERSION TANK',640,538);
    }else{
      // ghat steps
      ctx.fillStyle='#8a7a60';
      for(let sI=0;sI<4;sI++)ctx.fillRect(60+sI*18,480+sI*18,240,18);
    }
    // crowd on bank
    for(let i=0;i<30;i++){
      const cx=60+((i*137)%1160);
      drawPersonSide(ctx,cx,548+Math.sin(t*3+i)*1.5,{scale:.9,color:crowdSeed[i].c,walk:t+i});
    }
    // idol descending into water
    const k=clamp(immT/3.2,0,1);
    const ix=640,iy=lerp(520,640,k*k);
    ctx.save();
    if(k>.55)ctx.globalAlpha=clamp(1-(k-.55)*2.2,0,1);
    drawGanesha(ctx,ix,iy,.75,{tier:G.eco.clay?1:G.idol.tier,eco:G.eco.clay,t});
    ctx.restore();
    if(k>=.99){
      // ripples + petals
      ctx.strokeStyle='rgba(200,230,255,.5)';ctx.lineWidth=2;
      for(let r=0;r<3;r++){
        const rr=(immT-3)*70+r*26;
        if(rr>0){ctx.globalAlpha=clamp(1-rr/140,0,1);
          ctx.beginPath();ctx.ellipse(ix,640,rr,rr*.3,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
      }
    }
    if(immT>1.5)Particles.petals(640,500,1);
    // aarti on the bank
    drawDiyas(ctx,240,552,6,t);drawDiyas(ctx,920,552,6,t);
    fireworks=fireworks.filter(f=>drawFirework(ctx,f.x,f.y,f.t0,t));
    nightTint(ctx,VW,VH,G.tod,.15);
    Particles.draw(ctx,null);
    if(immT>2){
      ctx.font='900 26px Segoe UI';ctx.textAlign='center';ctx.globalAlpha=clamp((immT-2)/1,0,1);
      ctx.fillStyle='#fbbf24';ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=5;
      ctx.strokeText('गणपती बाप्पा मोरया, आगल्या बरस लवकर ये!',640,160);
      ctx.fillText('गणपती बाप्पा मोरया, आगल्या बरस लवकर ये!',640,160);
      ctx.globalAlpha=1;
    }
  }
}
return {enter,exit,update,draw,onAction};
})();

/* ================= score screen ================= */
PHASES.score=(()=>{
function enter(){
  $('#panel').classList.remove('hidden');
  const s=computeScores();G.scores=s;
  const mult=ecoMultiplier();
  const total=Math.round((s.budget+s.creativity+s.reputation+s.satisfaction)/4*mult);
  const gr=gradeOf(total);
  const logs=G.festival.dayLogs;
  const bestDay=logs.length?logs.reduce((a,b)=>a.sat>b.sat?a:b):{day:G.day,sat:0,turnout:0};
  const totalVisitors=logs.reduce((a,l)=>a+l.turnout,0);
  const p=$('#panel');
  p.innerHTML=`<div class="sheet" style="text-align:center">
    <div class="score-grade">${gr.g}</div>
    <h2 style="justify-content:center">${gr.title}</h2>
    <div class="sub">${gr.msg}</div>
    <div style="font-size:2.2rem;font-weight:900;color:#7c2d12">Score ${total}/100 ${mult>1?`<span style="font-size:1rem;color:#16a34a">(×${mult.toFixed(2)} eco bonus!)</span>`:''}</div>
    <div style="max-width:520px;margin:18px auto;text-align:left">
      ${[['💰 Budget Efficiency',s.budget,'green'],['🎨 Creativity',s.creativity,''],['🙏 Neighborhood Reputation',s.reputation,'blue'],['😊 Visitor Satisfaction',s.satisfaction,'']].map(([l,v,c])=>`
      <div class="stat-line"><span class="s-label">${l}</span><div class="bar"><div class="bar-fill ${c}" style="width:0%" data-w="${v}"></div></div><b style="min-width:34px;text-align:right">${v}</b></div>`).join('')}
    </div>
    <div class="grid-cards" style="max-width:640px;margin:0 auto;text-align:left">
      <div class="card"><h3>📊 Festival Record</h3><div class="desc">
        Chanda collected: <b>${fmt(G.chandaCollected)}</b> · Treasury left: <b>${fmt(G.money)}</b><br>
        Total visitors over 10 days: <b>${totalVisitors.toLocaleString('en-IN')}</b><br>
        Best day: <b>Day ${bestDay.day}</b> (${Math.round(bestDay.sat)}% joy)<br>
        Donations received: <b>${G.stats.donations}</b> · Crises solved: <b>${G.stats.eventsSolved}</b> / failed: <b>${G.stats.eventsFailed}</b><br>
        Final reputation: <b>${Math.round(G.reputation)}</b> · Volunteers: <b>${G.volunteers}</b><br>
        Eco choices: ${G.eco.clay?'🌱Clay ':''}${G.eco.naturalColors?'🎨Natural ':''}${G.eco.tank?'🌊Tank ':''}${!G.eco.clay&&!G.eco.tank?'🏭 None — the river weeps':''}
      </div></div>
    </div>
    <div class="row center mt"><button class="btn big" id="btnReplay">🔄 Play Again</button>
    <button class="btn ghost big" id="btnWatch">🎆 Watch one last firework show</button></div>
  </div>`;
  setTimeout(()=>p.querySelectorAll('.bar-fill').forEach(b=>b.style.width=b.dataset.w+'%'),200);
  $('#btnReplay').onclick=()=>{p.classList.add('hidden');setPhase('title');};
  $('#btnWatch').onclick=()=>{sfx('firework');Particles.confetti(innerWidth/2,innerHeight*.4,60);
    for(let i=0;i<6;i++)setTimeout(()=>sfx('firework'),i*350);};
  sfx('good');
}
function exit(){}
function update(dt){Particles.update(dt)}
function draw(ctx,Wpx,Hpx){
  const fit=fitTransform(ctx,Wpx,Hpx);
  drawSky(ctx,VW,VH,.95);
  drawBuildingSide(ctx,0,300,240,320,'rgba(255,214,120,.2)',true);
  drawBuildingSide(ctx,1040,300,240,320,'rgba(255,214,120,.2)',true);
  ctx.fillStyle='#3a3050';ctx.fillRect(0,600,VW,120);
  drawGanesha(ctx,640,610,1.3,{tier:G.idol.tier,eco:G.idol.eco,t:performance.now()/1000});
  drawDiyas(ctx,400,648,10,performance.now()/1000);
  Particles.draw(ctx,null);
}
return {enter,exit,update,draw};
})();
