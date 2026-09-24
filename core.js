/* ===================== SLIK-ARENAEN — KERNE ===================== */
var N=96;
var ADMIN_PIN="2731";   /* bruges kun naar app'en koerer uden server */
var ICONS=["🦊","🐼","🐯","🐸","🦁","🐵","🐨","🦄","🐙","🐝","🦖","🐳","🦉","🐶","🐱"];
var COLORS=["#ffd166","#7ee0b0","#ff9ec7","#8fd0ff","#ffb37a","#c4b5fd","#7fe3e8","#ffa3a3",
            "#ffe08a","#a8eec0","#f5b8f0","#9ed7ff","#ffc2cd","#bdf0c4","#d4c9fb"];
var NAMES=["Oskar","Victoria H.","Nilaus","Anissa","Christoffer","Rafael","Victoria M.",
           "Altin","Amir","Faizan","Angelica"];
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
  tetris:{i:"🧱",n:"Tetris",d:"Ryddede 8+ rækker i ét spil"},
  streak:{i:"🔥",n:"På stribe",d:"3 dage i træk med KPT over 6,8"},
  rich:{i:"💰",n:"Formue",d:"Nåede 50 point på én sæson"},
  shop:{i:"🛒",n:"Shopaholic",d:"Købte noget i Kiosken"}
};
var SHOP=[
  {id:"sodavand",ic:"🥤",n:"Sodavand",   d:"Kold sodavand efter eget valg.",          c:45},
  {id:"flode",   ic:"🍫",n:"Flødeboller",d:"To stk. flødeboller.",                    c:60},
  {id:"slik",    ic:"🍬",n:"Slikpose",   d:"Bland selv fra skålen.",                  c:72},
  {id:"energi",  ic:"⚡",n:"Energidrik", d:"Til den sene eftermiddag.",               c:85},
  {id:"oreo",    ic:"🍪",n:"Oreo",       d:"Pakke Oreo-kiks fra kiosken.",            c:100},
  {id:"toffee",  ic:"🍮",n:"Toffee Fee", d:"Håndfuld Toffee Fee — den seje slags.",   c:120}
];
var GAMES=[
  {id:"mine",  ic:"💣",n:"Minefeltet",   d:"Holdets fælles bane. Ét felt pr. mønt — slik, jackpot eller bombe.",t:"risk",tl:"Fælles bane"},
  {id:"tetris",ic:"🧱",n:"Tetris",       d:"Klassikeren. Ryd rækker og saml point — så længe du kan.",t:"skill",tl:"Færdighed"},
  {id:"wheel", ic:"🎡",n:"Lykkehjulet",  d:"Ét spin på få sekunder. Perfekt når du har travlt.",t:"luck",tl:"Rent held"},
  {id:"shoot", ic:"🎯",n:"Skydeteltet",  d:"20 sekunder. Ram slikket, undgå bomberne.",t:"risk",tl:"Tempo"},
  {id:"stack", ic:"🏗️",n:"Stabelspillet",d:"Tim dit klik og byg tårnet så højt du tør.",t:"safe",tl:"Ingen risiko"},
  {id:"dig",   ic:"⛏️",n:"Guldgraveren", d:"Grav dybere for mere værdi — eller kom op i tide.",t:"risk",tl:"Alt eller intet"}
];

function buildField(){
  var f=[],i;
  for(i=0;i<10;i++)f.push({t:"mine",v:-3});
  for(i=0;i<3;i++) f.push({t:"mine",v:-6});
  for(i=0;i<20;i++)f.push({t:"candy",v:2});
  for(i=0;i<16;i++)f.push({t:"pts",v:3});
  for(i=0;i<11;i++)f.push({t:"pts",v:5});
  for(i=0;i<4;i++) f.push({t:"jack",v:14});
  for(i=0;i<5;i++) f.push({t:"safe",v:0});
  for(i=0;i<6;i++) f.push({t:"spin",v:0});
  while(f.length<N)f.push({t:"dud",v:0});
  for(i=f.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var x=f[i];f[i]=f[j];f[j]=x}
  return f.map(function(c){c.open=false;c.by=null;return c});
}
function mkPlayers(old){
  var src=old||NAMES.map(function(n){return{name:n}});
  return src.map(function(o,i){
    return {name:o.name,coins:0,pts:0,shield:false,streak:0,freeSpin:0,
            admin:(o.admin!=null?o.admin:(o.name==="Oskar")),badges:[],bought:[],
            color:o.color||COLORS[i%COLORS.length],icon:o.icon||ICONS[i%ICONS.length]};
  });
}
function freshState(old,season){
  return {field:buildField(),players:mkPlayers(old),log:[],last:-1,season:season||1,
          best:{wheel:0,shoot:0,stack:0,dig:0,tetris:0},spins:0,openAt:null,pending:[]};
}

