/* ================= state.js — game state, data tables, dialog engine ================= */
'use strict';

/* ---------- global game state ---------- */
const G={
  day:1, maxDay:30, difficulty:'galli', // galli | raja
  challenge:null, runRecorded:false,
  money:0, reputation:20, volunteers:2,
  satisfaction:70,
  phase:'title',
  weather:'clear', tod:.42,
  chandaCollected:0, chandaGoalTotal:0,
  alloc:{infra:0,idol:0,decor:0,sound:0,security:0},
  purchases:{},          // market items bought
  contractors:{structure:0,electric:0,paint:0,soundEng:0}, // 0 none,1..3 tiers
  idol:{tier:1,eco:false,scale:1},
  theme:null, lights:null, flowers:null,
  construction:{progress:0,durability:100,morale:80},
  festival:{avgSat:70,dayLogs:[]},
  eco:{clay:false,naturalColors:false,tank:false},
  scores:{budget:0,creativity:0,reputation:0,satisfaction:0},
  stats:{donations:0,npcsHelped:0,eventsSolved:0,eventsFailed:0},
  processionBest:0,
};

const DIFF={
  galli:{name:'Galli Mandal',sub:'Small alleyway celebration — forgiving budget, cozy crowds',
    money:25000,goal:.85,turnout:.7,npcRep:1,icon:'🏘️'},
  raja:{name:'Raja Mandal',sub:'City-level mandal — huge budget, politics, massive crowds',
    money:60000,goal:1.25,turnout:1.4,npcRep:1.15,icon:'🏙️'},
};

const WEATHERS=[
  {id:'clear',name:'Clear & Sunny',icon:'☀️',turnout:1.05},
  {id:'cloudy',name:'Pleasant Clouds',icon:'⛅',turnout:1.1},
  {id:'rain',name:'Unseasonal Rain',icon:'🌧️',turnout:.7,risk:true},
  {id:'heat',name:'Heatwave',icon:'🥵',turnout:.8,stamina:-20},
  {id:'breezy',name:'Cool Breeze',icon:'🍃',turnout:1.0},
];
function rollWeather(){
  const r=Math.random();
  G.weather = r<.4?'clear' : r<.6?'cloudy' : r<.78?'breezy' : r<.9?'rain':'heat';
}
const weatherInfo=()=>WEATHERS.find(w=>w.id===G.weather);

/* ---------- dialog engine (modal with branching) ----------
   showDialog({avatar,name,role,text,choices:[{label,hint,danger,run}],timer,cls})
   run() may call showDialog again (next node) or closeDialog()            */
let dialogOpen=false, dialogTimer=null, dialogOnTimeout=null;
function showDialog(cfg){
  dialogOpen=true;
  const box=$('#dialogBox');
  box.className=''; if(cfg.cls)box.classList.add(cfg.cls);
  box.innerHTML=`
    <div class="dlg-head">
      <div class="dlg-avatar">${cfg.avatar||'🙏'}</div>
      <div><div class="dlg-name">${cfg.name||''}</div><div class="dlg-role">${cfg.role||''}</div></div>
    </div>
    <div class="dlg-text">${cfg.text}</div>
    ${cfg.timer?`<div class="dlg-timer"><div class="dlg-timer-fill" style="width:100%"></div></div>`:''}
    <div class="dlg-choices"></div>`;
  const cw=box.querySelector('.dlg-choices');
  (cfg.choices||[]).forEach(ch=>{
    const b=el('button','choice-btn'+(ch.danger?' danger':''));
    b.innerHTML=`<span>${ch.label}</span>${ch.hint?`<span class="hint">${ch.hint}</span>`:''}`;
    b.onclick=()=>{ sfx('click'); ch.run&&ch.run(); };
    cw.appendChild(b);
  });
  if(cfg.timer){
    let rem=cfg.timer;
    const fill=box.querySelector('.dlg-timer-fill');
    clearInterval(dialogTimer);
    dialogTimer=setInterval(()=>{
      rem-=.1; fill.style.width=clamp(rem/cfg.timer*100,0,100)+'%';
      if(rem<=0){ clearInterval(dialogTimer); dialogOnTimeout&&dialogOnTimeout(); }
    },100);
    dialogOnTimeout=cfg.onTimeout||null;
  }else{clearInterval(dialogTimer);dialogOnTimeout=null;}
}
function closeDialog(){
  dialogOpen=false;clearInterval(dialogTimer);dialogOnTimeout=null;
  $('#dialogBox').classList.add('hidden');
}
function isDialogOpen(){return dialogOpen}

