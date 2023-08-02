'use strict';

// Double pendulum integrated with RK4 on the standard equations of motion.
// Multiple near-identical copies visualise sensitive dependence on initial
// conditions (chaos).
//
// This build sizes the canvas to fill its parent element (the `.stage`), so
// each layout controls the drawing area purely through CSS. Optional telemetry
// elements (ids tel-a1, tel-a2, tel-vel, tel-spread) are updated when present.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  m1: document.getElementById('m1'),
  m2: document.getElementById('m2'),
  gravity: document.getElementById('gravity'),
  count: document.getElementById('count'),
  countOut: document.getElementById('count-out'),
  trail: document.getElementById('trail'),
  pause: document.getElementById('pause'),
  reset: document.getElementById('reset'),
  fps: document.getElementById('fps'),
};

// Optional telemetry outputs — only present in some layouts.
const tel = {
  a1: document.getElementById('tel-a1'),
  a2: document.getElementById('tel-a2'),
  vel: document.getElementById('tel-vel'),
  spread: document.getElementById('tel-spread'),
};

let W = 0, H = 0, dpr = 1;
let pendulums = [];
let L1 = 120, L2 = 120;
let running = true;
let trailCanvas, trailCtx;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const host = canvas.parentElement;
  const rect = host.getBoundingClientRect();
  const cssW = Math.max(1, rect.width);
  const cssH = Math.max(1, rect.height);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  W = canvas.width; H = canvas.height;
  L1 = Math.min(W, H) * 0.22;
  L2 = L1;
  trailCanvas = document.createElement('canvas');
  trailCanvas.width = W; trailCanvas.height = H;
  trailCtx = trailCanvas.getContext('2d');
}

function reset() {
  const n = parseInt(el.count.value, 10);
  pendulums = [];
  for (let i = 0; i < n; i++) {
    pendulums.push({
      a1: Math.PI / 2 + 1.0 + i * 1e-4,
      a2: Math.PI / 2 + 1.0,
      da1: 0, da2: 0,
      hue: 130 + (i / Math.max(1, n)) * 160,
      px: null, py: null,
    });
  }
  if (trailCtx) trailCtx.clearRect(0, 0, W, H);
}

// Derivatives of [a1, a2, da1, da2].
function deriv(s, m1, m2, g) {
  const [a1, a2, w1, w2] = s;
  const d = a1 - a2;
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * d);

  const dw1 = (-g * (2 * m1 + m2) * Math.sin(a1)
    - m2 * g * Math.sin(a1 - 2 * a2)
    - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d)))
    / (L1 * den);

  const dw2 = (2 * Math.sin(d) * (w1 * w1 * L1 * (m1 + m2)
    + g * (m1 + m2) * Math.cos(a1)
    + w2 * w2 * L2 * m2 * Math.cos(d)))
    / (L2 * den);

  return [w1, w2, dw1, dw2];
}

function rk4(p, dt, m1, m2, g) {
  const s = [p.a1, p.a2, p.da1, p.da2];
  const add = (a, b, h) => a.map((v, i) => v + b[i] * h);
  const k1 = deriv(s, m1, m2, g);
  const k2 = deriv(add(s, k1, dt / 2), m1, m2, g);
  const k3 = deriv(add(s, k2, dt / 2), m1, m2, g);
  const k4 = deriv(add(s, k3, dt), m1, m2, g);
  p.a1 += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
  p.a2 += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  p.da1 += dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  p.da2 += dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
}

function step(dt) {
  const m1 = parseFloat(el.m1.value);
  const m2 = parseFloat(el.m2.value);
  const g = parseFloat(el.gravity.value) * 60;
  for (const p of pendulums) rk4(p, dt, m1, m2, g);
}

function positions(p) {
  const ox = W / 2, oy = H * 0.38;
  const x1 = ox + L1 * Math.sin(p.a1);
  const y1 = oy + L1 * Math.cos(p.a1);
  const x2 = x1 + L2 * Math.sin(p.a2);
  const y2 = y1 + L2 * Math.cos(p.a2);
  return { ox, oy, x1, y1, x2, y2 };
}

function draw() {
  // fade trail buffer
  if (el.trail.checked) {
    trailCtx.fillStyle = 'rgba(10,10,18,0.04)';
    trailCtx.fillRect(0, 0, W, H);
    for (const p of pendulums) {
      const { x2, y2 } = positions(p);
      if (p.px !== null) {
        trailCtx.strokeStyle = `hsla(${p.hue}, 85%, 60%, 0.8)`;
        trailCtx.lineWidth = 1.5 * dpr;
        trailCtx.beginPath();
        trailCtx.moveTo(p.px, p.py);
        trailCtx.lineTo(x2, y2);
        trailCtx.stroke();
      }
      p.px = x2; p.py = y2;
    }
  }

  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  if (el.trail.checked) ctx.drawImage(trailCanvas, 0, 0);

  for (const p of pendulums) {
    const { ox, oy, x1, y1, x2, y2 } = positions(p);
    ctx.strokeStyle = `hsla(${p.hue}, 40%, 75%, 0.9)`;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.fillStyle = `hsl(${p.hue}, 85%, 62%)`;
    ctx.beginPath(); ctx.arc(x1, y1, 5 * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y2, 7 * dpr, 0, Math.PI * 2); ctx.fill();
  }
}

const DEG = 180 / Math.PI;
function wrapDeg(rad) {
  let d = (rad * DEG) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function updateTelemetry() {
  if (!pendulums.length) return;
  const p = pendulums[0];
  if (tel.a1) tel.a1.textContent = wrapDeg(p.a1).toFixed(1) + '\u00b0';
  if (tel.a2) tel.a2.textContent = wrapDeg(p.a2).toFixed(1) + '\u00b0';
  if (tel.vel) tel.vel.textContent = Math.abs(p.da2).toFixed(2) + ' rad/s';
  if (tel.spread) {
    const last = pendulums[pendulums.length - 1];
    const s = Math.abs(wrapDeg(p.a2) - wrapDeg(last.a2));
    tel.spread.textContent = (pendulums.length > 1 ? s.toFixed(1) : '0.0') + '\u00b0';
  }
}

let last = performance.now(), acc = 0, fpsT = 0, frames = 0, telT = 0;
const DT = 1 / 120;

function loop(now) {
  const ms = Math.min(now - last, 250); last = now;
  if (running) {
    acc += ms / 1000;
    let n = 0;
    while (acc >= DT && n < 20) { step(DT); acc -= DT; n++; }
    if (n === 20) acc = 0;
  }
  draw();
  frames++; fpsT += ms; telT += ms;
  if (fpsT >= 250) { el.fps.textContent = Math.round(frames * 1000 / fpsT) + ' fps'; frames = 0; fpsT = 0; }
  if (telT >= 120) { updateTelemetry(); telT = 0; }
  requestAnimationFrame(loop);
}

el.count.addEventListener('input', () => { el.countOut.textContent = el.count.value; reset(); });
el.reset.addEventListener('click', reset);
el.pause.addEventListener('click', () => { running = !running; el.pause.textContent = running ? 'Pause' : 'Play'; });

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * dpr;
  const my = (e.clientY - rect.top) * dpr;
  const ox = W / 2, oy = H * 0.38;
  const a1 = Math.atan2(mx - ox, my - oy);
  for (const p of pendulums) { p.a1 = a1; p.da1 = 0; p.da2 = 0; p.px = null; }
});

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(() => { resize(); reset(); }); });

resize();
reset();
requestAnimationFrame(loop);
