/* ================= phase5.js — Utsav (Festival Management) ================= */
'use strict';
PHASES.utsav=(()=>{
let state='schedule',t=0,liveT=0,chosen=[],crisisQueue=[],crisisTimer=0;
let grid,barricades=new Set(),security=2,flowScore=0;
let daySatStart=0,dayEvents=0,liveVisitors=0,ui=null;
const GW=13,GH=7; // barricade grid
const FEST_START=20,FEST_END=29;

function enter(){
  t=0;state='schedule';liveT=0;
  banner('Phase 5 — The Utsav Begins!','Days 20–29 · Ten days of aarti, programs, crowds & chaos',3200);
  G.tod=.55;
  buildDay();
}
function exit(){Audio_.stopDhol();if(ui){ui.remove();ui=null}}

/* ---------- morning: schedule ---------- */
function buildDay(){
  state='schedule';chosen=[];
  rollWeather();updateHUD();
  showSchedule();
}
function showSchedule(){
  const p=$('#panel');p.classList.remove('hidden');
  const dayNo=G.day-FEST_START+1;
  p.innerHTML=`<div class="sheet"><h2>🪔 Festival Day ${dayNo}/10 — Morning Planning</h2>
    <div class="sub">${weatherInfo().icon} ${weatherInfo().name} · Treasury ${fmt(G.money)} · Crowd joy ${Math.round(G.satisfaction)}% · Expected turnout: ${expectedTurnout()}</div>
    <div class="grid-cards" id="actGrid"></div>
    <div class="row spread mt" style="border-top:2px dashed #dfc9a3;padding-top:14px">
      <div>Total cost: <b id="actCost">₹0</b> · <span id="actWarn" style="color:#dc2626"></span></div>
      <button class="btn big" id="btnToLayout">Plan Crowd Flow →</button>
    </div>
    ${G.day>FEST_START?`<button class="btn ghost mt" id="btnQuick" style="width:100%">⚡ Quick-simulate ALL remaining days (auto-play)</button>`:''}
  </div>`;
  const g=p.querySelector('#actGrid');
  for(const a of ACTIVITIES){
    const c=el('div','card');c.style.cursor='pointer';c.dataset.id=a.id;
    c.innerHTML=`<h3>${a.icon} ${a.name} ${a.must?'<span style="color:#a16207;font-size:.7rem">TRADITION</span>':''}</h3>
      <div class="desc">Joy +${a.sat}${a.revenue?` · earns ~${fmt(a.revenue)}`:''}${a.risk?` · ⚠️ ${a.risk} risk`:''}</div>
      <div class="price">${fmt(a.cost)}</div>`;
    c.onclick=()=>{
      sfx('click');
      if(chosen.includes(a.id)){
        if(a.must){toast('Aarti can\'t be skipped — it\'s the heart of the festival!','bad');return}
        chosen=chosen.filter(x=>x!==a.id);c.style.borderColor='#e7c9a0';c.style.background='#fff';
      }else{
        chosen.push(a.id);c.style.borderColor='#16a34a';c.style.background='#f0fdf4';
      }
      updCost();
    };
    if(a.must){chosen.push(a.id);c.style.borderColor='#16a34a';c.style.background='#f0fdf4';}
    g.appendChild(c);
  }
  updCost();
  $('#btnToLayout').onclick=()=>{
    const cost=totalCost();
    if(cost>G.money){toast('Not enough treasury!','bad');return}
    if(chosen.length<1)return;
    p.classList.add('hidden');showLayout();
  };
  const qb=$('#btnQuick');
  if(qb)qb.onclick=()=>{p.classList.add('hidden');quickSim();};
}
function totalCost(){return chosen.reduce((s,id)=>{const a=ACTIVITIES.find(x=>x.id===id);return s+(a.must?Math.min(a.cost,Math.max(0,G.money)):a.cost)},0)}
function updCost(){const c=$('#actCost');if(c)c.textContent=fmt(totalCost());
  const w=$('#actWarn');if(w)w.textContent=totalCost()>G.money?'⚠ Over budget!':''}
function expectedTurnout(){
  const d=DIFF[G.difficulty];
  let base=180*d.turnout;
  base*=(.7+G.reputation/120)*(0.75+G.satisfaction/160)*weatherInfo().turnout;
  base*=(1+G.alloc.decor*.05+G.alloc.sound*.04);
  return Math.round(base);
}

/* ---------- crowd flow / barricades ---------- */
function showLayout(){
  state='layout';
  barricades=new Set();security=Math.min(2,G.volunteers);
  const p=$('#panel');p.classList.remove('hidden');
  p.innerHTML=`<div class="sheet"><h2>🚧 Crowd Flow Plan</h2>
    <div class="sub">Place barricades (click cells) to guide visitors from the ENTRANCE to the STAGE, prasad counter & food stalls. A clear snaking queue scores best; blockages cause stampedes!</div>
    <div id="gridWrap" style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap">
      <div id="grid" style="display:grid;grid-template-columns:repeat(${GW},34px);gap:3px"></div>
      <div style="min-width:220px">
        <div class="stat-line"><span class="s-label">Flow score</span><div class="bar"><div class="bar-fill green" id="flowBar" style="width:0%"></div></div></div>
        <div id="flowMsg" class="sub"></div>
        <div class="sub" style="margin-top:10px">Security volunteers on duty:</div>
        <div class="row"><button class="btn ghost" id="secMinus">−</button><b id="secN" style="min-width:30px;text-align:center">${security}</b><button class="btn ghost" id="secPlus">+</button> <span class="sub">of ${G.volunteers}</span></div>
        <button class="btn big mt" id="btnLive" style="width:100%">🌙 Start the Evening!</button>
      </div>
    </div></div>`;
  const g=p.querySelector('#grid');
  grid=[];
  for(let y=0;y<GH;y++){grid[y]=[];
    for(let x=0;x<GW;x++){
      const cell=el('div','');cell.style.cssText='width:34px;height:34px;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;background:#f3e3c8;border:2px solid #dfc9a3';
      const key=y*GW+x;
      cell.onclick=()=>{
        sfx('click');
        if(barricades.has(key)){barricades.delete(key);}
        else{
          if(isFixed(x,y)){toast('Can\'t barricade a facility!','bad');return}
          barricades.add(key);
        }
        paintGrid();scoreFlow();
      };
      g.appendChild(cell);grid[y][x]=cell;
    }
  }
  p.querySelector('#secMinus').onclick=()=>{security=Math.max(0,security-1);p.querySelector('#secN').textContent=security;sfx('click')};
  p.querySelector('#secPlus').onclick=()=>{security=Math.min(G.volunteers,security+1);p.querySelector('#secN').textContent=security;sfx('click')};
  p.querySelector('#btnLive').onclick=()=>{p.classList.add('hidden');startLive();};
  paintGrid();scoreFlow();
}
function isFixed(x,y){
  // stage (top center), entrance (bottom center), food (left), prasad (right)
  if(y===0&&x>=5&&x<=7)return true;
  if(y===GH-1&&x>=5&&x<=7)return true;
  if(x===0&&(y===2||y===3))return true;
  if(x===GW-1&&(y===2||y===3))return true;
  return false;
}
function paintGrid(){
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    const c=grid[y][x],key=y*GW+x;
    let bg='#f3e3c8',label='';
    if(barricades.has(key)){bg='#b45309';label='🚧';}
    if(y===0&&x>=5&&x<=7){bg='#e11d48';label='🛕';}
    if(y===GH-1&&x>=5&&x<=7){bg='#16a34a';label='🚪';}
    if(x===0&&(y===2||y===3)){bg='#f59e0b';label='🍛';}
    if(x===GW-1&&(y===2||y===3)){bg='#a16207';label='🥥';}
    c.style.background=bg;c.textContent=label;
  }
}
function scoreFlow(){
  // BFS from entrance to stage; barricades block
  const start={x:6,y:GH-1},goal={x:6,y:0};
  const seen=new Set([start.y*GW+start.x]);
  let q=[{...start,d:0}],found=null;
  while(q.length){
    const cur=q.shift();
    if(cur.x===goal.x&&cur.y===goal.y){found=cur.d;break}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cur.x+dx,ny=cur.y+dy;
      if(nx<0||ny<0||nx>=GW||ny>=GH)continue;
      const k=ny*GW+nx;
      if(seen.has(k)||barricades.has(k)||isFixed(nx,ny)===false&&false)continue;
      if(isFixed(nx,ny)&&!(nx===goal.x&&ny===goal.y)&&!(nx===start.x&&ny===start.y)&&!(nx===0||(nx===GW-1)))continue;
      seen.add(k);q.push({x:nx,y:ny,d:cur.d+1});
    }
  }
  const minD=GH-1;
  let msg,score;
  if(found==null){score=15;msg='😱 The stage is completely blocked off! Visitors can\'t reach Bappa!';}
  else{
    const extra=found-minD;
    if(extra<=0){score=70;msg='🚶 Straight open path — fast, but queues can stampede. A gentle zig-zag near the entrance is safer.';}
    else{
      score=clamp(96-(extra-1)*16,10,100);
      if(extra<=3)msg='👍 Nice controlled queue! Visitors snake calmly to the stage.';
      else msg='🌀 Long detour... people will grumble, but order is maintained.';
    }
    // zigzag bonus: barricades in bottom rows
    const zz=[...barricades].filter(k=>Math.floor(k/GW)>=GH-3).length;
    if(zz>=3&&extra>=1&&extra<=3){score=clamp(score+8,0,100);msg='🌟 Textbook serpentine queue! Security would be proud.';}
  }
  // food/prasad access check
  let accessPenalty=0;
  for(const [fx,fy] of [[0,2],[GW-1,2]]){
    let reachable=false;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=fx+dx,ny=fy+dy;
      if(nx>=0&&ny>=0&&nx<GW&&ny<GH&&!barricades.has(ny*GW+nx))reachable=true;
    }
    if(!reachable)accessPenalty+=12;
  }
  score=clamp(score-accessPenalty,5,100);
  if(accessPenalty)msg+=' ⚠️ You walled off the food/prasad stalls!';
  flowScore=score;
  const fb=$('#flowBar');if(fb)fb.style.width=score+'%';
  const fm=$('#flowMsg');if(fm)fm.textContent=msg;
}

