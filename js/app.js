/* aryankochhar.in — everything that isn't the portrait or the Ask dialog.

   Routes (hash, so it works on any static host):
     #/            home
     #/p/:id       one project

   The home page's standing copy is real markup in index.html. This file
   renders what comes from data.js (featured work, project cards, the GitHub
   list, the stack table, upstream fixes, project pages) and wires up the
   behaviour: the theme switch, pen annotations, the lightbox, the form. */

import {
  PROJECTS, GITHUB_USER, WIRE_SKIP, WIRE_FALLBACK, UPSTREAM, COFFEE_QUOTES, COFFEE_TENTH,
} from './data.js';
import { initHalftone } from './halftone.js';
import { initDesk } from './desk.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const home = $('#home');
const article = $('#article');
const HOME_TITLE = document.title;
const RAIL = 56;                                   // sticky rail height + breathing room, px

/* ============================================================ rendering == */

function mediaTag(d, { eager = false } = {}) {
  return d.type === 'video'
    ? `<video muted loop playsinline preload="none" poster="${d.poster}" data-autoplay${REDUCED ? ' controls' : ''} aria-label="${esc(d.caption)}"><source src="${d.src}" type="video/webm"></video>`
    : `<img src="${d.src}" alt="${esc(d.caption)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}

function figTag(d, n) {
  return `<span class="fig__tag">Fig. ${n}${d.type === 'video' ? ' · live run' : ''}</span>`;
}

function statsList(list, pen) {
  if (!list?.length) return '';
  return `<ul class="stats" data-n="${list.length}" style="--n:${list.length}">${list.map((s, i) => `
    <li class="stat">
      <span class="stat__n">${pen && i === 0 ? `<span data-pen="circle">${esc(s.n)}</span>` : esc(s.n)}</span>
      <span class="stat__l">${esc(s.l)}</span>
      <span class="stat__d">${esc(s.d)}</span>
    </li>`).join('')}</ul>`;
}

/* --------------------------------------------------------- featured work */

function renderWorks() {
  const featured = PROJECTS.filter((p) => p.featured);
  $('#works').innerHTML = featured.map((p, i) => {
    const d = p.demos[0];
    return `
    <article class="work rv">
      ${d ? `
      <figure class="work__fig">
        <a class="fig__frame" href="#/p/${p.id}" aria-label="${esc(p.name)} — open the project">${mediaTag(d, { eager: i === 0 })}${figTag(d, 1)}</a>
        <figcaption class="cap"><span>${esc(d.caption)}</span></figcaption>
      </figure>` : ''}
      <div class="work__body">
        <p class="work__idx">${pad(i + 1)} / ${pad(featured.length)}<span>${esc(p.area)}</span></p>
        <h3 class="work__name"><a href="#/p/${p.id}">${esc(p.name)}</a></h3>
        <p class="work__sub">${esc(p.sub || '')}</p>
        <p class="work__h">${esc(p.headline)}</p>
        <p class="work__p">${esc(p.short)}</p>
        ${p.note ? `<p class="note work__note">${esc(p.note)}</p>` : ''}
        <p class="work__links">
          <a href="#/p/${p.id}">Full write-up →</a>
          <a href="${p.url}" target="_blank" rel="noopener">Source ↗</a>
        </p>
      </div>
      ${statsList(p.stats, true)}
    </article>`;
  }).join('');
}

/* ----------------------------------------------------------------- cards */

/* The 16:10 slot at the top of a card. A screenshot if the project has one;
   otherwise a typographic tile of the same size, so the grid stays even. */
function cardMedia(p) {
  const d = p.demos[0];
  if (d) {
    return `<span class="card__media"><img src="${d.type === 'video' ? d.poster : d.src}" alt="" loading="lazy" decoding="async">${d.type === 'video' ? '<span class="fig__tag">▶ live run inside</span>' : ''}</span>`;
  }
  if (p.stats?.length) {
    return `<span class="card__media card__media--type"><b>${esc(p.stats[0].n)}</b><span>${esc(p.stats[0].l)} — ${esc(p.stats[0].d)}</span></span>`;
  }
  if (p.motif) {
    return `<span class="card__media card__media--type"><pre>${esc(p.motif.join('\n'))}</pre></span>`;
  }
  return `<span class="card__media card__media--type"><b>${esc(p.name.slice(0, 2))}</b></span>`;
}

function renderCards() {
  const featured = PROJECTS.filter((p) => p.featured).length;
  const rest = PROJECTS.filter((p) => !p.featured);

  const cells = rest.map((p, i) => `
    <article class="card rv" style="--d:${(i % 4) * 0.06}s">
      ${cardMedia(p)}
      <p class="card__k"><b>${pad(featured + i + 1)}</b><span>${esc(p.area)}</span></p>
      <h3 class="card__name"><a href="#/p/${p.id}">${esc(p.name)}</a></h3>
      <p class="card__h">${esc(p.headline)}</p>
      <p class="card__tags">${p.tags.map(esc).join(' · ')}</p>
    </article>`);

  cells.push(`
    <button type="button" class="card card--ask rv" data-ask style="--d:${(rest.length % 4) * 0.06}s">
      <span class="ask__k">Rather just ask?</span>
      <span class="ask__h">Ask about any of it.</span>
      <span class="ask__p">Type a question and watch it plan, call its tools and answer — the same loop the real agents run.</span>
      <span class="ask__go">Press <kbd>/</kbd> or click →</span>
    </button>`);

  $('#cards').innerHTML = cells.join('');
}

/* ------------------------------------------------------- also on GitHub */

const prettyRepo = (n) => n.replace(/[-_]+/g, ' ').trim();
const monthYear = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(+d) ? '' : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function paintWire(rows, live) {
  $('#wire').innerHTML = rows.map((r) => `
    <li><a href="https://github.com/${GITHUB_USER}/${encodeURIComponent(r.name)}" target="_blank" rel="noopener">
      <span class="wire__main">
        <span class="wire__name">${esc(prettyRepo(r.name))}</span>
        <span class="wire__desc">${esc(r.desc)}</span>
      </span>
      <span class="wire__lang">${esc(r.lang || '')}</span>
      <span class="wire__date">${monthYear(r.pushed)}</span>
    </a></li>`).join('');
  $('#wireSrc').lastChild.textContent = live
    ? `live from github.com/${GITHUB_USER}`
    : `github.com/${GITHUB_USER}`;
}

async function renderWire() {
  paintWire(WIRE_FALLBACK, false);

  const KEY = 'wire:v2';
  try {
    let rows = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!rows) {
      const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return;
      const covered = new Set(PROJECTS.map((p) => p.url.split('/').pop().toLowerCase()));
      rows = (await res.json())
        .filter((x) => !x.fork && !x.archived && x.description
          && !WIRE_SKIP.includes(x.name) && !covered.has(x.name.toLowerCase()))
        .map((x) => ({ name: x.name, lang: x.language || '', pushed: (x.pushed_at || '').slice(0, 10), desc: x.description }));
      sessionStorage.setItem(KEY, JSON.stringify(rows));
    }
    if (rows.length) paintWire(rows, true);
  } catch { /* offline, rate-limited or storage blocked: the fallback is already on the page */ }
}

/* ------------------------------------------------------------- the stack */

function renderBox() {
  const count = new Map();
  for (const p of PROJECTS) for (const t of p.stack) count.set(t, (count.get(t) || 0) + 1);
  const cols = [...count].filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);

  const head = cols.map((t, c) => `<th scope="col" data-c="${c}"><span>${esc(t)}</span></th>`).join('');
  const body = PROJECTS.map((p) => {
    const also = p.stack.filter((t) => !cols.includes(t));
    return `<tr>
      <th scope="row"><a href="#/p/${p.id}">${esc(p.label || p.name)}</a>${p.featured ? '<small>résumé</small>' : ''}</th>
      ${cols.map((t, c) => {
        const on = p.stack.includes(t);
        return `<td class="${on ? 'on' : 'off'}" data-c="${c}"><i></i><span class="sr">${on ? 'yes' : ''}</span></td>`;
      }).join('')}
      <td class="also">${also.map(esc).join(' · ')}</td>
    </tr>`;
  }).join('');
  const foot = cols.map((t, c) => `<td data-c="${c}">${count.get(t)}</td>`).join('');

  $('#box').innerHTML = `
    <table>
      <caption class="sr">Which tools each project uses. Columns are tools shared by two or more projects.</caption>
      <thead><tr><th scope="col">Project</th>${head}<th scope="col">Also</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th scope="row">Appearances</th>${foot}<td></td></tr></tfoot>
    </table>`;

  // Light up the whole column under the pointer.
  const table = $('#box table');
  let lit = null;
  const light = (c) => {
    if (c === lit) return;
    if (lit !== null) $$(`[data-c="${lit}"]`, table).forEach((el) => el.classList.remove('is-col'));
    lit = c;
    if (c !== null) $$(`[data-c="${c}"]`, table).forEach((el) => el.classList.add('is-col'));
  };
  table.addEventListener('pointerover', (e) => light(e.target.closest('[data-c]')?.dataset.c ?? null));
  table.addEventListener('pointerleave', () => light(null));
}

/* -------------------------------------------------------- fixed upstream */

function renderFixes() {
  $('#fixes').innerHTML = UPSTREAM.map((c) => `
    <li>
      <p class="fix__lib"><span>${esc(c.lib)}</span><a href="https://github.com/${c.repo}/pull/${c.pr}" target="_blank" rel="noopener">#${c.pr} · merged ↗</a></p>
      <p>${c.text}</p>
    </li>`).join('');
}

/* --------------------------------------------------------- project pages */

let lbItems = [];

function renderArticle(id) {
  const p = PROJECTS.find((x) => x.id === id);

  if (!p) {
    lbItems = [];
    document.title = 'Not found — Aryan Kochhar';
    article.innerHTML = `
      <article class="art art--404 wrap">
        <p class="kicker"><b>404</b><span>No such project</span></p>
        <h1 class="art__h">Nothing here.</h1>
        <p class="art__deck">That link points at a project that doesn’t exist — or doesn’t exist yet.</p>
        <a class="btn btn--ink" href="#/">Back to all the work <span class="btn__arrow" aria-hidden="true">→</span></a>
      </article>`;
    return;
  }

  const i = PROJECTS.indexOf(p);
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const [lead, ...rest] = p.demos;
  lbItems = p.demos;
  document.title = `${p.name} — Aryan Kochhar`;

  const links = [
    p.live && `<a href="${p.live}" target="_blank" rel="noopener">Live demo ↗</a>`,
    p.watch && `<a href="${p.watch}" target="_blank" rel="noopener">Watch ↗</a>`,
    `<a href="${p.url}" target="_blank" rel="noopener">Source on GitHub ↗</a>`,
  ].filter(Boolean).join('');

  article.innerHTML = `
    <article class="art wrap">
      <a class="art__back" href="#/">← All work</a>

      <header class="art__head">
        <p class="kicker"><b>${pad(i + 1)} / ${pad(PROJECTS.length)}</b><span>${p.featured ? 'On the résumé' : 'From GitHub'}</span><span>${esc(p.area)}</span></p>
        <h1 class="art__h">${esc(p.name)}</h1>
        <p class="art__deck">${esc(p.headline)}</p>
        <div class="art__meta">
          <span>${p.sub ? `<b>${esc(p.sub)}</b>` : `<b>${p.tags.map(esc).join(' · ')}</b>`}</span>
          <span class="art__links">${links}</span>
        </div>
      </header>

      ${lead ? `
      <figure class="fig art__lead">
        <button type="button" class="fig__frame" data-zoom="0" aria-label="Enlarge figure 1">${mediaTag(lead, { eager: true })}${figTag(lead, 1)}</button>
        <figcaption class="cap"><span><b>Fig. 1.</b> ${esc(lead.caption)}</span></figcaption>
      </figure>` : ''}

      <div class="art__grid">
        <div class="art__body">
          <p class="dropcap">${esc(p.long)}</p>
          ${p.points ? `
          <h2 class="art__sub">As it reads on the résumé</h2>
          <ol class="art__points">${p.points.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ol>` : ''}
        </div>
        <aside class="art__side">
          ${p.stats?.length ? `<h2>By the numbers</h2>${statsList(p.stats, false)}` : ''}
          <h2>Built with</h2>
          <p class="art__stack">${p.stack.map((t) => `<span>${esc(t)}</span>`).join('')}</p>
        </aside>
      </div>

      ${rest.length ? `
      <section class="gallery" aria-label="More figures">
        ${rest.map((d, k) => `
        <figure class="fig rv">
          <button type="button" class="fig__frame" data-zoom="${k + 1}" aria-label="Enlarge figure ${k + 2}">${mediaTag(d)}${figTag(d, k + 2)}</button>
          <figcaption class="cap"><span><b>Fig. ${k + 2}.</b> ${esc(d.caption)}</span></figcaption>
        </figure>`).join('')}
      </section>` : ''}

      <nav class="art__more" aria-label="More projects">
        <a href="#/p/${prev.id}"><span>← Previous</span><b>${esc(prev.name)}</b></a>
        <a href="#/p/${next.id}"><span>Next →</span><b>${esc(next.name)}</b></a>
      </nav>
    </article>`;
}

/* ============================================================ behaviour == */

/* ------------------------------------------------------ view transitions */

function transition(fn, kind) {
  if (!document.startViewTransition || REDUCED) { fn(); return; }
  if (kind) root.dataset.vt = kind;
  const t = document.startViewTransition(fn);
  t.finished.catch(() => {}).finally(() => { delete root.dataset.vt; });
}

/* ---------------------------------------------------- reveals and videos */

const revealIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    revealIO.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });

/* Only the videos on screen decode. A page of looping clips all playing at
   once is the difference between a smooth scroll and a hot laptop. */
const videoIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const v = e.target;
    if (e.isIntersecting) v.play().catch(() => {});
    else v.pause();
  }
}, { threshold: 0.35 });

/* --------------------------------------------------------- pen marks --- */

const SVG = 'http://www.w3.org/2000/svg';

/* Geometry for a mark around a w×h box, in pixels — drawn at 1:1 so the
   stroke never scales and the dash maths is exact. */
function penShape(kind, w, h) {
  if (kind === 'circle') {
    const padX = Math.max(9, h * 0.34), padY = Math.max(5, h * 0.16);
    const W = w + padX * 2, H = h + padY * 2;
    const cx = W / 2, cy = H / 2, rx = W / 2 - 2, ry = H / 2 - 2;
    const pts = [];
    // A loop that starts inside its own line and overshoots where it closes,
    // the way a circle drawn in one go does.
    for (let i = 0; i <= 72; i++) {
      const t = i / 72;
      const a = -2.55 + t * 1.13 * Math.PI * 2;
      const k = 0.92 + 0.1 * t + 0.022 * Math.sin(a * 2 + 0.8);
      pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
    }
    return { W, H, left: -padX, top: -padY, paths: [`M${pts.join('L')}`] };
  }
  // 'under': one confident stroke, then a shorter second pass.
  const H = Math.max(9, h * 0.17);
  return {
    W: w, H, left: 0, top: h * 0.9,
    paths: [
      `M2 ${H * 0.5} C ${w * 0.2} ${H * 0.05}, ${w * 0.42} ${H * 0.9}, ${w * 0.62} ${H * 0.42} S ${w * 0.9} ${H * 0.15}, ${w - 2} ${H * 0.5}`,
      `M${w * 0.14} ${H * 0.98} C ${w * 0.36} ${H * 0.62}, ${w * 0.6} ${H * 1.08}, ${w * 0.84} ${H * 0.8}`,
    ],
  };
}

const penIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-inked');
    penIO.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -14% 0px', threshold: 0.9 });

function ink(el) {
  if (el.querySelector(':scope > .pen')) return;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'pen');
  svg.setAttribute('aria-hidden', 'true');
  el.append(svg);

  const lay = () => {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    const g = penShape(el.dataset.pen, w, h);
    svg.setAttribute('viewBox', `0 0 ${g.W.toFixed(1)} ${g.H.toFixed(1)}`);
    svg.style.cssText = `left:${g.left}px;top:${g.top}px;width:${g.W}px;height:${g.H}px`;
    svg.innerHTML = g.paths.map((d) => `<path d="${d}"/>`).join('');
    for (const p of svg.children) {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    }
  };
  lay();
  new ResizeObserver(lay).observe(el);

  // The hero marks wait for the headline to finish arriving; see boot().
  if (!el.closest('.hero')) penIO.observe(el);
}

/* Hook up everything dynamic inside `scope` — called after each render. */
function wire(scope = document) {
  $$('.rv:not(.is-in)', scope).forEach((el) => revealIO.observe(el));
  $$('[data-pen]', scope).forEach(ink);
  if (!REDUCED) $$('video[data-autoplay]', scope).forEach((v) => videoIO.observe(v));
}

/* ------------------------------------------------------------ routing --- */

let current = null;      // 'home' | 'article'
let homeY = 0;           // where the home page was left
let pending = null;      // a section to land on once home is back

const sectionY = (id) => {
  if (id === 'top') return 0;
  const el = document.getElementById(id);
  return el ? Math.max(0, el.getBoundingClientRect().top + scrollY - RAIL) : 0;
};

function parse(hash) {
  const m = /^#\/p\/([^/?#]+)/.exec(hash || '');
  if (!m) return { name: 'home' };
  // decodeURIComponent throws on a stray percent — `#/p/%` should 404, not crash.
  try { return { name: 'article', id: decodeURIComponent(m[1]) }; }
  catch { return { name: 'article', id: '' }; }
}

