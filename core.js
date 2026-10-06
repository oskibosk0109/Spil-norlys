/* ===================== SLIK-ARENAEN — KERNE ===================== */
var N=96;
var ICONS=["🦊","🐼","🐯","🐸","🦁","🐵","🐨","🦄","🐙","🐝","🦖","🐳","🦉","🐶","🐱"];
var FACE={candy:"🍬",pts:"⭐",jack:"🏆",mine:"💥",safe:"🛡️",spin:"🎡",dud:"▫️"};
var LEVELS=[{p:0,n:"Nybegynder"},{p:15,n:"Sælger"},{p:35,n:"Rutineret"},
            {p:60,n:"Haj"},{p:95,n:"Legende"},{p:140,n:"Slikkonge"}];
var BADGES={
  first:{i:"🎬",n:"Første blod",d:"Åbnede sæsonens første felt"},
  jack:{i:"🏆",n:"Jackpot",d:"Ramte et jackpot-felt i Minefeltet"},
  survivor:{i:"🛡️",n:"Overlever",d:"Overlevede en bombe med skjold"},
  boom:{i:"💥",n:"Minerydder",d:"Sprang på en bombe — det sker"},
  wheel:{i:"🎡",n:"Heldig",d:"Ramte hjulets storgevinst"},
  sharp:{i:"🎯",n:"Skarpskytte",d:"12+ ramt i Skydeteltet"},
  tower:{i:"🏗️",n:"Bygmester",d:"10+ etager i Stabelspillet"},
  gold:{i:"💎",n:"Dybdegraver",d:"Nåede guldlaget og kom op med puljen"},
  tetris:{i:"🧱",n:"Tetris",d:"Ryddede 6+ rækker i ét spil"},
  streak:{i:"🔥",n:"På stribe",d:"KPT over grænsen flere dage i træk"},
  rich:{i:"💰",n:"Formue",d:"Nåede 50 point på én sæson"},
  shop:{i:"🛒",n:"Shopaholic",d:"Købte noget i Kiosken"},
  fly:{i:"🐦",n:"Pilot",d:"24 huller i Flødebolle-flyveren"},
  road:{i:"🐸",n:"Trafikhelt",d:"30 rækker i Over vejen"},
  cookie:{i:"🍪",n:"Mesterbager",d:"6 point i én tur Småkage-klikkeren"},
  lotto:{i:"🎟️",n:"Lykkens pamfilius",d:"Vandt Lotteriet"},
  rps:{i:"✊",n:"Håndens mester",d:"Vandt i Sten, saks, papir"},
  tip:{i:"🔮",n:"Spåmand",d:"Vandt Salgstippet"}
};
var DEFAULT_RULES={sales:[{id:"salg",n:"Salg",c:1,on:true}],csatPer:2,csatCoins:1,kptMin:6.8,kptCoins:1,
  wrapMax:60,wrapCoins:1,confMin:80,confCoins:1,streakDays:3,streakCoins:2,heat:""};
var GAMES=[
  {id:"mine",  ic:"💣",n:"Minefeltet",   d:"Holdets fælles bane. Ét felt pr. mønt — slik, jackpot eller bombe.",t:"risk",tl:"Fælles bane"},
  {id:"tetris",ic:"🧱",n:"Tetris",       d:"60 sekunder. Ryd så mange rækker du kan.",t:"skill",tl:"Færdighed"},
  {id:"wheel", ic:"🎡",n:"Lykkehjulet",  d:"Ét spin på få sekunder. Perfekt når du har travlt.",t:"luck",tl:"Rent held"},
  {id:"shoot", ic:"🎯",n:"Skydeteltet",  d:"20 sekunder. Ram slikket, undgå bomberne.",t:"risk",tl:"Tempo"},
  {id:"stack", ic:"🏗️",n:"Stabelspillet",d:"Tim dit klik og byg tårnet så højt du tør.",t:"safe",tl:"Ingen risiko"},
  {id:"dig",   ic:"⛏️",n:"Guldgraveren", d:"Grav dybere for mere værdi — eller kom op i tide.",t:"risk",tl:"Alt eller intet"},
  /* nye spil (okt. 2026) — coin:true = flytter kun mønter mellem spillerne */
  {id:"fly",   ic:"🐦",n:"Flødebolle-flyveren",d:"Hold flødebollen i luften gennem hullerne. 1 point pr. 4 huller.",t:"skill",tl:"Færdighed"},
  {id:"road",  ic:"🐸",n:"Over vejen",   d:"30 sekunder. Hop over veje og åer — 1 point pr. 5 rækker.",t:"risk",tl:"Tempo"},
  {id:"cookie",ic:"🍪",n:"Småkage-klikkeren",d:"30 sekunder. Klik, bag og køb hjælpere, der bager for dig.",t:"safe",tl:"Ingen risiko"},
  {id:"lotto", ic:"🎟️",n:"Lotteriet",    d:"1 mønt pr. lod. Oskar trækker vinderen, som får hele puljen.",t:"luck",tl:"Rent held",coin:true},
  {id:"rps",   ic:"✊",n:"Sten, saks, papir",d:"Udfordr en kollega om 1 mønt. Vinderen tager begge.",t:"duel",tl:"Mod en kollega",coin:true},
  {id:"tip",   ic:"📊",n:"Salgstippet",  d:"Gæt holdets salg i dag inden fristen. Tættest på vinder puljen.",t:"team",tl:"Holdets salg",coin:true}
];

var S={field:[],players:[],log:[],last:-1,season:1,best:{},spins:0,openAt:null,pending:[],
       shop:[],ex:{on:false,sell:2,buy:5},games:[],rules:clone(DEFAULT_RULES)};
var UI={view:"hq",me:-1,day:{},mode:"error",busy:false,ver:0,pin:"",draft:null,gdraft:null,rdraft:null};

function clone(o){return JSON.parse(JSON.stringify(o))}
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function esc(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}
function fmt(n){n=Math.round(n*100)/100;return String(n).replace(".",",")}
function upgradeState(s){
  s.pending=s.pending||[];s.shop=s.shop||[];s.games=s.games||[];s.players=s.players||[];
  s.ex=s.ex||{on:false,sell:2,buy:5};
  s.lotto=s.lotto||{t:{},pot:0,max:10,round:1,last:null,hist:[]};s.tip=s.tip||{dl:600,floor:0,carry:0,rounds:[],hist:[]};
  s.rps=s.rps||{open:[],hist:[]};s.codes=s.codes||{};s.rec=s.rec||{};
  if(!s.rules)s.rules=clone(DEFAULT_RULES);
  Object.keys(DEFAULT_RULES).forEach(function(k){if(s.rules[k]==null)s.rules[k]=clone(DEFAULT_RULES[k])});
  if(!s.rules.sales||!s.rules.sales.length)s.rules.sales=clone(DEFAULT_RULES.sales);
  s.players.forEach(function(p){if(!p.used)p.used={}});
  return s;
}
function R(){return S.rules||DEFAULT_RULES}
function activeSales(){return R().sales.filter(function(t){return t.on})}

