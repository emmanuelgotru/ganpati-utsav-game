/* ================= art.js — all programmatic drawing ================= */
'use strict';

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

/* ---------- sky & lighting ---------- */
// tod: 0=midnight .25=sunrise .5=noon .75=sunset 1=midnight
const SKY_STOPS=[
  {t:0.00,a:'#0b0a2a',b:'#1c1440'},
  {t:0.22,a:'#2a1e4f',b:'#7c4a6d'},
  {t:0.30,a:'#ff9d5c',b:'#ffd9a0'},
  {t:0.45,a:'#5ab4e8',b:'#bfe6ff'},
  {t:0.62,a:'#4a9ede',b:'#ffe3b0'},
  {t:0.74,a:'#ff7043',b:'#ffb347'},
  {t:0.82,a:'#3a2a5f',b:'#8a4a6a'},
  {t:0.92,a:'#0d0b30',b:'#241a4a'},
  {t:1.00,a:'#0b0a2a',b:'#1c1440'},
];
function skyColors(tod){
  for(let i=0;i<SKY_STOPS.length-1;i++){
    const s0=SKY_STOPS[i],s1=SKY_STOPS[i+1];
    if(tod>=s0.t&&tod<=s1.t){
      const k=(tod-s0.t)/(s1.t-s0.t);
      return [mixHex(s0.a,s1.a,k),mixHex(s0.b,s1.b,k)];
    }
  }
  return ['#0b0a2a','#1c1440'];
}
function mixHex(h1,h2,k){
  const p=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const a=p(h1),b=p(h2);
  const c=a.map((v,i)=>Math.round(lerp(v,b[i],k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function drawSky(ctx,w,h,tod){
  const [a,b]=skyColors(tod);
  const g=ctx.createLinearGradient(0,0,0,h*.65);g.addColorStop(0,a);g.addColorStop(1,b);
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  // stars at night
  const night=clamp((Math.abs(tod-.5)-.28)/.15,0,1);
  if(night>0){
    ctx.fillStyle=`rgba(255,255,240,${night*.9})`;
    let seed=7;
    for(let i=0;i<60;i++){
      seed=(seed*16807)%2147483647;const sx=(seed%1000)/1000*w;
      seed=(seed*16807)%2147483647;const sy=(seed%1000)/1000*h*.5;
      seed=(seed*16807)%2147483647;const tw=.5+.5*Math.sin(Date.now()/600+i*3);
      ctx.globalAlpha=night*tw;ctx.fillRect(sx,sy,2,2);
    }
    ctx.globalAlpha=1;
  }
  // sun / moon
  const ang=(tod-.25)*TAU;
  const sx=w/2+Math.cos(ang-Math.PI/2)*w*.42, sy=h*.6-Math.sin(ang+Math.PI)*h*.1 - Math.cos(ang)*h*.42;
  const sunUp=tod>.24&&tod<.78;
  const bx=w/2+Math.cos((tod-.25)*TAU)*w*.4, by=h*.55-Math.sin((tod-.25)*TAU)*h*.45;
  if(sunUp){
    ctx.save();ctx.shadowColor='rgba(255,200,80,.9)';ctx.shadowBlur=40;
    ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(bx,by,26,0,TAU);ctx.fill();ctx.restore();
  }else{
    const mx=w-bx,my=by;
    ctx.save();ctx.shadowColor='rgba(200,220,255,.8)';ctx.shadowBlur=25;
    ctx.fillStyle='#e8ecff';ctx.beginPath();ctx.arc(mx,my,18,0,TAU);ctx.fill();
    ctx.fillStyle=skyColors(tod)[0];ctx.beginPath();ctx.arc(mx-7,my-4,14,0,TAU);ctx.fill();ctx.restore();
  }
}
function nightTint(ctx,w,h,tod,alphaMax=.55){
  const night=clamp((Math.abs(tod-.5)-.3)/.18,0,1);
  if(night<=0)return;
  ctx.fillStyle=`rgba(10,8,40,${night*alphaMax})`;ctx.fillRect(0,0,w,h);
}

/* ---------- top-down environment pieces ---------- */
function drawRoadH(ctx,x,y,w,h){
  ctx.fillStyle='#4a4a52';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(255,220,120,.55)';ctx.lineWidth=3;ctx.setLineDash([18,14]);
  ctx.beginPath();ctx.moveTo(x,y+h/2);ctx.lineTo(x+w,y+h/2);ctx.stroke();ctx.setLineDash([]);
}
function drawRoadV(ctx,x,y,w,h){
  ctx.fillStyle='#4a4a52';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(255,220,120,.55)';ctx.lineWidth=3;ctx.setLineDash([18,14]);
  ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w/2,y+h);ctx.stroke();ctx.setLineDash([]);
}
function drawHouseTop(ctx,x,y,w,h,c){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x+6,y+8,w,h);
  ctx.fillStyle=c.wall;roundRect(ctx,x,y,w,h,6);ctx.fill();
  // roof
  ctx.fillStyle=c.roof;roundRect(ctx,x+6,y+6,w-12,h-12,4);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x+6,y+h/2);ctx.lineTo(x+w-6,y+h/2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+w/2,y+6);ctx.lineTo(x+w/2,y+h-6);ctx.stroke();
  ctx.restore();
}
function drawShopTop(ctx,x,y,w,h,name,color){
  drawHouseTop(ctx,x,y,w,h,{wall:'#e8dcc8',roof:color});
  ctx.fillStyle='rgba(255,255,255,.85)';roundRect(ctx,x+8,y+h-22,w-16,16,4);ctx.fill();
  ctx.fillStyle='#5a3a1a';ctx.font='700 11px Segoe UI,sans-serif';ctx.textAlign='center';
  ctx.fillText(name,x+w/2,y+h-10);
}
function drawTreeTop(ctx,x,y,r){
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(x+4,y+6,r,r*.8,0,0,TAU);ctx.fill();
  const g=ctx.createRadialGradient(x-r*.3,y-r*.3,r*.2,x,y,r);
  g.addColorStop(0,'#4d9e3f');g.addColorStop(1,'#2c6e2f');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(x-r*.3,y-r*.35,r*.4,0,TAU);ctx.fill();
}
function drawTreeSide(ctx,x,y,s){
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y+4,s*.8,s*.25,0,0,TAU);ctx.fill();
  ctx.fillStyle='#6b4226';ctx.fillRect(x-s*.12,y-s*.9,s*.24,s*.95);
  const g=ctx.createRadialGradient(x-s*.3,y-s*1.4,s*.2,x,y-s*1.2,s*1.1);
  g.addColorStop(0,'#57a94a');g.addColorStop(1,'#2c6e2f');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.arc(x,y-s*1.3,s*.85,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(x-s*.55,y-s*.95,s*.55,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(x+s*.55,y-s*.95,s*.55,0,TAU);ctx.fill();
}
function drawBuildingSide(ctx,x,y,w,h,winColor,lit){
  ctx.fillStyle='#2a2438';ctx.fillRect(x,y,w,h);
  ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(x,y,w*.4,h);
  const cols=Math.floor(w/34),rows=Math.floor(h/42);
  for(let cI=0;cI<cols;cI++)for(let r=0;r<rows;r++){
    const seed=(cI*31+r*17+x)%10;
    const on=lit&&seed<6;
    ctx.fillStyle=on?'rgba(255,214,120,.9)':winColor;
    ctx.fillRect(x+12+cI*34,y+14+r*42,16,22);
    if(on){ctx.fillStyle='rgba(255,214,120,.25)';ctx.fillRect(x+8+cI*34,y+10+r*42,24,30);}
  }
}
function drawMarigoldGarland(ctx,x1,y1,x2,y2,sag=26,t=0){
  const n=Math.max(6,Math.floor(dist({x:x1,y:y1},{x:x2,y:y2})/14));
  for(let i=0;i<=n;i++){
    const k=i/n;
    const x=lerp(x1,x2,k);
    const y=lerp(y1,y2,k)+Math.sin(k*Math.PI)*sag+Math.sin(t*2+k*6)*1.5;
    ctx.fillStyle=i%2?'#ff9933':'#fbbf24';
    ctx.beginPath();ctx.arc(x,y,4.5,0,TAU);ctx.fill();
  }
}
function drawBunting(ctx,x,y,w,t){
  const n=Math.floor(w/30);
  for(let i=0;i<n;i++){
    const k=i/n,k2=(i+1)/n;
    const x1=x+k*w,x2=x+k2*w;
    const y1=y+Math.sin(k*Math.PI)*14,y2=y+Math.sin(k2*Math.PI)*14;
    ctx.strokeStyle='#8a5a2a';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    const fx=(x1+x2)/2,fy=(y1+y2)/2;
    const sway=Math.sin(t*3+i)*2;
    ctx.fillStyle=['#ff9933','#fff','#16a34a','#fbbf24','#e11d48'][i%5];
    ctx.beginPath();ctx.moveTo(fx-7,fy);ctx.lineTo(fx+7,fy);ctx.lineTo(fx+sway,fy+16);ctx.closePath();ctx.fill();
  }
}
function drawFlag(ctx,x,y,t,color='#ff9933'){
  ctx.strokeStyle='#7a5a3a';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-40);ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-40);
  for(let i=0;i<=8;i++){
    const k=i/8;
    ctx.lineTo(x+k*30,y-40+4*k+Math.sin(t*6+k*4)*3*(k));
  }
  ctx.lineTo(x,y-24);ctx.closePath();ctx.fill();
}

