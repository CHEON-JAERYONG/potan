// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-misc.js [스크린샷폴더]
// 환경변수: BASE=주소(기본 http://127.0.0.1:8765/), CHROME=크롬 실행파일 경로
const _fs = require('fs'), _sp = process.argv[2] || require('path').join(__dirname, 'shots'); if (!_fs.existsSync(_sp)) _fs.mkdirSync(_sp, { recursive: true });
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

const SP = process.argv[2] || require('path').join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const logs = [];
  for (const tank of ['volt', 'mole', 'trio', 'hawk', 'bouncy', 'boom']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', e => logs.push(tank + ' PAGEERR: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) logs.push(tank + ' ' + m.text()); });
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('pt.infoOff', String(Date.now() + 864e5)));  // v1.2: 탱크 자세히보기 팝업 끄기
    await p.fill('#nick', '테스트');
    await p.click(`.tank-card[data-k="${tank}"]`);
    await p.click('#btnPractice');
    await p.waitForTimeout(300);
    await p.click('#btnStart');
    for (let i = 0; i < 60; i++) {
      const ok = await p.evaluate(() => { const G = __pt.G, w = __pt.world; return __pt.phase === 'aim' && w.tank(G.order[G.turnIdx]).id === __pt.me.id; });
      if (ok) break;
      await p.waitForTimeout(500);
    }
    await p.waitForTimeout(400);
    await p.evaluate(() => {
      const G = __pt.G, w = __pt.world, t = w.tank(__pt.me.id);
      t.sg = 100;
      t.level = 'hard'; const plan = Engine.aiPlan(w, t, { rnd: () => 0.5 });
      t.facing = plan.f; t.angle = plan.a;
      __pt.selectWeapon(2);
      __pt.aim.power = plan.p;
      __pt.fireNow();
    });
    for (const ms of [800, 800, 800, 800, 800]) { await p.waitForTimeout(ms); await p.screenshot({ path: `${SP}/w_${tank}_${ms}_${Date.now() % 100000}.png` }); }
    await p.waitForTimeout(2500);
    logs.push(tank + ' -> ' + await p.evaluate(() => __pt.world.tanks.map(t => t.name + ':' + t.hp).join(' ') + ' phase ' + __pt.phase));
    await p.close();
  }
  console.log(logs.join('\n'));
  await b.close();
})();
