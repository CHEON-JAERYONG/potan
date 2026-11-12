// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-host-reload.js [스크린샷폴더]
// 환경변수: BASE=주소(기본 http://127.0.0.1:8765/), CHROME=크롬 실행파일 경로
const _fs = require('fs'), _sp = process.argv[2] || require('path').join(__dirname, 'shots'); if (!_fs.existsSync(_sp)) _fs.mkdirSync(_sp, { recursive: true });
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

const SP = process.argv[2] || require('path').join(__dirname, 'shots');
const st = p => p.evaluate(() => {
  const w = __pt.world, G = __pt.G;
  if (!w || !G) return { phase: __pt.phase, scr: document.querySelector('.screen:not([hidden])').id, host: __pt.R && __pt.R.host };
  const t = w.tank(G.order[G.turnIdx]);
  return { scr: document.querySelector('.screen:not([hidden])').id, phase: __pt.phase, gid: G.gid, turn: G.turnNo, cur: t.id, me: __pt.me.id, host: __pt.R.host, hp: w.tanks.map(t => t.name + ':' + t.hp + (t.alive ? '' : 'x')).join(' '), cr: G.craters.length };
});
const waitFor = async (p, fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const s = await st(p); if (fn(s)) return s; await p.waitForTimeout(300); } return await st(p); };
const aimFire = p => p.evaluate(() => { const G = __pt.G, w = __pt.world, t = w.tank(G.order[G.turnIdx]); t.level = 'normal'; const plan = Engine.aiPlan(w, t, { rnd: Math.random }); t.facing = plan.f; t.angle = plan.a; __pt.aim.power = plan.p; __pt.aim.weapon = 0; __pt.fireNow(); });
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ca = await b.newContext(), cb = await b.newContext();
  const A = await ca.newPage(), B = await cb.newPage();
  const logs = [];
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => logs.push(n + ' PAGEERR: ' + e.message)); }
  await A.goto(BASE); await A.fill('#nick', '재룡'); await A.click('#btnCreate');
  await A.waitForTimeout(2500);
  const url = await A.inputValue('#shareUrl');
  await B.goto(url); await B.fill('#nick', '친구'); await B.click('#btnJoin');
  for (let i = 0; i < 40; i++) { if (await A.evaluate(() => __pt.R.players.length) >= 2) break; await A.waitForTimeout(300); }
  await A.click('#btnStart');
  let a = await waitFor(A, s => s.phase === 'aim');
  await aimFire(a.cur === a.me ? A : (B));
  a = await waitFor(A, s => s.phase === 'aim' && s.turn === 2, 30000);
  let bb = await waitFor(B, s => s.phase === 'aim' && s.turn === 2, 30000);
  console.log('before host reload A', a.hp, a.cr, '| B', bb.hp, bb.cr);
  const t0 = Date.now();
  await A.reload();
  a = await waitFor(A, s => s.scr === 'game' && s.phase === 'aim', 25000);
  console.log('host back after', Date.now() - t0, 'ms', JSON.stringify(a));
  console.log('host is me?', a.host === a.me);
  // continue a turn
  bb = await st(B);
  await aimFire(a.cur === a.me ? A : B);
  a = await waitFor(A, s => s.phase === 'aim' && s.turn === 3, 30000); bb = await waitFor(B, s => s.phase === 'aim' && s.turn === 3, 30000);
  console.log('turn3 same', a.hp === bb.hp && a.cr === bb.cr, a.hp, '|', bb.hp);
  // B reload (auto rejoin, no click)
  await B.reload();
  bb = await waitFor(B, s => s.scr === 'game' && s.phase === 'aim', 25000);
  console.log('B auto back', JSON.stringify(bb));
  console.log(logs.join('\n'));
  await b.close();
})();
