// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-crater-fall.js [스크린샷폴더]
// 환경변수: BASE=주소(기본 http://127.0.0.1:8765/), CHROME=크롬 실행파일 경로
const _fs = require('fs'), _sp = process.argv[2] || require('path').join(__dirname, 'shots'); if (!_fs.existsSync(_sp)) _fs.mkdirSync(_sp, { recursive: true });
// 구멍 표시 + 낙하 피해 없음 확인
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

const SP = process.argv[2] || require('path').join(__dirname, 'shots'), THEME = process.argv[3] || 'snow';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto(BASE);
  await p.evaluate(() => localStorage.setItem('pt.infoOff', String(Date.now() + 864e5)));  // v1.2: 탱크 자세히보기 팝업 끄기
  await p.waitForTimeout(1200);
  await p.fill('#nick', '포탄왕');
  await p.click('.tank-card[data-k="boom"]');
  await p.click('#btnPractice');
  await p.waitForTimeout(600);
  await p.click('#mapGrid .map-card[data-k="' + THEME + '"]');
  await p.waitForTimeout(300);
  await p.click('#btnStart');
  await p.waitForTimeout(2500);
  for (let k = 0; k < 40; k++) {
    const ok = await p.evaluate(() => __pt.phase === 'aim' && __pt.world.tank(__pt.G.order[__pt.G.turnIdx]).id === __pt.me.id);
    if (ok) break; await p.waitForTimeout(700);
  }
  // 내 탱크 바로 앞쪽 땅에 큰 구멍 몇 개 + 탱크 발밑을 파서 떨어뜨리기(연습 모드라 화면 확인용)
  const r = await p.evaluate(() => {
    const w = __pt.world, me = w.tank(__pt.me.id), T = w.terrain;
    const hp0 = me.hp, y0 = me.y;
    const d = me.facing;
    T.carve(me.x + d * 120, me.y + 10, 42, 0);
    T.carve(me.x + d * 200, me.y + 60, 55, 0);
    T.carve(me.x + d * 160, me.y + 140, 38, 0);
    // 발밑 깊게
    T.carve(me.x, me.y + 30, 34, 0); T.carve(me.x, me.y + 80, 34, 0); T.carve(me.x, me.y + 130, 34, 0);
    let n = 0; while (w.stepFall(me, 1 / 120) && n < 2000) n++;
    return { hp0, hp1: me.hp, fell: Math.round(me.y - y0), alive: me.alive };
  });
  console.log('fall test', JSON.stringify(r));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: SP + '/c_' + THEME + '.png' });
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(250); await p.keyboard.up('ArrowUp');
  await p.keyboard.down('Space'); await p.waitForTimeout(1100); await p.keyboard.up('Space');
  await p.waitForTimeout(4200);
  await p.screenshot({ path: SP + '/c_' + THEME + '_shot.png' });
  console.log(errs.join('\n'));
  await b.close();
})();
