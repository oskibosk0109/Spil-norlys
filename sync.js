/* ===================== DELT TILSTAND ===================== */
var API="api/state";
var POLL=2500;
var SY={timer:null,inflight:false};

function localSave(){try{localStorage.setItem("arena_local",JSON.stringify(S))}catch(e){}}
function localLoad(){
  try{var r=localStorage.getItem("arena_local");if(r)return JSON.parse(r)}catch(e){}
  return null;
}
/* offline: admin kraever admin-flag + korrekt kode */
function isAdminLocal(by,pin){
  var q=(by!=null)?S.players[by]:null;
  return !!(q&&q.admin&&String(pin||"")===ADMIN_PIN);
}
var DENY_L={err:"Forkert kode — kun Oskar har adgang"};

function applyLocal(a){
  if(!S.pending)S.pending=[];
  var P=S.players,p=(a.pi!=null)?P[a.pi]:null;
  function lg(m){S.log.unshift(m);if(S.log.length>80)S.log.pop()}
  function bd(q,k){if(q.badges.indexOf(k)<0)q.badges.push(k)}
  function ap(q,n){q.pts=Math.max(0,q.pts+n);if(q.pts>=50)bd(q,"rich")}
  function grant(pi,r){
    var q=P[pi];if(!q)return 0;
    var n=coinsForRow(q,r);
    if((r.kpt||0)>6.8){q.streak++;if(q.streak>=3)bd(q,"streak")}
    else if(r.salg||r.csat||r.kpt)q.streak=0;
    if(n>0){q.coins+=n;
      lg(q.icon+" <b>"+q.name+"</b> fik "+n+" mønter ("+(r.salg||0)+" salg, "+(r.csat||0)+
        " CSAT, KPT "+(r.kpt||0)+(r.wrap?", wrap "+r.wrap+"s":"")+(r.conf?", conf "+r.conf+"%":"")+")")}
    return n;
  }

  if(a.type==="adminLogin"){
    var q0=(a.pi!=null)?P[a.pi]:null;
    if(!q0||!q0.admin)return{err:"Denne bruger har ikke admin"};
    if(String(a.pin||"")!==ADMIN_PIN)return{err:"Forkert kode"};
    return{ok:true};
  }
  if(a.type==="tap"){
    if(!p)return{err:"Ukendt spiller"};
    if(isLocked())return{err:"Spillene åbner "+openText()};
    var c=S.field[a.idx];
    if(c.open)return{err:"Feltet er allerede taget"};
    if(p.coins<1)return{err:"Du har ingen mønter tilbage"};
    p.coins--;c.open=true;c.by=a.pi;S.last=a.idx;
    if(S.field.filter(function(x){return x.open}).length===1)bd(p,"first");
    var nm=p.icon+" <b>"+p.name+"</b>",r={kind:c.t,v:c.v};
    if(c.t==="candy"){ap(p,2);lg(nm+" fandt 🍬 slik (felt "+(a.idx+1)+")")}
    else if(c.t==="pts"){ap(p,c.v);lg(nm+" fandt ⭐ "+c.v+" point (felt "+(a.idx+1)+")")}
    else if(c.t==="jack"){ap(p,c.v);bd(p,"jack");lg(nm+" ramte 🏆 JACKPOT (felt "+(a.idx+1)+")")}
    else if(c.t==="safe"){p.shield=true;lg(nm+" fandt 🛡️ skjold")}
    else if(c.t==="spin"){p.freeSpin++;lg(nm+" fandt 🎡 gratis spin")}
    else if(c.t==="mine"){
      if(p.shield){p.shield=false;bd(p,"survivor");r.saved=true;lg(nm+" ramte 💥 — skjoldet holdt!")}
      else{ap(p,c.v);bd(p,"boom");lg(nm+" sprang på 💥 ("+c.v+" point)")}
    } else lg(nm+" åbnede et tomt felt "+(a.idx+1));
    return r;
  }
  if(a.type==="spend"){
    if(!p)return{err:"Ukendt spiller"};
    if(isLocked())return{err:"Spillene åbner "+openText()};
    if(a.free&&p.freeSpin>0){p.freeSpin--;return{free:true}}
    if(p.coins<1)return{err:"Du har ingen mønter tilbage"};
    p.coins--;if(a.game==="wheel")S.spins++;
    return{ok:true};
  }
  if(a.type==="score"){
    if(!p)return{err:"Ukendt spiller"};
    ap(p,a.pts||0);
    if(a.badge)bd(p,a.badge);
    if(a.best&&a.score!=null&&a.score>(S.best[a.best]||0))S.best[a.best]=a.score;
    if(a.freeSpin)p.freeSpin+=a.freeSpin;
    if(a.teamCoins)P.forEach(function(q){q.coins+=a.teamCoins});
    if(a.log)lg(p.icon+" <b>"+p.name+"</b> "+a.log);
    return{ok:true};
  }
  if(a.type==="submit"){
    if(!p)return{err:"Vælg dig selv først"};
    var rw=a.row||{};
    if(!rw.salg&&!rw.csat&&!rw.kpt&&!rw.wrap&&!rw.conf)return{err:"Udfyld mindst ét felt"};
    S.pending=S.pending.filter(function(x){return x.pi!==a.pi});
    S.pending.push({id:Date.now()+"-"+a.pi,pi:a.pi,at:new Date().toISOString(),
      salg:+rw.salg||0,csat:+rw.csat||0,kpt:+rw.kpt||0,wrap:+rw.wrap||0,conf:+rw.conf||0,
      n:coinsForRow(p,rw)});
    lg("📨 <b>"+p.name+"</b> sendte sine tal til godkendelse");
    return{ok:true,n:coinsForRow(p,rw)};
  }
  if(a.type==="approve"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    var it=S.pending.filter(function(x){return x.id===a.id})[0];
    if(!it)return{err:"Indsendelsen findes ikke længere"};
    var n1=grant(it.pi,it);
    S.pending=S.pending.filter(function(x){return x.id!==a.id});
    return{ok:true,n:n1,name:P[it.pi]?P[it.pi].name:""};
  }
  if(a.type==="approveAll"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    var tot=0,who=0;
    S.pending.forEach(function(it){var n=grant(it.pi,it);if(n>0){tot+=n;who++}});
    S.pending=[];
    return{ok:true,tot:tot,who:who};
  }
  if(a.type==="reject"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    var it2=S.pending.filter(function(x){return x.id===a.id})[0];
    if(!it2)return{err:"Indsendelsen findes ikke længere"};
    S.pending=S.pending.filter(function(x){return x.id!==a.id});
    var q2=P[it2.pi];
    if(q2)lg("↩️ <b>"+q2.name+"</b>s tal blev afvist — tast igen");
    return{ok:true,name:q2?q2.name:""};
  }
  if(a.type==="payout"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    var t2=0,w2=0;
    (a.rows||[]).forEach(function(r){var n=grant(r.pi,r);if(n>0){t2+=n;w2++}});
    return{ok:true,tot:t2,who:w2};
  }
  if(a.type==="buy"){
    if(!p)return{err:"Ukendt spiller"};
    if(p.pts<a.cost)return{err:"Ikke nok point"};
    p.pts-=a.cost;p.bought.push(a.id);bd(p,"shop");
    lg(p.icon+" <b>"+p.name+"</b> købte "+a.ic+" "+a.n+" for "+a.cost+" point");
    return{ok:true};
  }
  if(a.type==="setOpen"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    S.openAt=a.openAt||null;return{ok:true};
  }
  if(a.type==="clearOrders"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    P.forEach(function(q){q.bought=[]});
    lg("✅ <b>Bestillinger udleveret</b> — listen er ryddet");
    return{ok:true};
  }
  if(a.type==="rename"){
    if(a.by!==a.pi&&!isAdminLocal(a.by,a.pin))return DENY_L;
    if(p)p.name=a.name||"?";return{ok:true};
  }
  if(a.type==="addPlayer"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    var i=P.length;
    P.push({name:"Ny deltager",coins:0,pts:0,shield:false,streak:0,freeSpin:0,admin:false,
      badges:[],bought:[],color:COLORS[i%COLORS.length],icon:ICONS[i%ICONS.length]});
    return{ok:true};
  }
  if(a.type==="newField"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    S.field=buildField();S.last=-1;lg("💣 <b>Nyt minefelt</b> lagt ud");return{ok:true};
  }
  if(a.type==="newSeason"){
    if(!isAdminLocal(a.by,a.pin))return DENY_L;
    var keep=P.map(function(q){return{name:q.name,icon:q.icon,color:q.color,admin:!!q.admin}});
    var se=(S.season||1)+1;
    S=freshState(keep,se);
    S.log.unshift("🏁 <b>Sæson "+se+"</b> er startet");
    return{ok:true};
  }
  return{err:"Ukendt handling"};
}

