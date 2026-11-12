/* Content. Every fact here is Arry's — the site is a shell around it.

   The home page's standing copy (hero, focus areas, about, contact) lives in
   index.html as real markup so it survives with JS off. This file holds what
   is rendered at runtime: the featured work, the project cards, the project
   pages, the GitHub list and the upstream fixes.

   Order matters. `featured: true` marks the three projects on the résumé —
   they run first, large, in résumé order. Everything else comes from GitHub
   and runs as a card. To promote or demote a project, flip the flag and move
   it; nothing else needs to change. */

export const PROJECTS = [
  /* ------------------------------------------------ on the résumé ------ */
  {
    id: 'quant-copilot',
    featured: true,
    name: 'Quant Copilot',
    sub: 'Agentic Quantitative Research Copilot',
    area: 'Agents · Finance',
    headline: 'Agent chains eight tools to answer a finance question — then trims its own context by 98%',
    url: 'https://github.com/Aryan-Kochhar/Agentic-Quantitative-Research-Copilot',
    short:
      'An agent that answers natural-language finance queries by chaining 8 custom tools over MCP — market data, backtesting, VaR, correlation, drawdown. Streams reasoning live over WebSocket, with a Redis + MongoDB Atlas two-tier cache and a Groq-to-local-Ollama fallback.',
    long:
      'Ask it something like "what’s the max drawdown of MSFT this year" and it plans its own tool calls — pulling live prices, running the quant analysis, and streaming each step (tool_call → tool_done → answer) to the frontend over WebSocket. Backed by a two-tier cache (Redis for hot queries, MongoDB Atlas for price history) and a Groq-to-local-Ollama fallback so it stays available even under rate limits.',
    points: [
      'Answers natural-language finance queries by autonomously chaining tool calls in an LLM function-calling loop — 8 custom tools covering market data, backtesting, VaR, correlation and drawdown analysis.',
      'Streams tool-call progress live to the frontend over WebSocket, backed by a two-tier cache (Redis for queries, MongoDB Atlas for price history), with a Groq-to-local-Ollama fallback under rate limits.',
      'Cut LLM context 98% (13,000 to 250 chars) by compacting tool results, and built a backtesting engine (Sharpe, volatility, max drawdown) for US and Indian (NSE/BSE) equities.',
    ],
    stats: [
      { n: '98%', l: 'less LLM context', d: '13,000 → 250 chars per tool result' },
      { n: '8', l: 'custom tools', d: 'prices, backtests, VaR, correlation, drawdown' },
      { n: '2', l: 'cache tiers', d: 'Redis for queries, Atlas for price history' },
    ],
    note: 'tool_call → tool_done → answer',
    tags: ['Python', 'MCP', 'RAG', 'Finance'],
    stack: ['Python', 'MCP', 'WebSocket', 'Redis', 'MongoDB Atlas', 'Groq', 'Ollama'],
    demos: [
      { type: 'video', src: 'assets/demos/quant-copilot/agent-run.webm',   poster: 'assets/demos/quant-copilot/agent-run.webp',   caption: 'The agent planning its own tool calls' },
      { type: 'video', src: 'assets/demos/quant-copilot/tool-stream.webm', poster: 'assets/demos/quant-copilot/tool-stream.webp', caption: 'tool_call → tool_done → answer, streamed over WebSocket' },
      { type: 'video', src: 'assets/demos/quant-copilot/landing.webm',     poster: 'assets/demos/quant-copilot/landing.webp',     caption: 'Asking it for a max drawdown' },
      { type: 'image', src: 'assets/demos/quant-copilot/hero.webp',                                                               caption: 'Eight quant tools, exposed over MCP' },
    ],
  },
  {
    id: 'logmind',
    featured: true,
    name: 'LogMind',
    sub: 'AI Server Log Analyzer',
    area: 'RAG · Infra',
    headline: 'Log analyzer retires grep; its anomaly scan now runs 293× faster',
    url: 'https://github.com/Aryan-Kochhar/LogMind---Server-Log-Analyzer',
    short:
      'A RAG-powered log analyzer — ask natural-language questions about server logs instead of grepping through them. Semantic vector search and anomaly detection via MongoDB Atlas, with a Streamlit dashboard and CLI.',
    long:
      'Point it at a log file and just talk to it — "what happened on the 17th" or "are there any security threats" — and it answers using RAG over your own logs, no cloud LLM required (runs on local Ollama). It auto-flags error spikes and known-bad keywords like timeout and deadlock, and ships with both a CLI and a Streamlit dashboard for browsing, filtering, and exporting.',
    points: [
      'A RAG chat interface over server logs so users ask natural-language questions instead of grepping; supports Apache and standard formats through a Streamlit dashboard and CLI.',
      'Cut per-query LLM context 99.97% (369K to 108 tokens) by embedding each log entry as a 384-dim MiniLM vector in MongoDB Atlas and retrieving only the top 3 matches, at 259 ms median retrieval latency.',
      'Profiled and rewrote both hot paths: 2.6x faster ingestion via batched embeddings and bulk writes, and 293x faster anomaly detection (2.31 s to 8 ms per 10K entries) by fixing a quadratic scan.',
    ],
    stats: [
      { n: '293×', l: 'faster anomaly scan', d: '2.31 s → 8 ms per 10K entries' },
      { n: '99.97%', l: 'less context per query', d: '369K → 108 tokens' },
      { n: '259 ms', l: 'median retrieval', d: 'top 3 of 384-dim MiniLM vectors' },
      { n: '2.6×', l: 'faster ingestion', d: 'batched embeddings, bulk writes' },
    ],
    note: 'it was O(n²). oops.',
    tags: ['Python', 'RAG', 'MongoDB'],
    stack: ['Python', 'RAG', 'Embeddings', 'MongoDB Atlas', 'Streamlit', 'Ollama'],
    demos: [
      { type: 'image', src: 'assets/demos/logmind/dashboard.webp',   caption: 'Asking a log file what happened on the 17th' },
      { type: 'image', src: 'assets/demos/logmind/streamlit-1.webp', caption: 'Anomaly flags on error spikes' },
      { type: 'image', src: 'assets/demos/logmind/streamlit-2.webp', caption: 'Semantic search across the index' },
      { type: 'image', src: 'assets/demos/logmind/streamlit-3.webp', caption: 'Filtering and exporting matches' },
    ],
  },
  {
    id: 'architech',
    featured: true,
    name: 'ArchiTech',
    sub: 'Text-to-3D City Generator',
    area: 'LLM pipeline · 3D',
    headline: 'A sentence goes in, a 3D city comes out — and a validator sends back the bad drafts',
    url: 'https://github.com/Aryan-Kochhar/-ArchiTech-',
    short:
      'Turns a text prompt into a structured 3D city layout. A multi-stage LLM pipeline with a self-correcting validator loop and embedding-based retrieval of layout templates for tricky spatial phrasing.',
    long:
      'Feed it a prompt like "two rows of buildings split by a river" and a local planner LLM sketches the zones, a Groq-hosted model places exact grid coordinates, and a deterministic (no-LLM) validator checks the result for overlaps, adjacency, and symmetry — kicking it back for another pass if it fails. A RAG variant retrieves the closest hand-built layout template first, which held up far better on tricky spatial language like "surrounding" or "on both sides."',
    points: [
      'A multi-stage LLM pipeline that turns a text prompt into a 3D city layout: a local model plans the scene, a hosted model places coordinates, and a Python validator checks spatial correctness.',
      'A self-correcting loop checks entity counts against the prompt and sends structured corrections back to the placement model, with layout templates retrieved by embedding similarity for tricky spatial phrasing.',
    ],
    stats: [
      { n: '3', l: 'stages', d: 'plan → place → validate' },
      { n: '0', l: 'LLMs in the validator', d: 'deterministic checks for overlap, adjacency, symmetry' },
    ],
    note: '“surrounding” is hard, ok',
    tags: ['Python', 'LLM Pipeline', '3D'],
    stack: ['Python', 'RAG', 'Embeddings', 'Groq'],
    demos: [
      { type: 'video', src: 'assets/demos/architech/city.webm',   poster: 'assets/demos/architech/city.webp',   caption: 'A text prompt becoming a validated city layout' },
      { type: 'video', src: 'assets/demos/architech/city-2.webm', poster: 'assets/demos/architech/city-2.webp', caption: 'The validator loop rejecting and re-placing' },
      { type: 'image', src: 'assets/demos/architech/scene-road.webp',    caption: '"two rows of buildings split by a river"' },
      { type: 'image', src: 'assets/demos/architech/scene-park.webp',    caption: '"a square park, buildings surrounding"' },
      { type: 'image', src: 'assets/demos/architech/scene-harbour.webp', caption: '"a harbour, warehouses along the quay"' },
      { type: 'image', src: 'assets/demos/architech/scene-water.webp',   caption: '"water on all sides"' },
    ],
  },

  /* ------------------------------------------------ from GitHub -------- */
  {
    id: 'fact-knowledge-layer',
    name: 'Fact Knowledge Layer',
    area: 'Knowledge graph',
    headline: 'Every fact gets a quote; every disagreement gets an explanation',
    url: 'https://github.com/Aryan-Kochhar/fact-knowledge-layer',
    watch: 'https://www.youtube.com/watch?v=1nwO144tIu0',
    short:
      'Extracts checkable facts from PDFs, anchors every one to a verbatim quote on its source page, then works out how facts from different documents relate — whether they corroborate, genuinely conflict, or only look like they conflict because they were measured over different periods, units or scopes.',
    long:
      'Point it at a pile of PDFs and it pulls out every checkable claim, anchoring each to the exact sentence it came from so nothing is unsourced. Then it reconciles them across documents: two reports agreeing is corroboration, two disagreeing is a contradiction, and two that only appear to disagree because one covers a quarter and the other a full year is a context conflict — which it explains rather than flags. FastAPI and SQLite behind a React frontend, extraction and reconciliation on Gemini’s free tier, and semantic similarity running locally on sentence-transformers so no tokens are spent just finding candidate pairs. On the six starter documents: 3,460 facts, every one with a located quote, 1,377 relationships, 279 API calls.',
    stats: [
      { n: '3,460', l: 'facts extracted', d: 'every one with a located quote' },
      { n: '1,377', l: 'relationships', d: 'across six starter documents' },
      { n: '279', l: 'API calls', d: 'on Gemini’s free tier' },
    ],
    tags: ['Python', 'FastAPI', 'Knowledge Graph', 'React'],
    stack: ['Python', 'FastAPI', 'SQLite', 'React', 'Gemini', 'Embeddings'],
    demos: [
      { type: 'image', src: 'assets/demos/fact-knowledge-layer/demo-video.webp', caption: 'Three minutes: all four reconciliation cases, then a live ingest' },
    ],
  },
  {
    id: 'rl-nav-failure-modes',
    name: 'PPO Failure Modes',
    area: 'RL research',
    headline: 'One policy, 27 worlds: a field guide to how PPO navigation fails',
    url: 'https://github.com/Aryan-Kochhar/PPO-Navigation-Under-Environment-Shift',
    short:
      'A study of where reinforcement-learning navigation breaks when the world shifts: a PPO policy trained in one environment and tested in all 27, every failure labelled against a taxonomy fixed in advance, and the freezing-versus-collision trade-off traced to its knee.',
    long:
      'Train a PPO navigation policy at one cell of a 3×3×3 grid — obstacle speed × density × motion pattern — then drop it into all 27 and study how it fails. Study A labels every failed episode against a taxonomy fixed before the full run, so the categories can’t bend to fit the results, and defines freezing carefully enough to tell it apart from sensibly yielding. Study B sweeps the safety weight and finds the knee of the freezing–collision frontier, with bootstrap confidence intervals. A*, fixed-safety PPO and adaptive-risk PPO run on the same grid as baselines, and every number in the paper is filled in from the results by script rather than typed by hand. Co-written with Ankit Dey, Eshaan Dinesh and Mohan Ram Sridhar at VIT Chennai.',
    stats: [
      { n: '27', l: 'environment cells', d: 'speed × density × motion pattern' },
      { n: '3', l: 'baselines', d: 'A*, fixed-safety PPO, adaptive-risk PPO' },
    ],
    tags: ['Python', 'Reinforcement Learning', 'PyTorch', 'Research'],
    stack: ['Python', 'PyTorch', 'Reinforcement Learning'],
    demos: [
      { type: 'video', src: 'assets/demos/rl-nav/freezing.webm',   poster: 'assets/demos/rl-nav/freezing.webp',   caption: 'Freezing in a dense cell: a clear move exists, and the robot won’t take it' },
      { type: 'video', src: 'assets/demos/rl-nav/collisions.webm', poster: 'assets/demos/rl-nav/collisions.webp', caption: 'The other end of the trade-off: collisions' },
      { type: 'image', src: 'assets/demos/rl-nav/frontier.webp',            caption: 'The freezing–collision frontier, one curve per cell, knee starred' },
      { type: 'image', src: 'assets/demos/rl-nav/failure-composition.webp', caption: 'What each failure actually was, cell by cell' },
      { type: 'image', src: 'assets/demos/rl-nav/success-heatmap.webp',     caption: 'Success rate across all 27 environment cells' },
    ],
  },
  {
    id: 'quakeflow',
    name: 'QuakeFlow',
    area: 'Data engineering',
    headline: 'An earthquake pipeline that expects the data to change its mind',
    url: 'https://github.com/Aryan-Kochhar/Quakeflow',
    short:
      'An incremental ELT pipeline for live global earthquake data: USGS events validated with pydantic, loaded idempotently into DuckDB, modelled by dbt into tested marts, and shown on a Streamlit dashboard.',
    long:
      'Earthquake data is messy in ways toy datasets aren’t, and the pipeline is built around that. USGS keeps revising events for days, so every run re-reads a lookback window and only overwrites a row when the revision is newer. The API caps a query at 20,000 events, so busy windows are bisected until they fit instead of being silently truncated. Bad records go to a quarantine table rather than vanishing, the watermark only advances after a fully successful run, and 20+ dbt tests check the numbers — one of which caught USGS sending a status in the wrong case. The first backfill loaded 10,029 real events in about 27 seconds.',
    stats: [
      { n: '10,029', l: 'events in the first backfill', d: 'loaded in about 27 seconds' },
      { n: '20+', l: 'dbt tests', d: 'one caught USGS sending a status in the wrong case' },
    ],
    tags: ['Python', 'DuckDB', 'dbt', 'Data Engineering'],
    stack: ['Python', 'DuckDB', 'dbt', 'pydantic', 'Streamlit'],
    demos: [],
  },
  {
    id: 'typeform-clone',
    name: 'Typeform Clone',
    area: 'Full-stack',
    headline: 'A Typeform clone, end to end: builder, logic jumps, and the one-question-at-a-time flow',
    url: 'https://github.com/Aryan-Kochhar/Scaler-AI-Typeform-Builder-Clone',
    live: 'https://scaler-ai-typeform-builder-clone.vercel.app',
    short:
      'A full-stack clone of Typeform: a three-pane drag-and-drop builder with a live preview, nine question types, logic jumps and themes, a public one-question-at-a-time respondent flow, and per-question results.',
    long:
      'Build a form in a three-pane editor — question list, live canvas, settings — with drag-and-drop reordering that works from the keyboard too, inline editing right on the canvas, nine question types including file upload, and autosave. Logic jumps send each answer to a later question or straight to the end, and skipped questions are enforced on the server as well as in the browser. Publish to a public link and respondents get the familiar one-question-at-a-time flow, no login needed. Next.js 16 and Tailwind on Vercel, FastAPI with SQLAlchemy and SQLite on Render — whose free tier sleeps, so the live demo can take up to a minute to wake.',
    stats: [
      { n: '9', l: 'question types', d: 'including file upload' },
      { n: '3', l: 'panes', d: 'question list, live canvas, settings' },
    ],
    tags: ['TypeScript', 'Next.js', 'FastAPI', 'SQLite'],
    stack: ['TypeScript', 'Next.js', 'Tailwind', 'FastAPI', 'SQLite'],
    demos: [
      { type: 'image', src: 'assets/demos/typeform-clone/workspace.webp', caption: 'The workspace: drafts, published forms and response counts' },
    ],
  },
  {
    id: 'aadhaar-ocr',
    name: 'Aadhaar Card OCR API',
    label: 'Aadhaar OCR',
    area: 'OCR · API',
    headline: 'Two photos of a card in, structured JSON out',
    url: 'https://github.com/Aryan-Kochhar/Aadhar-Card-OCR-API',
    short:
      'A lightweight Flask REST API that extracts name, DOB, gender, ID number, address and guardian info from Aadhaar card images using Tesseract OCR.',
    long:
      'Send it front and back images of an Indian Aadhaar card and it hands back structured JSON — name, DOB, gender, Aadhaar number, address, pincode, guardian info — pulled out with Tesseract OCR. Ships as a Flask API, a Flask-RESTful variant, and a bare local-file version, all sharing the same OCR core.',
    // No screenshots in the repo, so the card shows the shape of what the
    // API hands back instead: the field names, straight from its README.
    motif: ['{', '  name, dob, gender,', '  aadhaar_number,', '  address, pincode,', '  guardian', '}'],
    tags: ['Flask', 'OCR', 'REST API'],
    stack: ['Python', 'Flask', 'Tesseract OCR'],
    demos: [],
  },
  {
    id: 'congestion-rl',
    name: 'Congestion Control with RL',
    label: 'Congestion RL',
    area: 'RL · Simulation',
    headline: 'A Q-learning agent retimes the lights — and waves the ambulance through',
    url: 'https://github.com/Aryan-Kochhar/Congestion-Control-With-RL',
    short:
      'A SUMO traffic simulation combining reinforcement learning with real-time detection to optimize traffic flow under changing conditions.',
    long:
      'A SUMO-based intersection simulation where a Q-learning agent watches queue lengths, wait times, and vehicle density, then adjusts signal timing to keep traffic moving — while automatically clearing a path and giving right-of-way the moment it detects an emergency vehicle.',
    tags: ['Python', 'Reinforcement Learning', 'SUMO'],
    stack: ['Python', 'Reinforcement Learning', 'SUMO'],
    demos: [
      { type: 'video', src: 'assets/demos/congestion-rl/intersection.webm', poster: 'assets/demos/congestion-rl/intersection.webp', caption: 'Q-learning agent retiming signals, and yielding to an emergency vehicle' },
    ],
  },
  {
    id: 'resonance',
    name: 'Resonance',
    area: 'Signal processing',
    headline: 'Teaching a network to hear through the static',
    url: 'https://github.com/Aryan-Kochhar/Resonance',
    short:
      'Exploring data-driven denoising of wireless communication channels to improve the reliability and efficiency of modern wireless systems like 5G and IoT.',
    long:
      'A group-project contribution exploring learned, data-driven denoising for wireless channels — aiming to squeeze more reliability and efficiency out of 5G/IoT-style links than classical signal-processing approaches manage on their own.',
    tags: ['Python', 'Signal Processing', '5G/IoT'],
    stack: ['Python', 'Signal Processing'],
    demos: [
      { type: 'image', src: 'assets/demos/resonance/poster.webp',    caption: 'Learned vs. classical denoising, across channel conditions' },
      { type: 'image', src: 'assets/demos/resonance/heatmap-0.webp', caption: 'Channel estimate before and after denoising' },
      { type: 'image', src: 'assets/demos/resonance/spectral.webp',  caption: 'Spectral view of a single sample' },
      { type: 'image', src: 'assets/demos/resonance/ber.webp',       caption: 'Bit error rate against SNR' },
      { type: 'image', src: 'assets/demos/resonance/curves.webp',    caption: 'Training curves' },
    ],
  },
];

