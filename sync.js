/* ===================== DELT TILSTAND =====================
   Al logik ligger på serveren (api/state.js). Klienten sender kun handlinger.
   Appen skal åbnes via linket — den virker ikke som løs fil. */
var API="/api/state",POLL=2500;
var SY={timer:null,retry:null,inflight:false},booted=false;
try{localStorage.removeItem("arena_local")}catch(e){}

function send(action,cb){
  if(UI.mode!=="live"){toast("Ingen forbindelse til serveren — prøver igen…","bad");startRetry();if(cb)cb({err:"Ingen forbindelse"});return}
  UI.busy=true;
  fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(action)})
    .then(function(x){return x.json()})
    .then(function(d){
      UI.busy=false;
      if(d.state){S=upgradeState(d.state);UI.ver=d.v||0}
      render();
      if(cb)cb(d.result||(d.err?{err:d.err}:null));
    })
    .catch(function(){UI.busy=false;UI.mode="error";render();toast("Mistede forbindelsen — prøver igen…","bad");startRetry();if(cb)cb({err:"Ingen forbindelse"})});
}
function busyGame(){
  return (typeof shoot!=="undefined"&&shoot.on)||(typeof stack!=="undefined"&&stack.on)||
         (typeof wheel!=="undefined"&&wheel.on)||(typeof tet!=="undefined"&&tet.on)||(typeof dig!=="undefined"&&dig.on)||
         (typeof fly!=="undefined"&&fly.on)||(typeof road!=="undefined"&&road.on)||(typeof ck!=="undefined"&&ck.on);
}
function pull(){
  if(UI.busy||SY.inflight)return;
  SY.inflight=true;
  fetch(API+"?t="+Date.now(),{cache:"no-store"})
    .then(function(x){if(!x.ok)throw 0;return x.json()})
    .then(function(d){
      SY.inflight=false;if(!d.state)throw 0;
      var wasOff=UI.mode!=="live";UI.mode="live";
      if(d.v!==UI.ver||wasOff){S=upgradeState(d.state);UI.ver=d.v;if(!busyGame())render();else drawMe()}
    })
    .catch(function(){SY.inflight=false;if(UI.mode==="live"){UI.mode="error";drawMe()}});
}
function startRetry(){
  if(SY.retry)return;
  SY.retry=setInterval(function(){if(UI.mode==="live"){clearInterval(SY.retry);SY.retry=null;return}connect()},3000);
}
function restoreMe(){
  var saved=lsGet("arena_me");
  if(saved!=null&&S.players[+saved])UI.me=+saved;
  var p=me(),pin=lsGet("arena_pin");
  if(p&&p.admin&&pin&&!UI.pin)
    send({type:"adminLogin",pi:UI.me,pin:pin},function(r){if(r&&!r.err)UI.pin=pin;else if(r&&r.err!=="Ingen forbindelse")lsDel("arena_pin");render()});
}
function connect(){
  fetch(API+"?t="+Date.now(),{cache:"no-store"})
    .then(function(x){if(!x.ok)throw 0;return x.json()})
    .then(function(d){
      if(!d.state)throw 0;
      S=upgradeState(d.state);UI.ver=d.v||0;UI.mode="live";
      if(SY.retry){clearInterval(SY.retry);SY.retry=null}
      if(!SY.timer)SY.timer=setInterval(pull,POLL);
      var first=!booted;booted=true;
      restoreMe();go(UI.view||"hq");
      if(UI.me<0)setTimeout(openWho,300);
      if(!first)toast("✅ Forbundet igen","cool");
    })
    .catch(function(){
      UI.mode="error";
      if(!booted){booted=true;go("hq");toast("Forbinder til serveren…","cool")}else drawMe();
      startRetry();
    });
}
if(location.protocol==="file:"){
  document.body.innerHTML='<div style="font:800 16px Nunito,sans-serif;padding:40px;text-align:center">'+
    'Åbn Slik-Arenaen via linket — fx <b>spil-norlys.vercel.app</b>.</div>';
} else connect();
