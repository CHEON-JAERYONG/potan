/* 포탄대작전 — 지갑(코인) · 상점(탱크 사기) · 강화 · 탱크 자세히보기 창
   지금은 테스트 단계라 모든 정보를 이 브라우저(localStorage)에만 저장합니다(서버·보안 없음).
   플레이스토어 출시 때는 TEST_MODE를 끄고, 결제·광고 보상을 여기에 연결하면 됩니다. */
(function (root) {
  'use strict';
  const E = root.Engine, D = root.Draw;
  const TEST_MODE = true;                       // true: 상점 아래 "테스트 코인" 버튼 보임
  const START_COINS = 500;                      // 처음 받는 코인
  const UP_COST = [150, 300, 500, 800, 1200];   // 강화 단계별 비용(0→1 … 4→5)
  const KEY = 'pt.wallet', INFO_OFF = 'pt.infoOff', DAY = 24 * 3600 * 1000;
  const $ = id => document.getElementById(id);
  const fmt = n => Math.floor(n).toLocaleString('ko-KR');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ================= 지갑 ================= */
  function norm(w) {
    w = w && typeof w === 'object' ? w : {};
    w.coins = Math.max(0, Math.floor(+w.coins || 0));
    w.owned = Array.isArray(w.owned) ? w.owned.filter(k => E.TANKS[k]) : [];
    for (const k of E.TANK_KEYS) if (!(E.TANKS[k].price > 0) && w.owned.indexOf(k) < 0) w.owned.push(k);
    const up = {}; for (const k in (w.up || {})) if (E.TANKS[k]) up[k] = E.cleanUp(w.up[k]);
    w.up = up;
    w.paid = Array.isArray(w.paid) ? w.paid.slice(-40) : [];
    return w;
  }
  function load() {
    try { const v = localStorage.getItem(KEY); if (v) return norm(JSON.parse(v)); } catch (e) { }
    return norm({ coins: START_COINS });
  }
  let W = load();
  const listeners = [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) { }
    for (const f of listeners) { try { f(); } catch (e) { console.error(e); } }
  }
  const Wallet = {
    get coins() { return W.coins; },
    owns(k) { return W.owned.indexOf(k) >= 0; },
    up(k) { return E.cleanUp(W.up[k]); },
    upTotal(k) { const u = this.up(k); return E.UPG.keys.reduce((a, s) => a + u[s], 0); },
    upCost(k, stat) { const lv = this.up(k)[stat]; return lv >= E.UPG.max ? 0 : UP_COST[lv]; },
    buy(k) {
      const tk = E.TANKS[k];
      if (!tk) return 'no';
      if (this.owns(k)) return 'owned';
      if (W.coins < tk.price) return 'poor';
      W.coins -= tk.price; W.owned.push(k); save(); return 'ok';
    },
    upgrade(k, stat) {
      if (!this.owns(k) || E.UPG.keys.indexOf(stat) < 0) return 'no';
      const u = this.up(k);
      if (u[stat] >= E.UPG.max) return 'max';
      const cost = UP_COST[u[stat]];
      if (W.coins < cost) return 'poor';
      W.coins -= cost; u[stat]++; W.up[k] = u; save(); return 'ok';
    },
    add(n) { W.coins = Math.max(0, W.coins + Math.floor(n)); save(); },
    // 판마다 한 번만 지급(게임 아이디로 중복 방지)
    reward(gid, n) {
      if (!gid || W.paid.indexOf(gid) >= 0) return false;
      W.paid.push(gid); W.paid = W.paid.slice(-40);
      W.coins += Math.max(0, Math.floor(n)); save(); return true;
    },
    reset() { W = norm({ coins: START_COINS }); save(); },
    onChange(f) { listeners.push(f); }
  };

  /* ================= 탱크 설명 도우미 ================= */
  function traits(w) {
    const t = [];
    if (w.count) t.push(w.count + '발 ' + (w.spread ? '부채꼴로' : '연속으로'));
    if (w.split) t.push('꼭대기에서 ' + w.split.n + '개로 갈라짐');
    if (w.bounce) t.push('땅에 ' + w.bounce + '번 튕김');
    if (w.drill) t.push('땅을 ' + w.drill + '만큼 파고 들어감');
    if (w.homing) t.push('적을 따라감');
    if (w.bolt) t.push('번개 ' + w.bolt.offs.length + '번 (각 피해 ' + w.bolt.dmg + ')');
    if (w.meteor) t.push('하늘에서 포탄 ' + w.meteor.offs.length + '발 (각 피해 ' + w.meteor.dmg + ')');
    if (w.tele) t.push('맞은 자리로 순간이동');
    if (w.quake) t.push('지진 — 화면이 크게 흔들림');
    if (w.grav && w.grav > 1.05) t.push('무겁게 뚝 떨어짐');
    if (w.grav && w.grav < 0.95) t.push('곧게 멀리 날아감');
    if (w.wind != null && w.wind < 1) t.push('바람 영향 ' + Math.round(w.wind * 100) + '%');
    if (!t.length) t.push('기본 포탄');
    return t;
  }
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const DIFF = ['', '쉬워요', '보통', '어려워요'];

  /* ================= 화면 ================= */
  let api = null, infoK = null, shopTab = 'tank', upK = null, anim = 0, animT = 0;
  function infoOff() { try { return Date.now() < +(localStorage.getItem(INFO_OFF) || 0); } catch (e) { return false; } }
  function setInfoOff(on) { try { localStorage.setItem(INFO_OFF, on ? String(Date.now() + DAY) : '0'); } catch (e) { } }
  function open(id) { $(id).hidden = false; startAnim(); }
  function close(id) { $(id).hidden = true; if ($('tankInfo').hidden && $('shop').hidden) stopAnim(); }
  function startAnim() {
    if (anim) return;
    const tick = t => {
      animT = t / 1000;
      if (!$('tankInfo').hidden && infoK) {
        const cv = $('tiCv');
        D.preview(cv, infoK, api.color(), { angle: 32 + Math.sin(animT * 1.6) * 18, time: animT, zoom: 54, ground: 0.84, active: true });
      }
      anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  }
  function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = 0; }

  // auto=true: 탱크를 고를 때 자동으로 뜨는 경우(하루 끄기면 안 뜸)
  function showInfo(k, auto) {
    if (!E.TANKS[k]) return;
    if (auto && infoOff()) return;
    infoK = k;
    renderInfo();
    open('tankInfo');
  }
  function renderInfo() {
    const k = infoK, tk = E.TANKS[k], own = Wallet.owns(k), cur = api.tank() === k;
    const up = Wallet.up(k), st = E.tankStats(k, up), base = E.tankStats(k, null);
    $('tiName').innerHTML = esc(tk.name) + ' <span class="tr">' + esc(tk.role) + '</span>' + (tk.price ? (own ? ' <span class="badge own">보유</span>' : ' <span class="badge lock">🔒 상점</span>') : '');
    $('tiDesc').textContent = tk.desc;
    $('tiDiff').innerHTML = '난이도 <b>' + stars(tk.diff || 2) + '</b> ' + DIFF[tk.diff || 2];
    const bar = (label, val, max, extra) => '<div class="ti-stat"><span>' + label + '</span><i><b style="width:' + Math.min(100, val / max * 100) + '%"></b></i><em>' + extra + '</em></div>';
    $('tiStats').innerHTML =
      bar('❤️ 체력', st.maxHp, 160, st.maxHp + (st.maxHp !== base.maxHp ? ' <small>(+' + (st.maxHp - base.maxHp) + ' 강화)</small>' : '') + (tk.hp ? ' <small>기본 +' + tk.hp + '</small>' : '')) +
      bar('👣 이동', st.moveMax, 200, st.moveMax + (st.moveMax !== base.moveMax ? ' <small>(+' + (st.moveMax - base.moveMax) + ')</small>' : '') + (tk.move && tk.move < 1 ? ' <small>조금 느림</small>' : '')) +
      bar('💥 공격', st.dmgMul * 100, 125, '×' + st.dmgMul.toFixed(2)) +
      bar('⭐ 필살', st.sgTurn, 40, '턴마다 +' + st.sgTurn);
    $('tiWeapons').innerHTML = tk.weapons.map((w, i) =>
      '<div class="ti-w' + (i === 2 ? ' ss' : '') + '"><span class="k">' + (i === 2 ? '★' : i + 1) + '</span><div><b>' + esc(w.name) + '</b> <span class="muted">피해 ' + w.dmg + (w.count ? '×' + w.count : '') + ' · 범위 ' + w.r + '</span>' +
      '<small>' + traits(w).map(esc).join(' · ') + (i === 2 ? ' · 필살 게이지 100%일 때' : '') + '</small></div></div>').join('');
    // 버튼
    const b = [];
    if (!own) b.push('<button class="btn gold" data-act="buy">💰 ' + fmt(tk.price) + ' 코인으로 사기</button>');
    else if (!cur) b.push('<button class="btn gold" data-act="pick">이 탱크로 할게요</button>');
    if (own) b.push('<button class="btn" data-act="up">⚙ 강화하기</button>');
    b.push('<button class="btn" data-act="ok">확인</button>');
    $('tiBtns').innerHTML = b.join('');
    $('tiCoins').textContent = fmt(Wallet.coins);
    const off = infoOff();
    $('tiOff').textContent = off ? '🔔 자세히보기 다시 켜기 (지금은 하루 동안 꺼짐)' : '🔕 자세히보기 하루 동안 끄기';
    $('tiOff').classList.toggle('on', off);
  }
  function buy(k) {
    const r = Wallet.buy(k), tk = E.TANKS[k];
    if (r === 'ok') { api.sfx('buy'); api.toast('🎉 ' + tk.name + ' 탱크를 샀어요!'); api.setTank(k); return true; }
    if (r === 'poor') { api.toast('코인이 모자라요 (' + fmt(tk.price - Wallet.coins) + ' 더 필요)'); return false; }
    return false;
  }

  function showShop(tab, k) {
    shopTab = tab || shopTab || 'tank';
    upK = k && Wallet.owns(k) ? k : (Wallet.owns(api.tank()) ? api.tank() : 'boom');   // 강화 탭은 지금 쓰는 탱크부터
    renderShop();
    open('shop');
  }
  function renderShop() {
    $('shopCoins').textContent = fmt(Wallet.coins);
    for (const b of $('shopTabs').querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === shopTab);
    $('shopTest').hidden = !TEST_MODE;
    const body = $('shopBody');
    body.innerHTML = '';
    if (shopTab === 'tank') {
      const g = document.createElement('div'); g.className = 'shop-grid';
      for (const k of E.TANK_KEYS) {
        const tk = E.TANKS[k], own = Wallet.owns(k), cur = api.tank() === k;
        const c = document.createElement('div');
        c.className = 'shop-tank' + (own ? ' own' : '') + (cur ? ' cur' : '');
        c.innerHTML = '<canvas></canvas><div class="st-n">' + esc(tk.name) + ' <span class="tr">' + esc(tk.role) + '</span></div>' +
          '<div class="st-f">' + (own ? (cur ? '✔ 사용 중' : (tk.price ? '보유 중' : '기본 탱크')) : '<button class="btn small gold">💰 ' + fmt(tk.price) + '</button>') + '</div>';
        c.onclick = e => {
          if (e.target.closest('button')) { if (buy(k)) renderShop(); return; }
          showInfo(k, false);
        };
        g.appendChild(c);
        requestAnimationFrame(() => D.preview(c.querySelector('canvas'), k, api.color(), { angle: 30, zoom: 46 }));
      }
      body.appendChild(g);
      const tip = document.createElement('p'); tip.className = 'shop-tip';
      tip.textContent = '💡 게임을 하면 코인이 쌓여요 — 참가 · 입힌 피해 · K.O. · 승리';
      body.appendChild(tip);
    } else {
      const chips = document.createElement('div'); chips.className = 'up-chips';
      for (const k of E.TANK_KEYS) {
        if (!Wallet.owns(k)) continue;
        const b = document.createElement('button');
        b.className = 'up-chip' + (k === upK ? ' on' : '');
        b.innerHTML = '<canvas></canvas><span>' + esc(E.TANKS[k].name) + (Wallet.upTotal(k) ? ' <small>+' + Wallet.upTotal(k) + '</small>' : '') + '</span>';
        b.onclick = () => { upK = k; api.sfx('click'); renderShop(); };
        chips.appendChild(b);
        requestAnimationFrame(() => D.preview(b.querySelector('canvas'), k, api.color(), { angle: 30, zoom: 50 }));
      }
      body.appendChild(chips);
      const u = Wallet.up(upK), st = E.tankStats(upK, u);
      const sum = document.createElement('div'); sum.className = 'up-sum';
      sum.innerHTML = '<b>' + esc(E.TANKS[upK].name) + '</b> — 체력 ' + st.maxHp + ' · 이동 ' + st.moveMax + ' · 피해 ×' + st.dmgMul.toFixed(2) + ' · 필살 +' + st.sgTurn + '/턴';
      body.appendChild(sum);
      for (const s of E.UPG.keys) {
        const inf = E.UPG.info[s], lv = u[s], cost = Wallet.upCost(upK, s);
        const row = document.createElement('div'); row.className = 'up-row';
        row.innerHTML = '<div class="up-i">' + inf.icon + '</div><div class="up-t"><b>' + inf.name + '</b><small>' + inf.per + ' (단계마다)</small><div class="pips">' +
          Array.from({ length: E.UPG.max }, (_, i) => '<i class="' + (i < lv ? 'on' : '') + '"></i>').join('') + '</div></div>' +
          (lv >= E.UPG.max ? '<button class="btn small" disabled>MAX</button>' : '<button class="btn small gold"' + (Wallet.coins < cost ? ' data-poor="1"' : '') + '>💰 ' + fmt(cost) + '</button>');
        const btn = row.querySelector('button');
        if (lv < E.UPG.max) btn.onclick = () => {
          const r = Wallet.upgrade(upK, s);
          if (r === 'ok') { api.sfx('coin'); api.toast(E.TANKS[upK].name + ' ' + inf.name + ' ' + (lv + 1) + '단계!'); api.changed(); renderShop(); }
          else if (r === 'poor') api.toast('코인이 모자라요 (' + fmt(cost - Wallet.coins) + ' 더 필요)');
        };
        body.appendChild(row);
      }
      const tip = document.createElement('p'); tip.className = 'shop-tip';
      tip.textContent = '강화는 탱크마다 따로 저장돼요. 온라인 대전에서도 그대로 적용돼요.';
      body.appendChild(tip);
    }
  }

  function init(a) {
    api = a;
    // 자세히보기 창
    $('tiBtns').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'buy') { if (buy(infoK)) renderInfo(); }
      else if (act === 'pick') { api.setTank(infoK); close('tankInfo'); }
      else if (act === 'up') { close('tankInfo'); showShop('up', infoK); }
      else close('tankInfo');
    });
    $('tiOff').onclick = () => {
      const off = !infoOff();
      setInfoOff(off);
      api.toast(off ? '자세히보기를 하루 동안 끌게요 (탱크 옆 ⓘ로는 언제든 볼 수 있어요)' : '자세히보기를 다시 켰어요');
      if (off) close('tankInfo'); else renderInfo();
    };
    // 상점 창
    for (const b of $('shopTabs').querySelectorAll('button')) b.onclick = () => {
      shopTab = b.dataset.v; api.sfx('click');
      if (shopTab === 'up' && Wallet.owns(api.tank())) upK = api.tank();
      renderShop();
    };
    $('tCoins').onclick = () => { Wallet.add(5000); api.sfx('coin'); api.toast('🧪 테스트 코인 +5,000'); renderShop(); };
    $('tReset').onclick = () => {
      if ($('tReset').dataset.arm !== '1') { $('tReset').dataset.arm = '1'; $('tReset').textContent = '정말 초기화? 한 번 더'; setTimeout(() => { $('tReset').dataset.arm = ''; $('tReset').textContent = '처음 상태로'; }, 2500); return; }
      $('tReset').dataset.arm = ''; $('tReset').textContent = '처음 상태로';
      Wallet.reset(); setInfoOff(false);
      if (!Wallet.owns(api.tank())) api.setTank('boom');
      api.toast('🧪 코인·탱크·강화를 처음 상태로 돌렸어요'); renderShop();
    };
    for (const m of ['tankInfo', 'shop']) {
      $(m).addEventListener('click', e => { if (e.target === $(m) || e.target.closest('[data-close]')) close(m); });
    }
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('tankInfo').hidden) close('tankInfo'); else if (!$('shop').hidden) close('shop');
    });
    Wallet.onChange(() => { if (!$('shop').hidden) $('shopCoins').textContent = fmt(Wallet.coins); if (!$('tankInfo').hidden) $('tiCoins').textContent = fmt(Wallet.coins); });
  }

  root.Shop = { Wallet, init, showInfo, showShop, traits, fmt, isOpen: () => !$('tankInfo').hidden || !$('shop').hidden, TEST_MODE };
})(window);