/* ---------- HUD ---------- */
function updateHUD(){
  $('#hudDay').textContent=`${G.day} / ${G.maxDay}`;
  $('#hudMoney').textContent=fmt(G.money);
  $('#hudRep').textContent=Math.round(G.reputation);
  $('#hudVol').textContent=G.volunteers;
  $('#hudSat').textContent=Math.round(G.satisfaction);
  const names={donation:['Chanda Collection','🪙'],planning:['Planning & Procurement','📋'],
    construction:['Pandal Construction','🔨'],agaman:['Agaman — Idol Arrival','🐘'],
    utsav:['Utsav — The Festival','🪔'],visarjan:['Visarjan — Grand Finale','🌊'],score:['Final Scorecard','🏆']};
  const n=names[G.phase]||['—','🪔'];
  $('#hudPhase').textContent=n[0];$('#hudPhaseIco').textContent=n[1];
  $('#hudSatChip').classList.add('sat-pulse');
  setTimeout(()=>$('#hudSatChip').classList.remove('sat-pulse'),250);
}
function gainMoney(n,reason){
  if(n<0&&G.money+n<0){n=-G.money;} // treasury never goes negative
  G.money+=n;
  if(reason)toast(`${n>0?'+':''}${fmt(n)} — ${reason}`,n>0?'good':'bad');
  updateHUD();
}
function gainRep(n,reason){
  G.reputation=clamp(G.reputation+n,0,100);
  if(n!==0&&reason)toast(`Reputation ${n>0?'+':''}${Math.round(n)} — ${reason}`,n>0?'good':'bad');
  updateHUD();
}

/* ---------- NPC archetypes & roster (Phase 1) ---------- */
const ARCHETYPES={
  elder:{label:'Generous Elder',icon:'👴',base:[800,2500],patience:3,warm:1.3,
    greet:['"Aho! The mandal has come! Come in, come in, sit for chai first."',
           '"Every year I wait for you beta. Ganpati blessings on you!"',
           '"My father helped start this mandal in 1972. Take, take my contribution."'],
    push:'"Arre, my pension is small but my heart is big... okay okay, a little more for Bappa."'},
  shop:{label:'Negotiating Shopkeeper',icon:'🧑‍💼',base:[500,1800],patience:2,warm:1.0,
    greet:['"Business is slow yaar... how much does the mandal expect?"',
           '"I already gave to the other mandal! ...fine, how much?"',
           '"Write my shop name big on the banner, then we talk!"'],
    push:'"Okay okay, final rate — like a wholesale deal. But banner name BIG, promise?"'},
  pro:{label:'Busy Professional',icon:'💼',base:[1000,3000],patience:1,warm:.8,
    greet:['"I have a call in 5 minutes. Make it quick, please."',
           '"Send me the UPI QR — I\'ll transfer right now."',
           '"Sorry sorry, WFH today. Yes, count me in."'],
    push:'"I\'m really swamped... let\'s not drag this out."'},
  youth:{label:'Enthusiastic Youth',icon:'🧑‍🎓',base:[100,400],patience:3,warm:1.1,
    greet:['"Bappa Morya!! I was literally waiting for you guys!"',
           '"Can I volunteer?? I can carry the box, make reels, everything!"',
           '"Our whole class is donating. Count me in first!"'],
    push:'"I only have pocket money left, but I\'ll spread the word on insta!"'},
  skeptic:{label:'Skeptical Resident',icon:'🧐',base:[0,600],patience:2,warm:.5,
    greet:['"Last year the sound system blasted till 2 AM. Why should I give?"',
           '"Where does this money actually go? Show me accounts."',
           '"These festivals are just show-off now."'],
    push:'"Hmph. Fine — but I\'ll be watching how you spend it."'},
  big:{label:'Wealthy Patron',icon:'🤵',base:[3000,8000],patience:2,warm:1.0,minRep:35,
    greet:['"The whole neighborhood depends on these traditions. I support you."',
           '"My family has donated to this mandal for three generations."',
           '"Tell me what you need — the mandal should not compromise this year."'],
    push:'"Generosity has no limit when it is for Bappa."'},
};
const NPC_ROSTER=[
  {name:'Deshpande Kaka',arch:'elder',x:330,y:260,shirt:'#a16207'},
  {name:'Sunita Aaji',arch:'elder',x:1640,y:300,shirt:'#be185d'},
  {name:'Lakshmi Tai',arch:'elder',x:640,y:1130,shirt:'#7c3aed'},
  {name:'Ramesh (Kirana Store)',arch:'shop',x:760,y:420,shirt:'#0f766e'},
  {name:'Imran Bhai (Fruit Stall)',arch:'shop',x:1280,y:760,shirt:'#15803d'},
  {name:'Rafiq (Electronics)',arch:'shop',x:250,y:820,shirt:'#1d4ed8'},
  {name:'Neha (IT Manager)',arch:'pro',x:1700,y:880,shirt:'#b45309'},
  {name:'Vikram (Sales Head)',arch:'pro',x:1090,y:300,shirt:'#334155'},
  {name:'Fernandes Sir',arch:'pro',x:520,y:620,shirt:'#4c1d95'},
  {name:'Chotu (College Student)',arch:'youth',x:930,y:900,shirt:'#e11d48'},
  {name:'Priya (School Captain)',arch:'youth',x:1420,y:520,shirt:'#0891b2'},
  {name:'Ganesh (Gym Trainer)',arch:'youth',x:340,y:1030,shirt:'#65a30d'},
  {name:'Anna (Retired Uncle)',arch:'skeptic',x:1160,y:1140,shirt:'#57534e'},
  {name:'Mrs. Kulkarni (Secretary)',arch:'skeptic',x:820,y:660,shirt:'#9d174d'},
  {name:'Shinde Seth',arch:'big',x:1660,y:1120,shirt:'#b45309'},
  {name:'Patil Saheb (Neta)',arch:'big',x:150,y:520,shirt:'#f8fafc'},
];
const SKIN_TONES=['#c68642','#e0ac69','#8d5524','#f1c27d','#a1662f'];

