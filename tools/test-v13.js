// v1.3 테스트: 맵 그림 카드로 고르기(2.5초마다 다시 그려져도 안 바뀌는지) · 방장 자리 비움 → 휴대폰이 방장 하기 ·
// 쉬는 사람은 다음 판에서 빠짐 · 돌아오면 다시 참여 · 결과창에서 방장 하고 한 판 더 · 새 방 만들기 + 따라가기 · 없는 방 링크
// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/test-v13.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SP = process.argv[2] || path.join(__dirname, 'shots'); if (!fs.existsSync(SP)) fs.mkdirSync(SP, { recursive: true });

let fails = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const prep = async p => { await p.evaluate(() => { localStorage.setItem('pt.infoOff', String(Date.now() + 864e5)); }); await p.reload(); await p.waitForTimeout(500); };
const waitFor = async (p, fn, arg, ms = 15000) => { const t = Date.now() + ms; while (Date.now() < t) { if (await p.evaluate(fn, arg)) return true; await p.waitForTimeout(250); } return false; };
const R = p => p.evaluate(() => __pt.R && { code: __pt.R.code, host: __pt.R.host, theme: __pt.R.settings.theme, phase: __pt.R.phase, players: __pt.R.players.map(q => q.name + (q.rest ? '💤' : '')).join(',') });
const visible = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; }, sel);

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const pc = await b.newContext({ viewport: { width: 1280, height: 760 } });
  const phone = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const A = await pc.newPage(), B = await (await phone()).newPage(), C = await (await phone()).newPage();
  const logs = [];
  for (const [n, p] of [['A', A], ['B', B], ['C', C]]) {
    p.on('console', m => { if (m.type() === 'error') logs.push(n + ' error: ' + m.text()); });
    p.on('pageerror', e => logs.push(n + ' PAGEERR: ' + e.message));
  }

  // ---------- 1. 맵 고르기 ----------
  await A.goto(BASE); await prep(A);
  await A.fill('#nick', '재룡'); await A.click('#btnCreate');
  await waitFor(A, () => /연결/.test(document.getElementById('netState').textContent) && !/중/.test(document.getElementById('netState').textContent));
  const nCards = await A.evaluate(() => document.querySelectorAll('#mapGrid .map-card').length);
  ok(nCards === 1 + 11, '맵 카드 12장(랜덤+11) — ' + nCards);
  await A.waitForTimeout(1200);
  const drawn = await A.evaluate(() => Array.from(document.querySelectorAll('#mapGrid canvas')).filter(c => {
    if (!c.width) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colors = new Set(); for (let i = 0; i < d.length; i += 4 * 97) colors.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return colors.size > 5;
  }).length);
  ok(drawn === 11, '맵 그림 11장 그려짐 — ' + drawn);
  await A.click('#mapGrid .map-card[data-k="canyon"]');
  await A.waitForTimeout(6000);   // 심장박동(2.5초)으로 대기실이 두 번 넘게 다시 그려져도
  let ra = await R(A);
  ok(ra.theme === 'canyon', '고른 맵이 그대로 유지 — ' + ra.theme);
  ok(await A.evaluate(() => document.querySelector('#mapGrid .map-card.sel').dataset.k) === 'canyon', '고른 카드에 표시');
  await A.screenshot({ path: SP + '/v13_A_room.png' });
  const url = await A.inputValue('#shareUrl');

  for (const [p, nm] of [[B, '폰1'], [C, '폰2']]) {
    await p.goto(url); await prep(p);
    await p.fill('#nick', nm); await p.click('#btnJoin');
  }
  ok(await waitFor(A, () => __pt.R.players.length >= 3, null, 20000), '휴대폰 2대 입장');
  await B.waitForTimeout(2500);
  let rb = await R(B);
  ok(rb.theme === 'canyon', '휴대폰에도 같은 맵 — ' + rb.theme);
  ok(await B.evaluate(() => document.getElementById('mapGrid').classList.contains('locked')), '휴대폰(방장 아님)은 맵 잠김');
  await B.click('#mapGrid .map-card[data-k="snow"]', { force: true }); await B.waitForTimeout(800);
  ok((await R(A)).theme === 'canyon', '방장 아닌 사람이 눌러도 안 바뀜');
  await B.evaluate(() => document.querySelector('#mapGrid').scrollIntoView());
  await B.waitForTimeout(600);
  await B.screenshot({ path: SP + '/v13_B_room_maps.png' });
  ok(!(await visible(B, '#hostAway')), '방장이 있을 땐 자리 비움 안내 안 뜸');

  // ---------- 2. 방장 자리 비움 → 휴대폰이 방장 ----------
  await A.evaluate(() => __pt.setIdle(100));
  ok(await waitFor(B, () => !document.getElementById('hostAway').hidden, null, 8000), '방장이 90초 넘게 안 만지면 휴대폰에 "내가 방장 하기" 안내');
  await B.evaluate(() => document.getElementById('hostAway').scrollIntoView());
  await B.screenshot({ path: SP + '/v13_B_hostaway.png' });
  await B.click('#btnClaim');
  const bid = await B.evaluate(() => __pt.me.id);
  ok(await waitFor(A, id => __pt.R.host === id, bid), 'PC가 새 방장(폰1)을 받아들임');
  ok(await waitFor(C, id => __pt.R.host === id, bid), '폰2도 새 방장 확인');
  rb = await R(B); ra = await R(A);
  ok(/재룡💤/.test(rb.players), '원래 방장은 쉬는 중 — ' + rb.players);
  ok(ra.host === bid && /재룡💤/.test(ra.players), 'PC 화면도 같은 정보 — ' + ra.players);
  ok(await visible(B, '#btnStart'), '새 방장에게 시작 버튼');
  ok(/2명/.test(await B.textContent('#btnStart')), '시작 버튼 인원(쉬는 사람 빼고) — ' + await B.textContent('#btnStart'));
  await A.screenshot({ path: SP + '/v13_A_rest.png' });
  await B.click('#btnStart');
  ok(await waitFor(C, () => !!__pt.G, null, 10000), '휴대폰끼리 게임 시작');
  const gi = await C.evaluate(() => ({ theme: __pt.G.init.theme, ps: __pt.G.init.players.map(p => p.name).join(',') }));
  ok(gi.theme === 'canyon' && !/재룡/.test(gi.ps), '맵은 붉은협곡, 쉬는 PC는 빠짐 — ' + JSON.stringify(gi));
  ok(await waitFor(A, () => !!__pt.G && document.querySelector('.screen:not([hidden])').id === 'game', null, 10000), 'PC는 구경 화면');

  // PC가 돌아옴 → 다음 판부터 참여
  await A.mouse.click(640, 300);
  ok(await waitFor(B, () => !__pt.R.players.find(p => p.name === '재룡').rest, null, 8000), 'PC가 화면을 누르면 쉬는 중 풀림');

  // ---------- 3. 결과창: 방장 자리 비움 → 방장 하고 한 판 더 ----------
  // 폰2 탱크 체력을 모두 5로 → 폰1이 쏴서 끝내기
  const aimFire = p => p.evaluate(() => { const G = __pt.G, w = __pt.world, t = w.tank(G.order[G.turnIdx]); const plan = Engine.aiPlan(w, t, { rnd: () => 0.5 }); t.level = 'hard'; t.facing = plan.f; t.angle = plan.a; __pt.aim.power = plan.p; __pt.aim.weapon = 0; __pt.fireNow(); });
  const cid = await C.evaluate(() => __pt.me.id);
  let overSeen = false;
  for (let k = 0; k < 8 && !overSeen; k++) {
    for (const p of [A, B, C]) await p.evaluate(v => { const t = __pt.world && __pt.world.tank(v); if (t && t.alive) t.hp = 3; }, cid);
    const cur = await B.evaluate(() => __pt.phase === 'aim' && __pt.G.order[__pt.G.turnIdx]);
    if (cur === bid) await aimFire(B); else if (cur === cid) await aimFire(C);
    await waitFor(B, () => __pt.phase === 'over' || __pt.phase === 'aim', null, 20000);
    await B.waitForTimeout(1500);
    overSeen = await B.evaluate(() => __pt.phase === 'over');
  }
  ok(overSeen, '판 끝남(결과창)');
  if (overSeen) {
    await waitFor(C, () => __pt.phase === 'over', null, 10000);
    ok(await visible(B, '#btnAgain'), '방장(폰1)에게 한 판 더 버튼');
    await B.evaluate(() => __pt.setIdle(120));
    await C.waitForTimeout(3000);
    ok(await C.evaluate(() => document.getElementById('overAway').hidden), '결과창 뜨고 15초 안엔 방장에게 기회(안내 안 뜸)');
    ok(await waitFor(C, () => !document.getElementById('overAway').hidden, null, 25000), '결과창: 방장이 자리 비우면 폰2에게 "방장 하고 한 판 더"');
    await C.screenshot({ path: SP + '/v13_C_overaway.png' });
    await C.click('#btnClaimOver');
    ok(await waitFor(B, () => !!__pt.G && __pt.phase !== 'over' && __pt.R.host !== __pt.me.id, null, 15000), '폰2가 방장 → 바로 다음 판 시작');
    const g2 = await C.evaluate(() => __pt.G.init.players.map(p => p.name).join(','));
    ok(/재룡/.test(g2) && /폰2/.test(g2), '돌아온 PC는 다음 판에 참여, 쉬는 폰1은 빠짐 — ' + g2);
  }

  // ---------- 4. 새 방 만들기 + 따라가기 ----------
  const oldCode = (await R(C)).code;
  await B.evaluate(() => document.getElementById('btnNewRoomOver').click());   // 폰1이 새 방
  ok(await waitFor(B, c => __pt.R && __pt.R.code !== c && __pt.R.host === __pt.me.id, oldCode, 8000), '폰1이 새 방을 만듦');
  const newCode = (await R(B)).code;
  await A.waitForTimeout(3000);
  ok(await A.evaluate(() => document.getElementById('goBar').hidden), '게임 중엔 따라가기 줄이 화면을 가리지 않음');
  ok(/새 방을 만들었어요/.test(await A.textContent('#chatLog')), '게임 채팅 줄에는 알림 글만');
  // PC와 폰2의 판을 끝냄 → 결과창에서 따라가기
  for (let k = 0; k < 8; k++) {
    if (await A.evaluate(() => __pt.phase === 'over')) break;
    for (const p of [A, C]) await p.evaluate(v => { const t = __pt.world && __pt.world.tank(v); if (t && t.alive) t.hp = 3; }, cid);
    const cur = await C.evaluate(() => __pt.phase === 'aim' && __pt.G.order[__pt.G.turnIdx]);
    if (cur === cid) await aimFire(C); else if (cur) await aimFire(A);
    await waitFor(A, () => __pt.phase === 'over' || __pt.phase === 'aim', null, 20000);
    await A.waitForTimeout(1500);
  }
  ok(await waitFor(A, () => !document.getElementById('goBar').hidden, null, 8000), '판이 끝나면 PC에 "새 방 따라가기" 줄');
  await A.screenshot({ path: SP + '/v13_A_gobar.png' });
  await A.click('#goYes');
  ok(await waitFor(B, () => __pt.R.players.some(p => p.name === '재룡'), null, 15000), 'PC가 따라가기로 폰1의 새 방에 입장');
  ok((await R(A)).code === newCode && (await A.evaluate(() => location.search)).includes(newCode), 'PC 주소도 새 방 링크');
  ok((await R(B)).theme === 'canyon', '새 방도 맵 설정 그대로 — ' + (await R(B)).theme);

  // ---------- 5. 아무도 없는 방 링크 → 내가 방장 / 새 방 ----------
  const D = await (await phone()).newPage();
  await D.goto(BASE + '?r=nobody9'); await prep(D);
  await D.fill('#nick', '폰3'); await D.click('#btnJoin');
  ok(await waitFor(D, () => !document.getElementById('takeBtns').hidden, null, 15000), '아무도 없는 방: "내가 방장 하기 / 새 방 만들기" 버튼');
  await D.screenshot({ path: SP + '/v13_D_nohost.png' });
  await D.click('#btnTakeRoom');
  ok(await waitFor(D, () => __pt.R.host === __pt.me.id && __pt.R.code === 'nobody9', null, 5000), '같은 링크 그대로 방장이 됨');
  ok(await visible(D, '#shareBox'), '링크 보내기 칸 보임');

  console.log('--- 콘솔 오류 ---'); console.log(logs.length ? logs.join('\n') : '(없음)');
  console.log(fails ? '❌ 실패 ' + fails + '개' : '✅ 모두 통과');
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