/* ---------- live evening ---------- */
function startLive(){
  state='live';liveT=0;dayEvents=0;daySatStart=G.satisfaction;
  const cost=totalCost();gainMoney(-cost,null);
  let revenue=0;
  for(const id of chosen){const a=ACTIVITIES.find(x=>x.id===id);if(a.revenue)revenue+=a.revenue*(0.8+G.satisfaction/200);}
  if(revenue)gainMoney(revenue,'Food stall earnings');
  G.satisfaction=clamp(G.satisfaction-1.5,0,100); // crowds expect more every day
  G.satisfaction=clamp(G.satisfaction+ (flowScore-55)*.12,0,100);
  // crowd joy from activities scaled by turnout vs capacity
  const turnout=expectedTurnout();
  liveVisitors=turnout;
  const capacity=220+G.alloc.infra*60+G.alloc.security*40;
  let actSat=chosen.reduce((s,id)=>s+ACTIVITIES.find(a=>a.id===id).sat,0);
  if(turnout>capacity*1.5){actSat*=.6;toast('😰 Overcrowded! Programs less enjoyable...','bad');G.satisfaction=clamp(G.satisfaction-4,0,100);}
  G.satisfaction=clamp(G.satisfaction+actSat*.7,0,100);
  // crisis queue
  const nCrises=G.weather==='rain'?3:randi(2)+1+ (G.day-FEST_START>4?1:0);
  crisisQueue=[];
  for(let i=0;i<nCrises;i++)crisisQueue.push(makeCrisis());
  crisisTimer=rand(5,3);
  if(chosen.includes('dj'))Audio_.startDhol(160);else Audio_.startDhol(120);
  buildLiveUI();
}
function buildLiveUI(){
  ui=el('div','');
  ui.style.cssText='position:absolute;left:50%;transform:translateX(-50%);bottom:12px;z-index:30;display:flex;gap:14px;align-items:center;background:rgba(15,10,30,.85);border:1px solid rgba(255,180,80,.4);border-radius:16px;padding:10px 18px;color:#ffe9c9;font-weight:700;font-size:.85rem';
  ui.innerHTML=`<span>👥 ${liveVisitors} visitors</span><span>🚧 Flow ${Math.round(flowScore)}%</span>
    <span>🛡️ ${security} security</span><button class="btn ghost" id="btnSkipLive">⏩ Fast-forward evening</button>`;
  $('#game').appendChild(ui);
  $('#btnSkipLive').onclick=()=>{liveT=99};
}
function makeCrisis(){
  const pool=[
    {icon:'🔌',name:'Power Outage!',text:'The whole pandal goes DARK mid-aarti! The crowd gasps. Hundreds of phones light up.',
      choices:[
        {label:'🔋 Switch to backup generator',hint:G.purchases.genset?'You own one!':'Don\'t own one!',best:!!G.purchases.genset,
          run:()=>{if(G.purchases.genset){toast('Lights back in 10 seconds. Crowd cheers!','good');G.satisfaction=clamp(G.satisfaction+2,0,100);sfx('good');return true}
          toast('There IS no generator! Darkness drags on...','bad');sfx('bad');return false}},
        {label:'🕯️ Light emergency diyas + calm announcements',hint:'Partial fix',best:false,
          run:()=>{toast('Romantic but risky — the program restarts dimly.','');return 'half'}},
        {label:'📞 Beg the neighboring shop for a connection',hint:'Slow',best:false,
          run:()=>{gainMoney(-800,'Power jugad');toast('Jugaad wiring restored power after 20 minutes.','');return 'half'}},
      ]},
    {icon:'🤒',name:'Medical Emergency',text:'An elderly visitor collapses near the prasad counter! People crowd around in panic.',
      choices:[
        {label:'⛑️ Rush to the first-aid tent',hint:G.alloc.security>=2?'First-aid kit available':'No first-aid kit',best:G.alloc.security>=2,
          run:()=>{if(G.alloc.security>=2){toast('First-aid team stabilizes them. Family blesses the mandal.','good');gainRep(4,'Saved a visitor');return true}
          toast('No kit! Volunteers improvise with water & fans...','bad');gainRep(-1,'');return false}},
        {label:'🚑 Call ambulance (108)',hint:'Always works, slow',best:'half',
          run:()=>{toast('Ambulance arrives in 12 min. Handled, but scary moments.','');return 'half'}},
        {label:'👥 Clear the crowd, give them air',hint:'Basic',best:false,
          run:()=>{toast('Crowd clears. They recover after some water.','');return 'half'}},
      ]},
    {icon:'👶',name:'Missing Child!',text:'A crying mother reports her 6-year-old is missing near the food stalls!',
      choices:[
        {label:'📢 Announce on the PA system',hint:G.alloc.sound>=2?'Strong PA':'Weak speaker',best:G.alloc.sound>=2,
          run:()=>{if(G.alloc.sound>=2){toast('Within 4 minutes the child is reunited at the stage!','good');gainRep(4,'Found a child');return true}
          toast('The weak speaker can\'t be heard over the dhol...','bad');return false}},
        {label:'🔍 Volunteer search line',hint:`${G.volunteers} volunteers`,best:G.volunteers>=5,
          run:()=>{if(G.volunteers>=5){toast('The volunteer chain finds the kid at the modak stall!','good');gainRep(3,'');return true}
          toast('Too few volunteers — found after a scary 20 minutes.','');return 'half'}},
      ]},
    {icon:'🚗',name:'Traffic Gridlock!',text:'Visitors\' vehicles have jammed the entire junction. Ambulances can\'t pass!',
      choices:[
        {label:'👮 Volunteer traffic squad + diversion',hint:'Best with security',best:G.alloc.security>=2||security>=3,
          run:()=>{if(G.alloc.security>=2||security>=3){toast('Traffic flowing in 10 minutes. Police impressed.','good');gainRep(3,'');return true}
          toast('Volunteers try their best but the jam persists an hour.','');return 'half'}},
        {label:'📞 Call traffic police',hint:'They are busy...',best:false,
          run:()=>{toast('Police arrive after 40 minutes. Partial relief.','');return 'half'}},
      ]},
    {icon:'🔊',name:'Noise Complaint',text:'Mrs. Kulkarni from the society marches in: "It\'s 10:02 PM! The HIGH COURT says 10 PM cutoff!!"',
      choices:[
        {label:'🔉 Immediately lower volume, switch to aarti bells',hint:'Rep +, joy −2',best:true,
          run:()=>{gainRep(4,'Law-abiding mandal');G.satisfaction=clamp(G.satisfaction-2,0,100);
            toast('"Good. See? Culture AND discipline." She actually smiles.','good');return true}},
        {label:'🙏 Request 10 more minutes for the finale',hint:'Rep check',best:false,
          run:()=>{if(Math.random()<clamp(G.reputation/110,.2,.85)){gainRep(1,'');toast('She allows 10 minutes. The finale ends on time.','');return 'half'}
          gainRep(-6,'Police complaint filed');toast('She files a complaint. Police visit. Reputation hit.','bad');return false}},
      ]},
    {icon:'🏺',name:'Prasad Counter Crush!',text:'The free modak-prasad counter is being crushed by a sudden surge!',
      choices:[
        {label:'🚧 Open second counter + serpentine queue',hint:G.alloc.security>=1?'Barricades ready':'No barricades',best:G.alloc.security>=1,
          run:()=>{if(G.alloc.security>=1){toast('Two counters absorb the surge beautifully.','good');return true}
          toast('No barricades! Elders get pushed. Quick volunteers intervene.','bad');G.satisfaction=clamp(G.satisfaction-3,0,100);return false}},
        {label:'📣 Token system announcement',hint:'Slow but orderly',best:'half',
          run:()=>{toast('Tokens distributed — long but peaceful lines.','');return 'half'}},
      ]},
  ];
  if(G.weather==='rain')pool.push(
    {icon:'🌧️',name:'Rain Hits Mid-Program!',text:'A sudden downpour! The dance performance is on an open stage!',
      choices:[
        {label:'⛱️ Deploy tarps over stage & audience',hint:'₹1,000',best:G.alloc.infra>=2,
          run:()=>{gainMoney(-1000,'Tarps');
            if(G.alloc.infra>=2){toast('Reinforced tarps hold! Show goes on, crowd loves it.','good');gainRep(2,'');return true}
            toast('Tarps flap but hold. Show continues, some leaks.','');return 'half'}},
        {label:'🏃 Move everything under the canopy',hint:'Free, cramped',best:false,
          run:()=>{G.satisfaction=clamp(G.satisfaction-2,0,100);toast('Cramped but dry. Dancers improvise.','');return 'half'}},
      ]});
  return pick(pool);
}
function fireCrisis(){
  if(state!=='live')return;
  const c=crisisQueue.shift();if(!c)return;
  sfx('siren');dayEvents++;
  showDialog({avatar:c.icon,name:c.name,role:`⚠️ CRISIS · Evening of Day ${G.day}`,cls:'event-modal',
    text:c.text,timer:10,
    onTimeout:()=>{ // no decision
      closeDialog();G.satisfaction=clamp(G.satisfaction-8,0,100);G.stats.eventsFailed++;
      toast('⏰ Frozen indecision — the situation worsened! Joy −8','bad');sfx('bad');
      updateHUD();
    },
    choices:c.choices.map(ch=>({label:ch.label,hint:ch.hint,danger:ch.best===false,run:()=>{
      closeDialog();
      const r=ch.run();
      if(r===true){G.stats.eventsSolved++;G.satisfaction=clamp(G.satisfaction+3,0,100);}
      else if(r===false){G.stats.eventsFailed++;G.satisfaction=clamp(G.satisfaction-6,0,100);}
      updateHUD();
    }}))});
}

