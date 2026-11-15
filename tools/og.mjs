// Regenerates public/og.png (link preview) from the running game, so it follows the current art.
// Usage: npm run dev   then   node tools/og.mjs [http://localhost:5173] [path-to-chrome]
// Needs: npm i -D playwright-core (or a global one) and Google Chrome / Chromium.
import { chromium } from 'playwright-core';
import fs from 'fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const exe = process.argv[3] ?? (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 720, height: 1280 } });
await p.addInitScript(() => localStorage.setItem('arrowcats.save', JSON.stringify({ introSeen: true, level: 22, calendar: { day: 0, last: new Date().toISOString().slice(0, 10) } })));
await p.goto(`${base}/?debug`);
await p.waitForTimeout(1500);
await p.mouse.click(360, 665); // Play
await p.waitForTimeout(1500);
const url = await p.evaluate(() => window.__ac.og());
fs.writeFileSync(new URL('../public/og.png', import.meta.url), Buffer.from(url.split(',')[1], 'base64'));
console.log('public/og.png written');
await b.close();
