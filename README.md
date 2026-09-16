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
js/app.js           routing, work index, project pages, the coffee button
js/data.js          all copy and project data
assets/             photos
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

## Motion

Native scroll, with effects linked to scroll position. Scroll is deliberately
not hijacked — a lerped fake-scroll container breaks keyboard paging, mobile
momentum, find-in-page and anchor restoration. Everything animated is
transform, opacity or a sliding curtain, so none of it touches layout, and one
shared `requestAnimationFrame` loop drives the per-frame work.

Two things worth knowing if you edit this:

- Reveal-on-scroll must not hide its target with `clip-path: inset(100%)`.
  IntersectionObserver measures the *clipped* rect, so a fully clipped element
  reports zero intersection and never reveals. `.r-clip` wipes with a curtain
  on `::after` for that reason.
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
