/* ---------------------------------------------------------------------------
   App: routing, the work index, project detail pages, the roast picker and
   the coffee button.

   Two routes only — the long scroll, and a project detail page:
     #/            the home scroll
     #/p/:id       one project

   The home scroll lives in index.html as real markup rather than being
   rendered here, so it survives with JS off and is readable to crawlers.
   Detail pages are built from PROJECTS at navigation time.
--------------------------------------------------------------------------- */

import { PROJECTS, COFFEE_QUOTES, COFFEE_TENTH } from './data.js';
import { initRoasts, onRoastChange } from './theme.js';
import { initCursor } from './cursor.js';
import { initScene } from './scene.js';
import {
  initReveals, initParallax, initRail, initMarquee, initMagnetic,
  scrollToId, startLoop, keepObserver, releaseObserver, REDUCED, COARSE,
} from './motion.js';

const home = document.getElementById('home');
const detail = document.getElementById('detail');
const curtain = document.getElementById('curtain');

/* The wipe duration lives here and is pushed into CSS, so the animation and
   the DOM swap can never drift apart. Previously these were three separate
   hardcoded numbers and the swap landed a frame before the curtain closed. */
const WIPE = 420;
document.documentElement.style.setProperty('--wipe', `${WIPE}ms`);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* A still frame for a demo, whichever kind it is — the video poster, or the
   image itself. Used wherever we need a thumbnail and not playback. */
const stillOf = (demo) => (demo ? (demo.type === 'video' ? demo.poster : demo.src) : null);

/* Demos are vendored WebM/WebP rather than the GIFs the project repos serve.
   Videos are muted/loop/inline so iOS will autoplay them, and only play while
   on screen. */
function demoMedia(demo, { eager = false } = {}) {
  if (demo.type === 'video') {
    return `<video class="demo__media" muted loop playsinline preload="none"
                   poster="${esc(demo.poster)}" aria-label="${esc(demo.caption)}">
              <source src="${esc(demo.src)}" type="video/webm">
            </video>`;
  }
  return `<img class="demo__media" src="${esc(demo.src)}" alt="${esc(demo.caption)}"
               loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}

/* Play only what is on screen. A row of six looping videos decoding at once
   is the difference between a smooth page and a hot laptop. */
function wireVideos(root) {
  const vids = [...root.querySelectorAll('video.demo__media')];
  if (!vids.length) return null;
  const io = keepObserver(new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) e.target.play?.().catch(() => {});
      else e.target.pause?.();
    }
  }, { threshold: 0.25 }));
  vids.forEach((v) => io.observe(v));
  return io;
}

/* ------------------------------------------------------------ work index --- */

function renderWorkList() {
  const list = document.getElementById('workList');
  if (!list) return;

  list.innerHTML = PROJECTS.map((p, i) => {
    const peek = stillOf(p.demos[0]);
    return `
      <button class="work-row r-up" data-project="${esc(p.id)}"${peek ? ` data-peek="${esc(peek)}"` : ''}>
        <span class="work-row__num">${String(i + 1).padStart(2, '0')}</span>
        <span>
          <span class="work-row__name">${esc(p.name)}</span>
          <span class="work-row__tags">
            ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
          </span>
        </span>
        <span class="work-row__go">View <span aria-hidden="true">→</span></span>
      </button>`;
  }).join('');

  const peek = document.getElementById('peek');
  const peekImg = document.getElementById('peekImg');
  const usePeek = peek && peekImg && !COARSE && !REDUCED;

  // If a thumbnail fails to load, just don't show the preview.
  peekImg?.addEventListener('error', () => peek?.classList.remove('is-on'));

  for (const row of list.querySelectorAll('.work-row')) {
    row.addEventListener('click', () => go(`#/p/${row.dataset.project}`));
    row.addEventListener('pointerenter', () => {
      const src = row.dataset.peek;
      if (!src || !usePeek) return;
      peekImg.src = src;
      peek.classList.add('is-on');
    });
    row.addEventListener('pointerleave', () => peek?.classList.remove('is-on'));
  }

  if (usePeek) {
    addEventListener('pointermove', (e) => {
      // Offset to the right of the cursor, clamped so it never leaves the
      // viewport on rows near the edge.
      const x = Math.min(e.clientX + 200, innerWidth - 180);
      const y = Math.max(Math.min(e.clientY, innerHeight - 120), 120);
      peek.style.left = `${x}px`;
      peek.style.top = `${y}px`;
    }, { passive: true });
  }
}

