# aryankochhar.in

Personal site. Warm paper, ink, and a blue ballpoint: serif headlines, mono
labels, handwritten margin notes, and a portrait printed in halftone dots.

No build step and no framework — open `index.html` and it runs. Deploys to
GitHub Pages (or any static host) as-is.

```
index.html          the home page's standing copy, as real markup
css/style.css       tokens, layout, components
js/data.js          projects, the GitHub fallback list, upstream fixes
js/app.js           rendering, routing, theme, pen marks, lightbox, form
js/halftone.js      the hero portrait (canvas)
js/desk.js          the "Ask" dialog
assets/             photos
assets/demos/       project demos (WebM + WebP), built by tools/build-demos.py
jitters/index.html  standalone toy, linked from the footer as an easter egg
tools/              scripts that transcode the project repos' GIFs
```

## Content

`js/data.js` is the only file to touch for projects.

- `featured: true` marks the three projects on the résumé. They run first, as
  large rows, in the order they appear in the file.
- Everything else runs as a card. Seven cards plus the "Ask" tile make eight,
  which fills the grid evenly at four columns, at two, and at one — if you add
  or remove a project, the last row will be uneven until the count is even
  again.
- "Also on GitHub" is fetched live from the GitHub API (public, non-fork repos
  with a description that are not already a project and not in `WIRE_SKIP`).
  `WIRE_FALLBACK` is shown when the API is unreachable or rate-limited.
- `UPSTREAM` is merged pull requests to other people's libraries.

The hero, focus areas, about and contact copy live in `index.html`, so they
survive with JavaScript off.

## Layout

Three widths: wide (1100px and up), mid (720–1099px) and narrow (phones). Mid
is a real two-column layout rather than a stretched phone one, because a
split-screen or side-pane browser lands there.

Every featured project is the same three parts in the same order: a figure, a
block of text, and a band of numbers across the full width. The figure
switches sides on alternate rows.

Every card has the same 16:10 slot on top. A project with no screenshot gets a
typographic tile of the same size (its headline number, or the shape of what
it returns) so the rows stay level.

The masthead name is sized in container units so it spans the column exactly.
That only works with Fraunces' optical-size axis pinned — left on auto, the
letters get wider at small sizes and the name runs off the edge on a phone.

## The portrait

`js/halftone.js` redraws the photo as a 45° halftone screen: one dot per
lattice point, area proportional to darkness. A second pass in pen-blue sits
slightly off-register underneath. In dark mode the screen inverts — light dots
on dark stock — so the picture still reads the right way round.

The real photo is the `<img>` under the canvas. Under the pointer the canvas
is punched out with a soft-edged hole, so the photo "develops" where you look;
a click or tap develops the whole frame. It only animates while something is
changing, and falls back to the plain photo if the canvas can't be read.

## Pen marks

Elements with `data-pen="circle"` or `data-pen="under"` get an SVG drawn around
them by `app.js`, sized 1:1 in pixels so the stroke never scales, and redrawn
on resize. The `.pen` rule sets `max-width: none` on purpose: a circle is wider
than the word it goes round, and a global `svg { max-width: 100% }` squashes it.

## Ask

`js/desk.js` is not an LLM and says so in the dialog. It is a list of regexes
tried in order, with the answer presented as a plan, a tool call or two, and a
result — the same loop the real projects run. Open it with `/` or Ctrl/Cmd+K.

## Motion and accessibility

Native scroll throughout; nothing is hijacked. Reveals, pen strokes and the
theme wipe are transform, opacity or clip-path only. Videos play only while on
screen. Everything is gated on `prefers-reduced-motion`.

The home page is real markup, focus rings are kept, and the stack table is a
real `<table>` with a caption and row and column headers.

## Local

Any static server:

```sh
python -m http.server 8080
```