/* ---------- MØNTBEREGNING — samme funktion findes i api/state.js ---------- */
function salesCount(r,id,RR){
  if(r.sales&&r.sales[id]!=null)return Math.max(0,+r.sales[id]||0);
  if(!r.sales&&r.salg&&RR.sales[0]&&RR.sales[0].id===id)return Math.max(0,+r.salg||0);
  return 0;
}
function breakdown(p,r,RR){
  RR=RR||R();
  var parts=[],sum=0;
  RR.sales.forEach(function(t){
    if(!t.on)return;
    var k=salesCount(r,t.id,RR);
    if(k>0&&t.c>0){sum+=k*t.c;parts.push({l:k+" × "+t.n,v:k*t.c})}
  });
  var n=Math.floor(sum+1e-9);
  var csat=+r.csat||0,kpt=+r.kpt||0,wrap=+r.wrap||0,conf=+r.conf||0;
  if(RR.csatPer>0&&csat>=RR.csatPer){
    var c=Math.floor(csat/RR.csatPer)*RR.csatCoins;
    if(c){n+=c;parts.push({l:csat+" × 5-stjernet CSAT",v:c})}
  }
  var kptOk=kpt>RR.kptMin;
  if(kptOk&&RR.kptCoins){n+=RR.kptCoins;parts.push({l:"KPT over "+fmt(RR.kptMin),v:RR.kptCoins})}
  if(wrap>0&&wrap<RR.wrapMax&&RR.wrapCoins){n+=RR.wrapCoins;parts.push({l:"Wrap up under "+RR.wrapMax+" sek",v:RR.wrapCoins})}
  if(conf>RR.confMin&&RR.confCoins){n+=RR.confCoins;parts.push({l:"Conformance over "+fmt(RR.confMin)+" %",v:RR.confCoins})}
  if(kptOk&&RR.streakDays>0&&(((p&&p.streak)||0)+1)%RR.streakDays===0&&RR.streakCoins){
    n+=RR.streakCoins;parts.push({l:RR.streakDays+" dage i streak",v:RR.streakCoins})}
  return {n:n,parts:parts,salesRaw:sum};
}
/* regeltekster til forsiden og "Mine tal" */
function ruleLines(){
  var r=R(),out=[];
  activeSales().forEach(function(t){out.push(["💰 Pr. "+t.n,fmt(t.c)+" mønt"+(t.c===1?"":"er")])});
  out.push(["⭐ Hver "+(r.csatPer===1?"":r.csatPer+". ")+"CSAT med 5 stjerner",fmt(r.csatCoins)+" mønt"+(r.csatCoins===1?"":"er")]);
  if(r.kptCoins)out.push(["🎯 Dag med KPT over "+fmt(r.kptMin),fmt(r.kptCoins)+" mønt"+(r.kptCoins===1?"":"er")]);
  if(r.wrapCoins)out.push(["⏱️ Wrap up under "+r.wrapMax+" sek",fmt(r.wrapCoins)+" mønt"+(r.wrapCoins===1?"":"er")]);
  if(r.confCoins)out.push(["📊 Conformance over "+fmt(r.confMin)+" %",fmt(r.confCoins)+" mønt"+(r.confCoins===1?"":"er")]);
  if(r.streakCoins&&r.streakDays)out.push(["🔥 "+r.streakDays+" dage i streak på KPT","+"+fmt(r.streakCoins)+" mønter"]);
  return out;
}
function rulesHTML(){return ruleLines().map(function(x){return '<div class="rule">'+esc(x[0])+' <b>'+esc(x[1])+'</b></div>'}).join("")}
/* heat: egen tekst, ellers automatisk ud fra afvigelser fra standard */
function heatText(){
  var r=R(),d=DEFAULT_RULES,b=[];
  if(r.heat)return r.heat;
  if(r.csatCoins>d.csatCoins||r.csatPer<d.csatPer)b.push("CSAT giver ekstra");
  if(r.kptCoins>d.kptCoins)b.push("KPT giver "+fmt(r.kptCoins)+" mønter");
  if(r.wrapCoins>d.wrapCoins)b.push("wrap up giver "+fmt(r.wrapCoins)+" mønter");
  if(r.confCoins>d.confCoins)b.push("conformance giver "+fmt(r.confCoins)+" mønter");
  if(r.streakCoins>d.streakCoins)b.push("streak giver "+fmt(r.streakCoins)+" mønter");
  return b.length?"Lige nu: "+b.join(", ")+"!":"";
}
function drawHeat(id){
  var e=document.getElementById(id);if(!e)return;
  var t=heatText();
  e.style.display=t?"":"none";
  if(t)e.innerHTML='<span class="heatic">🔥</span><div><b>HEAT</b><br>'+esc(t)+'</div>';
}