/* ---------- Phase 2: allocation categories ---------- */
const ALLOC_CATS=[
  {id:'infra',name:'Pandal Infrastructure',icon:'🎋',
   tiers:[{cost:4000,label:'Basic bamboo frame'},{cost:9000,label:'Reinforced frame + platform'},
          {cost:16000,label:'Premium structure, fireproof fabric'},{cost:26000,label:'Grand multi-dome engineering'}],
   effect:'Structure quality → durability & construction speed'},
  {id:'idol',name:'Idol Quality',icon:'🐘',
   tiers:[{cost:2500,label:'Simple painted idol'},{cost:7000,label:'Fine detailed idol'},{cost:14000,label:'Premium artist idol'},{cost:24000,label:'Grand 12-ft showpiece'}],
   effect:'Crowd awe, satisfaction & creativity'},
  {id:'decor',name:'Decorations',icon:'🌼',
   tiers:[{cost:2000,label:'Paper chains & balloons'},{cost:6000,label:'Marigold & fabric decor'},{cost:12000,label:'Themed artistic decoration'},{cost:20000,label:'Award-winning spectacle'}],
   effect:'Creativity pillar'},
  {id:'sound',name:'Sound System',icon:'🔊',
   tiers:[{cost:1500,label:'Single speaker + mic'},{cost:4500,label:'Full PA system'},{cost:9000,label:'Line-array + dhol mics'},{cost:15000,label:'Concert-grade with DJ console'}],
   effect:'Procession energy & evening programs'},
  {id:'security',name:'Security & Safety',icon:'🚧',
   tiers:[{cost:1500,label:'Ropes & 2 volunteers'},{cost:4000,label:'Barricades + first-aid kit'},{cost:8000,label:'Guards, walkie-talkies, generator'},{cost:14000,label:'Full crowd-control command'}],
   effect:'Crisis handling & crowd safety'},
];

/* ---------- Phase 2: market vendors ---------- */
const VENDORS=[
  {id:'bamboo',name:'Jadhav Bamboo & Fabric Depot',icon:'🎋',item:'Bamboo poles, ropes & canopy fabric',
   ask:9000,floor:5800,essential:true,mood:'gruff'},
  {id:'flowers',name:'Phule Mandai Flower Wholesale',icon:'🌼',item:'Marigolds, roses, palms & decor greenery',
   ask:6000,floor:3600,essential:false,mood:'warm'},
  {id:'lights',name:'Lakshmi Lighting House',icon:'💡',item:'LED rigs, serial lights & spotlights',
   ask:8000,floor:5000,essential:false,mood:'business'},
  {id:'soundM',name:'Sur Audio Traders',icon:'🔊',item:'Speakers, amps, mics & dhol set',
   ask:7500,floor:4800,essential:false,mood:'cool'},
  {id:'eco',name:'GreenGanesh Eco Stores',icon:'🌱',item:'Clay (shadu) idol + natural veg colors',
   ask:6500,floor:4200,essential:false,mood:'mission',eco:true},
  {id:'genset',name:'Sharma Generator & Safety',icon:'🔋',item:'Backup generator + first-aid + walkies',
   ask:7000,floor:4400,essential:false,mood:'retired'},
  {id:'tank',name:'Municipal Eco-Immersion Tank Booking',icon:'🌊',item:'Reserved artificial tank slot for visarjan',
   ask:4000,floor:2500,essential:false,mood:'clerk',tank:true},
];

