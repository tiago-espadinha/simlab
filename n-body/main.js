'use strict';

// N-body gravity. Bodies attract each other (O(n^2), fine for small n).
// Scenes seed circular orbital velocities: v = sqrt(G * M_central / r).

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  speed: document.getElementById('speed'),
  speedOut: document.getElementById('speed-out'),
  scene: document.getElementById('scene'),
  trails: document.getElementById('trails'),
  pause: document.getElementById('pause'),
  reset: document.getElementById('reset'),
  fps: document.getElementById('fps'),
};

const tel = {
  count: document.getElementById('tel-count'),
  ke: document.getElementById('tel-ke'),
  pe: document.getElementById('tel-pe'),
  drift: document.getElementById('tel-drift'),
  mom: document.getElementById('tel-mom'),
};

let E0 = null; // reference total energy for the current scene

const G = 1.0;
let W = 0, H = 0, dpr = 1;
let bodies = [];
let running = true;
const drag = { active: false, x0: 0, y0: 0, x1: 0, y1: 0 };

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
}

function radiusFor(mass) { return Math.max(2, Math.cbrt(mass) * 1.6) * dpr; }

function addBody(x, y, vx, vy, mass, hue) {
  bodies.push({ x, y, vx, vy, mass, hue, r: radiusFor(mass) });
}

function circularVel(cx, cy, x, y, centralMass, dir) {
  const dx = x - cx, dy = y - cy;
  const r = Math.hypot(dx, dy) || 1;
  const speed = Math.sqrt(G * centralMass / r);
  // perpendicular direction
  return { vx: -dy / r * speed * dir, vy: dx / r * speed * dir };
}

function buildScene(name) {
  bodies = [];
  E0 = null;
  const cx = W / 2, cy = H / 2;
  const unit = Math.min(W, H);

  if (name === 'solar') {
    const sunMass = 4000;
    addBody(cx, cy, 0, 0, sunMass, 48);
    const orbits = [0.10, 0.16, 0.24, 0.34, 0.44];
    const masses = [12, 40, 30, 18, 60];
    const hues = [10, 200, 130, 30, 280];
    orbits.forEach((o, i) => {
      const x = cx + o * unit, y = cy;
      const v = circularVel(cx, cy, x, y, sunMass, 1);
      addBody(x, y, v.vx, v.vy, masses[i], hues[i]);
    });
  } else if (name === 'binary') {
    const m = 2200;
    const sep = 0.12 * unit;
    const vorb = Math.sqrt(G * m / (2 * sep)) * 0.7;
    addBody(cx - sep, cy, 0, -vorb, m, 20);
    addBody(cx + sep, cy, 0, vorb, m, 210);
    for (let i = 0; i < 6; i++) {
      const o = (0.28 + i * 0.05) * unit;
      const x = cx + o, y = cy;
      const v = circularVel(cx, cy, x, y, m * 2, 1);
      addBody(x, y, v.vx, v.vy, 8, 120 + i * 25);
    }
  } else {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = Math.random() * 0.4 * unit;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      const v = circularVel(cx, cy, x, y, 5000, 1);
      addBody(x, y, v.vx * 0.6, v.vy * 0.6, 6 + Math.random() * 10, Math.random() * 360);
    }
    addBody(cx, cy, 0, 0, 5000, 48);
  }
}

function step(dt) {
  const soft = (8 * dpr) * (8 * dpr);
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    let ax = 0, ay = 0;
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const b = bodies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy + soft;
      const inv = 1 / Math.sqrt(d2);
      const f = G * b.mass / d2;
      ax += dx * inv * f;
      ay += dy * inv * f;
    }
    a.ax = ax; a.ay = ay;
  }
  for (const a of bodies) {
    a.vx += a.ax * dt;
    a.vy += a.ay * dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
  }
}

function draw() {
  if (el.trails.checked) {
    ctx.fillStyle = 'rgba(10, 10, 18, 0.14)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
  }
  for (const b of bodies) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${b.hue}, 80%, 62%)`;
    ctx.shadowBlur = b.r * 2;
    ctx.shadowColor = `hsla(${b.hue}, 90%, 60%, 0.7)`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (drag.active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(drag.x0, drag.y0);
    ctx.lineTo(drag.x1, drag.y1);
    ctx.stroke();
  }
}

let last = performance.now(), acc = 0, fpsT = 0, frames = 0;
const DT = 1 / 60;

// Total kinetic + potential energy and net momentum of the system.
function energy() {
  const soft = (8 * dpr) * (8 * dpr);
  let ke = 0, pe = 0, px = 0, py = 0;
  for (const a of bodies) {
    ke += 0.5 * a.mass * (a.vx * a.vx + a.vy * a.vy);
    px += a.mass * a.vx; py += a.mass * a.vy;
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x, dy = bodies[j].y - bodies[i].y;
      const d = Math.sqrt(dx * dx + dy * dy + soft);
      pe -= G * bodies[i].mass * bodies[j].mass / d;
    }
  }
  return { ke, pe, tot: ke + pe, mom: Math.hypot(px, py) };
}

function fmt(v) {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) return v.toExponential(1);
  return v.toFixed(1);
}

function updateTelemetry() {
  if (tel.count) tel.count.textContent = bodies.length;
  if (!bodies.length) return;
  const e = energy();
  if (E0 === null) E0 = e.tot;
  if (tel.ke) tel.ke.textContent = fmt(e.ke);
  if (tel.pe) tel.pe.textContent = fmt(e.pe);
  if (tel.drift) {
    const d = E0 ? (e.tot - E0) / Math.abs(E0) * 100 : 0;
    tel.drift.textContent = (d >= 0 ? '+' : '') + d.toFixed(2) + '%';
  }
  if (tel.mom) tel.mom.textContent = fmt(e.mom);
}

function loop(now) {
  const ms = Math.min(now - last, 250);
  last = now;
  if (running) {
    const scale = parseFloat(el.speed.value);
    acc += (ms / 100) * scale;
    let n = 0;
    while (acc >= DT && n < 8) { step(DT); acc -= DT; n++; }
    if (n === 8) acc = 0;
  }
  draw();
  frames++; fpsT += ms;
  if (fpsT >= 250) {
    el.fps.textContent = Math.round(frames * 1000 / fpsT) + ' fps';
    updateTelemetry();
    frames = 0; fpsT = 0;
  }
  requestAnimationFrame(loop);
}

el.speed.addEventListener('input', () => { el.speedOut.textContent = parseFloat(el.speed.value).toFixed(1); });
el.scene.addEventListener('change', () => buildScene(el.scene.value));
el.reset.addEventListener('click', () => buildScene(el.scene.value));
el.pause.addEventListener('click', () => {
  running = !running;
  el.pause.textContent = running ? 'Pause' : 'Play';
});

function pos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = pos(e); drag.active = true; drag.x0 = drag.x1 = p.x; drag.y0 = drag.y1 = p.y;
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag.active) return; const p = pos(e); drag.x1 = p.x; drag.y1 = p.y;
});
canvas.addEventListener('pointerup', () => {
  if (!drag.active) return;
  drag.active = false;
  const vx = (drag.x0 - drag.x1) * 0.1;
  const vy = (drag.y0 - drag.y1) * 0.1;
  addBody(drag.x0, drag.y0, vx, vy, 30, Math.random() * 360);
});

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(() => { resize(); buildScene(el.scene.value); }); });

resize();
buildScene('solar');
requestAnimationFrame(loop);
