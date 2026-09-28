/* ===================== DELT TILSTAND ===================== */
/* Paa den hostede side (http/https) bruges ALTID serveren.
   Lokal tilstand bruges kun naar filen aabnes direkte fra disken. */
var HOSTED=(location.protocol==="http:"||location.protocol==="https:");
var API=HOSTED?"/api/state":null;
var POLL=2500;
var SY={timer:null,retry:null,inflight:false};

function localSave(){if(HOSTED)return;try{localStorage.setItem("arena_local",JSON.stringify(S))}catch(e){}}
function localLoad(){
  if(HOSTED)return null;
  try{var r=localStorage.getItem("arena_local");if(r)return JSON.parse(r)}catch(e){}
  return null;
}
if(HOSTED){try{localStorage.removeItem("arena_local")}catch(e){}}

function isAdminLocal(by,pin){
  var q=(by!=null)?S.players[by]:null;
  return !!(q&&q.admin&&String(pin||"")===ADMIN_PIN);
}
var DENY_L={err:"Forkert kode — kun Oskar har adgang"};

/* bruges kun offline (fil aabnet fra disken) */
function applyLocal(a){
  upgradeState(S);
  var P=S.players,p=(a.pi!=null)?P[a.pi]:null;
  function lg(m){S.log.unshift(m);if(S.log.length>80)S.log.pop()}
  function bd(q,k){if(q.badges.indexOf(k)<0)q.badges.push(k)}
  function ap(q,n){q.pts=Math.max(0,q.pts+n);if(q.pts>=50)bd(q,"rich")}
  function grant(pi,r){
    var q=P[pi];if(!q)return 0;
    var n=coinsForRow(q,r);
    if((r.kpt||0)>6.8){q.streak++;if(q.streak>=3)bd(q,"streak")}
    else if(r.salg||r.csat||r.kpt)q.streak=0;
    if(n>0){q.coins+=n;lg(q.icon+" <b>"+q.name+"</b> fik "+n+" mønter")}
    return n;
  }
  var ADM=function(){return isAdminLocal(a.by,a.pin)};
  switch(a.type){
  case "adminLogin":
    var q0=(a.pi!=null)?P[a.pi]:null;
    if(!q0||!q0.admin)return{err:"Denne bruger har ikke admin"};
    if(String(a.pin||"")!==ADMIN_PIN)return{err:"Forkert kode"};
    return{ok:true};
  case "tap":
    if(!p)return{err:"Ukendt spiller"};
    if(isLocked())return{err:"Spillene åbner "+openText()};
    var c=S.field[a.idx];
    if(c.open)return{err:"Feltet er allerede taget"};
    if(p.coins<1)return{err:"Du har ingen mønter tilbage"};
    p.coins--;c.open=true;c.by=a.pi;S.last=a.idx;
    var r={kind:c.t,v:c.v};
    if(c.t==="candy")ap(p,2);
    else if(c.t==="pts"||c.t==="jack")ap(p,c.v);
    else if(c.t==="safe")p.shield=true;
    else if(c.t==="spin")p.freeSpin++;
    else if(c.t==="mine"){if(p.shield){p.shield=false;r.saved=true}else ap(p,c.v)}
    lg(p.icon+" <b>"+p.name+"</b> åbnede felt "+(a.idx+1));
    return r;
  case "spend":
    if(!p)return{err:"Ukendt spiller"};
    if(isLocked())return{err:"Spillene åbner "+openText()};
    if(a.free&&p.freeSpin>0){p.freeSpin--;return{free:true}}
    if(p.coins<1)return{err:"Du har ingen mønter tilbage"};
    p.coins--;if(a.game==="wheel")S.spins++;return{ok:true};
  case "score":
    if(!p)return{err:"Ukendt spiller"};
    ap(p,a.pts||0);if(a.badge)bd(p,a.badge);
    if(a.best&&a.score!=null&&a.score>(S.best[a.best]||0))S.best[a.best]=a.score;
    if(a.freeSpin)p.freeSpin+=a.freeSpin;
    if(a.teamCoins)P.forEach(function(q){q.coins+=a.teamCoins});
    if(a.log)lg(p.icon+" <b>"+p.name+"</b> "+a.log);
    return{ok:true};
  case "submit":
    if(!p)return{err:"Vælg dig selv først"};
    var rw=a.row||{};
    if(!rw.salg&&!rw.csat&&!rw.kpt&&!rw.wrap&&!rw.conf)return{err:"Udfyld mindst ét felt"};
    S.pending=S.pending.filter(function(x){return x.pi!==a.pi});
    S.pending.push({id:Date.now()+"-"+a.pi,pi:a.pi,at:new Date().toISOString(),
      salg:+rw.salg||0,csat:+rw.csat||0,kpt:+rw.kpt||0,wrap:+rw.wrap||0,conf:+rw.conf||0,n:coinsForRow(p,rw)});
    return{ok:true,n:coinsForRow(p,rw)};
  case "approve":
    if(!ADM())return DENY_L;
    var it=S.pending.filter(function(x){return x.id===a.id})[0];
    if(!it)return{err:"Indsendelsen findes ikke længere"};
    var n1=grant(it.pi,it);S.pending=S.pending.filter(function(x){return x.id!==a.id});
    return{ok:true,n:n1,name:P[it.pi]?P[it.pi].name:""};
  case "approveAll":
    if(!ADM())return DENY_L;
    var tot=0,who=0;S.pending.forEach(function(it){var n=grant(it.pi,it);if(n>0){tot+=n;who++}});
    S.pending=[];return{ok:true,tot:tot,who:who};
  case "reject":
    if(!ADM())return DENY_L;
    var it2=S.pending.filter(function(x){return x.id===a.id})[0];
    if(!it2)return{err:"Indsendelsen findes ikke længere"};
    S.pending=S.pending.filter(function(x){return x.id!==a.id});
    return{ok:true,name:P[it2.pi]?P[it2.pi].name:""};
  case "payout":
    if(!ADM())return DENY_L;
    var t2=0,w2=0;(a.rows||[]).forEach(function(r){var n=grant(r.pi,r);if(n>0){t2+=n;w2++}});
    return{ok:true,tot:t2,who:w2};
  case "buy":
    if(!p)return{err:"Ukendt spiller"};
    var si=S.shop.filter(function(x){return x.id===a.id})[0];
    if(!si)return{err:"Varen findes ikke længere"};
    if(si.out)return{err:si.n+" er udsolgt"};
    if(p.pts<si.c)return{err:"Ikke nok point"};
    p.pts-=si.c;p.bought.push(si.id);bd(p,"shop");
    lg(p.icon+" <b>"+p.name+"</b> købte "+si.ic+" "+si.n+" for "+si.c+" point");
    return{ok:true,name:si.n,ic:si.ic};
  case "shopSave":
    if(!ADM())return DENY_L;
    if(!a.items||!a.items.length)return{err:"Kiosken skal have mindst én vare"};
    S.shop=a.items.map(function(x,i){return{id:x.id||("v"+Date.now().toString(36)+i),
      ic:x.ic||"🎁",n:x.n||"Vare",d:x.d||"",c:Math.max(1,parseInt(x.c,10)||1),out:!!x.out}});
    return{ok:true};
  case "exchange":
    if(!p)return{err:"Vælg dig selv først"};
    var ex=S.ex;if(!ex.on)return{err:"Børsen er lukket lige nu"};
    var nn=Math.max(1,Math.min(50,parseInt(a.n,10)||1));
    if(a.dir==="toPts"){if(p.coins<nn)return{err:"Du har kun "+p.coins+" mønter"};
      p.coins-=nn;ap(p,nn*ex.sell);return{ok:true,n:nn,g:nn*ex.sell}}
    if(a.dir==="toCoins"){var cost=nn*ex.buy;if(p.pts<cost)return{err:"Det koster "+cost+" point"};
      p.pts-=cost;p.coins+=nn;return{ok:true,n:nn,cost:cost}}
    return{err:"Ukendt veksling"};
  case "exSave":
    if(!ADM())return DENY_L;
    var se=Math.max(0,parseInt(a.sell,10)||0),bu=Math.max(1,parseInt(a.buy,10)||1);
    if(bu<=se)return{err:"Købsprisen skal være højere end salgsprisen"};
    S.ex={on:!!a.on,sell:se,buy:bu};return{ok:true};
  case "setOpen":
    if(!ADM())return DENY_L;S.openAt=a.openAt||null;return{ok:true};
  case "clearOrders":
    if(!ADM())return DENY_L;P.forEach(function(q){q.bought=[]});return{ok:true};
  case "rename":
    if(a.by!==a.pi&&!ADM())return DENY_L;if(p)p.name=a.name||"?";return{ok:true};
  case "addPlayer":
    if(!ADM())return DENY_L;
    var i=P.length;
    P.push({name:"Ny deltager",coins:0,pts:0,shield:false,streak:0,freeSpin:0,admin:false,
      badges:[],bought:[],color:COLORS[i%COLORS.length],icon:ICONS[i%ICONS.length]});
    return{ok:true};
  case "newField":
    if(!ADM())return DENY_L;S.field=buildField();S.last=-1;return{ok:true};
  case "newSeason":
    if(!ADM())return DENY_L;
    var keep=P.map(function(q){return{name:q.name,icon:q.icon,color:q.color,admin:!!q.admin}});
    S=freshState(keep,(S.season||1)+1,S.shop,S.ex);return{ok:true};
  }
  return{err:"Ukendt handling"};
}

