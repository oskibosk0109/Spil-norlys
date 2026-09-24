/* Vercel Serverless Function — delt tilstand for Slik-Arenaen
 * Lagring: Upstash Redis (Vercel → Storage → Upstash → Redis)
 * Env: KV_REST_API_URL / KV_REST_API_TOKEN (saettes automatisk)
 * Valgfri env: ADMIN_PIN  (default 2731)
 */
const KEY = "arena:state";
const URL_  = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PIN   = String(process.env.ADMIN_PIN || "2731");

const ICONS = ["🦊","🐼","🐯","🐸","🦁","🐵","🐨","🦄","🐙","🐝","🦖","🐳","🦉","🐶","🐱"];
const COLORS = ["#ffd166","#7ee0b0","#ff9ec7","#8fd0ff","#ffb37a","#c4b5fd","#7fe3e8","#ffa3a3",
                "#ffe08a","#a8eec0","#f5b8f0","#9ed7ff","#ffc2cd","#bdf0c4","#d4c9fb"];
const NAMES = ["Oskar","Victoria H.","Nilaus","Anissa","Christoffer","Rafael","Victoria M.",
               "Altin","Amir","Faizan","Angelica"];
const N = 96;

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).result;
}
const rGet = () => redis(["GET", KEY]);
const rSet = (v) => redis(["SET", KEY, v]);
const lock = (id) => redis(["SET", KEY + ":lock", id, "NX", "PX", "4000"]);
const unlock = () => redis(["DEL", KEY + ":lock"]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function buildField() {
  const f = [];
  for (let i = 0; i < 10; i++) f.push({ t: "mine", v: -3 });
  for (let i = 0; i < 3; i++)  f.push({ t: "mine", v: -6 });
  for (let i = 0; i < 20; i++) f.push({ t: "candy", v: 2 });
  for (let i = 0; i < 16; i++) f.push({ t: "pts", v: 3 });
  for (let i = 0; i < 11; i++) f.push({ t: "pts", v: 5 });
  for (let i = 0; i < 4; i++)  f.push({ t: "jack", v: 14 });
  for (let i = 0; i < 5; i++)  f.push({ t: "safe", v: 0 });
  for (let i = 0; i < 6; i++)  f.push({ t: "spin", v: 0 });
  while (f.length < N) f.push({ t: "dud", v: 0 });
  for (let i = f.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [f[i], f[j]] = [f[j], f[i]];
  }
  return f.map(c => ({ ...c, open: false, by: null }));
}
function mkPlayers(old) {
  const src = old || NAMES.map(n => ({ name: n }));
  return src.map((o, i) => ({
    name: o.name, coins: 0, pts: 0, shield: false, streak: 0, freeSpin: 0,
    admin: o.admin != null ? o.admin : (o.name === "Oskar"),
    badges: [], bought: [],
    color: o.color || COLORS[i % COLORS.length],
    icon: o.icon || ICONS[i % ICONS.length]
  }));
}
function fresh(old, season) {
  return {
    field: buildField(), players: mkPlayers(old), log: [], last: -1,
    season: season || 1, best: { wheel: 0, shoot: 0, stack: 0, dig: 0, tetris: 0 },
    spins: 0, openAt: null, pending: []
  };
}
function logIt(s, m) { s.log.unshift(m); if (s.log.length > 80) s.log.pop(); }
function badge(p, k) { if (p.badges.indexOf(k) < 0) p.badges.push(k); }
function addPts(p, n) { p.pts = Math.max(0, p.pts + n); if (p.pts >= 50) badge(p, "rich"); }

/* admin kraever BAADE admin-flag OG korrekt pinkode */
function isAdmin(s, by, pin) {
  const q = (by != null) ? s.players[by] : null;
  return !!(q && q.admin && String(pin || "") === PIN);
}
function locked(s) { return !!(s.openAt && Date.now() < Date.parse(s.openAt)); }
function openText(s) {
  if (!s.openAt) return "";
  const d = new Date(s.openAt);
  const dg = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
  return dg[d.getDay()] + " kl. " + String(d.getHours()).padStart(2,"0") + "." +
         String(d.getMinutes()).padStart(2,"0");
}
function coinsFor(p, r) {
  let n = Math.floor(r.salg || 0) + Math.floor((r.csat || 0) / 2) + ((r.kpt || 0) > 6.8 ? 1 : 0);
  if (r.wrap > 0 && r.wrap < 60) n += 1;
  if ((r.conf || 0) > 80) n += 1;
  if ((r.kpt || 0) > 6.8 && ((p.streak || 0) + 1) % 3 === 0) n += 2;
  return n;
}
function grant(s, pi, r) {
  const q = s.players[pi]; if (!q) return 0;
  const n = coinsFor(q, r);
  if ((r.kpt || 0) > 6.8) { q.streak++; if (q.streak >= 3) badge(q, "streak"); }
  else if (r.salg || r.csat || r.kpt) q.streak = 0;
  if (n > 0) {
    q.coins += n;
    logIt(s, `${q.icon} <b>${q.name}</b> fik ${n} mønter (${r.salg||0} salg, ${r.csat||0} CSAT, ` +
             `KPT ${r.kpt||0}${r.wrap?`, wrap ${r.wrap}s`:``}${r.conf?`, conf ${r.conf}%`:``})`);
  }
  return n;
}
const DENY = { err: "Forkert kode — kun Oskar har adgang" };

function apply(s, a) {
  if (!s.pending) s.pending = [];
  const P = s.players;
  const p = (a.pi != null && P[a.pi]) ? P[a.pi] : null;

  switch (a.type) {

    /* ---------- login med pinkode ---------- */
    case "adminLogin": {
      const q = (a.pi != null) ? P[a.pi] : null;
      if (!q || !q.admin) return { err: "Denne bruger har ikke admin" };
      if (String(a.pin || "") !== PIN) return { err: "Forkert kode" };
      return { ok: true };
    }

    case "tap": {
      if (!p) return { err: "Ukendt spiller" };
      if (locked(s)) return { err: "Spillene åbner " + openText(s) + " — saml mønter indtil da!" };
      const c = s.field[a.idx];
      if (!c) return { err: "Ukendt felt" };
      if (c.open) return { err: "Feltet er allerede taget", taken: true };
      if (p.coins < 1) return { err: "Du har ingen mønter tilbage" };
      p.coins--; c.open = true; c.by = a.pi; s.last = a.idx;
      if (s.field.filter(x => x.open).length === 1) badge(p, "first");
      const nm = `${p.icon} <b>${p.name}</b>`;
      const r = { kind: c.t, v: c.v };
      if (c.t === "candy")     { addPts(p, 2);   logIt(s, `${nm} fandt 🍬 slik (felt ${a.idx+1})`); }
      else if (c.t === "pts")  { addPts(p, c.v); logIt(s, `${nm} fandt ⭐ ${c.v} point (felt ${a.idx+1})`); }
      else if (c.t === "jack") { addPts(p, c.v); badge(p, "jack"); logIt(s, `${nm} ramte 🏆 JACKPOT (felt ${a.idx+1})`); }
      else if (c.t === "safe") { p.shield = true; logIt(s, `${nm} fandt 🛡️ skjold`); }
      else if (c.t === "spin") { p.freeSpin++;    logIt(s, `${nm} fandt 🎡 gratis spin`); }
      else if (c.t === "mine") {
        if (p.shield) { p.shield = false; badge(p, "survivor"); r.saved = true; logIt(s, `${nm} ramte 💥 — skjoldet holdt!`); }
        else { addPts(p, c.v); badge(p, "boom"); logIt(s, `${nm} sprang på 💥 (${c.v} point)`); }
      } else logIt(s, `${nm} åbnede et tomt felt ${a.idx+1}`);
      return r;
    }

    case "spend": {
      if (!p) return { err: "Ukendt spiller" };
      if (locked(s)) return { err: "Spillene åbner " + openText(s) + " — saml mønter indtil da!" };
      if (a.free && p.freeSpin > 0) { p.freeSpin--; return { free: true }; }
      if (p.coins < 1) return { err: "Du har ingen mønter tilbage" };
      p.coins--; if (a.game === "wheel") s.spins++;
      return { ok: true };
    }

    case "score": {
      if (!p) return { err: "Ukendt spiller" };
      addPts(p, a.pts || 0);
      if (a.badge) badge(p, a.badge);
      if (a.best && a.score != null && a.score > (s.best[a.best] || 0)) s.best[a.best] = a.score;
      if (a.freeSpin) p.freeSpin += a.freeSpin;
      if (a.teamCoins) P.forEach(q => q.coins += a.teamCoins);
      if (a.log) logIt(s, `${p.icon} <b>${p.name}</b> ${a.log}`);
      return { ok: true, pts: p.pts };
    }

    case "submit": {
      if (!p) return { err: "Vælg dig selv først" };
      const r = a.row || {};
      if (!r.salg && !r.csat && !r.kpt && !r.wrap && !r.conf)
        return { err: "Udfyld mindst ét felt" };
      s.pending = s.pending.filter(x => x.pi !== a.pi);
      s.pending.push({
        id: Date.now() + "-" + a.pi, pi: a.pi, at: new Date().toISOString(),
        salg: +r.salg || 0, csat: +r.csat || 0, kpt: +r.kpt || 0,
        wrap: +r.wrap || 0, conf: +r.conf || 0, n: coinsFor(p, r)
      });
      logIt(s, `📨 <b>${p.name}</b> sendte sine tal til godkendelse`);
      return { ok: true, n: coinsFor(p, r) };
    }

    case "approve": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const it = s.pending.find(x => x.id === a.id);
      if (!it) return { err: "Indsendelsen findes ikke længere" };
      const n = grant(s, it.pi, it);
      s.pending = s.pending.filter(x => x.id !== a.id);
      return { ok: true, n, name: P[it.pi] ? P[it.pi].name : "" };
    }

    case "approveAll": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      let tot = 0, who = 0;
      s.pending.forEach(it => { const n = grant(s, it.pi, it); if (n > 0) { tot += n; who++; } });
      s.pending = [];
      return { ok: true, tot, who };
    }

    case "reject": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const it = s.pending.find(x => x.id === a.id);
      if (!it) return { err: "Indsendelsen findes ikke længere" };
      s.pending = s.pending.filter(x => x.id !== a.id);
      const q = P[it.pi];
      if (q) logIt(s, `↩️ <b>${q.name}</b>s tal blev afvist — tast igen`);
      return { ok: true, name: q ? q.name : "" };
    }

    case "payout": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      let tot = 0, who = 0;
      (a.rows || []).forEach(r => { const n = grant(s, r.pi, r); if (n > 0) { tot += n; who++; } });
      return { ok: true, tot, who };
    }

    case "buy": {
      if (!p) return { err: "Ukendt spiller" };
      if (p.pts < a.cost) return { err: "Ikke nok point" };
      p.pts -= a.cost; p.bought.push(a.id); badge(p, "shop");
      logIt(s, `${p.icon} <b>${p.name}</b> købte ${a.ic} ${a.n} for ${a.cost} point`);
      return { ok: true };
    }

    case "setOpen": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      s.openAt = a.openAt || null;
      logIt(s, a.openAt ? "⏳ <b>Pre-launch</b> — spillene åbner " + openText(s)
                        : "🎉 <b>Spillehallen er åben!</b>");
      return { ok: true };
    }

    case "clearOrders": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      P.forEach(q => q.bought = []);
      logIt(s, "✅ <b>Bestillinger udleveret</b> — listen er ryddet");
      return { ok: true };
    }

    case "rename": {
      if (a.by !== a.pi && !isAdmin(s, a.by, a.pin)) return DENY;
      if (p) p.name = a.name || "?";
      return { ok: true };
    }

    case "addPlayer": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const i = P.length;
      P.push({ name: a.name || "Ny deltager", coins: 0, pts: 0, shield: false, streak: 0,
               freeSpin: 0, admin: false, badges: [], bought: [],
               color: COLORS[i % COLORS.length], icon: ICONS[i % ICONS.length] });
      return { ok: true, pi: i };
    }

    case "newField": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      s.field = buildField(); s.last = -1;
      logIt(s, "💣 <b>Nyt minefelt</b> lagt ud");
      return { ok: true };
    }

    case "newSeason": {
      if (!isAdmin(s, a.by, a.pin)) return DENY;
      const keep = P.map(q => ({ name: q.name, icon: q.icon, color: q.color, admin: !!q.admin }));
      const se = (s.season || 1) + 1;
      const ns = fresh(keep, se);
      logIt(ns, `🏁 <b>Sæson ${se}</b> er startet`);
      Object.keys(s).forEach(k => delete s[k]);
      Object.assign(s, ns);
      return { ok: true };
    }

    default: return { err: "Ukendt handling" };
  }
}

