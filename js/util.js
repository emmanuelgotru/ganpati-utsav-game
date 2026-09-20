/* ================= util.js — helpers, DOM, toasts, audio ================= */
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a=1,b=0)=>b+Math.random()*(a-b);
const randi=n=>Math.floor(Math.random()*n);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TAU=Math.PI*2;
const fmt=n=>'₹'+Math.round(n).toLocaleString('en-IN');

function $(s){return document.querySelector(s)}
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}

/* ---------- toasts ---------- */
function toast(msg,kind=''){
  const t=el('div','toast '+kind,msg);
  $('#toasts').appendChild(t);
  setTimeout(()=>t.remove(),3200);
}

/* ---------- banner ---------- */
let bannerTimer=null;
function banner(main,sub='',ms=2600){
  const b=$('#banner');
  $('#bannerMain').textContent=main;
  $('#bannerSub').textContent=sub;
  b.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer=setTimeout(()=>b.classList.add('hidden'),ms);
}

/* ---------- audio (WebAudio synth — dhol, coins, crowd, fireworks) ---------- */
const Audio_={
  ctx:null,on:true,loop:null,loopGain:null,
  init(){ if(!this.ctx){ try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } 
    if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume(); },
  tone(f,dur,type='sine',vol=.2,when=0,slide=0){
    if(!this.on||!this.ctx)return;
    const t=this.ctx.currentTime+when;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+dur+.05);
  },
  noise(dur,vol=.2,freq=1000,q=1,when=0){
    if(!this.on||!this.ctx)return;
    const t=this.ctx.currentTime+when;
    const len=Math.max(1,Math.floor(this.ctx.sampleRate*dur));
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=this.ctx.createBufferSource();src.buffer=buf;
    const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
    const g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    src.connect(f).connect(g).connect(this.ctx.destination);src.start(t);
  },
  sfx(name){
    this.init(); if(!this.ctx)return;
    switch(name){
      case 'coin': this.tone(988,.09,'square',.12);this.tone(1319,.22,'square',.12,.07);break;
      case 'click': this.tone(660,.06,'triangle',.12);break;
      case 'good': [523,659,784,1047].forEach((f,i)=>this.tone(f,.18,'triangle',.14,i*.09));break;
      case 'bad': this.tone(220,.3,'sawtooth',.14,0,-80);this.tone(110,.4,'sawtooth',.1,.1);break;
      case 'dholNa': this.tone(90,.18,'sine',.5,0,-50);this.noise(.05,.25,2500);break;   // bass (dhol)
      case 'dholTin': this.noise(.07,.3,3800,1.5);this.tone(340,.06,'triangle',.2);break;  // treble
      case 'bell': [1568,2093,2637].forEach((f,i)=>this.tone(f,.7,'sine',.08,i*.05));break;
      case 'conch': this.tone(392,1.2,'sawtooth',.08,0,60);this.tone(588,1.2,'sawtooth',.04,0,40);break;
      case 'firework': this.noise(.5,.3,500,.5);setTimeout(()=>this.noise(.4,.35,1800,.4),240);break;
      case 'crowd': this.noise(.9,.15,700,.4);this.noise(.9,.1,1100,.3,.1);break;
      case 'hammer': this.noise(.08,.28,900,2);this.tone(150,.06,'square',.12);break;
      case 'truck': this.tone(70,.6,'sawtooth',.1,0,10);this.noise(.6,.08,300,.5);break;
      case 'siren': this.tone(700,.4,'sine',.1,0,300);this.tone(700,.4,'sine',.1,.4,-300);break;
    }
  },
  startDhol(bpm=140){
    this.init(); if(!this.ctx||this.loop)return;
    const g=this.ctx.createGain();g.gain.value=.5;g.connect(this.ctx.destination);
    this.loopGain=g;
    // classic dhol pattern: Na (bass) / Tin (treble) in 8 steps
    const pattern=['Na','tin','Tin','tin','Na','Na','Tin','tin'];
    let step=0;
    const iv=60/bpm/2*1000;
    const tick=()=>{
      if(!this.on){step=(step+1)%8;return}
      const p=pattern[step];
      if(p==='Na')this.sfx('dholNa'); else this.sfx('dholTin');
      step=(step+1)%8;
    };
    tick();
    this.loop=setInterval(tick,iv);
  },
  stopDhol(){ if(this.loop){clearInterval(this.loop);this.loop=null;} }
};
function sfx(n){Audio_.sfx(n)}