function shopList(){return S.shop||[]}
function exRates(){return S.ex||{on:false,sell:2,buy:5}}
function gameCfg(id){return (S.games||[]).filter(function(g){return g.id===id})[0]||{id:id,on:true,cap:0}}
function gameOn(id){return !!gameCfg(id).on}
function todayKey(){return new Date(Date.now()+2*3600*1000).toISOString().slice(0,10)}
function usedToday(p,id){var u=p&&p.used&&p.used[id];return (u&&u.d===todayKey())?(u.p||0):0}
function capLeft(id,p){p=p||me();if(!p)return 0;var g=gameCfg(id);if(!g.cap)return Infinity;return Math.max(0,g.cap-usedToday(p,id))}
function capText(id){var g=gameCfg(id),p=me();if(!g.cap||!p)return "";var l=capLeft(id,p);return l<=0?"Dagens grænse nået":(l+" af "+g.cap+" point tilbage i dag")}
function levelOf(p){var l=LEVELS[0];for(var i=0;i<LEVELS.length;i++)if(p>=LEVELS[i].p)l=LEVELS[i];return l}
function stat(t){return S.field.filter(function(c){return !c.open&&c.t===t}).length}
function openCount(){return S.field.filter(function(c){return c.open}).length}
function pend(){return S.pending||[]}
function ranks(){
  var s=S.players.map(function(p,i){return{i:i,p:p.pts}}).sort(function(a,b){return b.p-a.p});
  var r={},pos=0,prev=null;
  s.forEach(function(o,k){if(o.p!==prev){pos=k;prev=o.p}r[o.i]=o.p>0?pos:99});
  return r;
}
function toast(t,cls){
  var e=document.getElementById("toast");
  e.className="toast show "+(cls||"win");e.textContent=t;
  clearTimeout(e._t);e._t=setTimeout(function(){e.className="toast "+(cls||"win")},2700);
}
function setTxt(id,v){var e=document.getElementById(id);if(e)e.textContent=v}
function me(){return UI.me>=0?S.players[UI.me]:null}
function myCoins(){var p=me();return p?p.coins:0}
function iAmAdmin(){var p=me();return !!(p&&p.admin&&UI.pin)}
function isAdminAcct(){var p=me();return !!(p&&p.admin)}
function isLocked(){return !!(S.openAt&&Date.now()<Date.parse(S.openAt))}
function openText(){
  if(!S.openAt)return "";
  var d=new Date(S.openAt),dg=["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
  return dg[d.getDay()]+" kl. "+("0"+d.getHours()).slice(-2)+"."+("0"+d.getMinutes()).slice(-2);
}
function countdown(){
  if(!isLocked())return "";
  var ms=Date.parse(S.openAt)-Date.now(),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60;
  return h>=24?(Math.floor(h/24)+" dage "+(h%24)+" timer"):(h+"t "+m+"m");
}
function canPlay(id){
  var p=me();
  if(!p){openWho();return false}
  if(isLocked()){toast("⏳ Spillene åbner "+openText(),"bad");return false}
  if(!gameOn(id)){toast("🔒 Spillet er lukket lige nu","bad");return false}
  if(capLeft(id,p)<=0){toast("🛑 Du har nået dagens grænse i dette spil","bad");return false}
  return true;
}

var PAGES=["hq","games","mine","tetris","wheel","shoot","stack","dig","fly","road","cookie","lotto","rps","tip","board","shop","bors","tal","admin"];
function go(v){
  if(typeof shoot!=="undefined"&&shoot.on&&v!=="shoot")shootEnd(true);
  if(typeof stack!=="undefined"&&stack.on&&v!=="stack")stackEnd(true);
  if(typeof dig!=="undefined"&&dig.on&&v!=="dig")digEnd(true);
  if(typeof tet!=="undefined"&&tet.on&&v!=="tetris")tetrisEnd(true);
  if(typeof fly!=="undefined"&&fly.on&&v!=="fly")flyEnd(true);
  if(typeof road!=="undefined"&&road.on&&v!=="road")roadEnd(true);
  if(typeof ck!=="undefined"&&ck.on&&v!=="cookie")ckEnd(true);
  if(v!=="admin"){UI.draft=null;UI.gdraft=null;UI.rdraft=null}
  UI.view=v;
  PAGES.forEach(function(k){var e=document.getElementById("v-"+k);if(e)e.hidden=(k!==v)});
  var navKey=(["mine","tetris","wheel","shoot","stack","dig","fly","road","cookie","lotto","rps","tip"].indexOf(v)>-1)?"games":v;
  Array.prototype.forEach.call(document.querySelectorAll("#nav button"),function(b){b.classList.toggle("on",b.dataset.v===navKey)});
  render();
}

function openWho(){
  var h="";
  S.players.forEach(function(p,i){
    h+='<button onclick="setMe('+i+')"><span class="ava" style="background:'+p.color+
       ';width:30px;height:30px;font-size:16px;border-radius:10px">'+p.icon+'</span>'+esc(p.name)+(p.admin?' 🔒':'')+'</button>';
  });
  document.getElementById("whoGrid").innerHTML=h;
  document.getElementById("whoModal").hidden=false;
}
function setMe(i){
  var p=S.players[i];
  document.getElementById("whoModal").hidden=true;
  if(p&&p.admin){UI.me=i;lsSet("arena_me",String(i));openPin();return}
  UI.me=i;UI.pin="";lsDel("arena_pin");lsSet("arena_me",String(i));
  if(p)toast(p.icon+" Hej "+p.name+"!","cool");
  if(UI.view==="admin")go("hq"); else render();
}
function openPin(){
  var e=document.getElementById("pinModal");e.hidden=false;setTxt("pinErr","");
  var f=document.getElementById("pinInput");f.value="";setTimeout(function(){f.focus()},60);
}
function closePin(){
  document.getElementById("pinModal").hidden=true;
  if(isAdminAcct()&&!UI.pin){UI.me=-1;lsDel("arena_me");render();openWho()}
}
function submitPin(){
  var f=document.getElementById("pinInput"),pin=String(f.value||"").trim();
  if(!pin){setTxt("pinErr","Indtast koden");return}
  send({type:"adminLogin",pi:UI.me,pin:pin},function(r){
    if(r&&r.err){setTxt("pinErr",r.err);f.value="";f.focus();return}
    UI.pin=pin;lsSet("arena_pin",pin);
    document.getElementById("pinModal").hidden=true;
    toast("👑 Velkommen, Oskar","cool");render();
  });
}
function logoutAdmin(){UI.pin="";lsDel("arena_pin");toast("🔒 Låst igen","cool");go("hq")}

function drawMe(){
  var p=me(),b=document.getElementById("meBtn");
  b.innerHTML=p?'<span class="ava" style="background:'+p.color+'">'+p.icon+'</span>'+
      '<span><b>'+esc(p.name)+(p.admin?(UI.pin?' 👑':' 🔒'):'')+'</b><br><span>🪙 '+p.coins+' mønter · ⭐ '+p.pts+' point</span></span>'
    :'<span class="ava" style="background:#eee">❓</span><span><b>Vælg dig selv</b><br><span>klik her</span></span>';
  var s=document.getElementById("syncBadge");
  s.className="sync "+(UI.mode==="live"?"live":"err");
  s.textContent=UI.mode==="live"?"● Live — alle ser det samme":"● Forbinder…";
  var nb=document.getElementById("navAdmin"),n=pend().length;
  nb.style.display=iAmAdmin()?"":"none";
  var d=nb.querySelector(".dot");
  if(iAmAdmin()&&n>0){if(!d){d=document.createElement("span");d.className="dot";nb.appendChild(d)}d.textContent=n}
  else if(d)d.remove();
  document.getElementById("navBors").style.display=exRates().on?"":"none";
}
function rowHTML(p,i,clickable){
  var r=ranks(),med=["🥇","🥈","🥉"];
  return '<div class="prow'+(i===UI.me?" me":"")+(clickable?" pick":"")+'"'+(clickable?' onclick="setMe('+i+')"':'')+'>'+
    (r[i]<3?'<span class="medal">'+med[r[i]]+'</span>':'')+
    '<div class="ava" style="background:'+p.color+'">'+p.icon+'</div>'+
    '<div><div class="pname">'+esc(p.name)+(p.admin?' 👑':'')+' <span class="lvl">'+levelOf(p.pts).n+'</span></div>'+
    '<div class="pmeta">🪙 '+p.coins+' · ⭐ '+p.pts+(p.shield?' · 🛡️':'')+
      (p.streak>=3?' · <span class="streak">🔥'+p.streak+'</span>':'')+(p.freeSpin?' · 🎡'+p.freeSpin+' gratis':'')+'</div></div>'+
    '<div class="score"><b>'+p.pts+'</b><span>POINT</span></div></div>';
}
function drawList(id,clickable){
  var e=document.getElementById(id);if(!e)return;
  e.innerHTML=S.players.map(function(p,i){return rowHTML(p,i,clickable)}).join("");
}
function myBar(id,extra){
  var e=document.getElementById(id);if(!e)return;
  var p=me();
  if(!p){e.innerHTML='<div class="nm">Vælg dig selv øverst for at spille</div>';return}
  var t="",n=Math.min(p.coins,12);
  for(var i=0;i<n;i++)t+='<span class="coin">🪙</span>';
  if(p.coins>12)t+='<span class="coin none">+'+(p.coins-12)+'</span>';
  if(!p.coins)t='<span class="coin none">–</span>';
  e.innerHTML='<div class="ava" style="background:'+p.color+'">'+p.icon+'</div>'+
    '<div><div class="nm">'+esc(p.name)+'</div><div class="sb">'+
    (extra||(p.coins?"Du har "+p.coins+" mønter — hver tur koster 1":"Ingen mønter tilbage — tast dine tal ind"))+
    '</div></div><div class="coins">'+t+'</div>';
}

function drawHQ(){
  var coins=S.players.reduce(function(a,p){return a+p.coins},0);
  var pts=S.players.reduce(function(a,p){return a+p.pts},0);
  var lead=S.players.slice().sort(function(a,b){return b.pts-a.pts})[0];
  document.getElementById("hqStats").innerHTML=
   '<div class="stat"><b>'+S.players.length+'</b><span>deltagere</span></div>'+
   '<div class="stat"><b style="color:#f5a623">'+coins+'</b><span>mønter i spil</span></div>'+
   '<div class="stat"><b>'+pts+'</b><span>point i alt</span></div>'+
   '<div class="stat"><b>'+(lead&&lead.pts>0?lead.icon+" "+lead.pts:"–")+'</b><span>fører</span></div>'+
   (isLocked()?'<div class="stat"><b style="color:#b9895a;font-size:19px">'+countdown()+'</b><span>til åbning</span></div>':'');
  drawHeat("hqHeat");
  myBar("hqMe");
  drawList("hqList",true);
  document.getElementById("hqRules").innerHTML=rulesHTML();
  document.getElementById("hqLog").innerHTML=S.log.length?S.log.slice(0,12).map(function(l){return "<div>"+l+"</div>"}).join(""):
    '<div style="color:#c2ae9a">Ingenting er sket endnu.</div>';
  setTxt("seasonLbl2","Sæson "+S.season);
}

function drawGames(){
  myBar("gamesMe");
  var lk=document.getElementById("lockBanner");
  lk.style.display=isLocked()?"":"none";
  if(isLocked())lk.innerHTML='<b>⏳ Spillehallen åbner '+openText()+'</b><br><span style="font-weight:800;font-size:13px">Saml mønter indtil da — '+countdown()+' tilbage.</span>';
  var p=me(),h="";
  GAMES.forEach(function(g){
    var cfg=gameCfg(g.id),off=!cfg.on,left=p?capLeft(g.id,p):Infinity,done=cfg.on&&p&&left<=0;
    var dis=isLocked()||off||done,sub;
    if(off)sub='<div class="pmeta closed">Lukket af Oskar</div>';
    else if(done)sub='<div class="pmeta capped">🛑 Dagens grænse nået</div>';
    else if(g.coin)sub='<div class="pmeta">'+coinSub(g.id)+'</div>';
    else if(cfg.cap&&p)sub='<div class="pmeta">'+left+' af '+cfg.cap+' point tilbage i dag</div>';
    else sub=S.best[g.id]?'<div class="pmeta">Rekord: '+S.best[g.id]+'</div>':
      (S.rec&&S.rec[g.id]?'<div class="pmeta">Rekord: '+S.rec[g.id].v+' · '+esc(S.rec[g.id].n)+'</div>':'');
    h+='<div class="gcard'+(dis?" lockedcard":"")+'" onclick="'+
       (isLocked()?"toast('⏳ Åbner "+openText()+"','bad')":off?"toast('🔒 Spillet er lukket lige nu','bad')":
        done?"toast('🛑 Du har nået dagens grænse her','bad')":"go('"+g.id+"')")+'">'+
       (off?'<span class="closedtag">LUKKET</span>':'')+
       '<div class="ic">'+(isLocked()||off?"🔒":done?"🛑":g.ic)+'</div>'+
       '<b>'+g.n+'</b><p>'+g.d+'</p><span class="gtag t-'+g.t+'">'+g.tl+'</span>'+sub+'</div>';
  });
  document.getElementById("hub").innerHTML=h;
}

function drawMine(){
  document.getElementById("mineStats").innerHTML=
   '<div class="stat"><b>'+(N-openCount())+'</b><span>felter tilbage</span></div>'+
   '<div class="stat"><b style="color:#f2545b">'+stat("mine")+'</b><span>bomber</span></div>'+
   '<div class="stat"><b style="color:#e29500">'+stat("jack")+'</b><span>jackpot</span></div>'+
   '<div class="stat"><b style="color:#4cc3f0">'+stat("safe")+'</b><span>skjold</span></div>';
  var pct=Math.round(openCount()/N*100);
  document.getElementById("pbar").style.width=pct+"%";
  setTxt("ptxt",openCount()+" af "+N+" felter ryddet · "+pct+"%");
  myBar("mineMe",capText("mine")||null);
  var p=me(),can=p&&p.coins>0&&gameOn("mine")&&capLeft("mine",p)>0&&!isLocked(),h="";
  S.field.forEach(function(c,i){
    var q=c.by!=null?S.players[c.by]:null;
    h+='<div class="cell '+(c.open?"done":(can?"":"locked"))+(i===S.last?" fresh":"")+'"'+((!c.open&&can)?' onclick="tap('+i+')"':'')+'>'+
       '<div class="face front">'+(i+1)+'</div><div class="face back b-'+c.t+'">'+FACE[c.t]+
       ((c.t==="pts"||c.t==="jack")?'<span class="v">+'+c.v+'</span>':'')+(c.t==="mine"?'<span class="v">'+c.v+'</span>':'')+
       (q?'<span class="who">'+q.icon+'</span>':'')+'</div></div>';
  });
  document.getElementById("grid").innerHTML=h;
  drawList("mineList",false);
}
function tap(i){
  if(!canPlay("mine"))return;
  if(me().coins<1){toast("Du har ingen mønter tilbage","bad");return}
  if(S.field[i].open){toast("Feltet er lige blevet taget","bad");return}
  send({type:"tap",pi:UI.me,idx:i},function(r){
    if(!r)return;
    if(r.err){toast(r.err,"bad");return}
    if(r.kind==="candy")toast("🍬 Slik! +"+r.v+" point","win");
    else if(r.kind==="jack"){toast("🏆 JACKPOT! +"+r.v,"win");burst(200)}
    else if(r.kind==="safe")toast("🛡️ Du er beskyttet","cool");
    else if(r.kind==="spin")toast("🎡 Gratis spin på Lykkehjulet!","cool");
    else if(r.kind==="mine")r.saved?toast("🛡️ Skjoldet holdt!","cool"):toast("💥 BOOM! "+r.v,"bad");
    else if(r.kind==="pts")toast("⭐ +"+r.v+" point","win");
    if(r.capped)toast("🛑 Dagens grænse nået i Minefeltet","bad");
  });
}

function drawBoard(){
  var sorted=S.players.map(function(p,i){return{p:p,i:i}}).sort(function(a,b){return b.p.pts-a.p.pts});
  var max=Math.max(1,sorted[0]?sorted[0].p.pts:1),med=["🥇","🥈","🥉"],h="";
  [1,0,2].forEach(function(k){
    var o=sorted[k];if(!o)return;
    h+='<div class="pod" style="min-height:'+[92,116,78][k]+'px"><div class="ava" style="background:'+o.p.color+'">'+o.p.icon+'</div>'+
       '<b>'+med[k]+' '+o.p.pts+'</b><small>'+esc(o.p.name).toUpperCase()+'</small></div>';
  });
  document.getElementById("podium").innerHTML=h;
  document.getElementById("lb").innerHTML=sorted.map(function(o,k){
    var p=o.p;
    return '<div class="lbrow'+(k<3?" p"+(k+1):"")+(o.i===UI.me?" you":"")+'"><div class="rank">'+(k<3?med[k]:"#"+(k+1))+'</div>'+
      '<div class="ava" style="background:'+p.color+'">'+p.icon+'</div><div style="min-width:132px"><div class="pname">'+esc(p.name)+'</div>'+
      '<div class="pmeta">'+levelOf(p.pts).n+' · 🪙 '+p.coins+'</div><div class="badges">'+
      p.badges.map(function(b){return BADGES[b]?'<span class="badge" title="'+BADGES[b].n+'">'+BADGES[b].i+'</span>':''}).join("")+
      '</div></div><div class="bar"><i style="width:'+Math.round(p.pts/max*100)+'%;background:'+p.color+'"></i></div>'+
      '<div class="score"><b>'+p.pts+'</b><span>POINT</span></div></div>';
  }).join("");
  document.getElementById("badgeInfo").innerHTML=Object.keys(BADGES).map(function(k){
    var b=BADGES[k],who=S.players.filter(function(p){return p.badges.indexOf(k)>-1});
    return '<div class="item"><div class="ic">'+b.i+'</div><b>'+b.n+'</b><p>'+b.d+'</p><div class="pmeta">'+
      (who.length?who.map(function(p){return p.icon}).join(" "):"Ingen endnu")+'</div></div>';
  }).join("");
}

function drawShop(){
  myBar("shopMe",(me()?"Du har ⭐ "+me().pts+" point at handle for":""));
  var p=me();
  document.getElementById("shop").innerHTML=shopList().map(function(it){
    var ok=p&&p.pts>=it.c&&!it.out,n=p?p.bought.filter(function(x){return x===it.id}).length:0;
    return '<div class="item'+(ok?" can":"")+(it.out?" soldout":"")+'">'+(it.out?'<span class="soldtag">UDSOLGT</span>':'')+
      '<div class="ic">'+esc(it.ic)+'</div><b>'+esc(it.n)+'</b><p>'+esc(it.d)+'</p>'+(n?'<span class="owned">Købt '+n+'×</span>':'')+
      '<span class="cost">'+it.c+' point</span><button class="big sm" onclick="buy(\''+esc(it.id)+'\')"'+(ok?"":" disabled")+'>'+
      (it.out?"Udsolgt":ok?"Køb":(p?"Mangler "+(it.c-p.pts):"Vælg dig selv"))+'</button></div>';
  }).join("");
}
function buy(id){
  if(!me()){openWho();return}
  send({type:"buy",pi:UI.me,id:id},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast((r.ic||"🛒")+" Du købte "+(r.name||"")+"!","win");burst(90);
  });
}