function send(action,cb){
  if(UI.mode!=="live"){
    var r=applyLocal(action);
    localSave();render();
    if(cb)cb(r);
    if(r&&r.err&&action.type!=="tap"&&action.type!=="adminLogin")toast(r.err,"bad");
    return;
  }
  UI.busy=true;
  fetch(API,{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify(action)})
    .then(function(x){return x.json()})
    .then(function(d){
      UI.busy=false;
      if(d.state){S=d.state;UI.ver=d.v||0}
      render();
      if(cb)cb(d.result||(d.err?{err:d.err}:null));
    })
    .catch(function(){
      UI.busy=false;UI.mode="error";render();
      toast("Mistede forbindelsen — prøv igen","bad");
      if(cb)cb({err:"Ingen forbindelse"});
    });
}

function pull(){
  if(UI.mode!=="live"||UI.busy||SY.inflight)return;
  SY.inflight=true;
  fetch(API,{headers:{"cache-control":"no-cache"}})
    .then(function(x){return x.json()})
    .then(function(d){
      SY.inflight=false;
      if(!d.state)return;
      if(d.v!==UI.ver){
        var busyGame=(typeof shoot!=="undefined"&&shoot.on)||
                     (typeof stack!=="undefined"&&stack.on)||
                     (typeof wheel!=="undefined"&&wheel.on)||
                     (typeof tet!=="undefined"&&tet.on)||
                     (typeof dig!=="undefined"&&dig.on);
        S=d.state;UI.ver=d.v;
        if(!busyGame)render(); else drawMe();
      }
    })
    .catch(function(){SY.inflight=false});
}

