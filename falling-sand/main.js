'use strict';

// Falling-sand cellular automaton.
// Cell types: 0 empty, 1 sand, 2 water, 3 wall, 4 plant.
// Grid scanned bottom-up so falling particles move one cell per frame.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  material: document.getElementById('material'),
  brush: document.getElementById('brush'),
  brushOut: document.getElementById('brush-out'),
  cell: document.getElementById('cell'),
  cellOut: document.getElementById('cell-out'),
  clear: document.getElementById('clear'),
  fps: document.getElementById('fps'),
};

const tel = {
  filled: document.getElementById('tel-filled'),
  sand: document.getElementById('tel-sand'),
  water: document.getElementById('tel-water'),
  plant: document.getElementById('tel-plant'),
};

const EMPTY = 0, SAND = 1, WATER = 2, WALL = 3, PLANT = 4;
let W = 0, H = 0, dpr = 1;
let cell = 4;
let cols = 0, rows = 0;
let grid;
let img, off, offCtx;
const mouse = { x: 0, y: 0, down: false };

const COLORS = {
  [SAND]: [222, 184, 90],
  [WATER]: [70, 130, 220],
  [WALL]: [117, 109, 106],
  [PLANT]: [80, 200, 110],
};

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
  allocate();
}

function allocate() {
  const cs = cell * dpr;
  cols = Math.max(8, Math.floor(W / cs));
  rows = Math.max(8, Math.floor(H / cs));
  grid = new Uint8Array(cols * rows);
  off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  offCtx = off.getContext('2d');
  img = offCtx.createImageData(cols, rows);
  ctx.imageSmoothingEnabled = false;
}

const idx = (x, y) => y * cols + x;
const inb = (x, y) => x >= 0 && x < cols && y >= 0 && y < rows;

function swap(a, b) { const t = grid[a]; grid[a] = grid[b]; grid[b] = t; }

function update() {
  for (let y = rows - 2; y >= 0; y--) {
    // alternate scan direction to reduce bias
    const ltr = (y & 1) === 0;
    for (let k = 0; k < cols; k++) {
      const x = ltr ? k : cols - 1 - k;
      const i = idx(x, y);
      const t = grid[i];
      if (t === EMPTY || t === WALL) continue;

      if (t === SAND) {
        const below = idx(x, y + 1);
        if (grid[below] === EMPTY || grid[below] === WATER) { swap(i, below); continue; }
        const dir = Math.random() < 0.5 ? -1 : 1;
        for (const dx of [dir, -dir]) {
          if (inb(x + dx, y + 1)) {
            const d = idx(x + dx, y + 1);
            if (grid[d] === EMPTY || grid[d] === WATER) { swap(i, d); break; }
          }
        }
      } else if (t === WATER) {
        const below = idx(x, y + 1);
        if (grid[below] === EMPTY) { swap(i, below); continue; }
        const dir = Math.random() < 0.5 ? -1 : 1;
        let moved = false;
        for (const dx of [dir, -dir]) {
          if (inb(x + dx, y + 1) && grid[idx(x + dx, y + 1)] === EMPTY) { swap(i, idx(x + dx, y + 1)); moved = true; break; }
        }
        if (moved) continue;
        for (const dx of [dir, -dir]) {
          if (inb(x + dx, y) && grid[idx(x + dx, y)] === EMPTY) { swap(i, idx(x + dx, y)); break; }
        }
      } else if (t === PLANT) {
        // grow into adjacent water occasionally
        if (Math.random() < 0.08) {
          const dirs = [[0, -1], [-1, 0], [1, 0], [0, 1]];
          const [dx, dy] = dirs[(Math.random() * 4) | 0];
          if (inb(x + dx, y + dy) && grid[idx(x + dx, y + dy)] === WATER) grid[idx(x + dx, y + dy)] = PLANT;
        }
      }
    }
  }
}

function draw() {
  const data = img.data;
  for (let i = 0; i < cols * rows; i++) {
    const t = grid[i];
    const j = i * 4;
    if (t === EMPTY) { data[j] = 10; data[j + 1] = 10; data[j + 2] = 18; data[j + 3] = 255; }
    else { const c = COLORS[t]; data[j] = c[0]; data[j + 1] = c[1]; data[j + 2] = c[2]; data[j + 3] = 255; }
  }
  offCtx.putImageData(img, 0, 0);
  ctx.drawImage(off, 0, 0, W, H);
}

function paint() {
  if (!mouse.down) return;
  const cs = W / cols;
  const cx = Math.floor(mouse.x / cs);
  const cy = Math.floor(mouse.y / cs);
  const r = parseInt(el.brush.value, 10);
  const mat = parseInt(el.material.value, 10);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      const gx = cx + x, gy = cy + y;
      if (!inb(gx, gy)) continue;
      if (mat === EMPTY) grid[idx(gx, gy)] = EMPTY;
      else if (grid[idx(gx, gy)] === EMPTY || mat === WALL) grid[idx(gx, gy)] = mat;
      else if (Math.random() < 0.6) grid[idx(gx, gy)] = mat;
    }
  }
}

let last = performance.now(), fpsT = 0, frames = 0;
function loop(now) {
  const ms = now - last; last = now;
  paint();
  update();
  draw();
  frames++; fpsT += ms;
  if (fpsT >= 250) { el.fps.textContent = Math.round(frames * 1000 / fpsT) + ' fps'; updateTelemetry(); frames = 0; fpsT = 0; }
  requestAnimationFrame(loop);
}

function updateTelemetry() {
  const n = cols * rows;
  let sand = 0, water = 0, plant = 0, filled = 0;
  for (let i = 0; i < n; i++) {
    const t = grid[i];
    if (t === EMPTY) continue;
    filled++;
    if (t === SAND) sand++;
    else if (t === WATER) water++;
    else if (t === PLANT) plant++;
  }
  if (tel.filled) tel.filled.textContent = n ? Math.round(filled / n * 100) + '%' : '0%';
  if (tel.sand) tel.sand.textContent = sand;
  if (tel.water) tel.water.textContent = water;
  if (tel.plant) tel.plant.textContent = plant;
}

el.brush.addEventListener('input', () => { el.brushOut.textContent = el.brush.value; });
el.cell.addEventListener('input', () => { el.cellOut.textContent = el.cell.value; cell = parseInt(el.cell.value, 10); allocate(); });
el.clear.addEventListener('click', () => grid.fill(EMPTY));

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
