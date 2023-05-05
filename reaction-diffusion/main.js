'use strict';

// Gray-Scott reaction-diffusion. Two fields U and V evolve by:
//   U' = U + (Du*Lap(U) - U*V^2 + F*(1-U)) * dt
//   V' = V + (Dv*Lap(V) + U*V^2 - (F+K)*V) * dt
// Runs on a downscaled grid, rendered to an offscreen ImageData then upscaled.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  feed: document.getElementById('feed'),
  feedOut: document.getElementById('feed-out'),
  kill: document.getElementById('kill'),
  killOut: document.getElementById('kill-out'),
  preset: document.getElementById('preset'),
  palette: document.getElementById('palette'),
  seed: document.getElementById('seed'),
  clear: document.getElementById('clear'),
  fps: document.getElementById('fps'),
};

const tel = {
  meanv: document.getElementById('tel-meanv'),
  active: document.getElementById('tel-active'),
  mass: document.getElementById('tel-mass'),
  fk: document.getElementById('tel-fk'),
};

const Du = 0.16, Dv = 0.08;
const GW = 200; // simulation grid width
let GH = 130;   // simulation grid height (set from aspect)
let U, V, U2, V2;
let img, off, offCtx;
let W = 0, H = 0, dpr = 1;
const mouse = { x: 0, y: 0, down: false };

const PRESETS = {
  coral: { f: 0.0545, k: 0.062 },
  mitosis: { f: 0.0367, k: 0.0649 },
  worms: { f: 0.058, k: 0.065 },
  spots: { f: 0.030, k: 0.062 },
};

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
  GH = Math.round(GW * (H / W));
  allocate();
}

function allocate() {
  const n = GW * GH;
  U = new Float32Array(n).fill(1);
  V = new Float32Array(n).fill(0);
  U2 = new Float32Array(n);
  V2 = new Float32Array(n);
  off = document.createElement('canvas');
  off.width = GW; off.height = GH;
  offCtx = off.getContext('2d');
  img = offCtx.createImageData(GW, GH);
  ctx.imageSmoothingEnabled = true;
  seed();
}

function seed() {
  U.fill(1); V.fill(0);
  for (let i = 0; i < 20; i++) {
    const cx = Math.floor(Math.random() * GW);
    const cy = Math.floor(Math.random() * GH);
    splat(cx, cy, 6);
  }
}

function splat(cx, cy, r) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      const gx = cx + x, gy = cy + y;
      if (gx < 0 || gx >= GW || gy < 0 || gy >= GH) continue;
      V[gy * GW + gx] = 1;
    }
  }
}

function stepRD(F, K) {
  for (let y = 1; y < GH - 1; y++) {
    for (let x = 1; x < GW - 1; x++) {
      const i = y * GW + x;
      const lapU = U[i - 1] + U[i + 1] + U[i - GW] + U[i + GW]
        + 0.5 * (U[i - GW - 1] + U[i - GW + 1] + U[i + GW - 1] + U[i + GW + 1]) - 6 * U[i];
      const lapV = V[i - 1] + V[i + 1] + V[i - GW] + V[i + GW]
        + 0.5 * (V[i - GW - 1] + V[i - GW + 1] + V[i + GW - 1] + V[i + GW + 1]) - 6 * V[i];
      const u = U[i], v = V[i];
      const uvv = u * v * v;
      // Clamp to [0, 1] to keep the explicit Euler integration stable: a sharp
      // seed/mouse splat can otherwise overshoot, diverge to NaN, and spread
      // across the grid (rendering a black screen).
      U2[i] = Math.min(1, Math.max(0, u + (Du * lapU - uvv + F * (1 - u))));
      V2[i] = Math.min(1, Math.max(0, v + (Dv * lapV + uvv - (F + K) * v)));
    }
  }
  const tu = U; U = U2; U2 = tu;
  const tv = V; V = V2; V2 = tv;
}

function palette(t) {
  const p = el.palette.value;
  t = Math.max(0, Math.min(1, t));
  if (p === 'fire') return [t * 255, t * t * 160, t * t * t * 60];
  if (p === 'mono') { const c = t * 255; return [c, c, c]; }
  // teal
  return [40 + t * 60, 120 + t * 135, 150 + t * 105];
}

function render() {
  const data = img.data;
  for (let i = 0; i < GW * GH; i++) {
    const t = Math.max(0, Math.min(1, U[i] - V[i]));
    const [r, g, b] = palette(1 - t);
    const j = i * 4;
    data[j] = r; data[j + 1] = g; data[j + 2] = b; data[j + 3] = 255;
  }
  offCtx.putImageData(img, 0, 0);
  ctx.drawImage(off, 0, 0, W, H);
}

let last = performance.now(), fpsT = 0, frames = 0;
function loop(now) {  const ms = now - last; last = now;
  const F = parseFloat(el.feed.value);
  const K = parseFloat(el.kill.value);

  if (mouse.down) {
    const gx = Math.floor(mouse.x / W * GW);
    const gy = Math.floor(mouse.y / H * GH);
    splat(gx, gy, 4);
  }

  for (let s = 0; s < 8; s++) stepRD(F, K); // multiple steps per frame
  render();

  frames++; fpsT += ms;
  if (fpsT >= 250) { el.fps.textContent = Math.round(frames * 1000 / fpsT) + ' fps'; updateTelemetry(); frames = 0; fpsT = 0; }
  requestAnimationFrame(loop);
}

function updateTelemetry() {
  const n = GW * GH;
  let sumV = 0, active = 0, mass = 0;
  for (let i = 0; i < n; i++) {
    const v = V[i];
    sumV += v;
    mass += U[i] + v;
    if (v > 0.2) active++;
  }
  if (tel.meanv) tel.meanv.textContent = (sumV / n).toFixed(3);
  if (tel.active) tel.active.textContent = Math.round(active / n * 100) + '%';
  if (tel.mass) tel.mass.textContent = (mass / n).toFixed(3);
  if (tel.fk) tel.fk.textContent =
    parseFloat(el.feed.value).toFixed(3) + ' / ' + parseFloat(el.kill.value).toFixed(3);
}

function applyPreset(name) {
  const p = PRESETS[name]; if (!p) return;
  el.feed.value = p.f; el.feedOut.textContent = p.f.toFixed(3);
  el.kill.value = p.k; el.killOut.textContent = p.k.toFixed(3);
}

el.feed.addEventListener('input', () => { el.feedOut.textContent = parseFloat(el.feed.value).toFixed(3); });
el.kill.addEventListener('input', () => { el.killOut.textContent = parseFloat(el.kill.value).toFixed(3); });
el.preset.addEventListener('change', () => applyPreset(el.preset.value));
el.seed.addEventListener('click', seed);
el.clear.addEventListener('click', () => { U.fill(1); V.fill(0); });

function pos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
}
canvas.addEventListener('pointerdown', (e) => { const p = pos(e); mouse.x = p.x; mouse.y = p.y; mouse.down = true; });
canvas.addEventListener('pointermove', (e) => { const p = pos(e); mouse.x = p.x; mouse.y = p.y; });
window.addEventListener('pointerup', () => { mouse.down = false; });

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(resize); });

resize();
applyPreset('coral');
requestAnimationFrame(loop);