function borsN(){var n=parseInt(document.getElementById("borsN").value,10);return (n>0&&n<=50)?n:1}
function borsStep(d){document.getElementById("borsN").value=Math.max(1,Math.min(50,borsN()+d));drawBors()}
function drawBors(){
  var p=me(),ex=exRates(),n=borsN();
  myBar("borsMe",p?("🪙 "+p.coins+" mønter · ⭐ "+p.pts+" point"):"");
  setTxt("rateSell","1 mønt → "+ex.sell+" point");setTxt("rateBuy",ex.buy+" point → 1 mønt");
  setTxt("borsState",ex.on?"Børsen er åben":"Børsen er lukket");
  var s=document.getElementById("sellBtn"),b=document.getElementById("buyBtn");
  s.textContent="Sælg "+n+" mønt"+(n>1?"er":"")+" → få "+(n*ex.sell)+" point";s.disabled=!p||!ex.on||p.coins<n;
  b.textContent="Køb "+n+" mønt"+(n>1?"er":"")+" for "+(n*ex.buy)+" point";b.disabled=!p||!ex.on||p.pts<n*ex.buy;
}
function exchange(dir){
  if(!me()){openWho();return}
  var n=borsN();
  send({type:"exchange",pi:UI.me,dir:dir,n:n},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast(dir==="toPts"?"📈 "+n+" mønt"+(n>1?"er":"")+" → +"+r.g+" point":"📉 Du købte "+n+" mønt"+(n>1?"er":""),"win");
  });
}

