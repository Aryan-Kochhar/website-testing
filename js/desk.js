/* Ask.

   A small agent-shaped thing: you ask a question, it shows a plan, a tool
   call or two, and an answer — the same tool_call → tool_done → answer rhythm
   the real projects stream over a WebSocket.

   It is not an LLM and says so on the dialog. Routing is a list of regexes
   tried in order; the "tools" are plain functions over data.js and a few
   facts below. Anything it can't place gets an honest shrug and suggestions. */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const CHIPS = [
  'what’s on the résumé?',
  'anything with RAG?',
  'show me the numbers',
  'is he available?',
  'the paper?',
  'open source?',
  'dark mode',
];

/* Other names a project answers to. Kept specific on purpose — "pipeline" or
   "form" would match half the site. */
const ALIASES = {
  'quant-copilot': ['quant copilot', 'quant', 'copilot', 'backtest', 'backtesting', 'drawdown', 'stocks', 'trading'],
  'logmind': ['logmind', 'log mind', 'log analyzer', 'log analyser', 'server logs', 'logs'],
  'architech': ['architech', 'archi tech', '3d city', 'text to city', '3d'],
  'fact-knowledge-layer': ['fact knowledge layer', 'knowledge layer', 'fact layer', 'pdf', 'pdfs'],
  'rl-nav-failure-modes': ['ppo', 'failure modes', 'navigation'],
  'quakeflow': ['quakeflow', 'quake flow', 'earthquake', 'earthquakes', 'usgs'],
  'typeform-clone': ['typeform', 'form builder'],
  'aadhaar-ocr': ['aadhaar', 'aadhar'],
  'congestion-rl': ['congestion', 'traffic', 'sumo'],
  'resonance': ['resonance', 'wireless', 'denoising', '5g'],
};

/* Words worth searching the projects for, and what they really mean. */
const TERMS = {
  rag: 'rag', retrieval: 'retriev', mcp: 'mcp', agent: 'agent', agents: 'agent', agentic: 'agent',
  llm: 'llm', rl: 'reinforcement learning', 'reinforcement learning': 'reinforcement learning',
  python: 'python', typescript: 'typescript', react: 'react', 'next.js': 'next.js', nextjs: 'next.js',
  fastapi: 'fastapi', flask: 'flask', streamlit: 'streamlit', redis: 'redis',
  mongo: 'mongodb', mongodb: 'mongodb', sqlite: 'sqlite', duckdb: 'duckdb', dbt: 'dbt',
  ollama: 'ollama', groq: 'groq', gemini: 'gemini', pytorch: 'pytorch', ocr: 'ocr',
  websocket: 'websocket', embeddings: 'embedding', embedding: 'embedding', vector: 'vector',
  finance: 'finance', 'data engineering': 'data engineering',
};

const has = (q, re) => re.test(q);
const quote = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* Whole word. */
const word = (s) => new RegExp(`(^|[^a-z0-9])${quote(s)}([^a-z0-9]|$)`);
/* Start of a word — so "rag" finds "RAG-powered" but not "drag-and-drop",
   and "agent" still finds "agents" and "agentic". */
const starts = (s) => new RegExp(`(^|[^a-z0-9])${quote(s)}`);