/* ---------- characters ---------- */
// top-down walker
function drawPersonTop(ctx,x,y,o={}){
  const s=o.scale||1,c=o.color||'#e07b10',skin=o.skin||'#c68642',dir=o.dir||0,walk=o.walk||0;
  const bob=Math.sin(walk*10)*1.5*s;
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,6,9,4,0,0,TAU);ctx.fill();
  // legs
  const lx=Math.sin(walk*10)*3;
  ctx.fillStyle='#3b3b52';
  ctx.fillRect(-5+lx,0,4,8);ctx.fillRect(1-lx,0,4,8);
  // body
  ctx.fillStyle=c;roundRect(ctx,-8,-10+bob*.4,16,14,5);ctx.fill();
  // arms
  ctx.fillStyle=c;
  ctx.fillRect(-11,-8+bob*.4+Math.sin(walk*10)*2,4,9);
  ctx.fillRect(7,-8+bob*.4-Math.sin(walk*10)*2,4,9);
  // head
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-14+bob,7,0,TAU);ctx.fill();
  // hair (direction hint)
  ctx.fillStyle=o.hair||'#241a12';
  ctx.beginPath();ctx.arc(0,-15+bob,7,Math.PI*1.1+dir,Math.PI*1.9+dir);ctx.fill();
  ctx.restore();
}
// side-view walker (for processions etc)
function drawPersonSide(ctx,x,y,o={}){
  const s=o.scale||1,c=o.color||'#e07b10',skin=o.skin||'#c68642',walk=o.walk||0,flip=o.flip?-1:1;
  ctx.save();ctx.translate(x,y);ctx.scale(s*flip,s);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,0,9,3,0,0,TAU);ctx.fill();
  const lx=Math.sin(walk*10)*4;
  ctx.strokeStyle='#3b3b52';ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(lx,-1);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(-lx,-1);ctx.stroke();
  ctx.fillStyle=c;roundRect(ctx,-6,-30,12,17,4);ctx.fill();
  ctx.strokeStyle=skin;ctx.lineWidth=3.5;
  ctx.beginPath();ctx.moveTo(-4,-27);ctx.lineTo(-4-lx*.6,-18);ctx.stroke();
  ctx.beginPath();ctx.moveTo(4,-27);ctx.lineTo(4+lx*.6,-18);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-36,6.5,0,TAU);ctx.fill();
  ctx.fillStyle=o.hair||'#241a12';ctx.beginPath();ctx.arc(0,-38,6.5,Math.PI*1.05,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawDholPlayer(ctx,x,y,s,t){
  drawPersonSide(ctx,x,y,{scale:s,color:'#c2410c',walk:t*1.2});
  // dhol drum
  ctx.save();ctx.translate(x,y-22*s);ctx.scale(s,s);
  ctx.fillStyle='#8a5a2a';roundRect(ctx,-13,0,26,12,6);ctx.fill();
  ctx.fillStyle='#e8d5b0';ctx.beginPath();ctx.ellipse(-13,6,3.5,6,0,0,TAU);ctx.fill();
  ctx.beginPath();ctx.ellipse(13,6,3.5,6,0,0,TAU);ctx.fill();
  const hit=Math.sin(t*12)>0?2:-2;
  ctx.strokeStyle='#c68642';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(-6,-2);ctx.lineTo(-11,4+hit);ctx.stroke();
  ctx.beginPath();ctx.moveTo(6,-2);ctx.lineTo(11,4-hit);ctx.stroke();
  ctx.restore();
}

/* ---------- GANESHA IDOL (front view) ----------
   tier: 1=basic clay, 2=painted, 3=premium, 4=golden grand */
function drawGanesha(ctx,x,y,s,o={}){
  const tier=o.tier||2, t=o.t||0;
  const clay = o.eco; // terracotta look
  const body   = clay? '#b5651d' : ['#d9a05b','#e8b06a','#f0b860','#ffd27a'][tier-1];
  const bodyD  = clay? '#8f4f16' : ['#c08a48','#cf9850','#d9a24c','#e8b860'][tier-1];
  const dhoti  = o.dhoti||'#e11d48';
  const crown  = tier>=3?'#ffd700':'#e8a820';
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  const breathe=1+Math.sin(t*2)*.008;
  ctx.scale(breathe,breathe);

  // aura for high tiers
  if(tier>=3){
    const g=ctx.createRadialGradient(0,-70,10,0,-70,120);
    g.addColorStop(0,`rgba(255,210,120,${.35+Math.sin(t*3)*.1})`);g.addColorStop(1,'rgba(255,210,120,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,-70,120,0,TAU);ctx.fill();
  }

  // ---- pedestal: lotus ----
  ctx.fillStyle='#7c4a12';roundRect(ctx,-70,-6,140,20,6);ctx.fill();
  ctx.fillStyle='#9a5f1a';roundRect(ctx,-64,-14,128,12,5);ctx.fill();
  for(let i=-3;i<=3;i++){ // lotus petals
    ctx.fillStyle=i%2?'#f472b6':'#fb7185';
    ctx.beginPath();ctx.ellipse(i*18,-16,11,8,0,Math.PI,0);ctx.fill();
  }

  // ---- crossed legs ----
  ctx.fillStyle=body;
  ctx.beginPath();ctx.ellipse(-32,-26,26,13,-.25,0,TAU);ctx.fill();
  ctx.beginPath();ctx.ellipse(32,-26,26,13,.25,0,TAU);ctx.fill();
  ctx.fillStyle=bodyD;
  ctx.beginPath();ctx.ellipse(-32,-22,20,7,-.2,0,TAU);ctx.fill();
  ctx.beginPath();ctx.ellipse(32,-22,20,7,.2,0,TAU);ctx.fill();

  // ---- dhoti over lap ----
  ctx.fillStyle=dhoti;
  ctx.beginPath();ctx.moveTo(-46,-30);ctx.quadraticCurveTo(0,-14,46,-30);
  ctx.quadraticCurveTo(30,-46,0,-44);ctx.quadraticCurveTo(-30,-46,-46,-30);ctx.fill();
  ctx.fillStyle='#fbbf24';
  ctx.beginPath();ctx.moveTo(-46,-30);ctx.quadraticCurveTo(0,-16,46,-30);ctx.lineTo(46,-34);
  ctx.quadraticCurveTo(0,-20,-46,-34);ctx.fill();

  // ---- belly / torso ----
  ctx.fillStyle=body;
  ctx.beginPath();ctx.ellipse(0,-64,44,40,0,0,TAU);ctx.fill();
  ctx.fillStyle=bodyD;
  ctx.beginPath();ctx.ellipse(0,-58,34,28,0,.2,Math.PI-.2);ctx.fill();
  // belly button swirl
  ctx.strokeStyle=bodyD;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(0,-56,5,.5,5);ctx.stroke();
  // janeu (sacred thread)
  ctx.strokeStyle='#fff7e0';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-24,-96);ctx.quadraticCurveTo(6,-70,26,-40);ctx.stroke();

  // ---- back arms (raised) ----
  const armWave=Math.sin(t*1.5)*3;
  ctx.strokeStyle=body;ctx.lineWidth=15;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-36,-84);ctx.quadraticCurveTo(-64,-100-armWave,-70,-124-armWave);ctx.stroke();
  ctx.beginPath();ctx.moveTo(36,-84);ctx.quadraticCurveTo(64,-100+armWave,70,-124+armWave);ctx.stroke();
  // upper-left hand: ankusha (goad)
  ctx.strokeStyle='#8a5a2a';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-70,-124-armWave);ctx.lineTo(-78,-148-armWave);ctx.stroke();
  ctx.beginPath();ctx.arc(-74,-150-armWave,6,Math.PI*.8,Math.PI*2.2);ctx.stroke();
  // upper-right hand: lotus
  ctx.fillStyle='#f472b6';
  for(let i=0;i<6;i++){const a=i/6*TAU;
    ctx.beginPath();ctx.ellipse(70+Math.cos(a)*6,-132+armWave+Math.sin(a)*6,5,3,a,0,TAU);ctx.fill();}
  ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(70,-132+armWave,3.5,0,TAU);ctx.fill();

  // ---- front arms (blessing) ----
  ctx.strokeStyle=body;ctx.lineWidth=14;
  ctx.beginPath();ctx.moveTo(-38,-76);ctx.quadraticCurveTo(-56,-56,-48,-38);ctx.stroke();
  ctx.beginPath();ctx.moveTo(38,-76);ctx.quadraticCurveTo(56,-56,48,-38);ctx.stroke();
  ctx.fillStyle=body;
  ctx.beginPath();ctx.arc(-48,-36,8,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(48,-36,8,0,TAU);ctx.fill();
  // blessing hand (abhaya mudra hint on right)
  ctx.fillStyle=dhoti;ctx.beginPath();ctx.arc(48,-36,4,0,TAU);ctx.fill();
  // modak in left hand
  ctx.fillStyle='#f5deb3';ctx.beginPath();ctx.arc(-48,-38,6,0,TAU);ctx.fill();
  ctx.strokeStyle='#c9a86a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(-48,-38,6,Math.PI*1.2,Math.PI*1.9);ctx.stroke();

  // ---- head ----
  // ears
  ctx.fillStyle=body;
  ctx.save();ctx.translate(-44,-122);ctx.rotate(-.3+Math.sin(t*2)*.03);
  ctx.beginPath();ctx.ellipse(0,0,22,30,0,0,TAU);ctx.fill();
  ctx.fillStyle=bodyD;ctx.beginPath();ctx.ellipse(3,0,13,20,0,0,TAU);ctx.fill();ctx.restore();
  ctx.fillStyle=body;
  ctx.save();ctx.translate(44,-122);ctx.rotate(.3-Math.sin(t*2)*.03);
  ctx.beginPath();ctx.ellipse(0,0,22,30,0,0,TAU);ctx.fill();
  ctx.fillStyle=bodyD;ctx.beginPath();ctx.ellipse(-3,0,13,20,0,0,TAU);ctx.fill();ctx.restore();
  // head sphere
  ctx.fillStyle=body;ctx.beginPath();ctx.arc(0,-122,36,0,TAU);ctx.fill();
  // trunk curving left
  ctx.strokeStyle=body;ctx.lineWidth=17;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,-116);
  ctx.quadraticCurveTo(-2,-92,-14+Math.sin(t*1.4)*4,-78);
  ctx.quadraticCurveTo(-24,-68,-18,-58);ctx.stroke();
  ctx.strokeStyle=bodyD;ctx.lineWidth=2;
  for(let i=0;i<5;i++){const ty=-104+i*9;
    ctx.beginPath();ctx.moveTo(-7+i*-1.4,ty);ctx.lineTo(3+i*-1.6,ty+2);ctx.stroke();}
  // tusks
  ctx.fillStyle='#fff7e0';
  ctx.beginPath();ctx.moveTo(-14,-104);ctx.lineTo(-20,-94);ctx.lineTo(-11,-97);ctx.fill();
  ctx.beginPath();ctx.moveTo(14,-104);ctx.lineTo(20,-94);ctx.lineTo(11,-97);ctx.fill();
  // eyes
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.ellipse(-14,-132,6,4.5,0,0,TAU);ctx.fill();
  ctx.beginPath();ctx.ellipse(14,-132,6,4.5,0,0,TAU);ctx.fill();
  ctx.fillStyle='#241a12';
  ctx.beginPath();ctx.arc(-14,-132,2.4,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(14,-132,2.4,0,TAU);ctx.fill();
  // eyebrows
  ctx.strokeStyle='#241a12';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(-14,-134,8,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  ctx.beginPath();ctx.arc(14,-134,8,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  // tilak
  ctx.fillStyle='#dc2626';
  ctx.beginPath();ctx.moveTo(0,-156);ctx.lineTo(-4,-142);ctx.lineTo(4,-142);ctx.fill();
  ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(0,-140,2.2,0,TAU);ctx.fill();

  // ---- crown ----
  ctx.fillStyle=crown;
  ctx.beginPath();
  ctx.moveTo(-30,-148);ctx.lineTo(-30,-162);ctx.lineTo(-18,-156);ctx.lineTo(-10,-172);
  ctx.lineTo(0,-160);ctx.lineTo(10,-172);ctx.lineTo(18,-156);ctx.lineTo(30,-162);ctx.lineTo(30,-148);
  ctx.quadraticCurveTo(0,-140,-30,-148);ctx.fill();
  ctx.strokeStyle='rgba(120,70,0,.5)';ctx.lineWidth=1.5;ctx.stroke();
  // jewels
  ctx.fillStyle='#e11d48';ctx.beginPath();ctx.arc(0,-152,3.4,0,TAU);ctx.fill();
  ctx.fillStyle='#16a34a';ctx.beginPath();ctx.arc(-15,-150,2.6,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(15,-150,2.6,0,TAU);ctx.fill();
  if(tier>=2){
    ctx.fillStyle=crown;
    ctx.beginPath();ctx.arc(0,-178,7,0,TAU);ctx.fill(); // kalash top
    ctx.strokeStyle=crown;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(0,-172);ctx.lineTo(0,-185);ctx.stroke();
    ctx.fillStyle='#e11d48';ctx.beginPath();ctx.arc(0,-188,3,0,TAU);ctx.fill();
  }
  // garland
  ctx.strokeStyle='#ff9933';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-30,-96);ctx.quadraticCurveTo(0,-64,30,-96);ctx.stroke();
  for(let i=0;i<7;i++){const k=i/6;
    const gx=lerp(-30,30,k),gy=-96+Math.sin(k*Math.PI)*30;
    ctx.fillStyle=i%2?'#fbbf24':'#ff9933';ctx.beginPath();ctx.arc(gx,gy,3.4,0,TAU);ctx.fill();}
  ctx.restore();
}

/* ---------- vehicles ---------- */
function drawTruckSide(ctx,x,y,s,color='#1e6fb8'){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,4,85,8,0,0,TAU);ctx.fill();
  // flatbed
  ctx.fillStyle=color;roundRect(ctx,-84,-30,110,24,4);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(-84,-30,110,6);
  // cabin
  ctx.fillStyle=color;roundRect(ctx,28,-46,54,40,6);ctx.fill();
  ctx.fillStyle='#bfe6ff';roundRect(ctx,44,-40,32,18,3);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(44,-40,10,18);
  // bumper & light
  ctx.fillStyle='#333';roundRect(ctx,80,-14,8,8,2);ctx.fill();
  ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(84,-22,4,0,TAU);ctx.fill();
  // wheels
  for(const wx of [-58,-16,58]){
    ctx.fillStyle='#1c1c22';ctx.beginPath();ctx.arc(wx,-2,13,0,TAU);ctx.fill();
    ctx.fillStyle='#8a8a95';ctx.beginPath();ctx.arc(wx,-2,6,0,TAU);ctx.fill();
    ctx.strokeStyle='#555';ctx.lineWidth=2;
    const a=Date.now()/90+wx;
    ctx.beginPath();ctx.moveTo(wx+Math.cos(a)*5,-2+Math.sin(a)*5);ctx.lineTo(wx-Math.cos(a)*5,-2-Math.sin(a)*5);ctx.stroke();
  }
  ctx.restore();
}
function drawAutoRickshaw(ctx,x,y,s){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,3,26,5,0,0,TAU);ctx.fill();
  ctx.fillStyle='#166534';roundRect(ctx,-24,-26,40,22,6);ctx.fill();
  ctx.fillStyle='#facc15';roundRect(ctx,-24,-10,40,8,3);ctx.fill();
  ctx.fillStyle='#bfe6ff';roundRect(ctx,-6,-24,12,10,2);ctx.fill();
  ctx.fillStyle='#1c1c22';
  ctx.beginPath();ctx.arc(-14,0,6,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(12,0,6,0,TAU);ctx.fill();
  ctx.restore();
}

/* ---------- pandal (front view, progress 0..1) ---------- */
function drawPandal(ctx,x,y,w,h,prog,o={}){
  // x,y = bottom-center. prog: 0..1 overall. stages appear sequentially.
  ctx.save();ctx.translate(x,y);
  const theme=o.theme||{c1:'#ff9933',c2:'#e11d48',c3:'#fbbf24'};
  const t=o.t||0;
  const P=v=>clamp((prog-v[0])/(v[1]-v[0]),0,1); // stage helper
  // 1. foundation / platform
  const s1=P([0,.12]);
  if(s1>0){
    ctx.fillStyle='#8a6d4a';roundRect(ctx,-w*.62,-14*s1,w*1.24,14*s1,3);ctx.fill();
    ctx.fillStyle='#6e5537';roundRect(ctx,-w*.56,-20*s1,w*1.12,8*s1,3);ctx.fill();
  }
  // 2. bamboo poles
  const s2=P([.08,.3]);
  if(s2>0){
    const ph=h*s2;
    ctx.strokeStyle='#b98a3a';ctx.lineWidth=9;ctx.lineCap='round';
    for(const px of [-w*.55,-w*.3,w*.3,w*.55]){
      ctx.beginPath();ctx.moveTo(px,-14);ctx.lineTo(px,-14-ph);ctx.stroke();
      ctx.strokeStyle='rgba(90,60,10,.35)';ctx.lineWidth=2;
      for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(px-5,-14-ph*i/5);ctx.lineTo(px+5,-14-ph*i/5);ctx.stroke();}
      ctx.strokeStyle='#b98a3a';ctx.lineWidth=9;
    }
    // cross beams
    if(s2>.6){
      ctx.lineWidth=7;
      ctx.beginPath();ctx.moveTo(-w*.58,-14-ph);ctx.lineTo(w*.58,-14-ph);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(-w*.55,-14-ph*.5);ctx.lineTo(w*.55,-14-ph*.95);ctx.stroke();
      ctx.beginPath();ctx.moveTo(w*.55,-14-ph*.5);ctx.lineTo(-w*.55,-14-ph*.95);ctx.stroke();
    }
  }
  // 3. canopy + side drapes
  const s3=P([.28,.55]);
  if(s3>0){
    const cw=w*1.3*s3;
    // canopy dome
    const g=ctx.createLinearGradient(0,-h-40,0,-h+20);
    g.addColorStop(0,theme.c3);g.addColorStop(1,theme.c1);
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(-cw/2,-h*.92);
    ctx.quadraticCurveTo(0,-h*1.28,cw/2,-h*.92);
    ctx.lineTo(cw/2,-h*.86);ctx.quadraticCurveTo(0,-h*1.18,-cw/2,-h*.86);
    ctx.closePath();ctx.fill();
    // scalloped edge
    ctx.fillStyle=theme.c2;
    const sc=Math.floor(cw/26);
    for(let i=0;i<=sc;i++){
      const sx=-cw/2+i*(cw/sc);
      ctx.beginPath();ctx.arc(sx,-h*.88+Math.abs(i-sc/2)*1.2,8,0,Math.PI);ctx.fill();
    }
    // side curtains
    ctx.fillStyle=theme.c2+'';
    ctx.globalAlpha=.9;
    ctx.beginPath();ctx.moveTo(-cw/2+6,-h*.9);
    ctx.quadraticCurveTo(-cw/2+26,-h*.5,-cw/2+10,-16);ctx.lineTo(-cw/2+2,-16);
    ctx.quadraticCurveTo(-cw/2+14,-h*.5,-cw/2+2,-h*.9);ctx.fill();
    ctx.beginPath();ctx.moveTo(cw/2-6,-h*.9);
    ctx.quadraticCurveTo(cw/2-26,-h*.5,cw/2-10,-16);ctx.lineTo(cw/2-2,-16);
    ctx.quadraticCurveTo(cw/2-14,-h*.5,cw/2-2,-h*.9);ctx.fill();
    ctx.globalAlpha=1;
  }
  // 4. backdrop + stage
  const s4=P([.5,.72]);
  if(s4>0){
    const g=ctx.createLinearGradient(0,-h*.85,0,0);
    g.addColorStop(0,'#4a2a6a');g.addColorStop(1,'#2a1a3a');
    ctx.globalAlpha=s4;
    ctx.fillStyle=g;roundRect(ctx,-w*.52,-h*.85,w*1.04,h*.85-14,8);ctx.fill();
    // stage
    ctx.fillStyle='#7c4a12';roundRect(ctx,-w*.4,-44,w*.8,30,5);ctx.fill();
    ctx.fillStyle='#9a5f1a';roundRect(ctx,-w*.42,-50,w*.84,10,4);ctx.fill();
    ctx.fillStyle=theme.c2;roundRect(ctx,-w*.42,-52,w*.84,5,2);ctx.fill();
    ctx.globalAlpha=1;
  }
  // 5. decorations
  const s5=P([.68,.9]);
  if(s5>0){
    ctx.globalAlpha=s5;
    drawMarigoldGarland(ctx,-w*.55,-h*.92,w*.55,-h*.92,10,t);
    drawMarigoldGarland(ctx,0,-h*.92,w*.55,-h*.92,10,t);
    drawBunting(ctx,-w*.66,-h*1.02,w*1.32,t);
    // corner diyas / lights string
    if(o.lights){
      const n=24;
      for(let i=0;i<n;i++){
        const k=i/(n-1);
        const lx=lerp(-w*.6,w*.6,k);
        const ly=-h*.8+Math.sin(k*Math.PI)*-18;
        const tw=.6+.4*Math.sin(t*5+i*1.7);
        const lc=o.lightColors&&o.lightColors.length?o.lightColors:['#ffe08a'];
        ctx.fillStyle=lc[i%lc.length];
        ctx.save();ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10*tw;
        ctx.beginPath();ctx.arc(lx,ly,3.5,0,TAU);ctx.fill();ctx.restore();
      }
    }
    ctx.globalAlpha=1;
  }
  // 6. idol
  const s6=P([.85,1]);
  if(s6>0&&o.idolTier){
    ctx.globalAlpha=s6;
    drawGanesha(ctx,0,-52,h*.34*o.idolScale*(0.4+0.6*s6),{tier:o.idolTier,eco:o.eco,t});
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

/* ---------- misc ---------- */
function drawDiyas(ctx,x,y,n,t){
  for(let i=0;i<n;i++){
    const dx=x+i*26,fl=.7+.3*Math.sin(t*8+i*2);
    ctx.fillStyle='#8a5a2a';ctx.beginPath();ctx.ellipse(dx,y,9,4,0,0,TAU);ctx.fill();
    ctx.save();ctx.shadowColor='#ffb347';ctx.shadowBlur=14*fl;
    ctx.fillStyle='#ffcf6a';ctx.beginPath();ctx.ellipse(dx,y-6*fl,3,6*fl,0,0,TAU);ctx.fill();ctx.restore();
  }
}
function drawRangoli(ctx,x,y,r,t){
  ctx.save();ctx.translate(x,y);ctx.scale(1,.4);
  for(let ring=3;ring>=1;ring--){
    ctx.strokeStyle=['#e11d48','#f59e0b','#fff'][ring-1];ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(0,0,r*ring/3,0,TAU);ctx.stroke();
    const n=ring*6;
    ctx.fillStyle=['#ff9933','#16a34a','#e11d48'][ring-1];
    for(let i=0;i<n;i++){const a=i/n*TAU+t*.2*ring;
      ctx.beginPath();ctx.arc(Math.cos(a)*r*ring/3,Math.sin(a)*r*ring/3,3.5,0,TAU);ctx.fill();}
  }
  ctx.restore();
}
function drawRain(ctx,w,h,t,intensity=1){
  ctx.strokeStyle='rgba(160,200,255,.5)';ctx.lineWidth=1.5;
  const n=Math.floor(120*intensity);
  for(let i=0;i<n;i++){
    const seed=i*97.3;
    const x=((seed*13.7+t*400*(1+(i%3)*.3))%(w+100))-50;
    const y=((seed*29.3+t*900*(1+(i%5)*.2))%h);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+14);ctx.stroke();
  }
}
function drawClouds(ctx,w,h,t,color='rgba(255,255,255,.85)'){
  ctx.fillStyle=color;
  for(let i=0;i<4;i++){
    const x=((i*360+t*20)%(w+300))-150;
    const y=40+(i%2)*50;
    ctx.beginPath();
    ctx.arc(x,y,28,0,TAU);ctx.arc(x+26,y-12,32,0,TAU);ctx.arc(x+56,y,26,0,TAU);ctx.arc(x+28,y+8,30,0,TAU);
    ctx.fill();
  }
}
function drawFirework(ctx,x,y,t0,now){
  const age=now-t0;
  if(age>1.6)return false;
  const n=26;
  const colors=['#ff9933','#fbbf24','#e11d48','#22c55e','#60a5fa','#f472b6'];
  const c=colors[Math.floor(x+y)%colors.length];
  if(age<.25){ // rising trail
    const k=age/.25;
    ctx.fillStyle='#ffe08a';
    ctx.beginPath();ctx.arc(x,lerp(y+220,y,k),2.5,0,TAU);ctx.fill();
    return true;
  }
  const k=(age-.25)/1.35;
  const r=k*130;
  ctx.globalAlpha=clamp(1-k,0,1);
  for(let i=0;i<n;i++){
    const a=i/n*TAU;
    ctx.fillStyle=i%3?c:'#fff7e0';
    ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r+k*k*50,2.6*(1-k*.5),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
  return true;
}