/* ------------------------------------------------------------------ reel --- */

function reelItems() {
  const out = [];
  for (const p of PROJECTS) {
    if (!p.demos.length) continue;
    // Videos first, then at most two per project, so no one project floods it.
    const ranked = [...p.demos].sort((a, b) => (b.type === 'video') - (a.type === 'video'));
    for (const d of ranked.slice(0, 2)) out.push({ project: p, demo: d });
  }
  return out;
}

function renderReel() {
  const reel = document.getElementById('reel');
  if (!reel) return;

  const items = reelItems();
  reel.innerHTML = `
    <div class="reel__vp">
      <div class="reel__track" id="reelTrack">
        ${items.map(({ project, demo }) => `
          <button class="reel__card" data-project="${esc(project.id)}"
                  aria-label="${esc(project.name)} — ${esc(demo.caption)}">
            <div class="reel__frame">${demoMedia(demo)}</div>
            <div class="reel__meta">
              <span class="reel__proj">${esc(project.name)}</span>
              <span class="reel__cap">${esc(demo.caption)}</span>
            </div>
          </button>`).join('')}
        <div class="reel__card reel__card--end">
          <span class="reel__endline">That's the reel.</span>
          <button class="btn btn--ghost" data-magnetic data-goto="work">All projects <span class="btn__arrow">→</span></button>
        </div>
      </div>
    </div>`;

  for (const card of reel.querySelectorAll('.reel__card[data-project]')) {
    card.addEventListener('click', () => go(`#/p/${card.dataset.project}`));
  }
}

/* Scroll-linked pinning. Returns a per-frame step for the shared rAF loop, or
   null when this viewport gets the native scroller instead. */
function initReelPin() {
  const reel = document.getElementById('reel');
  const track = document.getElementById('reelTrack');
  if (!reel || !track) return null;

  const wide = matchMedia('(min-width: 901px)');
  // Vertical scroll consumed per pixel of sideways travel.
  const PACE = 0.55;
  let pinned = false, travel = 0, ride = 0;

  function measure() {
    pinned = wide.matches && !REDUCED;
    reel.classList.toggle('is-pinned', pinned);

    if (!pinned) {
      reel.style.height = '';
      track.style.transform = '';
      travel = ride = 0;
      return;
    }
    travel = Math.max(0, track.scrollWidth - reel.clientWidth);
    ride = travel * PACE;
    reel.style.height = `${innerHeight + ride}px`;
  }

  measure();
  addEventListener('resize', measure, { passive: true });
  wide.addEventListener('change', measure);
  // Card widths depend on loaded media; re-measure once it settles.
  addEventListener('load', measure);

  return function step() {
    if (!pinned || !travel) return;
    const box = reel.getBoundingClientRect();
    // Cheap reject when the section is nowhere near the viewport.
    if (box.bottom < 0 || box.top > innerHeight) return;
    const progress = Math.max(0, Math.min(1, -box.top / ride));
    track.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
  };
}

/* ---------------------------------------------------------- detail page --- */

function renderDetail(id) {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return false;

  const shots = p.demos.map((d, i) => `
    <figure class="demo r-clip">
      ${demoMedia(d, { eager: i === 0 })}
      <figcaption class="demo__cap">${esc(d.caption)}</figcaption>
    </figure>`).join('');

  detail.innerHTML = `
    <section class="section" style="padding-top:clamp(120px,18vh,200px)">
      <div class="wrap wrap--narrow">
        <button class="back-link" data-back data-magnetic>
          <span class="back-link__arrow" aria-hidden="true">←</span> Back to work
        </button>
        <div class="kicker r-fade">Project</div>
        <h1 class="detail-title" data-scramble>${esc(p.name)}</h1>
        <div class="work-row__tags r-fade" style="margin-bottom:18px">
          ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        <p class="lede r-up">${esc(p.short)}</p>
        ${shots ? `<div class="demo-stack">${shots}</div>` : ''}
        <p class="detail-body r-up">${esc(p.long)}</p>
        <div class="detail-links r-up">
          <a class="btn btn--solid" data-magnetic href="${esc(p.url)}" target="_blank" rel="noopener">
            View source on GitHub <span class="btn__arrow">↗</span>
          </a>
          ${p.watch ? `
          <a class="btn btn--ghost" data-magnetic href="${esc(p.watch)}" target="_blank" rel="noopener">
            Watch the demo <span class="btn__arrow">↗</span>
          </a>` : ''}
        </div>
      </div>
    </section>`;

  detail.querySelector('[data-back]').addEventListener('click', () => go('#/'));

  detail._vidIo = wireVideos(detail);
  detail._io = initReveals(detail);
  initMagnetic(detail);
  return true;
}

