// Drop & Fill — github.com/veraetogrex-portfolio · zero dependencies
// Drop a brief on the zone: the page unfolds, a scanner reads it,
// and every value tears off as a chip and flies into its field.

const app    = document.querySelector('#df');
const file   = app.querySelector('.df-file');
const zone   = app.querySelector('.df-zone');
const page   = app.querySelector('.df-page');
const scan   = app.querySelector('.df-scan');
const stamp  = app.querySelector('.df-stamp');
const form   = app.querySelector('.df-form');
const status = app.querySelector('.df-status');
const steps  = [...app.querySelectorAll('.df-steps li')];
const flash  = document.querySelector('.df-flash');

// what the reader "finds" in the brief; budget appears twice, so it needs a check
const FOUND = {
  client: 'Northwind Labs', name: 'NWD · Dock redesign', budget: '$48,000',
  deadline: 'Dec 12, 2026', owner: 'Sana Okafor',
};
const CONFLICT = 'budget';

let phase = 'idle', drag = null, fx = 0, fy = 0;   // file offset from its corner

const ease = { io: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2, in: t => t ** 3, out: t => 1 - (1 - t) ** 3,
               back: t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2, linear: t => t };
const animate = (ms, fn, e = ease.io) => new Promise(done => {
  const t0 = performance.now();
  const step = now => { const p = Math.min(1, (now - t0) / ms); fn(e(p)); p < 1 ? requestAnimationFrame(step) : done(); };
  requestAnimationFrame(step);
});
const wait = ms => new Promise(r => setTimeout(r, ms));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = t => Math.min(1, Math.max(0, t));
// boxes and pointer in app pixels, so the maths still works when the app is zoomed
const scale = () => app.getBoundingClientRect().width / app.offsetWidth;
const box = el => { const a = app.getBoundingClientRect(), r = el.getBoundingClientRect(), k = scale();
  return { x: (r.left - a.left) / k, y: (r.top - a.top) / k, w: r.width / k, h: r.height / k }; };
const point = e => { const a = app.getBoundingClientRect(), k = scale(); return { x: (e.clientX - a.left) / k, y: (e.clientY - a.top) / k }; };
const over = (p, el) => { const b = box(el); return p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h; };
const moveFile = () => file.style.transform = `translate(${fx}px, ${fy}px)`;

// 1 · drag the file; the zone lights up while the pointer is over it
file.addEventListener('pointerdown', e => {
  if (phase !== 'idle') return;
  file.setPointerCapture(e.pointerId);
  const p = point(e);
  drag = { x: p.x - fx, y: p.y - fy };
  file.classList.add('is-drag');
});
file.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = point(e);
  fx = p.x - drag.x; fy = p.y - drag.y; moveFile();
  zone.classList.toggle('is-hot', over(p, zone));
});
file.addEventListener('pointerup', e => {
  if (!drag) return;
  drag = null; file.classList.remove('is-drag');
  over(point(e), zone) ? importBrief() : springHome();
});

async function importBrief() {
  phase = 'import';
  zone.classList.remove('is-hot'); zone.classList.add('has-file');

  // 2 · the file unfolds into the page: FLIP from the thumbnail's box to the page's
  const from = box(file.querySelector('.df-thumb')), to = box(page);
  const rows = [...page.querySelectorAll('.df-row')];
  file.style.opacity = 0; page.style.opacity = 1;
  await animate(560, t => {
    page.style.transform = `translate(${lerp(from.x - to.x, 0, t)}px, ${lerp(from.y - to.y, 0, t)}px)
      scale(${lerp(from.w / to.w, 1, t)}, ${lerp(from.h / to.h, 1, t)}) rotate(${-5 * (1 - t)}deg)`;
    rows.forEach((r, i) => r.style.opacity = clamp((t - .35 - i * .07) / .35));
  }, ease.back);

  // 3 · a scanner beam sweeps down; every value it passes gets HUD brackets
  const marks = [...page.querySelectorAll('.df-val')]
    .map(v => ({ v, y: box(v).y + box(v).h / 2 - to.y }));
  status.textContent = 'Reading brief…'; status.classList.add('is-ai');
  scan.style.opacity = 1;
  await animate(800, t => {
    const y = -120 + (to.h + 40) * t;
    scan.style.transform = `translateY(${y}px)`;
    for (const m of marks) if (y + 118 > m.y) {
      m.v.classList.add('is-hit');
      if (m.v.dataset.f === CONFLICT || m.v.dataset.alt) m.v.classList.add('is-warn');
    }
  }, ease.linear);
  animate(200, t => scan.style.opacity = 1 - t);

  // 4 · values tear off as chips and fly on arcs into their fields, 120 ms apart
  status.textContent = 'Filling 5 fields…';
  await Promise.all(Object.keys(FOUND).map((name, i) => fly(name, i)));
  status.textContent = 'Draft · 5 of 5 filled'; status.classList.remove('is-ai');

  // 5 · the stamp slams down: the screen shakes and an Ion flash washes over it
  await wait(160);
  await animate(240, t => {
    stamp.style.opacity = Math.min(1, t * 2.5);
    stamp.style.transform = `rotate(-11deg) scale(${lerp(2.4, 1, t)})`;
  }, ease.in);
  slam();
  steps[0].className = 'is-done';
  await wait(180);
  steps[1].className = 'is-on';
  app.querySelector('.df-clear').classList.add('is-on');
  phase = 'done';
}