function paint(first = false) {
  const r = parse(location.hash);
  if (r.name === 'home' && current === 'home' && !pending) return;
  if (current === 'home' && r.name !== 'home') homeY = scrollY;

  const swap = () => {
    if (r.name === 'home') {
      article.hidden = true;
      article.replaceChildren();
      home.hidden = false;
      document.title = HOME_TITLE;
    } else {
      home.hidden = true;
      article.hidden = false;
      renderArticle(r.id);
      wire(article);
    }
    document.body.dataset.route = r.name;
    current = r.name;

    if (r.name === 'home') {
      const y = pending ? sectionY(pending) : first ? 0 : homeY;
      pending = null;
      scrollTo(0, y);
    } else {
      scrollTo(0, 0);
    }
  };

  if (first) swap(); else transition(swap);
}

function goto(id) {
  if (current !== 'home') { pending = id; location.hash = '#/'; return; }
  scrollTo({ top: sectionY(id), behavior: REDUCED ? 'auto' : 'smooth' });
}

/* -------------------------------------------------------------- theme --- */

/* Stored as 'morning' / 'evening' (light / dark). */
function setEdition(e, animate = true) {
  if (e !== 'morning' && e !== 'evening') return;
  const apply = () => {
    root.dataset.edition = e;
    try { localStorage.setItem('edition', e); } catch { /* private mode */ }
    syncEdition();
    window.dispatchEvent(new CustomEvent('edition', { detail: e }));
  };
  if (animate && e !== root.dataset.edition) transition(apply, 'edition'); else apply();
}