/* ---------------------------------------------------------------- router --- */

function paint(hash) {
  const m = /^#\/p\/(.+)$/.exec(hash || '');

  releaseObserver(detail._io);
  releaseObserver(detail._vidIo);
  detail._io = null;
  detail._vidIo = null;

  // decodeURIComponent throws URIError on a stray percent — `#/p/%` would
  // otherwise take the whole boot sequence down with it.
  let id = null;
  if (m) {
    try { id = decodeURIComponent(m[1]); } catch { id = m[1]; }
  }

  if (id && renderDetail(id)) {
    home.hidden = true;
    detail.hidden = false;
  } else {
    detail.hidden = true;
    detail.innerHTML = '';
    home.hidden = false;
  }

  window.scrollTo(0, 0);
}

/* Navigate with a curtain wipe: swap the DOM while the screen is covered. */
let navigating = false;

function go(hash) {
  if (navigating || location.hash === hash) return;

  if (REDUCED) {
    location.hash = hash;
    return;
  }

  navigating = true;
  curtain.classList.remove('is-out');
  curtain.classList.add('is-in');

  setTimeout(() => {
    location.hash = hash;             // triggers hashchange -> paint()
    curtain.classList.remove('is-in');
    curtain.classList.add('is-out');
    navigating = false;
  }, WIPE);
}

/* ----------------------------------------------------------------- pour --- */
/* Kept from the original site. Clicking pours a quote and stirs the scene. */

function initPour(scene) {
  const cup = document.getElementById('pour');
  const bubble = document.getElementById('quote');
  const count = document.getElementById('pourN');
  if (!cup || !bubble) return;

  let pours = 0;
  let quoteTimer = null;
  let lastClick = 0;
  let streak = 0;

  cup.addEventListener('click', () => {
    pours++;
    if (count) count.textContent = pours;

    const now = performance.now();
    streak = now - lastClick < 400 ? streak + 1 : 0;
    lastClick = now;

    bubble.textContent = pours % 10 === 0
      ? COFFEE_TENTH
      : COFFEE_QUOTES[(Math.random() * COFFEE_QUOTES.length) | 0];
    bubble.classList.add('is-on');
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => bubble.classList.remove('is-on'), 2400);

    // Mash it and the cup starts objecting.
    if (streak >= 4 && !REDUCED) {
      cup.classList.remove('is-shaking');
      void cup.offsetWidth;
      cup.classList.add('is-shaking');
      beanRain(10);
      streak = 0;
    }

    scene?.stir?.(0.9);
  });
}

/* ------------------------------------------------------------ bean rain --- */
/* Type "coffee" anywhere and it rains beans. Pure nonsense, costs nothing
   when unused: the nodes are created on demand and removed when they land. */

function beanRain(n = 26) {
  if (REDUCED) return;
  const layer = document.createDocumentFragment();
  const beans = [];

  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    b.className = 'bean-drop';
    b.style.left = `${Math.random() * 100}vw`;
    beans.push(b);
    layer.appendChild(b);
  }
  document.body.appendChild(layer);

  for (const b of beans) {
    const fall = innerHeight + 120;
    const dur = 1500 + Math.random() * 1600;
    const spin = (Math.random() * 720 - 360) | 0;
    const anim = b.animate(
      [
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
        { transform: `translateY(${fall}px) rotate(${spin}deg)`, opacity: 1 },
      ],
      { duration: dur, delay: Math.random() * 700, easing: 'cubic-bezier(.4,0,.8,1)', fill: 'forwards' }
    );
    anim.finished.then(() => b.remove()).catch(() => b.remove());
  }
}

