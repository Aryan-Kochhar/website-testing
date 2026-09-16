/* ---------------------------------------------------------------------------
   App: routing, the work index, project detail pages, and the coffee button.

   Two routes only — the long scroll, and a project detail page:
     #/            the home scroll
     #/p/:id       one project

   The home scroll lives in index.html as real markup rather than being
   rendered here, so it survives with JS off and is readable to crawlers.
   Detail pages are built from PROJECTS at navigation time.
--------------------------------------------------------------------------- */

import { PROJECTS, COFFEE_QUOTES, COFFEE_TENTH } from './data.js';
import { initFluid } from './fluid.js';
import {
  splitText, scramble, initReveals, initCursor, initParallax,
  initRail, initMarquee, initMagnetic, scrollToId, startLoop, keepObserver,
  releaseObserver, REDUCED,
} from './motion.js';

const home = document.getElementById('home');
const detail = document.getElementById('detail');
const curtain = document.getElementById('curtain');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* A still frame for a demo, whichever kind it is — the video poster, or the
   image itself. Used wherever we need a thumbnail and not playback. */
const stillOf = (demo) => (demo ? (demo.type === 'video' ? demo.poster : demo.src) : null);

/* Demos are vendored WebM/WebP rather than the GIFs the project repos serve:
   those totalled 23MB, one of them 439 frames. Videos are muted/loop/inline
   so iOS will autoplay them, and only play while on screen. */
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
      const v = e.target;
      if (e.isIntersecting) { v.play?.().catch(() => {}); }
      else { v.pause?.(); }
    }
  }, { threshold: 0.25 }));
  vids.forEach((v) => io.observe(v));
  return io;
}

/* ------------------------------------------------------------ work index --- */

function renderWorkList() {
  const list = document.getElementById('workList');
  if (!list) return;

  list.innerHTML = PROJECTS.map((p, i) => `
    <button class="work-row r-up" data-project="${esc(p.id)}"
            ${stillOf(p.demos[0]) ? `data-peek="${esc(stillOf(p.demos[0]))}"` : ''}>
      <span class="work-row__num">${String(i + 1).padStart(2, '0')}</span>
      <span>
        <span class="work-row__name">${esc(p.name)}</span>
        <span class="work-row__tags">
          ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
        </span>
      </span>
      <span class="work-row__go">View <span aria-hidden="true">→</span></span>
    </button>
  `).join('');

  // Hover preview that follows the cursor. One shared node, repointed.
  const peek = document.getElementById('peek');
  const peekImg = document.getElementById('peekImg');
  // Hotlinked thumbnail: if it fails, just don't show the preview.
  peekImg?.addEventListener('error', () => peek?.classList.remove('is-on'));
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  for (const row of list.querySelectorAll('.work-row')) {
    row.addEventListener('click', () => go(`#/p/${row.dataset.project}`));

    const name = row.querySelector('.work-row__name');
    row.addEventListener('pointerenter', () => {
      scramble(name, 520);
      const src = row.dataset.peek;
      if (!src || coarse || REDUCED || !peek) return;
      peekImg.src = src;
      peek.classList.add('is-on');
    });
    row.addEventListener('pointerleave', () => peek?.classList.remove('is-on'));
  }

  if (peek && !coarse && !REDUCED) {
    addEventListener('pointermove', (e) => {
      // Offset to the right of the cursor, clamped so it never leaves the
      // viewport on rows near the edge.
      const x = Math.min(e.clientX + 190, innerWidth - 170);
      const y = Math.max(Math.min(e.clientY, innerHeight - 110), 110);
      peek.style.left = `${x}px`;
      peek.style.top = `${y}px`;
    }, { passive: true });
  }
}

/* ------------------------------------------------------------------ reel --- */
/* A horizontal demo strip. On a wide screen with motion allowed it pins and
   tracks sideways off vertical scroll; otherwise it stays a plain horizontal
   scroller with snap points, which is what touch wants anyway. Both paths use
   the same markup — only `.is-pinned` differs. */

