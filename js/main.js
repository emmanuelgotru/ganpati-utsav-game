/* ================= main.js — boot, title screen, game loop ================= */
'use strict';

/* ---------- title phase ---------- */
PHASES.title={
  t:0,
  enter(){
    this.t=0;
    $('#hud').classList.add('hidden');
    const p=$('#panel');p.classList.remove('hidden');
    const daily=dailyChallenge();
    const profile=loadEngagement();
    p.innerHTML=`
    <div class="sheet" style="text-align:center;max-width:820px">
      <div style="font-size:3rem;line-height:1">🐘</div>
      <div class="title-logo" style="color:#7c2d12">Ganpati Bappa Morya</div>
      <div class="title-sub" style="color:#a16207">The 30-Day Mandal · A Ganesh Chaturthi Management Game</div>
      <div class="sub" style="max-width:620px;margin:0 auto 18px">
        Lead your neighborhood mandal through <b>30 days</b>: collect chanda door-to-door, haggle in wholesale markets,
        build the pandal, bring Bappa home in a grand procession, run 10 days of festival chaos — and give Him a
        flawless, eco-friendly visarjan. You are graded on <b>Budget · Creativity · Reputation · Visitor Satisfaction</b>.
      </div>
      <div class="round2-grid">
        <div class="challenge-card">
          <div class="challenge-kicker">🌺 TODAY'S SANKALP · +${daily.bonus} BONUS</div>
          <div class="challenge-name">${daily.icon} ${daily.name}</div>
          <div class="desc">${daily.desc}</div>
          <div class="challenge-note">Complete it during your run to boost your final score.</div>
        </div>
        <div class="progress-card">
          <div class="challenge-kicker">🏆 YOUR MANDAL JOURNEY</div>
          <div class="journey-stats"><b>${profile.runs||0}</b><span>runs</span><b>${profile.streak||0}</b><span>day streak</span><b>${profile.bestByDifficulty.galli||0}</b><span>best score</span></div>
          <button class="btn ghost" id="btnTitleBoard">📊 View Leaderboard</button>
        </div>
      </div>
      <div class="grid-cards" style="grid-template-columns:1fr 1fr;max-width:640px;margin:0 auto">
        ${Object.keys(DIFF).map(k=>{const d=DIFF[k];return `
        <div class="card diff-card" data-d="${k}">
          <div style="font-size:2.2rem">${d.icon}</div>
          <h3 style="justify-content:center">${d.name}</h3>
          <div class="desc">${d.sub}</div>
          <div class="price">Starting treasury: ${fmt(d.money)}</div>
          <button class="btn" style="width:100%">Begin as Mandal Chief</button>
        </div>`}).join('')}
      </div>
      <div class="sub mt" style="font-size:.75rem">🎮 WASD / joystick to move · E / 🙏 to interact · Best with sound on 🔊 (synthesized dhol!)</div>
    </div>`;
    p.querySelectorAll('.diff-card').forEach(c=>c.onclick=()=>{
      Audio_.init();sfx('bell');
      p.classList.add('hidden');
      $('#hud').classList.remove('hidden');
      startGame(c.dataset.d,daily.id);
    });
    const boardBtn=p.querySelector('#btnTitleBoard');
    if(boardBtn)boardBtn.onclick=()=>{
      p.innerHTML=`<div class="sheet" style="max-width:760px"><div class="row spread"><div><div class="title-sub">ROUND 2 SCOREBOARD</div><h2>🏆 Mandal Leaderboard</h2></div><button class="btn ghost" id="btnBoardBack">← Back</button></div><div id="titleBoards">${localLeaderboardHtml()}</div></div>`;
      renderLeaderboards('titleBoards');
      p.querySelector('#btnBoardBack').onclick=()=>PHASES.title.enter();
    };
  },
  exit(){},
  update(dt){this.t+=dt;Particles.update(dt);
    if(Math.random()<dt*.6)Particles.petals(rand(1200,100),rand(300,100),2);},
  draw(ctx,Wpx,Hpx){
    const fit=fitTransform(ctx,Wpx,Hpx);
    drawSky(ctx,VW,VH,.88+Math.sin(this.t*.05)*.02);
    drawBuildingSide(ctx,-20,280,240,340,'rgba(255,214,120,.25)',true);
    drawBuildingSide(ctx,1060,280,240,340,'rgba(255,214,120,.25)',true);
    ctx.fillStyle='#3a2f48';ctx.fillRect(0,600,VW,120);
    drawBunting(ctx,0,200,VW,this.t);
    drawGanesha(ctx,640,608,1.45,{tier:4,t:this.t});
    drawDiyas(ctx,380,648,10,this.t);
    drawRangoli(ctx,640,690,60,this.t);
    nightTint(ctx,VW,VH,.9,.15);
    Particles.draw(ctx,null);
  },
  onAction(){}
};

/* ---------- boot ---------- */
const canvas=$('#scene');
const ctx=canvas.getContext('2d');
function resize(){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  DPR=dpr;
  canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize);resize();

let last=performance.now();
function loop(now){
  window.__frames=(window.__frames||0)+1;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,innerWidth,innerHeight);
  if(App){
    try{ App.update&&App.update(dt); }catch(e){console.error(e);frameErr(e,'update');}
    try{ App.draw&&App.draw(ctx,innerWidth,innerHeight); }catch(e){console.error(e);frameErr(e,'draw');}
  }
  requestAnimationFrame(loop);
}
let frameErrN=0;
function frameErr(e,where){
  if(frameErrN++<3&&window.__showErr)window.__showErr(where+' error: '+(e&&e.message?e.message:e));
}
setPhase('title');
setupTouch();
document.addEventListener('pointerdown',()=>Audio_.init(),{once:true});
requestAnimationFrame(loop); // ← start the render loop!

/* phase shortcuts */
addEventListener('keydown',e=>{
  if(e.code==='KeyN'&&G.phase==='donation'&&PHASES.donation.endDay)PHASES.donation.endDay();
});