function send(action,cb){
  if(!HOSTED){
    var r=applyLocal(action);
    localSave();render();
    if(cb)cb(r);
    if(r&&r.err&&action.type!=="tap"&&action.type!=="adminLogin"&&!cb)toast(r.err,"bad");
    return;
  }
  if(UI.mode!=="live"){
    toast("Ingen forbindelse til serveren — prøver igen…","bad");
    startRetry();
    if(cb)cb({err:"Ingen forbindelse"});
    return;
  }
  UI.busy=true;
  fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(action)})
    .then(function(x){return x.json()})
    .then(function(d){
      UI.busy=false;
      if(d.state){S=d.state;upgradeState(S);UI.ver=d.v||0}
      render();
      if(cb)cb(d.result||(d.err?{err:d.err}:null));
    })
    .catch(function(){
      UI.busy=false;UI.mode="error";render();
      toast("Mistede forbindelsen — prøver igen…","bad");
      startRetry();
      if(cb)cb({err:"Ingen forbindelse"});
    });
}

function pull(){
  if(!HOSTED||UI.busy||SY.inflight)return;
  SY.inflight=true;
  fetch(API+"?t="+Date.now(),{cache:"no-store"})
    .then(function(x){if(!x.ok)throw 0;return x.json()})
    .then(function(d){
      SY.inflight=false;
      if(!d.state)throw 0;
      var wasOff=UI.mode!=="live";
      UI.mode="live";
      if(d.v!==UI.ver||wasOff){
        var busyGame=(typeof shoot!=="undefined"&&shoot.on)||(typeof stack!=="undefined"&&stack.on)||
                     (typeof wheel!=="undefined"&&wheel.on)||(typeof tet!=="undefined"&&tet.on)||
                     (typeof dig!=="undefined"&&dig.on);
        S=d.state;upgradeState(S);UI.ver=d.v;
        if(!busyGame)render(); else drawMe();
      }
    })
    .catch(function(){SY.inflight=false;if(UI.mode==="live"){UI.mode="error";drawMe()}});
}
function startRetry(){
  if(SY.retry)return;
  SY.retry=setInterval(function(){
    if(UI.mode==="live"){clearInterval(SY.retry);SY.retry=null;return}
    connect();
  },3000);
}

