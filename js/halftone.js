/* The lead photo, printed.

   The portrait is redrawn as a 45° halftone screen: one dot per lattice
   point, its area proportional to how dark the photo is there. By day that is
   ink on paper; in the evening edition the screen inverts, light dots on dark
   stock, so the picture still reads the right way round.

   A second pass in pen-blue sits slightly off-register underneath, the way a
   two-colour press never quite lines up.

   The real photo is the <img> underneath the canvas. Under the pointer the
   canvas is punched out with a soft-edged hole, so the photo "develops" where
   you look. A click or tap develops the whole frame. */

const CELL = 6.5;             // lattice pitch, CSS px
const ANGLE = Math.PI / 4;    // the classic screen angle
const LENS = 104;             // radius of the developed circle, CSS px
const TAU = Math.PI * 2;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initHalftone(root, { reduced = false } = {}) {
  const img = root?.querySelector('img');
  const cv = root?.querySelector('canvas');
  const ctx = cv?.getContext('2d');
  if (!img || !ctx) return null;

  let W = 0, H = 0, dpr = 1;
  let lum = null, lw = 0, lh = 0;
  let col = { paper: '#f3ecdf', ink: '#1a1512', pen: '#1d39d6', dark: false };

  let intro = reduced ? 1 : 0, introAt = 0, started = reduced;
  let px = 0, py = 0, lens = 0, lensTo = 0;
  let raf = 0;

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    col = {
      paper: cs.getPropertyValue('--paper').trim() || col.paper,
      ink: cs.getPropertyValue('--ink').trim() || col.ink,
      pen: cs.getPropertyValue('--pen').trim() || col.pen,
      dark: document.documentElement.dataset.edition === 'evening',
    };
  }

  /* Luminance of the photo, cropped exactly as CSS crops the <img>
     (object-fit: cover; object-position: 50% 30%) so the dots and the
     developed photo line up. */
  function sample() {
    if (!img.naturalWidth || !W) return false;
    lw = Math.max(2, Math.ceil(W / 3));
    lh = Math.max(2, Math.ceil(H / 3));
    const off = document.createElement('canvas');
    off.width = lw; off.height = lh;
    const o = off.getContext('2d', { willReadFrequently: true });

    const ir = img.naturalWidth / img.naturalHeight, cr = W / H;
    let sw, sh, sx, sy;
    if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) * 0.5; sy = 0; }
    else         { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) * 0.3; }
    o.drawImage(img, sx, sy, sw, sh, 0, 0, lw, lh);

    let d;
    try { d = o.getImageData(0, 0, lw, lh).data; }
    catch { return false; }             // tainted canvas (file://) — show the photo instead

    lum = new Float32Array(lw * lh);
    for (let i = 0, j = 0; j < lum.length; i += 4, j++) {
      // Levels, then an S-curve: a face has to survive being ~70 dots wide.
      const l = clamp01(((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255 - 0.06) / 0.86);
      lum[j] = l * l * (3 - 2 * l);
    }
    return true;
  }

  function draw() {
    if (!lum) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.paper;
    ctx.fillRect(0, 0, W, H);

    const ca = Math.cos(ANGLE), sa = Math.sin(ANGLE);
    const cx = W / 2, cy = H / 2;
    const far = Math.hypot(cx, cy);
    const n = Math.ceil(far / CELL) + 1;
    // Just short of solid: even the darkest patch keeps a little paper
    // between its dots, which is what makes it read as print.
    const maxR = CELL * 0.61;
    const L = LENS * lens;

    for (let pass = 0; pass < 2; pass++) {
      // Pass 0 is the off-register pen layer; it slips further near the lens.
      const slip = pass === 0 ? 1.7 + 2.2 * lens : 0;
      ctx.fillStyle = pass === 0 ? col.pen : col.ink;
      ctx.globalAlpha = pass === 0 ? 0.5 : 1;
      ctx.beginPath();

      for (let i = -n; i <= n; i++) {
        for (let j = -n; j <= n; j++) {
          const u = i * CELL, v = j * CELL;
          const x = cx + u * ca - v * sa;
          const y = cy + u * sa + v * ca;
          if (x < -CELL || y < -CELL || x > W + CELL || y > H + CELL) continue;

          const xi = Math.min(lw - 1, Math.max(0, (x / W * lw) | 0));
          const yi = Math.min(lh - 1, Math.max(0, (y / H * lh) | 0));
          const l = lum[yi * lw + xi];
          // Midtones are held back both ways round. Printed dark-on-light, a
          // face otherwise goes as heavy as the trees behind it; on inverted
          // stock a bright shirt and a bright wall fuse into one white shape.
          const d = col.dark ? l * Math.sqrt(l) : Math.pow(1 - l, 1.45);
          if (d < 0.015) continue;

          let r = maxR * Math.sqrt(d);

          if (intro < 1) {
            // Dots come up from the centre outwards.
            const k = clamp01(intro * 1.9 - (Math.hypot(x - cx, y - cy) / far) * 0.9);
            r *= k * k * (3 - 2 * k);
          }
          if (lens > 0.01) {
            // A swell of fat dots around the rim of the lens.
            const q = (Math.hypot(x - px, y - py) - L) / 26;
            r *= 1 + 0.6 * lens * Math.exp(-q * q);
          }
          if (r < 0.22) continue;

          ctx.moveTo(x + slip + r, y + slip * 0.8);
          ctx.arc(x + slip, y + slip * 0.8, r, 0, TAU);
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (lens > 0.01) {
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(px, py, L * 0.45, px, py, L);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, L, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function frame(now) {
    raf = 0;
    let busy = false;
    if (started && intro < 1) {
      intro = clamp01((now - introAt) / 1600);
      busy = true;
    }
    const dl = lensTo - lens;
    if (Math.abs(dl) > 0.004) { lens += dl * 0.17; busy = true; }
    else lens = lensTo;

    draw();
    if (busy) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function resize() {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    if (!sample()) { root.classList.add('is-ready', 'is-developed'); return; }
    draw();
    root.classList.add('is-ready');
  }

  function boot() {
    readColors();
    resize();
    new ResizeObserver(resize).observe(root);

    if (!reduced) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        started = true;
        introAt = performance.now() + 250;
        kick();
      }, { threshold: 0.25 });
      io.observe(root);
    }
  }

  root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = root.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    lensTo = 1;
    kick();
  });
  root.addEventListener('pointerleave', () => { lensTo = 0; kick(); });
  root.addEventListener('click', () => root.classList.toggle('is-developed'));

  // The edition changes the paper and the ink; repaint synchronously so a
  // view-transition snapshot taken right after already has the new colours.
  window.addEventListener('edition', () => { readColors(); draw(); });

  if (img.complete && img.naturalWidth) boot();
  else img.addEventListener('load', boot, { once: true });

  return { redraw: draw };
}
