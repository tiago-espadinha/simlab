'use strict';

/**
 * Improved Boids flocking simulation.
 *
 * Key improvements over the naive version:
 *  - Spatial hash grid  -> neighbour search is ~O(n) instead of O(n^2).
 *  - Squared-distance comparisons in the hot loop (no sqrt until needed).
 *  - Reynolds steering forces (desired - velocity, clamped by maxForce).
 *  - Fixed-timestep integration -> frame-rate independent behaviour.
 *  - Speed in world units/second, decoupled from devicePixelRatio.
 *  - Cursor fleeing, edge wrap/turn toggle, presets, FPS + count HUD.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CONFIG = {
  visionRadius: 60,     // world px: alignment + cohesion range
  separationRadius: 24, // world px: personal space
  maxForce: 200,        // world px/s^2: how hard a boid can steer
  minSpeedFactor: 0.5,  // fraction of maxSpeed a boid must keep
  fleeRadius: 110,      // world px: cursor avoidance range
  fleeStrength: 320,    // world px/s^2 near the cursor
  edgeMargin: 60,       // world px: turn-back band when wrap is off
  edgeTurn: 220,        // world px/s^2 push away from edges
  dt: 1 / 60,           // fixed simulation step (seconds)
  maxSubSteps: 5,       // clamp catch-up work after a stall
};

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  cnt: document.getElementById('cnt'),
  cntOut: document.getElementById('cnt-out'),
  sep: document.getElementById('sep'),
  sepOut: document.getElementById('sep-out'),
  ali: document.getElementById('ali'),
  aliOut: document.getElementById('ali-out'),
  coh: document.getElementById('coh'),
  cohOut: document.getElementById('coh-out'),
  spd: document.getElementById('spd'),
  spdOut: document.getElementById('spd-out'),
  wrap: document.getElementById('wrap'),
  flee: document.getElementById('flee'),
  trails: document.getElementById('trails'),
  preset: document.getElementById('preset'),
  pause: document.getElementById('pause'),
  reset: document.getElementById('reset'),
  fps: document.getElementById('fps'),
};

// Optional telemetry outputs.
const tel = {
  count: document.getElementById('tel-count'),
  order: document.getElementById('tel-order'),
  speed: document.getElementById('tel-speed'),
  swirl: document.getElementById('tel-swirl'),
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let W = 0;              // canvas width in device pixels
let H = 0;              // canvas height in device pixels
let dpr = 1;
let boids = [];
let running = true;

const mouse = { x: -1, y: -1, active: false };

// ---------------------------------------------------------------------------
// Canvas sizing
// ---------------------------------------------------------------------------
function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = rect.width;
  const cssHeight = rect.height;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.height = cssHeight + 'px';
  W = canvas.width;
  H = canvas.height;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const rnd = (a, b) => a + Math.random() * (b - a);

/** Convert a world-px value to device px so behaviour matches on any display. */
const toDevice = (v) => v * dpr;

function makeBoid() {
  const angle = rnd(0, Math.PI * 2);
  const speed = toDevice(getParams().maxSpeed);
  return {
    x: rnd(0, W),
    y: rnd(0, H),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    hue: rnd(0, 125),
  };
}

function setCount(n) {
  n = Math.max(0, n | 0);
  while (boids.length < n) boids.push(makeBoid());
  if (boids.length > n) boids.length = n;
}

function getParams() {
  return {
    sep: parseFloat(el.sep.value),
    ali: parseFloat(el.ali.value),
    coh: parseFloat(el.coh.value),
    maxSpeed: parseFloat(el.spd.value), // world px/s
    wrap: el.wrap.checked,
    flee: el.flee.checked,
  };
}

