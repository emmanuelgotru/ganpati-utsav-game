/* ================= phase2.js — Planning & Procurement ================= */
'use strict';
PHASES.planning=(()=>{
let tab='alloc', panel;

function enter(){
  G.tod=.45;
  banner('Phase 2 — Planning & Procurement','Days 7–12 · Budget the treasury, haggle at the markets, hire the crew',3200);
  panel=$('#panel');panel.classList.remove('hidden');
  render();
}
function exit(){panel.classList.add('hidden');}

function render(){
  panel.innerHTML=`
  <div class="sheet">
    <h2>📋 Mandal Planning Office <span style="font-size:.8rem;color:#a16207">Day ${G.day}/30 · Treasury ${fmt(G.money)}</span></h2>
    <div class="sub">Chanda collected so far: <b>${fmt(G.chandaCollected)}</b> — spend wisely, every pillar of the final score depends on it.</div>
    <div class="tabs">
      <button class="tab-btn ${tab==='alloc'?'active':''}" data-t="alloc">💰 Budget Allocation</button>
      <button class="tab-btn ${tab==='market'?'active':''}" data-t="market">🛒 Wholesale Market</button>
      <button class="tab-btn ${tab==='staff'?'active':''}" data-t="staff">👷 Staffing</button>
    </div>
    <div id="tabBody"></div>
    <div class="row spread mt" style="border-top:2px dashed #dfc9a3;padding-top:14px">
      <button class="btn ghost" id="btnNextDayP">🌙 Next Day (rest & research)</button>
      <button class="btn big" id="btnProceed">Start Construction →</button>
    </div>
  </div>`;
  panel.querySelectorAll('.tab-btn').forEach(b=>b.onclick=()=>{sfx('click');tab=b.dataset.t;render();});
  $('#btnNextDayP').onclick=()=>{
    if(G.day>=12){toast('Day 12 — construction must begin!','bad');return}
    nextDay(1);sfx('click');toast(`🌙 Day ${G.day} · ${weatherInfo().icon} ${weatherInfo().name}`);render();
  };
  $('#btnProceed').onclick=proceed;
  const body=panel.querySelector('#tabBody');
  if(tab==='alloc')renderAlloc(body);
  if(tab==='market')renderMarket(body);
  if(tab==='staff')renderStaff(body);
}

/* ---------- allocation ---------- */
function renderAlloc(body){
  body.innerHTML=`<div class="sub mb">Each level up improves quality permanently. The idol tier also decides the crowd's first "WOW!".</div>`;
  for(const cat of ALLOC_CATS){
    const lvl=G.alloc[cat.id];
    const next=cat.tiers[lvl];
    const row=el('div','tier-row');
    row.innerHTML=`
      <div>
        <div class="t-name">${cat.icon} ${cat.name} <span style="color:#a16207">Lv.${lvl}/4</span></div>
        <div class="t-desc">${cat.effect}${next?` &mdash; Next: <b>${next.label}</b>`:' &mdash; <b style="color:#0f7a35">MAX</b>'}</div>
        <div class="tier-pips">${[0,1,2,3].map(i=>`<div class="pip ${i<lvl?'on':''}"></div>`).join('')}</div>
      </div>
      <div style="text-align:right">
        ${next?`<div class="price">${fmt(next.cost)}</div><button class="btn" ${G.money<next.cost?'disabled':''}>Upgrade</button>`:''}
      </div>`;
    const btn=row.querySelector('button');
    if(btn)btn.onclick=()=>{
      if(G.money<next.cost)return;
      gainMoney(-next.cost,cat.name+' upgraded');sfx('good');
      G.alloc[cat.id]++;
      if(cat.id==='idol'){G.idol.tier=G.alloc.idol;G.idol.scale=.8+G.alloc.idol*.15;}
      Particles.confetti(innerWidth/2,innerHeight/3,14);
      render();updateHUD();
    };
    body.appendChild(row);
  }
}

/* ---------- market & haggling ---------- */
function renderMarket(body){
  body.innerHTML=`<div class="sub mb">Haggle hard — vendors respect reputation. Essential: you cannot build without <b>bamboo & fabric</b>.</div><div class="grid-cards"></div>`;
  const grid=body.querySelector('.grid-cards');
  for(const v of VENDORS){
    const owned=!!G.purchases[v.id];
    const card=el('div','card');
    card.innerHTML=`
      <h3>${v.icon} ${v.name} ${v.essential?'<span style="color:#dc2626;font-size:.7rem">ESSENTIAL</span>':''}</h3>
      <div class="desc">${v.item}</div>
      ${owned?`<div class="owned">✔ Purchased for ${fmt(G.purchases[v.id].price)} ${v.eco?'🌱':''}${v.tank?'🌊':''}</div>`:
        `<div class="price">Asking: ${fmt(v.ask)}</div><button class="btn">🗣️ Haggle & Buy</button>`}`;
    const btn=card.querySelector('button');
    if(btn)btn.onclick=()=>haggle(v);
    grid.appendChild(card);
  }
}
function haggle(v){
  let ask=v.ask, floor=v.floor, patience=3, mood=0;
  const flavor={gruff:'He chews paan and looks unimpressed.',warm:'She garlands you with marigolds and quotes a price.',
    business:'He shows you a glossy catalogue.',cool:'He nods slowly to a dhol beat on his phone.',
    mission:'"For the environment AND Bappa — a fair price," she says.',retired:'The old man adjusts his glasses and sighs.',
    clerk:'The babu stamps a form without looking up.'}[v.mood];
  function node(msg){
    showDialog({avatar:v.icon,name:v.name,role:`Wholesale vendor · patience ${'❤️'.repeat(Math.max(0,patience))}${'🖤'.repeat(3-Math.max(0,patience))}`,
      text:`${msg}<br><br><i>Current asking price: <b>${fmt(ask)}</b></i>`,
      choices:[
        {label:`💵 Offer ${fmt(Math.round(ask*.65))}`,hint:'Hardball',danger:mood>1,run:()=>{
          patience--;
          if(ask*.65>=floor)buy(ask*.65,`"Deal! You drive a hard bargain."`);
          else if(patience<=0)angry();
          else{mood++;ask=Math.round(ask*.95);node(`"${Math.round(ask*.65)}?! Are you joking?" ${flavor} He comes down slightly.`);}
        }},
        {label:`💵 Offer ${fmt(Math.round(ask*.85))}`,hint:'Fair',run:()=>{
          if(ask*.85>=floor)buy(ask*.85,`"Done deal. You\'re fair people."`);
          else{patience--;mood=Math.max(0,mood-1);node(`"Hmm... still a bit low. Meet me halfway?"`);}
        }},
        {label:'🙏 Sweet-talk: praise their quality + mention the mandal\'s reputation',hint:`Rep ${Math.round(G.reputation)}`,run:()=>{
          const ch=clamp(.3+G.reputation/180+(v.mood==='warm'?.15:0),.15,.9);
          patience--;
          if(Math.random()<ch){floor=Math.round(floor*.88);gainRep(1,'Market charm');
            node(`He beams. "For YOUR mandal... special discount, only for you." (His floor price dropped)`);}
          else node(`"Flattery does not pay my rent, boss." He taps the price list.`);
        }},
        {label:'🚶 Threaten to walk to the rival shop',hint:'Risky!',danger:true,run:()=>{
          patience--;
          if(Math.random()<.5&&mood<2){floor=Math.round(floor*.85);node(`"Wait wait wait! Okay, sit down. Chai? Let\'s talk." (Floor price dropped)`);}
          else{mood=3;angry();}
        }},
        {label:`✅ Just pay the asking ${fmt(ask)}`,hint:'Safe',run:buy(ask,'"Pleasure doing business!"')},
      ]});
    if(patience<=0&&ask>floor*1.3)node.last=true;
  }
  function angry(){
    showDialog({avatar:'😡',name:v.name,role:'Vendor — furious',
      text:`"You waste my time! Price is now <b>${fmt(Math.round(ask*1.15))}</b> — take it or leave it!"`,
      choices:[
        {label:`😓 Apologize & pay ${fmt(Math.round(ask*1.15))}`,run:()=>{buy(ask*1.15,'"Hmph. Apology accepted."');gainRep(-2,'Angered a vendor');}},
        {label:'🚪 Leave the shop',hint:'Come back next day',run:()=>{closeDialog();toast('You left empty-handed. Vendors cool off overnight.','bad');}}
      ]});
  }
  function buy(price,line){
    closeDialog();
    price=Math.round(price);
    if(G.money<price){toast('Not enough treasury money!','bad');return}
    gainMoney(-price,null);sfx('coin');
    G.purchases[v.id]={price};
    if(v.eco){G.eco.clay=true;G.eco.naturalColors=true;G.idol.eco=true;
      G.idol.tier=Math.max(G.idol.tier,1);
      toast('🌱 Clay idol ordered with natural colors — eco bonus unlocked!','good');}
    if(v.tank){G.eco.tank=true;toast('🌊 Artificial immersion tank booked — eco bonus unlocked!','good');}
    Particles.confetti(innerWidth/2,innerHeight/3,16);
    showDialog({avatar:v.icon,name:v.name,role:'Deal closed!',text:`${line}<br><br><b>${v.item}</b> will be delivered to the plot.<br>Paid: ${fmt(price)}`,
      choices:[{label:'✔ Continue shopping',run:()=>{closeDialog();render();updateHUD();}}]});
  }
  node(`${flavor}<br><br>"${v.item} — top quality. ${fmt(ask)}, final price, no bargaining." (He is definitely lying.)`);
}

/* ---------- staffing ---------- */
function renderStaff(body){
  body.innerHTML=`<div class="sub mb">Higher tiers work faster and trigger fewer construction emergencies. Hiring is one-time for the whole build.</div>`;
  for(const ct of CONTRACTOR_TYPES){
    const row=el('div','tier-row');
    const hired=G.contractors[ct.id];
    row.innerHTML=`
      <div>
        <div class="t-name">${ct.icon} ${ct.name}</div>
        <div class="t-desc">${hired?`Hired: <b>${ct.tiers[hired-1].label}</b> (speed ×${ct.tiers[hired-1].speed}, risk ×${ct.tiers[hired-1].risk})`:'Not hired yet'}</div>
      </div>
      <div class="row">
        ${ct.tiers.map((tr,i)=>`<button class="btn ${hired===i+1?'green':''}" data-i="${i}" ${hired>=i+1&&!(hired<i+1)?'':''}>
          ${'⭐'.repeat(i+1)} ${fmt(tr.cost)}<br><span style="font-size:.65rem">${tr.label}</span></button>`).join('')}
      </div>`;
    row.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i;
      if(hired>=i+1){toast('Already hired at this tier or better.');return}
      const refund=hired?ct.tiers[hired-1].cost*.5:0;
      const cost=ct.tiers[i].cost-refund;
      if(G.money<cost){toast('Not enough money!','bad');return}
      gainMoney(-cost,null);
      if(refund)toast(`Upgraded crew (50% refund of previous hire: ${fmt(refund)})`);
      G.contractors[ct.id]=i+1;sfx('good');render();updateHUD();
    });
    body.appendChild(row);
  }
}

/* ---------- proceed ---------- */
function proceed(){
  const problems=[];
  if(!G.purchases.bamboo)problems.push('🎋 Buy bamboo & fabric at the market (essential!)');
  if(!G.contractors.structure)problems.push('🔨 Hire structural workers');
  if(G.alloc.idol===0&&!G.purchases.eco)problems.push('🐘 Fund the idol (allocation or eco clay idol)');
  if(problems.length){
    showDialog({avatar:'⚠️',name:'Mandal Secretary',role:'Checklist incomplete',
      text:`Bhai, we cannot start construction yet:<br><br>${problems.map(p=>'• '+p).join('<br>')}`,
      choices:[{label:'↩ Back to planning',run:closeDialog}]});
    return;
  }
  G.day=13;rollWeather();
  setPhase('construction');
}
return {enter,exit,render};
})();