export function initDesk({ projects, upstream, quotes = [], actions }) {
  const dlg = $('#desk');
  const log = $('#deskLog');
  const form = $('#deskForm');
  const input = $('#deskIn');
  const chips = $('#deskChips');
  if (!dlg || !dlg.showModal) return { open() {} };

  const featured = projects.filter((p) => p.featured);
  const link = (p) => `<a href="#/p/${p.id}">${esc(p.name)}</a>`;
  const list = (ps, fn) => `<ul>${ps.map((p) => `<li>${fn(p)}</li>`).join('')}</ul>`;
  const headline = (p) => (p.stats?.length ? ` — ${esc(p.stats[0].n)} ${esc(p.stats[0].l)}` : '');

  /* ---------------------------------------------------------- routing -- */

  function findProject(q) {
    let best = null, len = 0;
    for (const p of projects) {
      for (const a of ALIASES[p.id] || [p.name.toLowerCase()]) {
        if (a.length > len && word(a).test(q)) { best = p; len = a.length; }
      }
    }
    return best;
  }

  function search(needle) {
    const re = starts(needle);
    return projects.filter((p) =>
      re.test([p.name, p.short, p.long, ...(p.tags || []), ...(p.stack || [])].join(' ').toLowerCase()));
  }

  function route(raw) {
    const q = raw.toLowerCase().replace(/[’‘]/g, "'").replace(/é/g, 'e').trim();

    // "dark" and "light" are ordinary words, so only treat them as a request
    // to change theme when the question is short or says so.
    const aboutTheme = q.split(/\s+/).length <= 3 || has(q, /mode|theme|switch|edition/);

    if (aboutTheme && has(q, /\b(dark|night|evening)\b/)) {
      return {
        intent: 'theme.set', steps: [['set_theme("dark")', 'done']],
        answer: 'Dark mode, coming up.', after: () => actions.setEdition('evening'),
      };
    }
    if (aboutTheme && has(q, /\b(light|day|morning)\b/)) {
      return {
        intent: 'theme.set', steps: [['set_theme("light")', 'done']],
        answer: 'Light mode it is.', after: () => actions.setEdition('morning'),
      };
    }

    if (has(q, /coffee|caffein|espresso|chai|latte|cappuccino/)) {
      const line = quotes.length ? quotes[(Math.random() * quotes.length) | 0] : 'no comment';
      return {
        intent: 'coffee.get', steps: [['get_coffee_order()', 'access denied: non-negotiable']],
        answer: `The order is non-negotiable and not up for discussion. All he’ll say on the record: “${esc(line)}”`,
      };
    }

    if (has(q, /jitter|easter egg/)) {
      return {
        intent: 'easter_egg', steps: [['find_easter_egg()', '1 page']],
        answer: 'There’s one: <a href="jitters/">The Jitters</a>. It gets worse the longer you stay.',
      };
    }

    if (has(q, /\brads\b|girlfriend|dating|single/)) {
      return {
        intent: 'off_the_record', steps: [['check_sources()', 'declined to comment']],
        answer: 'Strictly off the record. The footer says everything that needs saying.',
      };
    }

    const p = findProject(q);
    if (p) {
      const go = has(q, /\b(open|read|go to|take me|show me|view)\b/);
      const steps = [[`get_project("${p.id}")`, `1 project · ${p.demos.length} demo${p.demos.length === 1 ? '' : 's'}`]];
      if (p.stats?.length) steps.push([`get_stats("${p.id}")`, `${p.stats.length} numbers`]);
      if (go) steps.push([`open_project("${p.id}")`, 'opening']);
      const nums = p.stats?.length
        ? list(p.stats, (s) => `<b>${esc(s.n)}</b> ${esc(s.l)} <i>(${esc(s.d)})</i>`)
        : '';
      return {
        intent: 'project.get', steps,
        answer: `<b>${esc(p.name)}</b>${p.featured ? ' — one of the three on the résumé' : ''}. ${esc(p.short)}${nums}<p style="margin:.6rem 0 0"><a href="#/p/${p.id}">Full write-up →</a> · <a href="${p.url}" target="_blank" rel="noopener">Source ↗</a></p>`,
        after: go ? () => actions.open(p.id) : null,
      };
    }

    if (has(q, /hire|hiring|available|availability|open to|looking for|recruit|opportunit/)) {
      return {
        intent: 'availability.get', steps: [['get_status()', 'open to opportunities'], ['get_contact()', '1 inbox']],
        answer: 'Yes — open to opportunities. Fastest route is <a href="mailto:aryankochhar2005@gmail.com">aryankochhar2005@gmail.com</a>; he replies faster than he probably should.',
      };
    }
    if (has(q, /contact|e-?mail|\bmail\b|reach|\bdm\b|linkedin|twitter|\bx\b|instagram|github|social|talk to/)) {
      return {
        intent: 'contact.get', steps: [['get_contact()', '1 inbox · 4 profiles']],
        answer: 'Email is best: <a href="mailto:aryankochhar2005@gmail.com">aryankochhar2005@gmail.com</a>. Also on <a href="https://github.com/Aryan-Kochhar" target="_blank" rel="noopener">GitHub</a>, <a href="https://linkedin.com/in/aryan-kochhar" target="_blank" rel="noopener">LinkedIn</a>, <a href="https://x.com/AryanKochhar2" target="_blank" rel="noopener">X</a> and <a href="https://instagram.com/_aryankochhar" target="_blank" rel="noopener">Instagram</a>.',
        actionsRow: [['Go to the contact form', () => actions.goto('contact')]],
      };
    }

    if (has(q, /resume|\bcv\b|\bmain\b|featured|flagship|\bbest\b|\btop\b/)) {
      return {
        intent: 'projects.resume', steps: [['list_projects(on_resume=true)', `${featured.length} projects`]],
        answer: `Three projects are on the résumé:${list(featured, (f) => `${link(f)}${headline(f)}`)}`,
      };
    }

    for (const [k, needle] of Object.entries(TERMS)) {
      if (!word(k).test(q)) continue;
      const hits = search(needle);
      return {
        intent: 'projects.search', steps: [[`search_projects(q="${k}")`, `${hits.length} hit${hits.length === 1 ? '' : 's'}`]],
        answer: hits.length
          ? `${hits.length} ${hits.length === 1 ? 'project mentions' : 'projects mention'} <b>${esc(k)}</b>:${list(hits, (h) => `${link(h)} — ${esc(h.headline)}`)}`
          : `Nothing on file for <b>${esc(k)}</b>. Yet.`,
      };
    }

    if (has(q, /number|metric|stat|faster|speed|performance|result|impact|impress/)) {
      const rows = featured.flatMap((f) => (f.stats || []).slice(0, 2).map((s) => ({ f, s })));
      return {
        intent: 'stats.top', steps: [['get_stats(top=6)', `${rows.length} numbers`]],
        answer: `The ones he’d circle in pen:<ul>${rows.map(({ f, s }) => `<li><b>${esc(s.n)}</b> ${esc(s.l)} — ${link(f)} <i>(${esc(s.d)})</i></li>`).join('')}</ul>`,
      };
    }

    if (has(q, /paper|publication|publish|journal|forecast|bank fail|first author|research/)) {
      return {
        intent: 'research.get', steps: [['get_paper()', '1 manuscript · under review']],
        answer: 'First-author paper, under review at the <i>International Journal of Forecasting</i> (Elsevier): “Label Construction and the Measured Value of Nonlinear Forecasting Models: Evidence from Bank Failure Prediction.” Not published yet.',
        actionsRow: [['See it on the page', () => actions.goto('about')]],
      };
    }

    if (has(q, /open.?source|upstream|pull request|\bprs?\b|contribut|\bffn\b|dspy|posthocs|bug ?fix/)) {
      const libs = [...new Set(upstream.map((c) => c.lib))];
      return {
        intent: 'upstream.list', steps: [['list_upstream_fixes(merged=true)', `${upstream.length} merged`]],
        answer: `${upstream.length} fixes merged into other people’s libraries — ${libs.map(esc).join(', ')}. Highlights: an Ulcer Performance Index that was 100× too small, and a Sortino ratio that depended on the order of returns.`,
        actionsRow: [['See all of them', () => actions.goto('about')]],
      };
    }

    if (has(q, /\bintern(ship|ed|s)?\b|experience|worked|\bjob\b|company|we excel/)) {
      return {
        intent: 'experience.get', steps: [['get_experience()', '1 internship']],
        answer: 'AI/ML Intern at WE Excel Software, June 2025, on-site. He built an OCR pipeline that pulls data from Aadhaar and PAN cards for an internal HRMS, and tuned retrieval for a RAG-based HR chatbot.',
      };
    }
    if (has(q, /college|university|\bvit\b|degree|cgpa|gpa|grade|stud(y|ent|ies)|education|graduat|b\.?tech/)) {
      return {
        intent: 'education.get', steps: [['get_education()', '1 degree in progress']],
        answer: 'B.Tech in Computer Science (AI &amp; ML) at Vellore Institute of Technology, August 2023 – July 2027. CGPA 9.27, if that matters to you.',
      };
    }
    if (has(q, /skill|stack|language|tools?\b|tech|know|framework/)) {
      return {
        intent: 'skills.get', steps: [['get_skills()', '4 groups']],
        answer: '<b>Languages:</b> Python, C, C++, Java, SQL. <b>AI/ML:</b> RAG, vector search, embeddings, LLM function calling, sentence-transformers, NumPy, Pandas, OpenCV. <b>Web:</b> HTML, CSS, JavaScript, REST APIs, WebSocket. <b>Tools:</b> FastAPI, MongoDB Atlas, Redis, Streamlit, Ollama, Git.',
      };
    }

    if (has(q, /\bwhere\b|chennai|india|based|location|live/)) {
      return {
        intent: 'location.get', steps: [['get_location()', 'Chennai, India']],
        answer: 'Chennai, India. The clock in the top bar is his actual local time.',
      };
    }

    if (has(q, /project|built|build|portfolio|made|everything|all of|\bwork\b/)) {
      const rest = projects.filter((x) => !x.featured);
      return {
        intent: 'projects.list', steps: [['list_projects()', `${projects.length} projects`]],
        answer: `${projects.length} projects. The three on the résumé: ${featured.map(link).join(', ')}. From GitHub: ${rest.map(link).join(', ')}.`,
      };
    }

    if (has(q, /\bwho\b|about|arry|aryan|kochhar|yourself|\bbio\b|intro/)) {
      return {
        intent: 'profile.get', steps: [['get_profile()', '1 person']],
        answer: 'Aryan “Arry” Kochhar — final-year AI/ML student at VIT, building agentic systems and RAG pipelines, with a focus on applying AI to finance and quantitative research.',
      };
    }

    if (has(q, /^(hi|hey|hello|yo|sup|namaste|hola)\b/)) {
      return { intent: 'smalltalk', steps: [], answer: 'Hello. Ask about the projects, the numbers, the paper, or how to reach him.' };
    }
    if (has(q, /thank|thanks|cheers|nice|cool|great/)) {
      return { intent: 'smalltalk', steps: [], answer: 'Anytime. Anything else?' };
    }
    if (has(q, /help|what can|commands/)) {
      return {
        intent: 'help', steps: [['list_tools()', '13 tools']],
        answer: 'You can look up a project by name, search by tool (“anything with FastAPI?”), or ask for the numbers, the paper, the upstream fixes, education, experience, skills and contact. It can also switch between light and dark.',
      };
    }

    return {
      intent: 'unknown', steps: [[`search_everything(q="${raw.slice(0, 40).replace(/"/g, '')}")`, '0 hits']],
      answer: 'Nothing on file for that. Try a project name, a tool like <b>RAG</b> or <b>FastAPI</b>, “the numbers”, or “is he available?”.',
    };
  }

  /* -------------------------------------------------------- rendering -- */

  const add = (html) => {
    log.insertAdjacentHTML('beforeend', html);
    log.scrollTop = log.scrollHeight;
    return log.lastElementChild;
  };
  const trace = (label, text, done) =>
    add(`<div class="trace${done ? ' is-done' : ''}"><b>${label}</b><span>${text}</span></div>`);

  let busy = false;

  async function ask(text) {
    const raw = text.trim();
    if (!raw || busy) return;
    busy = true;
    input.value = '';
    add(`<p class="desk__q">› ${esc(raw)}</p>`);

    const plan = route(raw);
    await wait(140);
    trace('plan', `intent = ${esc(plan.intent)}`);
    for (const [call, result] of plan.steps) {
      await wait(190);
      trace('tool_call', esc(call));
      const ms = 2 + Math.round(Math.random() * 28);
      await wait(160 + ms * 6);
      trace('tool_done', `${esc(result)} · ${ms} ms`, true);
    }
    await wait(180);
    const a = add(`<div class="desk__a">${plan.answer}</div>`);
    if (plan.actionsRow) {
      const row = document.createElement('p');
      row.style.margin = '.6rem 0 0';
      for (const [label, fn] of plan.actionsRow) {
        const b = document.createElement('a');
        b.href = '#/';
        b.textContent = `${label} →`;
        b.addEventListener('click', (e) => { e.preventDefault(); dlg.close(); fn(); });
        row.append(b);
      }
      a.append(row);
      log.scrollTop = log.scrollHeight;
    }
    busy = false;
    if (plan.after) { await wait(350); plan.after(); }
  }

  chips.innerHTML = CHIPS.map((c) => `<button type="button">${esc(c)}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) ask(b.textContent);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
    // A link to a project: let the hash change happen, but get out of the way.
    const a = e.target.closest('.desk__a a[href^="#/p/"]');
    if (a) dlg.close();
  });

  let greeted = false;
  function open(question) {
    if (!dlg.open) dlg.showModal();
    if (!greeted) {
      greeted = true;
      add('<div class="desk__a">Ask about Arry — a project, a tool, the numbers, the paper, or how to reach him.</div>');
    }
    input.focus();
    if (question) ask(question);
  }

  return { open };
}
