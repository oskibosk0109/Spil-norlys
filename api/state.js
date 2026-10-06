/* Vercel Serverless Function — delt tilstand for Slik-Arenaen
 * Ligger i repoet som:  api/state.js
 */
import crypto from "node:crypto";
const KEY = "arena:state";
const ENV = process.env;
const findEnv = (suf) => ENV["KV" + suf] ||
  Object.keys(ENV).filter((k) => k.endsWith(suf)).map((k) => ENV[k])[0];
const URL_  = findEnv("_REST_API_URL")   || ENV.UPSTASH_REDIS_REST_URL;
const TOKEN = findEnv("_REST_API_TOKEN") || ENV.UPSTASH_REDIS_REST_TOKEN;
const PIN   = String(ENV.ADMIN_PIN || "2731");

const ICONS = ["🦊","🐼","🐯","🐸","🦁","🐵","🐨","🦄","🐙","🐝","🦖","🐳","🦉","🐶","🐱"];
const COLORS = ["#ffd166","#7ee0b0","#ff9ec7","#8fd0ff","#ffb37a","#c4b5fd","#7fe3e8","#ffa3a3",
                "#ffe08a","#a8eec0","#f5b8f0","#9ed7ff","#ffc2cd","#bdf0c4","#d4c9fb"];
const NAMES = ["Oskar","Victoria H.","Nilaus","Anissa","Christoffer","Rafael","Victoria M.",
               "Altin","Amir","Faizan","Angelica"];
const N = 96;

const DEFAULT_SHOP = [
  { id:"sodavand", ic:"🥤", n:"Sodavand",    d:"Kold sodavand efter eget valg.",        c:45,  out:false },
  { id:"flode",    ic:"🍫", n:"Flødeboller", d:"To stk. flødeboller.",                  c:60,  out:false },
  { id:"slik",     ic:"🍬", n:"Slikpose",    d:"Bland selv fra skålen.",                c:72,  out:false },
  { id:"energi",   ic:"⚡", n:"Energidrik",  d:"Til den sene eftermiddag.",             c:85,  out:false },
  { id:"oreo",     ic:"🍪", n:"Oreo",        d:"Pakke Oreo-kiks fra kiosken.",          c:100, out:false },
  { id:"toffee",   ic:"🍮", n:"Toffee Fee",  d:"Håndfuld Toffee Fee — den seje slags.", c:120, out:false }
];
const DEFAULT_EX = { on:true, sell:2, buy:5 };
const DEFAULT_GAMES = [
  { id:"mine", on:true, cap:15 }, { id:"tetris", on:true, cap:12 }, { id:"wheel", on:true, cap:15 },
  { id:"shoot", on:true, cap:12 }, { id:"stack", on:true, cap:12 }, { id:"dig", on:true, cap:12 },
  /* nye spil (okt. 2026) — de tre sidste flytter kun mønter mellem spillerne og har ingen pointgrænse */
  { id:"fly", on:true, cap:12 }, { id:"road", on:true, cap:12 }, { id:"cookie", on:true, cap:12 },
  { id:"lotto", on:true, cap:0 }, { id:"rps", on:true, cap:0 }, { id:"tip", on:true, cap:0 }
];
/* ---------- MØNTREGLER (redigerbare i Admin) ---------- */
const DEFAULT_RULES = {
  sales: [ { id:"salg", n:"Salg", c:1, on:true } ],   /* c = mønter pr. stk, må være decimal */
  csatPer: 2,  csatCoins: 1,     /* hver csatPer. 5-stjernede CSAT giver csatCoins */
  kptMin: 6.8, kptCoins: 1,      /* KPT over kptMin */
  wrapMax: 60, wrapCoins: 1,     /* wrap up under wrapMax sek */
  confMin: 80, confCoins: 1,     /* conformance over confMin % */
  streakDays: 3, streakCoins: 2, /* hver streakDays. dag i træk med KPT over grænsen */
  heat: ""                       /* valgfri tekst, vises som banner */
};
const GAME_NAMES = { mine:"Minefeltet", tetris:"Tetris", wheel:"Lykkehjulet",
                     shoot:"Skydeteltet", stack:"Stabelspillet", dig:"Guldgraveren",
                     fly:"Flødebolle-flyveren", road:"Over vejen", cookie:"Småkage-klikkeren",
                     lotto:"Lotteriet", rps:"Sten, saks, papir", tip:"Salgstippet" };

