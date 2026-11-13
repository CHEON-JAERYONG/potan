// v1.2 기능 확인: 자세히보기(하루 끄기) · 상점(사기·강화·테스트 코인) · 예상 경로 · 점프 · 새 맵 · 구멍 · 코인 보상
// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-v12.js [스크린샷폴더]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SP = process.argv[2] || path.join(__dirname, 'shots');
if (!fs.existsSync(SP)) fs.mkdirSync(SP, { recursive: true });
const MAPS = (process.env.MAPS || 'meadow,canyon,tropic,skyland,ruins,autumn,lava').split(',');

let fails = 0;
const ok = (c, msg) => { console.log((c ? '  ✔ ' : '  ✘ ') + msg); if (!c) fails++; };

async function myTurn(p) {
  for (let k = 0; k < 60; k++) {
    const r = await p.evaluate(() => __pt.phase === 'aim' && __pt.world.tank(__pt.G.order[__pt.G.turnIdx]).id === __pt.me.id);
    if (r) return true; await p.waitForTimeout(500);
  }
  return false;
}
async function practice(p, theme, tank) {
  await p.goto(BASE); await p.waitForTimeout(900);
  await p.evaluate(() => { localStorage.setItem('pt.infoOff', String(Date.now() + 864e5)); });
  await p.fill('#nick', '포탄왕');
  if (tank) await p.click('.tank-card[data-k="' + tank + '"]');
  await p.click('#btnPractice'); await p.waitForTimeout(500);
  await p.click('#mapGrid .map-card[data-k="' + theme + '"]'); await p.waitForTimeout(200);
  await p.click('#btnStart'); await p.waitForTimeout(1500);
  return myTurn(p);
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));

  console.log('[1] 자세히보기 + 하루 끄기');
  await p.goto(BASE); await p.waitForTimeout(1200);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(1200);
  await p.screenshot({ path: SP + '/v12_home.png' });
  ok(await p.textContent('#homeCoins') === '500', '처음 코인 500');
  ok(await p.isVisible('.tank-card[data-k="bear"].locked'), '곰돌은 잠겨 있음(🔒)');
  await p.click('.tank-card[data-k="volt"]'); await p.waitForTimeout(500);
  ok(await p.isVisible('#tankInfo'), '탱크를 고르면 자세히보기가 뜸');
  await p.screenshot({ path: SP + '/v12_info.png' });
  await p.click('#tiOff'); await p.waitForTimeout(300);
  ok(!(await p.isVisible('#tankInfo')), '하루 끄기 누르면 닫힘');
  await p.click('.tank-card[data-k="hawk"]'); await p.waitForTimeout(400);
  ok(!(await p.isVisible('#tankInfo')), '하루 끄기 뒤엔 골라도 안 뜸');
  ok(await p.evaluate(() => __pt.me.tank) === 'hawk', '탱크는 바로 바뀜(매눈)');
  await p.click('.tank-card[data-k="mole"] .info-b'); await p.waitForTimeout(400);
  ok(await p.isVisible('#tankInfo'), 'ⓘ 누르면 언제든 볼 수 있음');
  ok((await p.textContent('#tiOff')).includes('다시 켜기'), '꺼진 상태 표시');
  await p.click('#tankInfo [data-close]'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(1000);
  await p.click('.tank-card[data-k="boom"]'); await p.waitForTimeout(400);
  ok(!(await p.isVisible('#tankInfo')), '새로고침해도 하루 동안 꺼진 채 유지');

  console.log('[2] 상점: 잠긴 탱크 · 테스트 코인 · 사기 · 강화');
  await p.click('.tank-card[data-k="bear"]'); await p.waitForTimeout(400);
  ok(await p.isVisible('#tiBtns [data-act="buy"]'), '잠긴 탱크 누르면 사기 버튼');
  await p.click('#tiBtns [data-act="buy"]'); await p.waitForTimeout(300);
  ok((await p.textContent('#toast')).includes('모자라'), '코인 부족 안내');
  await p.click('#tankInfo [data-close]'); await p.waitForTimeout(200);
  await p.click('#btnShop'); await p.waitForTimeout(500);
  await p.screenshot({ path: SP + '/v12_shop.png' });
  await p.click('#tCoins'); await p.waitForTimeout(200);
  ok(await p.textContent('#shopCoins') === '5,500', '테스트 코인 +5000');
  await p.click('.shop-tank:nth-child(7) button'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __pt.Wallet.owns('bear') && __pt.me.tank === 'bear'), '곰돌 구매 → 바로 선택');
  ok(await p.textContent('#shopCoins') === '4,000', '코인 1500 차감');
  await p.click('#shopTabs button[data-v="up"]'); await p.waitForTimeout(300);
  const upClick = async i => { await p.evaluate(i => document.querySelectorAll('.up-row')[i].querySelector('button').click(), i); await p.waitForTimeout(150); };
  await upClick(1); await upClick(1); await upClick(0);   // 체력 2단계, 공격력 1단계
  const up = await p.evaluate(() => __pt.Wallet.up('bear'));
  ok(up.hp === 2 && up.atk === 1, '강화 저장됨 ' + JSON.stringify(up));
  await p.screenshot({ path: SP + '/v12_upgrade.png' });
  await p.click('#shop [data-close]'); await p.waitForTimeout(300);
  await p.screenshot({ path: SP + '/v12_home2.png' });

  console.log('[3] 게임: 강화 반영 · 예상 경로 · 점프 · 발사');
  await p.fill('#nick', '포탄왕');
  await p.click('#btnPractice'); await p.waitForTimeout(500);
  await p.click('#mapGrid .map-card[data-k="canyon"]'); await p.click('#btnStart'); await p.waitForTimeout(1500);
  ok(await myTurn(p), '내 차례 옴');
  const t0 = await p.evaluate(() => { const t = __pt.world.tank(__pt.me.id); return { hp: t.hp, maxHp: t.maxHp, mv: t.moveMax, dm: t.dmgMul }; });
  ok(t0.maxHp === 137 && t0.mv === 96, '곰돌+강화 체력 137 · 이동 96 ' + JSON.stringify(t0));
  const pv = await p.evaluate(() => __pt.viewState().pv);
  ok(pv && pv.power === 50 && !pv.live, '예상 경로 정보(기본 파워 50)');
  await p.screenshot({ path: SP + '/v12_aim.png' });
  await p.keyboard.down('Space'); await p.waitForTimeout(900);
  const pv2 = await p.evaluate(() => __pt.viewState().pv);
  ok(pv2 && pv2.live && pv2.power > 30, '파워 모으는 중엔 그 파워로 경로 ' + Math.round(pv2 && pv2.power));
  await p.screenshot({ path: SP + '/v12_charge.png' });
  await p.keyboard.up('Space'); await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/v12_fly.png' });
  // 다음 내 차례에 점프
  ok(await myTurn(p), '다시 내 차례');
  const j0 = await p.evaluate(() => { const t = __pt.world.tank(__pt.me.id); return { x: t.x, y: t.y, f: t.fuel }; });
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(280);
  const j1 = await p.evaluate(() => { const t = __pt.world.tank(__pt.me.id); return { x: t.x, y: t.y, f: t.fuel, air: !!t.jump }; });
  await p.screenshot({ path: SP + '/v12_jump.png' });
  await p.waitForTimeout(1300);
  const j2 = await p.evaluate(() => { const t = __pt.world.tank(__pt.me.id); return { x: t.x, y: t.y, air: !!t.jump, jumped: t.jumped }; });
  ok(j1.air && j1.y < j0.y - 20 && j1.f === j0.f - 30, '점프: 공중 · 게이지 -30 ' + JSON.stringify([j0, j1]));
  ok(!j2.air && j2.jumped, '착지 ' + JSON.stringify(j2));
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(200);
  ok((await p.textContent('#toast')).includes('한 번'), '두 번째 점프는 막힘');
  // 각도: HUD 각도 칸 끌기
  const a0 = await p.evaluate(() => __pt.world.tank(__pt.me.id).angle);
  const box = await p.locator('#hud .h-angle').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 40, { steps: 8 }); await p.mouse.up();
  const a1 = await p.evaluate(() => __pt.world.tank(__pt.me.id).angle);
  ok(a1 > a0 + 8, '각도 칸 위로 끌면 각도 올라감 ' + a0 + '→' + a1);

  console.log('[4] 판 끝 → 코인 보상');
  const coins0 = await p.evaluate(() => __pt.Wallet.coins);
  for (let tries = 0; tries < 4 && !(await p.isVisible('#over')); tries++) {
    if (!(await myTurn(p))) break;
    await p.evaluate(() => {
      const w = __pt.world, me = w.tank(__pt.me.id);
      for (const t of w.tanks) if (t.bot) t.hp = 1;
      me.level = 'hard';
      const plan = Engine.aiPlan(w, me, { rnd: () => 0.5 });   // 흔들림 없이 정확히 조준(무기 1번)
      me.facing = plan.f; me.angle = plan.a; __pt.aim.power = plan.p; __pt.aim.weapon = plan.w; __pt.aim.charging = true; __pt.fireNow();
    });
    for (let k = 0; k < 16 && !(await p.isVisible('#over')); k++) await p.waitForTimeout(500);
  }
  ok(await p.isVisible('#over'), '결과 화면');
  ok(await p.isVisible('#overCoins'), '코인 보상 표시: ' + (await p.textContent('#overCoins')));
  const coins1 = await p.evaluate(() => __pt.Wallet.coins);
  ok(coins1 > coins0, '코인 늘어남 ' + coins0 + '→' + coins1);
  await p.screenshot({ path: SP + '/v12_over.png' });

  console.log('[5] 맵별 화면 + 구멍(배경이 자연스럽게 보이는지)');
  for (const th of MAPS) {
    const r = await practice(p, th, 'boom');
    if (!r) { ok(false, th + ' 내 차례 안 옴'); continue; }
    await p.evaluate(() => {
      const w = __pt.world, me = w.tank(__pt.me.id), T = w.terrain, d = me.facing;
      T.carve(me.x + d * 150, me.y + 20, 44, 0); T.carve(me.x + d * 230, me.y + 70, 56, 0); T.carve(me.x + d * 190, me.y + 150, 40, 0);
    });
    await p.waitForTimeout(700);
    await p.screenshot({ path: SP + '/v12_map_' + th + '.png' });
    ok(true, th + ' 캡처');
  }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : '콘솔 오류 없음');
  console.log(fails ? '실패 ' + fails + '개' : '모두 통과');
  await b.close();
})();
