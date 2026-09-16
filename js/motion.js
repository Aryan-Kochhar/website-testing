/* ---------------------------------------------------------------------------
   Motion primitives.

   Native scroll throughout, with effects linked to scroll position. Scroll is
   deliberately not hijacked: a lerped fake-scroll container breaks keyboard
   paging, trackpad momentum, find-in-page and anchor restoration.

   Animated properties are transform, opacity and clip-path, so none of it
   touches layout. One shared rAF loop drives the per-frame work rather than a
   listener per effect.
--------------------------------------------------------------------------- */

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const COARSE  = matchMedia('(hover: none), (pointer: coarse)').matches;

/* IntersectionObservers are retained on purpose. An observer with live
   targets but no remaining JS reference is collectable in Chromium, and when
   that happens it delivers its initial batch then silently never fires again
   — which reads exactly like "scroll animations stop working below the
   fold". Holding the reference is the fix. */
const OBSERVERS = new Set();
export function keepObserver(io) { OBSERVERS.add(io); return io; }
export function releaseObserver(io) {
  if (!io) return;
  io.disconnect();
  OBSERVERS.delete(io);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------------ canvas fit --- */
/* devicePixelRatio changes on browser zoom and when a window moves to a
   monitor with different scaling, and a `resize` event does not reliably
   follow — the CSS pixel size of the viewport may not have changed at all.
   A resolution media query is the only thing that fires on the change, and it
   must be re-armed each time because the query encodes the old value. */
export function watchDpr(fn) {
  const arm = () => {
    matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
      .addEventListener('change', () => { fn(); arm(); }, { once: true });
  };
  arm();
}

/* Keeps a canvas's backing store in step with its own CSS box.

   The canvas MUST have a CSS width/height (100%, fixed px, anything). A
   canvas is a replaced element, so with only `inset:0` and no CSS size its
   `width:auto` resolves to its INTRINSIC size — the width attribute, which is
   box*dpr — and the element ends up dpr times too big. At dpr 1 that is
   invisible; at dpr 1.5 everything drawn lands at 1.5x the pointer. */
export function fitCanvas(cv, ctx) {
  let w = 0, h = 0;
  function fit() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth;
    h = cv.clientHeight;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // setting width/height resets it
  }
  fit();
  addEventListener('resize', fit, { passive: true });
  watchDpr(fit);
  return () => ({ w, h });
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
  const targets = root.querySelectorAll('.r-up, .r-fade, .r-clip, [data-scramble]');
  if (!targets.length) return null;

  if (REDUCED) {
    targets.forEach((el) => el.classList.add('is-in'));
    return null;
  }

  const io = keepObserver(new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      el.classList.add('is-in');
      if (el.hasAttribute('data-scramble')) scramble(el);
      io.unobserve(el);
      // Drop the compositor hint once the one-shot animation is done. Leaving
      // will-change on ~30 elements for the life of the page is the exact
      // antipattern the spec warns about.
      setTimeout(() => { el.style.willChange = 'auto'; }, 1100);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }));

  targets.forEach((el) => io.observe(el));
  return io;
}

/* -------------------------------------------------------------- parallax --- */

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
    onProgress?.(p);
  };
}

/* --------------------------------------------------------------- marquee --- */
/* The CSS animation translates the track by -50%, which only loops seamlessly
   if the content is duplicated exactly once. */

export function initMarquee() {
  const track = document.getElementById('marquee');
  if (!track || track.dataset.doubled) return;
  track.innerHTML += track.innerHTML;
  track.dataset.doubled = '1';
}

/* -------------------------------------------------------------- magnetic --- */
/* Buttons lean toward the cursor while it is near them. The easing back out
   lives in CSS — `.btn` transitions transform, so pointerleave releases
   rather than snapping. */

export function initMagnetic(root = document) {
  if (REDUCED || COARSE) return;

  for (const el of root.querySelectorAll('[data-magnetic]')) {
    el.addEventListener('pointermove', (e) => {
      const b = el.getBoundingClientRect();
      const dx = (e.clientX - (b.left + b.width / 2)) / b.width;
      const dy = (e.clientY - (b.top + b.height / 2)) / b.height;
      el.style.setProperty('--mx', `${dx * 7}px`);
      el.style.setProperty('--my', `${dy * 7}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--mx', '0px');
      el.style.setProperty('--my', '0px');
    });
  }
}

/* ---------------------------------------------------- smooth scroll to id --- */

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY - 10;
  window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
}

/* ------------------------------------------------------------- rAF driver --- */
/* One loop for every per-frame effect.

   Every step runs every frame. Gating on "did scroll or pointer move" is
   tempting but wrong: the cursor drop eases toward the pointer for many
   frames after the last pointermove, and skipping those strands it. */

export function startLoop(steps) {
  const live = steps.filter(Boolean);
  if (!live.length) return;

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    for (const s of live) s();
  }
  requestAnimationFrame(frame);
}