// ---------------------------------------------------------------------------
// Spatial hash grid
// ---------------------------------------------------------------------------
function buildGrid(cellSize) {
  const cols = Math.max(1, Math.ceil(W / cellSize));
  const rows = Math.max(1, Math.ceil(H / cellSize));
  const cells = new Array(cols * rows);
  for (let i = 0; i < cells.length; i++) cells[i] = [];

  for (const b of boids) {
    const cx = Math.min(cols - 1, Math.floor(b.x / cellSize));
    const cy = Math.min(rows - 1, Math.floor(b.y / cellSize));
    cells[cy * cols + cx].push(b);
  }
  return { cells, cols, rows, cellSize };
}

/** Collect neighbours from the 3x3 block of cells around a boid. */
function neighbours(grid, b, wrap, out) {
  out.length = 0;
  const { cells, cols, rows, cellSize } = grid;
  const cx = Math.min(cols - 1, Math.floor(b.x / cellSize));
  const cy = Math.min(rows - 1, Math.floor(b.y / cellSize));

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      let gx = cx + ox;
      let gy = cy + oy;
      if (wrap) {
        gx = (gx + cols) % cols;
        gy = (gy + rows) % rows;
      } else if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) {
        continue;
      }
      const bucket = cells[gy * cols + gx];
      for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Simulation step (fixed dt seconds)
// ---------------------------------------------------------------------------
const _near = [];

function step(dt) {
  const p = getParams();
  const maxSpeed = toDevice(p.maxSpeed);
  const minSpeed = maxSpeed * CONFIG.minSpeedFactor;
  const maxForce = toDevice(CONFIG.maxForce);
  const visionR = toDevice(CONFIG.visionRadius);
  const sepR = toDevice(CONFIG.separationRadius);
  const fleeR = toDevice(CONFIG.fleeRadius);
  const visionR2 = visionR * visionR;
  const sepR2 = sepR * sepR;
  const fleeR2 = fleeR * fleeR;
  const cellSize = Math.max(visionR, sepR);
  const grid = buildGrid(cellSize);

  for (const b of boids) {
    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0;
    let cohX = 0, cohY = 0;
    let sepN = 0, flockN = 0;

    const near = neighbours(grid, b, p.wrap, _near);
    for (let i = 0; i < near.length; i++) {
      const o = near[i];
      if (o === b) continue;

      let dx = o.x - b.x;
      let dy = o.y - b.y;
      if (p.wrap) {
        if (dx > W * 0.5) dx -= W; else if (dx < -W * 0.5) dx += W;
        if (dy > H * 0.5) dy -= H; else if (dy < -H * 0.5) dy += H;
      }
      const d2 = dx * dx + dy * dy;
      if (d2 > visionR2 || d2 === 0) continue;

      if (d2 < sepR2) {
        const inv = 1 / Math.sqrt(d2);
        sepX -= dx * inv;
        sepY -= dy * inv;
        sepN++;
      }
      aliX += o.vx; aliY += o.vy;
      cohX += dx;  cohY += dy;
      flockN++;
    }

    let ax = 0, ay = 0;

    // Separation: steer away from crowded neighbours.
    if (sepN > 0) {
      [sepX, sepY] = steer(sepX, sepY, maxSpeed, b.vx, b.vy, maxForce);
      ax += sepX * p.sep;
      ay += sepY * p.sep;
    }
    // Alignment: match average heading.
    if (flockN > 0) {
      [aliX, aliY] = steer(aliX / flockN, aliY / flockN, maxSpeed, b.vx, b.vy, maxForce);
      ax += aliX * p.ali;
      ay += aliY * p.ali;
      // Cohesion: steer toward the local centre of mass.
      let [cx, cy] = steer(cohX / flockN, cohY / flockN, maxSpeed, b.vx, b.vy, maxForce);
      ax += cx * p.coh;
      ay += cy * p.coh;
    }

    // Cursor avoidance.
    if (p.flee && mouse.active) {
      let dx = b.x - mouse.x;
      let dy = b.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < fleeR2 && d2 > 0) {
        const d = Math.sqrt(d2);
        const strength = toDevice(CONFIG.fleeStrength) * (1 - d / fleeR);
        ax += (dx / d) * strength;
        ay += (dy / d) * strength;
      }
    }

    // Soft edge turn when wrapping is disabled.
    if (!p.wrap) {
      const m = toDevice(CONFIG.edgeMargin);
      const turn = toDevice(CONFIG.edgeTurn);
      if (b.x < m) ax += turn * (1 - b.x / m);
      else if (b.x > W - m) ax -= turn * (1 - (W - b.x) / m);
      if (b.y < m) ay += turn * (1 - b.y / m);
      else if (b.y > H - m) ay -= turn * (1 - (H - b.y) / m);
    }

    // Integrate.
    b.vx += ax * dt;
    b.vy += ay * dt;
    [b.vx, b.vy] = clampSpeed(b.vx, b.vy, minSpeed, maxSpeed);

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (p.wrap) {
      b.x = (b.x + W) % W;
      b.y = (b.y + H) % H;
    } else {
      b.x = Math.max(0, Math.min(W, b.x));
      b.y = Math.max(0, Math.min(H, b.y));
    }
  }
}

