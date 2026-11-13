/* 포탄대작전 — 화면 흐름 · 대기실 · 온라인 통신(공개 MQTT 2곳 동시 접속) · 턴 진행 · 조작 · 소리
   서버·가입·API 키가 전혀 없습니다. 방 링크(?r=방코드)를 열면 같은 방 주제(topic)로 메시지를 주고받습니다. */
(function () {
  'use strict';
  const E = window.Engine, D = window.Draw, C = E.C;
  const VERSION = '1.2.1';
  const TOPIC_ROOT = 'potan-battle/v1/';
  const BROKERS = [
    { url: 'wss://broker.emqx.io:8084/mqtt' },
    { url: 'wss://public.cloud.shiftr.io', username: 'public', password: 'public' } // 443 포트 — 회사망 등에서도 통과
  ];
  const BEAT_MS = 2500, OFF_MS = 9000, MAX_PLAYERS = 8;
  const BOT_NAMES = ['깡통', '포돌이', '펑펑', '콩콩', '빵빵', '탕탕', '두두', '쾅쾅'];
  const LEVEL_TXT = { easy: '🐣 쉬움', normal: '🙂 보통', hard: '😈 어려움' };

  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  };
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
  };
  function rid(n) {
    const a = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(n));
    let s = ''; for (let i = 0; i < n; i++) s += a[r[i] % a.length];
    return s;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const randWind = () => Math.round((Math.random() + Math.random() - 1) * 10);
  const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 8);
  const now = () => performance.now();

  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2400);
  }

  /* ================= 나 ================= */
  const params = new URLSearchParams(location.search);
  let myId = (params.get('me') || '').replace(/[^a-z0-9]/gi, '').slice(0, 12) || ss.get('pt.sid');
  if (!myId) {
    // 같은 브라우저에서 탭 두 개를 열어도 서로 다른 사람으로 들어가도록: 다른 탭이 쓰는 중인 아이디면 새로 만듦
    const lid = store.get('pt.id', '');
    const lock = +store.get('pt.lock.' + lid, 0);
    myId = lid && Date.now() - lock > 6000 ? lid : rid(10);
    if (!lid) store.set('pt.id', myId);
  }
  ss.set('pt.sid', myId);
  const beatLock = () => store.set('pt.lock.' + myId, String(Date.now()));
  beatLock(); setInterval(beatLock, 2000);

  const me = {
    id: myId,
    name: cleanName(store.get('pt.name', '')),
    tank: store.get('pt.tank', 'boom'),
    color: store.get('pt.color', '')
  };
  const Wallet = window.Shop.Wallet;
  if (!E.TANKS[me.tank] || !Wallet.owns(me.tank)) me.tank = 'boom';
  if (E.COLORS.indexOf(me.color) < 0) me.color = pick(E.COLORS);
  function saveMe() { store.set('pt.name', me.name); store.set('pt.tank', me.tank); store.set('pt.color', me.color); }
  const myUp = () => Wallet.up(me.tank);   // 지금 고른 탱크의 강화 단계

  /* ================= 소리 (WebAudio로 즉석 합성 — 음원 파일 없음) ================= */
  const Sfx = (() => {
    let ac = null, master = null, nb = null, chg = null, muted = store.get('pt.mute', '0') === '1';
    function init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
        nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    document.addEventListener('pointerdown', init, { passive: true });
    document.addEventListener('keydown', init);
    const ok = () => ac && !muted && ac.state === 'running' && !document.hidden;
    function noise(t, dur, freq, q, gain, type, f2) {
      const s = ac.createBufferSource(); s.buffer = nb;
      const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq, t);
      if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
      f.Q.value = q;
      const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.05);
    }
    function tone(t, f0, f1, dur, gain, type) {
      const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function play(name, arg) {
      if (!ok()) return;
      const t = ac.currentTime;
      switch (name) {
        case 'fire': tone(t, 190, 45, 0.25, 0.55); noise(t, 0.2, 2200, 0.7, 0.45, 'lowpass', 300); break;
        case 'boom': { const s = Math.min(1, (arg || 30) / 60); noise(t, 0.5 + s * 0.7, 1000, 0.5, 0.65 + s * 0.35, 'lowpass', 70); tone(t, 95, 30, 0.4 + s * 0.4, 0.6); break; }
        case 'quake': noise(t, 1.3, 320, 0.6, 1, 'lowpass', 40); tone(t, 55, 25, 1.1, 0.75); break;
        case 'bolt': noise(t, 0.3, 3200, 0.8, 0.7, 'highpass'); noise(t + 0.04, 0.7, 700, 0.5, 0.6, 'lowpass', 70); break;
        case 'bounce': tone(t, 540, 260, 0.13, 0.22, 'triangle'); break;
        case 'split': tone(t, 900, 1700, 0.13, 0.15, 'square'); break;
        case 'splash': noise(t, 0.5, 1300, 1.2, 0.5, 'bandpass', 300); break;
        case 'drill': noise(t, 0.7, 800, 2, 0.28, 'bandpass', 1500); break;
        case 'thud': tone(t, 130, 50, 0.16, 0.4); break;
        case 'ko': [523, 392, 262].forEach((f, i) => tone(t + i * 0.12, f, f * 0.97, 0.25, 0.2, 'square')); break;
        case 'turn': [660, 880].forEach((f, i) => tone(t + i * 0.1, f, 0, 0.18, 0.16, 'triangle')); break;
        case 'myturn': [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.08, f, 0, 0.22, 0.2, 'triangle')); break;
        case 'tick': tone(t, 1250, 0, 0.06, 0.14, 'square'); break;
        case 'click': tone(t, 760, 0, 0.05, 0.12, 'triangle'); break;
        case 'heal': [523, 784, 1046].forEach((f, i) => tone(t + i * 0.07, f, 0, 0.22, 0.17)); break;
        case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(t + i * 0.13, f, 0, 0.32, 0.2, 'triangle')); break;
        case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.18, f, 0, 0.36, 0.18, 'triangle')); break;
        case 'chat': tone(t, 880, 1320, 0.1, 0.1); break;
        case 'water': noise(t, 1.4, 500, 0.8, 0.5, 'lowpass', 150); break;
        case 'jump': tone(t, 260, 620, 0.16, 0.22, 'triangle'); noise(t, 0.12, 900, 0.8, 0.18, 'lowpass', 300); break;
        case 'whistle': tone(t, 1500, 500, 0.55, 0.07, 'sine'); break;
        case 'tele': [880, 1320, 1760].forEach((f, i) => tone(t + i * 0.05, f, f * 1.5, 0.18, 0.12, 'sine')); break;
        case 'coin': [988, 1319].forEach((f, i) => tone(t + i * 0.07, f, 0, 0.16, 0.16, 'square')); break;
        case 'buy': [659, 784, 988, 1319].forEach((f, i) => tone(t + i * 0.08, f, 0, 0.2, 0.17, 'triangle')); break;
      }
    }
    function charge(p) {
      if (p < 0 || !ok()) {
        if (chg) { try { chg.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.02); chg.o.stop(ac.currentTime + 0.12); } catch (e) { } chg = null; }
        return;
      }
      if (!chg) {
        const o = ac.createOscillator(); o.type = 'sawtooth';
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
        const g = ac.createGain(); g.gain.value = 0.0001;
        o.connect(f); f.connect(g); g.connect(master); o.start();
        g.gain.setTargetAtTime(0.06, ac.currentTime, 0.03);
        chg = { o, g };
      }
      chg.o.frequency.setTargetAtTime(110 + p * 6, ac.currentTime, 0.02);
    }
    return { play, charge, isMuted: () => muted, setMuted(v) { muted = v; store.set('pt.mute', v ? '1' : '0'); if (v) charge(-1); } };
  })();

  /* ================= 상태 ================= */
  let screen = 'home';
  let R = null;              // 방 { code, online, host, seq, phase, settings, players[] }
  let G = null;              // 게임 진행 정보(모두 같은 값)
  let world = null, rd = null, sim = null, anim = null;
  let phase = 'none';        // aim | anim | wait | over
  let turnQ = [], waitUntil = 0, turnT0 = 0, bot = null, lastTick = -1;
  const lastSeen = {};
  const live = { power: -1, weapon: 0, item: null };   // 지금 턴 플레이어가 모으는 파워(화면 표시용)
  const aim = { charging: false, power: 0, weapon: 0, item: null, itemUsed: false, sent: false, mvAt: 0, mvSig: '' };
  const keys = {}, hold = {}, acc = {};
  let joinAt = 0, lastHello = 0, lastSyncReq = 0, hostBehind = 0, hostMismatch = 0, pendingSync = new Set();

  const isHost = () => !!R && R.host === me.id;
  const present = id => id === me.id || (Date.now() - (lastSeen[id] || 0) < OFF_MS);
  const curTank = () => (world && G ? world.tank(G.order[G.turnIdx]) : null);
  const isMine = t => !!t && !t.bot && t.id === me.id;
  const controlsLocal = t => !!t && (isMine(t) || (t.bot && isHost()));

  /* ================= 통신 ================= */
  const Net = {
    clients: [], base: '',
    connect(code) {
      this.close();
      this.base = TOPIC_ROOT + code + '/';
      if (typeof mqtt === 'undefined') { toast('통신 모듈을 불러오지 못했어요. 새로고침해 주세요.'); return; }
      const will = { topic: this.base + 'm', payload: JSON.stringify({ t: 'bye', from: me.id, mid: 'w' + rid(9) }), qos: 0, retain: false };
      this.clients = BROKERS.map((b, i) => {
        let c;
        try {
          c = mqtt.connect(b.url, {
            clientId: 'pt_' + me.id + '_' + rid(4), username: b.username, password: b.password,
            keepalive: 30, reconnectPeriod: 3000, connectTimeout: 10000, clean: true, queueQoSZero: false, will
          });
        } catch (e) { console.warn('broker', i, e); return null; }
        c.on('connect', () => {
          c.subscribe(this.base + 'm', { qos: 1 }, err => { if (err) console.warn('sub', i, err); });
          setTimeout(onNetUp, 300);
          renderNet();
        });
        c.on('message', (tp, buf) => onRaw(buf));
        ['close', 'offline', 'reconnect', 'error'].forEach(ev => c.on(ev, e => { if (ev === 'error') console.warn('mqtt', i, e && e.message); renderNet(); }));
        return c;
      });
    },
    close() {
      for (const c of this.clients) if (c) { try { c.end(true); } catch (e) { } }
      this.clients = [];
    },
    count() { return this.clients.filter(c => c && c.connected).length; },
    send(obj, qos) {
      const s = JSON.stringify(obj);
      for (const c of this.clients) if (c && c.connected) c.publish(this.base + 'm', s, { qos: qos || 0 });
    }
  };

  const seen = new Map();
  function markSeen(mid) {
    seen.set(mid, Date.now());
    if (seen.size > 4000) { const cut = Date.now() - 180000; for (const [k, v] of seen) if (v < cut) seen.delete(k); }
  }
  // local=true 이면 내 화면에도 바로 적용
  function emit(obj, local, qos) {
    obj.from = me.id; obj.mid = rid(10);
    markSeen(obj.mid);
    if (local !== false) handle(obj, true);
    if (R && R.online) Net.send(obj, qos == null ? 1 : qos);
  }
  function onRaw(buf) {
    let d;
    try { d = JSON.parse(buf.toString()); } catch (e) { return; }
    if (!d || typeof d !== 'object' || typeof d.mid !== 'string' || typeof d.from !== 'string' || seen.has(d.mid)) return;
    markSeen(d.mid);
    if (d.from === me.id) return;
    lastSeen[d.from] = Date.now();
    try { handle(d, false); } catch (e) { console.error('handle', d.t, e); }
  }
  function handle(d, local) {
    switch (d.t) {
      case 'hello': onHello(d); break;
      case 'hb': onBeat(d); break;
      case 'bye': lastSeen[d.from] = 0; if (isHost() && R.phase === 'lobby') dropAbsent(); renderRoom(); break;
      case 'room': onRoom(d.room, d.from); break;
      case 'upd': onUpd(d); break;
      case 'kick': if (d.to === me.id) { leaveRoom(); toast('방장이 방에서 내보냈어요'); } break;
      case 'start': onStart(d); break;
      case 'sync-req': onSyncReq(d); break;
      case 'sync': onSync(d); break;
      case 'mv': onMove(d); break;
      case 'fire': case 'pass': case 'item': queueTurnMsg(d); break;
      case 'chat': onChat(d); break;
    }
  }
  function onNetUp() {
    if (!R) return;
    if (isHost()) { pushRoom(); }
    else sendHello(true);
  }
  function sendHello(force) {
    if (!R || !R.online) return;
    if (!force && Date.now() - lastHello < 3000) return;
    lastHello = Date.now();
    emit({ t: 'hello', p: { name: me.name, tank: me.tank, color: me.color, up: myUp() } }, false);
  }
  function renderNet() {
    const el = $('netState'); if (!el || !R) return;
    if (!R.online) { el.textContent = '🤖 연습 모드 (인터넷 연결 없이)'; return; }
    const n = Net.count();
    el.textContent = n === 2 ? '🟢 연결 좋음' : n === 1 ? '🟢 연결됨 (1/2)' : '🟡 연결 중…';
  }

  /* ================= 대기실 ================= */
  function myPlayer() { return { id: me.id, name: me.name, tank: me.tank, color: me.color, up: myUp(), team: 1, bot: false, join: Date.now() }; }
  function autoTeam() {
    const t1 = R.players.filter(p => p.team === 1).length, t2 = R.players.filter(p => p.team === 2).length;
    return t1 <= t2 ? 1 : 2;
  }
  function makeBot(level) {
    const used = new Set(R.players.map(p => p.name));
    const nm = BOT_NAMES.find(n => !used.has(n)) || ('봇' + rid(2));
    const usedC = new Set(R.players.map(p => p.color));
    return { id: 'bot' + rid(7), name: nm, tank: pick(E.TANK_KEYS), color: E.COLORS.find(c => !usedC.has(c)) || pick(E.COLORS), team: autoTeam(), bot: true, level, join: Date.now() };
  }
  function checkName() {
    me.name = cleanName($('nick').value);
    $('nick').value = me.name;
    if (!me.name) { toast('탱크 이름(닉네임)을 먼저 적어 주세요!'); $('nick').focus(); return false; }
    saveMe();
    return true;
  }
  function createRoom(online) {
    if (!checkName()) return;
    const code = online ? rid(5) : 'practice';
    R = { code, online, host: me.id, seq: 1, phase: 'lobby', settings: { theme: 'random', mode: 'ffa', time: 30 }, players: [myPlayer()] };
    if (!online) R.players.push(makeBot('normal'));
    if (online) { history.replaceState(null, '', location.pathname + '?r=' + code); Net.connect(code); ss.set('pt.room', code); }
    joinAt = Date.now();
    roomMsgs.length = 0; $('roomMsgs').innerHTML = '';
    sysMsg(online ? '방을 만들었어요! 위 링크를 친구에게 보내세요.' : '컴퓨터와 연습하는 방이에요. 컴퓨터를 더 넣거나 빼 보세요.');
    showRoom();
  }
  function joinRoom(code) {
    if (!checkName()) return;
    R = { code, online: true, host: null, seq: 0, phase: 'lobby', settings: { theme: 'random', mode: 'ffa', time: 30 }, players: [] };
    joinAt = Date.now();
    roomMsgs.length = 0; $('roomMsgs').innerHTML = '';
    Net.connect(code);
    ss.set('pt.room', code);
    showRoom();
  }
  function takeRoom() {
    if (!R) return;
    R.host = me.id; R.seq = (R.seq || 0) + 1; R.phase = 'lobby';
    if (!R.players.some(p => p.id === me.id)) R.players.push(myPlayer());
    pushRoom();
    sysMsg('이 방의 방장이 되었어요. 링크를 친구에게 다시 보내 주세요.');
  }
  function leaveRoom() {
    if (R && R.online) { try { Net.send({ t: 'bye', from: me.id, mid: rid(10) }, 0); } catch (e) { } }
    setTimeout(() => Net.close(), 150);
    R = null; G = null; world = null; sim = null; anim = null; phase = 'none'; bot = null;
    Sfx.charge(-1);
    history.replaceState(null, '', location.pathname);
    ss.set('pt.room', '');
    showHome();
  }
  function pushRoom() {
    if (!R) return;
    R.seq++;
    renderRoom();
    if (R.online) emit({ t: 'room', room: R }, false);
  }
  function dropAbsent() {
    if (!isHost() || R.phase !== 'lobby' || !R.online) return;
    const before = R.players.length;
    const gone = R.players.filter(p => !p.bot && !present(p.id) && Date.now() - p.join > OFF_MS);
    if (!gone.length) return;
    R.players = R.players.filter(p => gone.indexOf(p) < 0);
    for (const p of gone) sysMsg(p.name + ' 님이 나갔어요');
    if (R.players.length !== before) pushRoom();
  }
  let lastRestore = 0;
  function onHello(d) {
    if (R && R.host && !isHost() && d.from === R.host) {
      const helpers = R.players.filter(p => !p.bot && p.id !== R.host && present(p.id)).sort((a, b) => a.join - b.join);
      if (helpers[0] && helpers[0].id === me.id && Date.now() - lastRestore > 4000) { lastRestore = Date.now(); requestSyncSend(d.from); }
      return;
    }
    if (!isHost() || !d.p) return;
    const p = R.players.find(x => x.id === d.from);
    if (R.phase === 'lobby') {
      const info = { name: cleanName(d.p.name) || '손님', tank: E.TANKS[d.p.tank] ? d.p.tank : 'boom', color: E.COLORS.indexOf(d.p.color) >= 0 ? d.p.color : E.COLORS[0], up: E.cleanUp(d.p.up) };
      if (p) Object.assign(p, info);
      else {
        if (R.players.length >= MAX_PLAYERS) { emit({ t: 'chat', sys: 1, to: d.from, text: '방이 가득 찼어요 (최대 8명)' }, false); return; }
        R.players.push(Object.assign({ id: d.from, team: autoTeam(), bot: false, join: Date.now() }, info));
        sysMsg(info.name + ' 님이 들어왔어요');
      }
      pushRoom();
    } else {
      pushRoom();
      requestSyncSend(d.from);
    }
  }
  function onUpd(d) {
    if (!isHost() || R.phase !== 'lobby' || !d.p) return;
    const p = R.players.find(x => x.id === d.from);
    if (!p) { onHello(d); return; }
    if (d.p.name) p.name = cleanName(d.p.name) || p.name;
    if (E.TANKS[d.p.tank]) p.tank = d.p.tank;
    if (E.COLORS.indexOf(d.p.color) >= 0) p.color = d.p.color;
    if (d.p.up) p.up = E.cleanUp(d.p.up);
    if (d.p.team === 1 || d.p.team === 2) p.team = d.p.team;
    pushRoom();
  }
  function onRoom(r, from) {
    if (!R || !r || r.code !== R.code || !Array.isArray(r.players)) return;
    if (from && from !== r.host) return;                 // 방 정보는 방장 본인만 보냄
    if (isHost()) {
      if (r.host === me.id) return;
      if (r.seq <= R.seq) { pushRoom(); return; }        // 내가 더 최신 방장
    } else if (R.host && r.seq < R.seq) return;          // 옛날 정보
    const before = R.players.map(p => ({ id: p.id, name: p.name, bot: p.bot }));
    const prevPhase = R.phase, hadHost = !!R.host;
    R = Object.assign({}, r, { online: true });
    if (hadHost) diffPlayers(before);
    else { $('joinWait').hidden = true; sysMsg('방에 들어왔어요!'); }
    if (R.phase === 'lobby') {
      if (!R.players.some(p => p.id === me.id)) sendHello();
      if (screen !== 'room') { showRoom(); if (prevPhase === 'game') toast('대기실로 돌아왔어요'); }
      else renderRoom();
    } else if (R.phase === 'game') {
      if (!G || screen !== 'game') requestSync();
      renderRoom();
    }
  }
  function diffPlayers(before) {
    const b = new Set(before.map(p => p.id)), n = new Set(R.players.map(p => p.id));
    for (const p of R.players) if (!b.has(p.id)) sysMsg(p.name + (p.bot ? ' (컴퓨터)' : ' 님') + '이 들어왔어요');
    for (const p of before) if (!n.has(p.id) && p.id !== me.id) sysMsg(p.name + (p.bot ? ' (컴퓨터)' : ' 님') + '이 나갔어요');
  }

  /* ---------- 대기실 화면 ---------- */
  function renderRoom() {
    if (!R || screen !== 'room') return;
    const host = isHost();
    $('roomLabel').textContent = R.online ? '대기실' : '연습';
    $('roomCode').textContent = R.online ? R.code.toUpperCase() : '';
    $('roomCode').hidden = !R.online;
    $('shareBox').hidden = !R.online || !R.host;
    $('shareUrl').value = location.origin + location.pathname + '?r=' + R.code;
    const waiting = R.online && !R.host;
    $('joinWait').hidden = !waiting;
    renderNet();
    // 참가자
    const ul = $('pList');
    $('pCount').textContent = R.players.length + ' / ' + MAX_PLAYERS;
    const team = R.settings.mode === 'team';
    const sig = JSON.stringify([R.host, team, waitingSig(), R.players.map(p => [p.id, p.name, p.tank, p.color, p.team, p.bot || present(p.id), p.up])]);
    if (ul.dataset.sig !== sig) { ul.dataset.sig = sig; ul.innerHTML = ''; }
    for (const p of (ul.children.length ? [] : R.players)) {
      const li = document.createElement('li');
      if (p.id === me.id) li.className = 'me';
      const on = p.bot || present(p.id);
      const tk = E.TANKS[p.tank] || E.TANKS.boom;
      const ups = p.up ? E.UPG.keys.reduce((a, k) => a + (p.up[k] | 0), 0) : 0;
      li.innerHTML = '<canvas></canvas><div class="pn"><b>' + esc(p.name) + '</b>' +
        (p.id === R.host ? '<span class="tag host">👑 방장</span>' : '') + (p.id === me.id ? '<span class="tag">나</span>' : '') +
        '<small>' + esc(tk.name) + ' · ' + esc(tk.role) + (ups ? ' · ⚙강화 +' + ups : '') + (p.bot ? ' · ' + LEVEL_TXT[p.level] : '') + '</small></div>' +
        (team ? '<button class="team-b t' + p.team + '">' + (p.team === 1 ? '🔴 레드' : '🔵 블루') + '</button>' : '') +
        (p.bot ? '' : '<span class="dot' + (on ? '' : ' off') + '" title="' + (on ? '접속 중' : '연결 끊김') + '"></span>') +
        (host && p.id !== me.id ? '<button class="xbtn" title="내보내기">✕</button>' : '');
      ul.appendChild(li);
      requestAnimationFrame(() => D.preview(li.querySelector('canvas'), p.tank, p.color, { angle: 30, zoom: 46 }));
      const tb = li.querySelector('.team-b');
      if (tb) tb.onclick = () => {
        if (p.id === me.id) setMyTeam(p.team === 1 ? 2 : 1);
        else if (host && p.bot) { p.team = p.team === 1 ? 2 : 1; pushRoom(); }
      };
      const xb = li.querySelector('.xbtn');
      if (xb) xb.onclick = () => {
        R.players = R.players.filter(q => q !== p);
        if (!p.bot && R.online) emit({ t: 'kick', to: p.id }, false);
        pushRoom();
      };
    }
    if (waiting && !ul.children.length) ul.innerHTML = '<li><div class="pn"><b>방 정보를 받는 중…</b></div></li>';
    // 설정
    $('botRow').hidden = !host;
    $('setHint').textContent = host ? '' : '(방장만 바꿀 수 있어요)';
    const sel = $('setTheme');
    if (!sel.options.length) {
      sel.innerHTML = '<option value="random">🎲 랜덤</option>' + E.THEME_KEYS.map(k => '<option value="' + k + '">' + E.THEMES[k].name + '</option>').join('');
    }
    sel.value = R.settings.theme; sel.disabled = !host;
    segSet('setMode', R.settings.mode, !host);
    segSet('setTime', String(R.settings.time), !host);
    const mine = R.players.find(p => p.id === me.id);
    $('myTeamRow').hidden = !team || !mine;
    if (mine) segSet('myTeam', String(mine.team), false);
    $('btnStart').hidden = !host;
    $('waitHost').hidden = host;
    $('waitHost').textContent = R.phase === 'game' ? '게임이 진행 중이에요 — 곧 관전 화면으로 넘어가요…' : '방장이 게임을 시작하길 기다리는 중…';
    $('btnStart').disabled = R.players.length < 2;
    $('btnStart').textContent = R.players.length < 2 ? '친구나 컴퓨터가 들어오면 시작할 수 있어요' : '🔥 게임 시작! (' + R.players.length + '명)';
  }
  function waitingSig() { return R && R.online && !R.host ? 'w' : ''; }
  function segSet(id, v, locked) {
    const el = $(id);
    el.classList.toggle('locked', !!locked);
    for (const b of el.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === v);
  }
  function setMyTeam(t) {
    const mine = R.players.find(p => p.id === me.id);
    if (!mine) return;
    mine.team = t;
    if (isHost()) pushRoom();
    else { emit({ t: 'upd', p: { team: t } }, false); renderRoom(); }
  }
  function myTankChanged() {
    saveMe();
    buildPickers();
    if (!R || screen !== 'room') return;
    const mine = R.players.find(p => p.id === me.id);
    if (mine) { mine.tank = me.tank; mine.color = me.color; mine.up = myUp(); }
    if (isHost()) pushRoom();
    else { emit({ t: 'upd', p: { tank: me.tank, color: me.color, name: me.name, up: myUp() } }, false); renderRoom(); }
  }
  function pickTank(k) {
    if (!E.TANKS[k]) return;
    if (!Wallet.owns(k)) { Shop.showInfo(k, false); return; }   // 🔒 아직 안 산 탱크 → 설명 + 사기 버튼
    me.tank = k; Sfx.play('click'); myTankChanged();
    Shop.showInfo(k, true);                                       // 고를 때마다 설명(하루 끄기면 안 뜸)
  }
  function renderCoins() {
    const c = Shop.fmt(Wallet.coins);
    $('homeCoins').textContent = c; $('roomCoins').textContent = c;
  }

  /* ---------- 탱크 고르기 ---------- */
  function buildPickers() {
    pickerInto($('tankGrid'), $('colorRow'), false);
    pickerInto($('roomTankGrid'), $('roomColorRow'), true);
  }
  function pickerInto(grid, row, mini) {
    if (!grid.children.length) {
      for (const k of E.TANK_KEYS) {
        const tk = E.TANKS[k];
        const b = document.createElement('div');
        b.className = 'tank-card'; b.dataset.k = k;
        b.innerHTML = '<canvas></canvas><div><span class="tn">' + tk.name + '</span><span class="tr">' + tk.role + '</span></div><div class="td">' + tk.desc + '</div><div class="tw">' + tk.weapons.map((w, i) => (i === 2 ? '★' : (i + 1) + '.') + ' ' + w.name).join(' · ') + '</div>' +
          '<button class="info-b" title="자세히보기">ⓘ</button><div class="lock">🔒 ' + (tk.price ? '💰' + Shop.fmt(tk.price) : '') + '</div><div class="upb"></div>';
        b.onclick = e => {
          if (e.target.closest('.info-b')) { Sfx.play('click'); Shop.showInfo(k, false); return; }
          pickTank(k);
        };
        grid.appendChild(b);
      }
      for (const c of E.COLORS) {
        const s = document.createElement('div');
        s.className = 'swatch'; s.style.background = c; s.dataset.c = c;
        s.onclick = () => { me.color = c; Sfx.play('click'); myTankChanged(); };
        row.appendChild(s);
      }
    }
    for (const b of grid.children) {
      const k = b.dataset.k, n = Wallet.owns(k) ? Wallet.upTotal(k) : 0;
      b.classList.toggle('sel', k === me.tank);
      b.classList.toggle('locked', !Wallet.owns(k));
      b.querySelector('.upb').textContent = n ? '⚙+' + n : '';
    }
    for (const s of row.children) s.classList.toggle('sel', s.dataset.c === me.color);
    drawPickers(grid, mini);
  }
  let pickT = 0;
  function drawPickers(grid, mini) {
    for (const b of grid.children) {
      const sel = b.dataset.k === me.tank;
      D.preview(b.querySelector('canvas'), b.dataset.k, me.color, { angle: sel ? 30 + Math.sin(pickT * 2) * 15 : 30, time: sel ? pickT : 0, zoom: mini ? 44 : 50, active: sel });
    }
  }

  /* ---------- 채팅 ---------- */
  const roomMsgs = [];
  function addMsgRoom(html, sys) {
    const box = $('roomMsgs'), div = document.createElement('div');
    div.className = 'm' + (sys ? ' sys' : ''); div.innerHTML = html;
    box.appendChild(div);
    while (box.children.length > 80) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }
  function addMsgGame(html, sys) {
    const box = $('chatLog'), div = document.createElement('div');
    if (sys) div.className = 'sys';
    div.innerHTML = html; box.appendChild(div);
    while (box.children.length > 6) box.removeChild(box.firstChild);
  }
  function sysMsg(text) { addMsgRoom(esc(text), true); if (screen === 'game') addMsgGame(esc(text), true); }
  function onChat(d) {
    if (typeof d.text !== 'string' || (d.to && d.to !== me.id)) return;
    const text = d.text.slice(0, 60);
    if (d.sys) { sysMsg(text); return; }
    const p = R && R.players.find(x => x.id === d.from);
    const name = cleanName(d.name) || (p && p.name) || '손님';
    const html = '<b>' + esc(name) + '</b> ' + esc(text);
    addMsgRoom(html); addMsgGame(html);
    if (d.from !== me.id) Sfx.play('chat');
  }
  function sendChat(text) {
    text = String(text || '').trim().slice(0, 60);
    if (!text) return;
    emit({ t: 'chat', name: me.name, text });
  }

  /* ================= 게임 시작 · 동기화 ================= */
  function startGame() {
    if (!isHost()) return;
    const ps = R.players.slice();
    if (ps.length < 2) { toast('2명 이상이어야 시작할 수 있어요 (컴퓨터 추가 가능)'); return; }
    const team = R.settings.mode === 'team';
    if (team) {
      const t1 = ps.filter(p => p.team === 1).length;
      if (!t1 || t1 === ps.length) { toast('팀전은 레드·블루 양쪽에 최소 1명씩 있어야 해요'); return; }
    }
    const n = ps.length, W = E.clamp(1400 + 280 * n, 1900, 3300);
    const theme = R.settings.theme === 'random' ? pick(E.THEME_KEYS) : R.settings.theme;
    let arr = shuffle(ps);
    if (team) {
      const a = shuffle(ps.filter(p => p.team === 1)), b = shuffle(ps.filter(p => p.team !== 1));
      arr = [];
      let first = Math.random() < 0.5;
      while (a.length || b.length) {
        const src = first ? (a.length ? a : b) : (b.length ? b : a);
        arr.push(src.shift()); first = !first;
      }
    }
    const spawns = {};
    arr.forEach((p, i) => { spawns[p.id] = Math.round(W * (i + 0.5) / n + (Math.random() - 0.5) * W / n * 0.35); });
    let order = shuffle(ps.map(p => p.id));
    if (team) {
      const a = shuffle(ps.filter(p => p.team === 1).map(p => p.id)), b = shuffle(ps.filter(p => p.team !== 1).map(p => p.id));
      order = []; let first = Math.random() < 0.5;
      while (a.length || b.length) { const src = first ? (a.length ? a : b) : (b.length ? b : a); order.push(src.shift()); first = !first; }
    }
    const init = {
      seed: (Math.random() * 2147483647) | 0, theme, W,
      players: ps.map(p => ({ id: p.id, name: p.name, tank: p.tank, color: p.color, team: team ? p.team : 0, bot: !!p.bot, level: p.level, up: E.cleanUp(p.up) })),
      spawns, wind: randWind(), waterY: C.H - (E.THEMES[theme].sea || 40)
    };
    const g = { gid: rid(8), init, order, turnIdx: 0, turnNo: 1, sdTurn: n * 8 + 1, mode: team ? 'team' : 'ffa', time: R.settings.time, stats: {}, craters: [], deaths: {}, dcount: 0, over: false };
    R.phase = 'game'; R.seq++;
    emit({ t: 'start', room: R, game: g });
  }
  function onStart(d) {
    if (!R || !d.game || !d.room || d.room.code !== R.code) return;
    if (d.from !== d.room.host) return;
    if (G && G.gid === d.game.gid) return;
    R = Object.assign({}, d.room, { online: R.online });
    loadGame(d.game, null);
    enterGame();
    sysMsg('게임 시작! 행운을 빌어요 💣');
    beginTurn();
  }
  function loadGame(g, snap) {
    G = JSON.parse(JSON.stringify(g));
    G.stats = G.stats || {}; G.deaths = G.deaths || {}; G.craters = G.craters || []; G.dcount = G.dcount || 0;
    if (!rd) rd = new D.Renderer($('cv'), { sfx: Sfx.play });
    world = new E.World(G.init);
    if (snap) {
      for (const k of G.craters) world.terrain.carve(k[0], k[1], k[2], k[3]);
      for (const s of snap.tanks) E.applyTankState(world.tank(s.id), s);
      world.wind = snap.wind; world.waterY = snap.waterY;
    }
    world.hooks = rd.hooks();
    rd.setWorld(world);
    sim = null; anim = null; bot = null; turnQ = []; phase = 'wait'; waitUntil = 0;
    hostBehind = 0; hostMismatch = 0;
    $('over').hidden = true;
    $('chatLog').innerHTML = '';
  }
  function requestSync() {
    if (!R || !R.online || isHost()) return;
    if (Date.now() - lastSyncReq < 3000) return;
    lastSyncReq = Date.now();
    emit({ t: 'sync-req' }, false);
  }
  function onSyncReq(d) { if (isHost()) requestSyncSend(d.from); }
  function requestSyncSend(to) {
    if (!R) return;
    if (phase === 'anim') { pendingSync.add(to); return; }
    const inGame = G && world && R.phase === 'game';
    emit({ t: 'sync', to, room: R, game: inGame ? G : null, snap: inGame ? { tanks: world.tanks.map(E.tankState), wind: world.wind, waterY: world.waterY } : null }, false);
  }
  function flushSync() { if (!pendingSync.size) return; const s = Array.from(pendingSync); pendingSync.clear(); for (const to of s) requestSyncSend(to); }
  function onSync(d) {
    if (d.to !== me.id || !R || !d.room || d.room.code !== R.code) return;
    const wasWaiting = !R.host;
    R = Object.assign({}, d.room, { online: true });
    $('joinWait').hidden = true;
    if (wasWaiting) sysMsg(isHost() ? '다시 들어왔어요 — 계속 방장이에요' : '방에 들어왔어요!');
    if (!d.game || R.phase !== 'game') { if (isHost()) pushRoom(); showRoom(); return; }
    if (G && G.gid === d.game.gid && phase === 'anim') return;
    loadGame(d.game, d.snap);
    enterGame();
    if (G.over) { phase = 'over'; showOver(); }
    else beginTurn();
    toast('게임에 연결됐어요');
  }
  function checksum() { return G.turnNo + ':' + world.tanks.map(t => t.alive ? t.hp : 'x').join(','); }

  /* ================= 턴 진행 ================= */
  function beginTurn() {
    if (!G || G.over) return;
    let t = curTank(), guard = 0;
    while (t && !t.alive && guard++ < G.order.length) { G.turnIdx = (G.turnIdx + 1) % G.order.length; t = curTank(); }
    if (!t) return;
    phase = 'aim'; turnT0 = now(); lastTick = -1;
    Object.assign(aim, { charging: false, power: 0, weapon: 0, item: null, itemUsed: false, sent: false, mvSig: '', hostPassed: false });
    live.power = -1; live.weapon = 0; live.item = null;
    t.fuel = t.moveMax || C.MOVE_MAX; t.mvAcc = 0; t.netX = null; t.jumped = false; t.jump = null;
    if (rd) rd.free = false;
    const mine = isMine(t);
    banner(mine ? '내 차례!' : t.name + ' 차례', mine, G.turnNo >= G.sdTurn ? '🌊 물이 차오르는 중!' : '');
    Sfx.play(mine ? 'myturn' : 'turn');
    if (mine) buzz([35, 70, 35]);
    bot = (t.bot && isHost()) ? { t, stage: 0, at: now() + 900 + Math.random() * 700 } : null;
    hudDirty = true;
    processQueue();
  }
  function queueTurnMsg(d) {
    if (!G || d.gid !== G.gid) return;
    turnQ.push(d);
    processQueue();
  }
  function processQueue() {
    if (!G) return;
    turnQ = turnQ.filter(m => m.turnNo >= G.turnNo && m.gid === G.gid);
    while (phase === 'aim') {
      const i = turnQ.findIndex(m => m.turnNo === G.turnNo);
      if (i < 0) break;
      const m = turnQ.splice(i, 1)[0];
      applyTurnMsg(m);
    }
  }
  function applyTurnMsg(m) {
    const t = world.tank(m.id);
    if (!t || m.id !== G.order[G.turnIdx]) return;
    if (m.t === 'item') {
      if (m.k === 'heal' && t.alive && t.items.heal > 0) {
        t.items.heal--;
        const amt = Math.min(30, (t.maxHp || C.HP) - t.hp); t.hp += amt;
        rd.heal(t, amt); Sfx.play('heal');
      }
      if (isMine(t)) aim.itemUsed = true;
      hudDirty = true;
      return;
    }
    t.netX = null;
    if (m.t === 'pass') {
      if (t.alive && m.pre && !m.pre.alive) { E.applyTankState(t, Object.assign({}, m.pre, { alive: true })); world.kill(t, m.pre.y >= world.waterY - 6 ? 'water' : 'hp'); }
      E.applyTankState(t, m.pre);
      if (m.why === 'time') sysMsg(t.name + ' — 시간 초과! 턴을 넘겨요');
      else if (m.why === 'away') sysMsg(t.name + ' 님이 자리에 없어서 턴을 넘겨요');
      Sfx.charge(-1);
      applyNext(m.next);
      afterTurn();
      return;
    }
    if (m.t === 'fire') {
      E.applyTankState(t, m.pre);
      t.lastShot = m.input.a; t.lastPower = m.input.p;
      phase = 'anim';
      anim = { m, t0: now(), acc: 0 };
      live.power = -1;
      Sfx.charge(-1);
      bot = null;
      const tk = E.TANKS[t.type], w = tk.weapons[m.input.w] || tk.weapons[0];
      if (m.input.w === 2) banner('필살! ' + w.name, false, t.name);
      if (m.input.item && m.input.item !== 'heal') { const it = E.ITEMS.find(i => i.key === m.input.item); if (it) sysMsg(t.name + ' — ' + it.icon + ' ' + it.name + ' 사용!'); }
      sim = new E.ShotSim(world, m.id, m.input);
      rd.free = false;
      hudDirty = true;
    }
  }
  function finishShot() {
    if (!sim.done) sim.finish();
    const m = anim.m, res = m.result;
    const same = JSON.stringify(sim.craters) === JSON.stringify(res.craters);
    for (const k of res.craters) G.craters.push(k);
    if (!same) { console.warn('지형 다시 맞춤'); world.terrain.rebuild(G.craters); }
    for (const s of res.tanks) {
      const t = world.tank(s.id); if (!t) continue;
      if (t.alive && !s.alive) world.kill(t, s.y >= world.waterY - 6 ? 'water' : 'hp');
      E.applyTankState(t, s);
    }
    const st = G.stats[m.id] || (G.stats[m.id] = { dmg: 0, kills: 0 });
    st.dmg += res.dealt || 0;
    for (const id of res.kills || []) if (id !== m.id) st.kills++;
    sim = null; anim = null;
    applyNext(m.next);
    afterTurn();
  }
  function applyNext(nx) {
    if (!nx) return;
    G.turnIdx = nx.idx; G.turnNo = nx.turnNo; world.wind = nx.wind;
    if (nx.waterY < world.waterY) {
      world.waterY = nx.waterY;
      for (const t of world.tanks) if (t.alive && t.y >= world.waterY - 4) world.kill(t, 'water');
      Sfx.play('water');
    }
  }
  function afterTurn() {
    for (const t of world.tanks) if (!t.alive && G.deaths[t.id] == null) G.deaths[t.id] = ++G.dcount;
    hudDirty = true;
    if (checkOver()) return;
    phase = 'wait'; waitUntil = now() + 700;
    flushSync();
  }
  function computeNext(w) {
    const n = G.order.length;
    let idx = G.turnIdx;
    for (let k = 1; k <= n; k++) {
      const j = (G.turnIdx + k) % n, t = w.tank(G.order[j]);
      if (t && t.alive) { idx = j; break; }
    }
    const turnNo = G.turnNo + 1;
    let waterY = w.waterY;
    if (turnNo >= G.sdTurn) waterY = Math.max(Math.round(C.H * 0.42), waterY - 14);
    return { idx, turnNo, wind: randWind(), waterY };
  }
  function checkOver() {
    const alive = world.tanks.filter(t => t.alive);
    const over = G.mode === 'team' ? new Set(alive.map(t => t.team)).size <= 1 : alive.length <= 1;
    if (!over) return false;
    G.over = true; phase = 'over';
    setTimeout(showOver, 900);
    return true;
  }

  /* ----- 쏘기 ----- */
  function shoot(t, input) {
    aim.sent = true;
    const pre = E.tankState(t);
    const cl = world.clone();
    const s = new E.ShotSim(cl, t.id, input).run();
    emit({ t: 'fire', gid: G.gid, id: t.id, turnNo: G.turnNo, input, pre, result: s.result(), next: computeNext(cl) });
  }
  function fireNow() {
    const t = curTank();
    if (!isMine(t) || aim.sent || phase !== 'aim' || !t.alive || t.jump) return;
    aim.charging = false; Sfx.charge(-1); buzz(25);
    shoot(t, { x: t.x, y: t.y, f: t.facing, a: t.angle, p: Math.max(1, Math.round(aim.power * 10) / 10), w: aim.weapon, item: aim.item });
  }
  function sendPass(t, why) {
    if (aim.sent) return;
    aim.sent = true; aim.charging = false; Sfx.charge(-1);
    emit({ t: 'pass', gid: G.gid, id: t.id, turnNo: G.turnNo, pre: E.tankState(t), next: computeNext(world), why });
  }
  function startCharge() {
    const t = curTank();
    if (!isMine(t) || phase !== 'aim' || aim.sent || aim.charging || !t.alive || t.jump) return;
    aim.charging = true; aim.power = 0;
  }
  function canAim() { const t = curTank(); return isMine(t) && phase === 'aim' && !aim.sent && t.alive; }
  // 각도를 n도만큼 (터치로 밀기 · 각도 막대 · 키보드 모두 여기로)
  function nudgeAngle(n) {
    if (!canAim()) return;
    const t = curTank(), a = E.clamp(t.angle + n, 0, 90);
    if (a !== t.angle) { if (Math.floor(a / 10) !== Math.floor(t.angle / 10)) buzz(5); t.angle = a; hudDirty = true; }
  }
  function doJump() {
    const t = curTank();
    if (!isMine(t) || phase !== 'aim' || aim.sent || aim.charging || !t.alive || t.jump || t.falling) return;
    if (t.jumped) { toast('점프는 한 턴에 한 번만 할 수 있어요'); return; }
    if (t.fuel < C.JUMP_COST) { toast('이동 게이지가 모자라요 (점프에 ' + C.JUMP_COST + ' 필요)'); return; }
    if (world.startJump(t)) { Sfx.play('jump'); buzz(20); hudDirty = true; if (rd) rd.free = false; }
  }
  function releaseCharge() { if (aim.charging) fireNow(); }
  function selectWeapon(i) {
    const t = curTank();
    if (!isMine(t) || aim.sent || phase !== 'aim') return;
    if (i === 2 && t.sg < 100) { toast('필살 게이지가 아직 다 안 찼어요 (' + t.sg + '%)'); return; }
    aim.weapon = i; Sfx.play('click'); hudDirty = true;
  }
  function useItem(key) {
    const t = curTank();
    if (!isMine(t) || aim.sent || phase !== 'aim' || aim.charging) return;
    if (aim.itemUsed) { toast('아이템은 한 턴에 하나만 쓸 수 있어요'); return; }
    if (!(t.items[key] > 0)) { toast('이 아이템은 다 썼어요'); return; }
    if (key === 'heal') {
      if (aim.item) { toast('이미 다른 아이템을 골랐어요'); return; }
      if (t.hp >= (t.maxHp || C.HP)) { toast('체력이 가득 차 있어요'); return; }
      aim.itemUsed = true;
      emit({ t: 'item', gid: G.gid, id: t.id, turnNo: G.turnNo, k: 'heal' });
    } else {
      aim.item = aim.item === key ? null : key;
      Sfx.play('click');
    }
    hudDirty = true;
  }
  function stepAngle(d) { const t = curTank(); if (t) { t.angle = E.clamp(t.angle + d, 0, 90); hudDirty = true; } }
  function angleKey(k, dir, dt) {
    if (!keys[k]) { hold[k] = 0; acc[k] = 0; return; }
    if (!hold[k]) stepAngle(dir);
    hold[k] = (hold[k] || 0) + dt;
    if (hold[k] > 0.28) { acc[k] = (acc[k] || 0) + dt * 30; while (acc[k] >= 1) { acc[k] -= 1; stepAngle(dir); } }
  }
  function sendMove(t, c) {
    if (!R || !R.online) return;
    const sig = Math.round(t.x) + '|' + Math.round(t.y) + '|' + t.facing + '|' + t.angle + '|' + Math.round(c) + '|' + (bot ? 0 : aim.weapon) + '|' + (bot ? '' : aim.item);
    const tm = now();
    if (sig === aim.mvSig || tm - aim.mvAt < 110) return;
    aim.mvSig = sig; aim.mvAt = tm;
    emit({ t: 'mv', gid: G.gid, id: t.id, turnNo: G.turnNo, x: t.x, y: t.y, f: t.facing, a: t.angle, c: Math.round(c), w: bot ? 0 : aim.weapon, it: bot ? null : aim.item, hp: t.hp }, false, 0);
  }
  function onMove(d) {
    if (!G || d.gid !== G.gid || d.turnNo !== G.turnNo || phase !== 'aim') return;
    const t = world.tank(d.id);
    if (!t || controlsLocal(t) || d.id !== G.order[G.turnIdx]) return;
    t.netX = d.x; t.netY = d.y; t.facing = d.f === -1 ? -1 : 1; t.angle = E.clamp(d.a | 0, 0, 90);
    live.power = d.c; live.weapon = d.w | 0; live.item = d.it || null;
    hudDirty = true;
  }

  /* ----- 컴퓨터 차례 (방장 기기에서 계산) ----- */
  function runBot(dt) {
    const b = bot; if (!b || aim.sent) return;
    const t = b.t, tm = now();
    if (!t.alive) { sendPass(t, 'dead'); return; }
    if (tm < b.at) return;
    if (b.stage === 0) {
      b.plan = E.aiPlan(world, t, { team: G.mode === 'team' });
      if (!b.plan) { sendPass(t, 'bot'); return; }
      if (b.plan.err > 120 && t.fuel > 30 && !b.moved) {
        b.moved = true; b.dir = b.plan.f; b.left = 40 + Math.random() * 70; b.stage = 4; return;
      }
      if (b.plan.heal) emit({ t: 'item', gid: G.gid, id: t.id, turnNo: G.turnNo, k: 'heal' });
      t.facing = b.plan.f; b.stage = 1; b.at = tm + 250;
    } else if (b.stage === 4) {
      t.facing = b.dir;
      const mv = world.moveTank(t, b.dir, dt);
      world.stepFall(t, dt);
      b.left -= mv;
      sendMove(t, -1);
      if (b.left <= 0 || (mv === 0 && t.mvAcc === 0 && !t.falling)) { b.stage = 0; b.at = tm + 350; }
    } else if (b.stage === 1) {
      const d = b.plan.a - t.angle;
      if (d !== 0) { b.acc = (b.acc || 0) + dt * 40; while (b.acc >= 1 && t.angle !== b.plan.a) { b.acc -= 1; t.angle += Math.sign(d); } }
      sendMove(t, -1);
      if (t.angle === b.plan.a) { b.stage = 2; b.chg = 0; b.at = tm + 300; }
    } else if (b.stage === 2) {
      b.chg = Math.min(b.plan.p, b.chg + dt * 100 / 2);
      live.power = b.chg;
      sendMove(t, b.chg);
      if (b.chg >= b.plan.p) shoot(t, { x: t.x, y: t.y, f: t.facing, a: t.angle, p: b.plan.p, w: b.plan.w, item: b.plan.item });
    }
    hudDirty = true;
  }

  /* ================= 매 프레임 ================= */
  function update(dt) {
    if (!G || !world) return;
    const tm = now();
    if (phase === 'wait' && tm >= waitUntil) beginTurn();
    if (phase === 'anim' && sim) {
      if (document.hidden) sim.run();
      else {
        anim.acc += dt;
        let n = 0;
        while (anim.acc >= C.DT && n < 40) { sim.step(C.DT); anim.acc -= C.DT; n++; }
        if (n >= 40) anim.acc = 0;
      }
      if (sim.done || tm - anim.t0 > 70000) finishShot();
    }
    if (phase !== 'aim') return;
    const t = curTank(); if (!t) return;
    const el = (tm - turnT0) / 1000, left = G.time - el;
    if (isMine(t) && !aim.sent) {
      if (t.jump) { world.stepJump(t, dt); hudDirty = true; if (rd) rd.free = false; }
      else {
        const L = !!keys.left, Rt = !!keys.right;
        if (L !== Rt) {
          const dir = L ? -1 : 1;
          if (t.facing !== dir) { t.facing = dir; hudDirty = true; }
          if (!aim.charging && !t.falling && world.moveTank(t, dir, dt)) hudDirty = true;
          if (rd) rd.free = false;
        }
        world.stepFall(t, dt);
      }
      if (!t.alive) { sendPass(t, 'dead'); return; }
      angleKey('up', 1, dt); angleKey('down', -1, dt);
      if (aim.charging) {
        aim.power = Math.min(100, aim.power + dt * 100 / 2);
        Sfx.charge(aim.power);
        hudDirty = true;
        if (aim.power >= 100) { fireNow(); return; }
      }
      sendMove(t, aim.charging ? aim.power : -1);
      const sec = Math.ceil(left);
      if (sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; Sfx.play('tick'); }
      if (left <= 0 && !t.jump) { if (aim.charging) fireNow(); else sendPass(t, 'time'); }
    } else if (t.bot && isHost()) {
      if (!bot && !aim.sent) bot = { t, stage: 0, at: tm + 600 };
      runBot(dt);
    } else if (!controlsLocal(t)) {
      if (t.netX != null) {
        const k = Math.min(1, dt * 12);
        t.x += (t.netX - t.x) * k; t.y += (t.netY - t.y) * k;
        if (Math.abs(t.netX - t.x) < 0.3 && Math.abs(t.netY - t.y) < 0.3) { t.x = t.netX; t.y = t.netY; }
      }
      // 방장: 자리 비운 사람 / 시간이 한참 지난 턴은 대신 넘김
      if (isHost() && R.online && !aim.hostPassed && ((!present(t.id) && el > 4) || el > G.time + 15)) {
        aim.hostPassed = true;
        sendPass(t, present(t.id) ? 'time' : 'away');
      }
    }
  }

  /* ================= 게임 화면(HUD) ================= */
  let hudDirty = true, hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function setStyle(id, k, v) { const key = id + '.' + k; if (hudCache[key] !== v) { hudCache[key] = v; $(id).style[k] = v; } }
  function buildHudButtons() {
    const t = curTank(); if (!t) return;
    const tk = E.TANKS[t.type];
    const wb = $('weapons'); wb.innerHTML = '';
    tk.weapons.forEach((w, i) => {
      const b = document.createElement('button');
      b.className = 'wbtn' + (i === 2 ? ' ss' : '');
      b.innerHTML = (i === 2 ? '<span class="sg"></span>' : '') + '<span class="k">' + (i + 1) + '</span><span class="wn">' + (i === 2 ? '★' : '') + w.name + '</span><span class="ws">피해 ' + w.dmg + (w.count ? '×' + w.count : '') + '</span>';
      b.onclick = () => selectWeapon(i);
      wb.appendChild(b);
    });
    const ib = $('items'); ib.innerHTML = '';
    E.ITEMS.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'ibtn2'; b.title = it.name + ' — ' + it.desc;
      b.innerHTML = '<span class="k">' + 'ZXCV'[i] + '</span>' + it.icon + '<span class="cnt"></span>';
      b.onclick = () => useItem(it.key);
      ib.appendChild(b);
    });
    hudCache.btnFor = t.id + ':' + t.type;
  }
  function hudTick() {
    if (!G || !world) return;
    const t = curTank(); if (!t) return;
    if (hudCache.btnFor !== t.id + ':' + t.type) { buildHudButtons(); hudDirty = true; }
    const tm = now();
    // 타이머
    const left = phase === 'aim' ? Math.max(0, Math.ceil(G.time - (tm - turnT0) / 1000)) : G.time;
    setText('timerTxt', phase === 'aim' ? String(left) : '…');
    $('timer').classList.toggle('warn', phase === 'aim' && left <= 5);
    // 바람
    const w = world.wind;
    setStyle('windFill', 'left', w < 0 ? (50 + w * 5) + '%' : '50%');
    setStyle('windFill', 'width', Math.abs(w) * 5 + '%');
    setText('windTxt', w === 0 ? '0' : w < 0 ? '◀'.repeat(Math.min(3, Math.ceil(-w / 3.4))) + ' ' + (-w) : w + ' ' + '▶'.repeat(Math.min(3, Math.ceil(w / 3.4))));
    if (!hudDirty && !(tm - (hudCache.at || 0) > 250)) return;
    hudDirty = false; hudCache.at = tm;
    const mine = isMine(t) && phase === 'aim' && !aim.sent;
    $('hud').classList.toggle('watch', !mine);
    $('hud').classList.toggle('mine', isMine(t));
    setText('turnInfo', G.turnNo + '번째 턴 · ' + t.name + (isMine(t) ? ' (나)' : '') + (G.turnNo >= G.sdTurn ? ' 🌊' : G.turnNo >= G.sdTurn - 3 ? ' · 곧 물이 차올라요' : ''));
    setText('meName', t.name + (isMine(t) ? ' (나)' : ''));
    { const k = t.hp / (t.maxHp || C.HP); setStyle('meHp', 'background', k > 0.6 ? '#4ddc6a' : k > 0.3 ? '#ffc93d' : '#ff4d4d'); }
    const mhp = t.maxHp || C.HP, mmv = t.moveMax || C.MOVE_MAX;
    setStyle('meHp', 'width', Math.min(100, t.hp / mhp * 100) + '%');
    setText('meHpTxt', t.hp + ' / ' + mhp);
    setStyle('meFuel', 'width', Math.max(0, t.fuel / mmv * 100) + '%');
    setStyle('tFuel', 'width', Math.max(0, t.fuel / mmv * 100) + '%');
    setText('angTxt', t.angle + '°');
    setText('tAngTxt', t.angle + '°');
    if (hudCache.ruler !== t.angle) { hudCache.ruler = t.angle; $('tRuler').style.backgroundPositionY = (t.angle * 2.6) + 'px'; }
    const canJump = mine && !t.jumped && !t.jump && t.fuel >= C.JUMP_COST;
    $('btnJump').disabled = !canJump; $('tJump').classList.toggle('off', !canJump);
    setStyle('angNeedle', 'transform', 'rotate(' + (t.facing > 0 ? -t.angle : -(180 - t.angle)) + 'deg)');
    const pw = isMine(t) ? (aim.charging ? aim.power : -1) : live.power;
    setText('pwTxt', pw >= 0 ? pw.toFixed(1) : (t.lastPower != null ? '지난 ' + t.lastPower : '0'));
    setStyle('pwFill', 'width', Math.max(0, pw) + '%');
    if (hudCache.tpw !== pw) { hudCache.tpw = pw; $('tFire').style.setProperty('--pw', Math.max(0, pw)); }
    if (t.lastPower != null) { setStyle('pwLast', 'display', 'block'); setStyle('pwLast', 'left', 'calc(' + t.lastPower + '% - 1px)'); }
    else setStyle('pwLast', 'display', 'none');
    const wsel = isMine(t) ? aim.weapon : live.weapon, isel = isMine(t) ? aim.item : live.item;
    const wbs = $('weapons').children;
    for (let i = 0; i < wbs.length; i++) {
      wbs[i].classList.toggle('on', i === wsel);
      wbs[i].disabled = !mine;
      if (i === 2) {
        wbs[i].querySelector('.sg').style.width = t.sg + '%';
        wbs[i].classList.toggle('ready', t.sg >= 100);
      }
    }
    const ibs = $('items').children;
    E.ITEMS.forEach((it, i) => {
      const b = ibs[i]; if (!b) return;
      const c = t.items[it.key] || 0;
      b.querySelector('.cnt').textContent = c;
      b.classList.toggle('used', c <= 0);
      b.classList.toggle('on', isel === it.key);
      b.disabled = !mine;
    });
    // 미니 아이콘
    if (hudCache.icon !== t.id + t.alive) { hudCache.icon = t.id + t.alive; D.preview($('meIcon'), t.type, t.alive ? t.color : '#777', { angle: 30, zoom: 46 }); }
    renderGList();
  }
  function renderGList() {
    const ul = $('gList'), cur = curTank();
    const sig = G.order.map(id => { const t = world.tank(id); return id + t.hp + t.alive + (t === cur) + present(id); }).join('|');
    const hpk = t => Math.min(1, t.hp / (t.maxHp || C.HP));
    if (hudCache.glist === sig) return;
    hudCache.glist = sig;
    ul.innerHTML = '';
    for (const id of G.order) {
      const t = world.tank(id); if (!t) continue;
      const li = document.createElement('li');
      li.className = (t === cur ? 'cur ' : '') + (t.alive ? '' : 'dead');
      const off = !t.bot && R && R.online && !present(t.id);
      li.innerHTML = '<span class="c" style="background:' + t.color + '"></span><span class="n">' + (t.team ? (t.team === 1 ? '🔴' : '🔵') : '') + esc(t.name) + (t.id === me.id ? ' (나)' : '') + (off ? ' 📴' : '') + '</span>' +
        (t.alive ? '<span class="hb"><i style="width:' + hpk(t) * 100 + '%;background:' + (hpk(t) > 0.6 ? '#4ddc6a' : hpk(t) > 0.3 ? '#ffc93d' : '#ff4d4d') + '"></i></span>' : '💀');
      li.onclick = () => { if (rd) { rd.free = true; const c = rd.camFor(t.x, t.y - 60); rd.cam.x = c.x; rd.cam.y = c.y; } };
      ul.appendChild(li);
    }
  }
  let bannerTimer = 0;
  function banner(text, mine, small) {
    const b = $('banner');
    b.innerHTML = esc(text) + (small ? '<small>' + esc(small) + '</small>' : '');
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    b.classList.toggle('mine', !!mine);
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 1700);
  }
  function viewState() {
    const off = {};
    if (R && R.online && world) for (const t of world.tanks) if (!t.bot && !present(t.id)) off[t.id] = 1;
    // 예상 경로(꼭대기까지만): 내 차례일 때만. 파워를 모으는 중이면 그 파워, 아니면 지난번 파워(없으면 50)
    let pv = null;
    const t = phase === 'aim' ? curTank() : null;
    if (t && isMine(t) && !aim.sent && t.alive && !t.jump) {
      const tk = E.TANKS[t.type] || E.TANKS.boom;
      pv = { power: aim.charging ? Math.max(1, aim.power) : (t.lastPower != null ? t.lastPower : 50), spec: tk.weapons[aim.weapon] || tk.weapons[0], wind: aim.item === 'calm' ? 0 : world.wind, live: aim.charging };
    }
    return { sim, focus: phase === 'aim' ? curTank() : null, phase, me: me.id, wind: world ? world.wind : 0, offline: off, pv };
  }
  // 판이 끝나면 코인 지급(한 판에 한 번)
  function payReward(iWon, rank) {
    const box = $('overCoins');
    box.hidden = true;
    if (!G || !world || !world.tank(me.id)) return;
    const s = G.stats[me.id] || { dmg: 0, kills: 0 };
    const parts = [['참가', 30], ['피해', Math.floor(s.dmg * 0.8)], ['K.O.', s.kills * 40], ['승리', iWon ? 120 : 0], ['순위', rank === 1 ? 0 : rank === 2 ? 20 : 0]];
    const total = parts.reduce((a, p) => a + p[1], 0);
    const fresh = Wallet.reward(G.gid, total);
    box.innerHTML = '💰 <b>+' + Shop.fmt(total) + '</b> 코인' + (fresh ? '' : ' <small>(이미 받음)</small>') + '<small>' + parts.filter(p => p[1]).map(p => p[0] + ' ' + p[1]).join(' · ') + ' · 지금 ' + Shop.fmt(Wallet.coins) + '</small>';
    box.hidden = false;
    if (fresh) setTimeout(() => Sfx.play('coin'), 500);
  }

  /* ----- 결과 ----- */
  function showOver() {
    if (!G || !world) return;
    const alive = world.tanks.filter(t => t.alive);
    const ranked = world.tanks.slice().sort((a, b) => (b.alive - a.alive) || ((G.deaths[b.id] || 0) - (G.deaths[a.id] || 0)) || (((G.stats[b.id] || {}).dmg || 0) - ((G.stats[a.id] || {}).dmg || 0)));
    let title, iWon = false, winner = ranked[0];
    if (!alive.length) title = '무승부!';
    else if (G.mode === 'team') { const tm = alive[0].team; title = (tm === 1 ? '🔴 레드팀' : '🔵 블루팀') + ' 승리!'; iWon = world.tanks.some(t => t.id === me.id && t.team === tm); }
    else { title = '🏆 ' + alive[0].name + ' 승리!'; iWon = alive[0].id === me.id; }
    $('overTitle').textContent = title;
    $('over').hidden = false;   // 먼저 보이게 해야 탱크 그림 크기를 제대로 잼
    D.preview($('overTank'), winner.type, winner.alive ? winner.color : '#777', { angle: 55, zoom: 44, time: 1 });
    const tb = $('overRank'); tb.innerHTML = '';
    ranked.forEach((t, i) => {
      const s = G.stats[t.id] || { dmg: 0, kills: 0 };
      const tr = document.createElement('tr');
      if (t.id === me.id) tr.className = 'me';
      tr.innerHTML = '<td>' + (i === 0 && alive.length ? '👑' : (i + 1)) + '</td><td><canvas></canvas></td><td>' + (t.team ? (t.team === 1 ? '🔴' : '🔵') : '') + esc(t.name) + '</td><td>' + s.dmg + '</td><td>' + s.kills + '</td>';
      tb.appendChild(tr);
      D.preview(tr.querySelector('canvas'), t.type, t.alive ? t.color : '#777', { angle: 30, zoom: 46 });
    });
    const host = isHost();
    $('btnAgain').hidden = !host; $('btnToRoom').hidden = !host;
    $('overWait').textContent = host ? '' : '방장이 다음 판을 시작하면 자동으로 넘어가요';
    $('over').hidden = false;
    const inGame = world.tanks.some(t => t.id === me.id);
    if (inGame) Sfx.play(iWon ? 'win' : 'lose');
    payReward(iWon, ranked.findIndex(t => t.id === me.id) + 1);
  }

  /* ================= 화면 전환 ================= */
  function showScreen(id) {
    screen = id;
    for (const s of ['home', 'room', 'game']) $(s).hidden = s !== id;
    document.body.classList.toggle('in-game', id === 'game');
    window.scrollTo(0, 0);
    if (id === 'game') lockLandscape(); else unlockOrientation();
  }
  function showHome() {
    showScreen('home');
    const code = (new URLSearchParams(location.search).get('r') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    $('inviteBox').hidden = !code; $('btnJoin').hidden = !code;
    $('inviteCode').textContent = code.toUpperCase();
    $('btnCreate').textContent = code ? '🌐 새 방 만들기' : '🌐 친구와 온라인 대전 (방 만들기)';
    $('btnCreate').classList.toggle('gold', !code);
    $('nick').value = me.name;
    buildPickers();
    renderCoins();
    demoStart();
  }
  function showRoom() {
    showScreen('room');
    G = null; world = null; sim = null; anim = null; phase = 'none'; bot = null;
    Sfx.charge(-1);
    buildPickers();
    renderCoins();
    renderRoom();
    demoStart();
  }
  function enterGame() {
    showScreen('game');
    demoStop();
    hudCache = {}; hudDirty = true;
    hintUntil = Date.now() + 9000; setTimeout(layout, 9100);
    $('chatForm').hidden = true;
    layout();
    const t = curTank();
    if (rd && t) rd.lookAt(t.x, t.y - 60, true);
    requestAnimationFrame(layout);
  }
  function layout() {
    if (!rd) return;
    rd.resize();
    hudCache.icon = null;   // 화면 크기가 바뀌면 내 탱크 아이콘 다시 그림
    const hh = $('hud').offsetHeight;
    rd.hudPx = hh * rd.dpr;
    rd.topPx = 66 * rd.dpr;
    document.documentElement.style.setProperty('--hudH', hh + 'px');
    $('rotateHint').hidden = !(innerHeight > innerWidth && screen === 'game' && Date.now() < hintUntil && !document.fullscreenElement);
  }
  window.addEventListener('resize', () => { layout(); if (demo.rd) demo.rd.resize(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (screen === 'game') layout(); }).observe($('hud'));

  /* ================= 모바일: 전체화면 · 가로 고정 · 진동 ================= */
  let hintUntil = 0;
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  const CAN_FULL = !!(document.documentElement.requestFullscreen && document.fullscreenEnabled);
  const APP_MODE = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  function lockLandscape() {
    if (!TOUCH || !(document.fullscreenElement || APP_MODE)) return;
    try { const o = window.screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => { }); } catch (e) { }
  }
  function unlockOrientation() { try { const o = window.screen.orientation; if (o && o.unlock) o.unlock(); } catch (e) { } }
  function toggleFull() {
    if (!CAN_FULL) return;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => { }); return; }
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { if (screen === 'game') lockLandscape(); }).catch(() => { });
  }
  document.addEventListener('fullscreenchange', () => { $('btnFull').textContent = document.fullscreenElement ? '🗗' : '⛶'; setTimeout(layout, 120); });
  $('btnFull').hidden = !(TOUCH && CAN_FULL);
  $('btnFull').onclick = () => toggleFull();
  $('rotateHint').textContent = CAN_FULL ? '📱 눌러서 가로 전체화면으로 하기' : '📱 휴대폰을 가로로 돌리면 더 넓게 보여요';
  $('rotateHint').onclick = () => { hintUntil = 0; layout(); toggleFull(); };
  function buzz(p) { if (!TOUCH || Sfx.isMuted()) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } }

  /* ================= 첫 화면 배경: 컴퓨터끼리 싸우는 데모 ================= */
  const demo = { rd: null, world: null, sim: null, next: 0, idx: 0, on: false };
  function demoNew() {
    const ks = shuffle(E.TANK_KEYS).slice(0, 4), cs = shuffle(E.COLORS);
    const players = ks.map((k, i) => ({ id: 'd' + i, name: BOT_NAMES[i], tank: k, color: cs[i], bot: true, level: 'easy' }));
    const W = 2400, spawns = {};
    players.forEach((p, i) => { spawns[p.id] = W * (i + 0.5) / 4; });
    demo.world = new E.World({ seed: (Math.random() * 1e9) | 0, theme: pick(E.THEME_KEYS), W, players, spawns, wind: randWind() });
    if (!demo.rd) demo.rd = new D.Renderer($('bg'), { autoPan: true });
    demo.world.hooks = demo.rd.hooks();
    demo.rd.setWorld(demo.world);
    demo.sim = null; demo.next = now() + 1200; demo.idx = 0;
  }
  function demoStart() { if (demo.on) return; demo.on = true; if (!demo.world) demoNew(); else demo.rd.resize(); }
  function demoStop() { demo.on = false; }
  function demoTick(dt) {
    if (!demo.on || !demo.world) return;
    const w = demo.world, tm = now();
    if (!demo.sim && tm > demo.next) {
      const alive = w.tanks.filter(t => t.alive);
      if (alive.length <= 1) { demoNew(); return; }
      const t = w.tanks[demo.idx++ % w.tanks.length];
      if (t.alive) {
        const plan = E.aiPlan(w, t, {});
        if (plan) { t.facing = plan.f; t.angle = plan.a; demo.sim = new E.ShotSim(w, t.id, { x: t.x, y: t.y, f: plan.f, a: plan.a, p: plan.p, w: plan.w }); }
      }
    }
    if (demo.sim) {
      demo.acc = (demo.acc || 0) + dt; let n = 0;
      while (demo.acc >= C.DT && n < 30) { demo.sim.step(C.DT); demo.acc -= C.DT; n++; }
      if (n >= 30) demo.acc = 0;
      if (demo.sim.done) { demo.sim = null; demo.next = tm + 1400; w.wind = randWind(); }
    }
    demo.rd.frame(dt, { sim: demo.sim, phase: 'anim', wind: w.wind });
  }

  /* ================= 루프 ================= */
  let lastT = now();
  function loop(t) {
    const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000)); lastT = t;
    try { update(dt); } catch (e) { console.error(e); }
    if (screen === 'game' && rd && world) {
      const vs = viewState();
      rd.frame(dt, vs);
      rd.drawMini($('mini'), vs);
      hudTick();
    } else if (!Shop.isOpen()) {
      // 상점·자세히보기 창이 열려 있으면 뒤 배경 전투·탱크 카드 움직임은 잠시 멈춤(휴대폰 부담 줄이기)
      demoTick(dt);
      pickT += dt;
      if (Math.floor(pickT * 8) !== Math.floor((pickT - dt) * 8)) drawPickers(screen === 'room' ? $('roomTankGrid') : $('tankGrid'), screen === 'room');
    }
    requestAnimationFrame(loop);
  }
  // 탭이 가려져도 턴은 계속 진행되도록
  setInterval(() => {
    if (!document.hidden) return;
    const t = now();
    try { update(Math.min(0.5, (t - lastT) / 1000)); } catch (e) { console.error(e); }
    lastT = t;
  }, 400);

  // 심장박동 · 방장 승계 · 동기화 확인
  setInterval(() => {
    if (!R || !R.online) return;
    const hb = { t: 'hb' };
    if (isHost()) {
      hb.room = R;
      if (G && world && phase === 'aim') { hb.gid = G.gid; hb.tn = G.turnNo; hb.ck = checksum(); }
      dropAbsent();
    }
    emit(hb, false, 0);
    if (screen === 'room') renderRoom();
  }, BEAT_MS);
  setInterval(() => {
    if (!R || !R.online) return;
    // 방 정보를 못 받으면 안내
    if (!R.host && Date.now() - joinAt > 7000) {
      $('joinWaitTxt').textContent = '방장을 찾지 못했어요. 방장이 나갔거나 링크가 잘못됐을 수 있어요.';
      $('btnTakeRoom').hidden = false;
    }
    if (!R.host && Date.now() - lastHello > 3000) sendHello(true);
    // 방장이 사라지면 가장 먼저 들어온 사람이 이어받음
    if (R.host && !isHost() && !present(R.host) && Date.now() - joinAt > OFF_MS + 2000) {
      const cands = R.players.filter(p => !p.bot && present(p.id)).sort((a, b) => a.join - b.join);
      if (cands.length && cands[0].id === me.id) {
        R.host = me.id; R.seq += 100;
        pushRoom();
        toast('방장이 나가서 내가 방장이 됐어요');
        sysMsg('방장이 나가서 ' + me.name + ' 님이 방장을 이어받았어요');
      }
    }
  }, 1000);
  function onBeat(d) {
    if (d.room && d.room.host === d.from) onRoom(d.room, d.from);
    if (isHost() || !R || d.from !== R.host || !d.gid) return;
    if (!G || G.gid !== d.gid) { if (R.phase === 'game') requestSync(); return; }
    if (phase === 'aim' && d.tn === G.turnNo) {
      if (d.ck !== checksum()) { if (++hostMismatch >= 2) { hostMismatch = 0; requestSync(); } } else hostMismatch = 0;
      hostBehind = 0;
    } else if (phase === 'aim' && d.tn > G.turnNo) {
      if (++hostBehind >= 3) { hostBehind = 0; requestSync(); }
    }
  }

  /* ================= 입력 ================= */
  const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', Space: 'fire' };
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
    if (screen !== 'game') return;
    if (typing) {
      if (e.key === 'Escape') { $('chatIn').blur(); $('chatForm').hidden = true; }
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); openChat(); return; }
    const k = KEYMAP[e.code];
    if (k) {
      e.preventDefault();
      if (k === 'fire') { if (!e.repeat) startCharge(); }
      else keys[k] = true;
      return;
    }
    if (e.code === 'KeyJ') { if (!e.repeat) doJump(); return; }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n != null) { selectWeapon(n); return; }
    const it = { KeyZ: 'heal', KeyX: 'double', KeyC: 'power', KeyV: 'calm' }[e.code];
    if (it) useItem(it);
  });
  document.addEventListener('keyup', e => {
    const k = KEYMAP[e.code]; if (!k) return;
    if (k === 'fire') releaseCharge(); else keys[k] = false;
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; releaseCharge(); });

  // 터치 버튼
  for (const b of document.querySelectorAll('#touch button')) {
    const k = b.dataset.k;
    const down = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } b.classList.add('press'); if (k === 'fire') startCharge(); else if (k === 'jump') doJump(); else keys[k] = true; };
    const up = e => { b.classList.remove('press'); if (k === 'fire') releaseCharge(); else if (k !== 'jump') keys[k] = false; };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  }
  // 각도 막대(휴대폰) · HUD 각도 칸: 위아래로 밀면 각도, 톡 누르면 위쪽 +1° / 아래쪽 -1°
  function angleDrag(el, pxPerDeg) {
    let st = null;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (x) { }
      st = { id: e.pointerId, y: e.clientY, y0: e.clientY, acc: 0, moved: false };
      el.classList.add('press');
    });
    el.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.id) return;
      const dy = st.y - e.clientY; st.y = e.clientY;
      if (Math.abs(e.clientY - st.y0) > 6) st.moved = true;
      // 빠르게 밀수록 더 많이
      st.acc += dy / pxPerDeg * (Math.abs(dy) > 14 ? 1.6 : 1);
      const n = Math.trunc(st.acc);
      if (n) { st.acc -= n; nudgeAngle(n); }
    });
    const end = e => {
      if (!st || e.pointerId !== st.id) return;
      if (!st.moved) { const r = el.getBoundingClientRect(); nudgeAngle(e.clientY < r.top + r.height / 2 ? 1 : -1); }
      st = null; el.classList.remove('press');
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  angleDrag($('tAng'), 2.6);
  angleDrag(document.querySelector('#hud .h-angle'), 2.6);
  $('btnJump').onclick = () => doJump();
  let angHintT = 0;
  function angHint() { const h = $('angHint'); h.hidden = false; clearTimeout(angHintT); angHintT = setTimeout(() => { h.hidden = true; }, 900); }

  // 화면 끌어서 둘러보기 · 휠 확대 · (휴대폰·내 차례) 위아래로 쓸면 각도
  (() => {
    const cv = $('cv'); let drag = null, pinch = null;
    const pts = new Map();
    const span = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    cv.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      if (pts.size === 2 && rd) { pinch = { d: span(), m: rd.zoomMul }; drag = null; return; }
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, id: e.pointerId, acc: 0, mode: e.pointerType === 'touch' && canAim() ? '?' : 'pan' };
      cv.classList.add('drag');
    });
    cv.addEventListener('pointermove', e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2 && rd) { rd.zoomMul = E.clamp(pinch.m * span() / pinch.d, 0.5, 1.5); return; }
      if (!drag || e.pointerId !== drag.id || !rd) return;
      if (drag.mode === '?') {
        const ddx = e.clientX - drag.x0, ddy = e.clientY - drag.y0;
        if (Math.hypot(ddx, ddy) < 10) return;
        drag.mode = Math.abs(ddy) > Math.abs(ddx) * 1.1 ? 'angle' : 'pan';
        drag.x = e.clientX; drag.y = e.clientY;
        if (drag.mode === 'angle') angHint();
        return;
      }
      if (drag.mode === 'angle') {
        const dy = drag.y - e.clientY; drag.y = e.clientY;
        drag.acc += dy / 3.2;
        const n = Math.trunc(drag.acc);
        if (n) { drag.acc -= n; nudgeAngle(n); angHint(); }
        return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      rd.panBy(dx * rd.dpr, dy * rd.dpr); drag.x = e.clientX; drag.y = e.clientY;
    });
    const end = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { drag = null; cv.classList.remove('drag'); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('dblclick', () => { if (rd) rd.free = false; });
    cv.addEventListener('wheel', e => { e.preventDefault(); if (rd) rd.zoomMul = E.clamp(rd.zoomMul * (e.deltaY > 0 ? 0.9 : 1.1), 0.5, 1.5); }, { passive: false });
    $('mini').addEventListener('pointerdown', e => {
      if (!rd || !world) return;
      const r = $('mini').getBoundingClientRect();
      const wx = (e.clientX - r.left) / r.width * world.W, wy = (e.clientY - r.top) / r.height * world.H;
      rd.free = true; const c = rd.camFor(wx, wy); rd.cam.x = c.x; rd.cam.y = c.y;
    });
  })();

  function openChat() {
    if (R && !R.online && R.players.every(p => p.bot || p.id === me.id)) { toast('연습 모드에선 채팅할 상대가 없어요'); return; }
    $('chatForm').hidden = false; $('chatIn').value = ''; $('chatIn').focus();
  }
  $('chatForm').addEventListener('submit', e => { e.preventDefault(); sendChat($('chatIn').value); $('chatIn').value = ''; $('chatIn').blur(); $('chatForm').hidden = true; });
  $('chatIn').addEventListener('blur', () => setTimeout(() => { $('chatForm').hidden = true; }, 100));
  $('roomChatForm').addEventListener('submit', e => { e.preventDefault(); sendChat($('roomChatIn').value); $('roomChatIn').value = ''; });

  /* ================= 버튼 연결 ================= */
  $('nick').addEventListener('input', () => { me.name = cleanName($('nick').value); saveMe(); });
  $('nick').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('nick').blur(); } });
  $('btnCreate').onclick = () => createRoom(true);
  $('btnPractice').onclick = () => createRoom(false);
  $('btnJoin').onclick = () => {
    const code = (new URLSearchParams(location.search).get('r') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (code) joinRoom(code);
  };
  $('btnTakeRoom').onclick = () => { $('btnTakeRoom').hidden = true; takeRoom(); };
  $('btnLeaveRoom').onclick = () => leaveRoom();
  $('btnCopy').onclick = () => {
    const v = $('shareUrl').value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('링크를 복사했어요! 카톡에 붙여 넣으세요 📋'), () => { $('shareUrl').select(); document.execCommand('copy'); toast('링크를 복사했어요!'); });
  };
  $('btnShare').onclick = () => {
    const url = $('shareUrl').value;
    if (navigator.share) navigator.share({ title: '포탄대작전', text: me.name + ' 님이 포탄대작전 한 판 하재요! 💣', url }).catch(() => { });
    else $('btnCopy').onclick();
  };
  for (const b of document.querySelectorAll('#botRow button')) b.onclick = () => {
    if (!isHost()) return;
    if (R.players.length >= MAX_PLAYERS) { toast('최대 8명까지예요'); return; }
    R.players.push(makeBot(b.dataset.bot)); pushRoom();
  };
  $('setTheme').onchange = () => { if (!isHost()) return; R.settings.theme = $('setTheme').value; pushRoom(); };
  for (const b of $('setMode').querySelectorAll('button')) b.onclick = () => { if (!isHost()) return; R.settings.mode = b.dataset.v; pushRoom(); };
  for (const b of $('setTime').querySelectorAll('button')) b.onclick = () => { if (!isHost()) return; R.settings.time = +b.dataset.v; pushRoom(); };
  for (const b of $('myTeam').querySelectorAll('button')) b.onclick = () => setMyTeam(+b.dataset.v);
  $('btnStart').onclick = () => startGame();
  $('btnSound').onclick = () => { Sfx.setMuted(!Sfx.isMuted()); $('btnSound').textContent = Sfx.isMuted() ? '🔇' : '🔊'; };
  $('btnSound').textContent = Sfx.isMuted() ? '🔇' : '🔊';
  $('btnChat').onclick = () => openChat();
  let exitArm = 0;
  $('btnExit').onclick = () => {
    if (Date.now() - exitArm < 2500) { leaveRoom(); return; }
    exitArm = Date.now();
    toast('한 번 더 누르면 게임에서 나가요');
  };
  $('btnAgain').onclick = () => {
    if (!isHost()) return;
    R.players = R.players.filter(p => p.bot || present(p.id));
    R.phase = 'lobby'; startGame();
  };
  $('btnToRoom').onclick = () => { if (!isHost()) return; R.phase = 'lobby'; pushRoom(); showRoom(); };
  $('btnOverExit').onclick = () => leaveRoom();
  // 상점 · 강화 · 자세히보기
  Shop.init({
    sfx: n => Sfx.play(n), toast,
    tank: () => me.tank, color: () => me.color,
    setTank(k) { if (!Wallet.owns(k)) return; me.tank = k; myTankChanged(); },
    changed() { myTankChanged(); }
  });
  Wallet.onChange(() => { renderCoins(); if (screen !== 'game') buildPickers(); });   // buildPickers는 보이는 카드만 다시 그림
  $('btnShop').onclick = () => { Sfx.play('click'); Shop.showShop('tank'); };
  $('btnRoomShop').onclick = () => { Sfx.play('click'); Shop.showShop('tank'); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastT = now(); });

  /* ================= 시작 ================= */
  $('ver').textContent = 'v' + VERSION;
  showHome();
  {
    const code = (params.get('r') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (code && ss.get('pt.room') === code && me.name) joinRoom(code);
  }
  requestAnimationFrame(loop);
  window.__pt = { me, get R() { return R; }, get G() { return G; }, get world() { return world; }, get phase() { return phase; }, get aim() { return aim; }, get rd() { return rd; }, keys, fireNow, startCharge, useItem, selectWeapon, doJump, nudgeAngle, viewState, Net, Wallet, Shop };
})();
