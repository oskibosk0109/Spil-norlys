/* ===================== SPILLENE ===================== */

function startGame(gameId,useFree,cb){
  var p=me();
  if(!p){openWho();return}
  if(!useFree&&p.coins<1){toast("Du har ingen mønter tilbage","bad");return}
  send({type:"spend",pi:UI.me,game:gameId,free:useFree},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    if(r&&r.free)toast("🎡 Gratis spin brugt","cool");
    cb(UI.me);
  });
}
function endGame(pts,opt){
  opt=opt||{};
  send({type:"score",pi:UI.me,pts:pts,badge:opt.badge,best:opt.best,score:opt.score,
        freeSpin:opt.freeSpin,teamCoins:opt.teamCoins,log:opt.log});
}

/* ===================== TETRIS ===================== */
var TCOLS=10, TROWS=18, TCELL=26;
var TSHAPES={
  I:{c:"#4cc3f0",r:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]]]},
  O:{c:"#f5a623",r:[[[1,0],[2,0],[1,1],[2,1]]]},
  T:{c:"#8b7bf0",r:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],
                    [[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]]},
  S:{c:"#2fbf71",r:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]]]},
  Z:{c:"#f2545b",r:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]]]},
  J:{c:"#ff6fae",r:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],
                    [[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]]},
  L:{c:"#ffd166",r:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],
                    [[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]]}
};
var TKEYS=["I","O","T","S","Z","J","L"];
var tet={on:false,grid:[],cur:null,next:null,x:0,y:0,rot:0,
         lines:0,score:0,speed:640,timer:null,who:0,bag:[]};