function boot(){
  var saved=lsGet("arena_me");
  if(!API){UI.mode="local";var l0=localLoad();if(l0&&l0.players&&l0.field)S=l0;finishBoot(saved);return}
  fetch(API,{headers:{"cache-control":"no-cache"}})
    .then(function(x){if(!x.ok)throw 0;return x.json()})
    .then(function(d){
      if(!d.state)throw 0;
      S=d.state;UI.ver=d.v||0;UI.mode="live";
      finishBoot(saved);
      clearInterval(SY.timer);SY.timer=setInterval(pull,POLL);
    })
    .catch(function(){
      UI.mode="local";
      var l=localLoad();
      if(l&&l.players&&l.field)S=l;
      finishBoot(saved);
    });
}
function finishBoot(saved){
  if(!S.pending)S.pending=[];
  if(saved!=null&&S.players[+saved]){
    UI.me=+saved;
    var p=S.players[UI.me];
    if(p&&p.admin){
      /* genskab admin-adgang hvis koden er gemt og stadig gaelder */
      var pin=lsGet("arena_pin");
      if(pin){
        send({type:"adminLogin",pi:UI.me,pin:pin},function(r){
          if(r&&!r.err){UI.pin=pin}else{lsDel("arena_pin")}
          render();
        });
      }
    }
  }
  go(UI.view||"hq");
  if(UI.me<0)setTimeout(openWho,400);
}
boot();