async function redis(cmd) {
  const r = await fetch(URL_, { method:"POST",
    headers:{ authorization:`Bearer ${TOKEN}`, "content-type":"application/json" },
    body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).result;
}
const rGet = () => redis(["GET", KEY]);
const rSet = (v) => redis(["SET", KEY, v]);
const lock = (id) => redis(["SET", KEY + ":lock", id, "NX", "PX", "4000"]);
const unlock = () => redis(["DEL", KEY + ":lock"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));
function today(){ return new Date(Date.now() + 2*3600*1000).toISOString().slice(0,10); }

function buildField() {
  const f = [];
  for (let i=0;i<10;i++) f.push({t:"mine",v:-3});
  for (let i=0;i<3;i++)  f.push({t:"mine",v:-6});
  for (let i=0;i<20;i++) f.push({t:"candy",v:2});
  for (let i=0;i<16;i++) f.push({t:"pts",v:3});
  for (let i=0;i<11;i++) f.push({t:"pts",v:5});
  for (let i=0;i<4;i++)  f.push({t:"jack",v:14});
  for (let i=0;i<5;i++)  f.push({t:"safe",v:0});
  for (let i=0;i<6;i++)  f.push({t:"spin",v:0});
  while (f.length < N) f.push({t:"dud",v:0});
  for (let i=f.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[f[i],f[j]]=[f[j],f[i]]}
  return f.map((c) => ({ ...c, open:false, by:null }));
}
function mkPlayers(old) {
  const src = old || NAMES.map((n) => ({ name:n }));
  return src.map((o,i) => ({
    name:o.name, coins:0, pts:0, shield:false, streak:0, freeSpin:0,
    admin: o.admin != null ? o.admin : o.name === "Oskar",
    badges:[], bought:[], used:{},
    color:o.color || COLORS[i%COLORS.length], icon:o.icon || ICONS[i%ICONS.length]
  }));
}
function fresh(old, season, keep) {
  keep = keep || {};
  return {
    field:buildField(), players:mkPlayers(old), log:[], last:-1,
    season:season||1, best:{wheel:0,shoot:0,stack:0,dig:0,tetris:0},
    spins:0, openAt:null, pending:[],
    shop: keep.shop || clone(DEFAULT_SHOP),
    ex: keep.ex || { ...DEFAULT_EX },
    games: keep.games || clone(DEFAULT_GAMES),
    rules: keep.rules || clone(DEFAULT_RULES)
  };
}
function upgrade(s) {
  if (!s.pending) s.pending = [];
  if (!Array.isArray(s.shop) || !s.shop.length) s.shop = clone(DEFAULT_SHOP);
  if (!s.ex) s.ex = { ...DEFAULT_EX };
  if (!Array.isArray(s.games) || !s.games.length) s.games = clone(DEFAULT_GAMES);
  else DEFAULT_GAMES.forEach(g => { if (!s.games.find(x => x.id === g.id)) s.games.push({ ...g }); });
  if (!s.rules) s.rules = clone(DEFAULT_RULES);
  Object.keys(DEFAULT_RULES).forEach(k => { if (s.rules[k] == null) s.rules[k] = clone(DEFAULT_RULES[k]); });
  if (!Array.isArray(s.rules.sales) || !s.rules.sales.length) s.rules.sales = clone(DEFAULT_RULES.sales);
  /* nye spil (okt. 2026) */
  if (!s.lotto) s.lotto = { t:{}, pot:0, max:10, round:1, last:null, hist:[] };
  if (!s.tip) s.tip = { dl:600, floor:0, carry:0, rounds:[], hist:[] };
  if (!s.rps) s.rps = { open:[], hist:[] };
  if (!s.codes) s.codes = {};
  if (!s.rec) s.rec = {};
  s.players.forEach(p => { if (!p.used) p.used = {}; });
  return s;
}

/* ---------- MØNTBEREGNING — samme funktion findes i core.js ---------- */
function salesCount(r, id, R) {
  if (r.sales && r.sales[id] != null) return Math.max(0, +r.sales[id] || 0);
  /* gamle indsendelser har kun ét samlet salgstal — det tæller som første salgstype */
  if (!r.sales && r.salg && R.sales[0] && R.sales[0].id === id) return Math.max(0, +r.salg || 0);
  return 0;
}
function breakdown(p, r, R) {
  const parts = []; let sum = 0;
  R.sales.forEach(t => {
    if (!t.on) return;
    const k = salesCount(r, t.id, R);
    if (k > 0 && t.c > 0) { sum += k * t.c; parts.push({ l: k + " × " + t.n, v: k * t.c }); }
  });
  const salesCoins = Math.floor(sum + 1e-9);
  let n = salesCoins;
  const csat = +r.csat || 0, kpt = +r.kpt || 0, wrap = +r.wrap || 0, conf = +r.conf || 0;
  if (R.csatPer > 0 && csat >= R.csatPer) {
    const c = Math.floor(csat / R.csatPer) * R.csatCoins;
    if (c) { n += c; parts.push({ l: csat + " × 5-stjernet CSAT", v: c }); }
  }
  const kptOk = kpt > R.kptMin;
  if (kptOk && R.kptCoins) { n += R.kptCoins; parts.push({ l: "KPT over " + R.kptMin, v: R.kptCoins }); }
  if (wrap > 0 && wrap < R.wrapMax && R.wrapCoins) { n += R.wrapCoins; parts.push({ l: "Wrap up under " + R.wrapMax + " sek", v: R.wrapCoins }); }
  if (conf > R.confMin && R.confCoins) { n += R.confCoins; parts.push({ l: "Conformance over " + R.confMin + " %", v: R.confCoins }); }
  if (kptOk && R.streakDays > 0 && ((p.streak || 0) + 1) % R.streakDays === 0 && R.streakCoins) {
    n += R.streakCoins; parts.push({ l: R.streakDays + " dage i streak", v: R.streakCoins });
  }
  return { n, parts, kptOk, salesRaw: sum };
}

function gameCfg(s, id) { return s.games.find(g => g.id === id) || { id, on:true, cap:0 }; }
function usedToday(p, id) { const u = p.used && p.used[id]; return (u && u.d === today()) ? (u.p || 0) : 0; }
function addUsed(p, id, n) { if (!p.used) p.used = {}; p.used[id] = { d: today(), p: usedToday(p, id) + n }; }
function capLeft(s, p, id) { const g = gameCfg(s, id); return g.cap ? Math.max(0, g.cap - usedToday(p, id)) : Infinity; }

function logIt(s,m){ s.log.unshift(m); if (s.log.length>80) s.log.pop(); }
function badge(p,k){ if (p.badges.indexOf(k)<0) p.badges.push(k); }
function addPts(p,n){ p.pts = Math.max(0, p.pts+n); if (p.pts>=50) badge(p,"rich"); }
function isAdmin(s,by,pin){ const q = by!=null ? s.players[by] : null;
  return !!(q && q.admin && String(pin||"") === PIN); }
function locked(s){ return !!(s.openAt && Date.now() < Date.parse(s.openAt)); }
function openText(s){
  if (!s.openAt) return "";
  const d = new Date(s.openAt);
  const dg = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
  return dg[d.getDay()]+" kl. "+String(d.getHours()).padStart(2,"0")+"."+String(d.getMinutes()).padStart(2,"0");
}
function cleanRow(r) {
  const sales = {};
  if (r && r.sales && typeof r.sales === "object")
    Object.keys(r.sales).slice(0, 30).forEach(k => { const v = +r.sales[k] || 0; if (v > 0) sales[String(k).slice(0,40)] = Math.min(999, v); });
  const out = { sales, csat:+r.csat||0, kpt:+r.kpt||0, wrap:+r.wrap||0, conf:+r.conf||0 };
  if (!Object.keys(sales).length && r.salg) out.salg = +r.salg || 0;
  return out;
}
function rowEmpty(r){ return !Object.keys(r.sales||{}).length && !r.salg && !r.csat && !r.kpt && !r.wrap && !r.conf; }
function rowText(r, R) {
  const bits = [];
  R.sales.forEach(t => { const k = salesCount(r, t.id, R); if (k) bits.push(k + " " + t.n.toLowerCase()); });
  if (r.csat) bits.push(r.csat + " CSAT-femmere");
  if (r.kpt) bits.push("KPT " + r.kpt);
  if (r.wrap) bits.push("wrap " + r.wrap + "s");
  if (r.conf) bits.push("conf " + r.conf + "%");
  return bits.join(", ");
}
function grant(s, pi, r) {
  const q = s.players[pi]; if (!q) return 0;
  const R = s.rules, b = breakdown(q, r, R);
  if (b.kptOk) { q.streak++; if (q.streak >= R.streakDays) badge(q, "streak"); }
  else if (!rowEmpty(r)) q.streak = 0;
  if (b.n > 0) {
    q.coins += b.n;
    logIt(s, `${q.icon} <b>${q.name}</b> fik ${b.n} mønter (${rowText(r, R)})`);
  }
  return b.n;
}
const clean=(v,max)=>String(v==null?"":v).replace(/[<>]/g,"").trim().slice(0,max);
const int=(v,lo,hi)=>{const n=Math.round(Number(v));return isFinite(n)?Math.min(hi,Math.max(lo,n)):lo};
const num=(v,lo,hi)=>{const n=Number(String(v).replace(",","."));return isFinite(n)?Math.min(hi,Math.max(lo,Math.round(n*100)/100)):lo};
const DENY={err:"Forkert kode — kun Oskar har adgang"};

function apply(s,a){
  upgrade(s);
  const P=s.players;
  const p = a.pi!=null && P[a.pi] ? P[a.pi] : null;
  if (NEW_ACTIONS[a.type]) return applyNew(s, a, P, p);   /* de nye spil (okt. 2026) */

  switch(a.type){
    case "adminLogin": {
      const q = a.pi!=null ? P[a.pi] : null;
      if (!q || !q.admin) return { err:"Denne bruger har ikke admin" };
      if (String(a.pin||"") !== PIN) return { err:"Forkert kode" };
      return { ok:true };
    }
    case "tap": {
      if (!p) return { err:"Ukendt spiller" };
      if (locked(s)) return { err:"Spillene åbner "+openText(s)+" — saml mønter indtil da!" };
      const g = gameCfg(s,"mine");
      if (!g.on) return { err:"Minefeltet er lukket lige nu" };
      const left = capLeft(s,p,"mine");
      if (left <= 0) return { err:"Du har nået dagens grænse i Minefeltet ("+g.cap+" point)" };
      const c = s.field[a.idx];
      if (!c) return { err:"Ukendt felt" };
      if (c.open) return { err:"Feltet er allerede taget", taken:true };
      if (p.coins < 1) return { err:"Du har ingen mønter tilbage" };
      p.coins--; c.open=true; c.by=a.pi; s.last=a.idx;
      if (s.field.filter(x=>x.open).length===1) badge(p,"first");
      const nm=`${p.icon} <b>${p.name}</b>`;
      const r={kind:c.t,v:c.v};
      const give=(raw)=>{ const n=Math.min(raw,left); if(n>0)addUsed(p,"mine",n); addPts(p,n); r.v=n; if(n<raw) r.capped=true; };
      if (c.t==="candy"){ give(2); logIt(s,`${nm} fandt 🍬 slik (felt ${a.idx+1})`); }
      else if (c.t==="pts"){ give(c.v); logIt(s,`${nm} fandt ⭐ ${r.v} point (felt ${a.idx+1})`); }
      else if (c.t==="jack"){ give(c.v); badge(p,"jack"); logIt(s,`${nm} ramte 🏆 JACKPOT (felt ${a.idx+1})`); }
      else if (c.t==="safe"){ p.shield=true; logIt(s,`${nm} fandt 🛡️ skjold`); }
      else if (c.t==="spin"){ p.freeSpin++; logIt(s,`${nm} fandt 🎡 gratis spin`); }
      else if (c.t==="mine"){
        if (p.shield){ p.shield=false; badge(p,"survivor"); r.saved=true; logIt(s,`${nm} ramte 💥 — skjoldet holdt!`); }
        else { addPts(p,c.v); badge(p,"boom"); logIt(s,`${nm} sprang på 💥 (${c.v} point)`); }
      } else logIt(s,`${nm} åbnede et tomt felt ${a.idx+1}`);
      return r;
    }
    case "spend": {
      if (!p) return { err:"Ukendt spiller" };
      if (locked(s)) return { err:"Spillene åbner "+openText(s)+" — saml mønter indtil da!" };
      const g = gameCfg(s, a.game);
      if (!g.on) return { err:(GAME_NAMES[a.game]||"Spillet")+" er lukket lige nu" };
      if (capLeft(s,p,a.game) <= 0)
        return { err:"Du har nået dagens grænse i "+(GAME_NAMES[a.game]||"spillet")+" ("+g.cap+" point)" };
      if (a.free && p.freeSpin > 0){ p.freeSpin--; return { free:true }; }
      if (p.coins < 1) return { err:"Du har ingen mønter tilbage" };
      p.coins--; if (a.game === "wheel") s.spins++;
      if (NEWARC[a.game]) { p.tk = { g:a.game, id:rid() }; return { ok:true, tk:p.tk.id }; }
      return { ok:true };
    }
    case "score": {
      if (!p) return { err:"Ukendt spiller" };
      if (NEWARC[a.game]) return arcadeScore(s, p, a);
      let want = a.pts || 0, capped = false;
      if (a.game && want > 0){
        const left = capLeft(s,p,a.game);
        if (want > left){ want = left; capped = true; }
        if (want > 0) addUsed(p, a.game, want);
      }
      addPts(p, want);
      if (a.badge) badge(p,a.badge);
      if (a.best && a.score!=null && a.score > (s.best[a.best]||0)) s.best[a.best]=a.score;
      if (a.freeSpin) p.freeSpin += a.freeSpin;
      if (a.teamCoins) P.forEach(q => q.coins += a.teamCoins);
      if (a.log) logIt(s, `${p.icon} <b>${p.name}</b> ${a.log}`);
      return { ok:true, pts:p.pts, given:want, capped };
    }

    case "submit": {
      if (!p) return { err:"Vælg dig selv først" };
      const r = cleanRow(a.row || {});
      if (rowEmpty(r)) return { err:"Udfyld mindst ét felt" };
      s.pending = s.pending.filter(x => x.pi !== a.pi);
      const n = breakdown(p, r, s.rules).n;
      s.pending.push({ id:Date.now()+"-"+a.pi, pi:a.pi, at:new Date().toISOString(), ...r, n });
      logIt(s, `📨 <b>${p.name}</b> sendte sine tal til godkendelse`);
      return { ok:true, n };
    }
    case "approve": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const it = s.pending.find(x => x.id === a.id);
      if (!it) return { err:"Indsendelsen findes ikke længere" };
      const n = grant(s,it.pi,it);
      s.pending = s.pending.filter(x => x.id !== a.id);
      return { ok:true, n, name:P[it.pi]?P[it.pi].name:"" };
    }
    case "approveAll": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      let tot=0, who=0;
      s.pending.forEach(it => { const n=grant(s,it.pi,it); if (n>0){ tot+=n; who++; } });
      s.pending = [];
      return { ok:true, tot, who };
    }
    case "reject": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const it = s.pending.find(x => x.id === a.id);
      if (!it) return { err:"Indsendelsen findes ikke længere" };
      s.pending = s.pending.filter(x => x.id !== a.id);
      const q = P[it.pi];
      if (q) logIt(s, `↩️ <b>${q.name}</b>s tal blev afvist — tast igen`);
      return { ok:true, name:q?q.name:"" };
    }
    case "payout": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      let tot=0, who=0;
      (a.rows||[]).forEach(row => {
        if (!P[row.pi]) return;
        const r = cleanRow(row); if (rowEmpty(r)) return;
        const n = grant(s,row.pi,r); if (n>0){ tot+=n; who++; }
      });
      return { ok:true, tot, who };
    }

    /* ---------- REGLER: salgstyper + værdier ---------- */
    case "rulesSave": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const x = a.rules || {};
      const list = Array.isArray(x.sales) ? x.sales.slice(0, 20) : [];
      if (!list.length) return { err:"Der skal være mindst én salgstype" };
      const used = {};
      const sales = list.map((t,i) => {
        let id = clean(t.id,40) || ("s"+Date.now().toString(36)+i);
        if (used[id]) id = id+"-"+i; used[id]=1;
        return { id, n: clean(t.n,30) || "Salg", c: num(t.c,0,50), on: t.on !== false };
      });
      if (!sales.some(t => t.on)) return { err:"Mindst én salgstype skal være aktiv" };
      s.rules = {
        sales,
        csatPer: int(x.csatPer,1,20),   csatCoins: num(x.csatCoins,0,20),
        kptMin:  num(x.kptMin,0,50),    kptCoins:  num(x.kptCoins,0,20),
        wrapMax: int(x.wrapMax,1,999),  wrapCoins: num(x.wrapCoins,0,20),
        confMin: num(x.confMin,0,100),  confCoins: num(x.confCoins,0,20),
        streakDays: int(x.streakDays,0,30), streakCoins: num(x.streakCoins,0,50),
        heat: clean(x.heat,120)
      };
      logIt(s, s.rules.heat ? `🔥 <b>Nyt heat:</b> ${s.rules.heat}` : "⚙️ <b>Møntreglerne er opdateret</b>");
      return { ok:true };
    }
    case "rulesReset": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const sales = s.rules.sales;   /* salgstyperne beholdes */
      s.rules = { ...clone(DEFAULT_RULES), sales };
      logIt(s, "⚙️ <b>Møntreglerne er sat tilbage til standard</b>");
      return { ok:true };
    }

    case "buy": {
      if (!p) return { err:"Ukendt spiller" };
      const it = s.shop.find(x => x.id === a.id);
      if (!it) return { err:"Varen findes ikke længere" };
      if (it.out) return { err:it.n+" er udsolgt" };
      if (p.pts < it.c) return { err:"Ikke nok point" };
      p.pts -= it.c; p.bought.push(it.id); badge(p,"shop");
      logIt(s, `${p.icon} <b>${p.name}</b> købte ${it.ic} ${it.n} for ${it.c} point`);
      return { ok:true, name:it.n, ic:it.ic };
    }
    case "shopSave": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const list = Array.isArray(a.items) ? a.items.slice(0,24) : null;
      if (!list || !list.length) return { err:"Kiosken skal have mindst én vare" };
      const used={};
      s.shop = list.map((x,i) => {
        let id = clean(x.id,40) || ("v"+Date.now().toString(36)+i);
        if (used[id]) id = id+"-"+i; used[id]=1;
        return { id, ic:clean(x.ic,8)||"🎁", n:clean(x.n,30)||"Vare", d:clean(x.d,90), c:int(x.c,1,9999), out:!!x.out };
      });
      logIt(s, "🏪 <b>Kiosken er opdateret</b>");
      return { ok:true };
    }
    case "gamesSave": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const list = Array.isArray(a.items) ? a.items : null;
      if (!list || !list.length) return { err:"Ingen spil at gemme" };
      if (!list.some(x => x.on)) return { err:"Mindst ét spil skal være åbent" };
      s.games = DEFAULT_GAMES.map(d => {
        const x = list.find(y => y.id === d.id) || d;
        return { id:d.id, on:!!x.on, cap:COIN[d.id] ? 0 : int(x.cap,0,999) };
      });
      const off = s.games.filter(g => !g.on).map(g => GAME_NAMES[g.id]);
      logIt(s, off.length ? `🎮 <b>Spillehallen opdateret</b> — lukket: ${off.join(", ")}`
                          : "🎮 <b>Spillehallen opdateret</b> — alle spil er åbne");
      return { ok:true };
    }
    case "resetCaps": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      P.forEach(q => q.used = {});
      logIt(s, "♻️ <b>Dagens grænser er nulstillet</b>");
      return { ok:true };
    }
    case "exchange": {
      if (!p) return { err:"Vælg dig selv først" };
      const ex = s.ex;
      if (!ex.on) return { err:"Børsen er lukket lige nu" };
      const n = int(a.n,1,50);
      if (a.dir === "toPts"){
        if (p.coins < n) return { err:"Du har kun "+p.coins+" mønter" };
        const g = n*ex.sell; p.coins -= n; addPts(p,g);
        logIt(s, `📈 <b>${p.name}</b> vekslede ${n} mønt${n>1?"er":""} til ${g} point`);
        return { ok:true, n, g };
      }
      if (a.dir === "toCoins"){
        const cost = n*ex.buy;
        if (p.pts < cost) return { err:"Det koster "+cost+" point — du har "+p.pts };
        p.pts -= cost; p.coins += n;
        logIt(s, `📉 <b>${p.name}</b> købte ${n} mønt${n>1?"er":""} for ${cost} point`);
        return { ok:true, n, cost };
      }
      return { err:"Ukendt veksling" };
    }
    case "exSave": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const sell=int(a.sell,0,50), buy=int(a.buy,1,500);
      if (buy <= sell) return { err:"Købsprisen skal være højere end salgsprisen" };
      s.ex = { on:!!a.on, sell, buy };
      logIt(s, a.on ? `📊 <b>Børsen</b>: 1 mønt = ${sell} point · 1 mønt koster ${buy} point` : "📊 <b>Børsen er lukket</b>");
      return { ok:true };
    }
    case "setOpen": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      s.openAt = a.openAt || null;
      logIt(s, a.openAt ? "⏳ <b>Pre-launch</b> — spillene åbner "+openText(s) : "🎉 <b>Spillehallen er åben!</b>");
      return { ok:true };
    }
    case "clearOrders": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      P.forEach(q => q.bought = []);
      logIt(s, "✅ <b>Bestillinger udleveret</b> — listen er ryddet");
      return { ok:true };
    }
    case "rename": {
      if (a.by !== a.pi && !isAdmin(s,a.by,a.pin)) return DENY;
      if (p) p.name = clean(a.name,24) || "?";
      return { ok:true };
    }
    case "addPlayer": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const i = P.length;
      P.push({ name:clean(a.name,24)||"Ny deltager", coins:0, pts:0, shield:false, streak:0,
               freeSpin:0, admin:false, badges:[], bought:[], used:{},
               color:COLORS[i%COLORS.length], icon:ICONS[i%ICONS.length] });
      return { ok:true, pi:i };
    }
    case "newField": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      s.field = buildField(); s.last = -1;
      logIt(s, "💣 <b>Nyt minefelt</b> lagt ud");
      return { ok:true };
    }
    case "newSeason": {
      if (!isAdmin(s,a.by,a.pin)) return DENY;
      const keepP = P.map(q => ({ name:q.name, icon:q.icon, color:q.color, admin:!!q.admin }));
      const se = (s.season||1)+1;
      const ns = fresh(keepP, se, { shop:s.shop, ex:s.ex, games:s.games, rules:s.rules });
      /* nye spil: indstillinger og koder følger med til næste sæson */
      ns.lotto = { t:{}, pot:0, max:(s.lotto && s.lotto.max) || 10, round:1, last:null, hist:[] };
      ns.tip = { dl:(s.tip && s.tip.dl) || 600, floor:(s.tip && s.tip.floor) || 0, carry:0, rounds:[], hist:[] };
      ns.rps = { open:[], hist:[] }; ns.codes = s.codes || {}; ns.rec = {};
      logIt(ns, `🏁 <b>Sæson ${se}</b> er startet`);
      Object.keys(s).forEach(k => delete s[k]);
      Object.assign(s, ns);
      return { ok:true };
    }
    default: return { err:"Ukendt handling" };
  }
}

