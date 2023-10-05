'use strict';

// Harmonograph: sum of damped sinusoids for x and y, traced progressively.
// A pure-Lissajous mode drops the damping and extra pendulums.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  fx: document.getElementById('fx'),
  fxOut: document.getElementById('fx-out'),
  fy: document.getElementById('fy'),
  fyOut: document.getElementById('fy-out'),
  phase: document.getElementById('phase'),
  damp: document.getElementById('damp'),
  mode: document.getElementById('mode'),
  rainbow: document.getElementById('rainbow'),
  draw: document.getElementById('draw'),
  random: document.getElementById('random'),
};

const tel = {
  ratio: document.getElementById('tel-ratio'),
  decay: document.getElementById('tel-decay'),
  elapsed: document.getElementById('tel-elapsed'),
  closure: document.getElementById('tel-closure'),
};

let W = 0, H = 0, dpr = 1;
let params = null;
let t = 0;
let animId = 0;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
  begin();
}

function buildParams() {
  const fx = parseFloat(el.fx.value);
  const fy = parseFloat(el.fy.value);
  const phase = parseFloat(el.phase.value);
  const d = el.mode.value === 'lissajous' ? 0 : parseFloat(el.damp.value);
  const A = Math.min(W, H) * 0.32;
  return {
    // x(t) = A1 sin(fx t + p1) e^-d t + A2 sin(fx2 t + p2) e^-d t
    x: [
      { A, f: fx, p: phase, d },
      { A: A * 0.5, f: fx * 1.001 + 0.5, p: phase * 0.5, d: d * 1.2 },
    ],
    y: [
      { A, f: fy, p: 0, d },
      { A: A * 0.5, f: fy * 0.999 + 0.5, p: phase, d: d * 1.2 },
    ],
    lissajous: el.mode.value === 'lissajous',
    fxBase: fx,
    fyBase: fy,
    damp: d,
  };
}

function evalSum(terms, tt) {
  let v = 0;
  for (const s of terms) v += s.A * Math.sin(s.f * tt + s.p) * Math.exp(-s.d * tt);
  return v;
}

function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }

function updateTelemetry() {
  if (!params) return;
  const fx = params.fxBase, fy = params.fyBase;
  const A = Math.round(fx * 100), B = Math.round(fy * 100);
  const g = gcd(A, B) || 1;
  const ra = A / g, rb = B / g;
  const rational = ra <= 99 && rb <= 99;
  if (tel.ratio) tel.ratio.textContent = rational ? ra + ':' + rb : (fx / fy).toFixed(3) + ':1';
  const env = Math.exp(-params.damp * t);
  if (tel.decay) tel.decay.textContent = Math.round(env * 100) + '%';
  if (tel.elapsed) tel.elapsed.textContent = t.toFixed(1);
  if (tel.closure) tel.closure.textContent =
    params.lissajous ? (rational ? 'Closes' : 'Open') : 'Damped';
}

function begin() {
  cancelAnimationFrame(animId);
  params = buildParams();
  t = 0;
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  animId = requestAnimationFrame(trace);
}

function trace() {
  const cx = W / 2, cy = H / 2;
  const step = 0.02;
  const perFrame = params.lissajous ? 300 : 220;
  const maxT = params.lissajous ? Math.PI * 2 * 60 : 900;

  ctx.lineWidth = 1.2 * dpr;
  ctx.lineCap = 'round';

  let prevX = cx + evalSum(params.x, t);
  let prevY = cy + evalSum(params.y, t);

  for (let i = 0; i < perFrame && t < maxT; i++) {
    t += step;
    const x = cx + evalSum(params.x, t);
    const y = cy + evalSum(params.y, t);
    if (el.rainbow.checked) {
      const hue = (t * 12) % 360;
      ctx.strokeStyle = `hsla(${hue}, 80%, 62%, 0.75)`;
    } else {
      ctx.strokeStyle = 'rgba(255, 82, 82, 0.6)';
    }
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    prevX = x; prevY = y;
  }

  updateTelemetry();

  if (t < maxT) animId = requestAnimationFrame(trace);
}

el.fx.addEventListener('input', () => { el.fxOut.textContent = parseFloat(el.fx.value).toFixed(2); begin(); });
el.fy.addEventListener('input', () => { el.fyOut.textContent = parseFloat(el.fy.value).toFixed(2); begin(); });
el.phase.addEventListener('input', begin);
el.damp.addEventListener('input', begin);
el.mode.addEventListener('change', begin);
el.rainbow.addEventListener('change', begin);
el.draw.addEventListener('click', begin);
el.random.addEventListener('click', () => {
  el.fx.value = (1 + Math.random() * 7).toFixed(2);
  el.fy.value = (1 + Math.random() * 7).toFixed(2);
  el.phase.value = (Math.random() * 6.28).toFixed(2);
  el.fxOut.textContent = parseFloat(el.fx.value).toFixed(2);
  el.fyOut.textContent = parseFloat(el.fy.value).toFixed(2);
  begin();
});

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(resize); });

resize();