function initKonami() {
  const word = 'coffee';
  let buf = '';
  addEventListener('keydown', (e) => {
    // Ignore while typing into the contact form.
    if (e.target instanceof Element && e.target.closest('input, textarea')) return;
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-word.length);
    if (buf === word) { beanRain(); buf = ''; }
  });
}

/* ------------------------------------------------------------ idle nudge --- */
/* Wander off for a while and the page notices. */

function initIdle() {
  const bubble = document.getElementById('quote');
  if (!bubble || REDUCED) return;

  let timer = null;
  const nudge = () => {
    bubble.textContent = "still there? coffee's getting cold ☕";
    bubble.classList.add('is-on');
    setTimeout(() => bubble.classList.remove('is-on'), 4000);
  };
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(nudge, 60000);
  };

  for (const ev of ['pointermove', 'scroll', 'keydown', 'pointerdown']) {
    addEventListener(ev, reset, { passive: true });
  }
  reset();
}

/* ------------------------------------------------------------------ form --- */
/* No backend, same as before: compose a mailto. The form is `novalidate`, so
   the checking has to happen here — otherwise the `required` attributes are
   decorative and an empty submit opens a blank draft. */

function initForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const message = (fd.get('message') || '').toString().trim();

    const bad = [
      ['f-name', !name],
      ['f-email', !emailOk(email)],
      ['f-msg', !message],
    ];

    let first = null;
    for (const [id, isBad] of bad) {
      const field = document.getElementById(id)?.closest('.field');
      field?.classList.toggle('is-bad', isBad);
      if (isBad && !first) first = document.getElementById(id);
    }
    if (first) { first.focus(); return; }

    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    location.href = `mailto:aryankochhar2005@gmail.com?subject=${encodeURIComponent('Hey Arry')}&body=${body}`;
  });

  // Clear the complaint as soon as they start fixing it.
  for (const input of form.querySelectorAll('input, textarea')) {
    input.addEventListener('input', () => input.closest('.field')?.classList.remove('is-bad'));
  }
}

/* ------------------------------------------------------------------ boot --- */

function boot() {
  // Dismiss the loader FIRST. Anything below can throw; the one thing that
  // must never happen is the overlay staying up over a working page.
  const loader = document.getElementById('loader');
  const dismiss = () => loader?.classList.add('is-done');
  setTimeout(dismiss, REDUCED ? 0 : 1100);
  addEventListener('error', dismiss);

  initRoasts(document.getElementById('roasts'));

  const scene = initScene(document.getElementById('scene'));

  renderWorkList();
  renderReel();
  const marqueeStep = initMarquee();
  initForm();
  initPour(scene);
  initKonami();
  initIdle();
  initMagnetic();

  for (const h of document.querySelectorAll('#home .h-display')) {
    h.setAttribute('data-scramble', '');
  }

  initReveals();
  // One observer for the whole home tree, reel included — wiring the reel
  // separately as well meant every reel video carried two identical
  // observers issuing duplicate play/pause calls.
  wireVideos(home);

  startLoop([
    initCursor(),
    initParallax(),
    initReelPin(),
    marqueeStep,
    initRail((p) => scene?.setScroll?.(p)),
    scene.step,
  ]);

  // Nav
  for (const btn of document.querySelectorAll('[data-goto]')) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.goto;
      if (location.hash && location.hash !== '#/') {
        go('#/');
        setTimeout(() => scrollToId(id), WIPE + 80);
      } else {
        scrollToId(id);
      }
    });
  }
  for (const a of document.querySelectorAll('[data-route]')) {
    a.addEventListener('click', (e) => { e.preventDefault(); go('#/'); });
  }

  // Mark the nav link for whichever section is currently in view.
  const links = [...document.querySelectorAll('.nav__link')];
  const spy = keepObserver(new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((l) => l.classList.toggle('is-active', l.dataset.goto === e.target.id));
    }
  }, { threshold: 0.2, rootMargin: '-25% 0px -55% 0px' }));
  for (const id of ['top', 'work', 'demos', 'about', 'contact']) {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  }

  // A roast change repaints the scene's colours on the next frame for free,
  // but the reel needs a re-measure if the switcher reflowed anything.
  onRoastChange(() => dispatchEvent(new Event('resize')));

  addEventListener('hashchange', () => paint(location.hash));
  paint(location.hash);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