var S=freshState();
var UI={view:"hq",me:-1,day:{},mode:"local",busy:false,ver:0,pin:""};

function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}

function levelOf(p){var l=LEVELS[0],i;for(i=0;i<LEVELS.length;i++)if(p>=LEVELS[i].p)l=LEVELS[i];return l}
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
function badgeOf(k){return BADGES[k]}
/* admin = admin-flag + laast op med kode i denne session */
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
function coinsForRow(p,r){
  var n=Math.floor(r.salg||0)+Math.floor((r.csat||0)/2)+((r.kpt||0)>6.8?1:0);
  if(r.wrap>0&&r.wrap<60)n+=1;
  if((r.conf||0)>80)n+=1;
  if((r.kpt||0)>6.8&&((p.streak||0)+1)%3===0)n+=2;
  return n;
}

var PAGES=["hq","games","mine","tetris","wheel","shoot","stack","dig","board","shop","tal","admin"];
function go(v){
  if(typeof shoot!=="undefined"&&shoot.on&&v!=="shoot")shootEnd(true);
  if(typeof stack!=="undefined"&&stack.on&&v!=="stack")stackEnd(true);
  if(typeof dig!=="undefined"&&dig.on&&v!=="dig")digEnd(true);
  if(typeof tet!=="undefined"&&tet.on&&v!=="tetris")tetrisEnd(true);
  UI.view=v;
  PAGES.forEach(function(k){var e=document.getElementById("v-"+k);if(e)e.hidden=(k!==v)});
  var navKey=(["mine","tetris","wheel","shoot","stack","dig"].indexOf(v)>-1)?"games":v;
  Array.prototype.forEach.call(document.querySelectorAll("#nav button"),function(b){
    b.classList.toggle("on",b.dataset.v===navKey);
  });
  render();
}

/* ---------- hvem er du ---------- */
function openWho(){
  var h="";
  S.players.forEach(function(p,i){
    h+='<button onclick="setMe('+i+')"><span class="ava" style="background:'+p.color+
       ';width:30px;height:30px;font-size:16px;border-radius:10px">'+p.icon+'</span>'+
       p.name+(p.admin?' 🔒':'')+'</button>';
  });
  document.getElementById("whoGrid").innerHTML=h;
  document.getElementById("whoModal").hidden=false;
}
function setMe(i){
  var p=S.players[i];
  document.getElementById("whoModal").hidden=true;
  if(p&&p.admin){ UI.me=i; lsSet("arena_me",String(i)); openPin(); return }
  UI.me=i;UI.pin="";lsDel("arena_pin");lsSet("arena_me",String(i));
  if(p)toast(p.icon+" Hej "+p.name+"!","cool");
  if(UI.view==="admin")go("hq"); else render();
}

/* ---------- pinkode ---------- */
function openPin(){
  var e=document.getElementById("pinModal");if(!e)return;
  e.hidden=false;
  setTxt("pinErr","");
  var f=document.getElementById("pinInput");
  if(f){f.value="";setTimeout(function(){f.focus()},60)}
}
function closePin(){
  var e=document.getElementById("pinModal");if(e)e.hidden=true;
  if(isAdminAcct()&&!UI.pin){ /* afbrudt login — gaa tilbage til valg */
    UI.me=-1;lsDel("arena_me");render();openWho();
  }
}
function submitPin(){
  var f=document.getElementById("pinInput");
  var pin=f?String(f.value||"").trim():"";
  if(!pin){setTxt("pinErr","Indtast koden");return}
  send({type:"adminLogin",pi:UI.me,pin:pin},function(r){
    if(r&&r.err){
      setTxt("pinErr",r.err);
      if(f){f.value="";f.focus()}
      return;
    }
    UI.pin=pin;lsSet("arena_pin",pin);
    document.getElementById("pinModal").hidden=true;
    toast("👑 Velkommen, Oskar","cool");
    render();
  });
}
function logoutAdmin(){
  UI.pin="";lsDel("arena_pin");
  toast("🔒 Låst igen","cool");
  go("hq");
}

