/* ===================== SPILLENE ===================== */
function startGame(gameId,useFree,cb){
  if(!canPlay(gameId))return;
  var p=me();
  if(!useFree&&p.coins<1){toast("Du har ingen mønter tilbage","bad");return}
  send({type:"spend",pi:UI.me,game:gameId,free:useFree},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    if(r&&r.free)toast("🎡 Gratis spin brugt","cool");
    cb(UI.me);
  });
}
function endGame(gameId,pts,opt){
  opt=opt||{};
  send({type:"score",pi:UI.me,game:gameId,pts:pts,badge:opt.badge,best:opt.best,score:opt.score,
        freeSpin:opt.freeSpin,teamCoins:opt.teamCoins,log:opt.log},function(r){
    if(r&&r.capped)toast("🛑 Dagens grænse nået — du fik "+r.given+" point","bad");
  });
}
function trr(cx,x,y,w,h,r){
  cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);
  cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();cx.fill();
}
function btnState(id,game,label){
  var p=me(),b=document.getElementById(id);if(!b)return;
  b.disabled=!p||p.coins<1||!gameOn(game)||capLeft(game,p)<=0;
  if(b.textContent.indexOf("igen")<0)b.textContent=label||"Start — 1 mønt";
}

/* ===================== TETRIS ===================== */
var TCOLS=10,TROWS=18,TCELL=26,TTIME=60,TLINEPTS=[0,1,2,4,6],TMAXPTS=6;
function tetPoints(){return Math.min(TMAXPTS,Math.round(tet.score/3))}
var TSHAPES={
  I:{c:"#4cc3f0",r:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]]]},
  O:{c:"#f5a623",r:[[[1,0],[2,0],[1,1],[2,1]]]},
  T:{c:"#8b7bf0",r:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]]},
  S:{c:"#2fbf71",r:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]]]},
  Z:{c:"#f2545b",r:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]]]},
  J:{c:"#ff6fae",r:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]]},
  L:{c:"#ffd166",r:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]]}
};
var TKEYS=["I","O","T","S","Z","J","L"];
var tet={on:false,grid:[],cur:null,next:null,x:0,y:0,rot:0,lines:0,score:0,speed:480,timer:null,clock:null,time:TTIME,bag:[]};
function tetBag(){
  if(tet.bag.length<2){var b=TKEYS.slice();
    for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t}
    tet.bag=tet.bag.concat(b)}
  return tet.bag.shift();
}
function tetCells(k,rot,x,y){var sh=TSHAPES[k],r=sh.r[rot%sh.r.length];return r.map(function(c){return [c[0]+x,c[1]+y]})}
function tetFits(k,rot,x,y){
  var cs=tetCells(k,rot,x,y);
  for(var i=0;i<cs.length;i++){var cx=cs[i][0],cy=cs[i][1];
    if(cx<0||cx>=TCOLS||cy>=TROWS)return false;if(cy>=0&&tet.grid[cy][cx])return false}
  return true;
}
function tetSpawn(){tet.cur=tet.next||tetBag();tet.next=tetBag();tet.rot=0;tet.x=3;tet.y=-1;
  if(!tetFits(tet.cur,0,tet.x,tet.y)){tetrisEnd(false,"Brættet er fyldt");return false}return true}
function tetrisStart(){
  if(tet.on)return;
  startGame("tetris",false,function(){
    tet.on=true;tet.lines=0;tet.score=0;tet.speed=480;tet.bag=[];tet.time=TTIME;tet.grid=[];
    for(var r=0;r<TROWS;r++){var row=[];for(var c=0;c<TCOLS;c++)row.push(null);tet.grid.push(row)}
    tet.next=tetBag();document.getElementById("tOver").hidden=true;
    setTxt("tLines",0);setTxt("tScore",0);tetSpawn();tetDraw();
    clearInterval(tet.timer);tet.timer=setInterval(tetStep,tet.speed);
    clearInterval(tet.clock);tet.clock=setInterval(function(){if(!tet.on)return;tet.time--;tetDraw();if(tet.time<=0)tetrisEnd(false,"Tiden er gået")},1000);
  });
}
function tetLock(){
  tetCells(tet.cur,tet.rot,tet.x,tet.y).forEach(function(c){if(c[1]>=0)tet.grid[c[1]][c[0]]=TSHAPES[tet.cur].c});
  var cleared=0;
  for(var r=TROWS-1;r>=0;r--){var full=true;
    for(var c=0;c<TCOLS;c++)if(!tet.grid[r][c]){full=false;break}
    if(full){tet.grid.splice(r,1);var nr=[];for(var q=0;q<TCOLS;q++)nr.push(null);tet.grid.unshift(nr);cleared++;r++}}
  if(cleared){
    tet.lines+=cleared;tet.score+=TLINEPTS[cleared];setTxt("tLines",tet.lines);setTxt("tScore",tetPoints());
    toast(cleared===4?"🧱 TETRIS!":"✨ "+cleared+(cleared===1?" række":" rækker")+" ryddet",cleared===4?"win":"cool");
    var want=Math.max(170,480-Math.floor(tet.lines/3)*60);
    if(want!==tet.speed){tet.speed=want;clearInterval(tet.timer);tet.timer=setInterval(tetStep,tet.speed)}
  }
  tetSpawn();
}
function tetStep(){if(!tet.on)return;if(tetFits(tet.cur,tet.rot,tet.x,tet.y+1))tet.y++;else tetLock();tetDraw()}
function tetMove(dx){if(tet.on&&tetFits(tet.cur,tet.rot,tet.x+dx,tet.y)){tet.x+=dx;tetDraw()}}
function tetRotate(){if(!tet.on)return;var nr=(tet.rot+1)%TSHAPES[tet.cur].r.length,k=[0,-1,1,-2,2];
  for(var i=0;i<k.length;i++)if(tetFits(tet.cur,nr,tet.x+k[i],tet.y)){tet.rot=nr;tet.x+=k[i];tetDraw();return}}
function tetSoft(){if(tet.on&&tetFits(tet.cur,tet.rot,tet.x,tet.y+1)){tet.y++;tetDraw()}}
function tetHard(){if(!tet.on)return;while(tetFits(tet.cur,tet.rot,tet.x,tet.y+1))tet.y++;tetLock();tetDraw()}
function tetDraw(){
  var cv=document.getElementById("tetrisC");if(!cv)return;
  var cx=cv.getContext("2d"),g=TCELL;
  cx.fillStyle="#070b1c";cx.fillRect(0,0,cv.width,cv.height);
  cx.strokeStyle="rgba(255,255,255,.05)";cx.lineWidth=1;
  for(var i=0;i<=TCOLS;i++){cx.beginPath();cx.moveTo(i*g,0);cx.lineTo(i*g,TROWS*g);cx.stroke()}
  for(var j=0;j<=TROWS;j++){cx.beginPath();cx.moveTo(0,j*g);cx.lineTo(TCOLS*g,j*g);cx.stroke()}
  for(var r=0;r<TROWS;r++)for(var c=0;c<TCOLS;c++)if(tet.grid[r]&&tet.grid[r][c]){cx.fillStyle=tet.grid[r][c];trr(cx,c*g+2,r*g+2,g-4,g-4,5)}
  if(tet.on&&tet.cur){
    var gy=tet.y;while(tetFits(tet.cur,tet.rot,tet.x,gy+1))gy++;
    cx.fillStyle="rgba(255,255,255,.12)";
    tetCells(tet.cur,tet.rot,tet.x,gy).forEach(function(c){if(c[1]>=0)trr(cx,c[0]*g+2,c[1]*g+2,g-4,g-4,5)});
    cx.fillStyle=TSHAPES[tet.cur].c;
    tetCells(tet.cur,tet.rot,tet.x,tet.y).forEach(function(c){if(c[1]>=0)trr(cx,c[0]*g+2,c[1]*g+2,g-4,g-4,5)});
    cx.fillStyle=tet.time<=10?"#f2545b":"rgba(255,255,255,.55)";cx.font="900 15px Nunito, sans-serif";
    cx.textAlign="right";cx.textBaseline="top";cx.fillText("⏱ "+tet.time+"s",cv.width-8,6);cx.textAlign="left";
  }
  var nv=document.getElementById("tetrisNext");
  if(nv){var nx=nv.getContext("2d");nx.clearRect(0,0,nv.width,nv.height);
    if(tet.next){nx.fillStyle=TSHAPES[tet.next].c;tetCells(tet.next,0,0,0).forEach(function(c){trr(nx,c[0]*16+10,c[1]*16+12,13,13,4)})}}
}
function tetrisEnd(quiet,reason){
  if(!tet.on)return;
  tet.on=false;clearInterval(tet.timer);clearInterval(tet.clock);
  var g=tetPoints(),l=tet.lines;
  setTxt("tTitle",reason?"🧱 "+reason:"🧱 Spillet er slut");
  setTxt("tText","Du ryddede "+l+(l===1?" række":" rækker")+" og fik "+g+" point.");
  setTxt("tBtn","Spil igen");document.getElementById("tOver").hidden=false;
  endGame("tetris",g,{badge:l>=6?"tetris":null,best:"tetris",score:l,log:"spillede 🧱 Tetris: "+l+" rækker, +"+g+" point"});
  if(!quiet)toast("🧱 Du fik "+g+" point",g>0?"win":"cool");
}
function drawTetrisPage(){
  myBar("tetrisMe",capText("tetris")||null);drawList("tetrisList",false);
  var p=me();setTxt("tPlayer",p?p.icon:"–");setTxt("tBest",S.best.tetris||0);
  if(!tet.on)btnState("tBtn","tetris");
  if(!tet.on&&!tet.grid.length){var cv=document.getElementById("tetrisC");var cx=cv.getContext("2d");cx.fillStyle="#070b1c";cx.fillRect(0,0,cv.width,cv.height)}
}