/* =====================================================================
   NYE SPIL (okt. 2026)
   Flødebolle-flyveren · Over vejen · Småkage-klikkeren
   Lotteriet · Sten, saks, papir · Salgstippet
   ===================================================================== */
/* Arkadespillene: serveren regner selv point ud fra resultatet og kræver den
   billet, "spend" gav ved start — så hver betalt tur kun kan give point én gang. */
const NEWARC = {
  fly:    { ic:"🐦", unit:"huller",   pts:(n) => Math.floor(n / 4),   max:6, top:999,   bd:"fly" },
  road:   { ic:"🐸", unit:"rækker",   pts:(n) => Math.floor(n / 5),   max:6, top:999,   bd:"road" },
  cookie: { ic:"🍪", unit:"småkager", pts:(n) => Math.round(n / 500), max:6, top:20000, bd:"cookie" }
};
const COIN = { lotto:1, rps:1, tip:1 };   /* spil, der kun flytter mønter mellem spillerne */
const MOVES = { sten:"✊", saks:"✌️", papir:"✋" };
const BEATS = { sten:"saks", saks:"papir", papir:"sten" };

/* Hemmeligheder (valget i sten-saks-papir og salgstip før fristen) krypteres med en
   nøgle, der er afledt af databasens token. Den findes kun på serveren, så heller
   ikke den, der kigger i /api/state, kan se dem. */
