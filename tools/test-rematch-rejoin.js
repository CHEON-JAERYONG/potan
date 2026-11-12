// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-rematch-rejoin.js [스크린샷폴더]
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
  return { scr: document.querySelector('.screen:not([hidden])').id, phase: __pt.phase, gid: G.gid, turn: G.turnNo, cur: t.id, me: __pt.me.id, host: __pt.R.host, hp: w.tanks.map(t => t.name + ':' + t.hp + (t.alive ? '' : 'x')).join(' '), cr: G.craters.length, over: G.over, overShown: !document.getElementById('over').hidden };
});
const waitFor = async (p, fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const s = await st(p); if (fn(s)) return s; await p.waitForTimeout(300); } return await st(p); };
// 현재 차례인 사람이 상대를 정확히 노려 쏨
const aimFire = p => p.evaluate(() => { const G = __pt.G, w = __pt.world, t = w.tank(G.order[G.turnIdx]); t.level = 'hard'; const plan = Engine.aiPlan(w, t, { rnd: () => 0.5 }); t.facing = plan.f; t.angle = plan.a; __pt.aim.power = plan.p; __pt.aim.weapon = 0; __pt.fireNow(); return plan; });
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ca = await b.newContext({ viewport: { width: 1280, height: 720 } }), cb = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const A = await ca.newPage(), B = await cb.newPage();
  const logs = [];
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => logs.push(n + ' PAGEERR: ' + e.message)); p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('404')) logs.push(n + ' ' + m.text()); }); }
  await A.goto(BASE); await A.fill('#nick', '재룡'); await A.click('#btnCreate');
  await A.waitForTimeout(2500);
  const url = await A.inputValue('#shareUrl');
  await B.goto(url); await B.fill('#nick', '친구'); await B.click('#btnJoin');
  for (let i = 0; i < 40; i++) { if (await A.evaluate(() => __pt.R.players.length) >= 2) break; await A.waitForTimeout(300); }
  await A.click('#btnStart');
  let a = await waitFor(A, s => s.phase === 'aim'); let bb = await waitFor(B, s => s.phase === 'aim');
  console.log('start', a.turn, a.hp, '|', bb.hp);
  // 다음 차례가 아닌 사람의 체력을 양쪽 모두 5로 (같은 값이라 동기화 유지)
  const victim = a.cur === a.me ? bb.me : a.me;
  for (const p of [A, B]) await p.evaluate(v => { __pt.world.tank(v).hp = 5; }, victim);
  const shooter = a.cur === a.me ? A : B;
  console.log('plan', JSON.stringify(await aimFire(shooter)));
  a = await waitFor(A, s => s.overShown || (s.phase === 'aim' && s.turn > 1), 30000); bb = await waitFor(B, s => s.overShown || (s.phase === 'aim' && s.turn > 1), 30000);
  console.log('after shot A', JSON.stringify(a)); console.log('after shot B', JSON.stringify(bb));
  await A.screenshot({ path: SP + '/g_over_A.png' }); await B.screenshot({ path: SP + '/g_over_B.png' });
  if (a.overShown) {
    await A.click('#btnAgain');
    a = await waitFor(A, s => s.phase === 'aim' && !s.overShown); bb = await waitFor(B, s => s.phase === 'aim' && !s.overShown && s.gid === a.gid);
    console.log('rematch A', a.gid, a.hp, '| B', bb.gid, bb.hp, bb.scr);
  }
  // B 새로고침 → 다시 연결되는지
  await B.reload(); await B.waitForTimeout(800);
  console.log('B after reload screen', await B.evaluate(() => document.querySelector('.screen:not([hidden])').id));
  // 초대 링크 상태 → 입장 버튼
  await B.click('#btnJoin');
  bb = await waitFor(B, s => s.scr === 'game' && s.phase === 'aim', 20000);
  a = await st(A);
  console.log('B rejoined', JSON.stringify(bb)); console.log('A now', JSON.stringify(a));
  // 몇 턴 진행해서 동기화 확인
  for (let k = 0; k < 3; k++) {
    a = await waitFor(A, s => s.phase === 'aim'); bb = await waitFor(B, s => s.phase === 'aim' && s.turn === a.turn);
    console.log(`turn ${a.turn} same=${a.hp === bb.hp && a.cr === bb.cr} A ${a.hp} cr${a.cr} | B ${bb.hp} cr${bb.cr}`);
    const P = a.cur === a.me ? A : B;
    await aimFire(P);
    await A.waitForTimeout(1500);
    await waitFor(A, s => s.phase === 'aim' && s.turn > a.turn || s.overShown, 30000);
  }
  // 방장 A가 나감 → B가 방장 이어받기
  await A.close();
  bb = await waitFor(B, s => s.host === s.me, 30000);
  console.log('B host after A left?', bb.host === bb.me, JSON.stringify(bb));
  // A 차례면 B 쪽에서 자동으로 넘기는지
  await B.waitForTimeout(8000);
  console.log('B later', JSON.stringify(await st(B)));
  await B.screenshot({ path: SP + '/g_B_alone.png' });
  console.log(logs.slice(0, 20).join('\n'));
  await b.close();
})();