function tetBag(){
  if(tet.bag.length<2){
    var b=TKEYS.slice();
    for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t}
    tet.bag=tet.bag.concat(b);
  }
  return tet.bag.shift();
}
function tetCells(k,rot,x,y){
  var sh=TSHAPES[k],r=sh.r[rot%sh.r.length];
  return r.map(function(c){return [c[0]+x,c[1]+y]});
}
function tetFits(k,rot,x,y){
  var cs=tetCells(k,rot,x,y);
  for(var i=0;i<cs.length;i++){
    var cx=cs[i][0],cy=cs[i][1];
    if(cx<0||cx>=TCOLS||cy>=TROWS)return false;
    if(cy>=0&&tet.grid[cy][cx])return false;
  }
  return true;
}
function tetSpawn(){
  tet.cur=tet.next||tetBag();
  tet.next=tetBag();
  tet.rot=0;tet.x=3;tet.y=-1;
  if(!tetFits(tet.cur,0,tet.x,tet.y)){tetrisEnd(false,"Brættet er fyldt");return false}
  return true;
}
function tetrisStart(){
  if(tet.on)return;
  startGame("tetris",false,function(pi){
    tet.who=pi;tet.on=true;tet.lines=0;tet.score=0;tet.speed=640;tet.bag=[];
    tet.grid=[];
    for(var r=0;r<TROWS;r++){var row=[];for(var c=0;c<TCOLS;c++)row.push(null);tet.grid.push(row)}
    tet.next=tetBag();
    document.getElementById("tOver").hidden=true;
    setTxt("tLines",0);setTxt("tScore",0);
    tetSpawn();tetDraw();
    clearInterval(tet.timer);tet.timer=setInterval(tetStep,tet.speed);
  });
}
function tetLock(){
  tetCells(tet.cur,tet.rot,tet.x,tet.y).forEach(function(c){
    if(c[1]>=0)tet.grid[c[1]][c[0]]=TSHAPES[tet.cur].c;
  });
  var cleared=0;
  for(var r=TROWS-1;r>=0;r--){
    var full=true;
    for(var c=0;c<TCOLS;c++)if(!tet.grid[r][c]){full=false;break}
    if(full){
      tet.grid.splice(r,1);
      var nr=[];for(var q=0;q<TCOLS;q++)nr.push(null);
      tet.grid.unshift(nr);
      cleared++;r++;
    }
  }
  if(cleared){
    tet.lines+=cleared;
    tet.score+=[0,1,3,6,12][cleared];
    setTxt("tLines",tet.lines);setTxt("tScore",tet.score);
    if(cleared===4){toast("🧱 TETRIS! +12 point","win");burst(120)}
    else toast("✨ "+cleared+(cleared===1?" række":" rækker")+" ryddet","cool");
    var want=Math.max(190,640-Math.floor(tet.lines/5)*70);
    if(want!==tet.speed){tet.speed=want;clearInterval(tet.timer);tet.timer=setInterval(tetStep,tet.speed)}
  }
  tetSpawn();
}
function tetStep(){
  if(!tet.on)return;
  if(tetFits(tet.cur,tet.rot,tet.x,tet.y+1))tet.y++;
  else tetLock();
  tetDraw();
}
function tetMove(dx){
  if(!tet.on)return;
  if(tetFits(tet.cur,tet.rot,tet.x+dx,tet.y)){tet.x+=dx;tetDraw()}
}
function tetRotate(){
  if(!tet.on)return;
  var nr=(tet.rot+1)%TSHAPES[tet.cur].r.length;
  var kicks=[0,-1,1,-2,2];
  for(var i=0;i<kicks.length;i++){
    if(tetFits(tet.cur,nr,tet.x+kicks[i],tet.y)){tet.rot=nr;tet.x+=kicks[i];tetDraw();return}
  }
}
function tetSoft(){
  if(!tet.on)return;
  if(tetFits(tet.cur,tet.rot,tet.x,tet.y+1)){tet.y++;tetDraw()}
}
function tetHard(){
  if(!tet.on)return;
  while(tetFits(tet.cur,tet.rot,tet.x,tet.y+1))tet.y++;
  tetLock();tetDraw();
}
function trr(cx,x,y,w,h,r){
  cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);
  cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();cx.fill();
}
function tetDraw(){
  var cv=document.getElementById("tetrisC");if(!cv)return;
  var cx=cv.getContext("2d"),g=TCELL;
  cx.fillStyle="#070b1c";cx.fillRect(0,0,cv.width,cv.height);
  cx.strokeStyle="rgba(255,255,255,.05)";cx.lineWidth=1;
  for(var i=0;i<=TCOLS;i++){cx.beginPath();cx.moveTo(i*g,0);cx.lineTo(i*g,TROWS*g);cx.stroke()}
  for(var j=0;j<=TROWS;j++){cx.beginPath();cx.moveTo(0,j*g);cx.lineTo(TCOLS*g,j*g);cx.stroke()}
  for(var r=0;r<TROWS;r++)for(var c=0;c<TCOLS;c++){
    if(tet.grid[r]&&tet.grid[r][c]){
      cx.fillStyle=tet.grid[r][c];trr(cx,c*g+2,r*g+2,g-4,g-4,5);
      cx.fillStyle="rgba(0,0,0,.16)";cx.fillRect(c*g+4,r*g+g-7,g-8,3);
    }
  }
  if(tet.on&&tet.cur){
    var gy=tet.y;
    while(tetFits(tet.cur,tet.rot,tet.x,gy+1))gy++;
    cx.fillStyle="rgba(255,255,255,.12)";
    tetCells(tet.cur,tet.rot,tet.x,gy).forEach(function(c){
      if(c[1]>=0)trr(cx,c[0]*g+2,c[1]*g+2,g-4,g-4,5);
    });
    cx.fillStyle=TSHAPES[tet.cur].c;
    tetCells(tet.cur,tet.rot,tet.x,tet.y).forEach(function(c){
      if(c[1]>=0){trr(cx,c[0]*g+2,c[1]*g+2,g-4,g-4,5)}
    });
  }
  var nv=document.getElementById("tetrisNext");
  if(nv){
    var nx=nv.getContext("2d"),ng=16;
    nx.clearRect(0,0,nv.width,nv.height);
    if(tet.next){
      nx.fillStyle=TSHAPES[tet.next].c;
      tetCells(tet.next,0,0,0).forEach(function(c){
        trr(nx,c[0]*ng+10,c[1]*ng+12,ng-3,ng-3,4);
      });
    }
  }
}
function tetrisEnd(quiet,reason){
  if(!tet.on)return;
  tet.on=false;clearInterval(tet.timer);
  var g=tet.score,l=tet.lines;
  setTxt("tTitle",reason?"🧱 "+reason:"🧱 Spillet er slut");
  setTxt("tText","Du ryddede "+l+(l===1?" række":" rækker")+" og fik "+g+" point.");
  setTxt("tBtn","Spil igen");
  document.getElementById("tOver").hidden=false;
  endGame(g,{badge:l>=8?"tetris":null,best:"tetris",score:l,
    log:"spillede 🧱 Tetris: "+l+" rækker, +"+g+" point"});
  if(!quiet){toast("🧱 Du fik "+g+" point",g>0?"win":"cool");if(l>=8)burst(140)}
}
function drawTetrisPage(){
  myBar("tetrisMe");
  drawList("tetrisList","pts",false);
  var p=me(),b=document.getElementById("tBtn");
  setTxt("tPlayer",p?p.icon:"–");setTxt("tBest",S.best.tetris||0);
  if(b&&!tet.on){b.disabled=!p||p.coins<1;
    if(b.textContent.indexOf("Spil igen")<0)b.textContent="Start — 1 mønt"}
  if(!tet.on&&!tet.grid.length){
    var cv=document.getElementById("tetrisC");
    if(cv){var cx=cv.getContext("2d");cx.fillStyle="#070b1c";cx.fillRect(0,0,cv.width,cv.height)}
  }
}