function syncEdition() {
  const other = root.dataset.edition === 'evening' ? 'Light' : 'Dark';
  $('#editionLabel').textContent = other;
  $('#edition').setAttribute('aria-label', `Switch to ${other.toLowerCase()} mode`);
  $('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--paper').trim());
}

/* -------------------------------------------------------------- coffee -- */

/* The one easter egg kept from the original site: each click pours a cup and
   says one of Arry's lines. Deliberately small — a counter and a sentence. */
function initPour() {
  const btn = $('#pour');
  const bubble = $('#quote');
  const count = $('#pourN');
  if (!btn || !bubble) return;

  let pours = 0;
  let last = -1;
  let timer = 0;

  btn.addEventListener('click', () => {
    pours++;
    count.textContent = pours;

    let line = COFFEE_TENTH;
    if (pours % 10 !== 0) {
      // Never the same line twice running.
      let i;
      do { i = (Math.random() * COFFEE_QUOTES.length) | 0; } while (i === last && COFFEE_QUOTES.length > 1);
      last = i;
      line = COFFEE_QUOTES[i];
    }
    bubble.textContent = line;
    bubble.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(() => bubble.classList.remove('is-on'), 2600);
  });
}

/* ------------------------------------------------------------ lightbox -- */

const lb = $('#lb');
let lbAt = 0;