/* ---------- quick sim ---------- */
function quickSim(){
  banner('⚡ Quick-Simulating Festival Days...','The mandal runs on momentum',2000);
  let days=0;
  while(G.day<=FEST_END){
    rollWeather();
    const cost=Math.min(3000,G.money*.06);gainMoney(-cost,null);
    let revenue=1800*(0.8+G.satisfaction/200)*(G.alloc.sound>0?1.2:1);gainMoney(revenue,null);
    const turnout=expectedTurnout();
    const capacity=220+G.alloc.infra*60+G.alloc.security*40;
    let delta=(Math.random()*8-2)+(flowScore-55)*.05;
    if(turnout>capacity*1.5)delta-=5;
    if(G.weather==='rain')delta-=3;
    if(G.alloc.security>=2)delta+=2;
    const crises=randi(3);
    for(let i=0;i<crises;i++){
      const good=clamp(.35+G.reputation/220+G.alloc.security*.12,0,.9);
      if(Math.random()<good){G.stats.eventsSolved++;delta+=1;gainRep(.5,'');}
      else{G.stats.eventsFailed++;delta-=5;}
    }
    G.satisfaction=clamp(G.satisfaction+delta,5,100);
    G.festival.dayLogs.push({day:G.day,turnout,sat:Math.round(G.satisfaction)});
    nextDay(1);days++;
  }
  G.satisfaction=clamp(G.satisfaction,0,100);
  setTimeout(endFestival,2100);
}

