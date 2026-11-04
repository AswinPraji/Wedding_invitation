const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const viewports = [
  { name: '360x780 (Mobile Standard)', w: 360, h: 780 },
  { name: '390x844 (Mobile iPhone)', w: 390, h: 844 },
  { name: '412x915 (Mobile Android Large)', w: 412, h: 915 },
  { name: '844x390 (Mobile Landscape)', w: 844, h: 390 },
  { name: '1366x768 (Desktop Standard)', w: 1366, h: 768 }
];

async function testViewport(vp) {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const port = 9300 + Math.floor(Math.random() * 500);
  const userDataDir = `C:\\Wedding_invitation\\.edge-vp-${vp.w}-${vp.h}`;
  const htmlPath = path.resolve('dist/index.html');

  const proc = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    `--window-size=${vp.w},${vp.h}`,
    `file://${htmlPath}`
  ]);

  await new Promise(r => setTimeout(r, 2500));

  const jsonStr = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  const targets = JSON.parse(jsonStr);
  const target = targets.find(t => t.url && t.url.includes('index.html'));
  if (!target) {
    proc.kill();
    throw new Error('Target not found for ' + vp.name);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  async function evalCode(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result ? res.result.value : null;
  }

  // 1. Check Step 1 Cover
  const coverMetrics = await evalCode(`
    (() => {
      const card = document.getElementById("coverCard");
      const r = card.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
    })()
  `);

  // 2. Click button to go to Step 2
  await evalCode(`document.getElementById("btnOpenInvitation").click()`);
  await new Promise(r => setTimeout(r, 600));

  // 3. Check Step 2 Folded Card
  const foldedMetrics = await evalCode(`
    (() => {
      const card = document.getElementById("foldedCardCover");
      const r = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);
      const container = document.getElementById("bookContainer");
      const cr = container.getBoundingClientRect();
      const docW = document.documentElement.clientWidth;
      const docH = document.documentElement.clientHeight;
      return {
        cardWidth: Math.round(r.width),
        cardHeight: Math.round(r.height),
        cardLeft: Math.round(r.left),
        cardTop: Math.round(r.top),
        centeredX: Math.abs(Math.round((docW - r.width) / 2) - Math.round(r.left)) <= 2,
        cardOverflowX: r.left < 0 || r.right > docW,
        cardOverflowY: r.top < 0 || r.bottom > docH,
        opacity: style.opacity,
        visibility: style.visibility
      };
    })()
  `);

  // 4. Tap folded card to open to Step 3
  await evalCode(`document.getElementById("bookContainer").click()`);
  await new Promise(r => setTimeout(r, 1400));

  // 5. Check Step 3 Unfolded Spread
  const spreadMetrics = await evalCode(`
    (() => {
      const container = document.getElementById("bookContainer");
      const r = container.getBoundingClientRect();
      const leftFlap = document.getElementById("flapLeft").getBoundingClientRect();
      const centerPanel = document.getElementById("panelCenter").getBoundingClientRect();
      const rightFlap = document.getElementById("flapRight").getBoundingClientRect();
      const docW = document.documentElement.clientWidth;
      const docH = document.documentElement.clientHeight;

      const leftRatio = (leftFlap.width / r.width).toFixed(2);
      const centerRatio = (centerPanel.width / r.width).toFixed(2);
      const rightRatio = (rightFlap.width / r.width).toFixed(2);

      return {
        spreadWidth: Math.round(r.width),
        spreadHeight: Math.round(r.height),
        spreadLeft: Math.round(r.left),
        overflowX: r.left < 0 || r.right > docW + 1,
        overflowY: r.top < 0 || r.bottom > docH + 1,
        leftRatio,
        centerRatio,
        rightRatio,
        centerWider: centerPanel.width > leftFlap.width && centerPanel.width > rightFlap.width
      };
    })()
  `);

  // 6. Test Fold button
  await evalCode(`document.getElementById("btnCloseBook").click()`);
  await new Promise(r => setTimeout(r, 1300));
  const foldBackState = await evalCode(`
    (() => {
      const container = document.getElementById("bookContainer");
      return {
        isFolded: container.classList.contains("folded"),
        isUnfolded: container.classList.contains("unfolded")
      };
    })()
  `);

  // 7. Test Back to Cover
  await evalCode(`document.getElementById("btnBackToCover").click()`);
  await new Promise(r => setTimeout(r, 500));
  const coverBackState = await evalCode(`
    (() => {
      const cover = document.getElementById("stepCover");
      return {
        isCoverActive: cover.classList.contains("active")
      };
    })()
  `);

  ws.close();
  proc.kill();

  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (_) {}

  return {
    viewport: vp.name,
    screen: `${vp.w}x${vp.h}`,
    cover: coverMetrics,
    step2Folded: foldedMetrics,
    step3Spread: spreadMetrics,
    foldBack: foldBackState,
    backToCover: coverBackState
  };
}

async function run() {
  console.log('Testing all 5 viewports on dist/index.html...\n');
  const results = [];
  for (const vp of viewports) {
    try {
      const res = await testViewport(vp);
      results.push(res);
      console.log(`[PASS] ${vp.name}:`);
      console.log(`  Step 1 Cover: ${res.cover.width}x${res.cover.height}px`);
      console.log(`  Step 2 Folded Card: ${res.step2Folded.cardWidth}x${res.step2Folded.cardHeight}px | Centered: ${res.step2Folded.centeredX} | Overflow: ${res.step2Folded.cardOverflowX}`);
      console.log(`  Step 3 Spread: ${res.step3Spread.spreadWidth}x${res.step3Spread.spreadHeight}px | Panels: ${res.step3Spread.leftRatio} / ${res.step3Spread.centerRatio} / ${res.step3Spread.rightRatio} | Overflow: ${res.step3Spread.overflowX}`);
      console.log(`  Fold Back: isFolded=${res.foldBack.isFolded} | Back To Cover: isCoverActive=${res.backToCover.isCoverActive}\n`);
    } catch (e) {
      console.error(`[FAIL] ${vp.name}:`, e.message);
    }
  }
}

run();

