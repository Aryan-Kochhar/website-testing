/* ---------------------------------------------------------------------------
   The brew map: every project, every tool, and the lines between them.

   A bipartite graph — projects on one side, tools on the other, an edge
   wherever a project uses a tool — laid out by a small force simulation and
   drawn in the same sticker language as the rest of the page. Drag a label
   and it springs back; fling one and it bounces off the walls; click a tool
   to light up everywhere it shows up; click a project to open it.

   Hand-rolled rather than d3: it is ~24 nodes, the whole simulation is a few
   dozen lines, and it means one less dependency on a site that has none.
   The model is d3's, though — velocity Verlet with alpha cooling, many-body
   repulsion, degree-weighted links — because it is a well-tuned model.

   Labels are boxes, not circles, so collision is resolved as box overlap
   rather than with a radius. A wide label in a circle either overlaps its
   neighbours above and below or sits miles from the ones beside it.
--------------------------------------------------------------------------- */

import { PROJECTS } from './data.js';
import { INK } from './theme.js';
import { fitCanvas, keepObserver, REDUCED, COARSE } from './motion.js';

const DISP = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

const GAP = 10;                 // breathing room kept between labels
const MAX_D2 = 560 * 560;       // repulsion ignored beyond this distance
const VELOCITY_KEEP = 0.6;      // d3's velocityDecay of 0.4
const ALPHA_DECAY = 0.0228;     // ~300 ticks from hot to settled

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/* -------------------------------------------------------------- graph --- */

function buildGraph() {
  const nodes = [];
  const edges = [];
  const byTag = new Map();

  for (const p of PROJECTS) {
    const pn = { id: p.id, kind: 'project', label: p.label || p.name, links: new Set() };
    nodes.push(pn);
    for (const tag of p.tags) {
      let sn = byTag.get(tag);
      if (!sn) {
        sn = { id: `tag:${tag}`, kind: 'skill', label: tag, links: new Set() };
        byTag.set(tag, sn);
        nodes.push(sn);
      }
      edges.push([pn, sn]);
      pn.links.add(sn);
      sn.links.add(pn);
    }
  }
  return { nodes, edges, byTag };
}

export function mapStats() {
  const counts = new Map();
  for (const p of PROJECTS) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
  let top = null, topCount = 0;
  for (const [t, n] of counts) if (n > topCount) { top = t; topCount = n; }
  return { projects: PROJECTS.length, tools: counts.size, top, topCount };
}

/* ---------------------------------------------------------------- map --- */