/* ---------- live update / summary ---------- */
function update(dt){
  t+=dt;
  if(state==='live'&&!dialogOpen){
    liveT+=dt;
    G.tod=clamp(.55+liveT*.014,.55,.85);
    crisisTimer-=dt;
    if(crisisTimer<=0&&crisisQueue.length){fireCrisis();crisisTimer=rand(7,4.5);}
    if(liveT>26||(liveT>8&&crisisQueue.length===0))finishDay();
    Particles.petals(640,300,1);
  }
  Particles.update(dt);
}
function finishDay(){
  if(state!=='live')return;
  state='summary';Audio_.stopDhol();
  if(ui){ui.remove();ui=null}
  const turnout=liveVisitors;
  G.festival.dayLogs.push({day:G.day,turnout,sat:Math.round(G.satisfaction)});
  G.reputation=clamp(G.reputation+(G.satisfaction>70?1.5:.5),0,100);
  const dayNo=G.day-FEST_START+1;
  updateHUD();
  showDialog({avatar:'🌙',name:`Day ${G.day} Evening Complete`,role:`Festival day ${dayNo}/10`,
    text:`👥 Visitors: <b>${turnout}</b> · Crises handled: <b>${dayEvents}</b><br>
          Crowd joy: <b>${Math.round(G.satisfaction)}%</b> ${G.satisfaction>daySatStart?'📈':'📉'} · Flow score: ${Math.round(flowScore)}%<br><br>
          ${G.satisfaction>80?'The lane is buzzing — neighboring mandals are jealous!':G.satisfaction>60?'A solid, happy day at the mandal.':'People are muttering... tomorrow must be better.'}`,
    choices:[{label:G.day>=FEST_END?'🌊 Proceed to Visarjan →':'☀️ Plan next day →',run:()=>{
      closeDialog();
      if(G.day>=FEST_END){endFestival();return}
      nextDay(1);buildDay();
    }}]});
}
function endFestival(){
  // compute festival avg
  const logs=G.festival.dayLogs;
  const avg=logs.length?logs.reduce((s,l)=>s+l.sat,0)/logs.length:G.satisfaction;
  G.festival.avgSat=Math.round((avg+G.satisfaction)/2);
  G.day=30;rollWeather();
  setPhase('visarjan');
}
function onAction(){Audio_.init();}

