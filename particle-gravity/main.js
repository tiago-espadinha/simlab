'use strict';

// Particle gravity sandbox: particles are pulled toward user-placed attractors
// using a softened inverse-square law. Fixed timestep, DPR-correct canvas.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  particles: document.getElementById('particles'),
  particlesOut: document.getElementById('particles-out'),
  grav: document.getElementById('grav'),
  drag: document.getElementById('drag'),
  trails: document.getElementById('trails'),
  reset: document.getElementById('reset'),
  respawn: document.getElementById('respawn'),
  fps: document.getElementById('fps'),
};

const tel = {
  count: document.getElementById('tel-count'),
  att: document.getElementById('tel-att'),
  speed: document.getElementById('tel-speed'),
  cap: document.getElementById('tel-cap'),
};

let W = 0, H = 0, dpr = 1;
let particles = [];
let attractors = [];
const mouse = { x: -1, y: -1, active: false };

const rnd = (a, b) => a + Math.random() * (b - a);

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
}

function makeParticle() {
  return {
    x: rnd(0, W), y: rnd(0, H),
    vx: rnd(-20, 20) * dpr, vy: rnd(-20, 20) * dpr,
    hue: rnd(180, 320),
  };
}

function setCount(n) {
  n = Math.max(0, n | 0);
  while (particles.length < n) particles.push(makeParticle());
  if (particles.length > n) particles.length = n;
}

function step(dt) {
  const G = parseFloat(el.grav.value) * dpr * dpr;
  const drag = parseFloat(el.drag.value);
  const soft = 400 * dpr * dpr; // softening^2 avoids singularities
  const maxV = 900 * dpr;

  for (const p of particles) {
    let ax = 0, ay = 0;
    for (const a of attractors) {
      const dx = a.x - p.x, dy = a.y - p.y;
      const d2 = dx * dx + dy * dy + soft;
      const inv = 1 / Math.sqrt(d2);
      const f = (G * a.sign) / d2;
      ax += dx * inv * f;
      ay += dy * inv * f;
    }
    if (mouse.active) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const d2 = dx * dx + dy * dy + soft;
      const inv = 1 / Math.sqrt(d2);
      const f = (G * 0.6) / d2;
      ax += dx * inv * f;
      ay += dy * inv * f;
    }

    p.vx += ax * dt;
    p.vy += ay * dt;
    p.vx *= (1 - drag);
    p.vy *= (1 - drag);

    const s = Math.hypot(p.vx, p.vy);
    if (s > maxV) { p.vx = p.vx / s * maxV; p.vy = p.vy / s * maxV; }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
    else if (p.x > W) { p.x = W; p.vx *= -0.5; }
    if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
    else if (p.y > H) { p.y = H; p.vy *= -0.5; }
  }
}

function draw() {
  if (el.trails.checked) {
    ctx.fillStyle = 'rgba(10, 10, 18, 0.16)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
  }

  const r = 1.3 * dpr;
  for (const p of particles) {
    const s = Math.hypot(p.vx, p.vy);
    const light = 45 + Math.min(s / (6 * dpr), 40);
    ctx.fillStyle = `hsla(${p.hue}, 85%, ${light}%, 0.85)`;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }

  for (const a of attractors) {
    ctx.beginPath();
    ctx.arc(a.x, a.y, 6 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = a.sign > 0 ? 'rgba(110,231,208,0.9)' : 'rgba(255,120,150,0.9)';
    ctx.fill();
  }
}

let last = performance.now(), acc = 0, fpsT = 0, frames = 0;
const DT = 1 / 60;

function updateTelemetry() {
  const n = particles.length;
  if (tel.count) tel.count.textContent = n;
  let pos = 0, neg = 0;
  for (const a of attractors) { if (a.sign > 0) pos++; else neg++; }
  if (tel.att) tel.att.textContent = '+' + pos + ' / \u2212' + neg;
  if (!n) return;
  const capR2 = (80 * dpr) * (80 * dpr);
  let sSpeed = 0, cap = 0;
  for (const p of particles) {
    sSpeed += Math.hypot(p.vx, p.vy);
    for (const a of attractors) {
      const dx = a.x - p.x, dy = a.y - p.y;
      if (dx * dx + dy * dy < capR2) { cap++; break; }
    }
  }
  if (tel.speed) tel.speed.textContent = Math.round((sSpeed / n) / dpr) + ' px/s';
  if (tel.cap) tel.cap.textContent = Math.round(cap / n * 100) + '%';
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
  if (fpsT >= 250) {
    el.fps.textContent = Math.round(frames * 1000 / fpsT) + ' fps';
    updateTelemetry();
    frames = 0; fpsT = 0;
  }
  requestAnimationFrame(loop);
}

el.particles.addEventListener('input', () => {
  el.particlesOut.textContent = el.particles.value;
  setCount(parseInt(el.particles.value, 10));
});
el.reset.addEventListener('click', () => { attractors = []; });
el.respawn.addEventListener('click', () => { setCount(0); setCount(parseInt(el.particles.value, 10)); });

function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
}

canvas.addEventListener('click', (e) => {
  const p = canvasPos(e);
  attractors.push({ x: p.x, y: p.y, sign: 1 });
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const p = canvasPos(e);
  attractors.push({ x: p.x, y: p.y, sign: -1 });
});
canvas.addEventListener('pointermove', (e) => {
  const p = canvasPos(e); mouse.x = p.x; mouse.y = p.y; mouse.active = true;
});
canvas.addEventListener('pointerleave', () => { mouse.active = false; });

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(resize); });

resize();
attractors.push({ x: W / 2, y: H / 2, sign: 1 });
setCount(parseInt(el.particles.value, 10));
requestAnimationFrame(loop);
