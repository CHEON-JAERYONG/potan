/* 포탄대작전 — 게임 엔진: 지형 · 탱크 · 무기 · 물리 · 컴퓨터 AI
   화면 그리기(draw.js)와 통신(app.js)은 따로 있습니다. 여기 코드는 같은 입력이면 어느 기기에서나 같은 결과가 나오도록
   고정 시간 간격(1/120초)으로만 움직이고, 안에서 난수를 쓰지 않습니다. */
(function (root) {
  'use strict';

  const C = {
    H: 1000,            // 월드 높이
    G: 430,             // 중력 (px/s²)
    VMAX: 1050,         // 파워 100일 때 발사 속도
    WIND_ACC: 11,       // 바람 1칸당 가속
    DT: 1 / 120,
    TANK_R: 15,         // 탱크 피격 반경
    TANK_CY: 13,        // 피격 중심 높이(바닥 기준)
    PIVOT: 20,          // 포신 회전축 높이
    BARREL: 24,         // 포신 길이
    MOVE_MAX: 120,      // 한 턴 이동량(px)
    MOVE_SPEED: 62,
    CLIMB: 5,           // 1px 이동에 오를 수 있는 높이
    SG_TURN: 25,        // 턴마다 필살 게이지
    SG_HURT: 0.6,       // 맞은 피해당 필살 게이지
    HP: 100,
    JUMP_COST: 30,      // 점프 한 번에 쓰는 이동 게이지 (한 턴에 한 번)
    JUMP_VX: 82,
    JUMP_VY: 240
  };

  /* ---------- 테마(맵) ---------- */
  const THEMES = {
    meadow: { name: '초원', sky: ['#4aa8ff', '#bfe8ff'], grass: '#7ee05a', grass2: '#4cb63a', dirt: ['#b57a43', '#9c6535', '#86542b'], deep: '#4a2c16', pebble: '#c99a66', pebble2: '#6e4422', far: '#a7cbe6', near: '#86bfa6', water: '#2f86e0', cloud: 'rgba(255,255,255,.92)', amb: 'leaf' , aim: '#ff3d8b' },
    desert: { name: '사막', sky: ['#ff9f5a', '#ffe3a6'], grass: '#ffe08a', grass2: '#f0c060', dirt: ['#e3a85c', '#d0944a', '#bb7f3c'], deep: '#6e3f17', pebble: '#f3c98a', pebble2: '#9a6430', far: '#f0bf92', near: '#dda274', water: '#2fa3c4', cloud: 'rgba(255,248,235,.85)', amb: 'dust' , aim: '#1f5fff' },
    snow: { name: '설원', sky: ['#7fb9ea', '#eef8ff'], grass: '#ffffff', grass2: '#dcecf8', dirt: ['#8ea3ba', '#7a8fa7', '#687c93'], deep: '#2e3b4d', pebble: '#b8c8d8', pebble2: '#4e5f73', far: '#cfe0f0', near: '#a8c3dc', water: '#3b8bc8', cloud: 'rgba(255,255,255,.95)', amb: 'snow' , aim: '#ff2d2d' },
    lava: { name: '화산', sky: ['#1d0b26', '#7a2622'], grass: '#4a4344', grass2: '#2f2a2b', dirt: ['#5c3b33', '#4b2e27', '#3b231d'], deep: '#120806', pebble: '#ff7a2a', pebble2: '#2a1a16', far: '#4a1a2c', near: '#35121c', water: '#ff5a1a', cloud: 'rgba(120,70,80,.55)', amb: 'ember', night: true, lava: true , aim: '#5ff8ff' },
    candy: { name: '과자나라', sky: ['#ff9fcf', '#fff0f8'], grass: '#ffa3d1', grass2: '#ff6fb3', dirt: ['#d39563', '#c28152', '#a86b42'], deep: '#5b3420', pebble: '#fff1a8', pebble2: '#7ad6ff', far: '#f6c3df', near: '#eaa7ca', water: '#a07bff', cloud: 'rgba(255,255,255,.95)', amb: 'sprinkle' , aim: '#0a9bd8' },
    night: { name: '달밤', sky: ['#0a1238', '#2d3f86'], grass: '#59d6a8', grass2: '#2f9e7c', dirt: ['#4f5b7a', '#434e6b', '#38425b'], deep: '#151a2b', pebble: '#8a96b8', pebble2: '#262d44', far: '#26336e', near: '#1d2856', water: '#2c5fd0', cloud: 'rgba(200,210,255,.35)', amb: 'firefly', night: true , aim: '#ffe14d' },
    // ---- v1.2 새 맵: 지형 모양(shape)도 서로 다름 ----
    canyon: { name: '붉은협곡', shape: 'canyon', sky: ['#ff8a4a', '#ffdcaa'], grass: '#e2a86c', grass2: '#c98a52', dirt: ['#c4673a', '#b05a32', '#9a4c2a'], deep: '#4a2010', pebble: '#ecb98e', pebble2: '#7a3a1c', far: '#eaa97e', near: '#d08658', water: '#3a8fb0', cloud: 'rgba(255,240,225,.8)', amb: 'dust' , aim: '#1f5fff' },
    tropic: { name: '열대섬', shape: 'islands', sea: 150, sky: ['#22b0f2', '#c8f4ff'], grass: '#62d86a', grass2: '#2fae55', dirt: ['#f1d08a', '#e3bd72', '#d3a95c'], deep: '#8a6430', pebble: '#fff2c8', pebble2: '#c9a066', far: '#a6dcf0', near: '#71c9c4', water: '#13a3c9', cloud: 'rgba(255,255,255,.95)', amb: 'leaf' , aim: '#ff2d6e' },
    skyland: { name: '하늘섬', shape: 'floating', sky: ['#4f7ff5', '#e6eeff'], grass: '#90f07c', grass2: '#4fc46a', dirt: ['#a98ed6', '#9479c4', '#7f65ad'], deep: '#2e2050', pebble: '#ddd0ff', pebble2: '#4b3a7a', far: '#c9d7ff', near: '#aabdf2', water: '#3f6ad8', cloud: 'rgba(255,255,255,.96)', amb: 'mote', bgLow: 170 , aim: '#ff6a00' },
    ruins: { name: '폐허도시', shape: 'ruins', sky: ['#545b6b', '#d2bfa6'], grass: '#8d927b', grass2: '#70755f', dirt: ['#7d756b', '#6e675e', '#5f5951'], deep: '#2a2724', pebble: '#a39a8e', pebble2: '#3d3833', far: '#8d909c', near: '#6c707e', water: '#4f7f86', cloud: 'rgba(235,228,215,.6)', amb: 'dust', bg: 'city', bld: ['#a59684', '#968878', '#b3a592'], win: '#363a46', winLit: '#ffd87a' , aim: '#ffd21f' },
    autumn: { name: '단풍언덕', shape: 'terrace', sky: ['#ffa95a', '#ffeccb'], grass: '#ff8a3d', grass2: '#e0602a', dirt: ['#9a6a45', '#87583a', '#744a30'], deep: '#3a2216', pebble: '#d7a676', pebble2: '#5a3620', far: '#ecbb8c', near: '#cf9463', water: '#3a8ad0', cloud: 'rgba(255,250,240,.9)', amb: 'maple' , aim: '#1f5fff' }
  };
  const THEME_KEYS = Object.keys(THEMES);

  /* ---------- 탱크와 무기 ----------
     무기 속성: dmg 피해, r 폭발 반경, speed 속도배율, grav 중력배율, wind 바람배율, count 발사 수,
     interval 연사 간격(초), spread 부채각(도), bounce 튕김 수, elastic 탄성, drill 굴착 거리,
     homing 유도(라디안/초), split 꼭대기에서 분열, bolt 낙뢰, quake 지진(화면 흔들림) */
  const TANKS = {
    boom: {
      name: '쿵쾅', role: '균형형', diff: 1, desc: '묵직한 대포 한 방. 처음이라면 이 탱크!',
      weapons: [
        { name: '포탄', dmg: 28, r: 30, color: '#3b3f46', size: 5 },
        { name: '중포탄', dmg: 36, r: 36, grav: 1.25, wind: 0.7, color: '#24272c', size: 7 },
        { name: '메가톤', dmg: 55, r: 66, color: '#ff4d2e', size: 9, glow: '#ffb02e' }
      ]
    },
    trio: {
      name: '삼총사', role: '연사형', diff: 1, desc: '작은 탄을 여러 발. 조금씩 확실하게 깎아요.',
      weapons: [
        { name: '3연사', dmg: 12, r: 18, count: 3, interval: 0.16, color: '#ffc928', size: 4 },
        { name: '부채탄', dmg: 13, r: 20, count: 3, spread: 5, color: '#ff9f1a', size: 4 },
        { name: '분열탄', dmg: 15, r: 24, split: { n: 6, spread: 60 }, color: '#ff5ad1', size: 7, glow: '#ffa6ea' }
      ]
    },
    mole: {
      name: '두더지', role: '굴착형', diff: 2, desc: '땅을 파고 들어가서 터져요. 숨은 적도 잡아요.',
      weapons: [
        { name: '굴착탄', dmg: 26, r: 26, drill: 70, color: '#8a8f99', size: 5, drillShape: 1 },
        { name: '지진탄', dmg: 19, r: 54, quake: 1, color: '#a86a3a', size: 7 },
        { name: '대굴착', dmg: 48, r: 44, drill: 190, color: '#5b6170', size: 8, glow: '#c7ccd8', drillShape: 1 }
      ]
    },
    volt: {
      name: '번개', role: '낙뢰형', diff: 2, desc: '바람을 덜 타고, 맞은 자리에 번개를 불러요.',
      weapons: [
        { name: '전기탄', dmg: 25, r: 24, wind: 0.45, color: '#38d6ff', size: 5, glow: '#b8f1ff' },
        { name: '낙뢰탄', dmg: 9, r: 14, wind: 0.6, bolt: { offs: [0], dmg: 22, r: 22 }, color: '#ffe23a', size: 4 },
        { name: '삼중낙뢰', dmg: 12, r: 18, wind: 0.6, bolt: { offs: [-58, 0, 58], dmg: 23, r: 26 }, color: '#fff35a', size: 7, glow: '#fffbb0' }
      ]
    },
    bouncy: {
      name: '통통', role: '튕김형', diff: 3, desc: '땅에 통통 튕기다 터져요. 언덕 뒤도 노려요.',
      weapons: [
        { name: '통통탄', dmg: 27, r: 28, bounce: 2, color: '#ff7ab8', size: 6 },
        { name: '젤리탄', dmg: 18, r: 22, bounce: 5, elastic: 0.8, color: '#9b6bff', size: 5 },
        { name: '왕통통', dmg: 23, r: 28, bounce: 2, count: 3, spread: 7, color: '#ff4fa0', size: 7, glow: '#ffc2e0' }
      ]
    },
    hawk: {
      name: '매눈', role: '추적형', diff: 1, desc: '적을 따라가는 유도탄. 대신 위력은 조금 약해요.',
      weapons: [
        { name: '추적탄', dmg: 22, r: 22, homing: 1.5, color: '#5ae36b', size: 5, missile: 1 },
        { name: '직사포', dmg: 27, r: 20, grav: 0.65, wind: 0.25, color: '#2f9e44', size: 4 },
        { name: '추적미사일', dmg: 20, r: 22, count: 3, interval: 0.22, homing: 2.6, color: '#7dff8e', size: 6, glow: '#cfffd5', missile: 1 }
      ]
    },
    // ---- 상점에서 사는 탱크 (price: 코인) ----
    bear: {
      name: '곰돌', role: '튼튼형', diff: 1, price: 1500, hp: 25, move: 0.8,
      desc: '체력이 25 더 많은 든든한 곰. 대신 조금 느려요.',
      weapons: [
        { name: '바위탄', dmg: 30, r: 30, grav: 1.1, color: '#8a7a6a', size: 6, rock: 1 },
        { name: '박격포', dmg: 40, r: 34, grav: 1.6, speed: 1.22, wind: 0.5, color: '#4a4f3a', size: 7 },
        { name: '포격지원', dmg: 20, r: 24, color: '#ff8a3a', size: 7, glow: '#ffc27a', meteor: { offs: [-48, 0, 48], dmg: 24, r: 30, gap: 0.2 } }
      ]
    },
    fire: {
      name: '폭죽', role: '불꽃형', diff: 2, price: 2000,
      desc: '하늘 꼭대기에서 펑! 여러 갈래로 터져 넓게 맞혀요.',
      weapons: [
        { name: '폭죽탄', dmg: 13, r: 20, split: { n: 3, spread: 45 }, color: '#ff3d6e', size: 6, glow: '#ffb3c8' },
        { name: '로켓불꽃', dmg: 28, r: 26, speed: 1.12, grav: 0.85, wind: 0.5, color: '#ffb02e', size: 5, missile: 1 },
        { name: '대폭죽', dmg: 14, r: 24, split: { n: 8, spread: 115 }, color: '#7a5aff', size: 8, glow: '#d7c8ff' }
      ]
    },
    magic: {
      name: '요술', role: '순간이동형', diff: 3, price: 3000,
      desc: '맞은 자리로 순간이동! 하늘에서 별똥별도 불러요.',
      weapons: [
        { name: '별빛탄', dmg: 26, r: 26, wind: 0.8, color: '#ffe46a', size: 5, glow: '#fff6b8', star: 1 },
        { name: '순간이동', dmg: 10, r: 18, tele: 1, color: '#c77dff', size: 6, glow: '#ecd2ff' },
        { name: '유성우', dmg: 14, r: 20, color: '#a46bff', size: 7, glow: '#e2cbff', meteor: { offs: [-120, -80, -40, 0, 40, 80, 120], dmg: 15, r: 22, gap: 0.11, color: '#c9a2ff', glow: '#efe2ff' } }
      ]
    }
  };
  const TANK_KEYS = Object.keys(TANKS);

  const ITEMS = [
    { key: 'heal', name: '회복', icon: '❤️', desc: '체력 +30 (바로 써요)' },
    { key: 'double', name: '2연발', icon: '✌️', desc: '이번 턴에 두 번 쏴요' },
    { key: 'power', name: '강화탄', icon: '💥', desc: '피해 1.4배 · 폭발 범위 1.15배' },
    { key: 'calm', name: '무풍', icon: '🍃', desc: '이번 발사는 바람 0' }
  ];

  const COLORS = ['#ff5a5a', '#3d8bff', '#34c96a', '#ffbf2e', '#a96bff', '#ff8a3d', '#22c9d1', '#ff6fb5'];

  /* ---------- 강화(업그레이드) — 탱크마다 4가지, 0~5단계 ----------
     게임 시작 메시지에 각자의 강화 단계가 들어가므로 모든 기기가 같은 값으로 계산합니다. */
  const UPG = {
    keys: ['atk', 'hp', 'move', 'sg'], max: 5,
    info: {
      atk: { name: '공격력', icon: '💥', per: '피해 +4%' },
      hp: { name: '체력', icon: '❤️', per: '최대 체력 +6' },
      move: { name: '이동력', icon: '👣', per: '이동 게이지 +16' },
      sg: { name: '필살 충전', icon: '⭐', per: '턴마다 필살 +3' }
    }
  };
  function cleanUp(u) {
    const o = {};
    for (const k of UPG.keys) { const v = u ? Math.floor(+u[k] || 0) : 0; o[k] = v < 0 ? 0 : v > UPG.max ? UPG.max : v; }
    return o;
  }
  function tankStats(type, up) {
    const tk = TANKS[type] || TANKS.boom, u = cleanUp(up);
    return {
      maxHp: C.HP + (tk.hp || 0) + u.hp * 6,
      dmgMul: 1 + u.atk * 0.04,
      moveMax: Math.round(C.MOVE_MAX * (tk.move || 1)) + u.move * 16,
      sgTurn: C.SG_TURN + u.sg * 3
    };
  }

  /* ---------- 도구 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function hexRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ================= 지형 ================= */
  class Terrain {
    constructor(W, H, seed, theme, headless) {
      this.W = W; this.H = H; this.seed = seed >>> 0; this.theme = theme;
      this.mask = new Uint8Array(W * H);
      this.canvas = null; this.ctx = null; this.ver = 0; this.unlit = null; this.bld = null; this.base = null;
      if (!headless && typeof document !== 'undefined') {
        this.canvas = document.createElement('canvas');
        this.canvas.width = W; this.canvas.height = H;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
      }
    }
    cloneHeadless() {
      const t = new Terrain(this.W, this.H, this.seed, this.theme, true);
      t.mask.set(this.mask);
      return t;
    }
    solid(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || x >= this.W || y < 0) return false;
      if (y >= this.H) return true;
      return this.mask[y * this.W + x] === 1;
    }
    topAt(x) {
      x = clamp(Math.floor(x), 0, this.W - 1);
      const W = this.W, m = this.mask;
      for (let y = 0; y < this.H; y++) if (m[y * W + x]) return y;
      return this.H;
    }
    normal(x, y) {
      let nx = 0, ny = 0;
      const R = 5;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        if (this.solid(x + dx, y + dy)) { nx -= dx; ny -= dy; }
      }
      const l = Math.hypot(nx, ny);
      return l < 1e-6 ? { x: 0, y: -1 } : { x: nx / l, y: ny / l };
    }

    /* ----- 지형 만들기: 맵마다 모양이 다름 (모두 seed로만 결정 → 기기마다 같음) ----- */
    hills(rng, amp) {
      const W = this.W, H = this.H, hs = new Float32Array(W), waves = [];
      for (let i = 0; i < 5; i++) {
        waves.push({
          k: Math.PI * 2 / W * (1 + i * 1.35 + rng() * 1.4),
          a: H * 0.1 / (i * 0.75 + 1) * (0.5 + rng()) * amp,
          p: rng() * Math.PI * 2
        });
      }
      for (let x = 0; x < W; x++) {
        let h = H * 0.6;
        for (const w of waves) h += w.a * Math.sin(w.k * x + w.p);
        hs[x] = h;
      }
      const nb = 3 + Math.floor(rng() * 4);
      for (let b = 0; b < nb; b++) {
        const cx = rng() * W, wd = 70 + rng() * 210, a = (rng() - 0.42) * 230 * amp;
        const x0 = Math.max(0, Math.floor(cx - wd * 3)), x1 = Math.min(W - 1, Math.ceil(cx + wd * 3));
        for (let x = x0; x <= x1; x++) { const u = (x - cx) / wd; hs[x] -= a * Math.exp(-u * u); }
      }
      for (let x = 0; x < W; x++) hs[x] = clamp(hs[x], H * 0.34, H * 0.86);
      return hs;
    }
    terrace(hs, step, ramp) {
      const sm = t => t * t * (3 - 2 * t);
      for (let x = 0; x < hs.length; x++) {
        const v = hs[x] / step, f = v - Math.floor(v);
        hs[x] = (Math.floor(v) + sm(clamp((f - (1 - ramp)) / ramp, 0, 1))) * step;
      }
    }
    fillCols(hs) {
      const W = this.W, H = this.H, m = this.mask;
      for (let x = 0; x < W; x++) {
        const top = Math.max(0, Math.round(hs[x]));
        for (let y = top; y < H; y++) m[y * W + x] = 1;
      }
    }
    // 떠 있는 섬(아래가 뾰족한 덩어리)
    blob(cx, w, top, thick, rough) {
      const W = this.W, H = this.H, m = this.mask;
      for (let dx = Math.ceil(-w / 2); dx <= Math.floor(w / 2); dx++) {
        const x = Math.round(cx + dx); if (x < 0 || x >= W) continue;
        const u = Math.abs(dx / (w / 2));
        const t = Math.round(top + Math.pow(u, 4) * 14);
        const b = Math.round(top + 8 + thick * (1 - Math.pow(u, 1.6)) * (0.82 + 0.18 * Math.sin(dx * 0.31 + rough)));
        for (let y = Math.max(0, t); y <= Math.min(H - 1, b); y++) m[y * W + x] = 1;
      }
    }

    generate() {
      const W = this.W, H = this.H, m = this.mask, rng = mulberry32(this.seed);
      const th = THEMES[this.theme] || THEMES.meadow, shape = th.shape || 'hills';
      m.fill(0); this.bld = null; this.base = null;
      if (shape === 'islands') {
        // 바다 위 섬 여러 개 — 섬 사이는 물이라 걸어서는 못 건넘(점프!)
        const sea = H - (th.sea || 40), hs = new Float32Array(W).fill(H - 60);
        const n = Math.max(4, Math.floor(W / 380));
        for (let i = 0; i < n; i++) {
          const cx = W * (i + 0.5) / n + (rng() - 0.5) * W / n * 0.3, hw = 95 + rng() * 75, peak = 140 + rng() * 150, ph = rng() * 6;
          for (let x = Math.max(0, Math.floor(cx - hw * 1.6)); x <= Math.min(W - 1, Math.ceil(cx + hw * 1.6)); x++) {
            const u = (x - cx) / hw, au = Math.abs(u), prof = Math.max(0, 1 - u * u);
            // 물 위는 둥근 섬, 물 밑은 바닥까지 비스듬히 이어지는 비탈
            const h = au <= 1 ? sea + 26 - peak * Math.pow(prof, 0.7) + 9 * Math.sin(x * 0.045 + ph) * prof : sea + 26 + (au - 1) * 150;
            if (h < hs[x]) hs[x] = h;
          }
        }
        this.base = hs; this.fillCols(hs);
      } else if (shape === 'floating') {
        // 바닥 없이 하늘에 뜬 섬들 — 떨어지면 저 아래 바다로 풍덩
        const n = Math.max(5, Math.floor(W / 250));
        for (let i = 0; i < n; i++) {
          const cx = W * (i + 0.5) / n + (rng() - 0.5) * 60, w = 140 + rng() * 90;
          const top = (i % 2 ? 430 : 580) + (rng() - 0.5) * 110, thick = 60 + rng() * 50;
          this.blob(cx, w, top, thick, rng() * 6);
        }
        for (let i = 0; i < n - 1; i++) {
          if (rng() < 0.45) continue;
          const cx = W * (i + 1) / n + (rng() - 0.5) * 40, w = 46 + rng() * 26;
          this.blob(cx, w, 300 + rng() * 120, 20 + rng() * 10, rng() * 6);
        }
      } else if (shape === 'ruins') {
        // 낮은 언덕 + 무너진 건물들 (건물은 그리기용 정보 bld에 지붕 높이를 기록)
        const hs = this.hills(rng, 0.45);
        for (let x = 0; x < W; x++) hs[x] = clamp(hs[x] + 30, H * 0.5, H * 0.84);
        this.base = hs;
        const bld = new Int16Array(W).fill(-1), roof = new Float32Array(W);
        let x = 40 + Math.floor(rng() * 80);
        while (x < W - 70) {
          const bw = 52 + Math.floor(rng() * 64), bh = 70 + rng() * 170, gap = 60 + Math.floor(rng() * 130);
          if (rng() < 0.82) {
            let g = H; for (let k = x; k < x + bw && k < W; k++) g = Math.min(g, hs[k]);
            const top = g - bh, broken = rng() < 0.6;
            let seg = 0, off = 0;
            for (let k = x; k < x + bw && k < W; k++) {
              if (broken && seg-- <= 0) { seg = 8 + Math.floor(rng() * 14); off = rng() < 0.5 ? 0 : Math.floor(rng() * bh * 0.35); }
              roof[k] = top + (broken ? off : 0);
              bld[k] = Math.round(roof[k]);
            }
          }
          x += bw + gap;
        }
        for (let k = 0; k < W; k++) { const top = Math.round(bld[k] >= 0 ? Math.min(roof[k], hs[k]) : hs[k]); for (let y = Math.max(0, top); y < H; y++) m[y * W + k] = 1; }
        this.bld = bld;
      } else {
        const canyon = shape === 'canyon';
        const hs = this.hills(rng, canyon ? 0.75 : 1);
        if (canyon) {
          for (let x = 0; x < W; x++) hs[x] -= 50;
          this.terrace(hs, 66, 0.14);
          // 깊은 골짜기 + (가끔) 돌다리
          const ng = W > 2600 ? 2 : 1, bridges = [];
          for (let g = 0; g < ng; g++) {
            const cx = W * (ng === 1 ? 0.5 + (rng() - 0.5) * 0.2 : (g + 0.5) / ng + (rng() - 0.5) * 0.1);
            const hw = 50 + rng() * 34, bottom = H - 100 - rng() * 50, edge = hw * 1.6;
            for (let x = Math.max(0, Math.floor(cx - edge)); x <= Math.min(W - 1, Math.ceil(cx + edge)); x++) {
              const u = Math.abs(x - cx) / hw, k = u < 1 ? 1 : Math.max(0, 1 - (u - 1) / 0.6), s = k * k * (3 - 2 * k);
              hs[x] = hs[x] + (bottom - hs[x]) * s;
            }
            if (rng() < 0.6) bridges.push([cx, edge]);
          }
          for (let x = 0; x < W; x++) hs[x] = clamp(hs[x], H * 0.26, H - 90);
          this.base = hs; this.fillCols(hs);
          for (const [cx, edge] of bridges) {
            const xl = Math.max(0, Math.floor(cx - edge - 6)), xr = Math.min(W - 1, Math.ceil(cx + edge + 6));
            const top = Math.round(Math.max(hs[xl], hs[xr]));
            for (let x = xl; x <= xr; x++) {
              const u = (x - cx) / (edge + 6);
              const bot = Math.round(top + 14 + 22 * u * u);
              for (let y = top; y <= bot && y < H; y++) m[y * W + x] = 1;
            }
          }
        } else {
          if (shape === 'terrace') this.terrace(hs, 52, 0.3);
          this.base = hs; this.fillCols(hs);
          // 떠 있는 섬
          const ni = W > 2300 ? 2 : 1;
          for (let i = 0; i < ni; i++) {
            const cx = Math.floor(W * (0.18 + 0.64 * (ni === 1 ? 0.5 + (rng() - 0.5) * 0.4 : (i + rng() * 0.8) / ni)));
            const w = 120 + rng() * 140, th2 = 34 + rng() * 28;
            const base = hs[clamp(cx, 0, W - 1)] - 210 - rng() * 110;
            if (base < 150) continue;
            let ok = true;
            for (let dx = -w / 2; dx <= w / 2; dx += 4) { const x = Math.floor(cx + dx); if (x < 0 || x >= W || base + th2 + 40 > hs[x]) { ok = false; break; } }
            if (!ok) continue;
            for (let dx = Math.ceil(-w / 2); dx <= Math.floor(w / 2); dx++) {
              const x = cx + dx; if (x < 0 || x >= W) continue;
              const u = dx / (w / 2);
              const top = Math.round(base + Math.pow(Math.abs(u), 3) * 16);
              const bot = Math.round(base + 6 + th2 * Math.sqrt(Math.max(0, 1 - u * u)) * (0.85 + 0.15 * Math.sin(dx * 0.3)));
              for (let y = top; y <= bot; y++) if (y >= 0 && y < H) m[y * W + x] = 1;
            }
          }
        }
      }
      this.ver++;
      if (this.ctx) this.paint();
    }

    /* ----- 그리기: 바탕색(조명 없음)을 한 번 만들어 두고, 조명(입체감)은 지형 모양에 따라 계산 -----
       폭발로 파이면 그 주변만 조명을 다시 계산 → 새로 드러난 면도 원래 있던 면처럼 자연스럽게 보임 */
    paint() {
      const W = this.W, H = this.H, m = this.mask, th = THEMES[this.theme] || THEMES.meadow, s = this.seed;
      const ctx = this.ctx, img = ctx.createImageData(W, H), d = img.data;
      const g1 = hexRgb(th.grass), g2 = hexRgb(th.grass2), dirt = th.dirt.map(hexRgb), deep = hexRgb(th.deep);
      const bc = th.bld ? th.bld.map(hexRgb) : null, wc = th.win ? hexRgb(th.win) : null, wl = th.winLit ? hexRgb(th.winLit) : null;
      const bld = this.bld, base = this.base;
      const gth = new Uint8Array(W), off = new Float32Array(W);
      const ph = (s % 1000) / 1000 * 6.28;
      for (let x = 0; x < W; x++) {
        gth[x] = 8 + Math.round(2.5 * Math.sin(x * 0.05 + ph) + 1.5 * Math.sin(x * 0.17 + ph * 2)) + (hash2(x, 7, s) < 0.12 ? 3 : 0);
        off[x] = 16 * Math.sin(x * 0.011 + ph) + 8 * Math.sin(x * 0.037 + ph * 3);
      }
      for (let x = 0; x < W; x++) {
        let run = 0;
        const gx = gth[x], roof = bld ? bld[x] : -1, ground = base ? base[x] : H;
        // 건물 칸이면 그 건물의 왼쪽 끝(창문 격자 기준)
        let bx0 = x; if (roof >= 0) while (bx0 > 0 && bld[bx0 - 1] >= 0) bx0--;
        for (let y = 0; y < H; y++) {
          const i = y * W + x;
          if (!m[i]) { run = 0; continue; }
          run++;
          let r, g, b;
          if (roof >= 0 && y >= ground - 2 && run > y - ground + 3) run = y - ground + 3 + gx;   // 건물 밑 땅도 옆 땅과 같은 깊이 색으로
          if (roof >= 0 && y < ground - 2) {
            // 벽돌 + 창문
            const lx = x - bx0, ly = y - roof;
            const row = Math.floor(ly / 7), brick = ((lx + (row & 1) * 6) % 12 === 0) || ly % 7 === 0;
            const c = bc[(((row + Math.floor(lx / 12)) % 3) + 3) % 3];
            r = c[0]; g = c[1]; b = c[2];
            if (brick) { r *= 0.86; g *= 0.86; b *= 0.86; }
            const wx = lx % 20, wy = (ly - 10) % 26;
            if (lx > 4 && ly > 10 && wx >= 6 && wx < 15 && wy >= 0 && wy < 13) {
              const lit = wl && hash2(Math.floor(lx / 20), Math.floor((ly - 10) / 26), s + bx0) < 0.18;
              const cc = lit ? wl : wc; r = cc[0]; g = cc[1]; b = cc[2];
              if (!lit && wy < 3) { r += 18; g += 18; b += 22; }
            }
          } else if (run <= gx && roof < 0) {
            const c = run <= 3 ? g1 : g2;
            r = c[0]; g = c[1]; b = c[2];
            if (run === gx) { r *= 0.85; g *= 0.85; b *= 0.85; }
          } else {
            const band = Math.floor((y + off[x]) / 34);
            const c = dirt[((band % 3) + 3) % 3];
            const f = Math.min(1, Math.max(0, run - gx) / 520) * 0.55;
            r = c[0] + (deep[0] - c[0]) * f; g = c[1] + (deep[1] - c[1]) * f; b = c[2] + (deep[2] - c[2]) * f;
            // 풀 밑 흙에 살짝 그늘(풀이 도톰하게 얹힌 느낌)
            const lip = run - gx;
            if (lip > 0 && lip <= 8 && roof < 0) { const k = 0.74 + 0.26 * lip / 8; r *= k; g *= k; b *= k; }
          }
          const n = (hash2(x >> 1, y >> 1, s) - 0.5) * 16;
          const o = i * 4;
          d[o] = clamp(r + n, 0, 255); d[o + 1] = clamp(g + n, 0, 255); d[o + 2] = clamp(b + n, 0, 255); d[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      // 자갈 · 반점
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const rng = mulberry32(s ^ 0x5bd1e995);
      const cnt = Math.floor(W * H / 7000);
      for (let i = 0; i < cnt; i++) {
        const x = rng() * W, y = rng() * H, rx = 2 + rng() * 5, ry = 1.4 + rng() * 3, c = rng() < 0.55 ? th.pebble : th.pebble2;
        const top = this.topAt(x);
        if (y < top + 20) continue;
        if (bld && bld[Math.floor(x)] >= 0 && base && y < base[Math.floor(x)]) continue;
        ctx.fillStyle = c; ctx.globalAlpha = 0.55 + rng() * 0.35;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rng() * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      this.unlit = ctx.getImageData(0, 0, W, H).data;
      this.shadeRect(0, 0, W, H);
      this.ver++;
    }
    // [x0,x1) × [y0,y1) 영역의 조명을 다시 계산해서 그림. 빛은 왼쪽 위에서 — 윗면은 밝게, 아랫면·오른쪽 면은 어둡게
    shadeRect(x0, y0, x1, y1) {
      if (!this.ctx || !this.unlit) return;
      const W = this.W, H = this.H, m = this.mask, U = this.unlit, B = 14;
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
      const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
      const ey0 = Math.max(0, y0 - B), ey1 = Math.min(H, y1 + B), ex0 = Math.max(0, x0 - B), ex1 = Math.min(W, x1 + B);
      const up = new Uint8Array(w * h), dn = new Uint8Array(w * h), lf = new Uint8Array(w * h), rt = new Uint8Array(w * h);
      // 각 방향으로 "빈칸까지 몇 칸?" (최대 B). 맵 위·좌·우 밖은 빈칸, 맵 아래 밖은 땅으로 봄
      for (let x = x0; x < x1; x++) {
        let run = ey0 === 0 ? 0 : B;
        for (let y = ey0; y < y1; y++) { run = m[y * W + x] ? (run < B ? run + 1 : B) : 0; if (y >= y0) up[(y - y0) * w + x - x0] = run; }
        run = B;
        for (let y = ey1 - 1; y >= y0; y--) { run = m[y * W + x] ? (run < B ? run + 1 : B) : 0; if (y < y1) dn[(y - y0) * w + x - x0] = run; }
      }
      for (let y = y0; y < y1; y++) {
        const row = y * W;
        let run = ex0 === 0 ? 0 : B;
        for (let x = ex0; x < x1; x++) { run = m[row + x] ? (run < B ? run + 1 : B) : 0; if (x >= x0) lf[(y - y0) * w + x - x0] = run; }
        run = ex1 === W ? 0 : B;
        for (let x = ex1 - 1; x >= x0; x--) { run = m[row + x] ? (run < B ? run + 1 : B) : 0; if (x < x1) rt[(y - y0) * w + x - x0] = run; }
      }
      const img = this.ctx.createImageData(w, h), d = img.data;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * W + x, j = (y - y0) * w + x - x0, o = j * 4;
          if (!m[i]) continue;   // 빈칸은 투명(뒤 배경이 그대로 보임)
          const u = up[j], dd = dn[j], l = lf[j], r = rt[j];
          let k = 1;
          if (u < 9) k += 0.2 * (9 - u) / 8 + (u <= 2 ? 0.14 : 0);
          if (dd < 13) { const f = (13 - dd) / 12; k -= 0.5 * f * f; }
          if (l < 9) k += 0.14 * (9 - l) / 8;
          if (r < 11) { const f = (11 - r) / 10; k -= 0.34 * f; }
          if (dd === 1 || r === 1) k -= 0.12;
          if (u === 1 || l === 1) k += 0.06;
          const io = i * 4;
          if (k > 1) {
            const t = (k - 1) * 0.6;
            d[o] = U[io] + (255 - U[io]) * t; d[o + 1] = U[io + 1] + (255 - U[io + 1]) * t; d[o + 2] = U[io + 2] + (255 - U[io + 2]) * t;
          } else {
            d[o] = U[io] * k; d[o + 1] = U[io + 1] * k; d[o + 2] = U[io + 2] * k;
          }
          d[o + 3] = 255;
        }
      }
      this.ctx.putImageData(img, x0, y0);
    }

    carve(cx, cy, r, soft) {
      cx = Math.round(cx); cy = Math.round(cy); r = Math.max(1, Math.round(r));
      const W = this.W, H = this.H, m = this.mask;
      const y0 = Math.max(0, cy - r), y1 = Math.min(H - 1, cy + r);
      for (let y = y0; y <= y1; y++) {
        const dy = y - cy, hw = Math.floor(Math.sqrt(r * r - dy * dy));
        const x0 = Math.max(0, cx - hw), x1 = Math.min(W - 1, cx + hw);
        if (x0 <= x1) m.fill(0, y * W + x0, y * W + x1 + 1);
      }
      if (this.ctx) {
        // 구멍은 그을음 없이 깨끗하게 지우고(뒤 배경이 그대로 보임), 둘레만 조명을 다시 계산
        if (this.unlit) this.shadeRect(cx - r - 15, cy - r - 15, cx + r + 16, cy + r + 16);
        else {
          const c = this.ctx;
          c.save(); c.globalCompositeOperation = 'destination-out';
          c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); c.restore();
        }
      }
      this.ver++;
    }

    rebuild(craters) {
      this.generate();   // 마스크와 그림을 처음 상태로(그림은 putImageData로 통째로 덮어씀)
      for (const k of craters) this.carve(k[0], k[1], k[2], k[3]);
    }
  }

  /* ================= 월드 ================= */
  function newTank(p, x, y, W) {
    const type = TANKS[p.tank] ? p.tank : 'boom', st = tankStats(type, p.up);
    return {
      id: p.id, name: p.name, type, color: p.color || COLORS[0], team: p.team || 0,
      bot: !!p.bot, level: p.level || 'normal', up: cleanUp(p.up),
      maxHp: st.maxHp, dmgMul: st.dmgMul, moveMax: st.moveMax, sgTurn: st.sgTurn,
      x, y, hp: st.maxHp, alive: true, facing: x < W / 2 ? 1 : -1, angle: 45, sg: 0,
      items: { heal: 1, double: 1, power: 1, calm: 1 },
      fuel: st.moveMax, vy: 0, falling: false, fallFrom: y, mvAcc: 0, tilt: 0, jump: null
    };
  }
  function tankState(t) {
    return { id: t.id, x: t.x, y: t.y, hp: t.hp, alive: t.alive, sg: t.sg, f: t.facing, a: t.angle, items: Object.assign({}, t.items) };
  }
  function applyTankState(t, s) {
    if (!t || !s) return;
    t.x = s.x; t.y = s.y; t.hp = s.hp; t.alive = s.alive; t.sg = s.sg;
    if (s.f) t.facing = s.f;
    if (typeof s.a === 'number') t.angle = s.a;
    if (s.items) t.items = Object.assign({}, s.items);
    t.falling = false; t.vy = 0; t.fallFrom = t.y; t.jump = null;
  }

  class World {
    constructor(init, headless) {
      if (!init) return; // clone()에서 사용
      this.W = init.W; this.H = C.H; this.seed = init.seed >>> 0; this.theme = init.theme;
      this.wind = init.wind || 0;
      this.waterY = init.waterY || C.H - 40;
      this.terrain = new Terrain(this.W, this.H, this.seed, this.theme, headless);
      this.terrain.generate();
      // 시작 자리 밑에 땅이 없으면(섬·하늘섬 맵) 가장 가까운 땅 위로 옮김
      // (아주 작은 바위 위도 피함: 양옆 28px까지 비슷한 높이의 땅이 있어야 함)
      const T = this.terrain, okAt = x => x >= 20 && x <= this.W - 20 && T.topAt(x) < this.waterY - 14;
      const okSpawn = x => { if (!okAt(x)) return false; const y = T.topAt(x); for (const dx of [-40, -20, 20, 40]) if (!okAt(x + dx) || Math.abs(T.topAt(x + dx) - y) > 32) return false; return true; };
      this.tanks = init.players.map(p => {
        let x = clamp(Math.round(init.spawns[p.id]), 20, this.W - 20);
        if (!okSpawn(x)) {
          let found = -1;
          for (let d = 3; d < this.W && found < 0; d += 3) { if (okSpawn(x - d)) found = x - d; else if (okSpawn(x + d)) found = x + d; }
          if (found < 0) for (let d = 3; d < this.W && found < 0; d += 3) { if (okAt(x - d)) found = x - d; else if (okAt(x + d)) found = x + d; }
          if (found >= 0) x = found;
        }
        return newTank(p, x, T.topAt(x), this.W);
      });
      this.hooks = null; this.sim = null;
    }
    clone() {
      const w = new World(null);
      w.W = this.W; w.H = this.H; w.seed = this.seed; w.theme = this.theme; w.wind = this.wind; w.waterY = this.waterY;
      w.terrain = this.terrain.cloneHeadless();
      w.tanks = this.tanks.map(t => Object.assign({}, t, { items: Object.assign({}, t.items), jump: null }));
      w.hooks = null; w.sim = null;
      return w;
    }
    tank(id) { for (const t of this.tanks) if (t.id === id) return t; return null; }
    supported(x, y) {
      const T = this.terrain, xi = Math.round(x), yi = Math.round(y);
      return T.solid(xi - 7, yi) || T.solid(xi - 3, yi) || T.solid(xi, yi) || T.solid(xi + 3, yi) || T.solid(xi + 7, yi);
    }
    hurt(t, amount, cause) {
      if (!t.alive || amount <= 0) return;
      amount = Math.round(amount);
      const real = Math.min(t.hp, amount);   // 기록에는 실제로 깎인 체력만
      t.hp = Math.max(0, t.hp - amount);
      t.sg = Math.min(100, t.sg + Math.round(amount * C.SG_HURT));
      if (this.sim) this.sim.record(t, real);
      if (this.hooks && this.hooks.damage) this.hooks.damage(t, amount, cause);
      if (t.hp <= 0) this.kill(t, 'hp');
    }
    kill(t, how) {
      if (!t.alive) return;
      t.alive = false; t.hp = 0; t.falling = false;
      if (this.sim) this.sim.kills.push(t.id);
      if (this.hooks && this.hooks.death) this.hooks.death(t, how);
    }
    // 떨어지는 중이면 true
    stepFall(t, dt) {
      if (!t.alive) return false;
      if (!t.falling) {
        if (this.supported(t.x, t.y)) return false;
        t.falling = true; t.vy = 0; t.fallFrom = t.y;
      }
      t.vy = Math.min(t.vy + C.G * dt, 1000);
      const target = t.y + t.vy * dt;
      let row = Math.floor(t.y) + 1;
      while (row <= target) {
        if (row >= this.waterY) { t.y = row; this.kill(t, 'water'); return true; }
        if (this.supported(t.x, row)) { t.y = row; this.land(t); return true; }
        row++;
      }
      t.y = target;
      return true;
    }
    land(t) {
      const dist = t.y - t.fallFrom;
      t.falling = false; t.vy = 0;
      if (this.hooks && this.hooks.land) this.hooks.land(t, dist);
    }
    stepX(t, dir) {
      const T = this.terrain, nx = t.x + dir;
      if (nx < 14 || nx > this.W - 14 || t.falling) return false;
      let y = t.y;
      if (T.solid(nx, y - 1)) {
        let k = 1;
        while (k <= C.CLIMB && T.solid(nx, y - 1 - k)) k++;
        if (k > C.CLIMB) return false;
        y -= k;
      } else if (!T.solid(nx, y)) {
        let k = 1;
        while (k <= C.CLIMB && !T.solid(nx, y + k)) k++;
        if (k <= C.CLIMB) y += k;
      }
      if (T.solid(nx, y - 14) || T.solid(nx + dir * 8, y - 18)) return false; // 머리 위가 막힘
      if (y >= this.waterY - 3) return false;
      t.x = nx; t.y = y;
      return true;
    }
    // 조준 단계에서 좌우 이동. 움직인 px 반환
    moveTank(t, dir, dt) {
      t.mvAcc = (t.mvAcc || 0) + C.MOVE_SPEED * dt;
      let moved = 0;
      while (t.mvAcc >= 1 && t.fuel > 0) {
        t.mvAcc -= 1;
        if (!this.stepX(t, dir)) { t.mvAcc = 0; break; }
        t.fuel -= 1; moved++;
      }
      if (t.fuel <= 0) t.mvAcc = 0;
      return moved;
    }
    /* ----- 점프 (조준 단계에서만, 한 턴에 한 번) — 구덩이·섬 사이를 건너요 ----- */
    startJump(t) {
      if (!t.alive || t.falling || t.jump || t.jumped || t.fuel < C.JUMP_COST) return false;
      t.fuel -= C.JUMP_COST; t.jumped = true; t.mvAcc = 0;
      t.jump = { vx: t.facing * C.JUMP_VX, vy: -C.JUMP_VY, y0: t.y };
      return true;
    }
    // 공중이면 true
    stepJump(t, dt) {
      const J = t.jump; if (!J) return false;
      if (!t.alive) { t.jump = null; return false; }
      const T = this.terrain, dir = Math.sign(J.vx);
      J.vy = Math.min(J.vy + C.G * dt, 900);
      if (J.vx) {
        const nx = t.x + J.vx * dt;
        if (nx < 14 || nx > this.W - 14) J.vx = 0;
        else {
          let ny = t.y, ok = true;
          if (T.solid(nx, ny - 1) || T.solid(nx + dir * 7, ny - 6)) {
            let k = 1; while (k <= 9 && (T.solid(nx, ny - 1 - k) || T.solid(nx + dir * 7, ny - 6 - k))) k++;
            if (k > 9) ok = false; else ny -= k;
          }
          if (ok && (T.solid(nx, ny - 22) || T.solid(nx + dir * 9, ny - 16))) ok = false;
          if (ok) { t.x = nx; t.y = ny; }   // 막히면 이번엔 제자리(더 높이 올라가면 다시 앞으로)
        }
      }
      if (J.vy < 0) {
        const ny = t.y + J.vy * dt;
        if (T.solid(t.x, ny - 26) || T.solid(t.x - 5, ny - 23) || T.solid(t.x + 5, ny - 23)) J.vy = 0;   // 머리 쿵
        else t.y = ny;
        return true;
      }
      const target = t.y + J.vy * dt;
      let row = Math.floor(t.y) + 1;
      while (row <= target) {
        if (row >= this.waterY) { t.y = row; t.jump = null; this.kill(t, 'water'); return false; }
        if (this.supported(t.x, row)) {
          t.y = row; t.jump = null; t.falling = false; t.vy = 0;
          if (this.hooks && this.hooks.land) this.hooks.land(t, 40);
          return false;
        }
        row++;
      }
      t.y = target;
      return true;
    }
    groundNear(x, y) {
      const T = this.terrain;
      for (let k = -14; k <= 14; k++) if (T.solid(x, y + k) && !T.solid(x, y + k - 1)) return y + k;
      return y;
    }
  }

  /* ================= 한 발의 시뮬레이션 =================
     같은 월드 상태 + 같은 입력이면 어디서 돌려도 결과가 같습니다.
     쏜 사람이 먼저 화면 없이 끝까지 돌려 결과를 만들고, 모두가 같은 계산으로 애니메이션을 보여 준 뒤 결과로 맞춥니다. */
  class ShotSim {
    constructor(world, shooterId, input) {
      this.w = world; this.t = 0; this.done = false; this.quiet = 0;
      this.projs = []; this.events = []; this.craters = []; this.kills = []; this.dealt = 0; this.pid = 0;
      this.volleyArmed = false;
      const s = this.shooter = world.tank(shooterId);
      world.sim = this;
      s.x = input.x; s.y = input.y; s.facing = input.f === -1 ? -1 : 1; s.angle = clamp(input.a, 0, 90);
      s.falling = false; s.vy = 0; s.jump = null;
      this.power = clamp(input.p, 0, 100);
      const tk = TANKS[s.type] || TANKS.boom;
      let wi = input.w | 0;
      if (wi === 2 && s.sg < 100) wi = 0;
      this.wi = wi; this.spec = tk.weapons[wi] || tk.weapons[0];
      if (wi === 2) s.sg = 0; else s.sg = Math.min(100, s.sg + (s.sgTurn || C.SG_TURN));
      let item = input.item || null;
      if (item === 'heal' || !s.items[item]) item = null;
      if (item) s.items[item]--;
      this.item = item;
      this.mul = item === 'power' ? { d: 1.4, r: 1.15 } : { d: 1, r: 1 };
      this.mul.d *= (s.dmgMul || 1);   // 공격력 강화
      this.wind = item === 'calm' ? 0 : world.wind;
      this.volleysLeft = item === 'double' ? 2 : 1;
      this.hook('fireStart', s, this.spec);
      this.launchVolley();
    }
    hook(name, a, b, c, d) { const h = this.w.hooks; if (h && h[name]) h[name](a, b, c, d); }
    record(t, amount) { if (t !== this.shooter) this.dealt += amount; }
    launchVolley() {
      this.volleysLeft--;
      const sp = this.spec, n = sp.count || 1;
      for (let i = 0; i < n; i++) {
        const delay = sp.interval ? i * sp.interval : 0;
        const off = sp.spread ? (i - (n - 1) / 2) * sp.spread : 0;
        this.events.push({ at: this.t + delay, fn: () => this.launch(off) });
      }
    }
    launch(offDeg) {
      const s = this.shooter;
      if (!s.alive) return;
      const a = (s.angle + offDeg) * Math.PI / 180, f = s.facing;
      const x = s.x + Math.cos(a) * f * C.BARREL, y = s.y - C.PIVOT - Math.sin(a) * C.BARREL;
      const v = C.VMAX * (this.power / 100) * (this.spec.speed || 1);
      const p = { id: this.pid++, x, y, vx: Math.cos(a) * f * v, vy: -Math.sin(a) * v, age: 0, spec: this.spec, bounces: this.spec.bounce || 0, drill: this.spec.drill || 0, drilling: false, dead: false, child: false };
      this.projs.push(p);
      this.hook('launch', p, s);
    }
    step(dt) {
      if (this.done) return;
      this.t += dt;
      for (let i = 0; i < this.events.length; i++) {
        const e = this.events[i];
        if (e.at <= this.t) { this.events.splice(i, 1); i--; e.fn(); }
      }
      const ps = this.projs;
      for (let i = 0; i < ps.length; i++) if (!ps[i].dead) this.stepProj(ps[i], dt);
      if (ps.some(p => p.dead)) this.projs = ps.filter(p => !p.dead);
      let moving = false;
      for (const t of this.w.tanks) if (this.w.stepFall(t, dt)) moving = true;
      const busy = this.projs.length || this.events.length || moving;
      if (!busy && this.volleysLeft > 0 && !this.volleyArmed) {
        this.volleyArmed = true;
        this.events.push({ at: this.t + 0.5, fn: () => { this.volleyArmed = false; this.launchVolley(); } });
      }
      if (!busy && this.volleysLeft <= 0) { this.quiet += dt; if (this.quiet >= 0.55) this.finish(); }
      else this.quiet = 0;
      if (this.t > 45) this.finish();
    }
    run() { let n = 0; while (!this.done && n++ < 120 * 60) this.step(C.DT); if (!this.done) this.finish(); return this; }
    finish() {
      if (this.done) return;
      this.done = true;
      for (const t of this.w.tanks) { t.falling = false; t.vy = 0; }
      this.w.sim = null;
    }
    result() {
      return { tanks: this.w.tanks.map(tankState), craters: this.craters, dealt: this.dealt, kills: this.kills.slice() };
    }
    enemyOf(t) {
      const s = this.shooter;
      return t.alive && t !== s && !(s.team && t.team && s.team === t.team);
    }
    tankAt(x, y) {
      const R2 = C.TANK_R * C.TANK_R;
      for (const t of this.w.tanks) {
        if (!t.alive) continue;
        const dx = x - t.x, dy = y - (t.y - C.TANK_CY);
        if (dx * dx + dy * dy < R2) return t;
      }
      return null;
    }
    nearestEnemy(x, y) {
      let best = null, bd = 1e12;
      for (const t of this.w.tanks) {
        if (!this.enemyOf(t)) continue;
        const d = (t.x - x) ** 2 + (t.y - C.TANK_CY - y) ** 2;
        if (d < bd) { bd = d; best = t; }
      }
      return best;
    }
    stepProj(p, dt) {
      const sp = p.spec, w = this.w, T = w.terrain;
      p.age += dt;
      if (p.age > 15) { p.dead = true; return; }
      if (p.drilling) { this.stepDrill(p, dt); return; }
      if (sp.homing && p.age > 0.3 && p.vy > -40) {   // 꼭대기를 넘어 내려오기 시작하면 적 쪽으로 휨
        const tg = this.nearestEnemy(p.x, p.y);
        if (tg) {
          const want = Math.atan2(tg.y - C.TANK_CY - p.y, tg.x - p.x), cur = Math.atan2(p.vy, p.vx);
          let d = want - cur;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          const mx = sp.homing * dt, na = cur + clamp(d, -mx, mx), v = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(na) * v; p.vy = Math.sin(na) * v;
        }
      }
      p.vx += this.wind * C.WIND_ACC * (sp.wind == null ? 1 : sp.wind) * dt;
      p.vy += C.G * (sp.grav || 1) * dt;
      if (sp.split && !p.child && p.vy >= 0 && p.age > 0.15) { this.split(p); return; }
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      const steps = Math.max(1, Math.ceil(Math.hypot(nx - p.x, ny - p.y) / 2));
      let px = p.x, py = p.y;
      for (let i = 1; i <= steps; i++) {
        const x = p.x + (nx - p.x) * i / steps, y = p.y + (ny - p.y) * i / steps;
        const tk = this.tankAt(x, y);
        if (tk) { p.x = x; p.y = y; this.impact(p); return; }
        if (T.solid(x, y)) {
          if (p.bounces > 0) {
            const n = T.normal(x, y), vd = p.vx * n.x + p.vy * n.y;
            if (vd < 0) { p.vx -= 2 * vd * n.x; p.vy -= 2 * vd * n.y; }
            const e = sp.elastic || 0.62;
            p.vx *= e; p.vy *= e; p.bounces--;
            p.x = px; p.y = py;
            this.hook('bounce', p);
            if (Math.hypot(p.vx, p.vy) < 70) this.impact(p);
            return;
          }
          if (p.drill > 0) {
            const v = Math.hypot(p.vx, p.vy) || 1;
            p.drilling = true; p.dx = p.vx / v; p.dy = p.vy / v; p.dacc = 0; p.x = x; p.y = y;
            this.hook('drill', p);
            return;
          }
          p.x = x; p.y = y; this.impact(p); return;
        }
        if (y >= w.waterY) { p.dead = true; this.hook('splash', x, w.waterY, sp); return; }
        if (x < -400 || x > w.W + 400) { p.dead = true; this.hook('lost', p); return; }
        px = x; py = y;
      }
      p.x = nx; p.y = ny;
    }
    stepDrill(p, dt) {
      const T = this.w.terrain, v = 330 * dt, n = Math.max(1, Math.ceil(v / 2)), st = v / n;
      for (let i = 0; i < n; i++) {
        p.x += p.dx * st; p.y += p.dy * st; p.drill -= st; p.dacc += st;
        if (this.tankAt(p.x, p.y)) { this.impact(p); return; }
        if (p.dacc >= 5) { p.dacc = 0; this.carve(p.x, p.y, 8, 1); }
        if (p.drill <= 0) { this.impact(p); return; }
        if (p.y >= this.w.waterY) { p.dead = true; this.hook('splash', p.x, this.w.waterY, p.spec); return; }
        if (p.x < 0 || p.x >= this.w.W) { p.dead = true; return; }
        if (!T.solid(p.x + p.dx * 12, p.y + p.dy * 12) && !T.solid(p.x + p.dx * 22, p.y + p.dy * 22) && !T.solid(p.x, p.y)) {
          p.drilling = false; p.vx = p.dx * 300; p.vy = p.dy * 300;   // 땅 밖으로 뚫고 나옴
          return;
        }
      }
    }
    split(p) {
      p.dead = true;
      const sp = p.spec, n = sp.split.n;
      const child = { dmg: sp.dmg, r: sp.r, color: sp.color, size: 4, glow: sp.glow };
      for (let i = 0; i < n; i++) {
        const off = n > 1 ? (i / (n - 1) * 2 - 1) * sp.split.spread : 0;
        this.projs.push({ id: this.pid++, x: p.x, y: p.y, vx: p.vx + off, vy: p.vy - 40, age: p.age, spec: child, bounces: 0, drill: 0, drilling: false, dead: false, child: true });
      }
      this.hook('split', p);
    }
    impact(p) {
      p.dead = true;
      const sp = p.spec, x = p.x, y = p.y;
      this.explode(x, y, sp.r * this.mul.r, sp.dmg * this.mul.d, sp);
      if (sp.bolt) {
        sp.bolt.offs.forEach((off, i) => {
          this.events.push({ at: this.t + 0.4 + i * 0.16, fn: () => this.bolt(x + off, sp.bolt) });
        });
      }
      if (sp.meteor) {
        const M = sp.meteor;
        M.offs.forEach((off, i) => {
          this.events.push({ at: this.t + 0.3 + i * (M.gap || 0.12), fn: () => this.dropMeteor(x + off, M) });
        });
      }
      if (sp.tele) this.teleport(x, y);
    }
    // 하늘에서 떨어지는 포탄(포격지원 · 유성우)
    dropMeteor(x, M) {
      x = Math.round(x);
      if (x < 4 || x >= this.w.W - 4) return;
      if (!M.spec) M.spec = { dmg: M.dmg, r: M.r, color: M.color || '#ff8a3a', size: M.size || 6, glow: M.glow || '#ffc27a', wind: 0, fall: 1 };
      const p = { id: this.pid++, x, y: -240, vx: 0, vy: 520, age: 0, spec: M.spec, bounces: 0, drill: 0, drilling: false, dead: false, child: true };
      this.projs.push(p);
      this.hook('meteor', p);
    }
    // 맞은 자리로 순간이동 (구멍 바닥에 내려섬)
    teleport(x, y) {
      const s = this.shooter, w = this.w, T = w.terrain;
      if (!s.alive) return;
      const tx = clamp(Math.round(x), 16, w.W - 16);
      let ty = Math.max(0, Math.round(y)), k = 0;
      while (ty < w.waterY && !T.solid(tx, ty) && k++ < 1200) ty++;
      if (T.solid(tx, ty)) { k = 0; while (ty > 0 && T.solid(tx, ty - 1) && k++ < 600) ty--; }
      const fx = s.x, fy = s.y;
      s.x = tx; s.y = Math.min(ty, w.waterY + 2); s.falling = false; s.vy = 0;
      this.hook('teleport', s, fx, fy);
    }
    bolt(x, b) {
      x = Math.round(x);
      if (x < 0 || x >= this.w.W) return;
      let y = this.w.terrain.topAt(x), hit = null;
      for (const t of this.w.tanks) {
        if (!t.alive || Math.abs(t.x - x) > C.TANK_R + 3) continue;
        const top = t.y - C.TANK_CY * 2;
        if (top < y) { y = t.y - C.TANK_CY; hit = t; }
      }
      if (y > this.w.waterY) y = this.w.waterY;
      this.hook('bolt', x, y);
      this.explode(x, y, b.r * this.mul.r, b.dmg * this.mul.d, { bolt: 1, color: '#fff35a' });
    }
    carve(x, y, r, soft) {
      x = Math.round(x); y = Math.round(y); r = Math.round(r);
      this.w.terrain.carve(x, y, r, soft);
      this.craters.push(soft ? [x, y, r, 1] : [x, y, r]);
    }
    explode(x, y, r, dmg, sp) {
      x = Math.round(x); y = Math.round(y); r = Math.round(r);
      this.carve(x, y, r, 0);
      this.hook('explode', x, y, r, sp);
      for (const t of this.w.tanks) {
        if (!t.alive) continue;
        const d = Math.hypot(t.x - x, t.y - C.TANK_CY - y);
        if (d >= r + C.TANK_R) continue;
        const f = clamp(1 - Math.max(0, d - C.TANK_R) / r, 0, 1);
        this.w.hurt(t, Math.max(1, Math.round(dmg * (0.3 + 0.7 * f))), 'boom');
      }
    }
  }

  /* ================= 컴퓨터 AI ================= */
  // 간단 탄도 — 지형/탱크에 처음 닿는 곳(특수 효과는 무시)
  function traj(world, me, a, f, power, spec, wind) {
    const T = world.terrain, dt = 1 / 60, rad = a * Math.PI / 180;
    let x = me.x + Math.cos(rad) * f * C.BARREL, y = me.y - C.PIVOT - Math.sin(rad) * C.BARREL;
    const v = C.VMAX * power / 100 * (spec.speed || 1);
    let vx = Math.cos(rad) * f * v, vy = -Math.sin(rad) * v;
    const wa = (wind == null ? world.wind : wind) * C.WIND_ACC * (spec.wind == null ? 1 : spec.wind), ga = C.G * (spec.grav || 1);
    for (let i = 0; i < 60 * 9; i++) {
      vx += wa * dt; vy += ga * dt;
      const nx = x + vx * dt, ny = y + vy * dt, n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / 3));
      for (let k = 1; k <= n; k++) {
        const sx = x + (nx - x) * k / n, sy = y + (ny - y) * k / n;
        for (const t of world.tanks) {
          if (!t.alive) continue;
          if ((sx - t.x) ** 2 + (sy - t.y + C.TANK_CY) ** 2 < C.TANK_R * C.TANK_R) return { x: sx, y: sy, t };
        }
        if (T.solid(sx, sy)) return { x: sx, y: sy };
        if (sy >= world.waterY || sx < -300 || sx > world.W + 300) return null;
      }
      x = nx; y = ny;
    }
    return null;
  }

  function aiPlan(world, me, opts) {
    opts = opts || {};
    const rnd = opts.rnd || Math.random;
    const team = opts.team;
    const enemies = world.tanks.filter(t => t.alive && t !== me && !(team && t.team === me.team));
    if (!enemies.length) return null;
    const score = t => t.hp * 1.1 + Math.abs(t.x - me.x) * 0.06 + rnd() * 25;
    enemies.sort((a, b) => score(a) - score(b));
    const tg = enemies[0];
    const tk = TANKS[me.type] || TANKS.boom;
    let wi = 0;
    if (me.sg >= 100 && rnd() < 0.85) wi = 2;
    else if (rnd() < 0.3) wi = 1;
    if (tk.weapons[wi].tele) wi = 0;   // 컴퓨터는 순간이동탄은 안 씀
    const spec = tk.weapons[wi];
    const f = tg.x >= me.x ? 1 : -1;
    const tx = tg.x, ty = tg.y - C.TANK_CY;
    let item = null;
    if (me.items.calm > 0 && Math.abs(world.wind) >= 7 && rnd() < 0.5) item = 'calm';
    const wind = item === 'calm' ? 0 : world.wind;
    const evalShot = (a, p) => {
      const hit = traj(world, me, a, f, p, spec, wind);
      if (!hit) return 1e9;
      let s = Math.hypot(hit.x - tx, hit.y - ty);
      if (hit.t && hit.t === tg) s = 0;
      if (Math.hypot(hit.x - me.x, hit.y - me.y + C.TANK_CY) < (spec.r || 30) + 22) s += 900; // 내 발밑 금지
      if (hit.t && hit.t !== tg && team && hit.t.team === me.team) s += 600;
      return s;
    };
    let best = { a: 45, p: 60, s: 1e9 };
    for (let a = 12; a <= 87; a += 3) for (let p = 18; p <= 100; p += 2) {
      const s = evalShot(a, p);
      if (s < best.s) best = { a, p, s };
    }
    const b0 = best;
    for (let a = Math.max(0, b0.a - 3); a <= Math.min(90, b0.a + 3); a++) for (let p = Math.max(5, b0.p - 2); p <= Math.min(100, b0.p + 2); p += 0.5) {
      const s = evalShot(a, p);
      if (s < best.s) best = { a, p, s };
    }
    const noise = { easy: [7, 7], normal: [3, 3.2], hard: [1, 1.1] }[me.level] || [3, 3.2];
    const a = Math.round(clamp(best.a + (rnd() * 2 - 1) * noise[0], 0, 90));
    const p = Math.round(clamp(best.p + (rnd() * 2 - 1) * noise[1], 5, 100) * 10) / 10;
    const heal = me.items.heal > 0 && me.hp <= 45 + ((me.maxHp || C.HP) - C.HP) && rnd() < 0.8;
    if (!item) {
      if (me.items.power > 0 && tg.hp <= 45 && best.s < 30 && rnd() < 0.6) item = 'power';
      else if (me.items.double > 0 && best.s < 25 && rnd() < 0.3) item = 'double';
    }
    return { f, a, p, w: wi, item, heal, target: tg.id, err: best.s };
  }

  root.Engine = { C, THEMES, THEME_KEYS, TANKS, TANK_KEYS, ITEMS, COLORS, UPG, cleanUp, tankStats, mulberry32, hexRgb, clamp, Terrain, World, ShotSim, tankState, applyTankState, aiPlan, traj };
})(typeof window !== 'undefined' ? window : globalThis);
