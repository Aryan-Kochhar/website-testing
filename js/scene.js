/* ---------------------------------------------------------------------------
   Hero scene: a wireframe cup, a saucer, and a drift of beans.

   Hand-rolled projection rather than a 3D library — the whole renderer is
   under a hundred lines and there is no CDN that can fail, no 600KB download,
   and nothing to keep in step with a framework.

   Wireframe because that is what reads at these palettes. A shaded brown
   solid on an espresso ground is a brown blob; an outline drawing is legible
   on all five roasts and matches the hard outlines in the CSS.

   Drawn three times with a few pixels of offset — risograph misregistration,
   the print-shop cousin of the sticker shadows elsewhere on the page.

   The cup drains as you scroll: the brew surface drops from the rim to the
   foot across the length of the page. Scroll-linked motion that actually
   means something beats another thing that merely spins.
--------------------------------------------------------------------------- */

import { INK } from './theme.js';
import { fitCanvas, REDUCED } from './motion.js';

const N = 26;                      // segments per ring
const RIM_Y = 0.52, RIM_R = 0.66;
const FOOT_Y = -0.50, FOOT_R = 0.40;

/* Radius of the cup wall at a given height, so the brew surface always
   touches the sides as it falls. */
const radiusAt = (y) =>
  FOOT_R + ((y - FOOT_Y) / (RIM_Y - FOOT_Y)) * (RIM_R - FOOT_R);

function ring(y, r, n = N, squash = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r * squash]);
  }
  return pts;
}

function buildCup() {
  const pts = [], edges = [];
  const push = (arr) => { const b = pts.length; arr.forEach((p) => pts.push(p)); return b; };
  const loop = (b, n = N) => { for (let i = 0; i < n; i++) edges.push([b + i, b + (i + 1) % n]); };

  const rim   = push(ring(RIM_Y, RIM_R));  loop(rim);
  const waist = push(ring(0.02, radiusAt(0.02))); loop(waist);
  const foot  = push(ring(FOOT_Y, FOOT_R)); loop(foot);

  for (let i = 0; i < N; i += 2) {
    edges.push([rim + i, waist + i]);
    edges.push([waist + i, foot + i]);
  }

  const s1 = push(ring(-0.58, 1.02)); loop(s1);
  const s2 = push(ring(-0.55, 0.72)); loop(s2);
  for (let i = 0; i < N; i += 2) edges.push([s1 + i, s2 + i]);

  const hBase = pts.length, HN = 12;
  for (let i = 0; i <= HN; i++) {
    const a = -Math.PI / 2 + (i / HN) * Math.PI;
    pts.push([0.62 + Math.cos(a) * 0.30, 0.16 + Math.sin(a) * 0.30, 0]);
  }
  for (let i = 0; i < HN; i++) edges.push([hBase + i, hBase + i + 1]);

  return { pts, edges };
}

function buildBean(r) {
  const pts = [], edges = [];
  const M = 10;
  const push = (arr) => { const b = pts.length; arr.forEach((p) => pts.push(p)); return b; };
  const loop = (b) => { for (let i = 0; i < M; i++) edges.push([b + i, b + (i + 1) % M]); };

  const mid = push(ring(0, r, M, 0.62));
  const top = push(ring(0, r * 0.55, M, 0.62).map((p) => [p[0], r * 0.5, p[2]]));
  const bot = push(ring(0, r * 0.55, M, 0.62).map((p) => [p[0], -r * 0.5, p[2]]));
  loop(mid); loop(top); loop(bot);
  for (let i = 0; i < M; i += 2) { edges.push([top + i, mid + i]); edges.push([mid + i, bot + i]); }

  const k = pts.length;
  pts.push([0, r * 0.62, 0], [0, -r * 0.62, 0]);
  edges.push([k, k + 1]);
  return { pts, edges };
}

/* The brew surface, rebuilt each frame because its height is scroll-linked.
   26 points and a handful of spokes — cheaper than interpolating a cached
   mesh. */
function brewDisc(drain) {
  const y = RIM_Y - 0.12 - drain * (RIM_Y - 0.12 - (FOOT_Y + 0.04));
  const r = radiusAt(y) - 0.04;
  const pts = ring(y, r);
  const edges = [];
  for (let i = 0; i < N; i++) edges.push([i, (i + 1) % N]);
  for (let i = 0; i < N; i += 4) edges.push([i, (i + N / 2) % N]);
  return { pts, edges };
}

const NOOP = { ok: false, stir() {}, setScroll() {}, step: null };