/* ---------- draw (live evening scene) ---------- */
function draw(ctx,Wpx,Hpx){
  const fit=fitTransform(ctx,Wpx,Hpx);
  ctx.clearRect(-fit.ox,-fit.oy,Wpx,Hpx);
  drawSky(ctx,VW,VH,G.tod);
  if(G.weather==='cloudy'||G.weather==='rain')drawClouds(ctx,VW,VH,t,'rgba(120,125,140,.7)');
  drawBuildingSide(ctx,-20,240,220,360,'rgba(255,214,120,.3)',true);
  drawBuildingSide(ctx,1080,240,220,360,'rgba(255,214,120,.3)',true);
  ctx.fillStyle='#4c5a3a';ctx.fillRect(0,560,VW,160);
  ctx.fillStyle='#6e5e42';ctx.fillRect(0,640,VW,80);
  // full pandal
  const theme=G.theme||{c1:'#ff9933',c2:'#e11d48',c3:'#fbbf24'};
  drawPandal(ctx,640,640,430,330,1,{theme,t,lights:true,
    lightColors:G.lights?G.lights.colors:['#ffe08a'],
    idolTier:G.idol.eco?1:G.idol.tier,idolScale:G.idol.scale,eco:G.idol.eco});
  // food stall left
  ctx.fillStyle='#8a5a2a';roundRect(ctx,60,590,120,50,6);ctx.fill();
  ctx.fillStyle='#dc2626';ctx.beginPath();ctx.moveTo(50,590);ctx.lineTo(120,560);ctx.lineTo(190,590);ctx.fill();
  ctx.font='18px Segoe UI';ctx.textAlign='center';ctx.fillText('🍛',120,620);
  // stage performance if dance/music chosen
  if(state==='live'&&(chosen.includes('dance')||chosen.includes('dj'))){
    for(let i=0;i<3;i++){
      drawPersonSide(ctx,580+i*40,600,{scale:.7,color:pick(['#e11d48','#f59e0b','#7c3aed']),walk:t*5+i*2});
    }
  }
  if(chosen.includes('modak'))ctx.font='20px Segoe UI',ctx.fillText('🥟',700,600+Math.sin(t*3)*4);
  // crowd (silhouettes bobbing in front)
  const n=state==='live'?Math.min(34,Math.floor(liveVisitors/8)):14;
  for(let i=0;i<n;i++){
    const cx=90+((i*137)%1100),bounce=Math.sin(t*4+i*1.7)*3;
    drawPersonSide(ctx,cx,706+bounce,{scale:.9+(i%4)*.06,color:['#e11d48','#f59e0b','#16a34a','#0891b2','#7c3aed','#be185d'][i%6],walk:t+i});
  }
  // barricade line reflecting flow score
  if(flowScore>50){
    ctx.fillStyle='#b45309';
    for(let i=0;i<8;i++){roundRect(ctx,320+i*82,676,60,10,3);ctx.fill();}
  }
  // aarti glow at evening
  if(G.tod>.7){drawDiyas(ctx,330,652,5,t);drawDiyas(ctx,880,652,5,t);
    ctx.save();const g=ctx.createRadialGradient(640,470,20,640,470,220);
    g.addColorStop(0,'rgba(255,180,60,.25)');g.addColorStop(1,'rgba(255,180,60,0)');
    ctx.fillStyle=g;ctx.fillRect(400,250,480,440);ctx.restore();}
  if(G.weather==='rain')drawRain(ctx,VW,VH,t,.8);
  nightTint(ctx,VW,VH,G.tod,.3);
  Particles.draw(ctx,null);
  if(state!=='live'){
    ctx.setTransform(1,0,0,1,0,0);
  }
}
return {enter,exit,update,draw,onAction};
})();
