// 실행: (게임 폴더에서) python -m http.server 8765 --bind 127.0.0.1  → 다른 창에서  node tools/make-icons.js [스크린샷폴더]
// 환경변수: BASE=주소(기본 http://127.0.0.1:8765/), CHROME=크롬 실행파일 경로
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

const fs = require('fs');
const OUT = process.argv[2] || require('path').join(__dirname, '..');
const svg = fs.readFileSync(OUT + '/icon.svg', 'utf8');
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage();
  for (const [name, size, mask] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 1]]) {
    await p.setViewportSize({ width: size, height: size });
    const inner = mask ? `<div style="position:absolute;inset:0;background:linear-gradient(#4aa8ff,#bfe8ff)"></div><div style="position:absolute;left:${size*.1}px;top:${size*.1}px;width:${size*.8}px;height:${size*.8}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>`
      : svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
    await p.setContent(`<html><body style="margin:0;background:transparent">${inner}</body></html>`);
    await p.screenshot({ path: OUT + '/' + name, omitBackground: !mask, clip: { x: 0, y: 0, width: size, height: size } });
    console.log(name);
  }
  await b.close();
})();