function drawMe(){
  var p=me(),b=document.getElementById("meBtn");
  if(b)b.innerHTML=p
    ? '<span class="ava" style="background:'+p.color+'">'+p.icon+'</span>'+
      '<span><b>'+p.name+(p.admin?(UI.pin?' 👑':' 🔒'):'')+'</b><br>'+
      '<span>🪙 '+p.coins+' mønter · ⭐ '+p.pts+' point</span></span>'
    : '<span class="ava" style="background:#eee">❓</span><span><b>Vælg dig selv</b><br><span>klik her</span></span>';
  var s=document.getElementById("syncBadge");
  if(s){
    s.className="sync "+(UI.mode==="live"?"live":UI.mode==="error"?"err":"local");
    s.textContent=UI.mode==="live"?"● Live — alle ser det samme":
                  UI.mode==="error"?"● Offline":"● Kun denne skærm";
  }
  var nb=document.getElementById("navAdmin"), n=pend().length;
  if(nb){
    nb.style.display=iAmAdmin()?"":"none";
    var d=nb.querySelector(".dot");
    if(iAmAdmin()&&n>0){
      if(!d){d=document.createElement("span");d.className="dot";nb.appendChild(d)}
      d.textContent=n;
    } else if(d)d.remove();
  }
}

function rowHTML(p,i,mode,clickable){
  var r=ranks(),med=["🥇","🥈","🥉"];
  var right = mode==="coins"
    ? '<div class="score"><b>'+p.coins+'</b><span>MØNTER</span></div>'
    : '<div class="score"><b>'+p.pts+'</b><span>POINT</span></div>';
  return '<div class="prow'+(i===UI.me?" me":"")+(clickable?" pick":"")+'"'+
    (clickable?' onclick="setMe('+i+')"':'')+'>'+
    (r[i]<3?'<span class="medal">'+med[r[i]]+'</span>':'')+
    '<div class="ava" style="background:'+p.color+'">'+p.icon+'</div>'+
    '<div><div class="pname">'+p.name+(p.admin?' 👑':'')+
      ' <span class="lvl">'+levelOf(p.pts).n+'</span></div>'+
    '<div class="pmeta">🪙 '+p.coins+' · ⭐ '+p.pts+
      (p.shield?' · 🛡️':'')+(p.streak>=3?' · <span class="streak">🔥'+p.streak+'</span>':'')+
      (p.freeSpin?' · 🎡'+p.freeSpin+' gratis':'')+'</div></div>'+right+'</div>';
}
function drawList(id,mode,clickable){
  var e=document.getElementById(id);if(!e)return;
  var h="";S.players.forEach(function(p,i){h+=rowHTML(p,i,mode,clickable)});
  e.innerHTML=h;
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
    '<div><div class="nm">'+p.name+'</div><div class="sb">'+
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
   '<div class="stat"><b style="color:#f2545b">'+stat("mine")+'</b><span>bomber tilbage</span></div>'+
   '<div class="stat"><b>'+(lead&&lead.pts>0?lead.icon+" "+lead.pts:"–")+'</b><span>fører</span></div>'+
   (isLocked()?'<div class="stat" style="background:linear-gradient(180deg,#fff3d6,#ffe3f0);border-color:#f7cf95">'+
     '<b style="color:#b9895a;font-size:19px">'+countdown()+'</b><span>til åbning</span></div>':'');
  myBar("hqMe");
  drawList("hqList","pts",true);
  document.getElementById("hqLog").innerHTML=S.log.length?
    S.log.slice(0,12).map(function(l){return "<div>"+l+"</div>"}).join(""):
    '<div style="color:#c2ae9a">Ingenting er sket endnu.</div>';
  setTxt("seasonLbl","Sæson "+S.season);setTxt("seasonLbl2","Sæson "+S.season);
}

function drawGames(){
  myBar("gamesMe");
  var lk=document.getElementById("lockBanner");
  if(lk){
    lk.style.display=isLocked()?"":"none";
    if(isLocked())lk.innerHTML='<b>⏳ Spillehallen åbner '+openText()+'</b><br>'+
      '<span style="font-weight:800;font-size:13px">Saml mønter indtil da — '+countdown()+' tilbage. '+
      'Alt du tjener nu, kan du bruge når vi åbner.</span>';
  }
  var h="";
  GAMES.forEach(function(g){
    var sub=g.id==="mine" ? (N-openCount())+" felter tilbage"
                          : (S.best[g.id]?"Rekord: "+S.best[g.id]:"");
    h+='<div class="gcard'+(isLocked()?" lockedcard":"")+'" onclick="'+
       (isLocked()?'toast(\'⏳ Åbner '+openText()+'\',\'bad\')':'go(\''+g.id+'\')')+
       '"><div class="ic">'+(isLocked()?"🔒":g.ic)+'</div>'+
       '<b>'+g.n+'</b><p>'+g.d+'</p><span class="gtag t-'+g.t+'">'+g.tl+'</span>'+
       (sub?'<div class="pmeta" style="margin-top:8px">'+sub+'</div>':'')+'</div>';
  });
  document.getElementById("hub").innerHTML=h;
}