/* ===================== LYKKEHJULET ===================== */
var WHEEL=[
  {t:"2 point",k:"pts",v:2,c:"#ffd166",ic:"⭐"},{t:"Slik",k:"pts",v:1,c:"#ff9ec7",ic:"🍬"},
  {t:"5 point",k:"pts",v:5,c:"#8fd0ff",ic:"⭐"},{t:"Niks",k:"zero",v:0,c:"#ded2c4",ic:"😐"},
  {t:"3 point",k:"pts",v:3,c:"#a8eec0",ic:"⭐"},{t:"Gratis spin",k:"free",v:0,c:"#c4b5fd",ic:"🎟️"},
  {t:"6 point",k:"pts",v:6,c:"#ffb37a",ic:"⭐"},{t:"Mønt til alle",k:"team",v:1,c:"#7fe3e8",ic:"🤝"},
  {t:"2 point",k:"pts",v:2,c:"#ffd166",ic:"⭐"},{t:"STORGEVINST",k:"jack",v:12,c:"#f5a623",ic:"🏆"},
  {t:"Slik",k:"pts",v:1,c:"#ff9ec7",ic:"🍬"},{t:"Uheld −2",k:"lose",v:-2,c:"#ffa3a3",ic:"💥"}
];
var wheel={ang:0,vel:0,on:false,who:0,raf:null};
function wheelDraw(){
  var cv=document.getElementById("wheelC");if(!cv)return;
  var cx=cv.getContext("2d"),w=cv.width,h=cv.height,r=Math.min(w,h)/2-18,mx=w/2,my=h/2,n=WHEEL.length,st=Math.PI*2/n;
  cx.clearRect(0,0,w,h);
  for(var i=0;i<n;i++){
    var a0=wheel.ang+i*st;
    cx.beginPath();cx.moveTo(mx,my);cx.arc(mx,my,r,a0,a0+st);cx.closePath();
    cx.fillStyle=WHEEL[i].c;cx.fill();cx.strokeStyle="#fff";cx.lineWidth=3;cx.stroke();
    var mid=a0+st/2,flip=Math.cos(mid)<0;
    cx.save();cx.translate(mx,my);cx.rotate(mid);if(flip)cx.rotate(Math.PI);
    cx.textBaseline="middle";cx.fillStyle="#4a3410";cx.textAlign=flip?"left":"right";
    cx.font="22px serif";cx.fillText(WHEEL[i].ic,flip?-(r-16):(r-16),-11);
    cx.font="900 12.5px Nunito, sans-serif";cx.fillText(WHEEL[i].t,flip?-(r-40):(r-40),10);
    cx.restore();
  }
  cx.beginPath();cx.arc(mx,my,34,0,Math.PI*2);cx.fillStyle="#fffdfa";cx.fill();cx.strokeStyle="#f2e2d0";cx.lineWidth=5;cx.stroke();
  cx.textAlign="center";cx.textBaseline="middle";cx.font="26px serif";
  var p=S.players[wheel.who];cx.fillText(p?p.icon:"🎡",mx,my+1);
  cx.beginPath();cx.moveTo(mx,my-r-16);cx.lineTo(mx-15,my-r+14);cx.lineTo(mx+15,my-r+14);cx.closePath();
  cx.fillStyle="#f2545b";cx.fill();cx.strokeStyle="#fff";cx.lineWidth=3;cx.stroke();
}
function wheelSpin(){
  if(wheel.on)return;
  var p=me();if(!p){openWho();return}
  startGame("wheel",p.freeSpin>0,function(pi){
    wheel.who=pi;wheel.on=true;document.getElementById("wOver").hidden=true;
    wheel.vel=0.40+Math.random()*0.14;cancelAnimationFrame(wheel.raf);
    (function step(){wheel.vel*=0.986;wheel.ang+=wheel.vel;wheelDraw();
      if(wheel.vel>0.0025)wheel.raf=requestAnimationFrame(step);else wheelStop()})();
  });
}
function wheelStop(){
  wheel.on=false;
  var n=WHEEL.length,st=Math.PI*2/n,norm=((-Math.PI/2-wheel.ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  var seg=WHEEL[Math.floor(norm/st)%n],msg="",o={};
  if(seg.k==="free"){o.freeSpin=1;o.log="vandt 🎟️ et gratis spin";msg="🎟️ Gratis spin til dig";toast(msg,"cool");endGame("wheel",0,o)}
  else if(seg.k==="team"){o.teamCoins=1;o.log="ramte 🤝 holdfeltet — alle fik 1 mønt";msg="🤝 Alle fik en mønt!";toast(msg,"cool");burst(130);endGame("wheel",0,o)}
  else if(seg.k==="jack"){o.badge="wheel";o.best="wheel";o.score=seg.v;o.log="ramte 🏆 STORGEVINSTEN";msg="🏆 STORGEVINST! +"+seg.v;toast(msg,"win");burst(280);endGame("wheel",seg.v,o)}
  else if(seg.k==="lose"){o.log="ramte 💥 uheld på hjulet";msg="💥 Du mistede 2 point";toast(msg,"bad");endGame("wheel",-2,o)}
  else if(seg.k==="zero"){o.log="drejede 🎡 og ramte et tomt felt";msg="😐 Ingen gevinst denne gang";toast(msg,"bad");endGame("wheel",0,o)}
  else{o.best="wheel";o.score=seg.v;o.log="drejede 🎡 og fik "+seg.v+" point";msg=seg.ic+" +"+seg.v+" point";toast(msg,"win");endGame("wheel",seg.v,o)}
  setTxt("wTitle",seg.ic+" "+seg.t);setTxt("wText",msg);setTxt("wBtn","Drej igen");document.getElementById("wOver").hidden=false;
}
function drawWheelPage(){
  myBar("wheelMe",capText("wheel")||null);drawList("wheelList",false);
  var p=me();setTxt("wPlayer",p?p.icon:"–");setTxt("wSpins",S.spins);setTxt("wBest",S.best.wheel||0);
  var b=document.getElementById("wBtn");
  if(!wheel.on){b.disabled=!p||(p.coins<1&&p.freeSpin<1)||!gameOn("wheel")||capLeft("wheel",p)<=0;
    if(b.textContent.indexOf("igen")<0)b.textContent=(p&&p.freeSpin>0)?"Drej hjulet — gratis 🎟️":"Drej hjulet — 1 mønt"}
  document.getElementById("wheelLegend").innerHTML=[["🏆","Storgevinst","+12"],["⭐","Point","+2 til +6"],["🍬","Slik","+1"],
    ["🎟️","Gratis spin","1 stk."],["🤝","Holdfelt","alle +1 mønt"],["💥","Uheld","−2"],["😐","Niks","0"]]
    .map(function(r){return '<div class="rule">'+r[0]+' '+r[1]+' <b>'+r[2]+'</b></div>'}).join("");
  wheelDraw();
}

/* ===================== SKYDETELTET ===================== */
var SHOOTDIV=5,SHOOTMAX=6;
function shootPoints(){return Math.min(SHOOTMAX,Math.round(shoot.pts/SHOOTDIV))}
var SHOOTK=[{ic:"🍬",v:1,r:24,s:1.7},{ic:"🍭",v:3,r:17,s:2.9},{ic:"🧁",v:2,r:21,s:2.2},{ic:"💣",v:-3,r:27,s:1.9}];
var shoot={on:false,t:[],hits:0,miss:0,pts:0,time:20,timer:null,raf:null,tick:0};
function shootStart(){
  if(shoot.on)return;
  startGame("shoot",false,function(){
    shoot.on=true;shoot.t=[];shoot.hits=0;shoot.miss=0;shoot.pts=0;shoot.time=20;shoot.tick=0;
    document.getElementById("hOver").hidden=true;setTxt("hHits",0);setTxt("hMiss",0);setTxt("hTime",20);
    clearInterval(shoot.timer);
    shoot.timer=setInterval(function(){shoot.time--;setTxt("hTime",shoot.time);if(shoot.time<=0)shootEnd(false)},1000);
    cancelAnimationFrame(shoot.raf);shootLoop();
  });
}
function shootLoop(){
  if(!shoot.on)return;
  var cv=document.getElementById("shootC"),cx=cv.getContext("2d");
  shoot.tick++;
  var rate=Math.max(14,30-Math.floor((20-shoot.time)*0.8));
  if(shoot.tick%rate===0){
    var k=SHOOTK[Math.random()<0.34?3:(Math.random()<0.62?0:(Math.random()<0.5?2:1))],L=Math.random()<0.5;
    shoot.t.push({x:L?-32:cv.width+32,y:46+Math.random()*(cv.height-92),vx:(L?1:-1)*(k.s+Math.random()*1.1),vy:(Math.random()-0.5)*1.5,r:k.r,ic:k.ic,v:k.v});
  }
  cx.fillStyle="#0c2137";cx.fillRect(0,0,cv.width,cv.height);
  shoot.t=shoot.t.filter(function(t){t.x+=t.vx;t.y+=t.vy;if(t.y<t.r||t.y>cv.height-t.r)t.vy*=-1;return t.x>-70&&t.x<cv.width+70});
  shoot.t.forEach(function(t){
    cx.beginPath();cx.arc(t.x,t.y,t.r+5,0,Math.PI*2);
    cx.fillStyle=t.v<0?"rgba(242,84,91,.22)":t.v>=3?"rgba(245,166,35,.28)":"rgba(255,111,174,.20)";cx.fill();
    cx.font=(t.r*1.7)+"px serif";cx.textAlign="center";cx.textBaseline="middle";cx.fillText(t.ic,t.x,t.y);
  });
  cx.fillStyle="rgba(255,255,255,.4)";cx.font="900 12px Nunito, sans-serif";cx.textAlign="left";
  cx.fillText("RAMT "+shoot.pts+"  →  "+shootPoints()+" POINT"+(shootPoints()>=SHOOTMAX?"  (maks)":""),14,20);
  shoot.raf=requestAnimationFrame(shootLoop);
}
function shootClick(e){
  if(!shoot.on)return;
  var cv=document.getElementById("shootC"),b=cv.getBoundingClientRect();
  var x=(e.clientX-b.left)*(cv.width/b.width),y=(e.clientY-b.top)*(cv.height/b.height),hit=-1;
  for(var i=shoot.t.length-1;i>=0;i--){var t=shoot.t[i];if(Math.sqrt((t.x-x)*(t.x-x)+(t.y-y)*(t.y-y))<=t.r+6){hit=i;break}}
  if(hit<0){shoot.miss++;setTxt("hMiss",shoot.miss);return}
  var tt=shoot.t[hit];
  if(tt.v<0){shoot.pts=Math.max(0,shoot.pts-3);toast("💣 −3","bad")}else{shoot.pts+=tt.v;shoot.hits++;setTxt("hHits",shoot.hits)}
  shoot.t.splice(hit,1);
}
function shootEnd(quiet){
  if(!shoot.on)return;
  shoot.on=false;clearInterval(shoot.timer);cancelAnimationFrame(shoot.raf);
  var g=shootPoints(),hits=shoot.hits;
  setTxt("hTitle","🎯 Tiden er gået");setTxt("hText","Du ramte "+hits+" mål og fik "+g+" point.");
  setTxt("hBtn","Spil igen");document.getElementById("hOver").hidden=false;
  endGame("shoot",g,{badge:hits>=12?"sharp":null,best:"shoot",score:hits,log:"spillede 🎯 Skydeteltet: "+hits+" ramt, +"+g+" point"});
  if(!quiet)toast("🎯 Du fik "+g+" point",g>0?"win":"cool");
}
function drawShootPage(){
  myBar("shootMe",capText("shoot")||null);drawList("shootList",false);
  var p=me();setTxt("hPlayer",p?p.icon:"–");setTxt("hBest",S.best.shoot||0);
  if(!shoot.on){btnState("hBtn","shoot");var cv=document.getElementById("shootC");var cx=cv.getContext("2d");cx.fillStyle="#0c2137";cx.fillRect(0,0,cv.width,cv.height)}
}

/* ===================== STABELSPILLET ===================== */
var stack={on:false,blocks:[],cur:null,dir:1,speed:3.2,who:0,raf:null};
function stackStart(){
  if(stack.on)return;
  startGame("stack",false,function(pi){
    var cv=document.getElementById("stackC"),bx=(cv.width-190)/2;
    stack.who=pi;stack.on=true;stack.speed=3.2;stack.dir=1;stack.blocks=[{x:bx,w:190}];stack.cur={x:bx,w:190};
    document.getElementById("kOver").hidden=true;document.getElementById("kTap").disabled=false;
    setTxt("kFloor",0);setTxt("kPts",0);cancelAnimationFrame(stack.raf);stackLoop();
  });
}
function stackPts(){var f=stack.blocks.length-1;return Math.round(f*0.4)+Math.floor(f/5)}
function stackLoop(){
  if(!stack.on)return;
  var cv=document.getElementById("stackC"),cx=cv.getContext("2d"),bh=30;
  stack.cur.x+=stack.dir*stack.speed;
  if(stack.cur.x<=0){stack.cur.x=0;stack.dir=1}
  if(stack.cur.x+stack.cur.w>=cv.width){stack.cur.x=cv.width-stack.cur.w;stack.dir=-1}
  cx.fillStyle="#2b1b0f";cx.fillRect(0,0,cv.width,cv.height);
  var p=S.players[stack.who],base=cv.height-24,shown=Math.min(stack.blocks.length,Math.floor((cv.height-96)/bh)),off=stack.blocks.length-shown;
  for(var i=off;i<stack.blocks.length;i++){var b=stack.blocks[i],y=base-(i-off+1)*bh;cx.fillStyle="hsl("+((i*27)%360)+",72%,62%)";trr(cx,b.x,y,b.w,bh-4,6)}
  var my=base-(shown+1)*bh;cx.fillStyle=p?p.color:"#ffd166";trr(cx,stack.cur.x,my,stack.cur.w,bh-4,6);
  cx.fillStyle="rgba(255,255,255,.4)";cx.font="900 12px Nunito, sans-serif";cx.textAlign="left";cx.textBaseline="alphabetic";
  cx.fillText("ETAGE "+(stack.blocks.length-1)+"   ·   "+stackPts()+" POINT",14,20);
  stack.raf=requestAnimationFrame(stackLoop);
}
function stackDrop(){
  if(!stack.on)return;
  var prev=stack.blocks[stack.blocks.length-1],l=Math.max(stack.cur.x,prev.x),r=Math.min(stack.cur.x+stack.cur.w,prev.x+prev.w),ov=r-l;
  if(ov<=6)return stackEnd(false,"Tårnet væltede");
  if(Math.abs(stack.cur.x-prev.x)<=6){ov=prev.w;l=prev.x;toast("✨ Perfekt ramt!","win")}
  stack.blocks.push({x:l,w:ov});stack.cur={x:l,w:ov};stack.dir=1;
  if((stack.blocks.length-1)%3===0)stack.speed+=0.45;
  setTxt("kFloor",stack.blocks.length-1);setTxt("kPts",stackPts());
}
function stackEnd(quiet,reason){
  if(!stack.on)return;
  stack.on=false;cancelAnimationFrame(stack.raf);document.getElementById("kTap").disabled=true;
  var f=stack.blocks.length-1,g=stackPts();
  setTxt("kTitle",reason?"🏚️ "+reason:"🏗️ Spillet er slut");setTxt("kText","Du nåede "+f+" etager og fik "+g+" point.");
  setTxt("kBtn","Spil igen");document.getElementById("kOver").hidden=false;
  endGame("stack",g,{badge:f>=10?"tower":null,best:"stack",score:f,log:"spillede 🏗️ Stabelspillet: "+f+" etager, +"+g+" point"});
  if(!quiet)toast("🏗️ Du fik "+g+" point",g>0?"win":"cool");
}
function drawStackPage(){
  myBar("stackMe",capText("stack")||null);drawList("stackList",false);
  var p=me();setTxt("kPlayer",p?p.icon:"–");setTxt("kBest",S.best.stack||0);
  if(!stack.on){btnState("kBtn","stack");var cv=document.getElementById("stackC");var cx=cv.getContext("2d");cx.fillStyle="#2b1b0f";cx.fillRect(0,0,cv.width,cv.height)}
}

/* ===================== GULDGRAVEREN ===================== */
var DIGL=[{n:"Muld",ic:"🟫",v:1,risk:0.05},{n:"Grus",ic:"🪨",v:1,risk:0.10},{n:"Ler",ic:"🟤",v:1,risk:0.16},
  {n:"Kul",ic:"⬛",v:2,risk:0.22},{n:"Kobber",ic:"🟠",v:2,risk:0.28},{n:"Sølv",ic:"⚪",v:3,risk:0.34},
  {n:"Guld",ic:"🟡",v:4,risk:0.40},{n:"Rubin",ic:"🔴",v:5,risk:0.46},{n:"Diamant",ic:"💎",v:7,risk:0.52}];
var dig={on:false,depth:0,pot:0};
function digStart(){if(dig.on)return;startGame("dig",false,function(){dig.on=true;dig.depth=0;dig.pot=0;document.getElementById("gOver").hidden=true;render()})}
function digDeeper(){
  if(!dig.on)return;
  var L=DIGL[Math.min(dig.depth,DIGL.length-1)];
  if(Math.random()<L.risk){
    dig.on=false;var lost=dig.pot;
    setTxt("gTitle","💥 Skakten styrtede sammen");setTxt("gText","Du mistede puljen på "+lost+" point.");setTxt("gBtn","Prøv igen");
    document.getElementById("gOver").hidden=false;toast("💥 Du mistede "+lost+" point","bad");
    endGame("dig",0,{log:"mistede "+lost+" point i ⛏️ Guldgraveren"});dig.pot=0;render();return;
  }
  dig.depth++;dig.pot+=L.v;toast(L.ic+" "+L.n+" +"+L.v,"cool");render();
}
function digCash(){
  if(!dig.on||dig.pot<1)return;
  var pot=dig.pot,d=dig.depth;dig.on=false;dig.pot=0;
  setTxt("gTitle","⛏️ Oppe i sikkerhed");setTxt("gText","Du tog "+pot+" point med op fra dybde "+d+".");setTxt("gBtn","Grav igen");
  document.getElementById("gOver").hidden=false;toast("⛏️ Du sikrede "+pot+" point","win");
  endGame("dig",pot,{badge:d>=7?"gold":null,best:"dig",score:d,log:"kom op fra ⛏️ Guldgraveren med "+pot+" point"});
}
function digEnd(){if(dig.on){dig.on=false;dig.pot=0}}
function drawDigPage(){
  myBar("digMe",capText("dig")||null);drawList("digList",false);
  var p=me();setTxt("gPlayer",p?p.icon:"–");setTxt("gBest",S.best.dig||0);setTxt("gDepth",dig.on?dig.depth:0);setTxt("gPot",dig.on?dig.pot:0);
  if(!dig.on)btnState("gBtn","dig");
  var L=DIGL[Math.min(dig.depth,DIGL.length-1)],d=document.getElementById("gDig"),c=document.getElementById("gCash");
  d.disabled=!dig.on;d.textContent=dig.on?("⛏️ Grav videre → "+L.ic+" "+L.n+" (+"+L.v+", "+Math.round(L.risk*100)+"% risiko)"):"⛏️ Grav videre";
  c.disabled=!dig.on||dig.pot<1;c.textContent=(dig.on&&dig.pot)?("🪣 Tag "+dig.pot+" point og kom op"):"🪣 Kom op";
  document.getElementById("gLayers").innerHTML=DIGL.map(function(x,i){
    return '<div class="layer'+(i<dig.depth?" done":"")+((dig.on&&i===dig.depth)?" now":"")+'"><span class="lic">'+x.ic+'</span><b>'+x.n+'</b>'+
      '<span class="lv">+'+x.v+'</span><span class="lr">'+Math.round(x.risk*100)+'% risiko</span></div>'}).join("");
}

document.addEventListener("keydown",function(e){
  var pm=document.getElementById("pinModal");
  if(pm&&!pm.hidden){if(e.key==="Enter"){submitPin();e.preventDefault()}else if(e.key==="Escape"){closePin();e.preventDefault()}return}
  if(UI.view==="stack"&&stack.on&&(e.key===" "||e.code==="Space")){stackDrop();e.preventDefault();return}
  if(UI.view==="tetris"&&tet.on){
    var k=e.key.toLowerCase();
    if(k==="arrowleft"||k==="a")tetMove(-1);else if(k==="arrowright"||k==="d")tetMove(1);
    else if(k==="arrowdown"||k==="s")tetSoft();else if(k==="arrowup"||k==="w")tetRotate();
    else if(e.key===" "||e.code==="Space")tetHard();else return;
    e.preventDefault();
  }
});
document.getElementById("shootC").addEventListener("click",shootClick);

/* =====================================================================
   NYE SPIL (okt. 2026)
   Flødebolle-flyveren · Over vejen · Småkage-klikkeren
   Lotteriet · Sten, saks, papir · Salgstippet
   Arkadespillene følger samme mønster som de andre: startGame trækker en mønt,
   spillet kører i browseren, og resultatet sendes til serveren. Serveren regner
   selv pointene ud og kræver den billet, den gav ved start.
   ===================================================================== */
/* dansk dato og klokkeslæt (følger sommer- og vintertid) */
function dkNow(){
  try{
    var o={};
    new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Copenhagen",year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).forEach(function(x){o[x.type]=x.value});
    return {d:o.year+"-"+o.month+"-"+o.day,m:((+o.hour)%24)*60+(+o.minute),s:+o.second};
  }catch(e){
    var t=new Date();
    return {d:t.getFullYear()+"-"+("0"+(t.getMonth()+1)).slice(-2)+"-"+("0"+t.getDate()).slice(-2),m:t.getHours()*60+t.getMinutes(),s:t.getSeconds()};
  }
}
function hm(m){return ("0"+Math.floor(m/60)).slice(-2)+"."+("0"+(m%60)).slice(-2)}
function dayTxt(d){var x=new Date(d+"T12:00:00Z");return ["søn","man","tirs","ons","tors","fre","lør"][x.getUTCDay()]+" "+(+d.slice(8,10))+"/"+(+d.slice(5,7))}
function tm(iso){var d=new Date(iso);return "kl. "+("0"+d.getHours()).slice(-2)+"."+("0"+d.getMinutes()).slice(-2)}
function pIco(i){var q=S.players[i];return q?q.icon:"❓"}
function pNm(i){var q=S.players[i];return q?esc(q.name):"?"}
function pTag(i){return '<span class="who2">'+pIco(i)+' '+pNm(i)+'</span>'}
function recLine(id,unit){
  var r=(S.rec||{})[id];
  return r?'🏆 Rekord: <b>'+r.v+' '+unit+'</b> — '+r.i+' '+esc(r.n)+' ('+dayTxt(r.d)+')':'🏆 Ingen rekord endnu — sæt den første!';
}
/* fast tidstrin, så spillene kører lige hurtigt på alle skærme */
function fixedLoop(o,step,draw){
  var last=performance.now(),acc=0,dt=1000/60;
  (function f(t){
    if(!o.on)return;
    acc+=Math.min(250,Math.max(0,t-last));last=t;
    while(acc>=dt&&o.on){step(1/60);acc-=dt}
    if(!o.on)return;
    draw();
    o.raf=requestAnimationFrame(f);
  })(last);
}
function arcadeStart(id,o,begin){
  if(o.on)return;
  startGame(id,false,function(){var p=me();o.tk=(p&&p.tk&&p.tk.g===id)?p.tk.id:"";begin()});
}
function arcadeEnd(id,o,score){
  send({type:"score",pi:UI.me,game:id,score:score,tk:o.tk},function(r){
    if(!r)return;
    if(r.err){toast(r.err,"bad");return}
    if(r.capped)toast("🛑 Dagens grænse nået — du fik "+r.given+" point","bad");
    else if(r.rec)toast("🏆 Ny rekord: "+score+"!","win");
  });
}
function arcadePage(id,unit,pre){
  myBar(id+"Me",capText(id)||null);drawList(id+"List",false);
  var p=me(),r=(S.rec||{})[id];
  setTxt(pre+"Player",p?p.icon:"–");setTxt(pre+"Best",r?r.v:0);
  var e=document.getElementById(pre+"Rec");if(e)e.innerHTML=recLine(id,unit);
}

/* ===================== FLØDEBOLLE-FLYVEREN ===================== */
var FLY={W:720,H:440,X:170,R:16,G:1500,JUMP:-430,MAXV:560,PW:66,GROUND:26,SP0:150,SPMAX:265,GAP0:160,GAPSTEP:2.5,GAPMIN:112,DIV:4};
var fly={on:false,tk:"",y:200,v:0,pipes:[],holes:0,speed:150,gap:152,spawn:0,lastY:220,t:0,raf:null};
function flyPts(){return Math.min(6,Math.floor(fly.holes/FLY.DIV))}
function flyStart(){
  arcadeStart("fly",fly,function(){
    fly.on=true;fly.y=FLY.H/2-30;fly.v=FLY.JUMP;fly.pipes=[];fly.holes=0;fly.speed=FLY.SP0;fly.gap=FLY.GAP0;
    fly.spawn=0;fly.lastY=FLY.H/2;fly.t=0;
    document.getElementById("fOver").hidden=true;setTxt("fHoles",0);setTxt("fPts",0);
    cancelAnimationFrame(fly.raf);fixedLoop(fly,flyStep,flyDraw);
  });
}
function flyFlap(){if(fly.on)fly.v=FLY.JUMP}
function flyStep(dt){
  fly.t+=dt;
  fly.v=Math.min(FLY.MAXV,fly.v+FLY.G*dt);fly.y+=fly.v*dt;
  if(fly.y<FLY.R){fly.y=FLY.R;if(fly.v<0)fly.v=0}
  var dx=fly.speed*dt;
  fly.spawn-=dx;
  if(fly.spawn<=0){
    var g=fly.gap,lo=50+g/2,hi=FLY.H-FLY.GROUND-50-g/2;
    var y=Math.max(lo,Math.min(hi,fly.lastY+(Math.random()*2-1)*140));
    fly.lastY=y;fly.pipes.push({x:FLY.W+10,y:y,g:g,done:false});
    fly.spawn=Math.max(225,275-fly.holes*2);
  }
  for(var i=0;i<fly.pipes.length;i++){
    var p=fly.pipes[i];p.x-=dx;
    if(!p.done&&p.x+FLY.PW<FLY.X-FLY.R){
      p.done=true;fly.holes++;
      fly.speed=Math.min(FLY.SPMAX,fly.speed+5);fly.gap=Math.max(FLY.GAPMIN,fly.gap-FLY.GAPSTEP);
      setTxt("fHoles",fly.holes);setTxt("fPts",flyPts());
      if(fly.holes===FLY.DIV*6)toast("🐦 Maks point! Flyv videre efter rekorden","win");
      else if(fly.holes%FLY.DIV===0&&fly.holes<FLY.DIV*6)toast("⭐ +1 point","win");
    }
    if(flyHit(p)){flyEnd(false,"Du ramte en lakridsstang");return}
  }
  fly.pipes=fly.pipes.filter(function(p){return p.x>-FLY.PW-20});
  if(fly.y+FLY.R>=FLY.H-FLY.GROUND){fly.y=FLY.H-FLY.GROUND-FLY.R;flyEnd(false,"Du ramte jorden")}
}
function flyHit(p){
  var cx=FLY.X,cy=fly.y,r=FLY.R-3;   /* lidt tilgivende kant */
  if(cx+r<p.x||cx-r>p.x+FLY.PW)return false;
  var top=p.y-p.g/2,bot=p.y+p.g/2;
  function hit(x0,y0,x1,y1){var nx=Math.max(x0,Math.min(cx,x1)),ny=Math.max(y0,Math.min(cy,y1));return (nx-cx)*(nx-cx)+(ny-cy)*(ny-cy)<r*r}
  return hit(p.x,-60,p.x+FLY.PW,top)||hit(p.x,bot,p.x+FLY.PW,FLY.H);
}
function flyStick(cx,x,y,w,h){
  if(h<=0)return;
  cx.fillStyle="#3a1414";trr(cx,x,y,w,h,10);
  cx.save();cx.beginPath();cx.rect(x,y,w,h);cx.clip();cx.fillStyle="#c0263a";
  for(var s=y-w;s<y+h;s+=26){cx.beginPath();cx.moveTo(x,s);cx.lineTo(x+w,s+w*0.5);cx.lineTo(x+w,s+w*0.5+9);cx.lineTo(x,s+9);cx.closePath();cx.fill()}
  cx.restore();
}
function flyDraw(){
  var cv=document.getElementById("flyC");if(!cv)return;
  var cx=cv.getContext("2d"),W=FLY.W,H=FLY.H,i;
  var sky=cx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#8fd0ff");sky.addColorStop(1,"#fff0d6");
  cx.fillStyle=sky;cx.fillRect(0,0,W,H);
  cx.fillStyle="rgba(255,255,255,.75)";
  for(i=0;i<4;i++){
    var kx=((i*230-fly.t*25)%(W+200)+W+200)%(W+200)-100,ky=55+(i%2)*65;
    cx.beginPath();cx.arc(kx,ky,22,0,Math.PI*2);cx.arc(kx+24,ky-10,26,0,Math.PI*2);cx.arc(kx+50,ky,20,0,Math.PI*2);cx.fill();
  }
  fly.pipes.forEach(function(p){
    var top=p.y-p.g/2,bot=p.y+p.g/2;
    flyStick(cx,p.x,-12,FLY.PW,top+12);flyStick(cx,p.x,bot,FLY.PW,H-FLY.GROUND-bot+12);
  });
  cx.fillStyle="#7ccf63";cx.fillRect(0,H-FLY.GROUND,W,FLY.GROUND);
  cx.fillStyle="#5aa947";
  for(i=0;i<W+24;i+=24){var gx=((i-fly.t*fly.speed)%(W+24)+W+24)%(W+24)-12;cx.fillRect(gx,H-FLY.GROUND,12,6)}
  var ang=Math.max(-0.5,Math.min(0.9,fly.v/600));
  cx.save();cx.translate(FLY.X,fly.y);cx.rotate(ang);
  cx.fillStyle="#f3d9a4";cx.beginPath();cx.ellipse(0,9,FLY.R+3,6,0,0,Math.PI*2);cx.fill();
  cx.fillStyle="#4a2511";cx.beginPath();cx.arc(0,7,FLY.R,Math.PI,0);cx.closePath();cx.fill();
  cx.fillStyle="rgba(255,255,255,.35)";cx.beginPath();cx.ellipse(-6,-2,4,7,-0.5,0,Math.PI*2);cx.fill();
  cx.fillStyle="#fff";cx.beginPath();cx.arc(6,0,4,0,Math.PI*2);cx.fill();
  cx.fillStyle="#222";cx.beginPath();cx.arc(7,0,2,0,Math.PI*2);cx.fill();
  cx.restore();
  cx.fillStyle="rgba(40,30,60,.6)";cx.font="900 12px Nunito, sans-serif";cx.textAlign="left";cx.textBaseline="alphabetic";
  cx.fillText("HULLER "+fly.holes+"  →  "+flyPts()+" POINT"+(flyPts()>=6?"  (maks)":""),14,22);
}
function flyEnd(quiet,reason){
  if(!fly.on)return;
  fly.on=false;cancelAnimationFrame(fly.raf);
  var g=flyPts(),h=fly.holes;
  setTxt("fTitle",reason?"🐦 "+reason:"🐦 Turen er slut");
  setTxt("fText","Du fløj gennem "+h+(h===1?" hul":" huller")+" og fik "+g+" point.");
  setTxt("fBtn","Spil igen");document.getElementById("fOver").hidden=false;
  arcadeEnd("fly",fly,h);
  if(!quiet)toast("🐦 Du fik "+g+" point",g>0?"win":"cool");
  flyDraw();
}
function drawFlyPage(){
  arcadePage("fly","huller","f");
  if(!fly.on){btnState("fBtn","fly");flyDraw()}
}

/* ===================== OVER VEJEN ===================== */
var RD={C:9,S:52,V:11,T:30,OFF:4};
var road={on:false,tk:"",rows:[],seg:null,px:4,py:0,max:0,cam:0,camD:0,time:30,t:0,hop:0,from:null,q:null,sec:30,raf:null};
function roadPts(){return Math.min(6,Math.floor(road.max/5))}
function roadGen(i){
  var d=Math.min(1,i/40),L=RD.C+8,dir=Math.random()<0.5?-1:1;
  if(i<3)return {k:"g",tr:[]};
  if(!road.seg||road.seg.left<=0){
    var prev=road.seg?road.seg.k:"g";
    if(prev!=="g")road.seg={k:"g",left:1};
    else if(Math.random()<0.36+d*0.12)road.seg={k:"w",left:1+Math.floor(Math.random()*(1.6+d*1.4))};
    else road.seg={k:"r",left:1+Math.floor(Math.random()*(2.2+d*2))};
  }
  road.seg.left--;
  var k=road.seg.k;
  if(k==="g"){
    var tr=[],n=Math.floor(Math.random()*(2+d*1.5));
    while(tr.length<n){var c=Math.floor(Math.random()*RD.C);if(tr.indexOf(c)<0)tr.push(c)}
    return {k:"g",tr:tr};
  }
  var o=[],x=Math.random()*3;
  if(k==="r"){
    var cols=["#f2545b","#4cc3f0","#ffd166","#8b7bf0","#2fbf71","#ff9ec7"];
    while(x<L-1){var w=Math.random()<0.25?2:1;o.push({x:x,w:w,c:cols[Math.floor(Math.random()*cols.length)]});x+=w+(2.6-d)+Math.random()*(2.6-d*1.2)}
    return {k:"r",dir:dir,v:1.2+d*2+Math.random()*0.7,L:L,o:o};
  }
  while(x<L-1){var lw=Math.max(2,Math.round(4-d*1.6-Math.random()*1.2));o.push({x:x,w:lw});x+=lw+1.4+d+Math.random()*1.4}
  return {k:"w",dir:dir,v:0.8+d*1.3+Math.random()*0.5,L:L,o:o};
}
function roadMore(n){while(road.rows.length<n)road.rows.push(roadGen(road.rows.length))}
function roadCar(r,px){
  var a=px+0.2,b=px+0.8;
  for(var i=0;i<r.o.length;i++){var s=r.o[i].x-RD.OFF;if(s<b&&s+r.o[i].w>a)return true}
  return false;
}
function roadLog(r,px){
  var c=px+0.5;
  for(var i=0;i<r.o.length;i++){var s=r.o[i].x-RD.OFF;if(c>=s&&c<s+r.o[i].w)return true}
  return false;
}
function roadStart(){
  arcadeStart("road",road,function(){
    road.on=true;road.rows=[];road.seg=null;road.px=4;road.py=0;road.max=0;road.cam=0;road.camD=0;
    road.time=RD.T;road.sec=RD.T;road.t=0;road.hop=0;road.from=null;road.q=null;
    roadMore(RD.V+4);
    document.getElementById("rdOver").hidden=true;setTxt("rdRows",0);setTxt("rdPts",0);setTxt("rdTime",RD.T);
    cancelAnimationFrame(road.raf);fixedLoop(road,roadStep,roadDraw);
  });
}
function roadMove(dx,dy){
  if(!road.on)return;
  if(road.hop>0){road.q=[dx,dy];return}       /* ét hop ad gangen — det næste står i kø */
  var cur=road.rows[road.py],nx,ny=road.py+dy;
  if(dy===0&&cur&&cur.k==="w")nx=road.px+dx; else nx=Math.round(road.px)+dx;
  if(nx<-0.25||nx>RD.C-0.75)return;
  if(ny<0||ny<road.cam)return;
  roadMore(ny+RD.V+3);
  var t=road.rows[ny];
  if(t.k==="g"&&t.tr.indexOf(Math.round(nx))>-1)return;  /* et træ står i vejen */
  road.from={x:road.px,y:road.py};road.hop=0.1;road.px=nx;road.py=ny;
  if(ny>road.max){
    road.max=ny;setTxt("rdRows",ny);setTxt("rdPts",roadPts());
    if(ny===30)toast("🏪 Maks point! Fortsæt efter rekorden","win");
    else if(ny%5===0&&ny<30)toast("⭐ +1 point","win");
  }
  road.cam=Math.max(road.cam,road.py-3);
}
function roadStep(dt){
  road.t+=dt;road.time-=dt;
  var sec=Math.max(0,Math.ceil(road.time));if(sec!==road.sec){road.sec=sec;setTxt("rdTime",sec)}
  if(road.time<=0){road.time=0;roadEnd(false,"Tiden er gået");return}
  for(var i=Math.max(0,road.cam-2);i<road.cam+RD.V+3;i++){
    var r=road.rows[i];if(!r||!r.o)continue;
    for(var k=0;k<r.o.length;k++){var o=r.o[k];o.x=((o.x+r.dir*r.v*dt)%r.L+r.L)%r.L}
  }
  if(road.hop>0){
    road.hop-=dt;
    if(road.hop<=0){road.hop=0;road.from=null;if(road.q){var q=road.q;road.q=null;roadMove(q[0],q[1])}}
  }
  road.camD+=(road.cam-road.camD)*Math.min(1,dt*8);
  var row=road.rows[road.py];
  if(row.k==="r"&&roadCar(row,road.px)){roadEnd(false,"Du blev kørt over");return}
  if(row.k==="w"&&road.hop<=0){
    if(!roadLog(row,road.px)){roadEnd(false,"Plask! Du faldt i åen");return}
    road.px+=row.dir*row.v*dt;
    if(road.px<-0.3||road.px>RD.C-0.7){roadEnd(false,"Du drev ud over kanten");return}
  }
}
function roadDraw(){
  var cv=document.getElementById("roadC");if(!cv)return;
  var cx=cv.getContext("2d"),Z=RD.S,W=RD.C*Z,H=RD.V*Z,base=road.camD,i;
  cx.fillStyle="#8fd36b";cx.fillRect(0,0,W,H);
  for(i=Math.max(0,Math.floor(base)-1);i<base+RD.V+1;i++){
    var r=road.rows[i];if(!r)continue;
    var y=H-(i-base+1)*Z;
    if(r.k==="g"){
      cx.fillStyle=i%2?"#9be07a":"#8fd36b";cx.fillRect(0,y,W,Z);
      cx.font=Math.round(Z*0.7)+"px serif";cx.textAlign="center";cx.textBaseline="middle";
      r.tr.forEach(function(c){cx.fillText("🌳",c*Z+Z/2,y+Z/2+2)});
    }else if(r.k==="r"){
      cx.fillStyle="#565a66";cx.fillRect(0,y,W,Z);
      cx.fillStyle="rgba(255,255,255,.35)";for(var k=0;k<W;k+=40)cx.fillRect(k+8,y+Z/2-2,20,4);
      r.o.forEach(function(o){
        var sx=(o.x-RD.OFF)*Z;if(sx>W||sx+o.w*Z<0)return;
        cx.fillStyle=o.c;trr(cx,sx+3,y+7,o.w*Z-6,Z-14,9);
        cx.fillStyle="rgba(255,255,255,.6)";cx.fillRect(r.dir>0?sx+o.w*Z-17:sx+7,y+12,10,Z-24);
      });
    }else{
      cx.fillStyle="#4cc3f0";cx.fillRect(0,y,W,Z);
      cx.fillStyle="rgba(255,255,255,.28)";
      for(var q=0;q<W;q+=46){var wx=((q+road.t*24*r.dir)%W+W)%W;cx.fillRect(wx,y+10+(q/46%3)*12,16,3)}
      r.o.forEach(function(o){
        var sx=(o.x-RD.OFF)*Z;if(sx>W||sx+o.w*Z<0)return;
        cx.fillStyle="#9b6a3c";trr(cx,sx+2,y+8,o.w*Z-4,Z-16,12);
        cx.fillStyle="#7a5230";cx.fillRect(sx+10,y+Z/2-1,o.w*Z-20,2);
      });
    }
    if(i>0&&i%5===0){
      cx.fillStyle="rgba(0,0,0,.45)";cx.font="900 11px Nunito, sans-serif";cx.textAlign="left";cx.textBaseline="top";
      cx.fillText(i===30?"🏪 30 — MAKS":String(i),5,y+3);
    }
  }
  var p=S.players[UI.me],f=(road.hop>0&&road.from)?road.hop/0.1:0;
  var ppx=road.px+(road.from?(road.from.x-road.px)*f:0),ppy=road.py+(road.from?(road.from.y-road.py)*f:0);
  var x=ppx*Z+Z/2,yy=H-(ppy-base+1)*Z+Z/2-(f>0?Math.sin(f*Math.PI)*8:0);
  cx.fillStyle="rgba(0,0,0,.18)";cx.beginPath();cx.ellipse(x,H-(ppy-base+1)*Z+Z*0.82,Z*0.3,Z*0.09,0,0,Math.PI*2);cx.fill();
  cx.fillStyle=p?p.color:"#ffd166";cx.beginPath();cx.arc(x,yy,Z*0.36,0,Math.PI*2);cx.fill();
  cx.strokeStyle="#fff";cx.lineWidth=3;cx.stroke();
  cx.font=Math.round(Z*0.48)+"px serif";cx.textAlign="center";cx.textBaseline="middle";cx.fillText(p?p.icon:"🐸",x,yy+1);
  cx.fillStyle="rgba(0,0,0,.5)";cx.fillRect(0,0,W,24);
  cx.fillStyle="#fff";cx.font="900 12px Nunito, sans-serif";cx.textBaseline="middle";cx.textAlign="left";
  cx.fillText("RÆKKE "+road.max+"  →  "+roadPts()+" POINT"+(roadPts()>=6?" (maks)":""),10,12);
  cx.textAlign="right";cx.fillStyle=road.on&&road.time<=5?"#ff8a8f":"#fff";cx.fillText("⏱ "+Math.ceil(road.time)+"s",W-10,12);
}
function roadEnd(quiet,reason){
  if(!road.on)return;
  road.on=false;cancelAnimationFrame(road.raf);
  var g=roadPts(),n=road.max;
  setTxt("rdTitle",reason?"🐸 "+reason:"🐸 Turen er slut");
  setTxt("rdText","Du nåede "+n+(n===1?" række":" rækker")+" og fik "+g+" point.");
  setTxt("rdBtn","Spil igen");document.getElementById("rdOver").hidden=false;
  arcadeEnd("road",road,n);
  if(!quiet)toast("🐸 Du fik "+g+" point",g>0?"win":"cool");
  roadDraw();
}
function drawRoadPage(){
  arcadePage("road","rækker","rd");
  if(!road.on){
    btnState("rdBtn","road");
    if(!road.rows.length){road.seg=null;roadMore(RD.V+4)}
    roadDraw();
  }
}

/* ===================== SMÅKAGE-KLIKKEREN ===================== */
var CK={T:30,DIV:500,CPS:12,GROW:1.6,W:720,H:400,CX:230,CY:200,R:130,
  ITEMS:[{ic:"🥄",n:"Kagerulle",d:"+1 småkage pr. klik",c:15,clk:1},
         {ic:"👵",n:"Bedstemor",d:"bager 3 pr. sekund",c:40,aut:3},
         {ic:"🔥",n:"Ovn",d:"bager 12 pr. sekund",c:150,aut:12}]};
var CHIPS=[[-0.45,-0.3,0.4],[0.1,-0.5,1.1],[0.5,-0.15,0.2],[-0.2,0.25,2.1],[0.35,0.45,0.7],[-0.6,0.2,1.6],[0.05,0.02,0.9],[0.62,0.25,2.4],[-0.3,-0.66,0.3]];
var ck={on:false,tk:"",bank:0,baked:0,per:1,aut:0,own:[0,0,0],price:[15,40,150],time:30,clicks:[],pops:[],squash:0,t:0,raf:null};
function ckPts(){return Math.min(6,Math.round(Math.floor(ck.baked)/CK.DIV))}
function ckStart(){
  arcadeStart("cookie",ck,function(){
    ck.on=true;ck.bank=0;ck.baked=0;ck.per=1;ck.aut=0;ck.own=[0,0,0];
    ck.price=CK.ITEMS.map(function(x){return x.c});ck.time=CK.T;ck.clicks=[];ck.pops=[];ck.squash=0;ck.t=0;
    document.getElementById("cOver").hidden=true;
    cancelAnimationFrame(ck.raf);fixedLoop(ck,ckStep,ckDraw);
  });
}
function ckStep(dt){
  ck.t+=dt;ck.time-=dt;
  ck.bank+=ck.aut*dt;ck.baked+=ck.aut*dt;
  ck.squash=Math.max(0,ck.squash-dt*6);
  for(var i=ck.pops.length-1;i>=0;i--){ck.pops[i].t+=dt;if(ck.pops[i].t>=0.8)ck.pops.splice(i,1)}
  if(ck.time<=0){ck.time=0;ckEnd(false)}
}
function ckClick(e){
  if(!ck.on||e.isTrusted===false)return;            /* klik lavet af et script tæller ikke */
  var cv=document.getElementById("cookieC"),b=cv.getBoundingClientRect();
  var x=(e.clientX-b.left)*(cv.width/b.width),y=(e.clientY-b.top)*(cv.height/b.height);
  if((x-CK.CX)*(x-CK.CX)+(y-CK.CY)*(y-CK.CY)>(CK.R+10)*(CK.R+10))return;
  var now=performance.now();
  ck.clicks=ck.clicks.filter(function(t){return now-t<1000});
  if(ck.clicks.length>=CK.CPS)return;               /* over 12 klik i sekundet tæller ikke */
  ck.clicks.push(now);
  ck.bank+=ck.per;ck.baked+=ck.per;ck.squash=1;
  ck.pops.push({x:x,y:y,v:ck.per,t:0});
  if(e.preventDefault)e.preventDefault();
}
function ckBuy(i){
  if(!ck.on||ck.bank<ck.price[i])return;
  ck.bank-=ck.price[i];ck.own[i]++;
  var it=CK.ITEMS[i];if(it.clk)ck.per+=it.clk;if(it.aut)ck.aut+=it.aut;
  ck.price[i]=Math.round(ck.price[i]*CK.GROW);
  ckShop();
}
function ckShop(){
  var box=document.getElementById("ckShop");if(!box)return;
  if(!document.getElementById("ckb0"))
    box.innerHTML=CK.ITEMS.map(function(it,i){
      return '<button class="ckitem" id="ckb'+i+'" onclick="ckBuy('+i+')" disabled><span class="ic">'+it.ic+'</span><b id="ckn'+i+'"></b>'+
             '<small>'+it.d+'</small><span class="cost" id="ckc'+i+'"></span></button>';
    }).join("");
  var sig=ck.on+"|"+Math.floor(ck.bank)+"|"+ck.own.join(",")+"|"+ck.price.join(",");
  if(box.dataset.sig===sig)return;box.dataset.sig=sig;
  CK.ITEMS.forEach(function(it,i){
    var b=document.getElementById("ckb"+i);if(!b)return;
    b.className="ckitem"+(ck.on&&ck.bank>=ck.price[i]?" can":"");b.disabled=!ck.on;
    setTxt("ckn"+i,it.n+(ck.own[i]?" ×"+ck.own[i]:""));setTxt("ckc"+i,"🍪 "+ck.price[i]);
  });
}
function ckDraw(){
  var cv=document.getElementById("cookieC");if(!cv)return;
  var cx=cv.getContext("2d"),W=CK.W,H=CK.H;
  var bg=cx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#ffe9c7");bg.addColorStop(1,"#f6c98f");
  cx.fillStyle=bg;cx.fillRect(0,0,W,H);
  var R=CK.R*(1-ck.squash*0.06);
  cx.save();cx.translate(CK.CX,CK.CY);
  cx.fillStyle="rgba(0,0,0,.12)";cx.beginPath();cx.ellipse(0,CK.R*0.98,CK.R*0.85,CK.R*0.16,0,0,Math.PI*2);cx.fill();
  cx.fillStyle="#c98a45";cx.beginPath();cx.arc(0,0,R,0,Math.PI*2);cx.fill();
  cx.fillStyle="#e2aa62";cx.beginPath();cx.arc(-R*0.08,-R*0.08,R*0.86,0,Math.PI*2);cx.fill();
  cx.fillStyle="#4a2511";
  CHIPS.forEach(function(c){cx.beginPath();cx.ellipse(c[0]*R,c[1]*R,R*0.09,R*0.065,c[2],0,Math.PI*2);cx.fill()});
  cx.restore();
  cx.textAlign="center";cx.textBaseline="middle";cx.font="900 20px Nunito, sans-serif";
  ck.pops.forEach(function(p){cx.globalAlpha=Math.max(0,1-p.t/0.8);cx.fillStyle="#7a3e0c";cx.fillText("+"+p.v,p.x,p.y-p.t*60)});
  cx.globalAlpha=1;
  cx.textAlign="left";cx.textBaseline="alphabetic";
  cx.fillStyle="#8a5a22";cx.font="900 12px Nunito, sans-serif";cx.fillText("SMÅKAGER AT BRUGE",430,84);
  cx.fillStyle="#5c3405";cx.font="700 40px Fredoka, sans-serif";cx.fillText("🍪 "+Math.floor(ck.bank),428,128);
  cx.fillStyle="#8a5a22";cx.font="900 13px Nunito, sans-serif";
  cx.fillText("PR. KLIK: "+ck.per+"   ·   PR. SEKUND: "+ck.aut,430,172);
  cx.fillText("BAGT I ALT: "+Math.floor(ck.baked)+"  →  "+ckPts()+" POINT"+(ckPts()>=6?" (MAKS)":""),430,200);
  cx.fillStyle=ck.on&&ck.time<=5?"#f2545b":"#5c3405";cx.font="700 30px Fredoka, sans-serif";
  cx.fillText("⏱ "+Math.ceil(ck.time)+"s",430,262);
  ckShop();
}
function ckEnd(quiet){
  if(!ck.on)return;
  ck.on=false;cancelAnimationFrame(ck.raf);
  var n=Math.floor(ck.baked),g=ckPts();
  setTxt("cTitle","🍪 Tiden er gået");setTxt("cText","Du bagte "+n+" småkager og fik "+g+" point.");
  setTxt("cBtn","Spil igen");document.getElementById("cOver").hidden=false;
  arcadeEnd("cookie",ck,n);
  if(!quiet)toast("🍪 Du fik "+g+" point",g>0?"win":"cool");
  ckDraw();
}
function drawCookiePage(){
  arcadePage("cookie","småkager","c");
  if(!ck.on){btnState("cBtn","cookie");ckDraw()}
}

/* ===================== LOTTERIET ===================== */
function lottoN(){var e=document.getElementById("lottoN"),n=parseInt(e&&e.value,10);return n>0?Math.min(100,n):1}
function lottoStep(d){var e=document.getElementById("lottoN");e.value=Math.max(1,Math.min(100,lottoN()+d));drawLottoPage()}
function lottoTotal(){var L=S.lotto,t=0;Object.keys(L.t).forEach(function(k){t+=L.t[k]});return t}
function drawLottoPage(){
  var L=S.lotto,p=me(),mine=p?(L.t[UI.me]||0):0,tot=lottoTotal(),n=lottoN(),left=L.max-mine;
  myBar("lottoMe",p?("🪙 "+p.coins+" mønter · du har "+mine+" af maks "+L.max+" lodder i denne runde"):null);
  setTxt("lPot",L.pot);
  var st="";
  if(!p)st="Vælg dig selv øverst for at være med.";
  else if(!gameOn("lotto"))st="🔒 Lotteriet er lukket af Oskar lige nu.";
  else if(isLocked())st="⏳ Spillene åbner "+openText()+".";
  else if(mine)st="Du har "+mine+" af "+tot+" lodder — "+Math.round(mine/tot*100)+" % chance for at vinde.";
  else st="Du har ingen lodder i denne runde endnu.";
  setTxt("lMine",st);
  var b=document.getElementById("lBtn");
  b.textContent="Køb "+n+" lod"+(n>1?"der":"")+" — "+n+" mønt"+(n>1?"er":"");
  b.disabled=!p||!gameOn("lotto")||isLocked()||p.coins<n||left<n;
  setTxt("lHint",p&&left<=0?"Du har købt det maksimale antal lodder i denne runde.":"Du kan købe op til "+L.max+" lodder pr. runde.");
  var ids=Object.keys(L.t).filter(function(k){return L.t[k]>0}).sort(function(a,c){return L.t[c]-L.t[a]});
  document.getElementById("lList").innerHTML=ids.length?ids.map(function(k){
    return '<div class="trow'+(+k===UI.me?" me":"")+'">'+pTag(k)+'<span class="tk">'+L.t[k]+' lod'+(L.t[k]>1?"der":"")+'</span>'+
           '<span class="pct">'+Math.round(L.t[k]/tot*100)+' %</span></div>';
  }).join(""):'<p class="hint" style="margin:0">Ingen har købt lodder i denne runde endnu.</p>';
  document.getElementById("lHist").innerHTML=L.hist.length?L.hist.map(function(h){
    return '<div class="trow">'+pTag(h.pi)+'<span>vandt <b>'+h.pot+' mønter</b> med '+h.tk+' af '+h.total+' lodder</span><span class="pct">'+dayTxt(h.d)+'</span></div>';
  }).join(""):'<p class="hint" style="margin:0">Der er ikke trukket nogen vinder endnu.</p>';
}
function lottoBuy(){
  if(!me()){openWho();return}
  var n=lottoN();
  send({type:"lottoBuy",pi:UI.me,n:n},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast("🎟️ Du købte "+n+" lod"+(n>1?"der":"")+" — puljen er "+r.pot+" mønter","win");
  });
}

/* ===================== STEN, SAKS, PAPIR ===================== */
var RPS={mv:""},RPSM={sten:"✊",saks:"✌️",papir:"✋"},RPSN={sten:"Sten",saks:"Saks",papir:"Papir"};
function rpsCode(){return UI.me>=0?lsGet("arena_rps_"+UI.me):null}
function rpsState(){var p=me();if(!p)return "none";if(!(S.codes||{})[UI.me])return "new";return rpsCode()?"ok":"enter"}
function drawRpsPage(){
  var p=me(),R2=S.rps,st=rpsState(),today=dkNow().d,open=(R2.open||[]).filter(function(c){return c.d>=today});
  myBar("rpsMe",p?("🪙 "+p.coins+" mønter · en kamp koster 1 mønt"):null);
  var cb=document.getElementById("rCode");
  if(cb.dataset.st!==st+":"+UI.me){
    cb.dataset.st=st+":"+UI.me;
    var inp='<div class="tipin"><input type="password" inputmode="numeric" maxlength="4" id="rCodeIn" placeholder="••••" autocomplete="off">';
    cb.innerHTML=st==="none"?'<div class="sent wait">Vælg dig selv øverst først.</div>':
      st==="new"?'<div class="codebox"><b>🔑 Vælg din personlige kode</b><p class="hint" style="margin:4px 0 8px">4 cifre. Den skal bruges, når du spiller her, så ingen andre kan spille om dine mønter. Den huskes på denne PC.</p>'+inp+'<button class="big sm" onclick="rpsSetCode()">Gem kode</button></div></div>':
      st==="enter"?'<div class="codebox"><b>🔑 Indtast din kode</b><p class="hint" style="margin:4px 0 8px">Den huskes på denne PC. Har du glemt den, kan Oskar nulstille den.</p>'+inp+'<button class="big sm" onclick="rpsEnterCode()">OK</button></div></div>':
      '<div class="sent">🔑 Din kode er gemt på denne PC. <a href="#" onclick="rpsForget();return false">Glem den her</a></div>';
  }
  var sel=document.getElementById("rTo"),sig=S.players.map(function(q){return q.icon+q.name}).join("|")+":"+UI.me;
  if(sel.dataset.sig!==sig&&document.activeElement!==sel){
    var keep=sel.value;sel.dataset.sig=sig;
    sel.innerHTML='<option value="-1">🎯 Hele holdet — den første, der svarer</option>'+
      S.players.map(function(q,i){return i===UI.me?"":'<option value="'+i+'">'+q.icon+' '+esc(q.name)+'</option>'}).join("");
    if(keep&&sel.querySelector&&sel.querySelector('option[value="'+keep+'"]'))sel.value=keep;
  }
  document.getElementById("rMoves").innerHTML=["sten","saks","papir"].map(function(m){
    return '<button class="mv'+(RPS.mv===m?" on":"")+'" onclick="rpsPick(\''+m+'\')">'+RPSM[m]+'<small>'+RPSN[m]+'</small></button>';
  }).join("");
  var can=p&&st==="ok"&&gameOn("rps")&&!isLocked()&&p.coins>=1;
  var sb=document.getElementById("rSend");sb.disabled=!can||!RPS.mv;
  setTxt("rState",!p?"":!gameOn("rps")?"🔒 Sten, saks, papir er lukket af Oskar lige nu.":isLocked()?"⏳ Spillene åbner "+openText()+".":p.coins<1?"Du har ingen mønter lige nu.":"");
  var inc=open.filter(function(c){return c.a!==UI.me&&(c.b===UI.me||c.b===-1)});
  document.getElementById("rIn").innerHTML=!p?'<p class="hint" style="margin:0">Vælg dig selv først.</p>':
    inc.length?inc.map(function(c){
      return '<div class="chal"><div>'+pTag(c.a)+'<div class="pmeta">'+(c.b===-1?"udfordrer hele holdet":"udfordrer dig")+' · '+tm(c.at)+'</div></div>'+
        '<div class="ans">'+["sten","saks","papir"].map(function(m){
          return '<button class="mv sm" title="'+RPSN[m]+'" onclick="rpsAnswer(\''+c.id+'\',\''+m+'\')"'+(can?"":" disabled")+'>'+RPSM[m]+'</button>';
        }).join("")+'</div></div>';
    }).join(""):'<p class="hint" style="margin:0">Ingen udfordringer til dig lige nu.</p>';
  var mine=open.filter(function(c){return c.a===UI.me});
  document.getElementById("rOut").innerHTML=mine.length?mine.map(function(c){
    return '<div class="chal"><div>Til '+(c.b===-1?'<b>hele holdet</b>':pTag(c.b))+'<div class="pmeta">sendt '+tm(c.at)+' · dit valg er hemmeligt</div></div>'+
      '<div class="ans"><button class="ghost mini" onclick="rpsCancel(\''+c.id+'\')">Træk tilbage</button></div></div>';
  }).join(""):'<p class="hint" style="margin:0">Du har ingen åbne udfordringer.</p>';
  document.getElementById("rHist").innerHTML=(R2.hist||[]).length?R2.hist.slice(0,10).map(function(h){
    return '<div class="trow">'+pTag(h.a)+' <span class="vs">'+RPSM[h.ma]+' – '+RPSM[h.mb]+'</span> '+pTag(h.b)+
      '<span class="pct">'+(h.w<0?"uafgjort":"🏆 "+pIco(h.w))+'</span></div>';
  }).join(""):'<p class="hint" style="margin:0">Ingen kampe endnu.</p>';
}
function rpsPick(m){RPS.mv=m;drawRpsPage()}
function rpsCodeIn(){var e=document.getElementById("rCodeIn"),c=String(e&&e.value||"").trim();
  if(!/^\d{4}$/.test(c)){toast("Koden skal være 4 cifre","bad");return null}return c}
function rpsSetCode(){var c=rpsCodeIn();if(!c)return;
  send({type:"rpsSetCode",pi:UI.me,code:c},function(r){if(r&&r.err){toast(r.err,"bad");return}
    lsSet("arena_rps_"+UI.me,c);toast("🔑 Din kode er gemt","cool");drawRpsPage()})}
function rpsEnterCode(){var c=rpsCodeIn();if(!c)return;
  send({type:"rpsCheck",pi:UI.me,code:c},function(r){
    if(r&&r.err){toast(r.err,"bad");var e=document.getElementById("rCodeIn");if(e)e.value="";return}
    lsSet("arena_rps_"+UI.me,c);toast("🔑 Koden er godkendt","cool");drawRpsPage()})}
function rpsForget(){lsDel("arena_rps_"+UI.me);drawRpsPage()}
function rpsFail(r){if(r.badCode||r.needCode)lsDel("arena_rps_"+UI.me);toast(r.err,"bad");drawRpsPage()}
function rpsChallenge(){
  if(!me()){openWho();return}
  if(!RPS.mv){toast("Vælg sten, saks eller papir","bad");return}
  var to=+document.getElementById("rTo").value,mv=RPS.mv;
  send({type:"rpsChallenge",pi:UI.me,code:rpsCode(),to:to,mv:mv},function(r){
    if(r&&r.err){rpsFail(r);return}
    RPS.mv="";toast("✊ Udfordringen er sendt — dit valg er hemmeligt","cool");drawRpsPage()})}
function rpsAnswer(id,m){
  send({type:"rpsAnswer",pi:UI.me,code:rpsCode(),id:id,mv:m},function(r){
    if(r&&r.err){rpsFail(r);return}
    var t=RPSM[r.mb]+" mod "+RPSM[r.ma]+" — ";
    if(r.you==="win"){toast(t+"du vandt og tog begge mønter! 🎉","win");burst(120)}
    else if(r.you==="lose")toast(t+"du tabte","bad");
    else toast(t+"uafgjort — du har fået mønten tilbage","cool")})}
function rpsCancel(id){
  send({type:"rpsCancel",pi:UI.me,code:rpsCode(),id:id},function(r){
    if(r&&r.err){rpsFail(r);return}
    toast("↩️ Udfordringen er trukket tilbage — du har fået mønten","cool")})}

/* ===================== SALGSTIPPET ===================== */
function tipKey(d){return "arena_tip_"+d+"_"+UI.me}
function tipMine(d){try{return JSON.parse(lsGet(tipKey(d))||"null")}catch(e){return null}}
function tipLeft(min){return min>=60?Math.floor(min/60)+"t "+(min%60)+"m":min+" min"}
function tipWinners(r,res){
  var ids=Object.keys(r.tips||{}),best=Infinity,win=[];
  if((r.f||0)>0&&res<r.f)return {miss:true,win:[],each:0,rest:r.pot};
  ids.forEach(function(k){var d=Math.abs(r.tips[k]-res);if(d<best){best=d;win=[k]}else if(d===best)win.push(k)});
  var each=win.length?Math.floor(r.pot/win.length):0;
  return {miss:false,win:win,each:each,rest:r.pot-each*win.length};
}
function tipChips(r){
  var ids=Object.keys(r.tips||{}).sort(function(a,b){return r.tips[a]-r.tips[b]});
  return ids.map(function(k){return '<span class="pv'+(+k===UI.me?" mine":"")+'">'+pIco(k)+' '+pNm(k)+' <b>'+r.tips[k]+'</b></span>'}).join("");
}
function drawTipPage(){
  var T=S.tip,p=me(),now=dkNow(),open=now.m<T.dl,r=T.rounds.filter(function(x){return x.d===now.d})[0];
  myBar("tipMe",p?("🪙 "+p.coins+" mønter · ét tip pr. dag koster 1 mønt"):null);
  setTxt("tQ","Hvor mange salg laver holdet i dag, "+dayTxt(now.d)+"? Tip inden kl. "+hm(T.dl)+".");
  var pot=r?r.pot:(T.carry||0),carry=r?(r.c||0):(T.carry||0);
  setTxt("tPot",pot);
  setTxt("tPotSub","mønter · "+(r?r.n+" har tippet":"ingen har tippet endnu")+(carry?" · "+carry+" fra sidst":""));
  setTxt("tClock",open&&!(r&&!r.seal)?"⏰ Lukker om "+tipLeft(T.dl-now.m)+" (kl. "+hm(T.dl)+")":"⏰ Lukket for i dag — tip igen i morgen");
  var mine=r&&r.seal&&r.seal[UI.me]!=null,loc=tipMine(now.d),msg="",form=false,btn=document.getElementById("tBtn");
  if(!p)msg='<div class="sent wait">Vælg dig selv øverst først.</div>';
  else if(p.admin)msg='<div class="sent wait">👑 Du taster holdets resultat i Admin, så du kan ikke selv tippe.</div>';
  else if(!gameOn("tip"))msg='<div class="sent wait">🔒 Salgstippet er lukket af Oskar lige nu.</div>';
  else if(isLocked())msg='<div class="sent wait">⏳ Spillene åbner '+openText()+'.</div>';
  else if(!open||(r&&!r.seal)){var t=r&&r.tips&&r.tips[UI.me]!=null?r.tips[UI.me]:null;
    msg='<div class="sent wait">Tippet lukkede kl. '+hm(T.dl)+'.'+(t!=null?' Dit tip var <b>'+t+'</b>.':' Tip igen i morgen.')+'</div>'}
  else if(mine&&loc){msg='<div class="sent">✅ Dit tip: <b>'+loc.n+'</b> salg. Du kan rette det indtil kl. '+hm(T.dl)+' uden at betale igen.</div>';form=true;btn.textContent="Ret mit tip"}
  else if(mine)msg='<div class="sent">✅ Du har tippet i dag. Tippet kan kun rettes fra den PC, du tippede fra.</div>';
  else{form=true;btn.textContent="Tip — 1 mønt";
    var fl=r?(r.f||0):(T.floor||0);if(fl)msg='<p class="hint" style="margin:6px 0 0">Mindst '+fl+' salg (holdets bundgrænse).</p>'}
  document.getElementById("tRow").style.display=form?"":"none";
  var stE=document.getElementById("tState");if(stE.dataset.h!==msg){stE.dataset.h=msg;stE.innerHTML=msg}
  if(form)btn.disabled=!(mine||p.coins>=1);
  var h="";
  if(r&&r.seal){
    h+='<div class="tround"><div class="trhead"><b>I dag, '+dayTxt(r.d)+'</b><span class="pmeta">tallene er hemmelige indtil kl. '+hm(T.dl)+'</span></div>'+
       '<div class="ochips" style="margin-top:8px">'+Object.keys(r.seal).map(function(k){return '<span class="pv">'+pIco(k)+' '+pNm(k)+' ✔</span>'}).join("")+'</div></div>';
  }
  T.rounds.filter(function(x){return !x.seal}).sort(function(a,b){return a.d<b.d?1:-1}).forEach(function(x){
    h+='<div class="tround"><div class="trhead"><b>'+dayTxt(x.d)+'</b><span class="pcoins">🪙 '+x.pot+'</span><span class="pmeta">venter på Oskars resultat</span></div>'+
       '<div class="ochips" style="margin-top:8px">'+tipChips(x)+'</div></div>';
  });
  document.getElementById("tList").innerHTML=h||'<p class="hint" style="margin:0">Ingen har tippet endnu i dag.</p>';
  document.getElementById("tHist").innerHTML=T.hist.length?T.hist.map(function(x){
    var w=x.miss?'nåede ikke bundgrænsen på '+x.f+' — '+x.pot+' mønter gik videre':!x.win.length?'ingen vinder — puljen gik videre':
      x.win.map(function(k){return pTag(k)+' ('+(x.tips[k])+')'}).join(" og ")+' vandt '+x.each+' mønter'+(x.win.length>1?' hver':'');
    return '<div class="trow"><span><b>'+dayTxt(x.d)+'</b>: holdet lavede <b>'+x.res+'</b> salg — '+w+'</span></div>';
  }).join(""):'<p class="hint" style="margin:0">Ingen afgjorte runder endnu.</p>';
}
function tipSet(){
  if(!me()){openWho();return}
  var e=document.getElementById("tN"),v=String(e.value).trim(),d=dkNow().d,loc=tipMine(d);
  if(v===""){toast("Skriv dit tip først","bad");return}
  send({type:"tipSet",pi:UI.me,n:v,k:loc?loc.k:""},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    lsSet(tipKey(d),JSON.stringify({n:r.n,k:r.k}));e.value="";
    toast(r.changed?"📊 Dit tip er rettet til "+r.n:"📊 Dit tip på "+r.n+" salg er afgivet","win");drawTipPage();
  });
}