function reelItems() {
  const out = [];
  for (const p of PROJECTS) {
    if (!p.demos.length) continue;
    // Videos first, then at most two per project, so no one project floods it.
    const ranked = [...p.demos].sort((a, b) => (a.type === 'video' ? -1 : 1) - (b.type === 'video' ? -1 : 1));
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
          <article class="reel__card" data-project="${esc(project.id)}" tabindex="0"
                   role="link" aria-label="${esc(project.name)} — ${esc(demo.caption)}">
            <div class="reel__frame">${demoMedia(demo)}</div>
            <div class="reel__meta">
              <span class="reel__proj">${esc(project.name)}</span>
              <span class="reel__cap">${esc(demo.caption)}</span>
            </div>
          </article>`).join('')}
        <article class="reel__card reel__card--end">
          <span class="reel__endline">That\u2019s the reel.</span>
          <button class="btn btn--ghost" data-goto="work">All projects <span class="btn__arrow">\u2192</span></button>
        </article>
      </div>
    </div>`;

  for (const card of reel.querySelectorAll('.reel__card[data-project]')) {
    const open = () => go(`#/p/${card.dataset.project}`);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }

  wireVideos(reel);
  return reel;
}

/* Scroll-linked pinning. Returns a per-frame step for the shared rAF loop, or
   null when this viewport gets the native scroller instead. */
function initReelPin() {
  const reel = document.getElementById('reel');
  const track = document.getElementById('reelTrack');
  if (!reel || !track) return null;

  const wide = window.matchMedia('(min-width: 901px)');
  // Vertical scroll consumed per pixel of sideways travel. At 1.0 the reel
  // eats ~6 screens of scrolling; this moves it faster than the finger.
  const PACE = 0.55;
  let pinned = false;
  let travel = 0;
  let ride = 0;

  function measure() {
    pinned = wide.matches && !REDUCED;
    reel.classList.toggle('is-pinned', pinned);

    if (!pinned) {
      reel.style.height = '';
      track.style.transform = '';
      travel = ride = 0;
      return;
    }
    // How far the track has to slide, and therefore how much vertical scroll
    // the section needs to consume.
    travel = Math.max(0, track.scrollWidth - reel.clientWidth);
    ride = travel * PACE;
    reel.style.height = `${window.innerHeight + ride}px`;
  }

  measure();
  window.addEventListener('resize', measure, { passive: true });
  wide.addEventListener('change', measure);
  // Card widths depend on loaded media; re-measure once it settles.
  window.addEventListener('load', measure);

  return function step() {
    if (!pinned || !travel) return;
    const box = reel.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -box.top / ride));
    track.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
  };
}

/* --------------------------------------------------------- detail page --- */

function renderDetail(id) {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return false;

  // Stacked figures rather than a carousel: there are at most four, they
  // each mean something different, and a caption per demo beats dots.
  const shots = p.demos.map((d, i) => `
    <figure class="demo r-clip">
      ${demoMedia(d, { eager: i === 0 })}
      <figcaption class="demo__cap">${esc(d.caption)}</figcaption>
    </figure>
  `).join('');

  detail.innerHTML = `
    <section class="section" style="padding-top:clamp(120px,18vh,200px)">
      <div class="wrap wrap--narrow">
        <button class="back-link" data-back>
          <span class="back-link__arrow" aria-hidden="true">←</span> Back to work
        </button>
        <div class="kicker r-fade">Project</div>
        <h1 class="detail-title" data-scramble>${esc(p.name)}</h1>
        <div class="work-row__tags r-fade" style="margin-bottom:8px">
          ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        <div class="demo-stack">${shots}</div>
        <p class="detail-body r-up">${esc(p.long)}</p>
        <a class="btn btn--solid" href="${esc(p.url)}" target="_blank" rel="noopener">
          View source on GitHub <span class="btn__arrow">↗</span>
        </a>
      </div>
    </section>
  `;

  detail.querySelector('[data-back]').addEventListener('click', () => go('#/'));

  detail._vidIo = wireVideos(detail);

  detail._io = initReveals(detail);
  initMagnetic(detail);
  return true;
}

/* ---------------------------------------------------------------- router --- */

let hero = null;

function paint(hash) {
  const m = /^#\/p\/(.+)$/.exec(hash || '');

  detail._cleanup?.();
  detail._cleanup = null;
  releaseObserver(detail._io);
  releaseObserver(detail._vidIo);
  detail._io = null;
  detail._vidIo = null;

  if (m && renderDetail(decodeURIComponent(m[1]))) {
    home.hidden = true;
    detail.hidden = false;
  } else {
    detail.hidden = true;
    detail.innerHTML = '';
    home.hidden = false;
  }

  window.scrollTo(0, 0);
}