function showFigure() {
  const d = lbItems[lbAt];
  if (!d) return;
  $('#lbMedia').innerHTML = d.type === 'video'
    ? `<video src="${d.src}" poster="${d.poster}" controls autoplay muted loop playsinline></video>`
    : `<img src="${d.src}" alt="${esc(d.caption)}">`;
  $('#lbCap').innerHTML = `<span><b>Fig. ${lbAt + 1}.</b> ${esc(d.caption)}</span><span class="cap__hint">${lbAt + 1} / ${lbItems.length}</span>`;
  $$('.lb__nav', lb).forEach((b) => { b.hidden = lbItems.length < 2; });
}

function step(by) {
  lbAt = (lbAt + by + lbItems.length) % lbItems.length;
  showFigure();
}

function initLightbox() {
  if (!lb.showModal) return;
  lb.addEventListener('click', (e) => {
    const s = e.target.closest('[data-step]');
    if (s) { step(+s.dataset.step); return; }
    if (e.target === lb || e.target.closest('[data-close]')) lb.close();
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  lb.addEventListener('close', () => { $('#lbMedia').replaceChildren(); });
}

/* ---------------------------------------------------------------- form -- */

/* No backend: validate here, then hand a filled-in email to the visitor's
   own mail client. */
function initForm() {
  const form = $('#contactForm');
  if (!form) return;
  const ok = {
    name: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    message: (v) => v.trim().length > 0,
  };
  const check = (el) => {
    const good = ok[el.name](el.value);
    el.closest('.field').classList.toggle('is-bad', !good);
    el.setAttribute('aria-invalid', String(!good));
    return good;
  };

  form.addEventListener('input', (e) => {
    if (e.target.closest('.field.is-bad')) check(e.target);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = ['name', 'email', 'message'].map((n) => form.elements[n]);
    const bad = fields.filter((el) => !check(el));
    if (bad.length) { bad[0].focus(); return; }

    const [name, email, msg] = fields.map((el) => el.value.trim());
    const body = encodeURIComponent(`${msg}\n\n— ${name} (${email})`);
    $('#formNote').textContent = 'Opening your mail app — it’s addressed and ready.';
    location.href = `mailto:aryankochhar2005@gmail.com?subject=${encodeURIComponent('Hey Arry')}&body=${body}`;
  });
}

/* ------------------------------------------------------------- chrome --- */

function initTicker() {
  const track = $('#ticker');
  // A second copy of the tape so the loop has no seam. Hidden from readers.
  const clones = $$('.tick', track).map((li) => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    return c;
  });
  track.append(...clones);
}

function initDateline() {
  const el = $('#dateline');
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  const tick = () => { const now = new Date(); el.textContent = `Chennai · ${date.format(now)} · ${time.format(now)} IST`; };
  tick();
  setInterval(tick, 20_000);
}

function initRail() {
  // The name slides into the rail once the masthead has scrolled away.
  new IntersectionObserver(([e]) => {
    document.body.classList.toggle('is-stuck', !e.isIntersecting);
  }, { rootMargin: `-${RAIL}px 0px 0px 0px` }).observe($('.mast__name'));

  const bar = $('#prog');
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---------------------------------------------------------------- boot -- */

function boot() {
  history.scrollRestoration = 'manual';

  renderWorks();
  renderCards();
  renderBox();
  renderFixes();
  renderWire();

  initTicker();
  initDateline();
  initRail();
  initLightbox();
  initForm();
  initPour();
  syncEdition();

  initHalftone($('#halftone'), { reduced: REDUCED });
  if (matchMedia('(hover: none)').matches) $('#halftoneHint').textContent = 'Printed in dots — tap to develop';

  const desk = initDesk({
    projects: PROJECTS,
    upstream: UPSTREAM,
    quotes: COFFEE_QUOTES,
    actions: {
      open: (id) => { location.hash = `#/p/${id}`; },
      goto,
      setEdition,
    },
  });

  $('#edition').addEventListener('click', () => {
    setEdition(root.dataset.edition === 'evening' ? 'morning' : 'evening');
  });

  document.addEventListener('click', (e) => {
    const t = e.target;

    const g = t.closest('[data-goto]');
    if (g) { goto(g.dataset.goto); return; }

    if (t.closest('[data-ask]')) { desk.open(); return; }

    const z = t.closest('[data-zoom]');
    if (z && lb.showModal) { lbAt = +z.dataset.zoom; showFigure(); lb.showModal(); return; }

    // The name in the rail: on the home page it's "back to top", elsewhere it's "home".
    if (t.closest('[data-home]') && current === 'home') {
      e.preventDefault();
      goto('top');
    }
  });

  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey) return;
    const typing = e.target instanceof Element && e.target.matches('input, textarea, select, [contenteditable]');
    const slash = e.key === '/' && !typing && !e.ctrlKey && !e.metaKey;
    const cmdK = e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey);
    if (slash || cmdK) { e.preventDefault(); desk.open(); }
  });

  addEventListener('hashchange', () => paint());
  paint(true);
  wire(document);

  // Hold the headline until its typeface is in, so it arrives once, in the
  // right letters — but never wait on a slow font for more than a moment.
  const ready = () => {
    if (document.body.classList.contains('is-ready')) return;
    document.body.classList.add('is-ready');
    setTimeout(() => {
      document.body.classList.add('is-settled');
      $$('.hero [data-pen]').forEach((el) => el.classList.add('is-inked'));
    }, REDUCED ? 0 : 1150);
  };
  (document.fonts?.ready ?? Promise.resolve()).then(ready);
  setTimeout(ready, 1400);
}

boot();
