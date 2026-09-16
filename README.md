# aryankochhar.com

Personal site. Cream-paper look, a hand-written GLSL hero, and scroll-linked
motion throughout.

No build step and no framework — open `index.html` and it runs. Deploys to
GitHub Pages as-is.

```
index.html          the whole home scroll, as real markup
css/style.css       design tokens + components
js/fluid.js         the hero shader (WebGL)
js/motion.js        reveals, cursor, parallax, text glitch
js/app.js           routing, work index, demo reel, project pages, coffee button
js/data.js          all copy and project data
assets/             photos
assets/demos/       project demos (WebM + WebP), built by tools/build-demos.py
tools/build-demos.py  transcodes the project repos' GIFs into the above
```

## The hero

`js/fluid.js` renders cream being poured into coffee: a height field built from
domain-warped gradient noise, differentiated for surface normals, and shaded as
a glossy liquid with a key light and a tight specular. One fullscreen triangle,
one fragment shader.

Three things carry it:

- **Differential rotation.** The field is stirred about the view axis at a rate
  that falls off with radius, so inner fluid laps outer fluid and straight
  ribbons shear into a spiral on their own.
- **Domain warping.** The coordinate is displaced by noise before the height
  field is sampled, which folds ribbons back through each other instead of
  leaving concentric rings.
- **Normals from finite differences.** The relief and the wet highlight are the
  reason it reads as poured liquid rather than as a gradient.

An earlier revision did this as a volumetric raymarch. It cost roughly 8x as
much and looked worse — integrating a noise field along a ray averages out
exactly the detail that makes marbling legible.

It degrades in two stages if it can't hold ~45fps (render scale first, then fbm
octaves), pauses when scrolled out of view or the tab is hidden, and falls back
to a CSS gradient with no WebGL or under `prefers-reduced-motion`.

## Demos

The project repos ship their demos as GIFs — 23MB across the six of them, one
439 frames long. Nothing that heavy loads on a portfolio, and hotlinking
`github.com/.../raw/...` is slow and breaks on a rename.

`tools/build-demos.py` trims each one to a ~9s loop and transcodes it: WebM
(VP8) for the animations, WebP for the stills, plus a WebP poster per video.
1.65MB total, 93% smaller, and served from this repo.

```sh
DEMO_SRC=~/src python3 tools/build-demos.py
```

Videos are `muted loop playsinline` so iOS autoplays them, and an
IntersectionObserver plays only the ones on screen — a row of six looping
videos all decoding at once is the difference between a smooth page and a hot
laptop. Browsers that can't decode VP8 (Safari before 16) show the poster.

## Motion

Native scroll, with effects linked to scroll position. Scroll is deliberately
not hijacked — a lerped fake-scroll container breaks keyboard paging, mobile
momentum, find-in-page and anchor restoration. Everything animated is
transform, opacity or a sliding curtain, so none of it touches layout, and one
shared `requestAnimationFrame` loop drives the per-frame work.

The cursor is ported from fastrapi.in: positions snap to a coarse
viewport/24x12 grid so it moves in chunky jumps, block size scales with
pointer speed, and a five-cell trail fades on a stepped timing function. The
colours are not ported — the original's lime-on-black would fight this
palette, so the blocks are neutral and `difference`-blended, which also means
one cursor reads on cream, on the espresso section and over the hero canvas.

The demo reel pins on a wide screen and tracks sideways off vertical scroll;
on touch and under reduced motion it stays a native horizontal scroller with
snap points. Same markup either way — only `.is-pinned` differs.

Three things worth knowing if you edit this:

- Reveal-on-scroll must not hide its target with `clip-path: inset(100%)`.
  IntersectionObserver measures the *clipped* rect, so a fully clipped element
  reports zero intersection and never reveals. `.r-clip` wipes with a curtain
  on `::after` for that reason.
- That curtain is `inset: 0` and slides to `translateY(-100%)`, which parks it
  directly *above* the element — so `.r-clip` must keep its `overflow: hidden`
  or it paints over whatever precedes it.
- Effects are gated on `prefers-reduced-motion` in both CSS and JS.

## Accessibility

Whole home page is real markup, so it reads fine with JS off. The split hero
heading keeps an `aria-label`. Focus rings are preserved, tab order follows the
page, and the custom cursor is dropped entirely for coarse pointers.

## Local

Any static server:

```sh
npx http-server -p 8080
```
