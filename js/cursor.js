/* ---------------------------------------------------------------------------
   The cursor: a drop of coffee.

   It springs toward the pointer rather than snapping to it, and squashes
   along its direction of travel — fast flicks stretch it into a streak,
   stopping lets it round back out. Behind it, mug rings: thin circles
   stamped on a timer that widen and fade, like a cup set down on paper.

   Over anything clickable the drop opens into a rim the size of a cup mouth,
   so "you can click this" reads as the drop becoming a cup.

   Drawn on one canvas so the shapes can be organic, and so the whole thing
   costs one clear plus a handful of paths per frame instead of a DOM write
   per trail element.
--------------------------------------------------------------------------- */

import { INK } from './theme.js';
import { fitCanvas, REDUCED, COARSE } from './motion.js';

const LOCK_SEL = 'a, button, input, textarea, select, [data-cursor="hover"]';

export function initCursor() {
  if (REDUCED || COARSE) return null;

  const cv = document.createElement('canvas');
  cv.className = 'cur-canvas';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);

  const ctx = cv.getContext('2d');
  if (!ctx) { cv.remove(); return null; }

  document.body.classList.add('cursor-none');

  // fitCanvas keeps the backing store in step with the element's own CSS box
  // and re-fits on resize and on devicePixelRatio changes.
  const size = fitCanvas(cv, ctx);

  let tx = -300, ty = -300;           // where the pointer is
  let x = tx, y = ty, px = x, py = y; // where the drop is
  let hovering = false;
  let open = 0;
  const rings = [];
  let lastRing = 0;

  addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    hovering = e.target instanceof Element && e.target.closest(LOCK_SEL) !== null;
  }, { passive: true });

  // Pointer leaving the window should take the drop with it, otherwise it
  // sits frozen at the edge until you come back.
  addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) { tx = -300; ty = -300; }
  }, { passive: true });

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  return function step() {
    const { w, h } = size();

    // Spring, not a snap. This is the "follows you throughout" part — it is
    // still catching up for several frames after the pointer stops.
    x += (tx - x) * 0.19;
    y += (ty - y) * 0.19;

    const vx = x - px, vy = y - py;
    px = x; py = y;

    const speed = Math.hypot(vx, vy);
    const angle = Math.atan2(vy, vx);
    const stretch = Math.min(speed / 24, 1.2);
    open += ((hovering ? 1 : 0) - open) * 0.15;

    const now = performance.now();
    if (speed > 1.1 && now - lastRing > 85) {
      rings.push({ x, y, t: now, r: 10 + speed * 0.4 });
      lastRing = now;
    }
    while (rings.length && now - rings[0].t > 1400) rings.shift();

    ctx.clearRect(0, 0, w, h);

    for (const ring of rings) {
      const age = (now - ring.t) / 1400;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r * (1 + age * 0.85), 0, Math.PI * 2);
      ctx.strokeStyle = rgba(INK.accent, (1 - age) * 0.5);
      ctx.lineWidth = 2 * (1 - age) + 0.4;
      ctx.stroke();
    }

    const base = 8.5 + open * 12;
    const rx = base * (1 + stretch * 0.85);
    const ry = base / (1 + stretch * 0.45);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(open > 0.5 ? INK.shock : INK.ink, (1 - open) * 0.95);
    ctx.fill();
    ctx.strokeStyle = rgba(open > 0.5 ? INK.shock : INK.ink, 0.5 + open * 0.5);
    ctx.lineWidth = 1.4 + open * 2.4;
    ctx.stroke();
    if (open < 0.6) {
      ctx.beginPath();
      ctx.ellipse(-rx * 0.18, 0, rx * 0.26, ry * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(INK.bg, 0.45 * (1 - open));
      ctx.fill();
    }
    ctx.restore();
  };
}