function drawMine(){
  var left=N-openCount();
  document.getElementById("mineStats").innerHTML=
   '<div class="stat"><b>'+left+'</b><span>felter tilbage</span></div>'+
   '<div class="stat"><b style="color:#f2545b">'+stat("mine")+'</b><span>bomber</span></div>'+
   '<div class="stat"><b style="color:#ff6fae">'+stat("candy")+'</b><span>slik</span></div>'+
   '<div class="stat"><b style="color:#e29500">'+stat("jack")+'</b><span>jackpot</span></div>'+
   '<div class="stat"><b style="color:#4cc3f0">'+stat("safe")+'</b><span>skjold</span></div>'+
   '<div class="stat"><b style="color:#8b7bf0">'+stat("spin")+'</b><span>gratis spin</span></div>';
  var pct=Math.round(openCount()/N*100);
  document.getElementById("pbar").style.width=pct+"%";
  setTxt("ptxt",openCount()+" af "+N+" felter ryddet · "+pct+"%");
  myBar("mineMe");
  var can=myCoins()>0;
  var h="";
  S.field.forEach(function(c,i){
    var cls=c.open?"done":(can?"":"locked");
    var p=c.by!=null?S.players[c.by]:null;
    h+='<div class="cell '+cls+(i===S.last?" fresh":"")+'"'+
       ((!c.open&&can)?' onclick="tap('+i+')"':'')+'>'+
       '<div class="face front">'+(i+1)+'</div>'+
       '<div class="face back b-'+c.t+'">'+FACE[c.t]+
         ((c.t==="pts"||c.t==="jack")?'<span class="v">+'+c.v+'</span>':'')+
         (c.t==="mine"?'<span class="v">'+c.v+'</span>':'')+
         (p?'<span class="who">'+p.icon+'</span>':'')+'</div></div>';
  });
  document.getElementById("grid").innerHTML=h;
  drawList("mineList","pts",false);
}
function tap(i){
  var p=me();
  if(!p){openWho();return}
  if(p.coins<1){toast("Du har ingen mønter tilbage","bad");return}
  if(S.field[i].open){toast("Feltet er lige blevet taget","bad");return}
  send({type:"tap",pi:UI.me,idx:i},function(r){
    if(!r)return;
    if(r.err){toast(r.err,"bad");return}
    if(r.kind==="candy")toast("🍬 Slik! +2 point","win");
    else if(r.kind==="jack"){toast("🏆 JACKPOT! +"+r.v,"win");burst(200)}
    else if(r.kind==="safe")toast("🛡️ Du er beskyttet","cool");
    else if(r.kind==="spin")toast("🎡 Gratis spin på Lykkehjulet!","cool");
    else if(r.kind==="mine")r.saved?toast("🛡️ Skjoldet holdt!","cool"):toast("💥 BOOM! "+r.v,"bad");
    else if(r.kind==="pts")toast("⭐ +"+r.v+" point","win");
    if(N-openCount()===0){toast("🏁 Minefeltet er ryddet!","win");burst(300)}
  });
}