/* ---------- Phase 2: contractors ---------- */
const CONTRACTOR_TYPES=[
  {id:'structure',name:'Structural Workers',icon:'🔨',tiers:[
    {cost:3000,label:'Local cousins',speed:.8,risk:1.6},
    {cost:7000,label:'Experienced crew',speed:1.15,risk:1.0},
    {cost:13000,label:'Pro mandal builders',speed:1.6,risk:.55}]},
  {id:'electric',name:'Electricians',icon:'⚡',tiers:[
    {cost:1500,label:'Jugaad wiring',speed:.8,risk:1.8},
    {cost:3500,label:'Licensed electrician',speed:1.1,risk:.8},
    {cost:6500,label:' certified electrical team',speed:1.4,risk:.35}]},
  {id:'paint',name:'Painters & Decorators',icon:'🎨',tiers:[
    {cost:1200,label:'Enthusiastic amateurs',speed:.8,risk:1.2},
    {cost:3000,label:'Art college students',speed:1.1,risk:.9},
    {cost:6000,label:'Award-winning artists',speed:1.5,risk:.4}]},
  {id:'soundEng',name:'Sound Engineers',icon:'🎛️',tiers:[
    {cost:1000,label:'Neighbor with a mixer',speed:.8,risk:1.7},
    {cost:2500,label:'Local DJ crew',speed:1.1,risk:.9},
    {cost:5000,label:'Event sound company',speed:1.4,risk:.4}]},
];

/* ---------- Phase 3: themes / lights / flowers ---------- */
const THEMES=[
  {id:'classic',name:'Classic Traditional',icon:'🛕',cost:2000,cre:8,c1:'#ff9933',c2:'#e11d48',c3:'#fbbf24'},
  {id:'forest',name:'Eco Forest (Living Plants)',icon:'🌿',cost:3500,cre:16,c1:'#16a34a',c2:'#15803d',c3:'#86efac',ecoBonus:true},
  {id:'bolly',name:'Bollywood Glam',icon:'🎬',cost:4000,cre:12,c1:'#e11d48',c2:'#7c3aed',c3:'#f472b6'},
  {id:'royal',name:'Royal Golden Fort',icon:'👑',cost:5500,cre:14,c1:'#b45309',c2:'#7c2d12',c3:'#ffd700'},
  {id:'space',name:'Chandrayaan Space Theme',icon:'🚀',cost:5000,cre:18,c1:'#1e3a8a',c2:'#0f172a',c3:'#60a5fa'},
];
const LIGHTS=[
  {id:'none',name:'Basic bulbs',icon:'💡',cost:0,cre:2,colors:['#ffe08a','#ffe08a','#ffe08a']},
  {id:'serial',name:'Serial light curtains',icon:'✨',cost:1500,cre:6,colors:['#ffe08a','#ffb347','#fff']},
  {id:'rgb',name:'RGB Programmable LEDs',icon:'🌈',cost:3500,cre:10,colors:['#ff9933','#22c55e','#3b82f6','#e11d48','#fbbf24']},
  {id:'laser',name:'Laser + projection mapping',icon:'🔦',cost:6000,cre:15,colors:['#60a5fa','#f472b6','#4ade80','#fbbf24','#c084fc']},
];
const FLOWERS=[
  {id:'basic',name:'Simple marigold strings',icon:'🌼',cost:1000,cre:4},
  {id:'rich',name:'Marigold + rose cascades',icon:'🌹',cost:2500,cre:9},
  {id:'art',name:'Flower artwork & torans',icon:'💐',cost:4500,cre:14},
];

/* ---------- Phase 5: daily activities ---------- */
const ACTIVITIES=[
  {id:'aarti',name:'Morning & Evening Aarti',icon:'🪔',cost:500,sat:8,must:true},
  {id:'dance',name:'Cultural Dance Night',icon:'💃',cost:2500,sat:12},
  {id:'music',name:'Bhajan & Orchestra Evening',icon:'🎶',cost:2000,sat:10},
  {id:'modak',name:'Modak-Eating Competition',icon:'🥟',cost:800,sat:9,fun:true},
  {id:'food',name:'Food Stalls (vada pav, bhel)',icon:'🍛',cost:1500,sat:7,revenue:2200},
  {id:'kids',name:'Kids Drawing Competition',icon:'🖍️',cost:600,sat:6},
  {id:'dj',name:'DJ Dhol Night (loud!)',icon:'🎧',cost:3000,sat:14,risk:'noise'},
  {id:'dahi',name:'Dahi Handi Show',icon:'🏺',cost:1800,sat:10,risk:'safety'},
];

