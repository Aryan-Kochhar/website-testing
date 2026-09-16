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

/* ------------------------------------------------------------ work index --- */

function renderWorkList() {
  const list = document.getElementById('workList');
  if (!list) return;

  list.innerHTML = PROJECTS.map((p, i) => `
    <button class="work-row r-up" data-project="${esc(p.id)}"
            ${p.gallery[0] ? `data-peek="${esc(p.gallery[0])}"` : ''}>
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

/* --------------------------------------------------------- detail page --- */

function renderDetail(id) {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return false;

  const shots = p.gallery.length
    ? `<div class="shot r-clip">
         ${p.gallery.map((g, i) => `<img src="${esc(g)}" alt="${esc(p.name)} screenshot ${i + 1}" class="${i === 0 ? 'is-on' : ''}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`).join('')}
       </div>
       ${p.gallery.length > 1 ? `<div class="dots">${p.gallery.map((_, i) => `<button class="dot ${i === 0 ? 'is-on' : ''}" data-i="${i}" aria-label="Screenshot ${i + 1}"></button>`).join('')}</div>` : ''}`
    : '';

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
        ${shots}
        <p class="detail-body r-up">${esc(p.long)}</p>
        <a class="btn btn--solid" href="${esc(p.url)}" target="_blank" rel="noopener">
          View source on GitHub <span class="btn__arrow">↗</span>
        </a>
      </div>
    </section>
  `;

  detail.querySelector('[data-back]').addEventListener('click', () => go('#/'));

  // Gallery: fade between stacked images, auto-advance, pause once touched.
  const imgs = [...detail.querySelectorAll('.shot img')];
  const dots = [...detail.querySelectorAll('.dot')];

  // These are hotlinked from the project repos, so any one of them can 404.
  let broken = 0;
  imgs.forEach((im, i) => {
    im.addEventListener('error', () => {
      im.classList.add('is-broken');
      dots[i]?.remove();
      if (++broken === imgs.length) {
        detail.querySelector('.shot')?.remove();
        detail.querySelector('.dots')?.remove();
      }
    });
  });
  if (imgs.length > 1) {
    let idx = 0;
    let timer = null;

    const show = (i) => {
      // Step past any image that 404'd, rather than fading to an empty frame.
      let next = (i + imgs.length) % imgs.length;
      for (let tries = 0; tries < imgs.length; tries++) {
        if (!imgs[next].classList.contains('is-broken')) break;
        next = (next + 1) % imgs.length;
      }
      idx = next;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === idx));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === idx));
    };
    const play = () => { timer = setInterval(() => show(idx + 1), 4500); };

    dots.forEach((d) => d.addEventListener('click', () => {
      clearInterval(timer);
      show(Number(d.dataset.i));
      play();
    }));

    play();
    // Route changes replace detail.innerHTML; without this the interval keeps
    // ticking against detached nodes.
    detail._cleanup = () => clearInterval(timer);
  }

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
  detail._io = null;

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

  startLoop([
    initCursor(),
    initParallax(),
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
  const sections = ['top', 'work', 'about', 'contact'];
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