/* ================= MINE TAL ================= */
function dv(id){var e=document.getElementById(id);return e?parseFloat(String(e.value).replace(",","."))||0:0}
function myRow(){
  var sales={};
  activeSales().forEach(function(t){var v=dv("mys_"+t.id);if(v>0)sales[t.id]=v});
  return {sales:sales,csat:dv("myCsat"),kpt:dv("myKpt"),wrap:dv("myWrap"),conf:dv("myConf")};
}
function drawSalesInputs(){
  var box=document.getElementById("salesInputs");if(!box)return;
  var sig=activeSales().map(function(t){return t.id+":"+t.n+":"+t.c}).join("|");
  if(box.dataset.sig===sig)return;          /* tegn kun om, hvis salgstyperne er ændret */
  var keep={};activeSales().forEach(function(t){var e=document.getElementById("mys_"+t.id);if(e)keep[t.id]=e.value});
  box.dataset.sig=sig;
  box.innerHTML=activeSales().map(function(t){
    return '<div class="inrow"><label>💰 '+esc(t.n)+' <small>'+fmt(t.c)+(t.c===1?' mønt':' mønter')+' pr. stk.</small></label>'+
      '<input type="number" min="0" id="mys_'+esc(t.id)+'" placeholder="0" value="'+esc(keep[t.id]||"")+'" oninput="calcMine()"></div>';
  }).join("");
}
function calcMine(){
  var p=me();if(!p)return;
  var b=breakdown(p,myRow());
  setTxt("myCoins",b.n);
  var d=document.getElementById("myDetail");
  var txt=b.parts.map(function(x){return x.l+" = "+fmt(x.v)}).join(" · ");
  if(b.salesRaw%1>0.001)txt+=" (salg rundes ned til hele mønter)";
  d.textContent=txt||"Udfyld felterne herover";
}
function drawTal(){
  var p=me(),r=R();
  myBar("talMe",(p?"Tast dine tal ind — Oskar godkender dem":""));
  drawHeat("talHeat");
  drawSalesInputs();
  setTxt("csatLbl","⭐ Antal CSAT med 5 stjerner");
  setTxt("csatHint","Hver "+(r.csatPer===1?"":r.csatPer+". ")+"giver "+fmt(r.csatCoins)+" mønt");
  setTxt("kptHint","Over "+fmt(r.kptMin)+" giver "+fmt(r.kptCoins));
  setTxt("wrapHint","Under "+r.wrapMax+" sek giver "+fmt(r.wrapCoins));
  setTxt("confHint","Over "+fmt(r.confMin)+" % giver "+fmt(r.confCoins));
  document.getElementById("talRules").innerHTML=rulesHTML();
  setTxt("csatExample",r.csatPer>1?("Eksempel: 5 femmere giver "+fmt(Math.floor(5/r.csatPer)*r.csatCoins)+" mønt"+(Math.floor(5/r.csatPer)*r.csatCoins===1?"":"er")+"."):"");
  var mine=pend().filter(function(x){return x.pi===UI.me})[0],box=document.getElementById("myStatus");
  if(!p)box.innerHTML='<div class="sent wait">Vælg dig selv øverst først.</div>';
  else if(mine)box.innerHTML='<div class="sent wait">⏳ <b>Sendt til godkendelse</b> — afventer Oskar. Du kan sende igen, hvis du har tastet forkert.</div>';
  else box.innerHTML='<div class="sent">✅ Ingen indsendelser venter.</div>';
  document.getElementById("sendBtn").disabled=!p;
  calcMine();
}
function submitMine(){
  if(!me()){openWho();return}
  var r=myRow();
  if(!Object.keys(r.sales).length&&!r.csat&&!r.kpt&&!r.wrap&&!r.conf){toast("Udfyld mindst ét felt","bad");return}
  send({type:"submit",pi:UI.me,row:r},function(res){
    if(res&&res.err){toast(res.err,"bad");return}
    toast("📨 Sendt til godkendelse — "+res.n+" mønter","cool");
    Array.prototype.forEach.call(document.querySelectorAll("#v-tal input[type=number]"),function(e){e.value=""});
    calcMine();
  });
}

