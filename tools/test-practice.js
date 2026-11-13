// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-practice.js [스크린샷폴더]
// 환경변수: BASE=주소(기본 http://127.0.0.1:8765/), CHROME=크롬 실행파일 경로
const _fs = require('fs'), _sp = process.argv[2] || require('path').join(__dirname, 'shots'); if (!_fs.existsSync(_sp)) _fs.mkdirSync(_sp, { recursive: true });
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

const SP = process.argv[2] || require('path').join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto(BASE);
  await p.evaluate(() => localStorage.setItem('pt.infoOff', String(Date.now() + 864e5)));  // v1.2: 탱크 자세히보기 팝업 끄기
  await p.waitForTimeout(2500);
  await p.screenshot({ path: SP + '/s_home.png' });
  await p.fill('#nick', '재룡');
  await p.click('.tank-card[data-k="volt"]');
  await p.click('#btnPractice');
  await p.waitForTimeout(800);
  await p.click('#botRow button[data-bot="hard"]');
  await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/s_room.png' });
  await p.click('#btnStart');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: SP + '/s_game1.png' });
  // wait for my turn and fire
  for (let k = 0; k < 40; k++) {
    const st = await p.evaluate(() => { const t = __pt.world && __pt.G ? __pt.world.tank(__pt.G.order[__pt.G.turnIdx]) : null; return { phase: __pt.phase, cur: t && t.id, me: __pt.me.id, turn: __pt.G && __pt.G.turnNo }; });
    if (st.phase === 'aim' && st.cur === st.me) {
      await p.keyboard.down('ArrowUp'); await p.waitForTimeout(400); await p.keyboard.up('ArrowUp');
      await p.keyboard.down('Space'); await p.waitForTimeout(1300); 
      await p.screenshot({ path: SP + '/s_charge.png' });
      await p.keyboard.up('Space');
      await p.waitForTimeout(700);
      await p.screenshot({ path: SP + '/s_fly.png' });
      break;
    }
    await p.waitForTimeout(1000);
  }
  await p.waitForTimeout(6000);
  await p.screenshot({ path: SP + '/s_after.png' });
  const st = await p.evaluate(() => ({ phase: __pt.phase, turn: __pt.G.turnNo, hp: __pt.world.tanks.map(t => t.name + ':' + t.hp + (t.alive ? '' : 'x')) }));
  console.log(JSON.stringify(st));
  console.log(errs.join('\n'));
  await b.close();
})();