/* ----------------------------------------------------- also on GitHub -- */
/* "Also on GitHub" lists the rest of the public repos, fetched live from the
   GitHub API so a new repo shows up without touching this file. These are the
   same rows as of the last edit, used when the API is unreachable or
   rate-limited (60 requests an hour per visitor IP, unauthenticated). */

export const GITHUB_USER = 'Aryan-Kochhar';

/* Never listed: this site, scratch repos, and coursework. */
export const WIRE_SKIP = [
  'Portfolio', 'website-testing', 'Testing-', 'DSA', 'rl-lab-da1',
  'E-Commerce-Website', 'Web-Project-Webpage', 'Text-To-Speech',
];

export const WIRE_FALLBACK = [
  {
    name: 'RAG-based-Question-Answering-with-Perplexity', lang: 'Python', pushed: '2025-07-18',
    desc: 'A lightweight RAG-based app that lets you upload PDFs, extract text, and ask questions using Perplexity AI with optional ChromaDB integration for context retrieval.',
  },
  {
    name: 'Amazon-Web-Scraper-For-Smartphones', lang: 'Python', pushed: '2025-06-23',
    desc: 'Scrapes smartphone details under ₹20,000 from Amazon India using Selenium and BeautifulSoup — names, prices, ratings, reviews and links, saved to CSV.',
  },
  {
    name: 'NLP-Spam-Email-Classification', lang: 'Jupyter Notebook', pushed: '2025-06-23',
    desc: 'Notebooks that preprocess SMS and email text, extract features, and compare models for detecting spam.',
  },
  {
    name: 'Tracking-Objects-by-CamShift', lang: 'Python', pushed: '2025-03-22',
    desc: 'Real-time object tracking with the CamShift algorithm in OpenCV: pick a region of interest and the box follows it by HSV colour histogram.',
  },
];