/* ===================== ADMIN — NYE SPIL ===================== */
function drawNewAdmin(){
  [["tipAdm",drawTipAdmin],["lottoAdm",drawLottoAdmin],["rpsAdm",drawRpsAdmin]].forEach(function(x){
    var e=document.getElementById(x[0]);if(e&&!e.contains(document.activeElement))x[1]();
  });
}
function drawTipAdmin(){
  var T=S.tip,h='<h3>📊 Salgstippet</h3><div class="exrow"><label>Frist <input type="time" id="tDl" value="'+hm(T.dl).replace(".",":")+'"></label>'+
    '<label>Bundgrænse <input type="number" id="tFloor" min="0" value="'+(T.floor||0)+'"></label><button class="big sm grn" onclick="tipCfgSave()">💾 Gem</button></div>'+
    '<p class="hint" style="margin:6px 0 4px">Bundgrænse = laveste tip, man må give, fx holdets dagsmål. Når holdet ikke når den, går puljen videre til næste runde. 0 = ingen bundgrænse. En ny bundgrænse gælder fra næste runde.</p>';
  var rounds=T.rounds.slice().sort(function(a,b){return a.d<b.d?-1:1});
  if(!rounds.length)h+='<p class="hint" style="margin:8px 0 0">Ingen runder venter på et resultat.'+(T.carry?' '+T.carry+' mønt'+(T.carry>1?'er':'')+' ligger klar til næste pulje.':'')+'</p>';
  rounds.forEach(function(r){
    h+='<div class="tround"><div class="trhead"><b>'+dayTxt(r.d)+'</b><span class="pcoins">🪙 '+r.pot+'</span><span class="pmeta">'+r.n+' tip'+(r.f?' · bundgrænse '+r.f:'')+'</span></div>';
    if(r.seal)h+='<p class="hint" style="margin:6px 0 0">Tippene er hemmelige indtil kl. '+hm(T.dl)+'. Bagefter kan du taste holdets resultat her.</p>';
    else h+='<div class="ochips" style="margin:8px 0">'+tipChips(r)+'</div>'+
      '<div class="exrow"><label>Holdets salg '+dayTxt(r.d)+' <input type="number" min="0" id="tRes_'+r.d+'" oninput="tipPreview(\''+r.d+'\')"></label>'+
      '<button class="big sm grn" onclick="tipResult(\''+r.d+'\')">🪙 Udbetal</button><button class="ghost warn" onclick="tipCancel(\''+r.d+'\')">Annullér runden</button></div>'+
      '<div class="sample" id="tPrev_'+r.d+'" style="display:none"></div>';
    h+='</div>';
  });
  document.getElementById("tipAdm").innerHTML=h;
}
function tipRound(d){return S.tip.rounds.filter(function(x){return x.d===d})[0]}
function tipPreview(d){
  var r=tipRound(d),e=document.getElementById("tRes_"+d),box=document.getElementById("tPrev_"+d);
  if(!r||!e||!box)return;
  if(e.value===""){box.style.display="none";return}
  var w=tipWinners(r,Math.round(+e.value));box.style.display="";
  box.innerHTML=w.miss?"Holdet nåede ikke bundgrænsen på "+r.f+" — puljen på "+r.pot+" mønter går videre.":
    !w.win.length?"Ingen tip — puljen går videre.":
    w.win.map(function(k){return pIco(k)+" "+pNm(k)+" ("+r.tips[k]+")"}).join(" og ")+(w.win.length>1?" deler puljen og får ":" vinder ")+
    w.each+" mønter"+(w.win.length>1?" hver":"")+(w.rest?" · "+w.rest+" går videre til næste pulje":"")+".";
}
function tipResult(d){
  var e=document.getElementById("tRes_"+d),r=tipRound(d);
  if(!r||!e||e.value===""){toast("Skriv holdets resultat først","bad");return}
  var res=Math.round(+e.value),w=tipWinners(r,res);
  var q=w.miss?"Holdet nåede ikke bundgrænsen — puljen går videre.":!w.win.length?"Ingen tip — puljen går videre.":
    w.win.map(function(k){return S.players[k]?S.players[k].name:"?"}).join(" og ")+" får "+w.each+" mønter"+(w.win.length>1?" hver":"")+".";
  if(!confirm("Holdets salg "+dayTxt(d)+": "+res+"\n\n"+q+"\n\nUdbetal nu?"))return;
  send({type:"tipResult",by:UI.me,pin:UI.pin,d:d,res:res},function(r2){
    if(r2&&r2.err){toast(r2.err,"bad");return}
    if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    toast("📊 Salgstippet er afgjort","win");burst(110);render();
  });
}
function tipCancel(d){
  if(!confirm("Annullér Salgstippet for "+dayTxt(d)+"?\n\nAlle, der har tippet, får deres mønt tilbage."))return;
  send({type:"tipCancel",by:UI.me,pin:UI.pin,d:d},function(r){if(r&&r.err){toast(r.err,"bad");return}toast("↩️ Runden er annulleret","cool")});
}
function tipCfgSave(){
  send({type:"tipCfg",by:UI.me,pin:UI.pin,dl:document.getElementById("tDl").value,floor:document.getElementById("tFloor").value},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    toast("📊 Salgstippet er gemt","win");render();
  });
}
function drawLottoAdmin(){
  var L=S.lotto,tot=lottoTotal(),ids=Object.keys(L.t).filter(function(k){return L.t[k]>0}).sort(function(a,b){return L.t[b]-L.t[a]});
  document.getElementById("lottoAdm").innerHTML='<h3>🎟️ Lotteriet</h3><p class="hint" style="margin:0 0 10px">Puljen er <b>'+L.pot+' mønter</b> · '+tot+' lodder · '+ids.length+' deltagere.</p>'+
    (ids.length?'<div class="ochips" style="margin-bottom:10px">'+ids.map(function(k){return '<span class="pv">'+pIco(k)+' '+pNm(k)+' <b>'+L.t[k]+'</b></span>'}).join("")+'</div>':'')+
    '<div class="exrow"><label>Maks lodder pr. person pr. runde <input type="number" id="lMax" min="1" max="100" value="'+L.max+'"></label>'+
    '<button class="ghost" onclick="lottoSave()">💾 Gem</button><button class="big sm grn" style="margin-left:auto" onclick="lottoDraw()"'+(tot?'':' disabled')+'>🎲 Træk vinder</button></div>'+
    (L.last?'<p class="hint">Sidst: '+pIco(L.last.pi)+' '+pNm(L.last.pi)+' vandt '+L.last.pot+' mønter ('+dayTxt(L.last.d)+').</p>':'');
}
function lottoSave(){
  send({type:"lottoSave",by:UI.me,pin:UI.pin,max:document.getElementById("lMax").value},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    toast("🎟️ Lotteriet er gemt","win");render();
  });
}
function lottoDraw(){
  var L=S.lotto;if(!lottoTotal())return;
  if(!confirm("Træk vinderen af Lotteriet nu?\n\nPuljen er "+L.pot+" mønter."))return;
  send({type:"lottoDraw",by:UI.me,pin:UI.pin},function(r){
    if(r&&r.err){toast(r.err,"bad");return}
    toast("🎟️ "+r.icon+" "+r.name+" vandt "+r.pot+" mønter!","win");burst(260);
  });
}
function drawRpsAdmin(){
  var codes=S.codes||{},ids=Object.keys(codes),miss=S.players.map(function(q,i){return codes[i]?"":esc(q.name)}).filter(function(x){return x});
  document.getElementById("rpsAdm").innerHTML='<h3>✊ Sten, saks, papir</h3><p class="hint" style="margin:0 0 10px">'+
    (S.rps.open||[]).length+' åbne udfordringer · '+ids.length+' af '+S.players.length+' har valgt en kode.'+(miss.length?' Mangler: '+miss.join(", ")+'.':'')+'</p>'+
    '<div class="exrow"><label>Nulstil koden for <select id="rReset" class="sel" style="width:auto">'+
    ids.map(function(k){return '<option value="'+k+'">'+pIco(k)+' '+pNm(k)+'</option>'}).join("")+'</select></label>'+
    '<button class="ghost warn" onclick="rpsResetCode()"'+(ids.length?'':' disabled')+'>🔑 Nulstil kode</button></div>'+
    '<p class="hint">Bruges, hvis nogen har glemt sin kode — eller hvis en anden har valgt kode i deres navn. Spilleren vælger så en ny kode næste gang.</p>';
}
function rpsResetCode(){
  var e=document.getElementById("rReset");if(!e||e.value==="")return;
  var q=S.players[+e.value];if(!confirm("Nulstil koden til Sten, saks, papir for "+(q?q.name:"?")+"?"))return;
  send({type:"rpsResetCode",by:UI.me,pin:UI.pin,pi:+e.value},function(r){if(r&&r.err){toast(r.err,"bad");return}toast("🔑 Koden for "+r.name+" er nulstillet","cool")});
}