const SEAL = crypto.createHash("sha256").update("slik-arenaen:" + String(TOKEN || "")).digest();
function seal(o){
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", SEAL, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(o), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}
function unseal(t){
  try {
    const b = Buffer.from(String(t), "base64");
    const d = crypto.createDecipheriv("aes-256-gcm", SEAL, b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
  } catch(e){ return null; }
}
const rid = () => crypto.randomBytes(6).toString("hex");
const codeHash = (pi, code) => crypto.createHmac("sha256", SEAL).update(pi + ":" + code).digest("hex").slice(0, 32);

/* Rigtig dansk tid — følger både sommer- og vintertid */
const DKF = new Intl.DateTimeFormat("en-GB", { timeZone:"Europe/Copenhagen", year:"numeric", month:"2-digit",
  day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" });
function dk(){
  const o = {}; DKF.formatToParts(new Date()).forEach(x => { o[x.type] = x.value; });
  return { d:`${o.year}-${o.month}-${o.day}`, m:((+o.hour) % 24) * 60 + (+o.minute) };
}
const hm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + "." + String(m % 60).padStart(2, "0");
function dayTxt(d){
  const x = new Date(d + "T12:00:00Z");
  return ["søn","man","tirs","ons","tors","fre","lør"][x.getUTCDay()] + " " + (+d.slice(8, 10)) + "/" + (+d.slice(5, 7));
}
const who = (q) => q ? `${q.icon} <b>${q.name}</b>` : "<b>?</b>";
const andList = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " og " + a[a.length - 1];
function gate(s, id){
  if (locked(s)) return { err:"Spillene åbner "+openText(s)+" — saml mønter indtil da!" };
  if (!gameCfg(s, id).on) return { err:GAME_NAMES[id]+" er lukket lige nu" };
  return null;
}
function tipClosed(s, d, now){ now = now || dk(); return d < now.d || (d === now.d && now.m >= s.tip.dl); }

/* Oprydning, der kører før hver ny handling: udløbne udfordringer får mønten
   tilbage, og salgstip bliver afsløret, når fristen er passeret. */
function housekeep(s){
  let ch = false; const now = dk(), P = s.players;
  s.rps.open = s.rps.open.filter(c => {
    if (c.d >= now.d) return true;
    const q = P[c.a]; if (q) q.coins += 1;
    logIt(s, `⌛ ${who(q)}s udfordring i ✊ Sten, saks, papir udløb — mønten er givet tilbage`);
    ch = true; return false;
  });
  s.tip.rounds.forEach(r => {
    if (!r.seal || !tipClosed(s, r.d, now)) return;
    r.tips = {};
    Object.keys(r.seal).forEach(k => {
      const v = unseal(r.seal[k]);
      if (v && v.n != null) r.tips[k] = v.n;
      else { if (P[k]) P[k].coins += 1; r.n--; r.pot--; }
    });
    delete r.seal; ch = true;
    logIt(s, `📊 Tippene i Salgstippet for ${dayTxt(r.d)} er afsløret — ${r.n} tip, pulje ${r.pot} mønter`);
  });
  return ch;
}

function arcadeScore(s, p, a){
  const g = NEWARC[a.game];
  if (!p.tk || p.tk.g !== a.game || p.tk.id !== String(a.tk || "")) return { err:"Turen er allerede afsluttet" };
  delete p.tk;
  const n = Math.min(g.top, Math.max(0, Math.floor(Number(a.score) || 0)));
  const raw = Math.min(g.max, Math.max(0, g.pts(n)));
  let want = raw, capped = false;
  const left = capLeft(s, p, a.game);
  if (want > left){ want = left; capped = true; }
  if (want > 0){ addUsed(p, a.game, want); addPts(p, want); }
  if (raw >= g.max) badge(p, g.bd);
  const old = s.rec[a.game], rec = n > 0 && (!old || n > old.v);
  if (rec) s.rec[a.game] = { v:n, n:p.name, i:p.icon, d:dk().d };
  logIt(s, `${who(p)} spillede ${g.ic} ${GAME_NAMES[a.game]}: ${n} ${g.unit}, +${want} point${rec ? " — ny rekord! 🏆" : ""}`);
  return { ok:true, pts:p.pts, given:want, raw, capped, rec };
}

/* Personlig kode til sten-saks-papir: 5 forkerte forsøg låser koden resten af dagen */
function checkCode(s, pi, code){
  const c = s.codes[pi], today = dk().d;
  if (!c) return { err:"Vælg først din personlige kode", needCode:true };
  if (c.fd === today && c.f >= 5) return { err:"Koden er låst resten af dagen efter 5 forkerte forsøg. Oskar kan nulstille den", badCode:true };
  if (codeHash(pi, String(code == null ? "" : code)) !== c.h){
    if (c.fd !== today){ c.fd = today; c.f = 0; }
    c.f++;
    return { err: c.f >= 5 ? "Forkert kode — koden er nu låst resten af dagen. Oskar kan nulstille den"
                           : "Forkert kode ("+(5 - c.f)+" forsøg tilbage i dag)", badCode:true, save:true };
  }
  if (c.f) c.f = 0;
  return null;
}

const NEW_ACTIONS = { tick:1, lottoBuy:1, lottoDraw:1, lottoSave:1, rpsSetCode:1, rpsCheck:1, rpsChallenge:1,
  rpsAnswer:1, rpsCancel:1, rpsResetCode:1, tipSet:1, tipResult:1, tipCancel:1, tipCfg:1 };
function applyNew(s, a, P, p){
  const hk = housekeep(s);
  if (a.type === "tick") return hk ? { ok:true } : { err:"Intet nyt", quiet:true };
  const r = newAction(s, a, P, p);
  if (r && r.err && hk) r.save = true;   /* oprydningen skal gemmes, selv om handlingen fejlede */
  return r;
}

function newAction(s, a, P, p){
  const me = a.pi != null ? +a.pi : -1;
  switch (a.type){

    /* ---------- LOTTERIET ---------- */
    case "lottoBuy": {
      if (!p) return { err:"Vælg dig selv først" };
      const g = gate(s, "lotto"); if (g) return g;
      const L = s.lotto, n = int(a.n, 1, 100), mine = L.t[me] || 0;
      if (mine >= L.max) return { err:"Du har allerede "+L.max+" lodder — det er maks pr. runde" };
      if (mine + n > L.max) return { err:"Du kan højst købe "+(L.max - mine)+" lod"+(L.max - mine > 1 ? "der" : "")+" mere i denne runde" };
      if (p.coins < n) return { err:"Du har kun "+p.coins+" mønt"+(p.coins === 1 ? "" : "er") };
      p.coins -= n; L.t[me] = mine + n; L.pot += n;
      logIt(s, `🎟️ ${who(p)} købte ${n} lod${n > 1 ? "der" : ""} i Lotteriet — puljen er nu ${L.pot} mønter`);
      return { ok:true, n, mine:L.t[me], pot:L.pot };
    }
    case "lottoDraw": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const L = s.lotto, ids = Object.keys(L.t).filter(k => L.t[k] > 0 && P[k]);
      const total = ids.reduce((x, k) => x + L.t[k], 0);
      if (!total) return { err:"Der er ingen lodder i puljen endnu" };
      let r = crypto.randomInt(total), win = ids[ids.length - 1];
      for (const k of ids){ if (r < L.t[k]){ win = k; break; } r -= L.t[k]; }
      const q = P[win], pot = L.pot;
      q.coins += pot; badge(q, "lotto");
      const res = { pi:+win, pot, tk:L.t[win], total, n:ids.length, d:dk().d, r:L.round || 1 };
      L.last = res; L.hist.unshift(res); if (L.hist.length > 8) L.hist.pop();
      L.t = {}; L.pot = 0; L.round = (L.round || 1) + 1;
      logIt(s, `🎟️ ${who(q)} vandt Lotteriet med ${res.tk} af ${total} lodder og fik ${pot} mønter! 🎉`);
      return { ok:true, ...res, name:q.name, icon:q.icon };
    }
    case "lottoSave": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      s.lotto.max = int(a.max, 1, 100);
      logIt(s, `🎟️ <b>Lotteriet</b>: maks ${s.lotto.max} lodder pr. person pr. runde`);
      return { ok:true };
    }

    /* ---------- STEN, SAKS, PAPIR ---------- */
    case "rpsSetCode": {
      if (!p) return { err:"Vælg dig selv først" };
      if (s.codes[me]) return { err:"Du har allerede en kode. Har du glemt den, kan Oskar nulstille den" };
      const code = String(a.code == null ? "" : a.code).trim();
      if (!/^\d{4}$/.test(code)) return { err:"Koden skal være 4 cifre" };
      s.codes[me] = { h:codeHash(me, code), f:0, fd:"" };
      logIt(s, `🔑 ${who(p)} har valgt sin kode til ✊ Sten, saks, papir`);
      return { ok:true };
    }
    case "rpsCheck": {
      if (!p) return { err:"Vælg dig selv først" };
      const bad = checkCode(s, me, a.code); if (bad) return bad;
      return { ok:true };
    }
    case "rpsChallenge": {
      if (!p) return { err:"Vælg dig selv først" };
      const g = gate(s, "rps"); if (g) return g;
      const bad = checkCode(s, me, a.code); if (bad) return bad;
      if (!MOVES[a.mv]) return { err:"Vælg sten, saks eller papir" };
      const to = (a.to == null || a.to === "" || +a.to < 0) ? -1 : +a.to;
      if (to === me) return { err:"Du kan ikke udfordre dig selv" };
      if (to >= 0 && !P[to]) return { err:"Ukendt modstander" };
      if (s.rps.open.filter(c => c.a === me).length >= 3) return { err:"Du har allerede 3 åbne udfordringer" };
      if (p.coins < 1) return { err:"Du har ingen mønter tilbage" };
      p.coins--;
      const c = { id:rid(), a:me, b:to, s:seal({ mv:a.mv }), d:dk().d, at:new Date().toISOString() };
      s.rps.open.push(c);
      logIt(s, `✊ ${who(p)} udfordrede ${to >= 0 ? who(P[to]) : "<b>hele holdet</b>"} i Sten, saks, papir`);
      return { ok:true, id:c.id };
    }
    case "rpsAnswer": {
      if (!p) return { err:"Vælg dig selv først" };
      const g = gate(s, "rps"); if (g) return g;
      const c = s.rps.open.find(x => x.id === a.id);
      if (!c) return { err:"Udfordringen findes ikke længere" };
      if (c.a === me) return { err:"Du kan ikke svare på din egen udfordring" };
      if (c.b !== -1 && c.b !== me) return { err:"Udfordringen er til en anden" };
      const bad = checkCode(s, me, a.code); if (bad) return bad;
      if (!MOVES[a.mv]) return { err:"Vælg sten, saks eller papir" };
      if (p.coins < 1) return { err:"Du har ingen mønter tilbage" };
      const A = P[c.a], v = unseal(c.s);
      s.rps.open = s.rps.open.filter(x => x !== c);
      if (!A || !v || !MOVES[v.mv]){
        if (A) A.coins += 1;
        return { err:"Udfordringen kunne ikke læses og er annulleret — mønten er givet tilbage", save:true };
      }
      p.coins--;
      const ma = v.mv, mb = a.mv;
      let w = -1;
      if (ma === mb){ A.coins += 1; p.coins += 1; }
      else if (BEATS[ma] === mb){ A.coins += 2; w = c.a; badge(A, "rps"); }
      else { p.coins += 2; w = me; badge(p, "rps"); }
      s.rps.hist.unshift({ a:c.a, b:me, ma, mb, w, at:new Date().toISOString() });
      if (s.rps.hist.length > 12) s.rps.hist.pop();
      if (w < 0) logIt(s, `✊ ${who(A)} (${MOVES[ma]}) og ${who(p)} (${MOVES[mb]}) spillede uafgjort — begge fik mønten tilbage`);
      else if (w === me) logIt(s, `✊ ${who(p)} (${MOVES[mb]}) slog ${who(A)} (${MOVES[ma]}) og tog begge mønter`);
      else logIt(s, `✊ ${who(A)} (${MOVES[ma]}) slog ${who(p)} (${MOVES[mb]}) og tog begge mønter`);
      return { ok:true, ma, mb, w, you: w < 0 ? "tie" : (w === me ? "win" : "lose") };
    }
    case "rpsCancel": {
      if (!p) return { err:"Vælg dig selv først" };
      const c = s.rps.open.find(x => x.id === a.id);
      if (!c) return { err:"Udfordringen findes ikke længere" };
      if (c.a !== me) return { err:"Kun den, der udfordrede, kan trække udfordringen tilbage" };
      const bad = checkCode(s, me, a.code); if (bad) return bad;
      s.rps.open = s.rps.open.filter(x => x !== c); p.coins += 1;
      return { ok:true };
    }
    case "rpsResetCode": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      if (!p) return { err:"Ukendt spiller" };
      delete s.codes[me];
      logIt(s, `🔑 ${who(p)}s kode til Sten, saks, papir er nulstillet`);
      return { ok:true, name:p.name };
    }

    /* ---------- SALGSTIPPET ---------- */
    case "tipSet": {
      if (!p) return { err:"Vælg dig selv først" };
      if (p.admin) return { err:"Du taster holdets resultat, så du kan ikke selv tippe" };
      const g = gate(s, "tip"); if (g) return g;
      const T = s.tip, now = dk();
      if (now.m >= T.dl) return { err:"Fristen kl. "+hm(T.dl)+" er overskredet — tip igen i morgen" };
      const n = Math.round(Number(a.n));
      if (a.n === "" || a.n == null || !isFinite(n) || n < 0 || n > 9999) return { err:"Skriv et tal mellem 0 og 9999" };
      let r = T.rounds.find(x => x.d === now.d);
      if (r && !r.seal) return { err:"Tippene for i dag er allerede afsløret" };
      const floor = r ? (r.f || 0) : (T.floor || 0);
      if (n < floor) return { err:"Tippet skal være mindst "+floor+" (bundgrænsen)" };
      if (r && r.seal[me]){
        const old = unseal(r.seal[me]);
        if (!old || !a.k || String(a.k) !== old.k)
          return { err:"Du har allerede tippet i dag. Tippet kan kun rettes fra den PC, du tippede fra" };
        r.seal[me] = seal({ n, k:old.k });
        return { ok:true, n, k:old.k, changed:true };
      }
      if (p.coins < 1) return { err:"Du har ingen mønter tilbage" };
      if (!r){ r = { d:now.d, f:T.floor || 0, n:0, c:T.carry || 0, pot:T.carry || 0, seal:{} }; T.carry = 0; T.rounds.push(r); }
      p.coins--; r.n++; r.pot++;
      const k = rid();
      r.seal[me] = seal({ n, k });
      logIt(s, `📊 ${who(p)} har tippet på holdets salg i dag — puljen er ${r.pot} mønter`);
      return { ok:true, n, k };
    }
    case "tipResult": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const T = s.tip, r = T.rounds.find(x => x.d === a.d);
      if (!r) return { err:"Runden findes ikke længere" };
      if (r.seal) return { err:"Fristen kl. "+hm(T.dl)+" er ikke overskredet endnu" };
      if (a.res === "" || a.res == null || !isFinite(Number(a.res))) return { err:"Skriv holdets resultat" };
      const res = int(a.res, 0, 9999), ids = Object.keys(r.tips || {}).filter(k => P[k]);
      const miss = (r.f || 0) > 0 && res < r.f;
      let win = [], best = Infinity;
      if (!miss) ids.forEach(k => {
        const d = Math.abs(r.tips[k] - res);
        if (d < best){ best = d; win = [k]; } else if (d === best) win.push(k);
      });
      const each = win.length ? Math.floor(r.pot / win.length) : 0, rest = r.pot - each * win.length;
      win.forEach(k => { P[k].coins += each; badge(P[k], "tip"); });
      T.carry = (T.carry || 0) + rest;
      T.rounds = T.rounds.filter(x => x !== r);
      const h = { d:r.d, res, pot:r.pot, each, win:win.map(Number), tips:r.tips || {}, rest, miss, f:r.f || 0 };
      T.hist.unshift(h); if (T.hist.length > 10) T.hist.pop();
      const head = `📊 Salgstippet ${dayTxt(r.d)}: holdet lavede ${res} salg`;
      const tail = rest ? ` (${rest} mønt${rest > 1 ? "er" : ""} går videre til næste pulje)` : "";
      if (miss) logIt(s, `${head} og nåede ikke bundgrænsen på ${r.f} — puljen på ${r.pot} mønter går videre`);
      else if (!win.length) logIt(s, `${head} — ingen tip, så puljen går videre`);
      else if (win.length === 1) logIt(s, `${head} — ${who(P[win[0]])} tippede ${r.tips[win[0]]} og vandt ${each} mønter 🎉${tail}`);
      else logIt(s, `${head} — ${andList(win.map(k => who(P[k])))} delte puljen og fik ${each} mønter hver${tail}`);
      return { ok:true, ...h };
    }
    case "tipCancel": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const T = s.tip, r = T.rounds.find(x => x.d === a.d);
      if (!r) return { err:"Runden findes ikke længere" };
      const ids = Object.keys(r.seal || r.tips || {});
      ids.forEach(k => { if (P[k]) P[k].coins += 1; });
      T.carry = (T.carry || 0) + (r.c || 0);
      T.rounds = T.rounds.filter(x => x !== r);
      logIt(s, `📊 Salgstippet for ${dayTxt(r.d)} blev annulleret — alle har fået deres mønt tilbage`);
      return { ok:true, n:ids.length };
    }
    case "tipCfg": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(a.dl || "").trim());
      if (!m) return { err:"Skriv fristen som tt:mm, fx 10:00" };
      const dl = (+m[1]) * 60 + (+m[2]);
      if (+m[2] > 59 || dl < 360 || dl > 1080) return { err:"Fristen skal ligge mellem kl. 06.00 og 18.00" };
      s.tip.dl = dl; s.tip.floor = int(a.floor, 0, 9999);
      logIt(s, `📊 <b>Salgstippet</b>: fristen er kl. ${hm(dl)}` + (s.tip.floor ? ` — man skal tippe mindst ${s.tip.floor}` : ""));
      return { ok:true };
    }
  }
  return { err:"Ukendt handling" };
}