/* ------------------------------------------------------------ upstream -- */
/* Fixes sent to other people's libraries. Merged ones only — each was checked
   against the GitHub API when this list was written. */

export const UPSTREAM = [
  {
    lib: 'ffn', repo: 'pmorissette/ffn', pr: 308,
    text: 'The Ulcer Performance Index came out 100× too small — a decimal-fraction return divided by a percentage-scale index. Both now share a scale.',
  },
  {
    lib: 'ffn', repo: 'pmorissette/ffn', pr: 307,
    text: 'The Sortino ratio left the first period out of its downside deviation, so the result depended on the order of returns.',
  },
  {
    lib: 'ffn', repo: 'pmorissette/ffn', pr: 312,
    text: 'Probabilistic momentum ignored sample size, passing a raw information ratio to a t-distribution without the √n.',
  },
  {
    lib: 'ffn', repo: 'pmorissette/ffn', pr: 323,
    text: '<code>get_freq_name</code> didn’t recognise modern pandas frequency aliases.',
  },
  {
    lib: 'scikit-posthocs', repo: 'maximtrp/scikit-posthocs', pr: 101,
    text: 'The <code>outliers_gesd</code> mask pointed at the wrong observations.',
  },
  {
    lib: 'DSPy', repo: 'stanfordnlp/dspy', pr: 10408,
    text: 'Several return annotations said <code>bool</code> and returned something else.',
  },
];

/* --------------------------------------------------------------- quotes -- */
/* Arry's coffee one-liners, from the original site. The small "pour one"
   button in the bio shows one per click, and "Ask" answers with one if
   someone brings up coffee. */

export const COFFEE_QUOTES = [
  'ngl I needed that',
  'okay that hit the spot',
  'brb, refilling my cup',
  "yeah I'm definitely over-caffeinated",
  "coffee o'clock, always",
  'this is basically self-care at this point',
  'third one today, no shame',
  "keep clicking, I'm not judging",
  'my code runs better with more of these',
  'bas ek aur cup',
  "chalta hai, one more won't hurt",
  'atp just drink monster dude 🙏🙏',
];

/* Every tenth pour. */
export const COFFEE_TENTH = 'bas bas, itna kaafi hai 😅';