/* tekst til kortene i Spillehallen */
function coinSub(id){
  var p=me(),now=dkNow();
  if(id==="lotto"){var L=S.lotto,m=p?(L.t[UI.me]||0):0;return "Pulje: "+L.pot+" mønter"+(m?" · du har "+m+" lod"+(m>1?"der":""):"")}
  if(id==="rps"){
    var o=(S.rps.open||[]).filter(function(c){return c.d>=now.d}),n=o.filter(function(c){return c.a!==UI.me&&(c.b===UI.me||c.b===-1)}).length;
    return o.length?o.length+" åben"+(o.length>1?"e":"")+" udfordring"+(o.length>1?"er":"")+(n?" · "+n+" til dig":""):"Ingen åbne udfordringer";
  }
  if(id==="tip"){var T=S.tip,r=T.rounds.filter(function(x){return x.d===now.d})[0];
    return now.m<T.dl&&!(r&&!r.seal)?"Lukker kl. "+hm(T.dl)+" · pulje "+(r?r.pot:(T.carry||0))+" mønter":"Lukket for i dag — tip igen i morgen"}
  return "";
}

/* oprydning: beder serveren afsløre tip efter fristen og give mønter tilbage for udløbne udfordringer */
var HK={last:0};
function needTick(){
  var now=dkNow(),T=S.tip||{rounds:[]},dl=T.dl||600;
  var a=(T.rounds||[]).some(function(r){return r.seal&&(r.d<now.d||(r.d===now.d&&now.m>=dl))});
  var b=((S.rps||{}).open||[]).some(function(c){return c.d<now.d});
  return a||b;
}
setInterval(function(){
  if(typeof booted==="undefined"||!booted||UI.mode!=="live"||UI.busy||busyGame())return;
  if(UI.view==="tip"||UI.view==="games")render();       /* hold nedtællingen frisk */
  if(Date.now()-HK.last<30000||!needTick())return;
  HK.last=Date.now();
  setTimeout(function(){if(UI.mode==="live"&&needTick())send({type:"tick"})},Math.random()*4000);
},15000);

/* styring */
document.addEventListener("keydown",function(e){
  var pm=document.getElementById("pinModal"),wm=document.getElementById("whoModal");
  if((pm&&!pm.hidden)||(wm&&!wm.hidden))return;
  var tg=e.target&&e.target.tagName;if(tg==="INPUT"||tg==="TEXTAREA"||tg==="SELECT")return;
  var k=e.key;
  if(UI.view==="fly"&&fly.on&&(k===" "||e.code==="Space"||k==="ArrowUp"||k==="w"||k==="W")){if(!e.repeat)flyFlap();e.preventDefault();return}
  if(UI.view==="road"&&road.on){
    var m={ArrowUp:[0,1],w:[0,1],W:[0,1],ArrowDown:[0,-1],s:[0,-1],S:[0,-1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]}[k];
    if(m){if(!e.repeat)roadMove(m[0],m[1]);e.preventDefault()}
  }
});
document.getElementById("flyC").addEventListener("pointerdown",function(e){if(fly.on){flyFlap();e.preventDefault()}});
document.getElementById("cookieC").addEventListener("pointerdown",ckClick);
