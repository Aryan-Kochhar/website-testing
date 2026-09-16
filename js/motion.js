/* ---------------------------------------------------------------------------
   Motion.

   Native scroll throughout, with effects linked to scroll position. Scroll is
   deliberately not hijacked: a lerped fake-scroll container breaks keyboard
   paging, trackpad momentum on mobile, find-in-page and anchor restoration,
   and it is what most "smooth scroll" jank actually is. Everything here rides
   the real scrollbar instead.

   Every animated property is transform, opacity or clip-path, so none of it
   touches layout. One shared rAF loop drives the per-frame work rather than a
   listener per effect.
--------------------------------------------------------------------------- */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* IntersectionObservers are retained here on purpose. An observer with live
   targets but no remaining JS reference is collectable in Chromium, and when
   that happens it delivers its initial batch and then silently never fires
   again — which reads exactly like "scroll animations don't work below the
   fold". Holding the reference is the fix. */
const OBSERVERS = new Set();
export function keepObserver(io) { OBSERVERS.add(io); return io; }
export function releaseObserver(io) {
  if (!io) return;
  io.disconnect();
  OBSERVERS.delete(io);
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------------ split text --- */
/* Wraps each character in its own span and hands it an index, which the CSS
   turns into a staggered transition-delay. Word spans keep wrapping sane.
   Only used on the hero title — it is destructive to markup, so headings that
   contain <em> use the scramble below instead. */

export function splitText(el) {
  const src = el.textContent;
  const frag = document.createDocumentFragment();
  let i = 0;

  const rebuild = (text, wrapTag) => {
    const host = wrapTag ? document.createElement(wrapTag) : frag;
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = ch === ' ' ? 'char char--space' : 'char';
      s.style.setProperty('--i', i++);
      s.textContent = ch;
      host.appendChild(s);
    }
    if (wrapTag) frag.appendChild(host);
  };

  for (const child of el.childNodes) {
    if (child.nodeType === 3) rebuild(child.data, null);
    else rebuild(child.textContent, child.tagName);
  }

  el.textContent = '';
  el.appendChild(frag);
  el.setAttribute('aria-label', src);
  return el;
}

/* -------------------------------------------------------------- scramble --- */
/* The text-glitch. Walks text nodes only, so inline markup and colour survive
   it — replacing innerHTML here would drop the <em> mid-animation. */

const GLYPHS = '▓▒░#$%&@*+=<>/\\|{}[]~^';

export function scramble(el, dur = 820) {
  if (REDUCED) return;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push({ node: n, text: n.data });
  const total = nodes.reduce((a, b) => a + b.text.length, 0) || 1;

  const t0 = performance.now();

  function tick(now) {
    // Route changes replace the detail page's markup mid-animation; without
    // this the loop keeps writing to detached text nodes until it finishes.
    if (!el.isConnected) return;

    const p = clamp01((now - t0) / dur);
    let seen = 0;

    for (const item of nodes) {
      let out = '';
      for (let i = 0; i < item.text.length; i++) {
        const ch = item.text[i];
        // Characters settle left to right, so it reads as resolving rather
        // than as uniform static.
        const settleAt = ((seen + i) / total) * 0.82;
        if (ch === ' ' || p >= settleAt + 0.16) out += ch;
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      item.node.data = out;
      seen += item.text.length;
    }

    if (p < 1) requestAnimationFrame(tick);
    else for (const item of nodes) item.node.data = item.text;
  }

  requestAnimationFrame(tick);
}

/* --------------------------------------------------------------- reveals --- */

export function initReveals(root = document) {
  const targets = root.querySelectorAll('.r-up, .r-fade, .r-clip, [data-split], [data-scramble]');
  if (!targets.length) return null;

  if (REDUCED) {
    targets.forEach((el) => el.classList.add('is-in'));
    return null;
  }

  const io = keepObserver(new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-scramble')) scramble(el);
        io.unobserve(el);
      }
    },
    // Fire a little before the element's edge, so things are already moving
    // by the time they are properly in view.
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  ));

  targets.forEach((el) => io.observe(el));
  return io;
}

/* ---------------------------------------------------------------- cursor --- */
/* Dot tracks the pointer almost exactly; the ring trails it and swells over
   anything interactive. Both are mix-blend-mode: difference in CSS, so one
   pair works over cream, espresso and the hero canvas. */

