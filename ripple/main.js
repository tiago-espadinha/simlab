'use strict';

// 2D wave equation on a height field using two buffers:
//   next = (left + right + up + down) / 2 - prev, then damped.
// Rendered via ImageData with simple shading from the height gradient.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  damp: document.getElementById('damp'),
  dampOut: document.getElementById('damp-out'),
  strength: document.getElementById('strength'),
  palette: document.getElementById('palette'),
  rain: document.getElementById('rain'),
  clear: document.getElementById('clear'),
  fps: document.getElementById('fps'),
};

const tel = {
  peak: document.getElementById('tel-peak'),
  energy: document.getElementById('tel-energy'),
  active: document.getElementById('tel-active'),
  damp: document.getElementById('tel-damp'),
};

const SCALE = 3; // sim resolution divisor
let W = 0, H = 0, dpr = 1;
let gw = 0, gh = 0;
let cur, prev;
let img, off, offCtx;
const mouse = { x: 0, y: 0, down: false };

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
  gw = Math.max(16, Math.floor(W / SCALE));
  gh = Math.max(16, Math.floor(H / SCALE));
  cur = new Float32Array(gw * gh);
  prev = new Float32Array(gw * gh);
  off = document.createElement('canvas');
  off.width = gw; off.height = gh;
  offCtx = off.getContext('2d');
  img = offCtx.createImageData(gw, gh);
  ctx.imageSmoothingEnabled = true;
}

function disturb(px, py, amount) {
  const gx = Math.floor(px / W * gw);
  const gy = Math.floor(py / H * gh);
  const r = 2;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const ix = gx + x, iy = gy + y;
      if (ix < 1 || ix >= gw - 1 || iy < 1 || iy >= gh - 1) continue;
      prev[iy * gw + ix] += amount;
    }
  }
}

function stepWave(damp) {
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      const v = (prev[i - 1] + prev[i + 1] + prev[i - gw] + prev[i + gw]) * 0.5 - cur[i];
      cur[i] = v * damp;
    }
  }
  const t = prev; prev = cur; cur = t;
}

function colorFor(h, shade) {
  const p = el.palette.value;
  const s = Math.max(-1, Math.min(1, h * 0.02));
  const light = 0.5 + s * 0.5 + shade * 0.4;
  const l = Math.max(0, Math.min(1, light));
  if (p === 'ink') { const c = l * 255; return [c, c, c]; }
  if (p === 'neon') return [l * 180, 60 + l * 120, 200 + s * 55];
  return [30 + l * 60, 90 + l * 120, 150 + l * 105]; // ocean
}

function render() {
  const data = img.data;
  const buf = prev;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      const left = x > 0 ? buf[i - 1] : buf[i];
      const shade = (buf[i] - left) * 0.08;
      const [r, g, b] = colorFor(buf[i], shade);
      const j = i * 4;
      data[j] = r; data[j + 1] = g; data[j + 2] = b; data[j + 3] = 255;
    }
  }
  offCtx.putImageData(img, 0, 0);
  ctx.drawImage(off, 0, 0, W, H);
}

let last = performance.now(), fpsT = 0, frames = 0;
function loop(now) {
  const ms = now - last; last = now;
  const damp = parseFloat(el.damp.value);
  const strength = parseFloat(el.strength.value);

  if (mouse.down) disturb(mouse.x, mouse.y, strength);
  if (el.rain.checked && Math.random() < 0.4) {
    disturb(Math.random() * W, Math.random() * H, strength * 0.8);
  }

  stepWave(damp);
  render();

  frames++; fpsT += ms;
  if (fpsT >= 250) { el.fps.textContent = Math.round(frames * 1000 / fpsT) + ' fps'; updateTelemetry(); frames = 0; fpsT = 0; }
  requestAnimationFrame(loop);
}

function updateTelemetry() {
  const buf = prev;
  const n = buf.length;
  if (!n) return;
  let peak = 0, energy = 0, active = 0;
  for (let i = 0; i < n; i++) {
    const h = buf[i];
    const a = h < 0 ? -h : h;
    if (a > peak) peak = a;
    energy += h * h;
    if (a > 0.5) active++;
  }
  if (tel.peak) tel.peak.textContent = peak.toFixed(1);
  if (tel.energy) tel.energy.textContent = (energy / 1000).toFixed(1);
  if (tel.active) tel.active.textContent = Math.round(active / n * 100) + '%';
  if (tel.damp) tel.damp.textContent = parseFloat(el.damp.value).toFixed(3);
}

el.damp.addEventListener('input', () => { el.dampOut.textContent = parseFloat(el.damp.value).toFixed(3); });
el.clear.addEventListener('click', () => { cur.fill(0); prev.fill(0); });

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
requestAnimationFrame(loop);