var booted=false;
function afterReconnect(){
  var saved=lsGet("arena_me");
  if(UI.me<0&&saved!=null&&S.players[+saved])UI.me=+saved;
  var p=me(),pin=lsGet("arena_pin");
  if(p&&p.admin&&pin&&!UI.pin){
    send({type:"adminLogin",pi:UI.me,pin:pin},function(r){if(r&&!r.err)UI.pin=pin;render()});
  }
  render();
  if(UI.me<0)setTimeout(openWho,300);
  toast("✅ Forbundet — alle ser det samme","cool");
}
function connect(){
  fetch(API+"?t="+Date.now(),{cache:"no-store"})
    .then(function(x){if(!x.ok)throw 0;return x.json()})
    .then(function(d){
      if(!d.state)throw 0;
      S=d.state;upgradeState(S);
      UI.ver=d.v||0;UI.mode="live";
      if(SY.retry){clearInterval(SY.retry);SY.retry=null}
      if(!SY.timer)SY.timer=setInterval(pull,POLL);
      if(!booted){booted=true;finishBoot(lsGet("arena_me"))}
      else afterReconnect();
    })
    .catch(function(){
      UI.mode="error";
      if(!booted){booted=true;finishBoot(lsGet("arena_me"),true)}
      else drawMe();
      startRetry();
    });
}
function boot(){
  if(!HOSTED){
    UI.mode="local";
    var l0=localLoad();if(l0&&l0.players&&l0.field)S=upgradeState(l0);
    finishBoot(lsGet("arena_me"));
    return;
  }
  UI.mode="error";
  connect();
}
function finishBoot(saved,offline){
  upgradeState(S);
  if(saved!=null&&S.players[+saved]){
    UI.me=+saved;
    var p=S.players[UI.me];
    if(p&&p.admin&&!offline){
      var pin=lsGet("arena_pin");
      if(pin){
        send({type:"adminLogin",pi:UI.me,pin:pin},function(r){
          if(r&&!r.err){UI.pin=pin}else if(r&&r.err!=="Ingen forbindelse"){lsDel("arena_pin")}
          render();
        });
      }
    }
  }
  go(UI.view||"hq");
  if(UI.me<0&&!offline)setTimeout(openWho,400);
  if(offline)toast("Forbinder til serveren…","cool");
}
boot();
