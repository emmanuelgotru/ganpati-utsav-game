/* ================= engagement.js — Round 2 replayability + leaderboards ================= */
'use strict';

const ENGAGEMENT_KEY='ganpati-utsav-engagement-v1';
const ENGAGEMENT_CHALLENGES=[
  {id:'eco-sankalp',icon:'🌱',name:'Eco Sankalp',desc:'Choose clay, natural colours and a tank immersion.',bonus:8,
    check:()=>G.eco.clay&&G.eco.naturalColors&&G.eco.tank},
  {id:'jan-seva',icon:'🙏',name:'Jan Seva',desc:'Build trust: 75+ reputation and 80+ crowd joy.',bonus:6,
    check:()=>G.reputation>=75&&G.festival.avgSat>=80},
  {id:'budget-buddhi',icon:'💰',name:'Budget Buddhi',desc:'Meet the chanda goal and finish with 40% of your treasury.',bonus:7,
    check:()=>G.chandaCollected>=G.chandaGoalTotal&&G.money>=DIFF[G.difficulty].money*.4},
  {id:'utsav-utsaha',icon:'🎪',name:'Utsav Utsaha',desc:'Solve four crises and keep the festival moving.',bonus:6,
    check:()=>G.stats.eventsSolved>=4&&G.festival.dayLogs.length>=8},
];

