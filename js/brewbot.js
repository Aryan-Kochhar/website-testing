/* ---------------------------------------------------------------------------
   brewbot: a tiny terminal that answers questions about the site.

   It streams its work the way Quant Copilot does — tool_call, tool_done,
   then the answer — because that is the thing Arry actually builds, and a
   portfolio should look like the person who made it.

   It is not an LLM, and its own header says so. It is a keyword router over
   the same data the page is made from: PROJECTS for the work, and the
   rendered page itself for the about text, the stack and the email. Reading
   those out of the DOM rather than restating them here means brewbot can
   never quote a CGPA or an email address the page no longer shows.

   Everything it renders is plain DOM, so the roast switcher, the coffee-drop
   cursor and reduced motion all apply to it for free.
--------------------------------------------------------------------------- */

import { PROJECTS, COFFEE_QUOTES } from './data.js';
import { ROASTS, applyRoast, currentRoast } from './theme.js';
import { mapStats } from './brewmap.js';
import { REDUCED, COARSE } from './motion.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Lowercase, hyphens to spaces, punctuation out — but keep the characters
// that appear in tool names (5G/IoT, C++).
const norm = (s) => String(s).toLowerCase()
  .replace(/-/g, ' ')
  .replace(/[^a-z0-9+#/ ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const SECTIONS = ['top', 'work', 'map', 'demos', 'about', 'contact'];

/* --------------------------------------------------------------- lookup --- */

// Words that would make every question match some project.
const STOP = new Set([
  'the', 'and', 'with', 'card', 'api', 'of', 'a', 'an', 'to', 'for', 'my', 'your',
  'his', 'her', 'their', 'me', 'on', 'in', 'is', 'it', 'that', 'this', 'thing',
  'project', 'one', 'control', 'what', 'tell', 'about', 'show',
]);
const EXTRA_ALIASES = {
  'fact-knowledge-layer': ['fkl', 'facts'],
  'aadhaar-ocr': ['aadhar'],
  'congestion-rl': ['traffic'],
};

const PROJECT_KEYS = PROJECTS.map((p) => {
  const words = new Set();
  for (const src of [p.name, p.label || '', p.id]) {
    for (const w of norm(src).split(' ')) {
      if (!w || STOP.has(w)) continue;
      if (w.length >= 3 || w === 'rl') words.add(w);
    }
  }
  for (const w of EXTRA_ALIASES[p.id] || []) words.add(w);
  return { p, words };
});

function findProject(q) {
  const tokens = norm(q).split(' ');
  let best = null, score = 0;
  for (const { p, words } of PROJECT_KEYS) {
    const s = tokens.filter((t) => words.has(t)).length;
    if (s > score) { best = p; score = s; }
  }
  return best;
}

const TAGS = [...new Set(PROJECTS.flatMap((p) => p.tags))];

// Whole-word match, so "drag" is not a question about RAG.
function findTool(q) {
  const hay = ` ${norm(q)} `;
  let best = null, len = 0;
  for (const tag of TAGS) {
    const n = norm(tag);
    for (const v of [n, ...n.split('/')]) {
      if (v.length >= 2 && hay.includes(` ${v} `) && v.length > len) { best = tag; len = v.length; }
    }
  }
  return best;
}

const ROAST_ALIASES = {
  'dark-roast': ['dark roast', 'dark', 'espresso'],
  latte: ['latte', 'light', 'milk'],
  'cold-brew': ['cold brew', 'cold', 'iced', 'blue'],
  caramel: ['caramel'],
  mocha: ['mocha', 'pink', 'chocolate'],
};

function findRoast(q) {
  const hay = ` ${norm(q)} `;
  return ROASTS.find((r) => (ROAST_ALIASES[r.id] || [r.id]).some((a) => hay.includes(` ${a} `))) || null;
}

const ROAST_LINES = {
  'dark-roast': 'dark roast. a person of culture.',
  latte: 'latte. smooth choice.',
  'cold-brew': 'cold brew. very chill of you.',
  caramel: 'caramel. sweet.',
  mocha: 'mocha. chocolate counts as a food group.',
};

/* -------------------------------------------------------------------- UI --- */

export function initBrewbot({ go, gotoSection, beanRain, pinTool } = {}) {
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'bot-fab';
  fab.setAttribute('aria-controls', 'brewbot');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = `<span aria-hidden="true">☕</span> <span class="bot-fab__long">ask</span> brewbot`
    + (COARSE ? '' : ' <kbd aria-hidden="true">/</kbd>');

  const panel = document.createElement('section');
  panel.className = 'bot';
  panel.id = 'brewbot';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'brewbot, a small helper for this site');
  panel.innerHTML = `
    <header class="bot__head">
      <span class="bot__title">brewbot <small>v0.1 · not an LLM, just if-statements</small></span>
      <button type="button" class="bot__close" aria-label="Close brewbot">×</button>
    </header>
    <div class="bot__log" role="log" aria-live="polite"></div>
    <div class="bot__chips" role="group" aria-label="Suggestions">
      ${['projects', 'best', 'stack', 'contact', 'surprise me']
        .map((c) => `<button type="button" class="bot__chip" data-chip="${c}">${c}</button>`).join('')}
    </div>
    <form class="bot__form">
      <label class="sr-only" for="brewbotInput">Ask brewbot</label>
      <span class="bot__prompt" aria-hidden="true">›</span>
      <input class="bot__input" id="brewbotInput" type="text" autocomplete="off"
             autocapitalize="off" spellcheck="false" enterkeyhint="send"
             placeholder="try: projects, open logmind, brew mocha">
    </form>`;
  panel.inert = true;

  document.body.append(fab, panel);

  const log = panel.querySelector('.bot__log');
  const form = panel.querySelector('.bot__form');
  const input = panel.querySelector('.bot__input');

  let isOpen = false;
  let greeted = false;

  /* ------------------------------------------------------------ timing --- */
  /* Every pause goes through sleep(), and hurry() resolves all of them at
     once. Typing a new command while an answer is still streaming finishes
     the old one instantly instead of making you wait for it. */

  let fast = false;
  const sleepers = new Set();

  function sleep(ms) {
    if (REDUCED || fast) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => { clearTimeout(t); sleepers.delete(done); resolve(); };
      const t = setTimeout(done, ms);
      sleepers.add(done);
    });
  }

  function hurry() {
    fast = true;
    for (const done of [...sleepers]) done();
  }

  /* ----------------------------------------------------------- output --- */

  const scrollLog = () => { log.scrollTop = log.scrollHeight; };

  function line(cls, html = '') {
    const el = document.createElement('div');
    el.className = `bot__line ${cls}`;
    el.innerHTML = html;
    log.appendChild(el);
    scrollLog();
    return el;
  }

  function echo(text) {
    line('bot__line--you', `› ${esc(text)}`);
  }

  // The streamed tool lines are theatre for sighted users; a screen reader
  // gets the answers only, so they are aria-hidden.
  async function call(name, args = '', ms = 420) {
    const el = line('bot__line--call',
      `<span aria-hidden="true">→</span> tool_call <b>${esc(name)}</b>(${esc(args)}) <i class="bot__spin"></i>`);
    el.setAttribute('aria-hidden', 'true');
    const t0 = performance.now();
    await sleep(ms + Math.random() * 220);
    el.querySelector('.bot__spin')?.remove();
    el.insertAdjacentHTML('beforeend',
      `<span class="bot__done">✓ tool_done · ${Math.round(performance.now() - t0)}ms</span>`);
  }

  function fail(name, msg) {
    const el = line('bot__line--call bot__fail', `<span aria-hidden="true">✗</span> tool_failed <b>${esc(name)}</b>: ${esc(msg)}`);
    el.setAttribute('aria-hidden', 'true');
  }

  // Typed out for the eye, announced whole for the ear — a live region fed
  // three characters at a time would be read as noise.
  async function say(text) {
    const el = line('bot__say');
    const shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    const spoken = document.createElement('span');
    spoken.className = 'sr-only';
    spoken.textContent = text;
    el.append(shown, spoken);

    if (REDUCED || fast) { shown.textContent = text; scrollLog(); return; }
    for (let i = 0; i < text.length; i += 3) {
      shown.textContent = text.slice(0, i + 3);
      scrollLog();
      await sleep(14);
      if (fast) break;
    }
    shown.textContent = text;
    scrollLog();
  }

  // Clickable follow-ups: a row either runs another command or is a link.
  function rows(items) {
    const wrap = line('bot__rows');
    for (const it of items) {
      const el = document.createElement(it.href ? 'a' : 'button');
      el.className = 'bot__row';
      if (it.href) {
        el.href = it.href;
        if (!it.href.startsWith('mailto:')) { el.target = '_blank'; el.rel = 'noopener'; }
      } else {
        el.type = 'button';
        el.addEventListener('click', () => run(it.cmd));
      }
      el.innerHTML = `<span>${esc(it.label)}</span>${it.meta ? `<small>${esc(it.meta)}</small>` : ''}`;
      wrap.appendChild(el);
    }
    scrollLog();
  }

  /* --------------------------------------------------------- commands --- */

  async function cmdWake() {
    await call('wake_up', '', 380);
    await say("hey, I'm brewbot. I know Arry's projects, the stack, and where the coffee is. "
      + "not an LLM — just a pile of if-statements in a trench coat. type help, or tap below.");
  }

  async function cmdHelp() {
    await call('list_commands');
    await say('things I understand:');
    rows([
      { label: 'projects', meta: 'everything Arry has built', cmd: 'projects' },
      { label: 'open <project>', meta: 'e.g. open logmind', cmd: 'open logmind' },
      { label: 'best', meta: 'the one to start with', cmd: 'best' },
      { label: 'python', meta: 'or any tool — who uses it', cmd: 'python' },
      { label: 'stack', meta: 'languages, tools, frameworks', cmd: 'stack' },
      { label: 'about', meta: 'the person behind the code', cmd: 'about' },
      { label: 'contact', meta: 'copies the email', cmd: 'contact' },
      { label: 'brew <roast>', meta: 'switch the theme', cmd: 'brew' },
      { label: 'coffee', meta: 'you will see', cmd: 'coffee' },
      { label: 'clear', meta: 'start over', cmd: 'clear' },
    ]);
  }

  async function cmdProjects() {
    await call('list_projects');
    await say(`${PROJECTS.length} of them. tap one:`);
    rows(PROJECTS.map((p) => ({ label: p.name, meta: p.tags.slice(0, 3).join(' · '), cmd: `open ${p.id}` })));
  }

  async function cmdOpen(rest) {
    const p = findProject(rest);
    if (p) {
      await call('get_project', `"${p.id}"`);
      await say(`opening ${p.name}…`);
      await sleep(450);
      close();
      go(`#/p/${p.id}`);
      return;
    }
    // "show me python projects" names a tool, not a project.
    const tool = findTool(rest);
    if (tool) return cmdTool(tool);
    const section = rest.split(' ').map((w) => (w === 'home' ? 'top' : w)).find((w) => SECTIONS.includes(w));
    if (section) return cmdGoto(section);

    await call('get_project', `"${clip(rest, 30)}"`);
    fail('get_project', 'nothing by that name');
    await say('here is what there is:');
    rows(PROJECTS.map((p) => ({ label: p.name, cmd: `open ${p.id}` })));
  }

  async function cmdGoto(id) {
    const target = id === 'home' ? 'top' : id;
    if (!SECTIONS.includes(target)) return cmdUnknown(`goto ${id}`);
    await call('scroll_to', `"#${target}"`, 220);
    close();
    gotoSection(target);
  }

  async function cmdDescribe(p) {
    await call('get_project', `"${p.id}"`);
    await say(p.short);
    const next = [{ label: `open ${p.label || p.name} →`, cmd: `open ${p.id}` }];
    if (p.watch) next.push({ label: 'watch the demo ↗', href: p.watch });
    next.push({ label: 'source on github ↗', href: p.url });
    rows(next);
  }

  async function cmdTool(tag) {
    const users = PROJECTS.filter((p) => p.tags.includes(tag));
    await call('find_projects', `tool="${tag}"`);
    await say(users.length === 1
      ? `${tag} shows up in one project:`
      : `${tag} shows up in ${users.length} projects${users.length >= 4 ? ' — clearly a favourite' : ''}:`);
    rows([
      ...users.map((p) => ({
        label: p.name,
        meta: p.tags.filter((t) => t !== tag).slice(0, 2).join(' · '),
        cmd: `open ${p.id}`,
      })),
      { label: `see ${tag} on the brew map →`, cmd: `map ${tag}` },
    ]);
  }

  async function cmdMap(rest) {
    const tag = rest ? findTool(rest) : null;
    await call('scroll_to', '"#map"', 220);
    close();
    gotoSection('map');
    if (tag) pinTool?.(tag);
  }

  async function cmdBest() {
    const p = PROJECTS[0];
    await call('rank_projects', 'by="how long Arry would talk about it at a party"', 700);
    await say(`${p.name}. ${p.short}`);
    await say("it's first on the list for a reason.");
    const next = [{ label: `open ${p.label || p.name} →`, cmd: `open ${p.id}` }];
    if (p.watch) next.push({ label: 'watch the demo ↗', href: p.watch });
    rows(next);
  }

  async function cmdAbout() {
    const first = document.querySelector('.about-copy p')?.textContent.trim();
    await call('read_page', '"#about"');
    await say(first || 'final-year AI/ML student who builds agents and RAG pipelines.');
    rows([{ label: 'read the rest →', cmd: 'goto about' }]);
  }

  async function cmdStack() {
    const groups = [...document.querySelectorAll('.skill-grid > div')]
      .map((d) => [d.querySelector('.skill-grid__t')?.textContent.trim(), d.querySelector('.skill-grid__v')?.textContent.trim()])
      .filter(([t, v]) => t && v);
    await call('read_page', '"#about .skill-grid"');
    for (const [title, value] of groups) await say(`${title.toLowerCase()} — ${value}`);
    const s = mapStats();
    if (s.topCount >= 3) await say(`${s.top} shows up in ${s.topCount} of ${s.projects} projects. surprising nobody.`);
    rows([{ label: 'see how it all connects →', cmd: 'goto map' }]);
  }

  async function cmdStats() {
    const s = mapStats();
    await call('count_things');
    await say(`${s.projects} projects, ${s.tools} tools, and ${s.top} in ${s.topCount} of them.`);
  }

  async function cmdContact() {
    const mail = document.querySelector('.contact-mail')?.textContent.trim() || '';
    await call('copy_to_clipboard', `"${mail}"`, 380);
    let copied = false;
    try { await navigator.clipboard.writeText(mail); copied = true; } catch { /* no permission */ }
    await say(copied
      ? `copied ${mail} to your clipboard. Arry reads everything, and replies faster than is probably healthy.`
      : `here you go: ${mail}`);
    rows([
      { label: 'open your mail app ↗', href: `mailto:${mail}` },
      { label: 'or use the form →', cmd: 'goto contact' },
    ]);
  }

  async function cmdAvailable() {
    const status = document.querySelector('.badge--hot')?.textContent.trim() || 'available';
    await call('check_status', '', 350);
    await say(`status: ${status}.`);
    rows([{ label: 'copy the email →', cmd: 'contact' }]);
  }

  async function cmdRoast(rest) {
    if (!rest) {
      await call('list_roasts');
      await say('five on the menu:');
      rows(ROASTS.map((r) => ({
        label: `brew ${r.name.toLowerCase()}`,
        meta: r.id === currentRoast().id ? 'current' : '',
        cmd: `brew ${r.id}`,
      })));
      return;
    }
    const r = findRoast(rest);
    await call('set_roast', `"${r ? r.id : clip(rest, 24)}"`);
    if (!r) {
      fail('set_roast', `no "${clip(rest, 24)}" on the menu`);
      rows(ROASTS.map((x) => ({ label: `brew ${x.name.toLowerCase()}`, cmd: `brew ${x.id}` })));
      return;
    }
    applyRoast(r);
    await say(ROAST_LINES[r.id] || `${r.name}.`);
  }

  async function cmdCoffee() {
    await call('make_it_rain', '', 300);
    beanRain?.();
    await say(pick(COFFEE_QUOTES));
  }

  async function cmdSudo(text) {
    await call('sudo', `"${clip(text.replace(/^sudo\s*/i, ''), 30)}"`, 300);
    fail('sudo', 'permission denied. this incident will be reported to the barista.');
  }

  async function cmdUnknown(text) {
    await call('understand', `"${clip(text, 36)}"`, 520);
    fail('understand', 'not enough coffee to parse that');
    await say('try "help", or ask about a project or a tool.');
  }

  /* ----------------------------------------------------------- router --- */
  /* Specific beats generic: a project or tool named anywhere in the question
     wins over the broad intents, so "tell me about logmind" is about
     LogMind and not about Arry. */

  async function route(text) {
    const q = norm(text);
    const [first, ...tail] = q.split(' ');
    const rest = tail.join(' ');
    let m;

    if (/^(clear|cls)$/.test(q)) { log.innerHTML = ''; return; }
    if (/^(help|commands|menu|\?)$/.test(q) || /what can you do/.test(q)) return cmdHelp();
    if (first === 'sudo') return cmdSudo(text);
    if (first === 'goto') return cmdGoto(rest);
    if (first === 'map') return cmdMap(rest);
    // (?!to ) keeps "open to work" out of here; it is a question about
    // availability, not a request to open a project called "to work".
    if ((m = q.match(/^(open|show|view|go to|take me to|launch) (?!to )(.+)$/))) return cmdOpen(m[2]);
    if ((m = q.match(/^(brew|roast|theme|switch to|switch)\b ?(.*)$/))) return cmdRoast(m[2]);
    if (ROASTS.some((r) => norm(r.name) === q)) return cmdRoast(q);

    const project = findProject(q);
    if (project) return cmdDescribe(project);
    const tool = findTool(q);
    if (tool) return cmdTool(tool);

    if (/\b(available|availability|hiring|open to work|looking for|intern)/.test(q)) return cmdAvailable();
    if (/\b(contact|email|e mail|mail|hire|reach|talk|dm)\b/.test(q)) return cmdContact();
    if (/\b(best|favou?rite|proudest|flagship|coolest|top)\b/.test(q)) return cmdBest();
    if (/\b(ls|projects?|work|portfolio|built|build|made|demos?)\b/.test(q)) return cmdProjects();
    if (/\b(stack|skills?|tools|tech|languages?|frameworks?)\b/.test(q)) return cmdStack();
    if (/\b(stats|how many|count|numbers)\b/.test(q)) return cmdStats();
    if (/\b(about|who|whoami|yourself|bio|arry|aryan)\b/.test(q)) return cmdAbout();
    if (/\b(coffee|beans?|rain|caffeine)\b/.test(q)) return cmdCoffee();
    if (/^(hi|hey|hello|yo|sup|hola|namaste|heya)\b/.test(q)) {
      return say("hey! ask about Arry's projects, the stack, or the coffee situation. or type help.");
    }
    if (/\b(thanks|thank you|thx|ty|cheers)\b/.test(q)) return say('anytime. well — until the coffee runs out.');
    return cmdUnknown(text);
  }

  /* -------------------------------------------------------- execution --- */
  /* One answer streams at a time. A command that arrives mid-stream hurries
     the current one to the end and then runs; only the latest waiting
     command is kept, so mashing a chip does not queue ten answers. */

  let busy = false;
  let queued = null;

  async function exec(task, echoText) {
    if (busy) { queued = { task, echoText }; hurry(); return; }
    busy = true;
    fast = false;
    if (echoText) echo(echoText);
    try {
      await task();
    } catch (err) {
      console.error('[brewbot]', err);
      fail('runtime', 'something spilled. try again?');
    }
    busy = false;
    if (queued) {
      const next = queued;
      queued = null;
      exec(next.task, next.echoText);
    }
  }

  function run(text) {
    const t = String(text).trim();
    if (t) exec(() => route(t), t);
  }

  /* ------------------------------------------------------- open/close --- */

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.inert = false;
    panel.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    input.focus({ preventScroll: true });
    if (!greeted) { greeted = true; exec(cmdWake); }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    panel.inert = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.focus({ preventScroll: true });
  }

  fab.addEventListener('click', () => (isOpen ? close() : open()));
  panel.querySelector('.bot__close').addEventListener('click', close);

  panel.querySelector('.bot__chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    const c = chip.dataset.chip;
    if (c !== 'surprise me') { run(c); return; }
    const p = pick(PROJECTS);
    run(pick(['coffee', 'best', `brew ${pick(ROASTS).id}`, pick(TAGS).toLowerCase(), p.label || p.name]));
  });

  /* ------------------------------------------------------------ input --- */

  const history = [];
  let hIndex = 0;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    input.value = '';
    if (!v) return;
    history.push(v);
    hIndex = history.length;
    run(v);
  });

  const COMMANDS = ['help', 'projects', 'open ', 'best', 'about', 'stack', 'contact', 'brew ', 'coffee', 'stats', 'clear'];

  function complete(value) {
    const v = value.toLowerCase();
    if (v.startsWith('open ')) {
      const pre = v.slice(5);
      const p = PROJECTS.find((x) => x.id.startsWith(pre) || x.name.toLowerCase().startsWith(pre));
      return p ? `open ${p.id}` : null;
    }
    if (v.startsWith('brew ')) {
      const pre = v.slice(5);
      const r = ROASTS.find((x) => x.id.startsWith(pre) || x.name.toLowerCase().startsWith(pre));
      return r ? `brew ${r.id}` : null;
    }
    return COMMANDS.find((c) => c.startsWith(v)) || null;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && hIndex > 0) {
      hIndex -= 1;
      input.value = history[hIndex];
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && hIndex < history.length) {
      hIndex += 1;
      input.value = history[hIndex] ?? '';
      e.preventDefault();
    } else if (e.key === 'Tab' && input.value.trim()) {
      // Only swallow Tab when there is something to complete, so it still
      // moves focus out of the field for keyboard users.
      const c = complete(input.value);
      if (c && c !== input.value) { input.value = c; e.preventDefault(); }
    }
  });

  // "/" anywhere opens it, the way it focuses search on most dev sites —
  // unless you are already typing somewhere.
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) { close(); return; }
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    open();
  });

  return { open, close, run };
}
