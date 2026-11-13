/* 포탄대작전 — 그리기: 탱크 그림 · 배경 · 폭발 효과 · 미니맵 (캔버스로 직접 그려서 이미지 파일이 필요 없음) */
(function (root) {
  'use strict';
  const E = root.Engine, C = E.C;
  const TAU = Math.PI * 2;

  function shade(hex, f) {
    const c = E.hexRgb(hex), t = f < 0 ? 0 : 255, p = Math.abs(f);
    return 'rgb(' + Math.round((t - c[0]) * p + c[0]) + ',' + Math.round((t - c[1]) * p + c[1]) + ',' + Math.round((t - c[2]) * p + c[2]) + ')';
  }
  function rgba(hex, a) { const c = E.hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function starPath(ctx, x, y, R, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (rot || 0) + i * Math.PI / 5, q = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function mix(a, b, t) {
    const c = E.hexRgb(a), d = E.hexRgb(b);
    return 'rgb(' + Math.round(c[0] + (d[0] - c[0]) * t) + ',' + Math.round(c[1] + (d[1] - c[1]) * t) + ',' + Math.round(c[2] + (d[2] - c[2]) * t) + ')';
  }
  function mixHex(a, b, t) {
    const c = E.hexRgb(a), d = E.hexRgb(b), h = v => ('0' + Math.round(v).toString(16)).slice(-2);
    return '#' + h(c[0] + (d[0] - c[0]) * t) + h(c[1] + (d[1] - c[1]) * t) + h(c[2] + (d[2] - c[2]) * t);
  }
  function strHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 1000) / 100; }

  /* ================= 탱크 그림 ================= */
  function eye(ctx, x, y, r, o, time) {
    if (o.dead) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - r * .7, y - r * .7); ctx.lineTo(x + r * .7, y + r * .7); ctx.moveTo(x + r * .7, y - r * .7); ctx.lineTo(x - r * .7, y + r * .7); ctx.stroke();
      return;
    }
    const blink = ((time + (o.seed || 0)) % 3.7) < 0.11;
    if (blink) {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * .5, x + r, y); ctx.stroke();
      return;
    }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(x, y, r * .9, r * 1.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const look = o.hurt > 0 ? 0 : r * 0.32;
    ctx.fillStyle = '#16181d'; circle(ctx, x + look, y + (o.hurt > 0 ? 0 : r * 0.1), r * 0.55); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, x + look + r * .2, y - r * .25, r * .2); ctx.fill();
  }

  function treads(ctx, o) {
    ctx.fillStyle = o.dead ? '#3a3a3a' : '#3a3f48'; ctx.strokeStyle = '#1b1e24'; ctx.lineWidth = 1.5;
    rr(ctx, -19, -10, 38, 10, 5); ctx.fill(); ctx.stroke();
    const sh = (((o.roll || 0) % 5) + 5) % 5;
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -16 + sh; x < 17; x += 5) { ctx.moveTo(x, -9.4); ctx.lineTo(x, -8); ctx.moveTo(x, -1.6); ctx.lineTo(x, -.4); }
    ctx.stroke();
    for (const wx of [-12.5, -4.2, 4.2, 12.5]) {
      ctx.fillStyle = o.dead ? '#777' : '#a3abb8'; circle(ctx, wx, -5, 3.3); ctx.fill();
      ctx.strokeStyle = '#23272e'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#4a505a'; circle(ctx, wx, -5, 1.2); ctx.fill();
    }
  }

  const BODY = {
    boom(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-18, -9); ctx.lineTo(18, -9); ctx.lineTo(15, -20); ctx.lineTo(-15, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light; ctx.globalAlpha = .6; ctx.fillRect(-13, -18.4, 26, 2.2); ctx.globalAlpha = 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-1, -20, 10.5, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-5.5, -25.5, 3.2, 1.9, -0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = dark; rr(ctx, -4.5, -32.6, 7, 3, 1.4); ctx.fill();
      ctx.fillStyle = dark; for (const x of [-13, -7, -1]) { circle(ctx, x, -12, 0.95); ctx.fill(); }
      eye(ctx, 5.5, -14.4, 3, o, time); eye(ctx, 11.6, -14.4, 3, o, time);
    },
    trio(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      rr(ctx, -18, -19, 36, 10.5, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light; ctx.globalAlpha = .55; ctx.fillRect(-15, -17.6, 30, 2); ctx.globalAlpha = 1;
      ctx.fillStyle = col; rr(ctx, -10, -27.5, 19.5, 9.5, 3.5); ctx.fill(); ctx.stroke();
      // 별 무늬
      ctx.fillStyle = '#fff3a0'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .8;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 1.6 : 3.8; ctx.lineTo(-9 + Math.cos(a) * rad, -13.8 + Math.sin(a) * rad); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark; for (const x of [3, 8, 13]) { circle(ctx, x, -11.6, .9); ctx.fill(); }
      eye(ctx, 1.6, -22.8, 2.5, o, time); eye(ctx, 6.6, -22.8, 2.5, o, time);
    },
    mole(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-18, -9); ctx.lineTo(13, -9); ctx.lineTo(13, -20); ctx.quadraticCurveTo(0, -26, -14, -21); ctx.lineTo(-18, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 드릴
      const spin = (time * (o.active ? 9 : 2)) % 1;
      ctx.fillStyle = '#c8ced8'; ctx.strokeStyle = '#59606b'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(12.5, -8.5); ctx.lineTo(27, -14.2); ctx.lineTo(12.5, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7a828e'; ctx.lineWidth = 1.1; ctx.beginPath();
      for (let k = 0; k < 4; k++) { const x = 13.5 + (k + spin) * 3.4; const h = 5.6 * (1 - (x - 12.5) / 14.5); ctx.moveTo(x - 1, -14.2 + h); ctx.lineTo(x + 1.2, -14.2 - h); }
      ctx.stroke();
      // 헬멧 램프
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#9a7400'; ctx.lineWidth = 1;
      rr(ctx, -7, -26.2, 11, 3.6, 1.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.dead ? '#888' : '#fff7b8'; circle(ctx, 5, -24.4, 2.1); ctx.fill(); ctx.stroke();
      // 고글
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-18, -15.5); ctx.lineTo(-1.5, -15.5); ctx.stroke();
      eye(ctx, 2.2, -15.2, 2.9, o, time); eye(ctx, 8.4, -15.2, 2.9, o, time);
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.8;
      circle(ctx, 2.2, -15.2, 3.8); ctx.stroke(); circle(ctx, 8.4, -15.2, 3.8); ctx.stroke();
    },
    volt(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-18, -9); ctx.lineTo(18, -9); ctx.lineTo(14, -20); ctx.lineTo(-16, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light; ctx.globalAlpha = .55; ctx.fillRect(-14, -18.6, 26, 2); ctx.globalAlpha = 1;
      // 번개 무늬
      ctx.fillStyle = '#ffe23a'; ctx.strokeStyle = '#a07a00'; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(-6, -18.4); ctx.lineTo(-10.5, -13.4); ctx.lineTo(-7.6, -13.4); ctx.lineTo(-10, -9.8); ctx.lineTo(-4, -15); ctx.lineTo(-7, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 코일 안테나
      ctx.strokeStyle = '#5d6470'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, -20); ctx.lineTo(-11, -35); ctx.stroke();
      ctx.strokeStyle = '#d08a2a'; ctx.lineWidth = 1.6;
      for (const y of [-24, -28, -32]) { ctx.beginPath(); ctx.ellipse(-11, y, 4.2, 1.6, 0, 0, TAU); ctx.stroke(); }
      const pulse = o.dead ? 0 : 0.5 + 0.5 * Math.sin(time * 6 + (o.seed || 0));
      if (!o.dead) {
        const g = ctx.createRadialGradient(-11, -37.5, 0, -11, -37.5, 9);
        g.addColorStop(0, 'rgba(255,250,170,' + (0.6 * pulse + 0.2) + ')'); g.addColorStop(1, 'rgba(255,240,120,0)');
        ctx.fillStyle = g; circle(ctx, -11, -37.5, 9); ctx.fill();
      }
      ctx.fillStyle = o.dead ? '#888' : '#fff27a'; ctx.strokeStyle = '#b08a00'; ctx.lineWidth = 1;
      circle(ctx, -11, -37.5, 3); ctx.fill(); ctx.stroke();
      if (!o.dead && ((time * 2.3 + (o.seed || 0)) % 1) < 0.12) {
        ctx.strokeStyle = '#fffbd0'; ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.moveTo(-8, -38); ctx.lineTo(-4, -41); ctx.lineTo(-5, -37); ctx.lineTo(-1, -40); ctx.stroke();
      }
      eye(ctx, 5.4, -14.4, 2.8, o, time); eye(ctx, 11.2, -14.4, 2.8, o, time);
      if (!o.dead) {
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.3; ctx.beginPath();
        ctx.moveTo(3, -19); ctx.lineTo(7.4, -17.6); ctx.moveTo(13.6, -19); ctx.lineTo(9.4, -17.6); ctx.stroke();
      }
    },
    bouncy(ctx, col, dark, light, o, time) {
      const wob = o.dead ? 1 : 1 + 0.05 * Math.sin(time * 7 + (o.seed || 0)) + (o.hurt > 0 ? 0.12 * Math.sin(time * 40) : 0);
      ctx.save();
      ctx.translate(0, -9); ctx.scale(1 - (wob - 1) * 0.6, wob);
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -9.5, 17.5, 11.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-6.5, -15.5, 5.2, 2.6, -0.35, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(ctx, -12, -11, 1.4); ctx.fill();
      ctx.restore();
      const top = -9 - 21 * wob;
      ctx.strokeStyle = dark; ctx.lineWidth = 1.4;
      const sw = Math.sin(time * 4 + (o.seed || 0)) * 2.5;
      ctx.beginPath(); ctx.moveTo(-6, top + 1); ctx.quadraticCurveTo(-7 + sw, top - 6, -9 + sw, top - 9); ctx.stroke();
      ctx.fillStyle = light; ctx.strokeStyle = dark; ctx.lineWidth = 1; circle(ctx, -9 + sw, top - 9.5, 2.6); ctx.fill(); ctx.stroke();
      eye(ctx, 4.6, -17.8 - (wob - 1) * 10, 3.6, o, time); eye(ctx, 11.4, -17.8 - (wob - 1) * 10, 3.6, o, time);
      if (!o.dead) {
        ctx.fillStyle = 'rgba(255,110,150,.55)'; ctx.beginPath(); ctx.ellipse(13.6, -12.4, 2.4, 1.3, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#3a1a24'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(8, -13.4, 2, 0.25, Math.PI - 0.25); ctx.stroke();
      }
    },
    hawk(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-19, -9); ctx.lineTo(19, -9); ctx.lineTo(22, -13); ctx.lineTo(11, -21); ctx.lineTo(-12, -21); ctx.lineTo(-18, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = light; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-15, -13); ctx.lineTo(17, -13); ctx.stroke();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-15, -21); ctx.lineTo(-20, -29); ctx.lineTo(-8, -21); ctx.closePath(); ctx.fill();
      // 레이더
      ctx.strokeStyle = '#5b6270'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -21); ctx.lineTo(-6, -27); ctx.stroke();
      const rw = o.dead ? 4 : 6 * Math.abs(Math.cos(time * 2.2 + (o.seed || 0))) + 1;
      ctx.fillStyle = '#d7dde6'; ctx.strokeStyle = '#5b6270'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(-6, -29, rw, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 외눈 렌즈
      ctx.fillStyle = '#1b1f2a'; circle(ctx, 8, -15.6, 4.6); ctx.fill();
      ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 1.2; ctx.stroke();
      if (o.dead) { eye(ctx, 8, -15.6, 3, o, time); }
      else {
        ctx.fillStyle = '#ff3b3b'; circle(ctx, 8.8, -15.6, 2.3); ctx.fill();
        ctx.fillStyle = '#fff'; circle(ctx, 9.8, -16.9, .9); ctx.fill();
      }
    },
    // ---- 상점 탱크 ----
    bear(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      rr(ctx, -19, -19.5, 38, 11.5, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light; ctx.globalAlpha = .5; ctx.fillRect(-15, -18, 30, 2); ctx.globalAlpha = 1;
      for (const ex of [-9.5, 7]) {
        ctx.fillStyle = col; ctx.strokeStyle = dark; circle(ctx, ex, -31, 4.8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,175,175,.9)'; circle(ctx, ex, -31, 2.3); ctx.fill();
      }
      ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.beginPath(); ctx.arc(-1, -19.5, 12.5, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-6.5, -26.5, 3.4, 1.8, -0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f6e2c8'; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(7.6, -21, 5.4, 3.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.ellipse(10.6, -22, 1.9, 1.4, 0, 0, TAU); ctx.fill();
      if (!o.dead) { ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(8.5, -20.2, 1.6, 0.3, Math.PI - 0.3); ctx.stroke(); }
      eye(ctx, 0.5, -26, 2.5, o, time); eye(ctx, 6.6, -26.5, 2.5, o, time);
      ctx.fillStyle = dark; for (const x of [-13, -8.5, -4]) { circle(ctx, x, -13.8, 1.2); ctx.fill(); }
    },
    fire(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-18, -9); ctx.lineTo(18, -9); ctx.lineTo(15, -19); ctx.lineTo(-16, -19); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 3;
      ctx.beginPath(); for (let x = -24; x < 22; x += 8) { ctx.moveTo(x, -8); ctx.lineTo(x + 8, -20); } ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-18, -9); ctx.lineTo(18, -9); ctx.lineTo(15, -19); ctx.lineTo(-16, -19); ctx.closePath(); ctx.stroke();
      for (const [x, h, c] of [[-13.5, 11, '#ff3d6e'], [-8, 15, '#3db8ff']]) {
        ctx.fillStyle = '#fff3c4'; ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1; rr(ctx, x - 2.6, -19 - h, 5.2, h, 1.4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c; ctx.fillRect(x - 2.6, -19 - h * 0.62, 5.2, 2.2);
        ctx.beginPath(); ctx.moveTo(x - 3.2, -19 - h); ctx.lineTo(x, -19 - h - 5.5); ctx.lineTo(x + 3.2, -19 - h); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(3.5, -19, 8.8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(0, -24.5, 2.6, 1.5, -0.5, 0, TAU); ctx.fill();
      if (!o.dead) {
        const sp = (time * 7 + (o.seed || 0)) % 1;
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(5, -27.6); ctx.quadraticCurveTo(7, -32, 10.5, -31.5); ctx.stroke();
        ctx.fillStyle = sp < .5 ? '#fff6a0' : '#ffb02e'; starPath(ctx, 11, -31.6, 2.6 + sp * 1.4, 1.1, sp * 3); ctx.fill();
      }
      eye(ctx, 3.2, -22.6, 2.5, o, time); eye(ctx, 8.8, -22.6, 2.5, o, time);
    },
    magic(ctx, col, dark, light, o, time) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = dark; ctx.fillStyle = col;
      rr(ctx, -18, -19, 36, 10.5, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light; ctx.globalAlpha = .5; ctx.fillRect(-14, -17.6, 28, 2); ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff3a0'; for (const [x, y] of [[-12, -13.5], [-5, -12.5], [11, -13]]) { starPath(ctx, x, y, 2.2, 0.9, 0); ctx.fill(); }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(1.5, -19, 9.8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      eye(ctx, 2.6, -22, 2.6, o, time); eye(ctx, 8.4, -22, 2.6, o, time);
      const sway = o.dead ? 0.35 : Math.sin(time * 2 + (o.seed || 0)) * 0.07;
      ctx.save(); ctx.translate(1, -26.5); ctx.rotate(sway);
      ctx.fillStyle = '#3b2a7a'; ctx.strokeStyle = '#1c1240'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(0, 0, 13.5, 3.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, -1); ctx.quadraticCurveTo(-3, -12, -9, -21); ctx.quadraticCurveTo(2, -15, 9, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe46a'; ctx.strokeStyle = '#9a7a00'; ctx.lineWidth = .8; starPath(ctx, 0.5, -7, 3.4, 1.4, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe46a'; circle(ctx, -9, -21, 1.6); ctx.fill();
      ctx.restore();
    }
  };

  function drawBarrel(ctx, type, dead) {
    const dk = dead ? '#555' : '#3f444d', st = '#1d2026', ring = dead ? '#666' : '#5a616c';
    ctx.lineWidth = 1.2; ctx.strokeStyle = st; ctx.fillStyle = dk;
    let len = 24;
    if (type === 'trio') {
      len = 22;
      for (const off of [-3.7, 0, 3.7]) { ctx.fillStyle = dk; rr(ctx, 0, off - 1.65, 22, 3.3, 1.5); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = ring; rr(ctx, 6, -6.2, 4, 12.4, 1.2); ctx.fill(); ctx.stroke();
    } else if (type === 'mole') {
      len = 22; rr(ctx, 0, -3, 22, 6, 2.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ring; rr(ctx, 18, -3.8, 4.5, 7.6, 1.5); ctx.fill(); ctx.stroke();
    } else if (type === 'volt') {
      len = 23; rr(ctx, 0, -2.6, 23, 5.2, 2.4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dead ? '#777' : '#ffe23a'; circle(ctx, 23, 0, 3); ctx.fill(); ctx.stroke();
    } else if (type === 'bouncy') {
      len = 20; rr(ctx, 0, -3, 20, 6, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dead ? '#777' : '#ff9ccc'; circle(ctx, 21, 0, 3.8); ctx.fill(); ctx.stroke();
    } else if (type === 'hawk') {
      len = 27; rr(ctx, 0, -2, 27, 4, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ring; rr(ctx, 22.5, -3.1, 5, 6.2, 1.5); ctx.fill(); ctx.stroke();
    } else if (type === 'bear') {
      len = 21; rr(ctx, 0, -4.4, 21, 8.8, 3.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ring; rr(ctx, 15, -5.6, 7, 11.2, 2.5); ctx.fill(); ctx.stroke();
    } else if (type === 'fire') {
      len = 22; ctx.fillStyle = dead ? '#999' : '#f4efe6'; rr(ctx, 0, -3.6, 22, 7.2, 2.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dead ? '#777' : '#ff3d6e'; for (const x of [5, 12]) ctx.fillRect(x, -3.6, 3, 7.2);
      ctx.fillStyle = ring; rr(ctx, 18.5, -4.6, 4.5, 9.2, 1.6); ctx.fill(); ctx.stroke();
    } else if (type === 'magic') {
      len = 22; ctx.fillStyle = dead ? '#666' : '#8a5a34'; rr(ctx, 0, -1.9, 22, 3.8, 1.9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dead ? '#888' : '#ffe46a'; ctx.strokeStyle = '#9a7a00'; starPath(ctx, 24, 0, 5, 2.1, 0); ctx.fill(); ctx.stroke();
      return;
    } else {
      rr(ctx, 0, -3.6, 24, 7.2, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ring; rr(ctx, 19, -4.7, 6, 9.4, 2); ctx.fill(); ctx.stroke();
    }
    if (type !== 'trio') {
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(2, -1.4); ctx.lineTo(len - 6, -1.4); ctx.stroke();
    }
  }

  // 원점 = 탱크 바닥 가운데. o: {type,color,facing,angle,tilt,dead,time,seed,roll,recoil,hurt,active}
  function drawTank(ctx, o) {
    const f = o.facing || 1, col = o.dead ? '#7a7a7a' : o.color;
    const dark = shade(col, -0.45), light = shade(col, 0.4);
    const time = o.time || 0;
    ctx.save();
    if (o.hurt > 0) ctx.translate(Math.sin(time * 70) * 1.6 * o.hurt, 0);
    ctx.save();
    ctx.translate(0, -C.PIVOT); ctx.scale(f, 1);
    ctx.rotate(-(o.dead ? -18 : o.angle) * Math.PI / 180);
    ctx.translate(-(o.recoil || 0), 0);
    drawBarrel(ctx, o.type, o.dead);
    ctx.restore();
    ctx.save();
    ctx.rotate(o.tilt || 0); ctx.scale(f, 1);
    treads(ctx, o);
    (BODY[o.type] || BODY.boom)(ctx, col, dark, light, o, time);
    ctx.restore();
    ctx.restore();
  }

  // UI용 미리보기
  function preview(cv, type, color, opts) {
    opts = opts || {};
    // 화면에 안 보이는(숨겨진) 캔버스는 그리지 않음 — 예전엔 숨겨진 캔버스 크기를 잘못 재서
    // 그릴 때마다 2배씩 커졌고(휴대폰처럼 화면 배율이 2 이상일 때), 결국 화면이 멈췄음
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, root.devicePixelRatio || 1), W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const s = cv.height / (opts.zoom || 50);
    ctx.setTransform(s, 0, 0, s, cv.width / 2 + (opts.dx || 0) * s, cv.height * (opts.ground || 0.86));
    if (opts.groundStrip !== false) {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 0.5, 23, 3, 0, 0, TAU); ctx.fill();
    }
    drawTank(ctx, { type, color, facing: opts.facing || 1, angle: opts.angle == null ? 35 : opts.angle, time: opts.time || 0, seed: opts.seed || 0, active: opts.active });
  }

  /* ================= 렌더러 ================= */
  class Renderer {
    constructor(canvas, opt) {
      opt = opt || {};
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.world = null; this.cam = { x: 0, y: 0 }; this.zoomMul = 1; this.z = 1; this.baseZ = 1;
      this.free = false; this.parts = []; this.fx = []; this.texts = []; this.shake = 0; this.time = 0;
      this.hudPx = 0; this.topPx = 0; this.dpr = 1; this.flash = 0; this.focusEx = null;
      this.sfx = opt.sfx || function () { };
      this.autoPan = !!opt.autoPan;
      this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      this.dpr = Math.min(2, root.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width * this.dpr)), h = Math.max(1, Math.round(r.height * this.dpr));
      if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
      this.baseZ = Math.min(h / 730, w / 760);
      if (h > w * 1.1) this.baseZ = Math.min(h / 730, w / 480);   // 휴대폰 세로: 좀 더 크게
      this.baseZ = Math.max(0.3, this.baseZ);
      this.skyGrad = null;
    }
    setWorld(w) {
      this.world = w;
      this.parts = []; this.fx = []; this.texts = []; this.shake = 0; this.flash = 0; this.focusEx = null;
      this.miniVer = -1; this.miniAt = 0;
      const th = E.THEMES[w.theme] || E.THEMES.meadow;
      this.th = th; this.skyGrad = null;
      const rng = E.mulberry32(w.seed ^ 0xabcdef);
      const mk = (p, base, amp, col) => {
        const waves = [];
        for (let i = 0; i < 4; i++) waves.push({ f: (0.002 + rng() * 0.004) * (i + 1), a: amp / (i + 1) * (0.6 + rng() * 0.6), p: rng() * TAU });
        return { p, base, col, waves };
      };
      // 먼 산 3겹(멀수록 하늘색에 묻힘) — 지형이 부서지면 이 배경이 그대로 보임
      const sky1 = th.sky[1];
      this.layers = [mk(0.12, 600, 190, mixHex(th.far, sky1, 0.45)), mk(0.24, 680, 150, mixHex(th.far, th.near, 0.35)), mk(0.4, 760, 120, th.near)];
      for (const L of this.layers) { L.haze = mix(L.col, sky1, 0.55); L.city = th.bg === 'city'; }
      this.clouds = [];
      for (let i = 0; i < 10; i++) this.clouds.push({ x: rng() * 3000, y: 40 + rng() * 330, s: 0.6 + rng() * 0.9, v: 4 + rng() * 12, k: Math.floor(rng() * 3) });
      this.stars = [];
      for (let i = 0; i < 140; i++) this.stars.push({ x: rng(), y: rng() * 0.75, r: 0.5 + rng() * 1.4, tw: rng() * TAU });
      this.amb = [];
      const t0 = w.tanks[0];
      if (t0) this.lookAt(t0.x, t0.y - 100, true);
      for (const t of w.tanks) { t.seed = strHash(t.id); t.tilt = 0; }
    }
    get vw() { return this.cv.width / this.z; }
    get vh() { return this.cv.height / this.z; }
    lookAt(x, y, instant) {
      this.tx = x; this.ty = y;
      if (instant) { this.z = this.baseZ * this.zoomMul; const c = this.camFor(x, y); this.cam.x = c.x; this.cam.y = c.y; }
    }
    camFor(fx, fy) {
      const w = this.world, vw = this.vw, vh = this.vh;
      const visH = (this.cv.height - this.hudPx - this.topPx) / this.z;
      let x = fx - vw / 2, y = fy - this.topPx / this.z - visH / 2;
      if (vw >= w.W) x = (w.W - vw) / 2; else x = E.clamp(x, 0, w.W - vw);
      const maxY = w.H + this.hudPx / this.z - vh + 10;
      y = E.clamp(y, -420, Math.max(-420, maxY));
      return { x, y };
    }
    toScreen(x, y) { return { x: (x - this.cam.x) * this.z, y: (y - this.cam.y) * this.z }; }
    toWorld(sx, sy) { return { x: sx / this.z + this.cam.x, y: sy / this.z + this.cam.y }; }
    panBy(dxPx, dyPx) {
      this.free = true;
      this.cam.x -= dxPx / this.z; this.cam.y -= dyPx / this.z;
      const c = this.camFor(this.cam.x + this.vw / 2, this.cam.y + this.topPx / this.z + (this.cv.height - this.hudPx - this.topPx) / this.z / 2);
      this.cam.x = c.x; this.cam.y = c.y;
    }

    /* ----- 월드에 꽂는 효과 훅 ----- */
    hooks() {
      const R = this;
      return {
        fireStart() { },
        launch(p, s) {
          s.recoil = 5;
          R.addFx({ type: 'flash', x: p.x, y: p.y, r: 9, max: 0.14, col: '#ffe9a0' });
          for (let i = 0; i < 5; i++) R.part({ x: p.x, y: p.y, vx: p.vx * 0.05 + (Math.random() - .5) * 40, vy: p.vy * 0.05 - Math.random() * 30, life: 0.7 + Math.random() * .5, size: 4 + Math.random() * 4, color: 'rgba(230,230,230,.7)', kind: 'smoke' });
          R.sfx('fire', p.spec);
          R.focusEx = null;
        },
        explode(x, y, r, sp) {
          R.addFx({ type: 'flash', x, y, r: r * 1.15, max: 0.32, col: sp && sp.bolt ? '#fffbd0' : '#fff2b0' });
          R.addFx({ type: 'ring', x, y, r: r * 1.7, max: 0.45 });
          const th = R.th, n = Math.min(46, 10 + r * 0.8);
          for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU, v = 80 + Math.random() * (180 + r * 5);
            R.part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 700, life: 0.6 + Math.random() * 0.8, size: 2 + Math.random() * 3.5, color: th.dirt[i % 3], kind: 'debris', rot: Math.random() * TAU });
          }
          for (let i = 0; i < Math.min(14, 4 + r / 5); i++) {
            const a = Math.random() * TAU, v = 20 + Math.random() * 60;
            R.part({ x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 1 + Math.random() * 1.2, size: r * 0.25 + Math.random() * r * 0.3, color: 'rgba(90,85,80,.5)', kind: 'smoke' });
          }
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * TAU, v = 200 + Math.random() * 350;
            R.part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 400, life: 0.25 + Math.random() * 0.35, size: 2, color: '#ffd166', kind: 'spark' });
          }
          R.shake = Math.min(18, R.shake + r * 0.2 + (sp && sp.quake ? 14 : 0));
          R.focusEx = { x, y, t: R.time };
          R.sfx(sp && sp.quake ? 'quake' : 'boom', r);
        },
        bolt(x, y) {
          const pts = [], top = Math.min(R.cam.y - 60, y - 400);
          let cx = x;
          for (let yy = top; yy < y; yy += 26 + Math.random() * 20) { pts.push([cx, yy]); cx = x + (Math.random() - .5) * 34; }
          pts.push([x, y]);
          R.addFx({ type: 'bolt', x, y, pts, max: 0.4 });
          R.flash = Math.max(R.flash, 0.55);
          R.shake = Math.min(18, R.shake + 7);
          R.sfx('bolt');
        },
        bounce(p) {
          for (let i = 0; i < 5; i++) R.part({ x: p.x, y: p.y, vx: (Math.random() - .5) * 90, vy: -Math.random() * 70, life: .5, size: 3 + Math.random() * 3, color: 'rgba(200,180,150,.6)', kind: 'smoke' });
          R.sfx('bounce');
        },
        split(p) {
          R.addFx({ type: 'flash', x: p.x, y: p.y, r: 16, max: 0.2, col: '#ffd0f0' });
          for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; R.part({ x: p.x, y: p.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, g: 200, life: .4, size: 2, color: '#ffb3ec', kind: 'spark' }); }
          R.sfx('split');
        },
        splash(x, y, sp) {
          const col = R.th.lava ? '#ffb347' : '#cfe9ff';
          for (let i = 0; i < 16; i++) R.part({ x, y, vx: (Math.random() - .5) * 160, vy: -120 - Math.random() * 260, g: 800, life: .9, size: 2 + Math.random() * 2.5, color: col, kind: 'drop' });
          R.sfx('splash');
        },
        drill(p) { R.sfx('drill'); },
        meteor(p) { R.sfx('whistle'); },
        teleport(s, fx, fy) {
          for (const [x, y] of [[fx, fy - 12], [s.x, s.y - 12]]) {
            R.addFx({ type: 'flash', x, y, r: 30, max: 0.35, col: '#e8c8ff' });
            for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 120; R.part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 120, life: .7 + Math.random() * .4, size: 2, color: i % 2 ? '#e2b8ff' : '#fff6b8', kind: 'spark' }); }
          }
          R.text(s.x, s.y - 64, '순간이동!', '#e2b8ff', 1.15);
          R.sfx('tele');
        },
        lost() { },
        damage(t, amt, cause) {
          t.hurt = 0.5;
          R.text(t.x, t.y - 46, '-' + amt, cause === 'fall' ? '#ffb347' : '#ff4d4d', amt >= 30 ? 1.35 : 1.05);
        },
        death(t, how) {
          R.text(t.x, t.y - 66, how === 'water' ? '풍덩!' : 'K.O.!', '#ffe14d', 1.6);
          if (how === 'water') R.hooks().splash(t.x, R.world.waterY);
          for (let i = 0; i < 10; i++) R.part({ x: t.x, y: t.y - 12, vx: (Math.random() - .5) * 60, vy: -40 - Math.random() * 50, life: 1.6 + Math.random(), size: 6 + Math.random() * 6, color: 'rgba(60,60,60,.55)', kind: 'smoke' });
          R.sfx('ko');
        },
        land(t, dist) {
          if (dist > 18) for (let i = 0; i < 8; i++) R.part({ x: t.x + (Math.random() - .5) * 30, y: t.y, vx: (Math.random() - .5) * 80, vy: -Math.random() * 40, life: .6, size: 4 + Math.random() * 4, color: 'rgba(200,180,150,.55)', kind: 'smoke' });
          if (dist > 30) R.sfx('thud');
        }
      };
    }
    addFx(f) { f.t = 0; this.fx.push(f); }
    part(p) { if (this.parts.length > 700) this.parts.shift(); p.t = 0; p.max = p.life; this.parts.push(p); }
    text(x, y, s, col, scale) { this.texts.push({ x, y, s, col, t: 0, max: 1.4, scale: scale || 1 }); }
    heal(t, amt) { this.text(t.x, t.y - 46, '+' + amt, '#4dff88', 1.2); for (let i = 0; i < 12; i++) this.part({ x: t.x + (Math.random() - .5) * 30, y: t.y - 10, vx: 0, vy: -30 - Math.random() * 40, life: 1, size: 3, color: '#7dffa8', kind: 'spark' }); }

    /* ----- 한 프레임 ----- */
    frame(dt, st) {
      const w = this.world; if (!w) return;
      st = st || {};
      this.time += dt;
      const ctx = this.ctx, cw = this.cv.width, ch = this.cv.height, th = this.th;
      this.z += (this.baseZ * this.zoomMul - this.z) * Math.min(1, dt * 8);
      const z = this.z;

      // 카메라 목표
      let fx = null, fy = null, speed = 4;
      if (st.sim && st.sim.projs && st.sim.projs.length) {
        let p = null; for (const q of st.sim.projs) if (!q.dead) { p = q; break; }
        if (p) { fx = p.x; fy = Math.max(p.y, -300); speed = 5; }
      }
      if (fx === null && this.focusEx && this.time - this.focusEx.t < 1.4) { fx = this.focusEx.x; fy = this.focusEx.y; speed = 3; }
      if (fx === null && st.focus) { fx = st.focus.x; fy = st.focus.y - 60; speed = 3.5; }
      if (fx !== null && (!this.free || (st.sim && st.sim.projs && st.sim.projs.length))) {
        if (st.sim && st.sim.projs && st.sim.projs.length) this.free = false;
        const c = this.camFor(fx, fy);
        const k = Math.min(1, dt * speed);
        this.cam.x += (c.x - this.cam.x) * k; this.cam.y += (c.y - this.cam.y) * k;
      } else if (this.autoPan) {
        const c = this.camFor(w.W / 2 + Math.sin(this.time * 0.07) * (w.W / 2 - this.vw / 2), 520);
        this.cam.x += (c.x - this.cam.x) * Math.min(1, dt); this.cam.y += (c.y - this.cam.y) * Math.min(1, dt);
      }
      const shx = this.shake > 0 ? (Math.random() * 2 - 1) * this.shake * this.dpr : 0;
      const shy = this.shake > 0 ? (Math.random() * 2 - 1) * this.shake * this.dpr : 0;
      this.shake = Math.max(0, this.shake - dt * 28);
      const cam = this.cam;

      // 1) 하늘
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!this.skyGrad || this.skyH !== ch) {
        const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
        this.skyGrad = g; this.skyH = ch;
      }
      ctx.fillStyle = this.skyGrad; ctx.fillRect(0, 0, cw, ch);
      if (th.night) {
        for (const s of this.stars) {
          const a = 0.45 + 0.55 * Math.sin(this.time * 1.5 + s.tw);
          ctx.fillStyle = 'rgba(255,255,240,' + a.toFixed(2) + ')';
          const sx = ((s.x * cw * 1.3 - cam.x * z * 0.03) % (cw * 1.3) + cw * 1.3) % (cw * 1.3);
          ctx.fillRect(sx, s.y * ch * 0.8, s.r * this.dpr, s.r * this.dpr);
        }
      }
      // 해 / 달
      {
        const sx = cw * 0.78 - cam.x * z * 0.03, sy = ch * 0.16 - cam.y * z * 0.03 + 40 * this.dpr, r = 46 * z;
        const glow = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * 3);
        const gc = th.lava ? '255,90,60' : th.night ? '210,220,255' : '255,240,180';
        glow.addColorStop(0, 'rgba(' + gc + ',.55)'); glow.addColorStop(1, 'rgba(' + gc + ',0)');
        ctx.fillStyle = glow; circle(ctx, sx, sy, r * 3); ctx.fill();
        ctx.fillStyle = th.lava ? '#ff7a4a' : th.night ? '#f4f1d8' : '#fff6c8'; circle(ctx, sx, sy, r); ctx.fill();
        if (th.night) { ctx.fillStyle = 'rgba(170,170,150,.35)'; circle(ctx, sx - r * .3, sy - r * .2, r * .22); ctx.fill(); circle(ctx, sx + r * .3, sy + r * .25, r * .15); ctx.fill(); }
      }
      // 구름
      {
        const span = cw / z + 700;
        for (const c of this.clouds) {
          const wx = (((c.x + this.time * c.v - cam.x * 0.22) % span) + span) % span - 350;
          const sx = wx * z, sy = (c.y - cam.y * 0.22) * z;
          this.cloud(ctx, sx, sy, c.s * z * 1.2, th.cloud, c.k);
        }
      }
      // 먼 산(3겹) — 아래로 갈수록 하늘색으로 흐려져 멀리 있는 느낌. 지형 구멍 너머로 이 배경이 자연스럽게 보임
      {
        const low = th.bgLow || 0;
        for (let li = 0; li < this.layers.length; li++) {
          const L = this.layers[li];
          ctx.beginPath(); ctx.moveTo(0, ch);
          const step = (L.city ? 4 : 10) * this.dpr;
          let top = ch;
          for (let sx = 0; sx <= cw + step; sx += step) {
            const wx = sx / z + cam.x * L.p;
            let h;
            if (L.city) {
              const bi = Math.floor(wx / (46 + li * 14)), r = Math.abs(Math.sin(bi * 12.9898 + li * 78.233) * 43758.5453) % 1;
              h = 40 + r * (150 - li * 25) + (r > 0.85 ? 40 : 0);
            } else {
              h = 0; for (const q of L.waves) h += q.a * Math.sin(q.f * wx + q.p);
              h += Math.abs(Math.sin(wx * 0.004 + L.waves[0].p)) * 50;
            }
            const sy = (L.base + low - h - cam.y * L.p - 250 * (1 - L.p)) * z;
            if (sy < top) top = sy;
            ctx.lineTo(sx, sy);
          }
          ctx.lineTo(cw, ch); ctx.closePath();
          const g = ctx.createLinearGradient(0, Math.max(-ch, top), 0, ch);
          g.addColorStop(0, L.col); g.addColorStop(1, L.haze);
          ctx.fillStyle = g; ctx.fill();
        }
      }
      const T = w.terrain;

      // 2) 월드
      ctx.setTransform(z, 0, 0, z, -cam.x * z + shx, -cam.y * z + shy);
      {
        const x0 = Math.max(0, Math.floor(cam.x - 20)), y0 = Math.max(0, Math.floor(cam.y - 20));
        const x1 = Math.min(w.W, Math.ceil(cam.x + this.vw + 20)), y1 = Math.min(w.H, Math.ceil(cam.y + this.vh + 20));
        if (x1 > x0 && y1 > y0 && T.canvas) ctx.drawImage(T.canvas, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      }

      // 탱크
      const time = this.time;
      for (const t of w.tanks) {
        if (t.alive && !t.falling && !t.jump) {
          const gl = w.groundNear(t.x - 9, t.y), gr = w.groundNear(t.x + 9, t.y);
          const tg = E.clamp(Math.atan2(gr - gl, 18), -0.55, 0.55);
          t.tilt = (t.tilt || 0) + (tg - (t.tilt || 0)) * Math.min(1, dt * 10);
        }
        if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 30);
        if (t.hurt > 0) t.hurt = Math.max(0, t.hurt - dt);
      }
      const order = w.tanks.slice().sort((a, b) => (a.alive - b.alive) || ((st.focus === a) - (st.focus === b)));
      for (const t of order) {
        if (!t.alive && t.y >= w.waterY) continue;
        // 바닥 그림자(공중에 뜨면 작고 흐리게)
        {
          let gy = -1;
          for (let k = 0; k < 260; k += 2) if (T.solid(t.x, t.y + k)) { gy = t.y + k; break; }
          if (gy >= 0 && gy < w.waterY) {
            const sc = Math.max(0.3, 1 - (gy - t.y) / 170);
            ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * sc).toFixed(3) + ')';
            ctx.beginPath(); ctx.ellipse(t.x, gy + 1.5, 22 * sc, 4.6 * sc, 0, 0, TAU); ctx.fill();
          }
        }
        if (st.focus === t && st.phase === 'aim' && t.alive && st.pv) this.previewPath(ctx, t, st.pv);
        ctx.save(); ctx.translate(t.x, t.y);
        if (st.focus === t && st.phase === 'aim' && t.alive) this.aimGuide(ctx, t);
        drawTank(ctx, { type: t.type, color: t.color, facing: t.facing, angle: t.angle, tilt: t.tilt, dead: !t.alive, time, seed: t.seed, roll: t.x, recoil: t.recoil, hurt: t.hurt, active: st.focus === t });
        ctx.restore();
        if (!t.alive && Math.random() < dt * 3) this.part({ x: t.x + (Math.random() - .5) * 10, y: t.y - 18, vx: (Math.random() - .5) * 10, vy: -25, life: 1.8, size: 5, color: 'rgba(70,70,70,.4)', kind: 'smoke' });
      }

      // 포탄
      if (st.sim) for (const p of st.sim.projs) this.drawProj(ctx, p, dt);

      // 효과
      for (const f of this.fx) {
        f.t += dt; const k = f.t / f.max;
        if (k >= 1) continue;
        if (f.type === 'flash') {
          const r = f.r * (0.5 + 0.8 * k);
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
          g.addColorStop(0, 'rgba(255,255,255,' + (1 - k) + ')'); g.addColorStop(0.35, rgba(f.col || '#fff2b0', (1 - k) * 0.95));
          g.addColorStop(0.7, 'rgba(255,120,30,' + (1 - k) * 0.7 + ')'); g.addColorStop(1, 'rgba(255,60,0,0)');
          ctx.fillStyle = g; circle(ctx, f.x, f.y, r); ctx.fill();
        } else if (f.type === 'ring') {
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 5 * (1 - k) + 0.5;
          circle(ctx, f.x, f.y, f.r * (0.3 + 0.7 * k)); ctx.stroke();
        } else if (f.type === 'bolt') {
          const a = (1 - k) * (Math.random() < 0.3 ? 0.5 : 1);
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(255,240,120,' + (a * 0.55) + ')'; ctx.lineWidth = 12;
          ctx.beginPath(); f.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 3.5; ctx.stroke();
        }
      }
      this.fx = this.fx.filter(f => f.t < f.max);

      // 파편 · 연기
      for (const p of this.parts) {
        p.t += dt;
        if (p.g) p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 'smoke') { p.vx *= 0.97; p.vy = p.vy * 0.97 - 12 * dt; }
        const k = p.t / p.max; if (k >= 1) continue;
        if (p.kind === 'debris') {
          ctx.fillStyle = p.color; ctx.globalAlpha = 1 - k * k;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.t * 8); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
        } else if (p.kind === 'smoke') {
          ctx.fillStyle = p.color; ctx.globalAlpha = (1 - k) * 0.9;
          circle(ctx, p.x, p.y, p.size * (0.6 + k)); ctx.fill();
        } else if (p.kind === 'spark') {
          ctx.strokeStyle = p.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = p.size;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke();
        } else {
          ctx.fillStyle = p.color; ctx.globalAlpha = 1 - k;
          circle(ctx, p.x, p.y, p.size); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      this.parts = this.parts.filter(p => p.t < p.max);

      // 물(용암)
      {
        const wy = w.waterY, x0 = cam.x - 60, x1 = cam.x + this.vw + 60, yb = Math.max(wy, cam.y + this.vh) + 60;
        // 얕은 곳은 비치고 깊을수록 진하게(물 밑 땅이 자연스럽게 사라짐)
        const wg = ctx.createLinearGradient(0, wy - 6, 0, wy + 120);
        wg.addColorStop(0, rgba(th.water, th.lava ? 0.96 : 0.7));
        wg.addColorStop(1, rgba(mixHex(th.water, '#000814', th.lava ? 0.25 : 0.42), 0.98));
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.moveTo(x0, yb);
        for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, wy + Math.sin(x * 0.03 + time * 2.2) * 3 + Math.sin(x * 0.011 - time * 1.3) * 2.5);
        ctx.lineTo(x1, yb); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = th.lava ? 'rgba(255,230,120,.9)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 12) { const y = wy + Math.sin(x * 0.03 + time * 2.2) * 3 + Math.sin(x * 0.011 - time * 1.3) * 2.5; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
        if (th.lava && Math.random() < dt * 8) this.part({ x: x0 + Math.random() * (x1 - x0), y: wy, vx: 0, vy: -40 - Math.random() * 60, life: 1.2, size: 2, color: '#ffcf5a', kind: 'drop', g: 60 });
      }

      // 3) 화면 위 표시(이름표 · 체력 · 화살표)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ambient(ctx, dt, st.wind || 0);
      if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,230,' + this.flash * 0.6 + ')'; ctx.fillRect(0, 0, cw, ch); this.flash = Math.max(0, this.flash - dt * 2.5); }
      const d = this.dpr;
      for (const t of w.tanks) {
        if (!t.alive && t.y >= w.waterY) continue;
        const s = this.toScreen(t.x, t.y);
        const sy = s.y - Math.max(46 * z, 34 * d);
        if (s.x < -80 || s.x > cw + 80 || sy < -40 || sy > ch + 40) continue;
        const bw = 46 * d, bh = 5.5 * d;
        ctx.font = '700 ' + Math.round(12.5 * d) + 'px Jua, "Pretendard", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3.2 * d; ctx.strokeStyle = 'rgba(0,0,0,.75)';
        const label = (t.team ? (t.team === 1 ? '🔴 ' : '🔵 ') : '') + t.name + (st.offline && st.offline[t.id] ? ' 📴' : '');
        ctx.strokeText(label, s.x, sy - 2 * d);
        ctx.fillStyle = !t.alive ? '#aaa' : (st.me === t.id ? '#ffe45c' : '#fff');
        ctx.fillText(label, s.x, sy - 2 * d);
        if (t.alive) {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(ctx, s.x - bw / 2 - d, sy, bw + 2 * d, bh + 2 * d, 2 * d); ctx.fill();
          const k = Math.min(1, t.hp / (t.maxHp || 100));
          ctx.fillStyle = k > 0.6 ? '#4ddc6a' : k > 0.3 ? '#ffc93d' : '#ff4d4d';
          ctx.fillRect(s.x - bw / 2, sy + d, bw * k, bh);
        }
        if (st.focus === t && t.alive && st.phase === 'aim') {
          const by = sy - 22 * d - Math.abs(Math.sin(time * 4)) * 7 * d;
          ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1.5 * d;
          ctx.beginPath(); ctx.moveTo(s.x - 8 * d, by - 9 * d); ctx.lineTo(s.x + 8 * d, by - 9 * d); ctx.lineTo(s.x, by); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      // 화면 밖(위)으로 나간 포탄 표시
      if (st.sim) for (const p of st.sim.projs) {
        const s = this.toScreen(p.x, p.y);
        if (s.y < this.topPx) {
          const x = E.clamp(s.x, 20 * d, cw - 20 * d), y = this.topPx + 10 * d;
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(x, y - 6 * d); ctx.lineTo(x - 7 * d, y + 6 * d); ctx.lineTo(x + 7 * d, y + 6 * d); ctx.closePath(); ctx.fill();
          ctx.font = '700 ' + Math.round(10 * d) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(Math.round((this.cam.y - p.y) / 10) + 'm', x, y + 8 * d);
        }
      }
      // 피해 숫자
      for (const tx of this.texts) {
        tx.t += dt; const k = tx.t / tx.max; if (k >= 1) continue;
        const s = this.toScreen(tx.x, tx.y - k * 40);
        const sc = tx.scale * (k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - Math.min(0.1, k * 0.2));
        ctx.font = '900 ' + Math.round(22 * d * sc) + 'px "Black Han Sans", Jua, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.lineWidth = 5 * d; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(tx.s, s.x, s.y);
        ctx.fillStyle = tx.col; ctx.fillText(tx.s, s.x, s.y);
        ctx.globalAlpha = 1;
      }
      this.texts = this.texts.filter(t => t.t < t.max);
    }

    // 예상 경로 — 쏘는 곳부터 꼭대기(꺾이는 곳)까지만 점선으로. 그 뒤는 직접 감으로!
    previewPath(ctx, t, pv) {
      const sp = pv.spec || {}, a = t.angle * Math.PI / 180, f = t.facing, T = this.world.terrain;
      let x = t.x + Math.cos(a) * f * C.BARREL, y = t.y - C.PIVOT - Math.sin(a) * C.BARREL;
      const v = C.VMAX * (pv.power / 100) * (sp.speed || 1);
      let vx = Math.cos(a) * f * v, vy = -Math.sin(a) * v;
      const wa = pv.wind * C.WIND_ACC * (sp.wind == null ? 1 : sp.wind), ga = C.G * (sp.grav || 1), dt = C.DT;
      const pts = []; let acc = 0, apex = false;
      for (let i = 0; i < 120 * 8; i++) {
        vx += wa * dt; vy += ga * dt;
        if (vy >= 0) { apex = true; break; }
        const nx = x + vx * dt, ny = y + vy * dt;
        if (T.solid(nx, ny) || nx < -300 || nx > this.world.W + 300) break;
        acc += Math.hypot(nx - x, ny - y); x = nx; y = ny;
        if (acc >= 16) { acc = 0; pts.push(x, y); }
      }
      const n = pts.length / 2;
      if (!n) return;
      const live = pv.live, pulse = live ? 1 : 0.8 + 0.2 * Math.sin(this.time * 5);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < n; i++) {
        const k = n > 1 ? i / (n - 1) : 1;
        const al = (live ? 0.95 : 0.6) * (1 - k * 0.55) * pulse;
        ctx.fillStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')'; ctx.strokeStyle = 'rgba(20,24,40,' + (al * 0.55).toFixed(3) + ')';
        circle(ctx, pts[i * 2], pts[i * 2 + 1], 3 - k * 1.3); ctx.fill(); ctx.stroke();
      }
      if (apex) {
        const ex = pts[pts.length - 2], ey = pts[pts.length - 1];
        ctx.strokeStyle = live ? 'rgba(255,225,77,.95)' : 'rgba(255,225,77,.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ex, ey + 2, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
    }

    aimGuide(ctx, t) {
      ctx.save(); ctx.translate(0, -C.PIVOT);
      const f = t.facing, R = 52;
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (f > 0) ctx.arc(0, 0, R, -Math.PI / 2, 0); else ctx.arc(0, 0, R, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      const a = t.angle * Math.PI / 180, ex = Math.cos(a) * f * (R + 10), ey = -Math.sin(a) * (R + 10);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * f * 26, -Math.sin(a) * 26); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe14d'; circle(ctx, ex, ey, 3.5); ctx.fill();
      if (t.lastShot) {
        const la = t.lastShot * Math.PI / 180;
        ctx.fillStyle = 'rgba(255,120,120,.9)'; circle(ctx, Math.cos(la) * f * R, -Math.sin(la) * R, 2.6); ctx.fill();
      }
      ctx.restore();
    }

    drawProj(ctx, p, dt) {
      const sp = p.spec;
      if (!p.tr) p.tr = [];
      if (!p.dead) { p.tr.push(p.x, p.y); if (p.tr.length > 44) p.tr.splice(0, 2); }
      const tr = p.tr, n = tr.length / 2;
      if (n > 1) {
        const col = sp.glow || (sp.missile ? '#ffd27a' : '#ffffff');
        for (let i = 1; i < n; i++) {
          const k = i / n;
          ctx.strokeStyle = rgba(col, 0.55 * k); ctx.lineWidth = (sp.size || 5) * 0.9 * k + 0.5;
          ctx.beginPath(); ctx.moveTo(tr[i * 2 - 2], tr[i * 2 - 1]); ctx.lineTo(tr[i * 2], tr[i * 2 + 1]); ctx.stroke();
        }
      }
      if (p.dead) return;
      const s = sp.size || 5;
      if (p.drilling) {
        if (Math.random() < 0.7) this.part({ x: p.x, y: p.y, vx: (Math.random() - .5) * 120 - p.dx * 60, vy: -Math.random() * 120, g: 600, life: .5, size: 2.5, color: this.th.dirt[Math.floor(Math.random() * 3)], kind: 'debris', rot: 0 });
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.dy, p.dx));
        ctx.fillStyle = '#c8ced8'; ctx.strokeStyle = '#4a505a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(s * 2.4, 0); ctx.lineTo(-s, -s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        return;
      }
      if (sp.missile) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = 'rgba(255,170,60,' + (0.6 + Math.random() * 0.4) + ')';
        ctx.beginPath(); ctx.moveTo(-s * 1.4, -s * 0.5); ctx.lineTo(-s * 1.4 - 6 - Math.random() * 6, 0); ctx.lineTo(-s * 1.4, s * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = sp.color; ctx.strokeStyle = '#1d3a22'; ctx.lineWidth = 1;
        rr(ctx, -s * 1.4, -s * 0.55, s * 2.6, s * 1.1, s * 0.5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8f5ea'; ctx.beginPath(); ctx.moveTo(s * 1.2, -s * 0.5); ctx.lineTo(s * 1.9, 0); ctx.lineTo(s * 1.2, s * 0.5); ctx.closePath(); ctx.fill();
        ctx.restore();
        return;
      }
      if (sp.glow) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 3);
        g.addColorStop(0, rgba(sp.glow, 0.8)); g.addColorStop(1, rgba(sp.glow, 0));
        ctx.fillStyle = g; circle(ctx, p.x, p.y, s * 3); ctx.fill();
      }
      if (sp.star) {
        ctx.fillStyle = sp.color; ctx.strokeStyle = 'rgba(120,90,0,.8)'; ctx.lineWidth = 1;
        starPath(ctx, p.x, p.y, s * 1.6, s * 0.7, p.age * 9); ctx.fill(); ctx.stroke();
        return;
      }
      if (sp.fall && Math.random() < 0.6) this.part({ x: p.x + (Math.random() - .5) * 4, y: p.y - 6, vx: (Math.random() - .5) * 20, vy: -30, life: .45, size: 3 + Math.random() * 2, color: 'rgba(255,170,80,.55)', kind: 'smoke' });
      ctx.fillStyle = sp.color; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.2;
      circle(ctx, p.x, p.y, s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; circle(ctx, p.x - s * .35, p.y - s * .35, s * .35); ctx.fill();
    }

    cloud(ctx, x, y, s, col, k) {
      ctx.fillStyle = col;
      ctx.beginPath();
      const blobs = k === 0 ? [[0, 0, 26], [24, -10, 30], [52, 0, 24], [26, 8, 26]] : k === 1 ? [[0, 0, 20], [20, -12, 24], [42, -4, 20], [60, 4, 16], [30, 6, 22]] : [[0, 0, 18], [18, -8, 20], [36, 0, 16]];
      for (const b of blobs) { ctx.moveTo(x + b[0] * s + b[2] * s, y + b[1] * s); ctx.arc(x + b[0] * s, y + b[1] * s, b[2] * s, 0, TAU); }
      ctx.fill();
    }

    ambient(ctx, dt, wind) {
      const cw = this.cv.width, ch = this.cv.height, d = this.dpr, kind = this.th.amb;
      while (this.amb.length < 36) this.amb.push({ x: Math.random() * cw, y: Math.random() * ch, s: Math.random(), ph: Math.random() * TAU });
      const colors = ['#ff7eb6', '#7ad6ff', '#fff07a', '#9bff7a', '#ffffff'];
      for (const a of this.amb) {
        const base = kind === 'ember' ? -18 : kind === 'firefly' || kind === 'mote' ? 0 : 22;
        a.x += (wind * 9 + Math.sin(this.time + a.ph) * 8) * d * dt * (0.5 + a.s);
        a.y += (kind === 'ember' ? base : kind === 'firefly' || kind === 'mote' ? Math.sin(this.time * 0.8 + a.ph) * 12 : base * (0.4 + a.s)) * d * dt;
        if (a.x < -10) a.x += cw + 20; if (a.x > cw + 10) a.x -= cw + 20;
        if (a.y < -10) a.y += ch + 20; if (a.y > ch + 10) a.y -= ch + 20;
        if (kind === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.85)'; circle(ctx, a.x, a.y, (1 + a.s * 2) * d); ctx.fill(); }
        else if (kind === 'leaf') { ctx.fillStyle = 'rgba(120,200,90,.55)'; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(this.time * 2 + a.ph); ctx.beginPath(); ctx.ellipse(0, 0, 3.5 * d, 1.6 * d, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        else if (kind === 'dust') { ctx.fillStyle = 'rgba(255,230,180,.35)'; circle(ctx, a.x, a.y, (1 + a.s * 1.6) * d); ctx.fill(); }
        else if (kind === 'ember') { ctx.fillStyle = 'rgba(255,' + (120 + Math.round(a.s * 100)) + ',40,' + (0.5 + 0.5 * Math.sin(this.time * 5 + a.ph)).toFixed(2) + ')'; circle(ctx, a.x, a.y, (1 + a.s * 1.5) * d); ctx.fill(); }
        else if (kind === 'sprinkle') { ctx.strokeStyle = colors[Math.floor(a.s * 5)]; ctx.lineWidth = 2 * d; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ph + this.time); ctx.beginPath(); ctx.moveTo(-3 * d, 0); ctx.lineTo(3 * d, 0); ctx.stroke(); ctx.restore(); }
        else if (kind === 'firefly') { const al = 0.3 + 0.7 * Math.max(0, Math.sin(this.time * 2 + a.ph)); ctx.fillStyle = 'rgba(220,255,140,' + al.toFixed(2) + ')'; circle(ctx, a.x, a.y, 1.8 * d); ctx.fill(); }
        else if (kind === 'maple') { ctx.fillStyle = a.s < 0.5 ? 'rgba(255,110,40,.75)' : 'rgba(230,60,40,.7)'; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(this.time * 1.6 + a.ph); starPath(ctx, 0, 0, 4.2 * d, 2 * d, 0); ctx.fill(); ctx.restore(); }
        else if (kind === 'mote') { const al = 0.25 + 0.5 * Math.max(0, Math.sin(this.time * 1.4 + a.ph)); ctx.fillStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')'; circle(ctx, a.x, a.y, (1.2 + a.s * 1.8) * d); ctx.fill(); }
      }
    }

    drawMini(mc, st) {
      const w = this.world; if (!w) return;
      const dpr = this.dpr;
      const cssW = mc.clientWidth || 200, cssH = Math.round(cssW * w.H / w.W);
      const mw = Math.round(cssW * dpr), mh = Math.round(cssH * dpr);
      if (mc.width !== mw || mc.height !== mh) { mc.width = mw; mc.height = mh; mc.style.height = cssH + 'px'; this.miniVer = -1; }
      const T = w.terrain, now = this.time;
      if (this.miniVer !== T.ver && (now - this.miniAt > 0.25 || this.miniVer < 0)) {
        this.miniVer = T.ver; this.miniAt = now;
        if (!this.miniCv) this.miniCv = document.createElement('canvas');
        const c = this.miniCv; c.width = mw; c.height = mh;
        const cx = c.getContext('2d'), img = cx.createImageData(mw, mh), dd = img.data;
        const col = E.hexRgb(this.th.dirt[0]), gcol = E.hexRgb(this.th.grass2);
        for (let x = 0; x < mw; x++) {
          const wx = Math.floor((x + 0.5) * w.W / mw);
          let prev = false;
          for (let y = 0; y < mh; y++) {
            const s = T.solid(wx, Math.floor((y + 0.5) * w.H / mh));
            if (s) { const c2 = prev ? col : gcol, o = (y * mw + x) * 4; dd[o] = c2[0]; dd[o + 1] = c2[1]; dd[o + 2] = c2[2]; dd[o + 3] = 255; }
            prev = s;
          }
        }
        cx.putImageData(img, 0, 0);
      }
      const ctx = mc.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, mw, mh);
      ctx.fillStyle = 'rgba(10,20,40,.45)'; ctx.fillRect(0, 0, mw, mh);
      if (this.miniCv) ctx.drawImage(this.miniCv, 0, 0);
      const sx = mw / w.W, sy = mh / w.H;
      ctx.fillStyle = rgba(this.th.water, 0.8); ctx.fillRect(0, w.waterY * sy, mw, mh - w.waterY * sy);
      for (const t of w.tanks) {
        if (!t.alive) continue;
        ctx.fillStyle = t.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = st && st.focus === t && (now * 3 % 1) < .6 ? 2 * dpr : 1 * dpr;
        circle(ctx, t.x * sx, (t.y - 10) * sy, 3.2 * dpr); ctx.fill(); ctx.stroke();
      }
      if (st && st.sim) for (const p of st.sim.projs) { ctx.fillStyle = '#fff'; circle(ctx, p.x * sx, Math.max(2, p.y * sy), 1.8 * dpr); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(this.cam.x * sx, this.cam.y * sy, this.vw * sx, this.vh * sy);
    }
  }

  root.Draw = { drawTank, preview, Renderer, shade, rgba, starPath };
})(window);