/* Navigate with a curtain wipe: swap the DOM while the screen is covered.
   The hash is set mid-transition, so it lags the click by the wipe duration —
   `navigating` stops a second click in that window queueing another wipe. */
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
  }, 480);
}

/* ----------------------------------------------------------------- coffee --- */
/* Kept from the original site. Clicking pours a quote, throws beans, and
   stirs the hero. */

function initCoffee(fluid) {
  const cup = document.getElementById('cup');
  const bubble = document.getElementById('quote');
  if (!cup || !bubble) return;

  const beans = [];
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('span');
    b.className = 'bean';
    b.style.background = i % 2 ? '#6b4226' : '#b5502f';
    document.body.appendChild(b);
    beans.push(b);
  }

  let clicks = 0;
  let quoteTimer = null;

  cup.addEventListener('click', () => {
    clicks++;

    bubble.textContent = clicks % 10 === 0
      ? COFFEE_TENTH
      : COFFEE_QUOTES[(Math.random() * COFFEE_QUOTES.length) | 0];
    bubble.classList.add('is-on');
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => bubble.classList.remove('is-on'), 2100);

    cup.classList.remove('is-popping');
    void cup.offsetWidth;              // restart the keyframe
    cup.classList.add('is-popping');

    fluid?.stir(0.9);

    if (REDUCED) return;

    const box = cup.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;

    beans.forEach((b, i) => {
      const a = (i / beans.length) * Math.PI * 2 - Math.PI / 2;
      b.style.transition = 'none';
      b.style.opacity = '0';
      b.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(0.4)`;

      requestAnimationFrame(() => {
        b.style.transition = 'transform 0.75s cubic-bezier(0.2,0.8,0.3,1), opacity 0.7s ease';
        b.style.opacity = '1';
        b.style.transform =
          `translate3d(${cx + Math.cos(a) * 62}px, ${cy + Math.sin(a) * 62}px, 0) scale(1) rotate(${a}rad)`;
        setTimeout(() => { b.style.opacity = '0'; }, 380);
      });
    });
  });
}

/* ------------------------------------------------------------------ form --- */
/* No backend, same as before: compose a mailto. */

function initForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const message = (fd.get('message') || '').toString().trim();

    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ''}`);
    location.href = `mailto:aryankochhar2005@gmail.com?subject=${encodeURIComponent('Hey Arry')}&body=${body}`;
  });
}

/* ------------------------------------------------------------------ boot --- */

function boot() {
  // Hero canvas first: it is the thing the visitor is waiting on.
  hero = initFluid(document.getElementById('fluid'));

  renderWorkList();
  renderReel();
  initMarquee();
  initForm();
  initCoffee(hero);
  initMagnetic();

  const title = document.querySelector('[data-split]');
  if (title) splitText(title);

  // Headings keep their <em>, so they glitch in rather than splitting.
  for (const h of document.querySelectorAll('#home .h-display')) {
    h.setAttribute('data-scramble', '');
  }

  initReveals();
  wireVideos(document.getElementById('home'));

  startLoop([
    initCursor(),
    initParallax(),
    initReelPin(),
    initRail((p) => hero?.setScroll(p)),
  ]);

  // Nav
  for (const btn of document.querySelectorAll('[data-goto]')) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.goto;
      if (location.hash && location.hash !== '#/') {
        go('#/');
        setTimeout(() => scrollToId(id), 560);
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
  const sections = ['top', 'work', 'demos', 'about', 'contact'];
  const spy = keepObserver(new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((l) => l.classList.toggle('is-active', l.dataset.goto === e.target.id));
    }
  }, { threshold: 0.3, rootMargin: '-25% 0px -55% 0px' }));
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  addEventListener('hashchange', () => paint(location.hash));
  paint(location.hash);

  // brewing…
  const loader = document.getElementById('loader');
  const dismiss = () => loader?.classList.add('is-done');
  setTimeout(dismiss, REDUCED ? 0 : 1500);
  // Belt and braces: never leave the loader up if something above threw.
  addEventListener('error', dismiss);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