function drawBoard(){
  var sorted=S.players.map(function(p,i){return{p:p,i:i}}).sort(function(a,b){return b.p.pts-a.p.pts});
  var max=Math.max(1,sorted[0]?sorted[0].p.pts:1);
  var med=["🥇","🥈","🥉"],ord=[1,0,2],h="";
  ord.forEach(function(k){
    var o=sorted[k];if(!o)return;
    h+='<div class="pod" style="min-height:'+[92,116,78][k]+'px">'+
       '<div class="ava" style="background:'+o.p.color+'">'+o.p.icon+'</div>'+
       '<b>'+med[k]+' '+o.p.pts+'</b><small>'+o.p.name.toUpperCase()+'</small></div>';
  });
  document.getElementById("podium").innerHTML=h;
  h="";
  sorted.forEach(function(o,k){
    var p=o.p;
    h+='<div class="lbrow'+(k<3?" p"+(k+1):"")+(o.i===UI.me?" you":"")+'">'+
       '<div class="rank">'+(k<3?med[k]:"#"+(k+1))+'</div>'+
       '<div class="ava" style="background:'+p.color+'">'+p.icon+'</div>'+
       '<div style="min-width:132px"><div class="pname">'+p.name+'</div>'+
       '<div class="pmeta">'+levelOf(p.pts).n+' · 🪙 '+p.coins+
         (p.streak>=3?' · <span class="streak">🔥'+p.streak+'</span>':'')+'</div>'+
       '<div class="badges">'+p.badges.map(function(b){
          return badgeOf(b)?'<span class="badge" title="'+badgeOf(b).n+'">'+badgeOf(b).i+'</span>':''}).join("")+
       '</div></div>'+
       '<div class="bar"><i style="width:'+Math.round(p.pts/max*100)+'%;background:'+p.color+'"></i></div>'+
       '<div class="score"><b>'+p.pts+'</b><span>POINT</span></div></div>';
  });
  document.getElementById("lb").innerHTML=h;
  h="";
  Object.keys(BADGES).forEach(function(k){
    var b=BADGES[k],who=S.players.filter(function(p){return p.badges.indexOf(k)>-1});
    h+='<div class="item"><div class="ic">'+b.i+'</div><b>'+b.n+'</b><p>'+b.d+'</p>'+
       '<div class="pmeta">'+(who.length?who.map(function(p){return p.icon}).join(" "):"Ingen endnu")+'</div></div>';
  });
  document.getElementById("badgeInfo").innerHTML=h;
}

function drawShop(){
  myBar("shopMe",(me()?"Du har ⭐ "+me().pts+" point at handle for":""));
  var p=me(),h="";
  SHOP.forEach(function(it){
    var ok=p&&p.pts>=it.c;
    var n=p?p.bought.filter(function(x){return x===it.id}).length:0;
    h+='<div class="item'+(ok?" can":"")+'"><div class="ic">'+it.ic+'</div>'+
       '<b>'+it.n+'</b><p>'+it.d+'</p>'+
       (n?'<span class="owned">Købt '+n+'×</span>':'')+
       '<span class="cost">'+it.c+' point</span>'+
       '<button class="big sm" onclick="buy(\''+it.id+'\')"'+(ok?"":" disabled")+'>'+
       (ok?"Køb":(p?"Mangler "+(it.c-p.pts):"Vælg dig selv"))+'</button></div>';
  });
  document.getElementById("shop").innerHTML=h;
}
function buy(id){
  var p=me(),it=SHOP.filter(function(x){return x.id===id})[0];
  if(!p||!it)return;
  send({type:"buy",pi:UI.me,id:it.id,cost:it.c,ic:it.ic,n:it.n},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast(it.ic+" Du købte "+it.n+"!","win");burst(90);
  });
}

/* ================= MINE TAL ================= */
function dv(id){var e=document.getElementById(id);return e?parseFloat(e.value)||0:0}
function myRow(){
  return {salg:dv("mySalg"),csat:dv("myCsat"),kpt:dv("myKpt"),wrap:dv("myWrap"),conf:dv("myConf")};
}
function calcMine(){
  var p=me();if(!p)return;
  var r=myRow(),n=coinsForRow(p,r);
  setTxt("myCoins",n);
  var d=document.getElementById("myDetail");
  if(d){
    var parts=[];
    if(r.salg)parts.push(Math.floor(r.salg)+" fra salg");
    if(r.csat>=2)parts.push(Math.floor(r.csat/2)+" fra CSAT");
    if(r.kpt>6.8)parts.push("1 fra KPT");
    if(r.wrap>0&&r.wrap<60)parts.push("1 fra wrap up");
    if(r.conf>80)parts.push("1 fra conformance");
    if(r.kpt>6.8&&((p.streak||0)+1)%3===0)parts.push("2 i streak-bonus 🔥");
    d.textContent=parts.length?parts.join(" · "):"Udfyld felterne herover";
  }
}
function drawTal(){
  var p=me();
  myBar("talMe",(p?"Tast dine tal ind — Oskar godkender dem":""));
  var mine=pend().filter(function(x){return x.pi===UI.me})[0];
  var box=document.getElementById("myStatus");
  if(box){
    if(!p)box.innerHTML='<div class="sent wait">Vælg dig selv øverst først.</div>';
    else if(mine)box.innerHTML='<div class="sent wait">⏳ <b>Sendt til godkendelse</b> — '+
      mine.n+' mønter afventer Oskar. Du kan sende igen, hvis du har tastet forkert.</div>';
    else box.innerHTML='<div class="sent">✅ Ingen indsendelser venter. Tast dagens tal ind, når du er klar.</div>';
  }
  var b=document.getElementById("sendBtn");
  if(b)b.disabled=!p;
  calcMine();
}
function submitMine(){
  var p=me();
  if(!p){openWho();return}
  var r=myRow();
  if(!r.salg&&!r.csat&&!r.kpt&&!r.wrap&&!r.conf){toast("Udfyld mindst ét felt","bad");return}
  send({type:"submit",pi:UI.me,row:r},function(res){
    if(res&&res.err){toast(res.err,"bad");return}
    toast("📨 Sendt til godkendelse — "+(res?res.n:0)+" mønter","cool");
    ["mySalg","myCsat","myKpt","myWrap","myConf"].forEach(function(id){
      var e=document.getElementById(id);if(e)e.value="";});
    calcMine();
  });
}

