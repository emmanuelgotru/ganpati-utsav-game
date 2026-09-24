/* Optional global leaderboard for Vercel.
   Set GITHUB_TOKEN in the Vercel project to enable score submissions.
   The public GET path still works without the secret and degrades to an empty board. */
'use strict';

const REPO=process.env.LEADERBOARD_REPO||'emmanuelgotru/ganpati-utsav-game';
const FILE_PATH=process.env.LEADERBOARD_FILE||'data/leaderboard.json';
const API='https://api.github.com';

function headers(){
  const h={Accept:'application/vnd.github+json','User-Agent':'ganpati-utsav-leaderboard'};
  if(process.env.GITHUB_TOKEN)h.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}
function json(res,status,payload){
  res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload));
}
function cleanRows(rows){
  return (Array.isArray(rows)?rows:[]).filter(r=>r&&Number.isFinite(Number(r.score))).map(r=>({
    name:String(r.name||'Mandal Chief').slice(0,22),score:Math.max(0,Math.min(100,Math.round(Number(r.score)))),
    grade:['S','A','B','C','D'].includes(r.grade)?r.grade:'C',difficulty:r.difficulty==='raja'?'raja':'galli',
    challenge:String(r.challenge||'').slice(0,30),date:r.date||new Date().toISOString()
  })).sort((a,b)=>b.score-a.score||String(a.date).localeCompare(String(b.date))).slice(0,50);
}
async function readBoard(){
  const url=`${API}/repos/${REPO}/contents/${FILE_PATH}`;
  const r=await fetch(url,{headers:headers()});
  if(r.status===404)return {rows:[],sha:null};
  if(!r.ok)throw new Error(`GitHub read ${r.status}`);
  const data=await r.json();
  const decoded=Buffer.from(String(data.content||'').replace(/\n/g,''),'base64').toString('utf8');
  let rows=[];try{rows=JSON.parse(decoded)}catch(e){}
  return {rows:cleanRows(rows),sha:data.sha};
}
async function writeBoard(rows,sha){
  const url=`${API}/repos/${REPO}/contents/${FILE_PATH}`;
  const body={message:'Update Ganpati Utsav community leaderboard',content:Buffer.from(JSON.stringify(cleanRows(rows),null,2)+'\n').toString('base64'),branch:'main'};
  if(sha)body.sha=sha;
  const r=await fetch(url,{method:'PUT',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error(`GitHub write ${r.status}`);
}
module.exports=async function(req,res){
  try{
    if(req.method==='GET'){
      if(!process.env.GITHUB_TOKEN){
        const raw=await fetch(`https://raw.githubusercontent.com/${REPO}/main/${FILE_PATH}`);
        if(!raw.ok)return json(res,200,{scores:[]});
        let rows=[];try{rows=await raw.json()}catch(e){}
        return json(res,200,{scores:cleanRows(rows)});
      }
      const board=await readBoard();return json(res,200,{scores:board.rows});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    if(!process.env.GITHUB_TOKEN)return json(res,503,{ok:false,error:'Community submissions are not configured yet'});
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const score=Number(body.score);
    if(!Number.isFinite(score)||score<0||score>100)return json(res,400,{ok:false,error:'Invalid score'});
    const incoming={name:String(body.name||'Mandal Chief').replace(/[<>]/g,'').trim().slice(0,22)||'Mandal Chief',score,
      grade:body.grade,difficulty:body.difficulty,challenge:body.challenge,date:new Date().toISOString()};
    const board=await readBoard();const rows=cleanRows([incoming,...board.rows]);
    await writeBoard(rows,board.sha);return json(res,200,{ok:true,scores:rows});
  }catch(err){console.error(err);return json(res,500,{ok:false,error:'Leaderboard temporarily unavailable'});}
};