/* ================= ADMIN ================= */
function pendVals(it){
  var r=R(),h="";
  r.sales.forEach(function(t){var k=salesCount(it,t.id,r);if(k)h+='<span class="pv">'+esc(t.n)+' <b>'+k+'</b></span>'});
  h+='<span class="pv'+(it.csat?'':' no')+'">CSAT 5⭐ <b>'+it.csat+'</b></span>'+
     '<span class="pv'+(it.kpt?'':' no')+'">KPT <b>'+fmt(it.kpt)+'</b></span>'+
     '<span class="pv'+(it.wrap?'':' no')+'">Wrap <b>'+it.wrap+'s</b></span>'+
     '<span class="pv'+(it.conf?'':' no')+'">Conf <b>'+fmt(it.conf)+'%</b></span>';
  return h;
}
function drawPending(){
  var e=document.getElementById("pendList"),list=pend();
  setTxt("pendCount",list.length?list.length+" venter":"Ingen venter");
  document.getElementById("approveAllBtn").disabled=!list.length;
  if(!list.length){e.innerHTML='<p class="hint" style="margin:0">Ingen indsendelser lige nu.</p>';return}
  e.innerHTML=list.map(function(it){
    var q=S.players[it.pi]||{name:"?",icon:"❓",color:"#eee"},t=new Date(it.at);
    var n=breakdown(q,it).n;   /* altid beregnet med de nuværende regler */
    return '<div class="pend"><div class="ava" style="background:'+q.color+'">'+q.icon+'</div>'+
      '<div style="min-width:120px"><div class="pname">'+esc(q.name)+'</div><div class="pmeta">'+("0"+t.getHours()).slice(-2)+"."+("0"+t.getMinutes()).slice(-2)+'</div></div>'+
      '<div class="vals">'+pendVals(it)+'</div><span class="pcoins">🪙 '+n+'</span>'+
      '<div class="acts"><button class="big sm grn" onclick="approve(\''+it.id+'\')">Godkend</button>'+
      '<button class="ghost warn" onclick="reject(\''+it.id+'\')">Afvis</button></div></div>';
  }).join("");
}
function approve(id){send({type:"approve",by:UI.me,pin:UI.pin,id:id},function(r){
  if(r&&r.err){toast(r.err,"bad");return}toast("✅ Godkendt — "+r.n+" mønter til "+r.name,"win")})}
function reject(id){send({type:"reject",by:UI.me,pin:UI.pin,id:id},function(r){
  if(r&&r.err){toast(r.err,"bad");return}toast("↩️ Afvist — "+r.name+" kan taste igen","cool")})}
function approveAll(){
  if(!pend().length||!confirm("Godkend alle "+pend().length+" indsendelser?"))return;
  send({type:"approveAll",by:UI.me,pin:UI.pin},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    if(r.tot){toast("🪙 "+r.tot+" mønter udbetalt til "+r.who,"win");burst(130)}
  });
}

/* ---------- regel-editor ---------- */
function rDraft(){if(!UI.rdraft)UI.rdraft=clone(R());return UI.rdraft}
function rDirty(){return JSON.stringify(rDraft())!==JSON.stringify(R())}
function rFlag(){
  var b=document.getElementById("rulesSaveBtn");b.disabled=!rDirty();b.textContent=rDirty()?"💾 Gem regler":"✓ Gemt";
  setTxt("rulesDirty",rDirty()?"Du har ændringer, der ikke er gemt.":"");
  var d=rDraft(),ex=breakdown({streak:0},{sales:{},csat:0,kpt:0,wrap:0,conf:0},d);
  var sample={sales:{},csat:5,kpt:d.kptMin+0.2,wrap:Math.max(1,d.wrapMax-8),conf:d.confMin+5};
  if(d.sales[0])sample.sales[d.sales[0].id]=2;
  setTxt("rulesSample","Eksempel med de nye regler: 2 salg, 5 CSAT-femmere og alle KPI'er i hus giver "+breakdown({streak:0},sample,d).n+" mønter.");
}
function drawRulesEditor(){
  var d=rDraft();
  document.getElementById("salesEdit").innerHTML=d.sales.map(function(t,i){
    return '<tr class="'+(t.on?"":"offrow")+'"><td><input type="text" value="'+esc(t.n)+'" oninput="edSale('+i+',\'n\',this.value)" placeholder="Fx Mobilabonnement"></td>'+
      '<td><input type="number" min="0" max="50" step="0.5" value="'+t.c+'" oninput="edSale('+i+',\'c\',this.value)"></td>'+
      '<td><label class="sw"><input type="checkbox"'+(t.on?" checked":"")+' onchange="edSale('+i+',\'on\',this.checked)"> '+(t.on?"Aktiv":"Skjult")+'</label></td>'+
      '<td><button class="ghost mini warn" onclick="rmSale('+i+')">✕</button></td></tr>';
  }).join("");
  var f=function(id,k){var e=document.getElementById(id);if(e&&document.activeElement!==e)e.value=d[k]};
  f("r_csatPer","csatPer");f("r_csatCoins","csatCoins");f("r_kptMin","kptMin");f("r_kptCoins","kptCoins");
  f("r_wrapMax","wrapMax");f("r_wrapCoins","wrapCoins");f("r_confMin","confMin");f("r_confCoins","confCoins");
  f("r_streakDays","streakDays");f("r_streakCoins","streakCoins");f("r_heat","heat");
  rFlag();
}
function edSale(i,k,v){var d=rDraft();if(!d.sales[i])return;
  d.sales[i][k]=k==="c"?(parseFloat(String(v).replace(",","."))||0):v;
  if(k==="on")drawRulesEditor();else rFlag()}
function addSale(){rDraft().sales.push({id:"",n:"",c:1,on:true});drawRulesEditor()}
function rmSale(i){var d=rDraft();if(d.sales.length<=1){toast("Der skal være mindst én salgstype","bad");return}
  if(!confirm("Fjern salgstypen "+(d.sales[i].n||"")+"?\n\nVil du bare skjule den midlertidigt, så fjern fluebenet i stedet."))return;
  d.sales.splice(i,1);drawRulesEditor()}
function edRule(k,v){var d=rDraft();d[k]=k==="heat"?v:(parseFloat(String(v).replace(",","."))||0);rFlag()}
function resetRulesDraft(){UI.rdraft=null;drawRulesEditor()}
function saveRules(){
  send({type:"rulesSave",by:UI.me,pin:UI.pin,rules:rDraft()},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    UI.rdraft=null;if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    toast("⚙️ Reglerne er gemt","win");render();
  });
}
function resetRules(){
  if(!confirm("Sæt værdierne tilbage til standard?\n\nSalgstyperne beholdes. Heat-teksten fjernes."))return;
  send({type:"rulesReset",by:UI.me,pin:UI.pin},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    UI.rdraft=null;toast("⚙️ Standardværdier er sat","cool");render();
  });
}

/* ---------- spil-editor ---------- */
function gDraft(){if(!UI.gdraft)UI.gdraft=clone(S.games);return UI.gdraft}
function gDirty(){return JSON.stringify(gDraft())!==JSON.stringify(S.games)}
function gFlag(){var b=document.getElementById("gamesSaveBtn");b.disabled=!gDirty();b.textContent=gDirty()?"💾 Gem spil":"✓ Gemt";
  setTxt("gamesDirty",gDirty()?"Du har ændringer, der ikke er gemt.":"")}
function drawGamesEditor(){
  var d=gDraft();
  document.getElementById("gamesEdit").innerHTML=GAMES.map(function(g){
    var i=-1;d.forEach(function(x,k){if(x.id===g.id)i=k});
    var cfg=d[i]||{on:true,cap:0};
    return '<tr class="'+(cfg.on?"":"offrow")+'"><td style="font-size:22px">'+g.ic+'</td><td><b>'+g.n+'</b></td>'+
      '<td><label class="sw"><input type="checkbox"'+(cfg.on?" checked":"")+' onchange="edGame('+i+',\'on\',this.checked)"> '+(cfg.on?"Åbent":"Lukket")+'</label></td>'+
      (g.coin?'<td>–</td><td class="pmeta">flytter kun mønter mellem spillerne</td></tr>':
      '<td><input type="number" min="0" max="999" value="'+cfg.cap+'" oninput="edGame('+i+',\'cap\',this.value)"></td>'+
      '<td class="pmeta">'+(cfg.cap?"maks "+cfg.cap+" point pr. person pr. dag":"ingen grænse")+'</td></tr>');
  }).join("");
  gFlag();
}
function edGame(i,k,v){var d=gDraft();if(!d[i])return;d[i][k]=k==="cap"?Math.max(0,Math.min(999,parseInt(v,10)||0)):v;
  if(k==="on")drawGamesEditor();else gFlag()}