export function initCursor() {
  if (REDUCED || window.matchMedia('(hover: none), (pointer: coarse)').matches) return null;

  const dot = document.getElementById('cur');
  const ring = document.getElementById('curRing');
  if (!dot || !ring) return null;

  const p = { x: innerWidth / 2, y: innerHeight / 2 };
  const d = { ...p };
  const r = { ...p };

  addEventListener('pointermove', (e) => {
    p.x = e.clientX;
    p.y = e.clientY;
    // Snap to the real position on the first event so it does not fly in
    // from the centre of the screen.
    if (!document.body.classList.contains('pointer-live')) {
      d.x = r.x = p.x;
      d.y = r.y = p.y;
      document.body.classList.add('pointer-live');
    }
  }, { passive: true });

  const HOT = 'a, button, input, textarea, [data-goto], .work-row, .focus-cell, .dot';
  addEventListener('pointerover', (e) => {
    if (e.target.closest?.(HOT)) ring.classList.add('is-hot');
  }, { passive: true });
  addEventListener('pointerout', (e) => {
    if (e.target.closest?.(HOT)) ring.classList.remove('is-hot');
  }, { passive: true });

  return function step() {
    d.x = lerp(d.x, p.x, 0.62);
    d.y = lerp(d.y, p.y, 0.62);
    r.x = lerp(r.x, p.x, 0.16);
    r.y = lerp(r.y, p.y, 0.16);
    dot.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
    ring.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
  };
}

/* -------------------------------------------------------------- parallax --- */
/* Photos drift against the scroll. The image is pre-scaled 1.14 in CSS so
   there is overflow to move into and no empty edge appears. */

export function initParallax() {
  const items = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
    el,
    img: el.querySelector('img') || el,
    amt: parseFloat(el.dataset.parallax) || 0.1,
  }));
  if (!items.length || REDUCED) return null;

  return function step() {
    const vh = innerHeight;
    for (const it of items) {
      const box = it.el.getBoundingClientRect();
      if (box.bottom < -200 || box.top > vh + 200) continue;
      // -1 below the fold .. +1 above it
      const mid = (box.top + box.height / 2 - vh / 2) / vh;
      it.img.style.transform = `translate3d(0, ${(-mid * it.amt * 100).toFixed(2)}px, 0) scale(1.14)`;
    }
  };
}

/* ------------------------------------------------------------ scroll rail --- */

export function initRail(onProgress) {
  const fill = document.getElementById('rail');

  return function step() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp01(scrollY / max) : 0;
    if (fill) fill.style.transform = `scaleX(${p})`;
    // Hero fade is driven off its own height, not total page progress.
    onProgress?.(clamp01(scrollY / (innerHeight * 0.9)));
  };
}

/* --------------------------------------------------------------- marquee --- */
/* The CSS animation translates the track by -50%, which only loops seamlessly
   if the content is duplicated exactly once. */

export function initMarquee() {
  const track = document.getElementById('marquee');
  if (!track) return;
  track.innerHTML += track.innerHTML;
}

/* -------------------------------------------------------------- magnetic --- */
/* Buttons lean toward the cursor while it is near them. */

export function initMagnetic(root = document) {
  if (REDUCED) return;

  for (const el of root.querySelectorAll('.btn')) {
    el.addEventListener('pointermove', (e) => {
      const b = el.getBoundingClientRect();
      const dx = (e.clientX - (b.left + b.width / 2)) / b.width;
      const dy = (e.clientY - (b.top + b.height / 2)) / b.height;
      el.style.transform = `translate3d(${dx * 9}px, ${dy * 9}px, 0)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
}

/* ---------------------------------------------------- smooth scroll to id --- */
/* Used by the nav. Native smooth behaviour where it is allowed, instant when
   the visitor asked for reduced motion. */

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY - 10;
  window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
}

/* ------------------------------------------------------------- rAF driver --- */
/* One loop for every per-frame effect. Steps that only depend on scroll are
   skipped on frames where neither scroll nor pointer moved. */

export function startLoop(steps) {
  const live = steps.filter(Boolean);
  if (!live.length) return;

  // Every step runs every frame. Gating on "did scroll or pointer move" is
  // tempting but wrong here: the cursor ring eases toward the pointer for
  // many frames after the last pointermove, and skipping those leaves it
  // stranded. The work is a few transform writes, so it is not worth the bug.
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    for (const s of live) s();
  }

  requestAnimationFrame(frame);
}

export { REDUCED };