/** Reynolds steering: desired direction at maxSpeed, minus current velocity, clamped. */
function steer(dirX, dirY, maxSpeed, vx, vy, maxForce) {
  const m = Math.sqrt(dirX * dirX + dirY * dirY);
  if (m === 0) return [0, 0];
  const desiredX = (dirX / m) * maxSpeed;
  const desiredY = (dirY / m) * maxSpeed;
  let fx = desiredX - vx;
  let fy = desiredY - vy;
  const fm = Math.sqrt(fx * fx + fy * fy);
  if (fm > maxForce) {
    fx = (fx / fm) * maxForce;
    fy = (fy / fm) * maxForce;
  }
  return [fx, fy];
}

// ---------------------------------------------------------------------------
// Telemetry: flock order parameters (all cheap O(n) passes).
// ---------------------------------------------------------------------------
function updateTelemetry() {
  const n = boids.length;
  if (tel.count) tel.count.textContent = n;
  if (!n) return;
  let cx = 0, cy = 0;
  for (const b of boids) { cx += b.x; cy += b.y; }
  cx /= n; cy /= n;

  let sux = 0, suy = 0, sSpeed = 0, swirl = 0;
  for (const b of boids) {
    const s = Math.hypot(b.vx, b.vy);
    sSpeed += s;
    if (s > 0) {
      sux += b.vx / s;
      suy += b.vy / s;
      const rx = b.x - cx, ry = b.y - cy;
      const rmag = Math.hypot(rx, ry);
      if (rmag > 0) swirl += (rx * b.vy - ry * b.vx) / (rmag * s);
    }
  }
  const phi = Math.hypot(sux, suy) / n;          // 0 = disordered, 1 = aligned
  const meanSpeed = (sSpeed / n) / dpr;          // world px/s
  const rot = swirl / n;                         // -1 = CW, +1 = CCW
  if (tel.order) tel.order.textContent = phi.toFixed(2);
  if (tel.speed) tel.speed.textContent = Math.round(meanSpeed) + ' px/s';
  if (tel.swirl) tel.swirl.textContent = (rot >= 0 ? '+' : '') + rot.toFixed(2);
}