export function initScene(canvas) {
  if (!canvas || REDUCED) {
    canvas?.classList.add('is-fallback');
    return NOOP;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.classList.add('is-fallback');
    return NOOP;
  }

  const size = fitCanvas(canvas, ctx);
  const cup = buildCup();

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const beans = [];
  for (let i = 0; i < 9; i++) {
    beans.push({
      geo: buildBean(0.13 + rnd() * 0.06),
      pos: [(rnd() - 0.5) * 4.4, (rnd() - 0.5) * 2.8, (rnd() - 0.5) * 2.2],
      spin: [rnd() * 6, rnd() * 6, rnd() * 6],
      rate: 0.3 + rnd() * 0.7,
      hot: i % 3 === 0,
    });
  }

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', (e) => {
    tmx = (e.clientX / innerWidth) * 2 - 1;
    tmy = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  const st = { scroll: 0, stir: 0, spin: 0, spinVel: 0 };

  /* Grab the cup and throw it.

     The canvas sits behind .hero__inner, so a drag that starts on the copy
     hits the copy and never reaches here — only the empty right-hand side is
     grabbable, which is exactly where the cup is. `setPointerCapture` keeps
     the throw alive if the pointer leaves the canvas mid-drag. */
  let dragging = false, grabX = 0, lastDX = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    grabX = e.clientX;
    lastDX = 0;
    st.spinVel = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-grabbed');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    lastDX = (e.clientX - grabX) * 0.012;
    grabX = e.clientX;
    st.spin += lastDX;
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    // Hand the last frame's movement over as momentum.
    st.spinVel = lastDX * 22;
    canvas.releasePointerCapture?.(e.pointerId);
    canvas.classList.remove('is-grabbed');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const rot = (p, rx, ry) => {
    let [x, y, z] = p;
    let c = Math.cos(ry), s = Math.sin(ry);
    [x, z] = [x * c - z * s, x * s + z * c];
    c = Math.cos(rx); s = Math.sin(rx);
    [y, z] = [y * c - z * s, y * s + z * c];
    return [x, y, z];
  };

  const FOV = 2.6;
  const project = (p, scale, ox, oy) => {
    const k = (FOV / (p[2] + 4.2)) * scale;
    return [ox + p[0] * k, oy - p[1] * k];
  };

  function draw(shape, rx, ry, scale, ox, oy, colour, width, dx = 0, dy = 0) {
    const proj = shape.pts.map((p) => project(rot(p, rx, ry), scale, ox, oy));
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [a, b] of shape.edges) {
      ctx.moveTo(proj[a][0] + dx, proj[a][1] + dy);
      ctx.lineTo(proj[b][0] + dx, proj[b][1] + dy);
    }
    ctx.stroke();
  }

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const t0 = performance.now();
  let last = t0;

  function step() {
    const { w: W, h: H } = size();
    if (!W || !H) return;

    const now = performance.now();
    const dt = Math.min(now - last, 60) / 1000;
    last = now;
    const t = (now - t0) / 1000;

    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;
    st.stir *= Math.pow(0.3, dt);

    // Momentum from a throw, bleeding off against an imaginary saucer.
    if (!dragging) {
      st.spin += st.spinVel * dt;
      st.spinVel *= Math.pow(0.12, dt);
      if (Math.abs(st.spinVel) < 0.001) st.spinVel = 0;
    }

    ctx.clearRect(0, 0, W, H);

    // Beside the copy where there is room; below it when there isn't.
    const wide = W > 1000;
    const scale = Math.min(W, H) * (wide ? 0.40 : 0.30);
    const ox = W * (wide ? 0.73 : 0.5);
    const oy = H * (wide ? 0.5 : 0.78);

    const ry = t * 0.32 + st.scroll * 5.2 + st.stir * 2.4 + st.spin + mx * 0.5;
    const rx = -0.22 + my * 0.28 + st.scroll * 0.6;

    for (const b of beans) {
      const shifted = {
        pts: b.geo.pts.map((p) => [
          p[0] + b.pos[0],
          p[1] + b.pos[1] + Math.sin(t * b.rate + b.spin[0]) * 0.18,
          p[2] + b.pos[2],
        ]),
        edges: b.geo.edges,
      };
      draw(shifted, rx + b.spin[1] + t * b.rate * 0.6, ry + b.spin[2] + t * b.rate,
           scale * 0.9, ox, oy, rgba(b.hot ? INK.shock : INK.ink, 0.65), 1.2);
    }

    // three plates, deliberately misregistered
    draw(cup, rx, ry, scale, ox, oy, rgba(INK.accent, 0.9), 2.2,  4,  4);
    draw(cup, rx, ry, scale, ox, oy, rgba(INK.shock,  0.7), 1.6, -3, -3);
    draw(cup, rx, ry, scale, ox, oy, rgba(INK.ink,    0.8), 1.5,  0,  0);

    // the coffee itself, falling as the page scrolls
    draw(brewDisc(st.scroll), rx, ry, scale, ox, oy, rgba(INK.shock, 0.8), 1.6);
  }

  return {
    ok: true,
    step,
    stir(amount = 1) { st.stir = Math.min(1.6, st.stir + amount); },
    setScroll(v) { st.scroll = Math.max(0, Math.min(1, v)); },
  };
}