/* ================= ADMIN ================= */
function drawPending(){
  var e=document.getElementById("pendList");if(!e)return;
  var list=pend();
  setTxt("pendCount",list.length?list.length+" venter":"Ingen venter");
  var ab=document.getElementById("approveAllBtn");
  if(!list.length){
    e.innerHTML='<p class="hint" style="margin:0">Ingen indsendelser lige nu.</p>';
    if(ab)ab.disabled=true;return;
  }
  if(ab)ab.disabled=false;
  var h="";
  list.forEach(function(it){
    var q=S.players[it.pi]||{name:"?",icon:"❓",color:"#eee"};
    var t=new Date(it.at);
    h+='<div class="pend">'+
       '<div class="ava" style="background:'+q.color+'">'+q.icon+'</div>'+
       '<div style="min-width:120px"><div class="pname">'+q.name+'</div>'+
       '<div class="pmeta">'+("0"+t.getHours()).slice(-2)+"."+("0"+t.getMinutes()).slice(-2)+'</div></div>'+
       '<div class="vals">'+
         '<span class="pv'+(it.salg?'':' no')+'">Salg <b>'+it.salg+'</b></span>'+
         '<span class="pv'+(it.csat?'':' no')+'">CSAT <b>'+it.csat+'</b></span>'+
         '<span class="pv'+(it.kpt?'':' no')+'">KPT <b>'+it.kpt+'</b></span>'+
         '<span class="pv'+(it.wrap?'':' no')+'">Wrap <b>'+it.wrap+'s</b></span>'+
         '<span class="pv'+(it.conf?'':' no')+'">Conf <b>'+it.conf+'%</b></span>'+
       '</div>'+
       '<span class="pcoins">🪙 '+it.n+'</span>'+
       '<div class="acts">'+
         '<button class="big sm grn" onclick="approve(\''+it.id+'\')">Godkend</button>'+
         '<button class="ghost warn" onclick="reject(\''+it.id+'\')">Afvis</button>'+
       '</div></div>';
  });
  e.innerHTML=h;
}
function approve(id){
  send({type:"approve",by:UI.me,pin:UI.pin,id:id},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast("✅ Godkendt — "+(r?r.n:0)+" mønter til "+(r?r.name:""),"win");
  });
}
function reject(id){
  send({type:"reject",by:UI.me,pin:UI.pin,id:id},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast("↩️ Afvist — "+(r?r.name:"")+" kan taste igen","cool");
  });
}
function approveAll(){
  if(!pend().length)return;
  if(!confirm("Godkend alle "+pend().length+" indsendelser?"))return;
  send({type:"approveAll",by:UI.me,pin:UI.pin},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    if(r&&r.tot){toast("🪙 "+r.tot+" mønter udbetalt til "+r.who,"win");burst(130)}
  });
}
function drawAdmin(){
  var adm=iAmAdmin();
  var body=document.getElementById("adminBody");
  var gate=document.getElementById("adminGate");
  if(body)body.style.display=adm?"":"none";
  if(gate)gate.style.display=adm?"none":"";
  setTxt("adminWho",adm?"Du er logget ind som administrator."
    :(isAdminAcct()?"Låst — indtast koden for at få adgang."
                   :"Kun Oskar har adgang her. Brug »Mine tal« i stedet."));
  var gb=document.getElementById("gateBtn");
  if(gb)gb.style.display=isAdminAcct()?"":"none";
  if(!adm)return;
  drawPending();
  var h="";
  S.players.forEach(function(p,i){
    var d=UI.day[i]||{};
    h+='<tr><td><div class="ava" style="background:'+p.color+'">'+p.icon+'</div></td>'+
       '<td><input type="text" value="'+p.name+'" onchange="renameP('+i+',this.value)">'+
         '<div class="pmeta">'+(p.streak?"🔥 "+p.streak+" dage":"")+'</div></td>'+
       '<td><input type="number" min="0" id="sa'+i+'" value="'+(d.salg||"")+'" oninput="calcRow('+i+')"></td>'+
       '<td><input type="number" min="0" id="cs'+i+'" value="'+(d.csat||"")+'" oninput="calcRow('+i+')"></td>'+
       '<td><input type="number" min="0" step="0.01" id="kp'+i+'" value="'+(d.kpt||"")+'" oninput="calcRow('+i+')"></td>'+
       '<td><input type="number" min="0" id="wr'+i+'" value="'+(d.wrap||"")+'" oninput="calcRow('+i+')"></td>'+
       '<td><input type="number" min="0" max="100" step="0.1" id="co'+i+'" value="'+(d.conf||"")+'" oninput="calcRow('+i+')"></td>'+
       '<td class="gain" id="gn'+i+'">0</td>'+
       '<td><b style="font-family:Fredoka">'+p.coins+'</b></td></tr>';
  });
  document.getElementById("adminRows").innerHTML=h;
  S.players.forEach(function(p,i){calcRow(i)});
  setTxt("shareLink",shareUrl());
  var ls=document.getElementById("lockState");
  if(ls)ls.innerHTML=isLocked()
    ? "⏳ <b>Pre-launch aktiv</b> — spillene åbner "+openText()+" ("+countdown()+" tilbage). Mønter optjenes normalt."
    : "🎉 <b>Spillehallen er åben</b> — alle kan spille.";
  drawOrders();
}
function drawOrders(){
  var e=document.getElementById("orders");if(!e)return;
  var any=false,h='<table class="tbl"><thead><tr><th></th><th>Medarbejder</th>';
  SHOP.forEach(function(it){h+='<th>'+it.ic+'</th>'});
  h+='</tr></thead><tbody>';
  S.players.forEach(function(p){
    if(!p.bought.length)return;
    any=true;
    h+='<tr><td><div class="ava" style="background:'+p.color+'">'+p.icon+'</div></td>'+
       '<td><b>'+p.name+'</b></td>';
    SHOP.forEach(function(it){
      var n=p.bought.filter(function(x){return x===it.id}).length;
      h+='<td>'+(n?'<b style="font-family:Fredoka;font-size:17px">'+n+'</b>':'<span style="color:#dcc9b4">–</span>')+'</td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table>';
  e.innerHTML=any?h:'<p class="hint" style="margin:0">Ingen har købt noget endnu.</p>';
}
function val(id){var e=document.getElementById(id);return e?parseFloat(e.value)||0:0}
function rowCalc(i){
  var p=S.players[i];
  var r={salg:val("sa"+i),csat:val("cs"+i),kpt:val("kp"+i),wrap:val("wr"+i),conf:val("co"+i)};
  return {pi:i,n:coinsForRow(p,r),salg:r.salg,csat:r.csat,kpt:r.kpt,wrap:r.wrap,conf:r.conf};
}
function calcRow(i){
  var r=rowCalc(i);setTxt("gn"+i,r.n);
  UI.day[i]={salg:val("sa"+i)||"",csat:val("cs"+i)||"",kpt:val("kp"+i)||"",
             wrap:val("wr"+i)||"",conf:val("co"+i)||""};
}
function payout(){
  var rows=S.players.map(function(p,i){return rowCalc(i)}).filter(function(r){return r.n>0});
  if(!rows.length){toast("Ingen tal indtastet","bad");return}
  send({type:"payout",by:UI.me,pin:UI.pin,rows:rows},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    UI.day={};
    var ph=document.getElementById("payHint");
    if(ph)ph.innerHTML=(r&&r.tot)?"✅ Udbetalte <b>"+r.tot+" mønter</b> til "+r.who+" medarbejdere.":"Ingen tal indtastet.";
    if(r&&r.tot){toast("🪙 "+r.tot+" mønter udbetalt","win");burst(110)}
  });
}
function clearDay(){UI.day={};render()}
function renameP(i,v){send({type:"rename",by:UI.me,pin:UI.pin,pi:i,name:v})}
function addPlayer(){send({type:"addPlayer",by:UI.me,pin:UI.pin})}
function shareUrl(){return (location.origin+location.pathname).replace(/index\.html$/,"")}
function copyLink(){
  var t=shareUrl();
  if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast("🔗 Link kopieret","cool")});
  else toast("Kopier linket fra feltet","cool");
}
function clearOrders(){
  if(!confirm("Marker alle bestillinger som udleveret? Listen nulstilles."))return;
  send({type:"clearOrders",by:UI.me,pin:UI.pin},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast("✅ Bestillinger ryddet","cool");
  });
}
function setOpenAt(v){send({type:"setOpen",by:UI.me,pin:UI.pin,openAt:v},function(r){
  if(r&&r.err){toast(r.err,"bad");return}
  toast(v?"⏳ Pre-launch aktiveret":"🎉 Spillehallen er åben!","cool");
  if(!v)burst(200);
})}
function openMonday(){
  var d=new Date();d.setHours(8,0,0,0);
  do{d.setDate(d.getDate()+1)}while(d.getDay()!==1);
  if(confirm("Start pre-launch?\n\nSpillene låses indtil mandag kl. 08.00 ("+
    d.toLocaleDateString("da-DK")+").\nAlle kan stadig tjene mønter imens."))
    setOpenAt(d.toISOString());
}
function openNow(){ if(confirm("Åbn Spillehallen for alle nu?"))setOpenAt(null) }
function resetField(){
  if(!confirm("Nyt minefelt? Felterne nulstilles — point og mønter beholdes."))return;
  send({type:"newField",by:UI.me,pin:UI.pin},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast("💣 Nyt minefelt klar","cool");
  });
}
function newSeason(){
  var w=S.players.slice().sort(function(a,b){return b.pts-a.pts})[0];
  if(!confirm("Afslut sæson "+S.season+"?"+(w?"\n\nVinder: "+w.name+" med "+w.pts+" point.":"")+
    "\n\nAlt nulstilles — nyt minefelt, point og mønter på nul."))return;
  send({type:"newSeason",by:UI.me,pin:UI.pin},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    if(w){toast("🏆 "+w.name+" vandt sæsonen!","win");burst(320)}
  });
}

