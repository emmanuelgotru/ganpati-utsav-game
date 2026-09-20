/* ================= phase4.js — Agaman (Idol Arrival Procession) ================= */
'use strict';
PHASES.agaman=(()=>{
let state='select',t=0,route=null,pos=0,energy=60,dist=100;
let cooldowns={dhol:0,fire:0,flag:0,chant:0};
let fireworks=[],hazard=null,hazardTimer=0,crowdSeed=[];
let cerT=0,idolY=0,ui=null,ended=false;

const ROUTES=[
  {id:'main',name:'Main Road',icon:'🛣️',len:100,risk:0,crowd:1.0,
   desc:'Wide & safe, but the longest route. Big crowds both sides, police escort easy.'},
  {id:'market',name:'Market Lane',icon:'🏪',len:68,risk:2,crowd:1.3,
   desc:'Shortest & densest crowd energy! But narrow — overhead wires and shop awnings are a real risk.'},
  {id:'river',name:'Riverside Road',icon:'🌅',len:84,risk:.6,crowd:.95,bonusSat:4,
   desc:'Scenic route past the ghat. Calm crowd, beautiful photos, slight satisfaction bonus.'},
];

function enter(){
  state='select';t=0;energy=60;pos=0;fireworks=[];hazard=null;ended=false;
  G.tod=.62; // evening arrival
  banner('Phase 4 — Agaman','Day 19 · The idol leaves the workshop. Bappa is coming home!',3200);
  showRouteSelect();
}
function exit(){Audio_.stopDhol();if(ui){ui.remove();ui=null}}

function showRouteSelect(){
  const p=$('#panel');p.classList.remove('hidden');
  p.innerHTML=`<div class="sheet"><h2>🗺️ Map the Procession Route</h2>
    <div class="sub">From the idol workshop to your pandal. Traffic police want your plan NOW.</div>
    <div class="grid-cards">${ROUTES.map(r=>`
      <div class="card diff-card" data-id="${r.id}">
        <h3>${r.icon} ${r.name}</h3><div class="desc">${r.desc}</div>
        <div class="row" style="font-size:.75rem;color:#7a6a55">
          <span>📏 ${r.len}%</span><span>⚠️ Risk ${r.risk===0?'None':r.risk<1?'Low':'HIGH'}</span><span>🔥 Crowd ×${r.crowd}</span>
        </div>
        <button class="btn mt" style="width:100%">Choose Route</button>
      </div>`).join('')}</div></div>`;
  p.querySelectorAll('.diff-card').forEach(c=>c.onclick=()=>{
    route=ROUTES.find(r=>r.id===c.dataset.id);dist=route.len;
    sfx('conch');p.classList.add('hidden');startProcession();
  });
}

function startProcession(){
  state='procession';pos=0;energy=60;
  crowdSeed=[];for(let i=0;i<90;i++)crowdSeed.push({o:rand(4000),s:rand(1.1,.6),c:pick(['#e11d48','#f59e0b','#16a34a','#0891b2','#7c3aed','#be185d','#334155']),side:i%2,y:rand(14)});
  Audio_.startDhol(150);
  buildProcUI();
}
function buildProcUI(){
  ui=el('div','');
  ui.style.cssText='position:absolute;left:50%;transform:translateX(-50%);bottom:12px;z-index:30;display:flex;gap:8px;background:rgba(15,10,30,.85);border:1px solid rgba(255,180,80,.4);border-radius:16px;padding:10px 14px';
  ui.innerHTML=`
    <div style="min-width:200px;color:#ffe9c9">
      <div style="font-size:.68rem;letter-spacing:.1em;opacity:.75">CROWD ENERGY</div>
      <div class="bar" style="margin-top:4px"><div class="bar-fill" id="pEnergy" style="width:60%"></div></div>
      <div class="bar" style="margin-top:4px;height:8px"><div class="bar-fill blue" id="pDist" style="width:0%"></div></div>
    </div>
    <button class="btn" id="bDhol">🥁 Dhol<br><span class="cd" id="cdDhol"></span></button>
    <button class="btn" id="bFire">🎆 Fireworks<br><span class="cd" id="cdFire"></span></button>
    <button class="btn" id="bFlag">🚩 Flags<br><span class="cd" id="cdFlag"></span></button>
    <button class="btn" id="bChant">📣 Chant<br><span class="cd" id="cdChant"></span></button>`;
  $('#game').appendChild(ui);
  $('#bDhol').onclick=()=>act('dhol');
  $('#bFire').onclick=()=>act('fire');
  $('#bFlag').onclick=()=>act('flag');
  $('#bChant').onclick=()=>act('chant');
}
function act(a){
  if(state!=='procession'||cooldowns[a]>0)return;
  Audio_.init();
  if(a==='dhol'){sfx('dholNa');setTimeout(()=>sfx('dholTin'),140);energy+=9;cooldowns.dhol=1.1;
    Particles.floatText(640,400,'🥁 DHAA-DHIN!','#fbbf24');}
  if(a==='fire'){if(G.money<300){toast('Not enough money for fireworks (₹300)','bad');return}
    gainMoney(-300,null);sfx('firework');energy+=16;cooldowns.fire=4;
    fireworks.push({x:rand(1000,280),y:rand(220,90),t0:t});}
  if(a==='flag'){if(G.volunteers<3){toast('Need 3+ volunteers to distribute flags','bad');return}
    sfx('crowd');energy+=12;cooldowns.flag=3;
    Particles.floatText(640,400,'🚩 Tricolor flags everywhere!','#86efac');}
  if(a==='chant'){sfx('crowd');energy+=7;cooldowns.chant=2;
    Particles.floatText(640,380,'GANPATI BAPPA MORYA!','#fff');
    if(Math.random()<.35)gainRep(1,'Chant leader');}
  energy=clamp(energy,0,100);
  refreshProc();
}
function refreshProc(){
  const e=$('#pEnergy');if(!e)return;
  e.style.width=energy+'%';
  e.style.background=energy>60?'linear-gradient(90deg,#34c462,#8ef0a5)':energy>30?'':'linear-gradient(90deg,#dc2626,#fca5a5)';
  $('#pDist').style.width=(pos/dist*100)+'%';
  for(const k of ['dhol','fire','flag','chant']){
    const c=$('#cd'+k[0].toUpperCase()+k.slice(1));
    if(c)c.textContent=cooldowns[k]>0?cooldowns[k].toFixed(1)+'s':'';
  }
}

function update(dt){
  t+=dt;
  if(state==='procession'){
    for(const k in cooldowns)cooldowns[k]=Math.max(0,cooldowns[k]-dt);
    pos+=dt*(11+(energy-50)*.06)*(route.id==='market'?1.15:1);
    energy=clamp(energy-dt*(3.4*(2-route.crowd*.7)),0,100);
    G.tod=clamp(.62+pos/dist*.14,.6,.82);
    // hazards on risky routes
    if(!hazard&&route.risk>0&&Math.random()<route.risk*dt*.05&&pos>dist*.15&&pos<dist*.85){
      hazard={type:pick(['wire','awning']),timer:3.2};
      sfx('siren');
    }
    if(hazard){
      hazard.timer-=dt;
      if(hazard.timer<=0){ // failed
        energy=clamp(energy-22,0,100);sfx('bad');
        Particles.floatText(640,380,'💥 Scraped! Crowd gasps...','#fca5a5');
        G.construction.durability=clamp(G.construction.durability-2,0,100);
        toast(hazard.type==='wire'?'The idol\'s crown scraped an overhead wire!':'The truck clipped a shop awning!','bad');
        hazard=null;
      }
    }
    if(pos>=dist){state='ceremony';cerT=0;hazard=null;Audio_.stopDhol();
      if(ui){ui.remove();ui=null}
      setTimeout(()=>sfx('conch'),300);}
    refreshProc();
    if(Math.random()<dt*1.5)fireworks.push({x:rand(1100,180),y:rand(200,80),t0:t});
  }
  if(state==='ceremony'){
    cerT+=dt;
    G.tod=clamp(.76+cerT*.01,.76,.9);
    idolY=clamp(cerT*.5,0,1);
    if(Math.random()<dt*2.5)fireworks.push({x:rand(1150,130),y:rand(240,80),t0:t});
    if(cerT>1.5&&!ended){ended=true;
      const avgE=energy;
      G.processionBest=Math.round(avgE);
      if(avgE>70){gainRep(6,'Electric procession!');G.satisfaction=clamp(G.satisfaction+8,0,100);}
      else if(avgE>45){gainRep(3,'Good procession');G.satisfaction=clamp(G.satisfaction+4,0,100);}
      else{G.satisfaction=clamp(G.satisfaction-3,0,100);toast('The crowd fizzled out a bit...','bad');}
      if(route.bonusSat)G.satisfaction=clamp(G.satisfaction+route.bonusSat,0,100);
      setTimeout(()=>showDialog({avatar:'🐘',name:'Bappa Has Arrived!',role:'Installation complete · Day 19',
        text:`The idol is installed on the stage — the aarti flames rise, conches blow, and the whole lane chants as one.<br><br>
          <b>Final crowd energy: ${Math.round(avgE)}%</b> ${avgE>70?'🔥 ELECTRIC!':avgE>45?'👏 Great!':'😅 Okay.'}<br>
          Tomorrow begins the <b>10-day Utsav</b> — aartis, programs, crowds and chaos.`,
        choices:[{label:'🪔 Begin the Utsav →',run:()=>{closeDialog();G.day=20;rollWeather();setPhase('utsav');}}]}),2400);
    }
  }
  Particles.update(dt);
}
function onAction(){
  Audio_.init();
  if(state==='procession'){
    if(hazard){ // duck!
      sfx('good');energy=clamp(energy+4,0,100);
      Particles.floatText(640,380,'😮 Ducked just in time!','#8ef0a5');
      G.stats.eventsSolved++;hazard=null;refreshProc();
    } else act('dhol');
  }
}

/* ---------- draw ---------- */
function draw(ctx,Wpx,Hpx){
  const fit=fitTransform(ctx,Wpx,Hpx);
  ctx.clearRect(-fit.ox,-fit.oy,Wpx,Hpx);
  drawSky(ctx,VW,VH,G.tod);
  if(state==='select'){
    // idle workshop backdrop
    drawBuildingSide(ctx,0,250,260,350,'rgba(255,214,120,.2)',true);
    drawBuildingSide(ctx,1020,250,260,350,'rgba(255,214,120,.2)',true);
    ctx.fillStyle='#3a3050';ctx.fillRect(0,600,VW,120);
    drawGanesha(ctx,640,600,1.5,{tier:G.idol.tier,eco:G.idol.eco,t});
    drawDiyas(ctx,420,640,8,t);
    nightTint(ctx,VW,VH,G.tod,.3);
    return;
  }
  if(state==='procession'){
    const scroll=pos*26;
    // far buildings parallax
    for(let i=0;i<7;i++){
      const bx=((i*420-scroll*.4)%2600+2600)%2600-500;
      drawBuildingSide(ctx,bx,230+((i*37)%80),240,370-((i*37)%80),'rgba(255,214,120,.25)',true);
    }
    // road
    ctx.fillStyle='#42404f';ctx.fillRect(0,560,VW,160);
    ctx.strokeStyle='rgba(255,220,120,.4)';ctx.lineWidth=3;ctx.setLineDash([20,16]);
    ctx.beginPath();ctx.moveTo(0,640);ctx.lineTo(VW,640);ctx.stroke();ctx.setLineDash([]);
    // crowd behind (top side) & front (bottom)
    for(const c of crowdSeed){
      const cx=((c.o-scroll*1.05)%3800+3800)%3800-400;
      if(cx<-60||cx>VW+60)continue;
      const bounce=Math.sin(t*8+c.o)*3*(energy/60);
      if(c.side){
        drawPersonSide(ctx,cx,548+bounce*.3,{scale:c.s,color:c.c,walk:t*2+c.o});
        if(energy>55&&c.o%5<1){ctx.font='11px Segoe UI';ctx.textAlign='center';
          ctx.fillStyle='#ffe9c9';ctx.fillText(pick(['🙌','🌸','🚩']),cx,548-52+bounce);}
      }else{
        drawPersonSide(ctx,cx,714+bounce*.3,{scale:c.s*1.1,color:c.c,walk:t*2+c.o+2});
      }
    }
    // hazard warning
    if(hazard){
      const hy=hazard.type==='wire'?430:470;
      ctx.strokeStyle='#fbbf24';ctx.lineWidth=4;
      if(hazard.type==='wire'){
        ctx.beginPath();ctx.moveTo(900,hy-60);ctx.quadraticCurveTo(1000,hy,1150,hy-60);ctx.stroke();
        ctx.font='900 26px Segoe UI';ctx.textAlign='center';ctx.fillStyle='#fca5a5';
        ctx.fillText('⚠️ OVERHEAD WIRE — PRESS E / TAP 🙏 TO DUCK!',640,300+Math.sin(t*12)*4);
      }else{
        ctx.fillStyle='#8a5a2a';ctx.fillRect(950,hy,260,16);
        ctx.font='900 26px Segoe UI';ctx.textAlign='center';ctx.fillStyle='#fca5a5';
        ctx.fillText('⚠️ SHOP AWNING AHEAD — PRESS E / TAP 🙏 TO DUCK!',640,300+Math.sin(t*12)*4);
      }
      ctx.fillStyle='rgba(15,10,30,.7)';roundRect(ctx,540,310,200,10,5);ctx.fill();
      ctx.fillStyle='#dc2626';roundRect(ctx,540,310,200*clamp(hazard.timer/3.2,0,1),10,5);ctx.fill();
    }
    // the truck with idol (fixed center)
    const bounce=Math.sin(t*7)*1.5;
    drawTruckSide(ctx,430,620,1.15,'#1e6fb8');
    // decorated flatbed
    drawMarigoldGarland(ctx,340,592+bounce,530,592+bounce,12,t);
    drawGanesha(ctx,395,585+bounce,.85,{tier:G.idol.tier,eco:G.idol.eco,t});
    // dhol players walking beside
    drawDholPlayer(ctx,250,650,.9,t);
    drawDholPlayer(ctx,620,660,.9,t+1.3);
    // volunteers human chain
    for(let i=0;i<Math.min(G.volunteers,10);i++){
      drawPersonSide(ctx,700+i*34-scroll%34,672,{scale:.8,color:i%2?'#ff9933':'#16a34a',walk:t*3+i});
    }
    // flags/bunting across the street
    drawBunting(ctx,0,240,VW,t);
    // fireworks
    fireworks=fireworks.filter(f=>drawFirework(ctx,f.x,f.y,f.t0,t));
    nightTint(ctx,VW,VH,G.tod,.25);
    Particles.draw(ctx,null);
    return;
  }
  if(state==='ceremony'){
    // pandal front, idol being installed
    drawBuildingSide(ctx,0,280,200,320,'rgba(255,214,120,.2)',true);
    drawBuildingSide(ctx,1080,280,200,320,'rgba(255,214,120,.2)',true);
    ctx.fillStyle='#5e7a46';ctx.fillRect(0,560,VW,160);
    ctx.fillStyle='#8a7455';ctx.fillRect(0,650,VW,70);
    const theme=G.theme||{c1:'#ff9933',c2:'#e11d48',c3:'#fbbf24'};
    const installed=cerT>=2.4;
    drawPandal(ctx,640,650,420,320,1,{theme,t,lights:true,lightColors:G.lights?G.lights.colors:['#ffe08a'],
      idolTier:installed?(G.idol.eco?1:G.idol.tier||2):null,idolScale:G.idol.scale||1,eco:G.idol.eco});
    // crowd silhouettes watching
    for(let i=0;i<26;i++){
      const cx=40+i*48,bounce=Math.sin(t*6+i)*2;
      drawPersonSide(ctx,cx,712+bounce,{scale:.85+((i%3)*.08),color:crowdSeed[i]?crowdSeed[i].c:'#334155',walk:t+i});
    }
    // idol rising onto stage
    if(!installed){
      const k=clamp(cerT/2.4,0,1);
      const ix=lerp(250,640,k),iy=lerp(620,598,k*k);
      drawGanesha(ctx,ix,iy,.9,{tier:G.idol.tier,eco:G.idol.eco,t});
      // carriers
      for(const dx of[-34,34])drawPersonSide(ctx,ix+dx,iy+18,{scale:.85,color:'#ff9933',walk:t*4});
      if(k>=1&&!ceremonialDone){ceremonialDone=true;sfx('bell');
        Particles.petals(640,430,40);Particles.confetti(640,300,50);
        Particles.floatText(640,340,'🙏 BAPPA INSTALLED! 🙏','#fbbf24');}
    }
    // aarti flames + diyas
    drawDiyas(ctx,300,678,5,t);drawDiyas(ctx,860,678,5,t);
    fireworks=fireworks.filter(f=>drawFirework(ctx,f.x,f.y,f.t0,t));
    nightTint(ctx,VW,VH,G.tod,.2);
    Particles.draw(ctx,null);
    if(cerT>1){
      ctx.font='900 30px Segoe UI';ctx.textAlign='center';
      ctx.fillStyle='#fbbf24';ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=5;
      const a=clamp((cerT-1)/.8,0,1);ctx.globalAlpha=a;
      ctx.strokeText('गणपती बाप्पा मोरया!',640,180);
      ctx.fillText('गणपती बाप्पा मोरया!',640,180);
      ctx.globalAlpha=1;
    }
  }
}
let ceremonialDone=false;
const _enter=enter;
enter=function(){ceremonialDone=false;_enter();};
return {enter,exit,update,draw,onAction};
})();