async function read(){
  const raw = await rGet();
  if (!raw) return { v:1, state:fresh() };
  try { const d = typeof raw==="string" ? JSON.parse(raw) : raw;
    if (d.state) upgrade(d.state);
    return d;
  } catch(e){ return { v:1, state:fresh() }; }
}

export default async function handler(req,res){
  res.setHeader("cache-control","no-store");
  if (!URL_ || !TOKEN) return res.status(500).json({
    err:"Databasen mangler. Tilknyt Upstash Redis i Vercel (Storage) og redeploy.",
    fundne_variabler: Object.keys(ENV).filter(k => /REST|REDIS|KV/.test(k)) });
  try {
    if (req.method === "GET") return res.status(200).json(await read());
    if (req.method === "POST"){
      const body = typeof req.body === "string" ? JSON.parse(req.body||"{}") : req.body||{};
      const id = Math.random().toString(36).slice(2);
      let got=null;
      for (let i=0;i<25 && !got;i++){ got = await lock(id); if (!got) await sleep(70); }
      try {
        const doc = await read();
        const result = apply(doc.state, body);
        if (result && result.err && !result.taken && !result.save) return res.status(200).json({ ...doc, result });
        doc.v = (doc.v||1)+1;
        await rSet(JSON.stringify(doc));
        return res.status(200).json({ v:doc.v, state:doc.state, result });
      } finally { if (got) await unlock(); }
    }
    res.setHeader("allow","GET, POST");
    return res.status(405).json({ err:"Metode ikke tilladt" });
  } catch(e){
    return res.status(500).json({ err:"Serverfejl: "+(e && e.message ? e.message : e) });
  }
}
