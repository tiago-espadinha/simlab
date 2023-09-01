'use strict';

// Escape-time Mandelbrot / Julia renderer with smooth colouring.
// Renders on demand (pan/zoom/param change) rather than every frame.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const el = {
  set: document.getElementById('set'),
  iter: document.getElementById('iter'),
  iterOut: document.getElementById('iter-out'),
  palette: document.getElementById('palette'),
  cre: document.getElementById('cre'),
  cim: document.getElementById('cim'),
  juliaRow: document.getElementById('julia-row'),
  reset: document.getElementById('reset'),
  zoom: document.getElementById('zoom'),
  ms: document.getElementById('ms'),
};

const tel = {
  center: document.getElementById('tel-center'),
  scale: document.getElementById('tel-scale'),
  inset: document.getElementById('tel-inset'),
  meaniter: document.getElementById('tel-meaniter'),
};

let W = 0, H = 0, dpr = 1;
let img;
const view = { cx: -0.5, cy: 0, scale: 3 }; // scale = width in complex plane
const drag = { active: false, x: 0, y: 0 };
let needsRender = true;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  // Cap internal resolution for performance.
  const maxW = 900;
  const scaleDown = Math.min(1, maxW / (rect.width * dpr));
  canvas.width = Math.round(rect.width * dpr * scaleDown);
  canvas.height = Math.round(rect.height * dpr * scaleDown);
  canvas.style.height = rect.height + 'px';
  W = canvas.width; H = canvas.height;
  img = ctx.createImageData(W, H);
  needsRender = true;
}

function palette(t, maxIter) {
  const p = el.palette.value;
  if (t >= maxIter) return [8, 8, 14];
  const m = t / maxIter;
  if (p === 'ocean') return [30 + m * 40, 80 + m * 150, 140 + m * 115];
  if (p === 'mono') { const c = Math.pow(m, 0.5) * 255; return [c, c, c]; }
  if (p === 'psy') {
    return [
      Math.sin(m * 20) * 127 + 128,
      Math.sin(m * 20 + 2) * 127 + 128,
      Math.sin(m * 20 + 4) * 127 + 128,
    ];
  }
  // fire
  return [Math.min(255, m * 3 * 255), Math.min(255, m * m * 3 * 255), Math.min(255, m * m * m * 4 * 255)];
}

function render() {
  const t0 = performance.now();
  const maxIter = parseInt(el.iter.value, 10);
  const isJulia = el.set.value === 'julia';
  const jcre = parseFloat(el.cre.value);
  const jcim = parseFloat(el.cim.value);
  const aspect = H / W;
  const halfW = view.scale / 2;
  const halfH = halfW * aspect;
  const data = img.data;

  let interior = 0, escaped = 0, iterSum = 0;

  for (let py = 0; py < H; py++) {
    const y0 = view.cy + (py / H - 0.5) * 2 * halfH;
    for (let px = 0; px < W; px++) {
      const x0 = view.cx + (px / W - 0.5) * 2 * halfW;
      let x, y, cx, cy;
      if (isJulia) { x = x0; y = y0; cx = jcre; cy = jcim; }
      else { x = 0; y = 0; cx = x0; cy = y0; }

      let iter = 0;
      let x2 = x * x, y2 = y * y;
      while (x2 + y2 <= 4 && iter < maxIter) {
        y = 2 * x * y + cy;
        x = x2 - y2 + cx;
        x2 = x * x; y2 = y * y;
        iter++;
      }
      let t = iter;
      if (iter < maxIter) {
        // smooth iteration count
        const logZn = Math.log(x2 + y2) / 2;
        const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
        t = iter + 1 - nu;
        escaped++; iterSum += iter;
      } else {
        interior++;
      }
      const [r, g, b] = palette(t, maxIter);
      const j = (py * W + px) * 4;
      data[j] = r; data[j + 1] = g; data[j + 2] = b; data[j + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  el.ms.textContent = Math.round(performance.now() - t0) + ' ms';
  el.zoom.textContent = (3 / view.scale).toFixed(1) + '\u00d7';

  const total = W * H || 1;
  if (tel.center) tel.center.textContent = view.cx.toFixed(4) + ', ' + view.cy.toFixed(4);
  if (tel.scale) tel.scale.textContent = (view.scale / W).toExponential(1);
  if (tel.inset) tel.inset.textContent = Math.round(interior / total * 100) + '%';
  if (tel.meaniter) tel.meaniter.textContent = escaped ? (iterSum / escaped).toFixed(0) : '0';
}

function loop() {
  if (needsRender) { render(); needsRender = false; }
  requestAnimationFrame(loop);
}

function updateJuliaVisibility() {
  el.juliaRow.style.display = el.set.value === 'julia' ? 'flex' : 'none';
}

el.set.addEventListener('change', () => {
  if (el.set.value === 'julia') { view.cx = 0; view.cy = 0; view.scale = 3; }
  else { view.cx = -0.5; view.cy = 0; view.scale = 3; }
  updateJuliaVisibility();
  needsRender = true;
});
el.iter.addEventListener('input', () => { el.iterOut.textContent = el.iter.value; needsRender = true; });
el.palette.addEventListener('change', () => { needsRender = true; });
el.cre.addEventListener('input', () => { needsRender = true; });
el.cim.addEventListener('input', () => { needsRender = true; });
el.reset.addEventListener('click', () => {
  if (el.set.value === 'julia') { view.cx = 0; view.cy = 0; view.scale = 3; }
  else { view.cx = -0.5; view.cy = 0; view.scale = 3; }
  needsRender = true;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / rect.width - 0.5;
  const my = (e.clientY - rect.top) / rect.height - 0.5;
  const aspect = H / W;
  const factor = e.deltaY < 0 ? 0.8 : 1.25;
  // zoom toward cursor
  view.cx += mx * view.scale * (1 - factor);
  view.cy += my * view.scale * aspect * (1 - factor);
  view.scale *= factor;
  needsRender = true;
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => { drag.active = true; drag.x = e.clientX; drag.y = e.clientY; });
canvas.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  const rect = canvas.getBoundingClientRect();
  const aspect = H / W;
  const dx = (e.clientX - drag.x) / rect.width;
  const dy = (e.clientY - drag.y) / rect.height;
  view.cx -= dx * view.scale;
  view.cy -= dy * view.scale * aspect;
  drag.x = e.clientX; drag.y = e.clientY;
  needsRender = true;
});
window.addEventListener('pointerup', () => { drag.active = false; });
canvas.addEventListener('dblclick', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / rect.width - 0.5;
  const my = (e.clientY - rect.top) / rect.height - 0.5;
  const aspect = H / W;
  view.cx += mx * view.scale;
  view.cy += my * view.scale * aspect;
  view.scale *= 0.5;
  needsRender = true;
});

let rraf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(resize); });

resize();
updateJuliaVisibility();
requestAnimationFrame(loop);