async function read() {
  const raw = await rGet();
  if (!raw) return { v: 1, state: fresh() };
  try {
    const d = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (d.state && !d.state.pending) d.state.pending = [];
    return d;
  } catch (e) { return { v: 1, state: fresh() }; }
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (!URL_ || !TOKEN) return res.status(500).json({
    err: "Databasen mangler. Tilknyt Upstash Redis i Vercel (Storage) og redeploy." });

  try {
    if (req.method === "GET") return res.status(200).json(await read());

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const id = Math.random().toString(36).slice(2);
      let got = null;
      for (let i = 0; i < 25 && !got; i++) { got = await lock(id); if (!got) await sleep(70); }
      try {
        const doc = await read();
        const result = apply(doc.state, body);
        if (result && result.err && !result.taken) return res.status(200).json({ ...doc, result });
        doc.v = (doc.v || 1) + 1;
        await rSet(JSON.stringify(doc));
        return res.status(200).json({ v: doc.v, state: doc.state, result });
      } finally { if (got) await unlock(); }
    }

    res.setHeader("allow", "GET, POST");
    return res.status(405).json({ err: "Metode ikke tilladt" });
  } catch (e) {
    return res.status(500).json({ err: "Serverfejl: " + (e && e.message ? e.message : e) });
  }
}