async function fly(name, i) {
  await wait(i * 120);
  const src = page.querySelector(`[data-f="${name}"]`), input = form.elements[name];
  const a = box(src), b = box(input);
  const chip = document.createElement('div');
  chip.className = name === CONFLICT ? 'df-chip is-warn' : 'df-chip';
  chip.textContent = FOUND[name];
  app.append(chip);
  const h = chip.offsetHeight;
  const x0 = a.x - 14, y0 = a.y + a.h / 2 - h / 2, x1 = b.x + 8, y1 = b.y + b.h / 2 - h / 2;
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 130 - (i % 2) * 30;   // control point of the arc
  src.classList.add('is-lifted');
  await animate(640, t => {
    const u = 1 - t;                                                      // quadratic Bézier
    const x = u * u * x0 + 2 * u * t * mx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * my + t * t * y1;
    const lift = Math.sin(Math.PI * t);                                   // 0 → 1 → 0 mid-flight
    chip.style.transform = `translate(${x}px, ${y}px) scale(${1 + .12 * lift}) rotate(${-6 * lift}deg)`;
    chip.style.opacity = t > .82 ? (1 - t) / .18 : 1;
  });
  chip.remove();
  const field = input.closest('.df-field');
  field.classList.add('is-flash');
  for (const ch of FOUND[name]) { input.value += ch; await wait(22); }   // the value types itself in
  field.classList.replace('is-flash', name === CONFLICT ? 'is-warn' : 'is-good');
}

function slam() {
  const s = box(stamp), k = scale(), a = app.getBoundingClientRect();
  flash.style.setProperty('--x', a.left + (s.x + s.w / 2) * k + 'px');
  flash.style.setProperty('--y', a.top + (s.y + s.h / 2) * k + 'px');
  animate(700, t => flash.style.opacity = t < .1 ? t / .1 : (1 - t) / .9, ease.linear);
  animate(420, t => {
    const amp = (1 - t) * 14;
    app.style.translate = `${Math.sin(t * 46) * amp * .5}px ${Math.sin(t * 38) * amp}px`;
  }, ease.linear).then(() => app.style.translate = '');
}

// ── the miss, the keyboard and the budget check ─────────
function springHome() {
  const x0 = fx, y0 = fy;
  zone.classList.remove('is-hot');
  animate(520, t => { fx = x0 * (1 - t); fy = y0 * (1 - t); moveFile(); }, ease.back);
}
file.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && phase === 'idle') { e.preventDefault(); importBrief(); }
});

const budget = form.elements.budget.closest('.df-field');
const toggleMenu = () => budget.classList.toggle('is-open');
budget.querySelector('.df-check').addEventListener('click', toggleMenu);
form.elements.budget.addEventListener('click', () => budget.classList.contains('is-warn') && toggleMenu());
budget.querySelector('.df-menu').addEventListener('click', e => {
  const option = e.target.closest('button'); if (!option) return;
  form.elements.budget.value = option.dataset.v;
  budget.classList.remove('is-warn', 'is-open'); budget.classList.add('is-good');
  page.querySelectorAll('.is-warn').forEach(v => v.classList.remove('is-warn'));
  status.textContent = 'Draft · ready for review';
});
addEventListener('pointerdown', e => { if (!budget.contains(e.target)) budget.classList.remove('is-open'); });

app.querySelector('.df-clear').addEventListener('click', () => {
  phase = 'idle'; fx = fy = 0; moveFile(); file.style.opacity = '';
  zone.classList.remove('has-file');
  page.style.opacity = 0; page.style.transform = '';
  page.querySelectorAll('.df-row').forEach(r => r.style.opacity = '');
  page.querySelectorAll('.df-val').forEach(v => v.className = 'df-val');
  stamp.style.opacity = 0; stamp.style.transform = '';
  form.querySelectorAll('.df-field').forEach(f => f.className = 'df-field');
  form.querySelectorAll('input').forEach(i => i.value = '');
  steps.forEach((s, i) => s.className = i ? '' : 'is-on');
  status.textContent = 'Draft · 0 of 5 filled';
  app.querySelector('.df-clear').classList.remove('is-on');
});
