// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-online.js [스크린샷폴더]
// 환경변수: BASE=주소(기본 http://127.0.0.1:8765/), CHROME=크롬 실행파일 경로
const _fs = require('fs'), _sp = process.argv[2] || require('path').join(__dirname, 'shots'); if (!_fs.existsSync(_sp)) _fs.mkdirSync(_sp, { recursive: true });
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

const SP = process.argv[2] || require('path').join(__dirname, 'shots');
const st = p => p.evaluate(() => {
  const w = __pt.world, G = __pt.G;
  if (!w || !G) return { phase: __pt.phase, R: __pt.R && { host: __pt.R.host, n: __pt.R.players.length, phase: __pt.R.phase } };
  const t = w.tank(G.order[G.turnIdx]);
  return { phase: __pt.phase, turn: G.turnNo, cur: t.id, curName: t.name, bot: t.bot, me: __pt.me.id, hp: w.tanks.map(t => t.name + ':' + t.hp + (t.alive ? '' : 'x')).join(' '), pos: w.tanks.map(t => Math.round(t.x) + ',' + Math.round(t.y)).join(' '), cr: G.craters.length, wind: w.wind, over: G.over };
});
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ca = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const cb = await b.newContext({ viewport: { width: 900, height: 420 }, hasTouch: true, isMobile: true });
  const A = await ca.newPage(), B = await cb.newPage();
  const logs = [];
  for (const [n, p] of [['A', A], ['B', B]]) {
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(n + ' ' + m.type() + ': ' + m.text()); });
    p.on('pageerror', e => logs.push(n + ' PAGEERR: ' + e.message));
  }
  await A.goto(BASE);
  await A.fill('#nick', '재룡');
  await A.click('.tank-card[data-k="boom"]');
  await A.click('#btnCreate');
  // wait connection
  for (let i = 0; i < 30; i++) { const t = await A.textContent('#netState'); if (t.includes('연결')) { if (!t.includes('중')) break; } await A.waitForTimeout(500); }
  console.log('A net:', await A.textContent('#netState'));
  const url = await A.inputValue('#shareUrl');
  console.log('share', url);
  const t0 = Date.now();
  await B.goto(url);
  await B.waitForTimeout(800);
  await B.screenshot({ path: SP + '/o_b_home.png' });
  await B.fill('#nick', '친구');
  await B.click('.tank-card[data-k="bouncy"]');
  await B.click('#btnJoin');
  for (let i = 0; i < 40; i++) { const s = await A.evaluate(() => __pt.R.players.length); if (s >= 2) break; await A.waitForTimeout(300); }
  console.log('join took', Date.now() - t0, 'ms; A players', await A.evaluate(() => __pt.R.players.map(p => p.name).join(',')));
  await B.waitForTimeout(1500);
  console.log('B sees', await B.evaluate(() => __pt.R && __pt.R.players.map(p => p.name).join(',')), 'B net', await B.textContent('#netState'));
  await A.click('#botRow button[data-bot="easy"]');
  await A.click('#setTime button[data-v="20"]');
  await A.waitForTimeout(1500);
  await B.screenshot({ path: SP + '/o_b_room.png' });
  await A.click('#btnStart');
  await A.waitForTimeout(2500);
  console.log('A', JSON.stringify(await st(A)));
  console.log('B', JSON.stringify(await st(B)));
  await B.screenshot({ path: SP + '/o_b_game.png' });
  let shots = 0, lastTurn = 0, mism = 0;
  const tEnd = Date.now() + 150000;
  while (Date.now() < tEnd) {
    const a = await st(A), bb = await st(B);
    if (a.over && bb.over) { console.log('GAME OVER both'); break; }
    if (a.phase === 'aim' && bb.phase === 'aim' && a.turn === bb.turn && a.turn !== lastTurn) {
      lastTurn = a.turn;
      const same = a.hp === bb.hp && a.cr === bb.cr && a.wind === bb.wind;
      if (!same) mism++;
      console.log(`turn ${a.turn} cur=${a.curName} same=${same} | A ${a.hp} cr${a.cr} w${a.wind} | B ${bb.hp} cr${bb.cr} w${bb.wind}`);
      // human turns: fire with keyboard on owner page
      if (!a.bot) {
        const P = a.cur === a.me ? A : B;
        await P.waitForTimeout(600);
        // aim: angle up a bit, move a little
        if (P === B) {
          // mobile: use touch buttons
          const box = await P.locator('#touch button[data-k="fire"]').boundingBox();
          await P.locator('#touch button[data-k="right"]').dispatchEvent('pointerdown', { pointerId: 2 });
          await P.waitForTimeout(500);
          await P.locator('#touch button[data-k="right"]').dispatchEvent('pointerup', { pointerId: 2 });
          await P.locator('#touch button[data-k="fire"]').dispatchEvent('pointerdown', { pointerId: 1 });
          await P.waitForTimeout(900 + Math.random() * 700);
          if (shots === 1) await P.screenshot({ path: SP + '/o_b_charge.png' });
          await P.locator('#touch button[data-k="fire"]').dispatchEvent('pointerup', { pointerId: 1 });
        } else {
          await P.keyboard.down('ArrowUp'); await P.waitForTimeout(300); await P.keyboard.up('ArrowUp');
          await P.keyboard.down('Space'); await P.waitForTimeout(1000 + Math.random() * 700); await P.keyboard.up('Space');
        }
        shots++;
        await A.waitForTimeout(1200);
        if (shots === 2) { await A.screenshot({ path: SP + '/o_a_fly.png' }); await B.screenshot({ path: SP + '/o_b_fly.png' }); }
      }
    }
    await A.waitForTimeout(400);
  }
  console.log('mismatches', mism, 'shots', shots);
  await A.screenshot({ path: SP + '/o_a_end.png' });
  await B.screenshot({ path: SP + '/o_b_end.png' });
  console.log(logs.slice(0, 30).join('\n'));
  await b.close();
})();