function resetGamesDraft(){UI.gdraft=null;drawGamesEditor()}
function saveGames(){send({type:"gamesSave",by:UI.me,pin:UI.pin,items:gDraft()},function(r){
  if(r&&r.err){toast(r.err,"bad");return}UI.gdraft=null;
  if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();toast("🎮 Spillene er gemt","win");render()})}
function resetCaps(){if(!confirm("Nulstil dagens grænser for alle?"))return;
  send({type:"resetCaps",by:UI.me,pin:UI.pin},function(r){if(r&&r.err){toast(r.err,"bad");return}toast("♻️ Grænserne er nulstillet","cool")})}

/* ---------- kiosk-editor ---------- */
function shopDraft(){if(!UI.draft)UI.draft=clone(shopList());return UI.draft}
function sDirty(){return JSON.stringify(shopDraft())!==JSON.stringify(shopList())}
function sFlag(){var b=document.getElementById("shopSaveBtn");b.disabled=!sDirty();b.textContent=sDirty()?"💾 Gem kiosken":"✓ Gemt";
  setTxt("shopDirty",sDirty()?"Du har ændringer, der ikke er gemt.":"")}
function drawShopEditor(){
  var d=shopDraft();
  document.getElementById("shopEdit").innerHTML=d.map(function(it,i){
    return '<tr class="'+(it.out?"soldrow":"")+'"><td><input class="ic-in" value="'+esc(it.ic)+'" oninput="edShop('+i+',\'ic\',this.value)"></td>'+
      '<td><input type="text" value="'+esc(it.n)+'" oninput="edShop('+i+',\'n\',this.value)"></td>'+
      '<td><input type="text" class="desc-in" value="'+esc(it.d)+'" oninput="edShop('+i+',\'d\',this.value)"></td>'+
      '<td><input type="number" min="1" value="'+it.c+'" oninput="edShop('+i+',\'c\',this.value)"></td>'+
      '<td><label class="sw"><input type="checkbox"'+(it.out?" checked":"")+' onchange="edShop('+i+',\'out\',this.checked)"> Udsolgt</label></td>'+
      '<td style="white-space:nowrap"><button class="ghost mini" onclick="mvShop('+i+',-1)"'+(i===0?" disabled":"")+'>↑</button>'+
      '<button class="ghost mini" onclick="mvShop('+i+',1)"'+(i===d.length-1?" disabled":"")+'>↓</button>'+
      '<button class="ghost mini warn" onclick="rmShop('+i+')">✕</button></td></tr>';
  }).join("");
  sFlag();
}
function edShop(i,k,v){var d=shopDraft();if(!d[i])return;if(k==="c")v=Math.max(1,parseInt(v,10)||1);d[i][k]=v;
  if(k==="out")drawShopEditor();else sFlag()}
function addShop(){shopDraft().push({id:"",ic:"🎁",n:"Ny vare",d:"",c:50,out:false});drawShopEditor()}
function rmShop(i){var d=shopDraft();if(d.length<=1){toast("Kiosken skal have mindst én vare","bad");return}
  if(!confirm("Fjern "+d[i].n+"?"))return;d.splice(i,1);drawShopEditor()}
function mvShop(i,dir){var d=shopDraft(),j=i+dir;if(j<0||j>=d.length)return;var t=d[i];d[i]=d[j];d[j]=t;drawShopEditor()}
function resetShopDraft(){UI.draft=null;drawShopEditor()}
function saveShop(){send({type:"shopSave",by:UI.me,pin:UI.pin,items:shopDraft()},function(r){
  if(r&&r.err){toast(r.err,"bad");return}UI.draft=null;
  if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();toast("🏪 Kiosken er gemt","win");render()})}

function drawExEditor(){
  var ex=exRates(),a=document.getElementById("exOn"),b=document.getElementById("exSell"),c=document.getElementById("exBuy");
  if(document.activeElement!==a)a.checked=!!ex.on;
  if(document.activeElement!==b)b.value=ex.sell;
  if(document.activeElement!==c)c.value=ex.buy;
}
function saveEx(){send({type:"exSave",by:UI.me,pin:UI.pin,on:document.getElementById("exOn").checked,
  sell:document.getElementById("exSell").value,buy:document.getElementById("exBuy").value},function(r){
  if(r&&r.err){toast(r.err,"bad");return}toast("📊 Børsen er opdateret","win")})}

/* ---------- manuel indtastning ---------- */
function drawAdminTable(){
  var tb=document.getElementById("adminRows"),head=document.getElementById("adminHead");
  if(tb.contains(document.activeElement))return;
  var sales=activeSales();
  head.innerHTML='<th></th><th>Medarbejder</th>'+sales.map(function(t){return '<th>'+esc(t.n)+'</th>'}).join("")+
    '<th>CSAT 5⭐<br><small>antal</small></th><th>KPT</th><th>Wrap (sek)</th><th>Conf %</th><th>Mønter</th><th>Beholdning</th>';
  tb.innerHTML=S.players.map(function(p,i){
    var d=UI.day[i]||{sales:{}};
    return '<tr><td><div class="ava" style="background:'+p.color+'">'+p.icon+'</div></td>'+
      '<td><input type="text" value="'+esc(p.name)+'" onchange="renameP('+i+',this.value)"><div class="pmeta">'+(p.streak?"🔥 "+p.streak+" dage":"")+'</div></td>'+
      sales.map(function(t){return '<td><input type="number" min="0" id="as_'+i+'_'+esc(t.id)+'" value="'+((d.sales||{})[t.id]||"")+'" oninput="calcRow('+i+')"></td>'}).join("")+
      '<td><input type="number" min="0" id="cs'+i+'" value="'+(d.csat||"")+'" oninput="calcRow('+i+')"></td>'+
      '<td><input type="number" min="0" step="0.01" id="kp'+i+'" value="'+(d.kpt||"")+'" oninput="calcRow('+i+')"></td>'+
      '<td><input type="number" min="0" id="wr'+i+'" value="'+(d.wrap||"")+'" oninput="calcRow('+i+')"></td>'+
      '<td><input type="number" min="0" max="100" step="0.1" id="co'+i+'" value="'+(d.conf||"")+'" oninput="calcRow('+i+')"></td>'+
      '<td class="gain" id="gn'+i+'">0</td><td><b style="font-family:Fredoka">'+p.coins+'</b></td></tr>';
  }).join("");
  S.players.forEach(function(p,i){calcRow(i)});
}
function rowCalc(i){
  var sales={};activeSales().forEach(function(t){var v=dv("as_"+i+"_"+t.id);if(v>0)sales[t.id]=v});
  var r={pi:i,sales:sales,csat:dv("cs"+i),kpt:dv("kp"+i),wrap:dv("wr"+i),conf:dv("co"+i)};
  r.n=breakdown(S.players[i],r).n;return r;
}
function calcRow(i){var r=rowCalc(i);setTxt("gn"+i,r.n);UI.day[i]={sales:r.sales,csat:r.csat||"",kpt:r.kpt||"",wrap:r.wrap||"",conf:r.conf||""}}
function payout(){
  var rows=S.players.map(function(p,i){return rowCalc(i)}).filter(function(r){return r.n>0||r.kpt});
  if(!rows.length){toast("Ingen tal indtastet","bad");return}
  send({type:"payout",by:UI.me,pin:UI.pin,rows:rows},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    UI.day={};
    document.getElementById("payHint").innerHTML=r.tot?"✅ Udbetalte <b>"+r.tot+" mønter</b> til "+r.who+" medarbejdere.":"Ingen mønter at udbetale.";
    if(r.tot){toast("🪙 "+r.tot+" mønter udbetalt","win");burst(110)}
    if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    render();
  });
}
function clearDay(){UI.day={};if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();render()}
function renameP(i,v){send({type:"rename",by:UI.me,pin:UI.pin,pi:i,name:v},function(r){if(r&&r.err)toast(r.err,"bad");else toast("✏️ Navn gemt","cool")})}
function addPlayer(){send({type:"addPlayer",by:UI.me,pin:UI.pin})}

