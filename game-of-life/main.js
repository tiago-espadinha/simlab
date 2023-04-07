'use strict';

// Conway's Game of Life on a toroidal grid. Typed arrays + double buffering.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  cell: document.getElementById('cell'),
  cellOut: document.getElementById('cell-out'),
  speed: document.getElementById('speed'),
  speedOut: document.getElementById('speed-out'),
  pattern: document.getElementById('pattern'),
  play: document.getElementById('play'),
  stepBtn: document.getElementById('stepBtn'),
  clear: document.getElementById('clear'),
  randomize: document.getElementById('randomize'),
  gen: document.getElementById('gen'),
};

const tel = {
  pop: document.getElementById('tel-pop'),
  density: document.getElementById('tel-density'),
  births: document.getElementById('tel-births'),
  deaths: document.getElementById('tel-deaths'),
};

let W = 0, H = 0, dpr = 1;
let cell = 9;
let cols = 0, rows = 0;
let grid, next;
let generation = 0;
let running = true;
let population = 0, lastBirths = 0, lastDeaths = 0;
const paint = { active: false, val: 1 };

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
  cols = Math.max(4, Math.floor(W / cs));
  rows = Math.max(4, Math.floor(H / cs));
  grid = new Uint8Array(cols * rows);
  next = new Uint8Array(cols * rows);
}

const at = (x, y) => ((y + rows) % rows) * cols + ((x + cols) % cols);

function loadPattern(name) {
  grid.fill(0);
  generation = 0;
  if (name === 'random') {
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.28 ? 1 : 0;
  } else if (name === 'glidergun') {
    placeGosperGun(2, 2);
  } else if (name === 'pulsar') {
    placePulsar((cols >> 1) - 6, (rows >> 1) - 6);
  }
}

function placeCells(coords, ox, oy) {
  for (const [x, y] of coords) {
    const gx = ox + x, gy = oy + y;
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) grid[gy * cols + gx] = 1;
  }
}

function placeGosperGun(ox, oy) {
  const c = [
    [24,0],[22,1],[24,1],[12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
    [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],[0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
    [0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],[10,6],[16,6],[24,6],
    [11,7],[15,7],[12,8],[13,8]
  ];
  placeCells(c, ox, oy);
}

function placePulsar(ox, oy) {
  const base = [[2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
    [0,2],[5,2],[7,2],[12,2],[0,3],[5,3],[7,3],[12,3],[0,4],[5,4],[7,4],[12,4],
    [2,5],[3,5],[4,5],[8,5],[9,5],[10,5]];
  const full = [];
  for (const [x, y] of base) { full.push([x, y]); }
  // mirror bottom half
  const mirror = base.map(([x, y]) => [x, 12 - y]);
  placeCells(base, ox, oy);
  placeCells(mirror, ox, oy);
}

function stepLife() {
  let births = 0, deaths = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0;
      n += grid[at(x - 1, y - 1)] + grid[at(x, y - 1)] + grid[at(x + 1, y - 1)];
      n += grid[at(x - 1, y)] + grid[at(x + 1, y)];
      n += grid[at(x - 1, y + 1)] + grid[at(x, y + 1)] + grid[at(x + 1, y + 1)];
      const alive = grid[y * cols + x];
      const nv = (alive ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
      next[y * cols + x] = nv;
      if (nv && !alive) births++;
      else if (!nv && alive) deaths++;
    }
  }
  const tmp = grid; grid = next; next = tmp;
  generation++;
  lastBirths = births; lastDeaths = deaths;
}

function draw() {
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  const cs = W / cols;
  let alive = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y * cols + x]) {
        alive++;
        const hue = 160 + (x / cols) * 120;
        ctx.fillStyle = `hsl(${hue}, 75%, 60%)`;
        ctx.fillRect(x * cs, y * cs, cs - dpr, cs - dpr);
      }
    }
  }
  el.gen.textContent = 'gen ' + generation;
  population = alive;
}

function updateTelemetry() {
  const total = cols * rows || 1;
  if (tel.pop) tel.pop.textContent = population;
  if (tel.density) tel.density.textContent = (population / total * 100).toFixed(1) + '%';
  if (tel.births) tel.births.textContent = lastBirths;
  if (tel.deaths) tel.deaths.textContent = lastDeaths;
}

let acc = 0, last = performance.now();
function loop(now) {
  const ms = now - last; last = now;
  if (running) {
    const interval = 1000 / parseInt(el.speed.value, 10);
    acc += ms;
    let guard = 0;
    while (acc >= interval && guard < 4) { stepLife(); acc -= interval; guard++; }
  }
  draw();
  updateTelemetry();
  requestAnimationFrame(loop);
}

el.cell.addEventListener('input', () => {
  el.cellOut.textContent = el.cell.value; cell = parseInt(el.cell.value, 10);
  allocate(); loadPattern(el.pattern.value);
});
el.speed.addEventListener('input', () => { el.speedOut.textContent = el.speed.value; });
el.pattern.addEventListener('change', () => loadPattern(el.pattern.value));
el.play.addEventListener('click', () => { running = !running; el.play.textContent = running ? 'Pause' : 'Play'; });
el.stepBtn.addEventListener('click', () => { running = false; el.play.textContent = 'Play'; stepLife(); });
el.clear.addEventListener('click', () => { grid.fill(0); generation = 0; });
el.randomize.addEventListener('click', () => loadPattern('random'));

function cellAt(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * dpr / (W / cols));
  const y = Math.floor((e.clientY - rect.top) * dpr / (H / rows));
  return { x, y };
}
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = cellAt(e);
  if (x < 0 || x >= cols || y < 0 || y >= rows) return;
  paint.active = true;
  paint.val = grid[y * cols + x] ? 0 : 1;
  grid[y * cols + x] = paint.val;
});
canvas.addEventListener('pointermove', (e) => {
  if (!paint.active) return;
  const { x, y } = cellAt(e);
  if (x >= 0 && x < cols && y >= 0 && y < rows) grid[y * cols + x] = paint.val;
});
window.addEventListener('pointerup', () => { paint.active = false; });

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(() => { resize(); loadPattern(el.pattern.value); }); });

resize();
loadPattern('random');
requestAnimationFrame(loop);
