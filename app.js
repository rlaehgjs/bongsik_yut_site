
const YUT=[
  {d:1,p:.25,mo:0},{d:2,p:.375,mo:0},{d:3,p:.25,mo:0},
  {d:4,p:.0625,mo:0},{d:5,p:.0625,mo:1}
];
const TRACK={1:1,2:2,3:3,4:4,5:5,6:null,7:5,8:4,9:3,10:2,11:1};
let VALUES={"0":1,"1-6":2,"7-9":8,"10-12":15,"13-15":100,"16-19":800,"20+":5000};
let results=[];

function mult(n,mo){let b=n<=3?1:n<=5?2:n<=7?3:n<=9?5:10;return b+mo}
function bucket(s){if(s===0)return"0";if(s<=6)return"1-6";if(s<=9)return"7-9";if(s<=12)return"10-12";if(s<=15)return"13-15";if(s<=19)return"16-19";return"20+"}

function distFor(layout){
  const memo=new Map();
  function dp(pos,pieces,n,mo){
    const key=[pos,pieces.join(""),n,mo].join("|");
    if(memo.has(key))return memo.get(key);
    const out=new Map();
    const add=(s,p)=>out.set(s,(out.get(s)||0)+p);
    for(const y of YUT){
      let nn=n+1, mm=mo+y.mo, np=pos+y.d;
      if(np>=12){add(pieces.reduce((a,b)=>a+b,0)*mult(nn,mm),y.p);continue}
      let q=[...pieces], cell=TRACK[np];
      if(cell!==null)q[cell-1]=0;
      if(q.every(x=>x===0)){add(0,y.p);continue}
      for(const [s,p] of dp(np,q,nn,mm))add(s,y.p*p);
    }
    memo.set(key,out);return out;
  }
  return dp(0,layout,0,0);
}
function permutations(){
  let out=[];
  for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(let c=0;c<5;c++){
    if(a===b||a===c||b===c)continue;
    let x=[0,0,0,0,0];x[a]=3;x[b]=2;x[c]=1;out.push(x);
  }
  return out;
}
function analyze(layout){
  const d=distFor(layout), probs={"0":0,"1-6":0,"7-9":0,"10-12":0,"13-15":0,"16-19":0,"20+":0};
  let expectedScore=0;
  for(const [s,p] of d){expectedScore+=s*p;probs[bucket(s)]+=p}
  let expectedReward=Object.keys(probs).reduce((z,k)=>z+probs[k]*VALUES[k],0);
  const at=t=>[...d].reduce((z,[s,p])=>z+(s>=t?p:0),0);
  return {
    layout,d,probs,expectedScore,expectedReward,
    p20:at(20),
    p16:at(16),
    p2only:probs["16-19"],
    p13:at(13),
    p3only:probs["13-15"]
  };
}
function calculate(){results=permutations().map(analyze);render()}
function fmtPct(x){return (x*100).toFixed(4)+"%"}
function metricLabel(m){return {
  expectedReward:"상품가치 EV",
  p20:"1등 (20점+) 확률",
  p16:"2등 이상 (16점+) 확률",
  p2only:"2등만 (16~19점) 확률",
  p13:"3등 이상 (13점+) 확률",
  p3only:"3등만 (13~15점) 확률",
  expectedScore:"평균점수"
}[m]}
function metricValue(r,m){return m.startsWith("p")?fmtPct(r[m]):r[m].toFixed(4)}
function tierOf(i){return i<6?"S":i<18?"A":i<36?"B":"C"}
function layoutHTML(x){return `<div class="layout">${x.map((v,i)=>`<div class="cell ${v?'piece'+v:''}" title="${i+1}번 칸">${v||"·"}</div>`).join("")}</div>`}
function card(r,i,m){
 return `<div class="card" onclick="showDetail(${r.id})"><div class="cardtop"><span>#${i+1} · ${tierOf(i)} TIER</span><span>${metricLabel(m)}</span></div>${layoutHTML(r.layout)}
 <div class="metricval">${metricValue(r,m)}</div><div class="mini">EV ${r.expectedReward.toFixed(2)} · 20+ ${fmtPct(r.p20)}</div></div>`;
}
function render(){
 const m=document.querySelector("#metric").value;
 let ranked=[...results].sort((a,b)=>b[m]-a[m]); ranked.forEach((r,i)=>r.id=results.indexOf(r));
 const best=ranked[0];
 document.querySelector("#summary").innerHTML=`
 <div class="stat"><span>최적 기준</span><b>${metricLabel(m)}</b></div>
 <div class="stat"><span>1위 값</span><b>${metricValue(best,m)}</b></div>
 <div class="stat"><span>1위 상품가치 EV</span><b>${best.expectedReward.toFixed(2)}</b></div>
 <div class="stat"><span>1위 20점+</span><b>${fmtPct(best.p20)}</b></div>`;
 const tiers=["S","A","B","C"];
 document.querySelector("#tiers").innerHTML=tiers.map(t=>{
   let cards=ranked.map((r,i)=>({r,i})).filter(x=>tierOf(x.i)===t).map(x=>card(x.r,x.i,m)).join("");
   return `<div class="tierrow"><div class="tierbadge">${t}</div><div class="cards">${cards}</div></div>`;
 }).join("");
 renderRows(ranked,m);
}
function renderRows(ranked,m){
 const q=document.querySelector("#search").value.trim().replace(/\s/g,"");
 let filtered=ranked.map((r,i)=>({r,i})).filter(({r})=>!q||r.layout.map(x=>x||"-").join(",").includes(q));
 document.querySelector("#rows").innerHTML=filtered.map(({r,i})=>`<tr>
 <td>${i+1}</td><td>${tierOf(i)}</td><td>${r.layout.map(x=>x||"–").join(" · ")}</td>
 <td>${r.expectedReward.toFixed(4)}</td><td>${r.expectedScore.toFixed(4)}</td>
 <td>${fmtPct(r.p20)}</td><td>${fmtPct(r.p16)}</td><td>${fmtPct(r.p13)}</td>
 <td><button class="detailbtn" onclick="showDetail(${r.id})">보기</button></td></tr>`).join("");
}
function showDetail(id){
 const r=results[id], keys=["0","1-6","7-9","10-12","13-15","16-19","20+"];
 document.querySelector("#detailContent").innerHTML=`<div class="eyebrow">Layout detail</div><h2>배치 상세 분석</h2>${layoutHTML(r.layout)}
 <p>상품가치 EV <b>${r.expectedReward.toFixed(6)}</b> · 평균점수 <b>${r.expectedScore.toFixed(6)}</b></p>
 <div class="bars">${keys.map(k=>`<div class="barrow"><span>${k}점</span><div class="bar"><div class="fill" style="width:${Math.min(100,r.probs[k]*100)}%"></div></div><b>${fmtPct(r.probs[k])}</b></div>`).join("")}</div>
 <h3>정확한 최종점수 분포</h3><p>${[...r.d].sort((a,b)=>a[0]-b[0]).map(([s,p])=>`${s}점 ${fmtPct(p)}`).join(" · ")}</p>`;
 document.querySelector("#detail").showModal();
}
document.querySelector("#metric").addEventListener("change",render);
document.querySelector("#search").addEventListener("input",render);
document.querySelector("#recalc").addEventListener("click",()=>{
 document.querySelectorAll("[data-tier]").forEach(el=>VALUES[el.dataset.tier]=Number(el.value)||0);calculate();
});
calculate();