var cfc=document.getElementById("cf"),cfx=cfc.getContext("2d"),bits=[];
function cfsize(){cfc.width=innerWidth;cfc.height=innerHeight}
cfsize();addEventListener("resize",cfsize);
function burst(n){
  var cols=["#ffd166","#ff6fae","#4cc3f0","#2fbf71","#8b7bf0","#f2545b"];
  for(var i=0;i<n;i++)bits.push({x:innerWidth/2,y:100,vx:(Math.random()-.5)*13,
    vy:Math.random()*-11-3,s:5+Math.random()*7,c:cols[i%cols.length],
    r:Math.random()*6,vr:(Math.random()-.5)*.4,l:1});
}
(function loop(){
  cfx.clearRect(0,0,cfc.width,cfc.height);
  bits=bits.filter(function(b){return b.l>0});
  bits.forEach(function(b){
    b.vy+=.32;b.x+=b.vx;b.y+=b.vy;b.r+=b.vr;b.l-=.008;
    cfx.save();cfx.globalAlpha=Math.max(b.l,0);cfx.translate(b.x,b.y);cfx.rotate(b.r);
    cfx.fillStyle=b.c;cfx.fillRect(-b.s/2,-b.s/2,b.s,b.s*.62);cfx.restore();
  });
  requestAnimationFrame(loop);
})();

function render(){
  drawMe();
  var v=UI.view;
  if(v==="hq")drawHQ();
  else if(v==="games")drawGames();
  else if(v==="mine")drawMine();
  else if(v==="tetris")drawTetrisPage();
  else if(v==="wheel")drawWheelPage();
  else if(v==="shoot")drawShootPage();
  else if(v==="stack")drawStackPage();
  else if(v==="dig")drawDigPage();
  else if(v==="board")drawBoard();
  else if(v==="shop")drawShop();
  else if(v==="tal")drawTal();
  else if(v==="admin")drawAdmin();
  setTxt("seasonLbl","Sæson "+S.season);
}