/* ---------- scoring ---------- */
function computeScores(){
  const d=DIFF[G.difficulty];
  // Budget: leftover money + collection vs spend efficiency
  const spent=Math.max(1,G.chandaCollected+ (d.money) -G.money);
  const budget=clamp(35+ (G.money/(d.money*.5))*40 + (G.chandaCollected/(d.money*.8))*25,10,100);
  // Creativity: themes, lights, flowers, idol tier, decor alloc
  let cre=10;
  if(G.theme)cre+=G.theme.cre; if(G.lights)cre+=G.lights.cre; if(G.flowers)cre+=G.flowers.cre;
  cre+=G.alloc.decor*4+G.alloc.idol*5;
  if(G.eco.naturalColors)cre+=4; if(G.eco.clay)cre+=4;
  cre+=G.construction.progress>=100?10:-15;
  if(G.processionBest>60)cre+=5;
  const creativity=clamp(cre,10,100);
  const reputation=clamp(G.reputation,10,100);
  const satisfaction=clamp(G.festival.avgSat,10,100);
  return {budget:Math.round(budget),creativity:Math.round(creativity),
    reputation:Math.round(reputation),satisfaction:Math.round(satisfaction)};
}
function ecoMultiplier(){
  let m=1;
  if(G.eco.clay)m+=.10;
  if(G.eco.naturalColors)m+=.10;
  if(G.eco.tank)m+=.15;
  return m;
}
function gradeOf(pct){
  if(pct>=92)return{g:'S',title:'Mandal Samrat — Legend of the Lane!',msg:'Bappa himself seems to smile on your mandal.'};
  if(pct>=82)return{g:'A',title:'Sarvottam Mandal — City Talk of the Town',msg:'Newspapers covered your pandal. Rival mandals are taking notes.'};
  if(pct>=70)return{g:'B',title:'Uttam Mandal — Beloved by the Neighborhood',msg:'A joyful, well-run festival. Aaji-Kaka are proud of you.'};
  if(pct>=55)return{g:'C',title:'Achha Mandal — A Respectable Effort',msg:'Not perfect, but Bappa\'s blessings are with the honest.'};
  return{g:'D',title:'Naveen Mandal — Room to Grow',msg:'Every great mandal started somewhere. Next year will be bigger!'};
}

/* ---------- phase flow ---------- */
const PHASE_DAYS={
  donation:[1,6], planning:[7,12], construction:[13,18],
  agaman:[19,19], utsav:[20,29], visarjan:[30,30]
};
function startGame(diff,challengeId){
  Object.assign(G,{day:1,difficulty:diff,challenge:challengeById(challengeId||dailyChallenge().id),runRecorded:false,money:DIFF[diff].money,reputation:20,volunteers:2,
    satisfaction:70,phase:'donation',weather:'clear',chandaCollected:0,
    alloc:{infra:0,idol:0,decor:0,sound:0,security:0},purchases:{},
    contractors:{structure:0,electric:0,paint:0,soundEng:0},
    idol:{tier:1,eco:false,scale:1},theme:null,lights:null,flowers:null,
    construction:{progress:0,durability:100,morale:80},
    festival:{avgSat:70,dayLogs:[]},eco:{clay:false,naturalColors:false,tank:false},
    scores:{budget:0,creativity:0,reputation:0,satisfaction:0},
    stats:{donations:0,npcsHelped:0,eventsSolved:0,eventsFailed:0},processionBest:0});
  G.chandaGoalTotal=Math.round(DIFF[diff].money*.9);
  setPhase('donation');
}
function setPhase(p){
  if(App&&App.exit)App.exit();
  G.phase=p;
  $('#panel').classList.add('hidden');$('#panel').innerHTML='';
  closeDialog();Particles.clear();Audio_.stopDhol();
  PHASES[p].enter();
  App=PHASES[p];
  updateHUD();
}
function nextDay(n=1){
  G.day=Math.min(G.maxDay,G.day+n);
  rollWeather();
  // time-of-day drifts through the day
  updateHUD();
}
const PHASES={}; // filled by phase*.js
let App=null;    // current phase controller
