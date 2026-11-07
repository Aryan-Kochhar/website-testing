/* Content. Every word here is Arry's — the site is a shell around it.

   The home scroll's copy lives in index.html as real markup, not here: it has
   to survive with JS off and be readable to crawlers. This file holds only
   what is rendered at runtime — the project index, the detail pages, and the
   coffee button.

   There used to be PROFILE / FOCUS_AREAS / ABOUT exports duplicating the
   home scroll's copy. Nothing imported them, so editing a date or the CGPA
   here changed nothing on the page while looking like it should. Removed
   rather than wired up, because rendering the home scroll from JS would cost
   the no-JS and crawler behaviour above. index.html is the single source for
   that copy. */

export const PROJECTS = [
  {
    id: 'fact-knowledge-layer',
    name: 'Fact Knowledge Layer',
    url: 'https://github.com/Aryan-Kochhar/fact-knowledge-layer',
    watch: 'https://www.youtube.com/watch?v=1nwO144tIu0',
    short:
      'Extracts checkable facts from PDFs, anchors every one to a verbatim quote on its source page, then works out how facts from different documents relate — whether they corroborate, genuinely conflict, or only look like they conflict because they were measured over different periods, units or scopes.',
    long:
      'Point it at a pile of PDFs and it pulls out every checkable claim, anchoring each to the exact sentence it came from so nothing is unsourced. Then it reconciles them across documents: two reports agreeing is corroboration, two disagreeing is a contradiction, and two that only appear to disagree because one covers a quarter and the other a full year is a context conflict — which it explains rather than flags. FastAPI and SQLite behind a React frontend, extraction and reconciliation on Gemini’s free tier, and semantic similarity running locally on sentence-transformers so no tokens are spent just finding candidate pairs. On the six starter documents: 3,460 facts, every one with a located quote, 1,377 relationships, 279 API calls.',
    tags: ['Python', 'FastAPI', 'Knowledge Graph', 'React'],
    demos: [
      { type: 'image', src: 'assets/demos/fact-knowledge-layer/demo-video.webp', caption: 'Three minutes: all four reconciliation cases, then a live ingest' },
    ],
  },
  {
    id: 'rl-nav-failure-modes',
    name: 'PPO Failure Modes',
    url: 'https://github.com/Aryan-Kochhar/rl-nav-failure-modes',
    short:
      'A study of where reinforcement-learning navigation breaks when the world shifts: a PPO policy trained in one environment and tested in all 27, every failure labelled against a taxonomy fixed in advance, and the freezing-versus-collision trade-off traced to its knee.',
    long:
      'Train a PPO navigation policy at one cell of a 3×3×3 grid — obstacle speed × density × motion pattern — then drop it into all 27 and study how it fails. Study A labels every failed episode against a taxonomy fixed before the full run, so the categories can’t bend to fit the results, and defines freezing carefully enough to tell it apart from sensibly yielding. Study B sweeps the safety weight and finds the knee of the freezing–collision frontier, with bootstrap confidence intervals. A*, fixed-safety PPO and adaptive-risk PPO run on the same grid as baselines, and every number in the paper is filled in from the results by script rather than typed by hand. Co-written with Ankit Dey, Eshaan Dinesh and Mohan Ram Sridhar at VIT Chennai.',
    tags: ['Python', 'Reinforcement Learning', 'PyTorch', 'Research'],
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
    url: 'https://github.com/Aryan-Kochhar/Quakeflow',
    short:
      'An incremental ELT pipeline for live global earthquake data: USGS events validated with pydantic, loaded idempotently into DuckDB, modelled by dbt into tested marts, and shown on a Streamlit dashboard.',
    long:
      'Earthquake data is messy in ways toy datasets aren’t, and the pipeline is built around that. USGS keeps revising events for days, so every run re-reads a lookback window and only overwrites a row when the revision is newer. The API caps a query at 20,000 events, so busy windows are bisected until they fit instead of being silently truncated. Bad records go to a quarantine table rather than vanishing, the watermark only advances after a fully successful run, and 20+ dbt tests check the numbers — one of which caught USGS sending a status in the wrong case. The first backfill loaded 10,029 real events in about 27 seconds.',
    tags: ['Python', 'DuckDB', 'dbt', 'Data Engineering'],
    demos: [],
  },
  {
    id: 'typeform-clone',
    name: 'Typeform Clone',
    url: 'https://github.com/Aryan-Kochhar/Scaler-AI-Typeform-Builder-Clone',
    live: 'https://scaler-ai-typeform-builder-clone.vercel.app',
    short:
      'A full-stack clone of Typeform: a three-pane drag-and-drop builder with a live preview, nine question types, logic jumps and themes, a public one-question-at-a-time respondent flow, and per-question results.',
    long:
      'Build a form in a three-pane editor — question list, live canvas, settings — with drag-and-drop reordering that works from the keyboard too, inline editing right on the canvas, nine question types including file upload, and autosave. Logic jumps send each answer to a later question or straight to the end, and skipped questions are enforced on the server as well as in the browser. Publish to a public link and respondents get the familiar one-question-at-a-time flow, no login needed. Next.js 16 and Tailwind on Vercel, FastAPI with SQLAlchemy and SQLite on Render — whose free tier sleeps, so the live demo can take up to a minute to wake.',
    tags: ['TypeScript', 'Next.js', 'FastAPI', 'SQLite'],
    demos: [
      // Captured from the live deployment with headless Edge; the repo itself ships no screenshots.
      { type: 'image', src: 'assets/demos/typeform-clone/workspace.webp', caption: 'The workspace: drafts, published forms and response counts' },
    ],
  },
  {
    id: 'quant-copilot',
    name: 'Quant Copilot',
    url: 'https://github.com/Aryan-Kochhar/Agentic-Quantitative-Research-Copilot',
    short:
      'An agent that answers natural-language finance queries by chaining 8 custom tools over MCP — market data, backtesting, VaR, correlation, drawdown. Streams reasoning live over WebSocket, with a Redis + MongoDB Atlas two-tier cache and a Groq-to-local-Ollama fallback.',
    long:
      'Ask it something like "what’s the max drawdown of MSFT this year" and it plans its own tool calls — pulling live prices, running the quant analysis, and streaming each step (tool_call → tool_done → answer) to the frontend over WebSocket. Backed by a two-tier cache (Redis for hot queries, MongoDB Atlas for price history) and a Groq-to-local-Ollama fallback so it stays available even under rate limits.',
    tags: ['Python', 'MCP', 'RAG', 'Finance'],
    demos: [
      { type: 'video', src: 'assets/demos/quant-copilot/agent-run.webm',    poster: 'assets/demos/quant-copilot/agent-run.webp',    caption: 'The agent planning its own tool calls' },
      { type: 'video', src: 'assets/demos/quant-copilot/tool-stream.webm',  poster: 'assets/demos/quant-copilot/tool-stream.webp',  caption: 'tool_call → tool_done → answer, streamed over WebSocket' },
      { type: 'video', src: 'assets/demos/quant-copilot/landing.webm',      poster: 'assets/demos/quant-copilot/landing.webp',      caption: 'Asking it for a max drawdown' },
      { type: 'image', src: 'assets/demos/quant-copilot/hero.webp',                                                                 caption: 'Eight quant tools, exposed over MCP' },
    ],
  },
  {
    id: 'logmind',
    name: 'LogMind',
    url: 'https://github.com/Aryan-Kochhar/LogMind---Server-Log-Analyzer',
    short:
      'A RAG-powered log analyzer — ask natural-language questions about server logs instead of grepping through them. Semantic vector search and anomaly detection via MongoDB Atlas, with a Streamlit dashboard and CLI.',
    long:
      'Point it at a log file and just talk to it — "what happened on the 17th" or "are there any security threats" — and it answers using RAG over your own logs, no cloud LLM required (runs on local Ollama). It auto-flags error spikes and known-bad keywords like timeout and deadlock, and ships with both a CLI and a Streamlit dashboard for browsing, filtering, and exporting.',
    tags: ['Python', 'RAG', 'MongoDB'],
    demos: [
      { type: 'image', src: 'assets/demos/logmind/dashboard.webp',   caption: 'Asking a log file what happened on the 17th' },
      { type: 'image', src: 'assets/demos/logmind/streamlit-1.webp', caption: 'Anomaly flags on error spikes' },
      { type: 'image', src: 'assets/demos/logmind/streamlit-2.webp', caption: 'Semantic search across the index' },
      { type: 'image', src: 'assets/demos/logmind/streamlit-3.webp', caption: 'Filtering and exporting matches' },
    ],
  },
  {
    id: 'architech',
    name: 'ArchiTech',
    url: 'https://github.com/Aryan-Kochhar/-ArchiTech-',
    short:
      'Turns a text prompt into a structured 3D city layout. A multi-stage LLM pipeline with a self-correcting validator loop and embedding-based retrieval of layout templates for tricky spatial phrasing.',
    long:
      'Feed it a prompt like "two rows of buildings split by a river" and a local planner LLM sketches the zones, a Groq-hosted model places exact grid coordinates, and a deterministic (no-LLM) validator checks the result for overlaps, adjacency, and symmetry — kicking it back for another pass if it fails. A RAG variant retrieves the closest hand-built layout template first, which held up far better on tricky spatial language like "surrounding" or "on both sides."',
    tags: ['Python', 'LLM Pipeline', '3D'],
    demos: [
      { type: 'video', src: 'assets/demos/architech/city.webm',      poster: 'assets/demos/architech/city.webp',   caption: 'A text prompt becoming a validated city layout' },
      { type: 'video', src: 'assets/demos/architech/city-2.webm',    poster: 'assets/demos/architech/city-2.webp', caption: 'The validator loop rejecting and re-placing' },
      { type: 'image', src: 'assets/demos/architech/scene-road.webp',    caption: '"two rows of buildings split by a river"' },
      { type: 'image', src: 'assets/demos/architech/scene-park.webp',    caption: '"a square park, buildings surrounding"' },
      { type: 'image', src: 'assets/demos/architech/scene-harbour.webp', caption: '"a harbour, warehouses along the quay"' },
      { type: 'image', src: 'assets/demos/architech/scene-water.webp',   caption: '"water on all sides"' },
    ],
  },
  {
    id: 'aadhaar-ocr',
    name: 'Aadhaar Card OCR API',
    label: 'Aadhaar OCR',          // short form, used where space is tight (the brew map)
    url: 'https://github.com/Aryan-Kochhar/Aadhar-Card-OCR-API',
    short:
      'A lightweight Flask REST API that extracts name, DOB, gender, ID number, address and guardian info from Aadhaar card images using Tesseract OCR.',
    long:
      'Send it front and back images of an Indian Aadhaar card and it hands back structured JSON — name, DOB, gender, Aadhaar number, address, pincode, guardian info — pulled out with Tesseract OCR. Ships as a Flask API, a Flask-RESTful variant, and a bare local-file version, all sharing the same OCR core.',
    tags: ['Flask', 'OCR', 'REST API'],
    demos: [],
  },
  {
    id: 'congestion-rl',
    name: 'Congestion Control with RL',
    label: 'Congestion RL',
    url: 'https://github.com/Aryan-Kochhar/Congestion-Control-With-RL',
    short:
      'A SUMO traffic simulation combining reinforcement learning with real-time detection to optimize traffic flow under changing conditions.',
    long:
      'A SUMO-based intersection simulation where a Q-learning agent watches queue lengths, wait times, and vehicle density, then adjusts signal timing to keep traffic moving — while automatically clearing a path and giving right-of-way the moment it detects an emergency vehicle.',
    tags: ['Python', 'Reinforcement Learning', 'SUMO'],
    demos: [
      { type: 'video', src: 'assets/demos/congestion-rl/intersection.webm', poster: 'assets/demos/congestion-rl/intersection.webp', caption: 'Q-learning agent retiming signals, and yielding to an emergency vehicle' },
    ],
  },
  {
    id: 'resonance',
    name: 'Resonance',
    url: 'https://github.com/Aryan-Kochhar/Resonance',
    short:
      'Exploring data-driven denoising of wireless communication channels to improve the reliability and efficiency of modern wireless systems like 5G and IoT.',
    long:
      'A group-project contribution exploring learned, data-driven denoising for wireless channels — aiming to squeeze more reliability and efficiency out of 5G/IoT-style links than classical signal-processing approaches manage on their own.',
    tags: ['Python', 'Signal Processing', '5G/IoT'],
    demos: [
      { type: 'image', src: 'assets/demos/resonance/poster.webp',    caption: 'Learned vs. classical denoising, across channel conditions' },
      { type: 'image', src: 'assets/demos/resonance/heatmap-0.webp', caption: 'Channel estimate before and after denoising' },
      { type: 'image', src: 'assets/demos/resonance/spectral.webp',  caption: 'Spectral view of a single sample' },
      { type: 'image', src: 'assets/demos/resonance/ber.webp',       caption: 'Bit error rate against SNR' },
      { type: 'image', src: 'assets/demos/resonance/curves.webp',    caption: 'Training curves' },
    ],
  },
];

/* The coffee button easter egg. Untouched — this is the whole personality. */
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

export const COFFEE_TENTH = 'bas bas, itna kaafi hai 😅';