function clampSpeed(vx, vy, minSpeed, maxSpeed) {
  const s = Math.sqrt(vx * vx + vy * vy);
  if (s === 0) return [minSpeed, 0];
  if (s > maxSpeed) return [(vx / s) * maxSpeed, (vy / s) * maxSpeed];
  if (s < minSpeed) return [(vx / s) * minSpeed, (vy / s) * minSpeed];
  return [vx, vy];
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function draw() {
  if (el.trails.checked) {
    ctx.fillStyle = 'rgba(10, 10, 18, 0.2)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
  }

  const maxSpeed = toDevice(parseFloat(el.spd.value));
  const sz = 7 * dpr;

  for (const b of boids) {
    const angle = Math.atan2(b.vy, b.vx);
    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    const norm = Math.min(spd / maxSpeed, 1);

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(sz, 0);
    ctx.lineTo(-sz * 0.55, -sz * 0.45);
    ctx.lineTo(-sz * 0.3, 0);
    ctx.lineTo(-sz * 0.55, sz * 0.45);
    ctx.closePath();
    ctx.fillStyle = `hsla(${b.hue + norm * 45}, 82%, ${52 + norm * 22}%, 0.9)`;
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Main loop: fixed-timestep accumulator + FPS meter
// ---------------------------------------------------------------------------
let lastTime = performance.now();
let accumulator = 0;
let fpsTimer = 0;
let frames = 0;

function loop(now) {
  const frameMs = Math.min(now - lastTime, 250); // clamp huge gaps (tab switch)
  lastTime = now;

  if (running) {
    accumulator += frameMs / 1000;
    let steps = 0;
    while (accumulator >= CONFIG.dt && steps < CONFIG.maxSubSteps) {
      step(CONFIG.dt);
      accumulator -= CONFIG.dt;
      steps++;
    }
    if (steps === CONFIG.maxSubSteps) accumulator = 0; // give up on backlog
  }

  draw();

  // FPS meter (updates ~4x/sec).
  frames++;
  fpsTimer += frameMs;
  if (fpsTimer >= 250) {
    el.fps.textContent = Math.round((frames * 1000) / fpsTimer) + ' fps';
    updateTelemetry();
    frames = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------
const PRESETS = {
  school:  { sep: 1.6, ali: 1.4, coh: 1.0, spd: 140 },
  swarm:   { sep: 0.8, ali: 0.4, coh: 1.8, spd: 110 },
  scatter: { sep: 2.6, ali: 0.3, coh: 0.3, spd: 180 },
  vortex:  { sep: 1.2, ali: 2.2, coh: 1.6, spd: 160 },
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  el.sep.value = p.sep; el.sepOut.textContent = p.sep.toFixed(1);
  el.ali.value = p.ali; el.aliOut.textContent = p.ali.toFixed(1);
  el.coh.value = p.coh; el.cohOut.textContent = p.coh.toFixed(1);
  el.spd.value = p.spd; el.spdOut.textContent = p.spd;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function syncOut(input, out, fixed) {
  out.textContent = fixed ? parseFloat(input.value).toFixed(1) : input.value;
}

el.cnt.addEventListener('input', () => {
  syncOut(el.cnt, el.cntOut, false);
  setCount(parseInt(el.cnt.value, 10));
});
el.sep.addEventListener('input', () => syncOut(el.sep, el.sepOut, true));
el.ali.addEventListener('input', () => syncOut(el.ali, el.aliOut, true));
el.coh.addEventListener('input', () => syncOut(el.coh, el.cohOut, true));
el.spd.addEventListener('input', () => syncOut(el.spd, el.spdOut, false));

el.preset.addEventListener('change', () => applyPreset(el.preset.value));

el.pause.addEventListener('click', () => {
  running = !running;
  el.pause.textContent = running ? 'Pause' : 'Play';
});

el.reset.addEventListener('click', () => {
  setCount(0);
  setCount(parseInt(el.cnt.value, 10));
});

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * dpr;
  mouse.y = (e.clientY - rect.top) * dpr;
  mouse.active = true;
});

canvas.addEventListener('pointerleave', () => { mouse.active = false; });

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * dpr;
  const my = (e.clientY - rect.top) * dpr;
  const speed = toDevice(parseFloat(el.spd.value));
  for (let i = 0; i < 15; i++) {
    const angle = rnd(0, Math.PI * 2);
    boids.push({
      x: mx + rnd(-20, 20) * dpr,
      y: my + rnd(-20, 20) * dpr,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hue: rnd(160, 265),
    });
  }
  el.cnt.value = Math.min(parseInt(el.cnt.max, 10), boids.length);
  el.cntOut.textContent = el.cnt.value;
});

let resizeRaf = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(resize);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
resize();
setCount(parseInt(el.cnt.value, 10));
requestAnimationFrame(loop);