/* ---------- particles ---------- */
const Particles={
  list:[],
  spawn(x,y,opt={}){
    this.list.push({x,y,vx:opt.vx??rand(60,-60),vy:opt.vy??rand(-40,-160),
      g:opt.g??260,life:opt.life??1.1,max:opt.life??1.1,size:opt.size??5,
      color:opt.color??'#fbbf24',type:opt.type??'dot',rot:rand(TAU),vr:rand(6,-6),text:opt.text});
  },
  coins(x,y,n=8){for(let i=0;i<n;i++)this.spawn(x+rand(14,-14),y,{color:'#fbbf24',vy:rand(-140,-260),g:420,size:5,type:'coin'})},
  petals(x,y,n=10){for(let i=0;i<n;i++)this.spawn(x+rand(60,-60),y+rand(20,-20),{color:pick(['#ff9933','#f59e0b','#fbbf24','#fb923c']),vy:rand(-20,-70),vx:rand(40,-40),g:38,size:4,life:2.4,type:'petal'})},
  confetti(x,y,n=30){for(let i=0;i<n;i++)this.spawn(x+rand(80,-80),y,{color:pick(['#ff9933','#22c55e','#fbbf24','#e11d48','#3b82f6','#fff']),vy:rand(-200,-420),vx:rand(180,-180),g:340,size:4,life:2,type:'rect'})},
  floatText(x,y,text,color='#ffe9c9'){this.spawn(x,y,{text,color,vy:-60,g:0,life:1.4,type:'text',size:15})},
  smoke(x,y,n=4){for(let i=0;i<n;i++)this.spawn(x+rand(10,-10),y,{color:'rgba(180,180,190,.6)',vy:rand(-30,-70),g:-10,size:rand(10,4),life:1.6,type:'smoke'})},
  update(dt){
    for(let i=this.list.length-1;i>=0;i--){
      const p=this.list[i];p.life-=dt;
      if(p.life<=0){this.list.splice(i,1);continue}
      p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
    }
  },
  draw(ctx,cam){
    for(const p of this.list){
      const a=clamp(p.life/p.max,0,1);
      const x=p.x-(cam?cam.x:0),y=p.y-(cam?cam.y:0);
      ctx.globalAlpha=a;
      if(p.type==='text'){
        ctx.font=`900 ${p.size}px 'Segoe UI',sans-serif`;ctx.textAlign='center';
        ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=3;ctx.strokeText(p.text,x,y);
        ctx.fillStyle=p.color;ctx.fillText(p.text,x,y);
      }else if(p.type==='coin'){
        ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(x,y,p.size*Math.abs(Math.cos(p.rot*2))+1,p.size,0,0,TAU);ctx.fill();
        ctx.strokeStyle='#b45309';ctx.lineWidth=1;ctx.stroke();
      }else if(p.type==='petal'){
        ctx.save();ctx.translate(x,y);ctx.rotate(p.rot);ctx.fillStyle=p.color;
        ctx.beginPath();ctx.ellipse(0,0,p.size,p.size*.5,0,0,TAU);ctx.fill();ctx.restore();
      }else if(p.type==='rect'){
        ctx.save();ctx.translate(x,y);ctx.rotate(p.rot);ctx.fillStyle=p.color;
        ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.6);ctx.restore();
      }else if(p.type==='smoke'){
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,p.size*(1.6-a*.6),0,TAU);ctx.fill();
      }else{
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,p.size,0,TAU);ctx.fill();
      }
      ctx.globalAlpha=1;
    }
  },
  clear(){this.list.length=0}
};

/* ---------- virtual scene transform (design at 1280x720) ---------- */
const VW=1280,VH=720;
let DPR=1;
function fitTransform(ctx,W,H){
  const s=Math.min(W/VW,H/VH);
  const ox=(W-VW*s)/2,oy=(H-VH*s)/2;
  ctx.setTransform(s*DPR,0,0,s*DPR,ox*DPR,oy*DPR);
  return {s,ox,oy};
}
function screenToVirtual(e,fit,W,H){
  const r=e.target.getBoundingClientRect?e.target.getBoundingClientRect():{left:0,top:0};
  const cx=(e.clientX-r.left),cy=(e.clientY-r.top);
  return {x:(cx-fit.ox)/fit.s,y:(cy-fit.oy)/fit.s};
}

/* ---------- input ---------- */
const Keys={};
window.addEventListener('keydown',e=>{Keys[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.code==='KeyE'||e.code==='Space')Input.action();
});
window.addEventListener('keyup',e=>Keys[e.code]=false);
const Input={
  moveX:0,moveY:0,
  poll(){
    let x=0,y=0;
    if(Keys['KeyA']||Keys['ArrowLeft'])x-=1;
    if(Keys['KeyD']||Keys['ArrowRight'])x+=1;
    if(Keys['KeyW']||Keys['ArrowUp'])y-=1;
    if(Keys['KeyS']||Keys['ArrowDown'])y+=1;
    const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}
    this.moveX=x+this.touchX;this.moveY=y+this.touchY;
  },
  touchX:0,touchY:0,
  action(){ if(App&&App.onAction)App.onAction(); }
};
function setupTouch(){
  const isTouch='ontouchstart' in window;
  if(!isTouch)return;
  const base=$('#joyBase'),stick=$('#joyStick');
  let id=null,cx=0,cy=0;
  const rect=()=>base.getBoundingClientRect();
  base.addEventListener('touchstart',e=>{e.preventDefault();Audio_.init();
    const t=e.changedTouches[0];id=t.identifier;const r=rect();cx=r.left+r.width/2;cy=r.top+r.height/2;},{passive:false});
  base.addEventListener('touchmove',e=>{e.preventDefault();
    for(const t of e.changedTouches){if(t.identifier===id){
      let dx=t.clientX-cx,dy=t.clientY-cy;const d=Math.hypot(dx,dy),max=48;
      if(d>max){dx*=max/d;dy*=max/d}
      stick.style.transform=`translate(${dx}px,${dy}px)`;
      Input.touchX=dx/max;Input.touchY=dy/max;}}},{passive:false});
  const end=e=>{for(const t of e.changedTouches){if(t.identifier===id){id=null;
    stick.style.transform='';Input.touchX=0;Input.touchY=0;}}};
  base.addEventListener('touchend',end);base.addEventListener('touchcancel',end);
  $('#btnAction').addEventListener('touchstart',e=>{e.preventDefault();Input.action();},{passive:false});
  $('#touchControls').classList.remove('hidden');
}
