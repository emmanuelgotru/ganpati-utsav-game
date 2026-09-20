/* ================= phase1.js — Chanda (Donation) Collection ================= */
'use strict';
PHASES.donation=(()=>{
const W=1900,H=1400;
let player,trail,npcs,passers,cam,t=0,dayCollected=0,phaseDone=false,endBtn=null,receiptNo=100;
let nearNpc=null,tilakGlow=0;

function buildWorld(){
  npcs=NPC_ROSTER.map((n,i)=>({...n,
    skin:SKIN_TONES[i%SKIN_TONES.length],hair:i%3?'#241a12':'#3b3b3b',
    donated:false,dir:rand(TAU),walk:rand(10),bob:rand(TAU),
    homeX:n.x,homeY:n.y,wanderT:rand(3)}));
  passers=[];
  for(let i=0;i<7;i++){
    passers.push({x:rand(1700,200),y:pick([430,520,930,1020]),dir:Math.random()<.5?0:Math.PI,
      speed:rand(70,40),skin:pick(SKIN_TONES),shirt:pick(['#0891b2','#7c3aed','#16a34a','#e11d48','#b45309']),
      walk:rand(10),gaveToday:false});
  }
  player={x:950,y:1210,dir:0,walk:0,speed:240};
  trail=[];for(let i=0;i<400;i++)trail.push({x:player.x,y:player.y});
  cam={x:0,y:0};
}

function auspicious(n){return Math.max(101,Math.round(n/100)*100+1)}

/* ---------- dialogue tree ---------- */
function talkTo(npc){
  const A=ARCHETYPES[npc.arch];
  if(A.minRep&&G.reputation<A.minRep){
    showDialog({avatar:A.icon,name:npc.name,role:A.label,
      text:`"${npc.arch==='big'?'I only trust established mandals. Come back when your reputation in the neighborhood grows."':'Hmm, I don\'t know your mandal well enough yet."'}`,
      choices:[{label:'🙏 Respectfully take leave',hint:`Needs Rep ${A.minRep}`,run:()=>{closeDialog();gainRep(1,'Politeness noticed');}}]});
    return;
  }
  const greet=pick(A.greet);
  showDialog({avatar:A.icon,name:npc.name,role:A.label,text:greet,choices:[
    {label:'🙏 Namaste + warm traditional pitch',hint:'Polite',run:()=>pitch(npc,A,'polite')},
    {label:'📋 Straight talk: dates, budget & QR code',hint:'Direct',run:()=>pitch(npc,A,'direct')},
    {label:'❤️ Emotional appeal: community & Bappa\'s blessings',hint:'Risky',run:()=>pitch(npc,A,'emotion')},
  ]});
}
function pitch(npc,A,style){
  // response multipliers per archetype
  const M={
    elder:{polite:1.15,direct:.9,emotion:1.3},
    shop:{polite:1.0,direct:1.15,emotion:.8},
    pro:{polite:.95,direct:1.25,emotion:.6},
    youth:{polite:1.1,direct:.9,emotion:1.2},
    skeptic:{polite:1.0,direct:.9,emotion:.65},
    big:{polite:1.15,direct:1.05,emotion:1.1},
  };
  const R={ // reputation effects
    elder:{polite:2,direct:0,emotion:2},shop:{polite:1,direct:1,emotion:0},
    pro:{polite:1,direct:2,emotion:-1},youth:{polite:1,direct:0,emotion:1},
    skeptic:{polite:3,direct:1,emotion:-1},big:{polite:2,direct:1,emotion:1},
  };
  const mult=M[npc.arch][style]*(1+G.reputation/220)*DIFF[G.difficulty].npcRep;
  let amount=auspicious(rand(A.base[1],A.base[0])*mult);
  let rep=A.warm>.9?1:0;
  if(npc.arch==='skeptic')amount=auspicious(amount*.6);
  const react={
    polite:{elder:'They smile warmly and bless you.',shop:'"Good manners! I like that."',pro:'"Okay, you have my attention."',youth:'"Respect! Count me in!"',skeptic:'"...At least you\'re polite. Fine."',big:'"Well spoken. Tradition lives in words like yours."'},
    direct:{elder:'"So business-like these days... but honest."',shop:'"Now you\'re talking my language!"',pro:'"Perfect. Quick and clear — I respect that."',youth:'"Bro just send the QR already!"',skeptic:'"Hmm. At least the accounts question was answered."',big:'"Efficient. Good — time is money, but this is dharma."'},
    emotion:{elder:'Their eyes mist over remembering old festivals.',shop:'"Emotional damage... okay okay, I feel it too."',pro:'"I... uh... *checks watch* ...fine, you got me a little."',youth:'"GOOSEBUMPS! Bappa Morya!!"',skeptic:'"This is exactly the drama I was worried about."',big:'"Tradition must be felt, not just funded. Well said."'},
  }[style][npc.arch];

  showDialog({avatar:A.icon,name:npc.name,role:A.label,
    text:`${react}<br><br>They count some cash from the household tin...`,
    choices:[
      {label:'🙏 Accept gratefully & write receipt',hint:`${fmt(amount)}`,run:()=>accept(npc,amount,R[npc.arch][style],false)},
      {label:'🤝 "Could you consider a little more for Bappa?"',hint:`Rep check · ~+40%`,danger:npc.arch==='skeptic',
        run:()=>{
          const chance=clamp(.25+G.reputation/160+A.patience*.1,0,.85);
          if(Math.random()<chance){
            const extra=auspicious(amount*.45);
            showDialog({avatar:A.icon,name:npc.name,role:A.label,
              text:`${A.push}<br><br>They add <b>${fmt(extra)}</b> more!`,
              choices:[{label:'🧾 Write receipt & bless them',hint:`Total ${fmt(amount+extra)}`,run:()=>accept(npc,amount+extra,R[npc.arch][style]+2,true)}]});
          }else{
            const less=Math.round(amount*.65);
            showDialog({avatar:A.icon,name:npc.name,role:A.label,
              text:`Their face falls. <i>"I thought you were different..."</i> They hand over only <b>${fmt(less)}</b>.`,
              choices:[{label:'😔 Apologize & accept humbly',hint:'Rep −4',danger:true,run:()=>accept(npc,less,R[npc.arch][style]-4,false)}]});
          }
        }},
      {label:'🕉️ "Join us for aarti & seva this year!"',hint:'Rep +3',run:()=>{
        showDialog({avatar:A.icon,name:npc.name,role:A.label,
          text:npc.arch==='skeptic'
            ?`"<i>Seva?</i> Hmph... maybe I will come one evening. To supervise."<br><br>They still donate <b>${fmt(amount)}</b>.`
            :`"Seva? Count me in!" Their whole face lights up. They donate <b>${fmt(Math.round(amount*1.15))}</b> and promise to visit the pandal daily.`,
          choices:[{label:'🧾 Write receipt',hint:`${npc.arch==='skeptic'?'':''}`,run:()=>accept(npc,Math.round(npc.arch==='skeptic'?amount:amount*1.15),R[npc.arch][style]+3,npc.arch!=='skeptic')}]});
      }},
    ]});
}
function accept(npc,amount,rep,joined){
  closeDialog();
  npc.donated=true;
  G.stats.donations++;G.stats.npcsHelped++;
  gainMoney(amount,null);dayCollected+=amount;G.chandaCollected+=amount;
  gainRep(rep*(rep>0?1:1),null);
  receiptNo++;
  Particles.coins(npc.x,npc.y-20,10);
  Particles.floatText(npc.x,npc.y-46,`+${fmt(amount)}`,'#8ef0a5');
  Particles.petals(npc.x,npc.y-10,6);
  sfx('coin');
  toast(`🧾 Receipt #${receiptNo} written — ${npc.name}: ${fmt(amount)}`,'good');
  if(joined&&npc.arch==='youth'&&Math.random()<.7){
    G.volunteers++;toast(`👥 ${npc.name.split(' ')[0]} joined as volunteer!`,'good');updateHUD();
  }
  if(G.reputation>0&&Math.random()<(npc.arch==='elder'?.6:.25)){
    tilakGlow=1.2;gainRep(1,null);
    Particles.floatText(player.x,player.y-60,'🔴 Tilak applied! +1 Rep','#fca5a5');
  }
  checkAllDone();
}

function talkToPasser(p){
  const amt=auspicious(rand(101,21));
  showDialog({avatar:'🚶',name:'Passer-by',role:'Neighborhood resident',
    text:`"Arre, the chanda squad! I only have some change... here, take <b>${fmt(amt)}</b> for Bappa."`,
    choices:[{label:'🧾 Thank them & write receipt',run:()=>{
      closeDialog();p.gaveToday=true;dayCollected+=amt;G.chandaCollected+=amt;G.stats.donations++;
      gainMoney(amt,null);Particles.coins(p.x,p.y-20,4);sfx('coin');
    }}]});
}

function checkAllDone(){
  if(npcs.every(n=>n.donated))finishPhase('Every door in the neighborhood has opened its heart!');
}
function finishPhase(reason){
  if(phaseDone)return;phaseDone=true;
  setTimeout(()=>{
    showDialog({avatar:'🪙',name:'Chanda Collection Complete!',role:`Day ${G.day} · ${reason}`,
      text:`<b>Total collected: ${fmt(G.chandaCollected)}</b><br>
            Reputation: ${Math.round(G.reputation)} · Volunteers: ${G.volunteers}<br><br>
            The treasury is ready. Time to plan the pandal, buy materials and hire the crew!`,
      choices:[{label:'📋 Proceed to Planning & Procurement →',run:()=>{
        closeDialog();G.day=7;rollWeather();setPhase('planning');}}]});
  },700);
}

/* ---------- enter / exit ---------- */
function enter(){
  buildWorld();t=0;dayCollected=0;phaseDone=false;receiptNo=100;tilakGlow=0;
  G.tod=.4;
  banner('Phase 1 — Chanda Collection','Days 1–6 · Door-to-door with your volunteer squad',3200);
  endBtn=el('button','btn','🌙 End Day (N)');
  endBtn.style.cssText='position:absolute;right:16px;bottom:16px;z-index:30';
  endBtn.onclick=endDay;
  $('#game').appendChild(endBtn);
  const hint=el('div','',`<b>WASD / Joystick</b> to walk · <b>E / 🙏</b> to talk · Collect chanda before Day 6 ends`);
  hint.id='p1hint';
  hint.style.cssText='position:absolute;left:50%;transform:translateX(-50%);bottom:14px;z-index:30;background:rgba(15,10,30,.8);color:#ffe9c9;border:1px solid rgba(255,180,80,.4);border-radius:10px;padding:7px 14px;font-size:.8rem;pointer-events:none';
  $('#game').appendChild(hint);
  updateHUD();
}
function exit(){
  if(endBtn){endBtn.remove();endBtn=null}
  const h=$('#p1hint');if(h)h.remove();
  $('#prompt').classList.add('hidden');
}
function endDay(){
  if(phaseDone)return;
  const goal=G.chandaGoalTotal/6;
  if(dayCollected>=goal){gainRep(5,'Daily chanda goal met!');toast(`🎯 Daily goal met! +5 Rep`,'good');}
  dayCollected=0;
  passers.forEach(p=>p.gaveToday=false);
  if(G.day>=6){finishPhase('Day 6 is over — the collection window has closed.');return;}
  nextDay(1);
  G.tod=.4;
  banner(`Day ${G.day}`,`${weatherInfo().icon} ${weatherInfo().name} · Daily goal: ${fmt(G.chandaGoalTotal/6)}`,1800);
}

/* ---------- update ---------- */
function update(dt){
  t+=dt;tilakGlow=Math.max(0,tilakGlow-dt);
  if(!dialogOpen&&!phaseDone){
    Input.poll();
    const mx=Input.moveX,my=Input.moveY;
    if(mx||my){
      player.dir=Math.atan2(my,mx);
      player.walk+=dt*(Math.hypot(mx,my)>0?1:0);
      player.x=clamp(player.x+mx*player.speed*dt,30,W-30);
      player.y=clamp(player.y+my*player.speed*dt,30,H-30);
    }
  }
  // trail for volunteers
  trail.unshift({x:player.x,y:player.y});
  if(trail.length>500)trail.pop();
  // npc idle wander
  for(const n of npcs){
    n.bob+=dt;n.wanderT-=dt;
    if(n.wanderT<=0){n.wanderT=rand(4,1.5);n.tx=n.homeX+rand(70,-70);n.ty=n.homeY+rand(70,-70);}
    if(n.tx!=null&&!dialogOpen){
      const d=dist(n,{x:n.tx,y:n.ty});
      if(d>6){const sp=34*dt;n.x+=(n.tx-n.x)/d*sp;n.y+=(n.ty-n.y)/d*sp;n.walk+=dt;n.dir=Math.atan2(n.ty-n.y,n.tx-n.x);}
    }
  }
  // passers walk along roads
  for(const p of passers){
    p.x+=Math.cos(p.dir)*p.speed*dt;p.walk+=dt;
    if(p.x<100||p.x>W-100)p.dir=Math.PI-p.dir;
  }
  // nearest interactable
  nearNpc=null;
  let best=78;
  for(const n of npcs){if(!n.donated){const d=dist(n,player);if(d<best){best=d;nearNpc=n;}}}
  if(!nearNpc)for(const p of passers){if(!p.gaveToday){const d=dist(p,player);if(d<70&&d<best){best=d;nearNpc=p;nearNpc._isPasser=true;}}}
  const pr=$('#prompt');
  if(nearNpc&&!dialogOpen&&!phaseDone){
    pr.classList.remove('hidden');
    $('#promptText').textContent=nearNpc._isPasser?'Thank the passer-by':`Talk to ${nearNpc.name.split('(')[0]}`;
  }else pr.classList.add('hidden');
  // camera
  const cw=innerWidth,ch=innerHeight;
  cam.x=clamp(player.x-cw/2,0,Math.max(0,W-cw));
  cam.y=clamp(player.y-ch/2,0,Math.max(0,H-ch));
  if(cw>=W)cam.x=(W-cw)/2;
  if(ch>=H)cam.y=(H-ch)/2;
  Particles.update(dt);
}
function onAction(){
  if(dialogOpen||phaseDone)return;
  Audio_.init();
  if(nearNpc){
    if(nearNpc._isPasser)talkToPasser(nearNpc);
    else{sfx('bell');talkTo(nearNpc);}
  }
}

/* ---------- draw ---------- */
function draw(ctx,Wpx,Hpx){
  const tod=G.tod;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  // sky strip at top when camera near top
  drawSky(ctx,Wpx,Hpx,tod);
  ctx.save();ctx.translate(-cam.x,-cam.y);
  // ground
  ctx.fillStyle='#7aa55c';ctx.fillRect(0,0,W,H);
  // subtle grass texture
  ctx.fillStyle='rgba(255,255,255,.04)';
  for(let gx=0;gx<W;gx+=90)for(let gy=0;gy<H;gy+=90)if((gx+gy)%180===0)ctx.fillRect(gx,gy,45,45);
  // roads
  drawRoadH(ctx,0,440,W,100);
  drawRoadH(ctx,0,930,W,100);
  drawRoadV(ctx,900,0,100,H);
  // rangoli at intersection
  drawRangoli(ctx,950,980,36,t);
  drawRangoli(ctx,950,490,30,t);

  // --- buildings (top block) ---
  drawShopTop(ctx,620,300,180,110,'KIRANA STORE','#0f766e');
  drawShopTop(ctx,1150,180,190,110,'ELECTRONICS','#1d4ed8');
  drawHouseTop(ctx,220,180,200,130,{wall:'#e8dcc8',roof:'#a16207'});
  drawHouseTop(ctx,1520,180,210,140,{wall:'#e8dcc8',roof:'#be185d'});
  drawHouseTop(ctx,380,620,180,120,{wall:'#efe3cd',roof:'#7c3aed'});
  drawHouseTop(ctx,1560,600,200,140,{wall:'#e8dcc8',roof:'#0891b2'});
  drawHouseTop(ctx,1050,1080,190,120,{wall:'#efe3cd',roof:'#57534e'});
  drawHouseTop(ctx,200,900,170,120,{wall:'#e8dcc8',roof:'#b45309'});
  drawHouseTop(ctx,1580,1050,200,140,{wall:'#f5e9d3',roof:'#7c2d12'});
  // temple (top-right of vertical road)
  drawTemple(ctx,1010,240);
  // trees
  const trees=[[140,300],[560,200],[860,320],[1400,420],[1820,600],[140,700],[560,800],[820,850],
    [1350,900],[1800,1250],[500,1250],[240,1220],[1300,300],[620,560],[1160,650],[760,1050]];
  for(const [tx,ty] of trees)drawTreeTop(ctx,tx,ty,rand===null?26:26);
  // mandal plot (bottom center-left of vertical road)
  drawPlot(ctx,700,1090);
  // parked autos for flavor
  drawAutoTop(ctx,1230,955);drawAutoTop(ctx,640,470);

  // --- passers ---
  for(const p of passers){
    drawPersonTop(ctx,p.x,p.y,{color:p.shirt,skin:p.skin,dir:p.dir,walk:p.walk});
    if(!p.gaveToday){ctx.font='12px Segoe UI';ctx.textAlign='center';ctx.fillText('🚶',p.x,p.y-26);}
  }
  // --- volunteers following ---
  const vn=Math.min(G.volunteers-1,8);
  for(let i=vn-1;i>=0;i--){
    const idx=Math.min(trail.length-1,(i+1)*22);
    const pt=trail[idx];
    const c=['#f59e0b','#16a34a','#0891b2','#e11d48','#7c3aed','#65a30d','#be185d','#334155'][i%8];
    drawPersonTop(ctx,pt.x,pt.y,{color:c,walk:t*2+i,dir:player.dir,scale:.92});
    if(i===0){ctx.font='13px Segoe UI';ctx.textAlign='center';ctx.fillText('📦',pt.x,pt.y-24);} // donation box
  }
  // --- npcs ---
  for(const n of npcs){
    const A=ARCHETYPES[n.arch];
    drawPersonTop(ctx,n.x,n.y,{color:n.shirt,skin:n.skin,hair:n.hair,dir:n.dir,walk:n.walk,scale:1.05});
    // marker
    ctx.textAlign='center';
    if(n.donated){
      ctx.font='15px Segoe UI';ctx.fillText('✅',n.x,n.y-30);
    }else{
      const bob=Math.sin(t*3+n.bob)*3;
      ctx.font='17px Segoe UI';ctx.fillText('💬',n.x,n.y-32+bob);
      // archetype icon + name
      ctx.font='700 11px Segoe UI';
      const label=`${A.icon} ${n.name.split('(')[0]}`;
      const wdt=ctx.measureText(label).width+14;
      ctx.fillStyle='rgba(15,10,30,.72)';roundRect(ctx,n.x-wdt/2,n.y-58+bob,wdt,16,8);ctx.fill();
      ctx.fillStyle=n.donated?'#9aa':'#ffe9c9';ctx.fillText(label,n.x,n.y-46+bob);
      if(A.minRep&&G.reputation<A.minRep){ctx.font='10px Segoe UI';ctx.fillStyle='#fca5a5';ctx.fillText(`🔒 Rep ${A.minRep}+`,n.x,n.y-62+bob);}
    }
  }
  // --- player ---
  const glow=tilakGlow>0?tilakGlow:0;
  if(glow>0){ctx.save();ctx.shadowColor='#ff5a3a';ctx.shadowBlur=30*glow;
    ctx.fillStyle='rgba(255,90,58,.3)';ctx.beginPath();ctx.arc(player.x,player.y-8,22,0,TAU);ctx.fill();ctx.restore();}
  drawPersonTop(ctx,player.x,player.y,{color:'#ff9933',skin:'#c68642',dir:player.dir,walk:player.walk,scale:1.15,hair:'#1a120a'});
  ctx.textAlign='center';ctx.font='700 11px Segoe UI';
  ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=3;
  ctx.strokeText('YOU (Mandal Chief)',player.x,player.y-34);
  ctx.fillText('YOU (Mandal Chief)',player.x,player.y-34);

  Particles.draw(ctx,null);
  ctx.restore();

  nightTint(ctx,Wpx,Hpx,tod,.35);
  // daily goal progress bar
  drawGoalBar(ctx,Wpx,Hpx);
}
function drawGoalBar(ctx,Wpx,Hpx){
  const goal=G.chandaGoalTotal/6;
  const k=clamp(G.chandaCollected/(goal*Math.max(1,(G.day))),0,1);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const bw=Math.min(320,Wpx*.4),bx=(Wpx-bw)/2,by=Hpx-30;
  ctx.fillStyle='rgba(15,10,30,.75)';roundRect(ctx,bx-10,by-18,bw+20,30,10);ctx.fill();
  ctx.fillStyle='#3b2f23';roundRect(ctx,bx,by-10,bw,12,6);ctx.fill();
  ctx.fillStyle='#fbbf24';roundRect(ctx,bx,by-10,bw*k,12,6);ctx.fill();
  ctx.font='700 11px Segoe UI';ctx.textAlign='center';ctx.fillStyle='#ffe9c9';
  ctx.fillText(`Treasury ${fmt(G.chandaCollected)} / phase goal ${fmt(G.chandaGoalTotal)}`,bx+bw/2,by-16);
}
function drawTemple(ctx,x,y){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(8,10,180,120);
  ctx.fillStyle='#f3e7cf';roundRect(ctx,0,0,180,120,8);ctx.fill();
  ctx.fillStyle='#c2410c';roundRect(ctx,25,25,130,70,6);ctx.fill();
  ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.moveTo(90,-30);ctx.lineTo(70,25);ctx.lineTo(110,25);ctx.fill(); // shikhara
  ctx.beginPath();ctx.arc(90,-32,7,0,TAU);ctx.fill();
  ctx.font='16px Segoe UI';ctx.textAlign='center';ctx.fillText('🛕',90,72);
  ctx.font='700 12px Segoe UI';ctx.fillStyle='#fff';ctx.fillText('MANDIR',90,112);
  ctx.restore();
}
function drawPlot(ctx,x,y){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(120,90,50,.5)';roundRect(ctx,-150,-90,300,180,10);ctx.fill();
  ctx.strokeStyle='#fbbf24';ctx.setLineDash([12,8]);ctx.lineWidth=3;
  ctx.strokeRect(-140,-80,280,160);ctx.setLineDash([]);
  // little blueprint tent
  ctx.fillStyle='#e8dcc8';ctx.beginPath();ctx.moveTo(-40,40);ctx.lineTo(0,-10);ctx.lineTo(40,40);ctx.fill();
  ctx.fillStyle='#8a6d4a';ctx.fillRect(-6,10,12,30);
  ctx.font='700 13px Segoe UI';ctx.textAlign='center';
  ctx.fillStyle='rgba(15,10,30,.8)';roundRect(ctx,-110,-108,220,24,8);ctx.fill();
  ctx.fillStyle='#fbbf24';ctx.fillText('🚩 FUTURE MANDAL PANDAL 🚩',0,-91);
  drawFlag(ctx,-130,60,t,'#ff9933');drawFlag(ctx,130,60,t,'#16a34a');
  ctx.restore();
}
function drawAutoTop(ctx,x,y){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,.2)';roundRect(ctx,-16,-24,34,50,8);ctx.fill();
  ctx.fillStyle='#166534';roundRect(ctx,-14,-26,30,48,8);ctx.fill();
  ctx.fillStyle='#facc15';roundRect(ctx,-14,-8,30,10,3);ctx.fill();
  ctx.fillStyle='#bfe6ff';roundRect(ctx,-9,-22,20,10,3);ctx.fill();
  ctx.restore();
}
return {enter,exit,update,draw,onAction,endDay};
})();
