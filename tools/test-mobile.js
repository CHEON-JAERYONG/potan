// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-mobile.js [스크린샷폴더]
// 환경변수: BASE=주소(기본 http://127.0.0.1:8765/), CHROME=크롬 실행파일 경로
const _fs = require('fs'), _sp = process.argv[2] || require('path').join(__dirname, 'shots'); if (!_fs.existsSync(_sp)) _fs.mkdirSync(_sp, { recursive: true });
// 모바일 화면 크기별 캡처: 홈 / 대기실 / 게임
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

const SP = process.argv[2] || require('path').join(__dirname, 'shots'), TAG = process.argv[3] || 'a';
const SIZES = [
  ['p390', 390, 844],   // 아이폰 세로
  ['p360', 360, 740],   // 작은 안드로이드 세로
  ['l844', 844, 390],   // 아이폰 가로
  ['l740', 740, 360],   // 작은 안드로이드 가로
];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const [name, w, h] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${SP}/m_${TAG}_${name}_home.png` });
    await p.fill('#nick', '포탄왕');
    await p.click('#btnPractice');
    await p.waitForTimeout(700);
    await p.click('#botRow button[data-bot="normal"]');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SP}/m_${TAG}_${name}_room.png` });
    await p.click('#btnStart');
    for (let k = 0; k < 40; k++) {
      const ok = await p.evaluate(() => __pt.phase === 'aim' && __pt.world.tank(__pt.G.order[__pt.G.turnIdx]).id === __pt.me.id);
      if (ok) break; await p.waitForTimeout(600);
    }
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${SP}/m_${TAG}_${name}_game.png` });
    // 각도 막대 위로 밀기 · 화면 위아래로 쓸기 (v1.2)
    const ang = () => p.evaluate(() => __pt.world.tank(__pt.me.id).angle);
    const a0 = await ang();
    const pad = await p.locator('#tAng').boundingBox();
    const ev = (sel, type, x, y) => p.locator(sel).dispatchEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true, bubbles: true });
    const cx = pad.x + pad.width / 2, cy = pad.y + pad.height / 2;
    await ev('#tAng', 'pointerdown', cx, cy);
    for (let k = 1; k <= 6; k++) await ev('#tAng', 'pointermove', cx, cy - k * 8);
    await ev('#tAng', 'pointerup', cx, cy - 48);
    const a1 = await ang();
    await ev('#cv', 'pointerdown', w / 2, h / 2);
    for (let k = 1; k <= 8; k++) await ev('#cv', 'pointermove', w / 2 + 1, h / 2 + k * 8);
    await p.screenshot({ path: `${SP}/m_${TAG}_${name}_swipe.png` });
    await ev('#cv', 'pointerup', w / 2, h / 2 + 64);
    const a2 = await ang();
    console.log(name, 'angle pad', a0, '→', a1, '· swipe down →', a2, a1 > a0 && a2 < a1 ? 'OK' : 'FAIL');
    await p.locator('#touch button[data-k="fire"]').dispatchEvent('pointerdown', { pointerId: 1 });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SP}/m_${TAG}_${name}_charge.png` });
    await p.locator('#touch button[data-k="fire"]').dispatchEvent('pointerup', { pointerId: 1 });
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${SP}/m_${TAG}_${name}_after.png` });
    const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    console.log(name, JSON.stringify(ov), errs.join(' | '));
    await ctx.close();
  }
  await b.close();
})();