export function initBrewMap(canvas, { onOpen, caption, hint, list } = {}) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const { nodes, edges, byTag } = buildGraph();
  const N = nodes.length;
  const rnd = seeded(11);

  for (const n of nodes) {
    n.x = 0; n.y = 0; n.vx = 0; n.vy = 0;
    n.w = 0; n.h = 0; n.hw = 0; n.hh = 0;
    n.deg = n.links.size;
    // Projects push harder: they are the big labels and the ones you came for.
    n.q = n.kind === 'project' ? 520 : 240;
    n.phase = rnd() * Math.PI * 2;
    // Tools used more than once say so — "PYTHON · 6" carries the point of
    // the whole map in one glance.
    n.text = n.kind === 'skill'
      ? n.label.toUpperCase() + (n.deg > 1 ? `  ·  ${n.deg}` : '')
      : n.label;
  }

  // Projects drawn and hit-tested above tools.
  const drawOrder = [...nodes.filter((n) => n.kind === 'skill'), ...nodes.filter((n) => n.kind === 'project')];

  // All state is declared before fitCanvas runs, because fitCanvas calls
  // back synchronously and the first callback lays the graph out.
  let W = 0, H = 0;
  let laidOut = false;
  let alpha = 0, alphaTarget = 0;
  let scale = 1;
  let visible = false;
  let bloomed = false;
  let hover = null, pinned = null, dragging = null;
  let press = null, grab = { dx: 0, dy: 0 }, fling = { vx: 0, vy: 0 };

  /* ------------------------------------------------------ measurement --- */

  function fontFor(n) {
    return n.kind === 'project'
      ? `800 ${Math.round(15 * scale)}px ${DISP}`
      : `500 ${Math.round(10 * scale * 10) / 10}px ${MONO}`;
  }

  // Re-measured every frame: the web fonts usually land after the first
  // layout, and Bricolage is a good deal wider than the fallback. If any
  // label grew noticeably, nudge the simulation so it re-separates them.
  function measureAll() {
    let grew = false;
    for (const n of nodes) {
      ctx.font = fontFor(n);
      if ('letterSpacing' in ctx) ctx.letterSpacing = n.kind === 'skill' ? '0.8px' : '-0.3px';
      const tw = ctx.measureText(n.text).width;
      const w = tw + (n.kind === 'project' ? 30 : 18) * scale;
      const h = (n.kind === 'project' ? 36 : 23) * scale;
      if (Math.abs(w - n.w) > 2) grew = true;
      n.w = w; n.h = h; n.hw = w / 2; n.hh = h / 2;
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    if (grew && laidOut) alpha = Math.max(alpha, 0.12);
  }

  const linkLength = () => Math.max(70, Math.min(130, Math.min(W, H) * 0.2));

  /* ------------------------------------------------------- simulation --- */

  function seedPositions() {
    const cx = W / 2, cy = H / 2;
    const projects = nodes.filter((n) => n.kind === 'project');
    projects.forEach((n, i) => {
      const a = (i / projects.length) * Math.PI * 2 - Math.PI / 2;
      n.x = cx + Math.cos(a) * W * 0.32;
      n.y = cy + Math.sin(a) * H * 0.32;
    });
    // Each tool starts at the centroid of the projects that use it, so the
    // shared ones begin in the middle and single-use ones beside their owner.
    for (const n of nodes) {
      if (n.kind !== 'skill') continue;
      let sx = 0, sy = 0;
      for (const p of n.links) { sx += p.x; sy += p.y; }
      n.x = sx / n.deg + (rnd() - 0.5) * 50;
      n.y = sy / n.deg + (rnd() - 0.5) * 50;
    }
  }

  function tick() {
    const cx = W / 2, cy = H / 2;
    const L = linkLength();

    // Many-body repulsion.
    for (let i = 0; i < N; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < N; j++) {
        const b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 > MAX_D2) continue;
        if (d2 < 1) { dx = rnd() - 0.5; dy = rnd() - 0.5; d2 = dx * dx + dy * dy || 0.01; }
        const k = alpha / d2;
        a.vx -= dx * b.q * k; a.vy -= dy * b.q * k;
        b.vx += dx * a.q * k; b.vy += dy * a.q * k;
      }
    }

    // Links: degree-weighted, so a hub like Python is not dragged around by
    // every project that touches it.
    for (const [a, b] of edges) {
      let dx = b.x + b.vx - a.x - a.vx;
      let dy = b.y + b.vy - a.y - a.vy;
      const d = Math.hypot(dx, dy) || 1;
      const l = ((d - L) / d) * alpha / Math.min(a.deg, b.deg);
      dx *= l; dy *= l;
      const bias = a.deg / (a.deg + b.deg);
      b.vx -= dx * bias;       b.vy -= dy * bias;
      a.vx += dx * (1 - bias); a.vy += dy * (1 - bias);
    }

    // Gentle pull to the middle — harder vertically, so the graph spreads
    // to fill a wide box instead of settling into a circle.
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.03 * alpha;
      n.vy += (cy - n.y) * 0.08 * alpha;
    }

    for (const n of nodes) {
      if (n === dragging) { n.vx = 0; n.vy = 0; continue; }
      n.x += (n.vx *= VELOCITY_KEEP);
      n.y += (n.vy *= VELOCITY_KEEP);
    }

    collide();
    contain();
    alpha += (alphaTarget - alpha) * ALPHA_DECAY;
  }

  // Box overlap, resolved along whichever axis overlaps least. A dragged
  // node is immovable, so whatever it is shoved into gets out of the way.
  function collide() {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < N; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < N; j++) {
          const b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const ox = a.hw + b.hw + GAP - Math.abs(dx);
          const oy = a.hh + b.hh + GAP - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          const ma = a === dragging ? 0 : b === dragging ? 1 : 0.5;
          const mb = b === dragging ? 0 : a === dragging ? 1 : 0.5;
          if (ox < oy) {
            const s = Math.sign(dx) || 1;
            a.x -= s * ox * ma; b.x += s * ox * mb;
          } else {
            const s = Math.sign(dy) || 1;
            a.y -= s * oy * ma; b.y += s * oy * mb;
          }
        }
      }
    }
  }

  // Walls. A flung label bounces off at half speed rather than sticking.
  function contain() {
    const m = 8;
    for (const n of nodes) {
      const minX = n.hw + m, maxX = W - n.hw - m;
      const minY = n.hh + m, maxY = H - n.hh - m;
      if (maxX < minX) n.x = W / 2;
      else if (n.x < minX) { n.x = minX; n.vx = Math.abs(n.vx) * 0.5; }
      else if (n.x > maxX) { n.x = maxX; n.vx = -Math.abs(n.vx) * 0.5; }
      if (maxY < minY) n.y = H / 2;
      else if (n.y < minY) { n.y = minY; n.vy = Math.abs(n.vy) * 0.5; }
      else if (n.y > maxY) { n.y = maxY; n.vy = -Math.abs(n.vy) * 0.5; }
    }
  }

  // Run the simulation to rest synchronously. Used for the first layout —
  // so the map is never seen mid-explosion — and as the whole of the motion
  // when the visitor prefers reduced motion.
  function settle(ticks = 320) {
    alpha = 1;
    alphaTarget = 0;
    for (let i = 0; i < ticks; i++) tick();
    alpha = 0;
  }

  /* --------------------------------------------------------- drawing --- */

  const bob = (n, t) => (REDUCED || n === dragging ? 0 : Math.sin(t * 1.3 + n.phase) * 1.6);

  function drawEdge(a, b, t, style) {
    ctx.strokeStyle = style.colour;
    ctx.lineWidth = style.width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + bob(a, t));
    ctx.lineTo(b.x, b.y + bob(b, t));
    ctx.stroke();
  }

  function drawNode(n, t, { dim, hot }) {
    const y = n.y + bob(n, t);
    ctx.globalAlpha = dim ? 0.2 : 1;
    ctx.font = fontFor(n);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = n.kind === 'skill' ? '0.8px' : '-0.3px';

    if (n.kind === 'project') {
      // Same move as the buttons in CSS: the shadow stays put and the face
      // presses 3px into it while held.
      const push = n === dragging ? 3 : 0;
      const x0 = n.x - n.hw, y0 = y - n.hh;
      ctx.fillStyle = rgba(INK.pop, 1);
      ctx.fillRect(x0 + 4, y0 + 4, n.w, n.h);
      ctx.fillStyle = rgba(hot ? INK.shock : INK.accent, 1);
      ctx.fillRect(x0 + push, y0 + push, n.w, n.h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(INK.stamp, 1);
      ctx.strokeRect(x0 + push + 1, y0 + push + 1, n.w - 2, n.h - 2);
      ctx.fillStyle = rgba(hot ? INK.bg : INK.stamp, 1);
      ctx.fillText(n.text, n.x + push, y + push + 1);
    } else {
      const x0 = n.x - n.hw, y0 = y - n.hh;
      ctx.fillStyle = rgba(hot ? INK.shock : INK.bg, 1);
      ctx.fillRect(x0, y0, n.w, n.h);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(hot ? INK.stamp : INK.edge, 1);
      ctx.strokeRect(x0 + 0.75, y0 + 0.75, n.w - 1.5, n.h - 1.5);
      ctx.fillStyle = rgba(hot ? INK.bg : INK.ink, 1);
      ctx.fillText(n.text, n.x, y + 1);
    }

    ctx.globalAlpha = 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';

    const focus = dragging || hover || pinned;
    const lit = focus ? new Set([focus, ...focus.links]) : null;

    // Background edges first, then the lit ones on top of them.
    for (const [a, b] of edges) {
      if (focus && (a === focus || b === focus)) continue;
      drawEdge(a, b, t, focus
        ? { colour: rgba(INK.ink, 0.07), width: 1 }
        : { colour: rgba(INK.ink, 0.24), width: 1.3 });
    }
    if (focus) {
      for (const [a, b] of edges) {
        if (a === focus || b === focus) drawEdge(a, b, t, { colour: rgba(INK.shock, 0.95), width: 2.4 });
      }
    }

    for (const n of drawOrder) {
      if (n === focus) continue;
      drawNode(n, t, { dim: lit ? !lit.has(n) : false, hot: false });
    }
    if (focus) drawNode(focus, t, { dim: false, hot: true });
  }

  /* -------------------------------------------------------------- step --- */

  function step() {
    if (!visible || !W || !H || !laidOut) return;
    measureAll();
    if (alpha > 0.003 || alphaTarget > 0) tick();
    draw(performance.now() / 1000);
  }

  /* ------------------------------------------------------------ pointer --- */

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function hit(p) {
    for (let i = drawOrder.length - 1; i >= 0; i--) {
      const n = drawOrder[i];
      if (Math.abs(p.x - n.x) <= n.hw + 3 && Math.abs(p.y - n.y) <= n.hh + 3) return n;
    }
    return null;
  }

  // The coffee-drop cursor opens into a cup rim over anything matching
  // [data-cursor="hover"], so flagging the canvas while over a label is all
  // it takes for the cursor to treat labels like buttons.
  const cursorHint = (on) => {
    if (on) canvas.dataset.cursor = 'hover';
    else delete canvas.dataset.cursor;
  };

  function click(n) {
    if (!n) { pinned = null; return; }
    if (n.kind === 'project') { onOpen?.(n.id); return; }
    pinned = pinned === n ? null : n;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = local(e);
    const n = hit(p);
    press = { node: n, x: p.x, y: p.y, moved: false };
    fling = { vx: 0, vy: 0 };
    // On touch a label is tap-only: dragging would fight the page scroll.
    if (n && !COARSE) {
      dragging = n;
      grab = { dx: n.x - p.x, dy: n.y - p.y };
      canvas.setPointerCapture(e.pointerId);
      alphaTarget = 0.3;
      alpha = Math.max(alpha, 0.3);
      cursorHint(true);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (press && Math.hypot(p.x - press.x, p.y - press.y) > 4) press.moved = true;
    if (dragging) {
      const nx = p.x + grab.dx, ny = p.y + grab.dy;
      fling = { vx: nx - dragging.x, vy: ny - dragging.y };
      dragging.x = nx;
      dragging.y = ny;
    } else if (!COARSE) {
      hover = hit(p);
      cursorHint(!!hover);
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (press && !press.moved) click(press.node);
    if (dragging) {
      // Hand the last movement over as momentum, so a flick throws it.
      dragging.vx = fling.vx * 0.9;
      dragging.vy = fling.vy * 0.9;
      dragging = null;
      alphaTarget = 0;
      canvas.releasePointerCapture?.(e.pointerId);
    }
    press = null;
  });

  canvas.addEventListener('pointercancel', () => {
    press = null;
    if (dragging) { dragging = null; alphaTarget = 0; }
  });

  canvas.addEventListener('pointerleave', () => {
    if (dragging) return;
    hover = null;
    cursorHint(false);
  });

  /* -------------------------------------------------- copy + a11y list --- */

  const stats = mapStats();
  if (caption) {
    caption.textContent = `${stats.projects} projects · ${stats.tools} tools · `
      + (stats.topCount >= 3
        ? `${stats.top} shows up in ${stats.topCount} of them (surprising nobody)`
        : 'no favourites, apparently');
  }
  if (hint) {
    hint.textContent = COARSE
      ? 'tap a project to open it · tap a tool to see where it shows up'
      : 'drag anything · click a project to open it · click a tool to see where it shows up';
  }
  // The canvas is opaque to a screen reader, so the same information goes
  // into a visually hidden list: each tool and the projects that use it.
  if (list) {
    list.innerHTML = [...byTag.values()]
      .sort((a, b) => b.deg - a.deg || a.label.localeCompare(b.label))
      .map((sn) => `<li>${esc(sn.label)}: ${[...sn.links]
        .map((pn) => `<a href="#/p/${esc(pn.id)}">${esc(pn.label)}</a>`).join(', ')}</li>`)
      .join('');
  }

  /* --------------------------------------------------------- lifecycle --- */

  // Only spend frames on it while it is on screen. The first time it comes
  // into view it blooms out from the middle — the layout is already solved,
  // so this is the same simulation running from a compressed start.
  keepObserver(new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !bloomed && laidOut && !REDUCED) {
      bloomed = true;
      const cx = W / 2, cy = H / 2;
      for (const n of nodes) {
        n.x = cx + (n.x - cx) * 0.35;
        n.y = cy + (n.y - cy) * 0.35;
      }
      alpha = 0.7;
    }
  }, { threshold: 0.15 })).observe(canvas);

  fitCanvas(canvas, ctx, (w, h) => {
    if (!w || !h) return;                 // hidden — keep the layout we have
    scale = Math.max(0.78, Math.min(1, w / 1000));
    if (laidOut && W && H && (w !== W || h !== H)) {
      const sx = w / W, sy = h / H;
      for (const n of nodes) { n.x *= sx; n.y *= sy; }
      alpha = Math.max(alpha, 0.3);
    }
    W = w; H = h;
    if (!laidOut) {
      measureAll();
      seedPositions();
      settle();
      laidOut = true;
    }
  });

  return { step, nodes, settle };
}