function drawAdmin(){
  var adm=iAmAdmin();
  document.getElementById("adminBody").style.display=adm?"":"none";
  document.getElementById("adminGate").style.display=adm?"none":"";
  setTxt("adminWho",adm?"Du er logget ind som administrator.":(isAdminAcct()?"Låst — indtast koden.":"Kun Oskar har adgang her."));
  document.getElementById("gateBtn").style.display=isAdminAcct()?"":"none";
  if(!adm)return;
  drawPending();
  var ids=[["rulesBox",drawRulesEditor],["gamesEdit",drawGamesEditor],["shopEdit",drawShopEditor]];
  ids.forEach(function(x){var e=document.getElementById(x[0]);if(!e.contains(document.activeElement))x[1]()});
  drawAdminTable();
  drawExEditor();
  setTxt("shareLink",location.origin+"/");
  document.getElementById("lockState").innerHTML=isLocked()?"⏳ <b>Pre-launch aktiv</b> — spillene åbner "+openText()+".":"🎉 <b>Spillehallen er åben</b>.";
  drawOrders();
  drawNewAdmin();
}
function drawOrders(){
  var e=document.getElementById("orders"),byId={},tot={},h="",any=false;
  shopList().forEach(function(it){byId[it.id]=it});
  S.players.forEach(function(p){
    if(!p.bought.length)return;any=true;
    var cnt={};p.bought.forEach(function(id){cnt[id]=(cnt[id]||0)+1;tot[id]=(tot[id]||0)+1});
    h+='<div class="orow"><div class="ava" style="background:'+p.color+'">'+p.icon+'</div><b style="min-width:110px">'+esc(p.name)+'</b><div class="ochips">'+
      Object.keys(cnt).map(function(id){var it=byId[id]||{ic:"❔",n:id};return '<span class="pv">'+esc(it.ic)+' '+esc(it.n)+' <b>×'+cnt[id]+'</b></span>'}).join("")+'</div></div>';
  });
  e.innerHTML=any?'<div class="osum"><b>Skal købes ind:</b> '+Object.keys(tot).map(function(id){var it=byId[id]||{ic:"❔",n:id};
    return esc(it.ic)+' '+esc(it.n)+' ×'+tot[id]}).join(" · ")+'</div>'+h:'<p class="hint" style="margin:0">Ingen har købt noget endnu.</p>';
}
function copyLink(){navigator.clipboard&&navigator.clipboard.writeText(location.origin+"/").then(function(){toast("🔗 Link kopieret","cool")})}
function clearOrders(){if(!confirm("Marker alle bestillinger som udleveret?"))return;
  send({type:"clearOrders",by:UI.me,pin:UI.pin},function(r){if(r&&r.err){toast(r.err,"bad");return}toast("✅ Bestillinger ryddet","cool")})}
function setOpenAt(v){send({type:"setOpen",by:UI.me,pin:UI.pin,openAt:v},function(r){if(r&&r.err){toast(r.err,"bad");return}
  toast(v?"⏳ Pre-launch aktiveret":"🎉 Spillehallen er åben!","cool")})}
function openMonday(){var d=new Date();d.setHours(8,0,0,0);do{d.setDate(d.getDate()+1)}while(d.getDay()!==1);
  if(confirm("Lås spillene indtil mandag kl. 08.00?"))setOpenAt(d.toISOString())}
function openNow(){if(confirm("Åbn Spillehallen for alle nu?"))setOpenAt(null)}
function resetField(){if(!confirm("Nyt minefelt?"))return;send({type:"newField",by:UI.me,pin:UI.pin},function(r){if(r&&r.err)toast(r.err,"bad");else toast("💣 Nyt minefelt klar","cool")})}
function newSeason(){
  var w=S.players.slice().sort(function(a,b){return b.pts-a.pts})[0];
  if(!confirm("Afslut sæson "+S.season+"?"+(w?"\n\nVinder: "+w.name+" med "+w.pts+" point.":"")+"\n\nMønter og point nulstilles. Regler, kiosk, børs og spil beholdes."))return;
  send({type:"newSeason",by:UI.me,pin:UI.pin},function(r){if(r&&r.err){toast(r.err,"bad");return}if(w){toast("🏆 "+w.name+" vandt sæsonen!","win");burst(320)}});
}

var cfc=document.getElementById("cf"),cfx=cfc.getContext("2d"),bits=[];
function cfsize(){cfc.width=innerWidth;cfc.height=innerHeight}
cfsize();addEventListener("resize",cfsize);
function burst(n){var cols=["#ffd166","#ff6fae","#4cc3f0","#2fbf71","#8b7bf0","#f2545b"];
  for(var i=0;i<n;i++)bits.push({x:innerWidth/2,y:100,vx:(Math.random()-.5)*13,vy:Math.random()*-11-3,s:5+Math.random()*7,c:cols[i%6],r:Math.random()*6,vr:(Math.random()-.5)*.4,l:1})}
(function loop(){
  cfx.clearRect(0,0,cfc.width,cfc.height);
  bits=bits.filter(function(b){return b.l>0});
  bits.forEach(function(b){b.vy+=.32;b.x+=b.vx;b.y+=b.vy;b.r+=b.vr;b.l-=.008;
    cfx.save();cfx.globalAlpha=Math.max(b.l,0);cfx.translate(b.x,b.y);cfx.rotate(b.r);cfx.fillStyle=b.c;cfx.fillRect(-b.s/2,-b.s/2,b.s,b.s*.62);cfx.restore()});
  requestAnimationFrame(loop);
})();

function render(){
  upgradeState(S);
  drawMe();
  var v=UI.view;
  if(v==="hq")drawHQ();else if(v==="games")drawGames();else if(v==="mine")drawMine();
  else if(v==="tetris")drawTetrisPage();else if(v==="wheel")drawWheelPage();else if(v==="shoot")drawShootPage();
  else if(v==="stack")drawStackPage();else if(v==="dig")drawDigPage();else if(v==="board")drawBoard();
  else if(v==="fly")drawFlyPage();else if(v==="road")drawRoadPage();else if(v==="cookie")drawCookiePage();
  else if(v==="lotto")drawLottoPage();else if(v==="rps")drawRpsPage();else if(v==="tip")drawTipPage();
  else if(v==="shop")drawShop();else if(v==="bors")drawBors();else if(v==="tal")drawTal();else if(v==="admin")drawAdmin();
  setTxt("seasonLbl","Sæson "+S.season);
}