function engagementDateKey(d=new Date()){
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function dailyChallenge(){
  const key=engagementDateKey();
  let n=0;for(const c of key)n=(n*31+c.charCodeAt(0))>>>0;
  return ENGAGEMENT_CHALLENGES[n%ENGAGEMENT_CHALLENGES.length];
}
function challengeById(id){return ENGAGEMENT_CHALLENGES.find(c=>c.id===id)||dailyChallenge()}
function challengeResult(challenge){
  const c=challenge||dailyChallenge();
  const complete=!!(c&&c.check&&c.check());
  return {id:c.id,name:c.name,icon:c.icon,desc:c.desc,complete,bonus:complete?c.bonus:0};
}
function safeText(value){
  return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function profileDefaults(){return {name:'Mandal Chief',runs:0,streak:0,lastDate:'',bestByDifficulty:{galli:0,raja:0},achievements:[],records:[]}}
function loadEngagement(){
  try{
    const raw=localStorage.getItem(ENGAGEMENT_KEY);const p=raw?JSON.parse(raw):{};
    const d=profileDefaults();
    return Object.assign(d,p,{bestByDifficulty:Object.assign(d.bestByDifficulty,p.bestByDifficulty||{}),records:Array.isArray(p.records)?p.records:[],achievements:Array.isArray(p.achievements)?p.achievements:[]});
  }catch(e){return profileDefaults()}
}
function saveEngagement(p){try{localStorage.setItem(ENGAGEMENT_KEY,JSON.stringify(p))}catch(e){}return p}
function localScoreRows(){return loadEngagement().records.slice().sort((a,b)=>b.score-a.score||String(a.date).localeCompare(String(b.date))).slice(0,10)}
function achievementCatalog(){return [
  {id:'first-aarti',icon:'🪔',name:'First Aarti',desc:'Complete your first festival run.',check:r=>r.runsBefore<1},
  {id:'eco-guardian',icon:'🌿',name:'Eco Guardian',desc:'Make all three eco-friendly choices.',check:r=>r.ecoAll},
  {id:'crowd-favorite',icon:'😊',name:'Crowd Favorite',desc:'Reach 85+ average visitor joy.',check:r=>r.satisfaction>=85},
  {id:'crisis-manager',icon:'🛡️',name:'Crisis Manager',desc:'Solve four crises with no failures.',check:r=>r.eventsSolved>=4&&r.eventsFailed===0},
  {id:'bappa-blessed',icon:'🏆',name:'Bappa Blessed',desc:'Earn an S grade.',check:r=>r.grade==='S'},
  {id:'two-paths',icon:'🛣️',name:'Two Paths',desc:'Play both Galli and Raja difficulties.',check:r=>r.difficultiesPlayed&&r.difficultiesPlayed.length>=2},
]}
function achievementsForRun(result,profile){
  const unlocked=[];const prior=profile.achievements||[];
  for(const a of achievementCatalog())if(a.check(result)&&!prior.includes(a.id))unlocked.push(a.id);
  return unlocked;
}
function makeRunRecord(result,name){
  return {id:'run-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:(name||'Mandal Chief').trim().slice(0,22)||'Mandal Chief',score:result.total,grade:result.grade,
    difficulty:result.difficulty,challenge:result.challengeName,date:new Date().toISOString()};
}
function recordRun(result){
  const p=loadEngagement();
  const previousRuns=p.runs||0;
  const previousDates=p.lastDate;
  const today=engagementDateKey();
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  p.streak=previousDates===engagementDateKey(yesterday)?(p.streak||0)+1:previousDates===today?(p.streak||1):1;
  p.lastDate=today;p.runs=previousRuns+1;
  const diff=result.difficulty||'galli';p.bestByDifficulty[diff]=Math.max(p.bestByDifficulty[diff]||0,result.total||0);
  p.difficultiesPlayed=Array.from(new Set([...(p.difficultiesPlayed||[]),diff]));
  const runResult=Object.assign({},result,{runsBefore:previousRuns,difficultiesPlayed:p.difficultiesPlayed});
  const unlocked=achievementsForRun(runResult,p);
  p.achievements=Array.from(new Set([...(p.achievements||[]),...unlocked]));
  const record=makeRunRecord(result,p.name);p.records=[record,...(p.records||[])].slice(0,50);
  saveEngagement(p);return {profile:p,record,unlocked};
}
function renameLocalRecord(id,name){
  const p=loadEngagement();const row=p.records.find(r=>r.id===id);
  if(row)row.name=(name||p.name||'Mandal Chief').trim().slice(0,22)||'Mandal Chief';
  if(name&&name.trim())p.name=name.trim().slice(0,22);saveEngagement(p);return row;
}
function leaderboardRows(rows,empty='No scores yet — make the first offering!'){
  if(!rows||!rows.length)return `<div class="leader-empty">${empty}</div>`;
  return rows.map((r,i)=>`<div class="leader-row ${i===0?'leader-top':''}">
    <span class="leader-rank">${['🥇','🥈','🥉'][i]||String(i+1).padStart(2,'0')}</span>
    <span class="leader-name">${safeText(r.name)}</span>
    <span class="leader-meta">${r.difficulty==='raja'?'🏙️':'🏘️'} ${safeText(r.challenge||'')}${r.grade?` · ${r.grade}`:''}</span>
    <b class="leader-score">${r.score}</b>
  </div>`).join('')
}
function localLeaderboardHtml(){return `<div class="leaderboard-card"><div class="leader-title"><span>📱 This Device</span><small>Top 10 personal scores</small></div><div class="leader-list">${leaderboardRows(localScoreRows())}</div></div>`}
async function communityLeaderboard(){
  try{const r=await fetch('/api/leaderboard',{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('unavailable');const data=await r.json();return Array.isArray(data.scores)?data.scores:[]}
  catch(e){return null}
}
async function submitCommunityScore(result,name){
  try{
    const r=await fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:(name||'Mandal Chief').trim().slice(0,22),score:result.total,grade:result.grade,difficulty:result.difficulty,challenge:result.challengeName})});
    if(!r.ok)throw new Error('unavailable');return await r.json();
  }catch(e){return {ok:false}}
}
async function renderLeaderboards(targetId){
  const target=document.getElementById(targetId);if(!target)return;
  target.innerHTML=localLeaderboardHtml()+`<div class="leaderboard-card" id="communityBoard"><div class="leader-title"><span>🌍 Community Board</span><small>Syncing…</small></div><div class="leader-list"><div class="leader-empty">Loading scores from the mandal network…</div></div></div>`;
  const rows=await communityLeaderboard();const board=document.getElementById('communityBoard');if(!board)return;
  if(rows===null){board.innerHTML=`<div class="leader-title"><span>🌍 Community Board</span><small>Available after deployment</small></div><div class="leader-empty">Play on the deployed link to see everyone's scores here.</div>`;return}
  board.innerHTML=`<div class="leader-title"><span>🌍 Community Board</span><small>All mandals</small></div><div class="leader-list">${leaderboardRows(rows,'No community scores yet — be the first!')}</div>`;
}
async function shareRun(result){
  const text=`I scored ${result.total}/100 (${result.grade}) in Ganpati Bappa Morya! ${result.challengeComplete?'Daily Sankalp complete! ':''}Can your mandal beat me?`;
  try{if(navigator.share){await navigator.share({title:'Ganpati Bappa Morya',text,url:location.href});return true}if(navigator.clipboard){await navigator.clipboard.writeText(text+' '+location.href);toast('Score copied — share it with your mandal!','good');return true}}
  catch(e){}return false;
}