/* ===================== LYKKEHJULET ===================== */
var WHEEL=[
  {t:"2 point",       k:"pts", v:2,  c:"#ffd166", ic:"⭐"},
  {t:"Slik",          k:"pts", v:1,  c:"#ff9ec7", ic:"🍬"},
  {t:"5 point",       k:"pts", v:5,  c:"#8fd0ff", ic:"⭐"},
  {t:"Niks",          k:"zero",v:0,  c:"#ded2c4", ic:"😐"},
  {t:"3 point",       k:"pts", v:3,  c:"#a8eec0", ic:"⭐"},
  {t:"Gratis spin",   k:"free",v:0,  c:"#c4b5fd", ic:"🎟️"},
  {t:"6 point",       k:"pts", v:6,  c:"#ffb37a", ic:"⭐"},
  {t:"Mønt til alle", k:"team",v:1,  c:"#7fe3e8", ic:"🤝"},
  {t:"2 point",       k:"pts", v:2,  c:"#ffd166", ic:"⭐"},
  {t:"STORGEVINST",   k:"jack",v:12, c:"#f5a623", ic:"🏆"},
  {t:"Slik",          k:"pts", v:1,  c:"#ff9ec7", ic:"🍬"},
  {t:"Uheld −2",      k:"lose",v:-2, c:"#ffa3a3", ic:"💥"}
];
var wheel={ang:0,vel:0,on:false,who:0,raf:null};
function wheelDraw(){
  var cv=document.getElementById("wheelC");if(!cv)return;
  var cx=cv.getContext("2d"),w=cv.width,h=cv.height;
  var r=Math.min(w,h)/2-18,mx=w/2,my=h/2,n=WHEEL.length,st=Math.PI*2/n;
  cx.clearRect(0,0,w,h);
  for(var i=0;i<n;i++){
    var a0=wheel.ang+i*st;
    cx.beginPath();cx.moveTo(mx,my);cx.arc(mx,my,r,a0,a0+st);cx.closePath();
    cx.fillStyle=WHEEL[i].c;cx.fill();
    cx.strokeStyle="#fff";cx.lineWidth=3;cx.stroke();
    var mid=a0+st/2,flip=Math.cos(mid)<0;
    cx.save();cx.translate(mx,my);cx.rotate(mid);if(flip)cx.rotate(Math.PI);
    cx.textBaseline="middle";cx.fillStyle="#4a3410";
    cx.textAlign=flip?"left":"right";
    var px=flip?-(r-16):(r-16);
    cx.font="22px serif";cx.fillText(WHEEL[i].ic,px,-11);
    cx.font="900 12.5px Nunito, sans-serif";
    cx.fillText(WHEEL[i].t,flip?-(r-40):(r-40),10);
    cx.restore();
  }
  cx.beginPath();cx.arc(mx,my,34,0,Math.PI*2);
  cx.fillStyle="#fffdfa";cx.fill();cx.strokeStyle="#f2e2d0";cx.lineWidth=5;cx.stroke();
  cx.textAlign="center";cx.textBaseline="middle";cx.font="26px serif";
  var p=S.players[wheel.who];cx.fillText(p?p.icon:"🎡",mx,my+1);
  cx.beginPath();cx.moveTo(mx,my-r-16);cx.lineTo(mx-15,my-r+14);cx.lineTo(mx+15,my-r+14);
  cx.closePath();cx.fillStyle="#f2545b";cx.fill();cx.strokeStyle="#fff";cx.lineWidth=3;cx.stroke();
}
function wheelSpin(){
  if(wheel.on)return;
  var p=me();if(!p){openWho();return}
  var free=p.freeSpin>0;
  startGame("wheel",free,function(pi){
    wheel.who=pi;wheel.on=true;
    document.getElementById("wOver").hidden=true;
    wheel.vel=0.40+Math.random()*0.14;
    cancelAnimationFrame(wheel.raf);
    (function step(){
      wheel.vel*=0.986;wheel.ang+=wheel.vel;wheelDraw();
      if(wheel.vel>0.0025)wheel.raf=requestAnimationFrame(step);
      else wheelStop();
    })();
  });
}
function wheelStop(){
  wheel.on=false;
  var n=WHEEL.length,st=Math.PI*2/n;
  var norm=((-Math.PI/2-wheel.ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  var seg=WHEEL[Math.floor(norm/st)%n],msg="",o={};
  if(seg.k==="free"){o.freeSpin=1;o.log="vandt 🎟️ et gratis spin på hjulet";
    msg="🎟️ Gratis spin til dig";toast(msg,"cool");endGame(0,o)}
  else if(seg.k==="team"){o.teamCoins=1;o.log="ramte 🤝 holdfeltet — alle fik 1 mønt";
    msg="🤝 Alle fik en mønt!";toast(msg,"cool");burst(130);endGame(0,o)}
  else if(seg.k==="jack"){o.badge="wheel";o.best="wheel";o.score=seg.v;
    o.log="ramte 🏆 STORGEVINSTEN (+"+seg.v+")";
    msg="🏆 STORGEVINST! +"+seg.v;toast(msg,"win");burst(280);endGame(seg.v,o)}
  else if(seg.k==="lose"){o.log="ramte 💥 uheld på hjulet (−2)";
    msg="💥 Du mistede 2 point";toast(msg,"bad");endGame(-2,o)}
  else if(seg.k==="zero"){o.log="drejede 🎡 og ramte et tomt felt";
    msg="😐 Ingen gevinst denne gang";toast(msg,"bad");endGame(0,o)}
  else {o.best="wheel";o.score=seg.v;o.log="drejede 🎡 og fik "+seg.ic+" "+seg.v+" point";
    msg=seg.ic+" +"+seg.v+" point";toast(msg,"win");endGame(seg.v,o)}
  setTxt("wTitle",seg.ic+" "+seg.t);
  setTxt("wText",msg);
  setTxt("wBtn","Drej igen");
  document.getElementById("wOver").hidden=false;
}
function drawWheelPage(){
  myBar("wheelMe");
  drawList("wheelList","pts",false);
  var p=me();
  setTxt("wPlayer",p?p.icon:"–");setTxt("wSpins",S.spins);setTxt("wBest",S.best.wheel);
  var b=document.getElementById("wBtn");
  if(b&&!wheel.on){
    b.disabled=!p||(p.coins<1&&p.freeSpin<1);
    if(b.textContent.indexOf("Drej igen")<0)
      b.textContent=(p&&p.freeSpin>0)?"Drej hjulet — gratis 🎟️":"Drej hjulet — 1 mønt";
  }
  var h="";
  [["🏆","Storgevinst","+12"],["⭐","Point","+2 til +6"],["🍬","Slik","+1"],
   ["🎟️","Gratis spin","1 stk."],["🤝","Holdfelt","alle +1 mønt"],["💥","Uheld","−2"],
   ["😐","Niks","0"]].forEach(function(r){
    h+='<div class="rule">'+r[0]+' '+r[1]+' <b>'+r[2]+'</b></div>'});
  document.getElementById("wheelLegend").innerHTML=h;
  wheelDraw();
}

/* ===================== SKYDETELTET ===================== */
var SHOOTK=[{ic:"🍬",v:1,r:24,s:1.7},{ic:"🍭",v:3,r:17,s:2.9},
            {ic:"🧁",v:2,r:21,s:2.2},{ic:"💣",v:-3,r:27,s:1.9}];
var shoot={on:false,t:[],hits:0,miss:0,pts:0,time:20,timer:null,raf:null,who:0,tick:0};
function shootStart(){
  if(shoot.on)return;
  startGame("shoot",false,function(pi){
    shoot.who=pi;shoot.on=true;shoot.t=[];shoot.hits=0;shoot.miss=0;
    shoot.pts=0;shoot.time=20;shoot.tick=0;
    document.getElementById("hOver").hidden=true;
    setTxt("hHits",0);setTxt("hMiss",0);setTxt("hTime",20);
    clearInterval(shoot.timer);
    shoot.timer=setInterval(function(){
      shoot.time--;setTxt("hTime",shoot.time);
      if(shoot.time<=0)shootEnd(false);
    },1000);
    cancelAnimationFrame(shoot.raf);shootLoop();
  });
}
function shootLoop(){
  if(!shoot.on)return;
  var cv=document.getElementById("shootC");if(!cv)return;
  var cx=cv.getContext("2d");
  shoot.tick++;
  var rate=Math.max(14,30-Math.floor((20-shoot.time)*0.8));
  if(shoot.tick%rate===0){
    var k=SHOOTK[Math.random()<0.34?3:(Math.random()<0.62?0:(Math.random()<0.5?2:1))];
    var L=Math.random()<0.5;
    shoot.t.push({x:L?-32:cv.width+32,y:46+Math.random()*(cv.height-92),
      vx:(L?1:-1)*(k.s+Math.random()*1.1),vy:(Math.random()-0.5)*1.5,
      r:k.r,ic:k.ic,v:k.v});
  }
  cx.fillStyle="#0c2137";cx.fillRect(0,0,cv.width,cv.height);
  cx.strokeStyle="rgba(255,255,255,.05)";cx.lineWidth=1;
  for(var i=0;i<cv.width;i+=40){cx.beginPath();cx.moveTo(i,0);cx.lineTo(i,cv.height);cx.stroke()}
  shoot.t=shoot.t.filter(function(t){
    t.x+=t.vx;t.y+=t.vy;
    if(t.y<t.r||t.y>cv.height-t.r)t.vy*=-1;
    return t.x>-70&&t.x<cv.width+70;
  });
  shoot.t.forEach(function(t){
    cx.beginPath();cx.arc(t.x,t.y,t.r+5,0,Math.PI*2);
    cx.fillStyle=t.v<0?"rgba(242,84,91,.22)":
                 t.v>=3?"rgba(245,166,35,.28)":"rgba(255,111,174,.20)";
    cx.fill();
    cx.font=(t.r*1.7)+"px serif";cx.textAlign="center";cx.textBaseline="middle";
    cx.fillText(t.ic,t.x,t.y);
  });
  cx.fillStyle="rgba(255,255,255,.34)";cx.font="900 12px Nunito, sans-serif";
  cx.textAlign="left";cx.fillText("RAMT "+shoot.pts+"  →  "+Math.round(shoot.pts/3)+" POINT",14,20);
  shoot.raf=requestAnimationFrame(shootLoop);
}
function shootClick(e){
  if(!shoot.on)return;
  var cv=document.getElementById("shootC"),b=cv.getBoundingClientRect();
  var x=(e.clientX-b.left)*(cv.width/b.width),y=(e.clientY-b.top)*(cv.height/b.height);
  var hit=-1;
  for(var i=shoot.t.length-1;i>=0;i--){
    var t=shoot.t[i];
    if(Math.sqrt((t.x-x)*(t.x-x)+(t.y-y)*(t.y-y))<=t.r+6){hit=i;break}
  }
  if(hit<0){shoot.miss++;setTxt("hMiss",shoot.miss);return}
  var tt=shoot.t[hit];
  if(tt.v<0){shoot.pts=Math.max(0,shoot.pts-3);toast("💣 −3","bad")}
  else {shoot.pts+=tt.v;shoot.hits++;setTxt("hHits",shoot.hits)}
  shoot.t.splice(hit,1);
}
function shootEnd(quiet){
  if(!shoot.on)return;
  shoot.on=false;clearInterval(shoot.timer);cancelAnimationFrame(shoot.raf);
  var g=Math.round(shoot.pts/3),hits=shoot.hits;
  setTxt("hTitle","🎯 Tiden er gået");
  setTxt("hText","Du ramte "+hits+" mål med "+shoot.miss+" forbier og fik "+g+" point.");
  setTxt("hBtn","Spil igen");
  document.getElementById("hOver").hidden=false;
  endGame(g,{badge:hits>=12?"sharp":null,best:"shoot",score:hits,
    log:"spillede 🎯 Skydeteltet: "+hits+" ramt, +"+g+" point"});
  if(!quiet){toast("🎯 Du fik "+g+" point",g>0?"win":"cool");if(hits>=12)burst(150)}
}
function drawShootPage(){
  myBar("shootMe");
  drawList("shootList","pts",false);
  var p=me(),b=document.getElementById("hBtn");
  setTxt("hPlayer",p?p.icon:"–");setTxt("hBest",S.best.shoot);
  if(b&&!shoot.on){b.disabled=!p||p.coins<1;
    if(b.textContent.indexOf("Spil igen")<0)b.textContent="Start — 1 mønt"}
  if(!shoot.on){
    var cv=document.getElementById("shootC");
    if(cv){var cx=cv.getContext("2d");cx.fillStyle="#0c2137";cx.fillRect(0,0,cv.width,cv.height)}
  }
}

/* ===================== STABELSPILLET ===================== */
var stack={on:false,blocks:[],cur:null,dir:1,speed:3.2,who:0,raf:null};
function stackStart(){
  if(stack.on)return;
  startGame("stack",false,function(pi){
    var cv=document.getElementById("stackC");
    var bx=(cv.width-190)/2;
    stack.who=pi;stack.on=true;stack.speed=3.2;stack.dir=1;
    stack.blocks=[{x:bx,w:190}];stack.cur={x:bx,w:190};
    document.getElementById("kOver").hidden=true;
    var tb=document.getElementById("kTap");if(tb)tb.disabled=false;
    setTxt("kFloor",0);setTxt("kPts",0);
    cancelAnimationFrame(stack.raf);stackLoop();
  });
}
function rrect(cx,x,y,w,h,r){
  cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);
  cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();cx.fill();
}
function stackPts(){var f=stack.blocks.length-1;return Math.round(f*0.4)+Math.floor(f/5)}
function stackLoop(){
  if(!stack.on)return;
  var cv=document.getElementById("stackC");if(!cv)return;
  var cx=cv.getContext("2d"),bh=30;
  stack.cur.x+=stack.dir*stack.speed;
  if(stack.cur.x<=0){stack.cur.x=0;stack.dir=1}
  if(stack.cur.x+stack.cur.w>=cv.width){stack.cur.x=cv.width-stack.cur.w;stack.dir=-1}
  cx.fillStyle="#2b1b0f";cx.fillRect(0,0,cv.width,cv.height);
  var p=S.players[stack.who];
  var base=cv.height-24,shown=Math.min(stack.blocks.length,Math.floor((cv.height-96)/bh));
  var off=stack.blocks.length-shown;
  for(var i=off;i<stack.blocks.length;i++){
    var b=stack.blocks[i],y=base-(i-off+1)*bh;
    cx.fillStyle="hsl("+((i*27)%360)+",72%,62%)";
    rrect(cx,b.x,y,b.w,bh-4,6);
    cx.fillStyle="rgba(0,0,0,.15)";cx.fillRect(b.x+3,y+bh-8,b.w-6,3);
  }
  var my=base-(shown+1)*bh;
  cx.fillStyle=p?p.color:"#ffd166";
  rrect(cx,stack.cur.x,my,stack.cur.w,bh-4,6);
  cx.font="16px serif";cx.textAlign="center";cx.textBaseline="middle";
  cx.fillText(p?p.icon:"🧱",stack.cur.x+stack.cur.w/2,my+(bh-4)/2);
  cx.fillStyle="rgba(255,255,255,.34)";cx.font="900 12px Nunito, sans-serif";
  cx.textAlign="left";
  cx.fillText("ETAGE "+(stack.blocks.length-1)+"   ·   "+stackPts()+" POINT",14,20);
  stack.raf=requestAnimationFrame(stackLoop);
}
function stackDrop(){
  if(!stack.on)return;
  var prev=stack.blocks[stack.blocks.length-1];
  var l=Math.max(stack.cur.x,prev.x),r=Math.min(stack.cur.x+stack.cur.w,prev.x+prev.w);
  var ov=r-l;
  if(ov<=6)return stackEnd(false,"Tårnet væltede");
  if(Math.abs(stack.cur.x-prev.x)<=6){ov=prev.w;l=prev.x;toast("✨ Perfekt ramt!","win")}
  stack.blocks.push({x:l,w:ov});
  stack.cur={x:l,w:ov};stack.dir=1;
  if((stack.blocks.length-1)%3===0)stack.speed+=0.45;
  setTxt("kFloor",stack.blocks.length-1);setTxt("kPts",stackPts());
}
function stackEnd(quiet,reason){
  if(!stack.on)return;
  stack.on=false;cancelAnimationFrame(stack.raf);
  var tb=document.getElementById("kTap");if(tb)tb.disabled=true;
  var f=stack.blocks.length-1,g=stackPts();
  setTxt("kTitle",reason?"🏚️ "+reason:"🏗️ Spillet er slut");
  setTxt("kText","Du nåede "+f+" etager og fik "+g+" point.");
  setTxt("kBtn","Spil igen");
  document.getElementById("kOver").hidden=false;
  endGame(g,{badge:f>=10?"tower":null,best:"stack",score:f,
    log:"spillede 🏗️ Stabelspillet: "+f+" etager, +"+g+" point"});
  if(!quiet){toast("🏗️ Du fik "+g+" point",f>=10?"win":"cool");if(f>=10)burst(150)}
}
function drawStackPage(){
  myBar("stackMe");
  drawList("stackList","pts",false);
  var p=me(),b=document.getElementById("kBtn");
  setTxt("kPlayer",p?p.icon:"–");setTxt("kBest",S.best.stack);
  if(b&&!stack.on){b.disabled=!p||p.coins<1;
    if(b.textContent.indexOf("Spil igen")<0)b.textContent="Start — 1 mønt"}
  if(!stack.on){
    var cv=document.getElementById("stackC");
    if(cv){var cx=cv.getContext("2d");cx.fillStyle="#2b1b0f";cx.fillRect(0,0,cv.width,cv.height)}
  }
}

/* ===================== GULDGRAVEREN ===================== */
var DIGL=[
  {n:"Muld",   ic:"🟫",v:1, risk:0.05},
  {n:"Grus",   ic:"🪨",v:1, risk:0.10},
  {n:"Ler",    ic:"🟤",v:1, risk:0.16},
  {n:"Kul",    ic:"⬛",v:2, risk:0.22},
  {n:"Kobber", ic:"🟠",v:2, risk:0.28},
  {n:"Sølv",   ic:"⚪",v:3, risk:0.34},
  {n:"Guld",   ic:"🟡",v:4, risk:0.40},
  {n:"Rubin",  ic:"🔴",v:5, risk:0.46},
  {n:"Diamant",ic:"💎",v:7, risk:0.52}
];
var dig={on:false,depth:0,pot:0,who:0};
function digStart(){
  if(dig.on)return;
  startGame("dig",false,function(pi){
    dig.who=pi;dig.on=true;dig.depth=0;dig.pot=0;
    document.getElementById("gOver").hidden=true;
    render();
  });
}
function digDeeper(){
  if(!dig.on)return;
  var L=DIGL[Math.min(dig.depth,DIGL.length-1)];
  if(Math.random()<L.risk){
    dig.on=false;
    var lost=dig.pot;
    setTxt("gTitle","💥 Skakten styrtede sammen");
    setTxt("gText","Du mistede hele puljen på "+lost+" point.");
    setTxt("gBtn","Prøv igen");
    document.getElementById("gOver").hidden=false;
    toast("💥 Du mistede "+lost+" point","bad");
    endGame(0,{log:"mistede "+lost+" point i ⛏️ Guldgraveren (dybde "+dig.depth+")"});
    dig.pot=0;render();return;
  }
  dig.depth++;dig.pot+=L.v;
  toast(L.ic+" "+L.n+" +"+L.v,"cool");
  render();
}
function digCash(){
  if(!dig.on||dig.pot<1)return;
  var pot=dig.pot,d=dig.depth;
  dig.on=false;dig.pot=0;
  setTxt("gTitle","⛏️ Oppe i sikkerhed");
  setTxt("gText","Du tog "+pot+" point med op fra dybde "+d+".");
  setTxt("gBtn","Grav igen");
  document.getElementById("gOver").hidden=false;
  toast("⛏️ Du sikrede "+pot+" point","win");
  if(d>=6)burst(150);
  endGame(pot,{badge:d>=7?"gold":null,best:"dig",score:d,
    log:"kom op fra ⛏️ Guldgraveren med "+pot+" point (dybde "+d+")"});
}
function digEnd(quiet){if(dig.on){dig.on=false;dig.pot=0;render()}}
function drawDigPage(){
  myBar("digMe");
  drawList("digList","pts",false);
  var p=me();
  setTxt("gPlayer",p?p.icon:"–");setTxt("gBest",S.best.dig);
  setTxt("gDepth",dig.on?dig.depth:0);setTxt("gPot",dig.on?dig.pot:0);
  var b=document.getElementById("gBtn");
  if(b&&!dig.on){b.disabled=!p||p.coins<1;
    if(b.textContent.indexOf("igen")<0)b.textContent="Start — 1 mønt"}
  var L=DIGL[Math.min(dig.depth,DIGL.length-1)];
  var d=document.getElementById("gDig"),c=document.getElementById("gCash");
  if(d){d.disabled=!dig.on;
    d.textContent=dig.on?("⛏️ Grav videre → "+L.ic+" "+L.n+" (+"+L.v+", "+
      Math.round(L.risk*100)+"% risiko)"):"⛏️ Grav videre"}
  if(c){c.disabled=!dig.on||dig.pot<1;
    c.textContent=(dig.on&&dig.pot)?("🪣 Tag "+dig.pot+" point og kom op"):"🪣 Kom op"}
  var h="";
  DIGL.forEach(function(x,i){
    h+='<div class="layer'+(i<dig.depth?" done":"")+((dig.on&&i===dig.depth)?" now":"")+'">'+
       '<span class="lic">'+x.ic+'</span><b>'+x.n+'</b>'+
       '<span class="lv">+'+x.v+'</span>'+
       '<span class="lr">'+Math.round(x.risk*100)+'% risiko</span></div>';
  });
  document.getElementById("gLayers").innerHTML=h;
}

/* ---------- tastatur ---------- */
document.addEventListener("keydown",function(e){
  var pm=document.getElementById("pinModal");
  if(pm&&!pm.hidden){
    if(e.key==="Enter"){submitPin();e.preventDefault()}
    else if(e.key==="Escape"){closePin();e.preventDefault()}
    return;
  }
  if(UI.view==="stack"&&stack.on&&(e.key===" "||e.code==="Space")){stackDrop();e.preventDefault();return}
  if(UI.view==="tetris"&&tet.on){
    var k=e.key.toLowerCase();
    if(k==="arrowleft"||k==="a")tetMove(-1);
    else if(k==="arrowright"||k==="d")tetMove(1);
    else if(k==="arrowdown"||k==="s")tetSoft();
    else if(k==="arrowup"||k==="w")tetRotate();
    else if(e.key===" "||e.code==="Space")tetHard();
    else return;
    e.preventDefault();
  }
});
(function(){
  var sc=document.getElementById("shootC");
  if(sc)sc.addEventListener("click",shootClick);
})();
