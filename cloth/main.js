'use strict';

// Spring-mass cloth via Verlet integration + iterative distance constraints.
// Top row is pinned. Mouse drags points; right-drag tears links.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  cols: document.getElementById('cols'),
  colsOut: document.getElementById('cols-out'),
  gravity: document.getElementById('gravity'),
  stiff: document.getElementById('stiff'),
  wind: document.getElementById('wind'),
  showpoints: document.getElementById('showpoints'),
  reset: document.getElementById('reset'),
  fps: document.getElementById('fps'),
};

const tel = {
  strain: document.getElementById('tel-strain'),
  stretch: document.getElementById('tel-stretch'),
  torn: document.getElementById('tel-torn'),
  vel: document.getElementById('tel-vel'),
};

let W = 0, H = 0, dpr = 1;
let points = [];
let links = [];
let spacing = 1;
const mouse = { x: 0, y: 0, px: 0, py: 0, down: false, tear: false };

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
}

function build() {
  points = []; links = [];
  const cols = parseInt(el.cols.value, 10);
  spacing = (W * 0.7) / cols;
  const rows = Math.max(4, Math.floor((H * 0.75) / spacing));
  const startX = (W - spacing * cols) / 2;
  const startY = spacing * 0.6;

  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      const px = startX + x * spacing;
      const py = startY + y * spacing;
      points.push({ x: px, y: py, ox: px, oy: py, pinned: y === 0 && (x % 4 === 0 || x === cols) });
    }
  }
  const w = cols + 1;
  const idx = (x, y) => y * w + x;
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      if (x < cols) links.push({ a: idx(x, y), b: idx(x + 1, y), len: spacing, alive: true });
      if (y < rows) links.push({ a: idx(x, y), b: idx(x, y + 1), len: spacing, alive: true });
    }
  }
}

function step(dt) {
  const g = parseFloat(el.gravity.value) * dpr;
  const wind = parseFloat(el.wind.value) * dpr;
  const iters = parseInt(el.stiff.value, 10);
  const gust = wind * (0.5 + 0.5 * Math.sin(performance.now() * 0.001));

  // Verlet integrate.
  for (const p of points) {
    if (p.pinned) continue;
    const vx = (p.x - p.ox) * 0.99;
    const vy = (p.y - p.oy) * 0.99;
    p.ox = p.x; p.oy = p.y;
    p.x += vx + gust * dt * dt;
    p.y += vy + g * dt * dt;
  }

  // Mouse interaction.
  if (mouse.down && !mouse.tear) {
    const r = spacing * 1.5;
    for (const p of points) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      if (dx * dx + dy * dy < r * r && !p.pinned) {
        p.x += (mouse.x - mouse.px);
        p.y += (mouse.y - mouse.py);
      }
    }
  } else if (mouse.down && mouse.tear) {
    const r = spacing * 1.2;
    for (const l of links) {
      if (!l.alive) continue;
      const a = points[l.a], b = points[l.b];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = mx - mouse.x, dy = my - mouse.y;
      if (dx * dx + dy * dy < r * r) l.alive = false;
    }
  }

  // Satisfy constraints.
  for (let k = 0; k < iters; k++) {
    for (const l of links) {
      if (!l.alive) continue;
      const a = points[l.a], b = points[l.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const diff = (l.len - d) / d * 0.5;
      const ox = dx * diff, oy = dy * diff;
      if (!a.pinned) { a.x -= ox; a.y -= oy; }
      if (!b.pinned) { b.x += ox; b.y += oy; }
    }
  }

  // Keep inside bounds loosely.
  for (const p of points) {
    if (p.x < 0) p.x = 0; else if (p.x > W) p.x = W;
    if (p.y > H) p.y = H;
  }
}

function draw() {
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = 'rgba(244, 164, 207, 0.55)';
  ctx.beginPath();
  for (const l of links) {
    if (!l.alive) continue;
    const a = points[l.a], b = points[l.b];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  if (el.showpoints.checked) {
    ctx.fillStyle = '#8b7dff';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.pinned ? 3 : 1.6) * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

let last = performance.now(), acc = 0, fpsT = 0, frames = 0;
const DT = 1 / 60;

function updateTelemetry() {
  if (!links.length) return;
  let strain = 0, maxStretch = 0, torn = 0;
  for (const l of links) {
    if (!l.alive) { torn++; continue; }
    const a = points[l.a], b = points[l.b];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const e = d - l.len;
    strain += e * e;
    const st = d / l.len - 1;
    if (st > maxStretch) maxStretch = st;
  }
  let sv = 0, moving = 0;
  for (const p of points) {
    if (p.pinned) continue;
    sv += Math.hypot(p.x - p.ox, p.y - p.oy);
    moving++;
  }
  const avgV = moving ? (sv / moving) / dpr : 0;
  if (tel.strain) tel.strain.textContent = (strain / (dpr * dpr) / 1000).toFixed(1);
  if (tel.stretch) tel.stretch.textContent = Math.round(maxStretch * 100) + '%';
  if (tel.torn) tel.torn.textContent = torn + ' / ' + links.length;
  if (tel.vel) tel.vel.textContent = avgV.toFixed(1) + ' px/f';
}

function loop(now) {
  const ms = Math.min(now - last, 250);
  last = now;
  acc += ms / 1000;
  let n = 0;
  while (acc >= DT && n < 5) { step(DT); acc -= DT; n++; }
  if (n === 5) acc = 0;
  draw();
  frames++; fpsT += ms;
  if (fpsT >= 250) { el.fps.textContent = Math.round(frames * 1000 / fpsT) + ' fps'; updateTelemetry(); frames = 0; fpsT = 0; }
  requestAnimationFrame(loop);
}

el.cols.addEventListener('input', () => { el.colsOut.textContent = el.cols.value; build(); });
el.reset.addEventListener('click', build);

function pos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = pos(e); mouse.x = mouse.px = p.x; mouse.y = mouse.py = p.y;
  mouse.down = true; mouse.tear = (e.button === 2);
});
canvas.addEventListener('pointermove', (e) => {
  const p = pos(e); mouse.px = mouse.x; mouse.py = mouse.y; mouse.x = p.x; mouse.y = p.y;
});
window.addEventListener('pointerup', () => { mouse.down = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(() => { resize(); build(); }); });

resize();
build();
requestAnimationFrame(loop);
