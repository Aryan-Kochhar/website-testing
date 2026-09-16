/* Content. Every word here is Arry's — the site is a shell around it. */

export const PROFILE = {
  name: 'Aryan Kochhar',
  short: 'Arry',
  location: 'Chennai, India',
  status: 'Open to opportunities',
  tagline:
    "I build AI agents and RAG pipelines for a living, and I'm pretty relaxed about most everything else — except my coffee order, which comes non-negotiable.",
  email: 'aryankochhar2005@gmail.com',
  footerSignature: 'Arry 💜 Rads',
  socials: [
    { label: 'Email', url: 'mailto:aryankochhar2005@gmail.com' },
    { label: 'GitHub', url: 'https://github.com/Aryan-Kochhar' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/aryan-kochhar' },
    { label: 'X', url: 'https://x.com/AryanKochhar2' },
    { label: 'Instagram', url: 'https://instagram.com/_aryankochhar' },
  ],
};

export const FOCUS_AREAS = [
  { mark: '01', title: 'Agentic Systems', blurb: 'Agents that chain tools, not just answer questions.' },
  { mark: '02', title: 'RAG & Retrieval', blurb: 'Grounding LLMs in real data, reliably.' },
  { mark: '03', title: 'Quant Research', blurb: 'Where finance meets machine learning.' },
];

export const ABOUT = {
  kicker: 'The person behind the code',
  paras: [
    "I'm a final-year AI/ML student at Vellore Institute of Technology (CGPA 9.27, if that matters to you), building agentic systems and RAG pipelines that chain tools together to actually get things done — not just answer questions.",
    "Last summer I interned at WE Excel Software, where I built an OCR pipeline for HR document processing and tuned retrieval for a RAG-based HR chatbot. Outside of internships, I'm usually deep in a side project — teaching an agent to backtest trading strategies, or turning a text prompt into a whole 3D city.",
  ],
  aside:
    "When I'm not at my desk, I'm probably making another cup of coffee, or sidequesting with my girlfriend and friends (interpersonal skills example lol) — usually both are happening at once.",
  education: [
    {
      title: 'B.Tech, Computer Science (AI & ML) — VIT',
      meta: 'Aug 2023 – Jul 2027 · CGPA 9.27',
    },
  ],
  experience: [
    {
      title: 'AI/ML Intern — WE Excel Software Pvt. Ltd.',
      meta: 'June 2025 · On-site',
      points: [
        'Built an OCR pipeline extracting data from Aadhaar & PAN cards for an internal HRMS.',
        'Tuned retrieval settings for a RAG-based HR chatbot.',
        'Explored web scraping, automation and API integration.',
      ],
    },
  ],
  skillGroups: [
    { title: 'Languages', items: 'Python, C, C++, Java, SQL' },
    { title: 'AI / ML', items: 'NumPy, Pandas, OpenCV, scikit-learn, LangChain, RAG' },
    { title: 'Web', items: 'HTML, CSS, JavaScript' },
    { title: 'Tools', items: 'FastAPI, REST APIs, MongoDB Atlas, Redis, MCP, Ollama, Git' },
  ],
  certifications:
    'AI Foundations Associate (Oracle) · Intro to Model Context Protocol (Anthropic) · Generative AI (LinkedIn)',
  published:
    '"Nonlinear Balance Sheet Fragility and the Prediction of Short-Horizon Liquidity Stress" — under review, Computational Economics (Springer). First author.',
};

export const PROJECTS = [
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
      { type: 'image', src: 'assets/demos/architech/scene-road.webp',  caption: '"two rows of buildings split by a river"' },
      { type: 'image', src: 'assets/demos/architech/scene-park.webp',  caption: '"a square park, buildings surrounding"' },
    ],
  },
  {
    id: 'aadhaar-ocr',
    name: 'Aadhaar Card OCR API',
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
      { type: 'image', src: 'assets/demos/resonance/poster.webp', caption: 'Learned vs. classical denoising, across channel conditions' },
      { type: 'image', src: 'assets/demos/resonance/curves.webp', caption: 'Training curves' },
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
