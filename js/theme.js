/* ---------------------------------------------------------------------------
   Roasts.

   Five palettes, each with its own cup icon — a latte and a cold brew are not
   the same drink and the switcher should say so at a glance.

   Colour lives here in JS rather than in CSS `[data-theme]` blocks, because
   the canvas work (cursor, hero scene) needs the same values and reading them
   back out of computed styles every frame is wasteful. applyRoast() writes
   them onto :root as custom properties, so CSS and canvas share one source.

   Token roles, which matter once there are five palettes:
     --bg / --bg2   page and raised ground
     --ink          body text
     --muted        secondary text
     --accent       primary block fill
     --shock        the loud one
     --edge         outline on page-coloured elements (must read on --bg)
     --stamp        outline on accent-filled elements (always dark)
     --pop          sticker shadow colour
--------------------------------------------------------------------------- */

export const ICONS = {
  espresso: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 21h15"/>
    <path d="M6 10.5h11v4.2a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z"/>
    <path d="M17 12h1.6a1.9 1.9 0 0 1 0 3.8H17"/>
    <path d="M9 3.2v2.6M12.2 2.3v3.5M15.4 3.2v2.6"/></svg>`,

  latte: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 21.2h15"/>
    <path d="M6 7.4h11.5v8.4a3.6 3.6 0 0 1-3.6 3.6h-4.3A3.6 3.6 0 0 1 6 15.8z"/>
    <path d="M17.5 9.4h1.4a2 2 0 0 1 0 4h-1.4"/>
    <path d="M11.8 16.4c0-2.2.9-3.9 2.5-5.1-.2 2.3-1 4-2.5 5.1zm0 0c0-2.2-.9-3.9-2.5-5.1.2 2.3 1 4 2.5 5.1z"/></svg>`,

  coldbrew: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 6.6h10l-1.1 13.5a1 1 0 0 1-1 .9h-5.8a1 1 0 0 1-1-.9z"/>
    <path d="M15.6 2.6 13.4 9"/>
    <rect x="9.1" y="9.6" width="3.5" height="3.5" rx=".5" transform="rotate(14 10.85 11.35)"/>
    <rect x="12.4" y="14.2" width="2.9" height="2.9" rx=".5" transform="rotate(-18 13.85 15.65)"/></svg>`,

  caramel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 21h15"/>
    <path d="M6 9.8h11v5a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z"/>
    <path d="M17 11.3h1.6a1.9 1.9 0 0 1 0 3.8H17"/>
    <path d="M6.4 6.3c1.3-1.6 2.6 1.4 3.9-.2s2.6 1.4 3.9-.2 2.3.7 3.2-.1"/></svg>`,

  mocha: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="12" rx="6.4" ry="9" transform="rotate(38 12 12)"/>
    <path d="M7.7 16.3c1.4-1 2.3-2.4 3.4-4.3 1.1-1.9 2.2-3.2 3.6-4"/></svg>`,
};

export const ROASTS = [
  { id: 'dark-roast', name: 'Dark Roast', icon: 'espresso', grain: [0.26, 'overlay'],
    bg: '#0f0805', bg2: '#1e110a', ink: '#fff1dd', muted: '#a08872',
    accent: '#ffb340', shock: '#ff5a3c', edge: '#4a2f1e', stamp: '#000000', pop: '#000000' },

  { id: 'latte', name: 'Latte', icon: 'latte', grain: [0.16, 'multiply'],
    bg: '#fff4e6', bg2: '#ffe9cf', ink: '#2a1206', muted: '#7a5a44',
    accent: '#ff9e1b', shock: '#e8452f', edge: '#2a1206', stamp: '#2a1206', pop: '#2a1206' },

  { id: 'cold-brew', name: 'Cold Brew', icon: 'coldbrew', grain: [0.22, 'overlay'],
    bg: '#0b1016', bg2: '#131c26', ink: '#e6f1f7', muted: '#7f96a6',
    accent: '#f0a202', shock: '#5ec8e5', edge: '#27394a', stamp: '#00121c', pop: '#00121c' },

  { id: 'caramel', name: 'Caramel', icon: 'caramel', grain: [0.18, 'multiply'],
    bg: '#fbdfae', bg2: '#f6d093', ink: '#43210c', muted: '#7d4d24',
    accent: '#fffaf0', shock: '#c4441c', edge: '#43210c', stamp: '#43210c', pop: '#43210c' },

  { id: 'mocha', name: 'Mocha', icon: 'mocha', grain: [0.24, 'overlay'],
    bg: '#2b1a1f', bg2: '#3a242b', ink: '#f9e7ea', muted: '#b08e97',
    accent: '#f2a6b3', shock: '#ffcf5c', edge: '#5d3b45', stamp: '#1a0d11', pop: '#1a0d11' },
];

const LIGHT = new Set(['latte', 'caramel']);
const KEY = 'arry-roast';

/* Live RGB triples for whatever is currently applied. The canvases read these
   every frame, so they are plain arrays rather than parsed on demand. */
export const INK = { ink: [0, 0, 0], accent: [0, 0, 0], shock: [0, 0, 0], bg: [0, 0, 0] };

const hex2rgb = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

let current = ROASTS[1];
const listeners = new Set();

export const currentRoast = () => current;
export function onRoastChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function applyRoast(roast) {
  current = roast;
  const s = document.documentElement.style;
  s.setProperty('--bg', roast.bg);
  s.setProperty('--bg2', roast.bg2);
  s.setProperty('--ink', roast.ink);
  s.setProperty('--muted', roast.muted);
  s.setProperty('--accent', roast.accent);
  s.setProperty('--shock', roast.shock);
  s.setProperty('--edge', roast.edge);
  s.setProperty('--stamp', roast.stamp);
  s.setProperty('--pop', roast.pop);
  s.setProperty('--grain-op', String(roast.grain[0]));
  s.setProperty('--grain-blend', roast.grain[1]);

  document.documentElement.dataset.roast = roast.id;
  document.documentElement.style.colorScheme = LIGHT.has(roast.id) ? 'light' : 'dark';
  // Keep the browser UI (address bar on mobile) in step with the page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', roast.bg);

  INK.ink = hex2rgb(roast.ink);
  INK.accent = hex2rgb(roast.accent);
  INK.shock = hex2rgb(roast.shock);
  INK.bg = hex2rgb(roast.bg);

  // The cup icon follows the roast everywhere it is used.
  for (const slot of document.querySelectorAll('[data-roast-icon]')) {
    slot.innerHTML = ICONS[roast.icon];
  }
  for (const b of document.querySelectorAll('.roast')) {
    b.setAttribute('aria-pressed', String(b.dataset.roast === roast.id));
  }

  try { localStorage.setItem(KEY, roast.id); } catch { /* private mode */ }
  for (const fn of listeners) fn(roast);
}

/* First visit gets a roast that matches the clock — latte in the morning,
   cold brew through the afternoon, dark roast at night. A saved choice always
   wins over the clock. */
function roastForHour(h) {
  if (h >= 5 && h < 11) return 'latte';
  if (h >= 11 && h < 17) return 'cold-brew';
  if (h >= 17 && h < 21) return 'caramel';
  return 'dark-roast';
}

export function initRoasts(mount) {
  if (mount) {
    mount.innerHTML = ROASTS.map((r) => `
      <button class="roast" data-roast="${r.id}" aria-pressed="false" aria-label="${r.name}">
        ${ICONS[r.icon]}<span class="roast__tip">${r.name}</span>
      </button>`).join('');

    mount.addEventListener('click', (e) => {
      const btn = e.target.closest('.roast');
      if (!btn) return;
      const roast = ROASTS.find((r) => r.id === btn.dataset.roast);
      if (roast) applyRoast(roast);
    });
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* private mode */ }
  const pick = ROASTS.find((r) => r.id === saved)
            || ROASTS.find((r) => r.id === roastForHour(new Date().getHours()))
            || ROASTS[1];
  applyRoast(pick);
}
