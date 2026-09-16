# Nafaka Foods — creative-development release

A full art-direction, motion, responsive-engineering and production pass over the
existing five-page site. The company's positioning, facts, contact details,
enquiry logic, page URLs and approved photography are unchanged; everything
around them was rebuilt.

---

## 1. Concept — grain in motion

One idea carries the whole site: **grain moving along a measured supply line.**

The approved hero photograph already contains it — a specialist letting rice fall
into a brass sampling pan. The interface is built from that single gesture:

| Motif | Where it appears |
| --- | --- |
| **The route rule** | Every section opens with a hairline that draws left to right, carrying an index, an eyebrow and the display line. The rule is the supply route; the sections are stations on it. |
| **The fall** | Display type arrives downward through a mask, the way grain drops into the pan. The preloader wipes downward and the headline falls in the same direction. |
| **Measure ticks** | Lists, ranges, commodities and metadata sit on fine rules with tabular indices, like a sorting register — in place of repeated cards. |
| **The aperture** | Photographs open from a clip and settle back to 1:1, rather than fading. |

The concept is expressed through composition, rule-work and timing. It is never
stated as decoration, and there are no farming clichés, blobs, glows or badges.

## 2. Design system

**Surfaces.** Every section declares `data-surface` (`ivory`, `rice`, `sand`,
`forest`, `moss`, `deep`). That one attribute resolves the background, text,
dim text, accent, rule and focus-ring colours for everything inside it. There is
no contextual override chain anywhere in the stylesheet.

**Tonal journey.** Sections are deliberately paced rather than uniformly
coloured — bright and assured through the hero and the brand statement, deep
forest for the rice range, back to ivory for the supply register, deepest for
the origin story, brass-lit for the vending hand-off, warm rice for the close.

**Grid.** One shell, expressed as padding rather than a max-width, so
full-bleed strips (the commodity register, the chapter nav) can align their
first item to the same line as shell content using the same expression. A
measured `--edge` custom property gives split panels that anchor exactly —
`100vw` would be off by half a classic scrollbar, so the script measures a real
shell and writes the value back.

Compositions are not built from utility spans; each one declares its own grid
and reflows at three shared lines: 48em where lists become columns, 56.25em
where full-bleed text splits, and 64em where a photograph may sit in a column
beside type. That last line is why the 900–1023px band never crops a subject
into a near-square — every image-beside-text composition keeps its stacked form
until there is a real landscape frame to put it in.

**Type.** Newsreader for display and editorial voice, Manrope for interface and
body, both self-hosted and subset. Thirteen registers from hero display down to
metadata, all fluid, with balanced wrapping, controlled measures and tabular
numerals for every figure. Italic is reserved for editorial emphasis inside
display type and is used nowhere else.

**Palette.** Deep forest, warm ivory, rice white, muted botanical green, earth
neutrals and restrained brass — sampled from the approved photography. Two
accent greens exist on purpose: `--leaf` for graphics and `--leaf-deep` for small
text, because the lighter green does not carry 4.5:1 at label sizes.

**Tokens.** Colour, surface, spacing, container, typographic scale, motion
duration, easing, depth, rules and breakpoints are all custom properties. There
are no unexplained magic numbers.

## 3. Motion grammar

Four verbs, each with a fixed meaning. Nothing on the site animates outside them.

| Verb | Meaning | Used on |
| --- | --- | --- |
| `fall` | arrives downward through a mask | display type, headlines |
| `advance` | enters from the left, along the direction of supply | lists, rows, links |
| `open` | an aperture lifts and the image settles back to 1:1 | photography |
| `settle` | resolves in place; carries the stagger | metadata, supporting copy |
| `draw` | the route rule extends left to right | station rules only |

Durations are one scale: micro 170ms (pointer feedback), interface 340ms (state
the user asked for), reveal 760ms (content arriving), cinematic 1150ms
(page-scale choreography). Four easing curves separate interface response,
editorial settle, image movement and exit.

Deliberately still: body copy in the first viewport, the whole navigation, and
every form field. The contrast is what makes the movement read.

**Engineering.** No animation library — everything the grammar needs is native
CSS, and a dependency would add payload and a second source of truth for timing
without changing a frame. One `requestAnimationFrame` loop drives every
scroll-linked value. Geometry is cached on init and re-measured on resize, font
load and `pageshow`, never inside a frame. Offscreen targets are skipped by
numeric comparison. Only `transform`, `opacity` and `clip-path` animate.
Parallax is capped at 26px, transform-only, and limited to fine-pointer devices
at ≥900px. Every listener and observer registers a teardown and is released on
`pagehide`.

## 4. Preloader

*One grain, one route.* A single brass grain travels in, settles into the Nafaka
mark, the mark draws itself, the leaves land, the wordmark resolves — then the
gate wipes **downward**, uncovering the navigation first while the hero headline
falls downward in the same direction. Roughly 1.7s end to end in normal
conditions.

Four independent fail-safes, in order:

1. A tiny inline script decides whether the gate may run at all. No JavaScript
   means no gate — it is never in the document's own critical path.
2. A CSS animation clears the gate at 2.4s even if `site.js` never loads.
3. `site.js` enforces an 1800ms hard ceiling and waits on the hero image only as
   far as that ceiling allows.
4. The boot script strips `js` and `has-gate` from `<html>` at 3s if `site.js`
   never arrives, releasing every hidden state on the page.

It runs once per session (`sessionStorage`), never on repeat navigation, never
under reduced motion, and the scroll lock is released the moment the wipe starts
rather than when it finishes. The gate is `aria-hidden` and traps no focus.

## 5. Pages

| Page | What changed |
| --- | --- |
| **Home** | Two separate hero compositions. On a phone: type, then the whole photograph inside the first screen, then support and actions. On a laptop: the photograph framed below the navigation, the type on the lime-washed wall the photographer left empty, held to 44% so no letterform crosses the subject. Below it: a real commodity register (links, not a marquee), the brand statement, the rice range, a buyer index on measure rules, the origin split, the vending hand-off and a routing close panel. |
| **Our story** | Documentary chronology — the year is the anchor, the entry advances from the route line. Purpose, direction and values sit on the same register system. No invented milestones. |
| **Grain range** | Rice leads. Each variety is a full-width row that opens an enquiry with that variety already selected. Maize, beans and soya are a ruled three-name register rather than coloured cards; the wider scope sits in a moss-surfaced note. No invented specifications. |
| **Smart vending** | A tighter, more mechanical cadence: tabular spec columns, a five-step placement sequence, squarer rules. The upright vending photograph now runs in an upright frame, so the machine, the reader and the person all stay in the crop. |
| **Contact** | Two named routes — grain supply and smart vending — stated before the form, each setting the field in place. Inline validation with messages that are not colour-only, visible focus, a live status region, and the WhatsApp draft shown for review before anything is opened. |
| **404** | Same system, three real recovery routes, no playfulness that would cost credibility. |

## 6. Approved imagery — unchanged roles

Every production image is still used in exactly the role it held before. A
source check now enforces this and fails the build if a role moves.

| Asset | Role |
| --- | --- |
| `images/v3/hero-desktop-*`, `hero-mobile-*` | Homepage hero |
| `images/v3/rice-range-*` | Homepage range stage · Grain range masthead |
| `images/v3/supply-*` | Homepage origin story |
| `images/v3/vending-desktop-*` | Homepage vending band |
| `images/v3/vending-mobile-*` | Homepage vending band (small screens) · Smart vending masthead |

Presentation is improved only through responsive art direction: the existing
desktop and mobile variants, controlled crops, `object-position`, aperture
reveals, capped parallax and two tonal veils. No image was replaced, generated,
re-coloured beyond a legibility veil, or moved to a different subject.

## 7. Accessibility

- Semantic landmarks, one `h1` per page, valid heading order, descriptive titles.
- Skip link as the first tab stop; focus moves to `main`.
- Two-tone focus ring that carries against both the ivory and the forest
  surfaces; visible on every interactive element.
- Mobile menu: `<details>` carries the behaviour so it works without JavaScript;
  the script adds `aria-expanded`, the scroll lock, the focus loop, focus
  restoration to the trigger, and state hygiene across resize, orientation
  change and history navigation. The trigger and the brand stay above the panel.
- Accordions are native `<details>`; no ARIA is added where HTML already says it.
- Form: explicit labels, `aria-describedby` error messages, `aria-invalid`, a
  polite live region, 16px inputs so iOS does not zoom, and validation that is
  never signalled by colour alone.
- Every text/surface pair in the token set is checked for contrast in
  `tests/check_site.py`; the lowest is 5.00:1 and most are above 8:1.
- 44×44px minimum for interactive targets outside dense navigation strips.
- No hover-only information; every pointer interaction has a touch equivalent.

**Reduced motion** is a designed mode, not a stripped one: the same
compositions arrive instantly, with no preloader, no parallax, no scroll
scrubbing and no transitions — and nothing left transparent.

## 8. Progressive enhancement

With JavaScript disabled: all content is visible, the navigation works, the
menu opens, images load, anchors work, the preloader never appears, and the
enquiry form explains that it needs JavaScript while the WhatsApp, phone and
email routes stay available. Nothing on the site is hidden waiting for an
animation that may never run.

## 9. Performance

Two scripts totalling a few kilobytes, one stylesheet, no dependencies.
Responsive `srcset`/`sizes` on every photograph, intrinsic dimensions or fixed
aspect ratios on every frame so nothing shifts while loading, lazy loading below
the fold, `fetchpriority` on the page's own hero, preloaded critical fonts with
`font-display: swap`, passive listeners, `content-visibility` on the footer, and
one rAF loop that never reads layout.

## 10. Source layout

Pages are assembled by `tools/build_pages.py` so the header, footer, quick bar,
metadata and preloader are written once instead of six times. **The deployed
site is still plain static HTML — GitHub Pages runs no build step.** Edit the
generator, not the generated files; `python3 tools/build_pages.py --check` fails
if they have drifted apart, and the source-check suite runs it.

```
tools/build_pages.py     page assembly (single source of truth for chrome)
assets/css/site.css      layered: reset, tokens, base, type, layout, motion,
                         components, sections, utilities
assets/js/site.js        edge · scroll engine · reveals · parallax · header ·
                         menu · quick bar · chapters · magnetism · accordions ·
                         gate · enquiry form · teardown
assets/js/enquiry.js     pure WhatsApp message builder (no DOM, no network)
```

## 11. Running the checks

The site is static and needs no build command.

```sh
python3 -m http.server                      # serve locally
node --check assets/js/site.js
node --check assets/js/enquiry.js
node --test tests/enquiry.test.cjs          # message builder
python3 -m pip install -r tests/requirements.txt
python3 tests/check_site.py                 # source, metadata, tokens, contrast
NODE_PATH=<playwright+axe> node tests/browser-check.cjs
```

`tests/browser-check.cjs` renders the real site and checks layout at 21 widths
(including the intermediates between named devices), touch-target sizes, the
mobile menu lifecycle, accordions, the enquiry form and its WhatsApp draft,
keyboard order, every internal link and anchor, axe WCAG 2.0/2.1 A and AA, 200%
zoom, the JavaScript-disabled document, reduced motion, and repeat navigation.
It sends no enquiry and makes no external request — the draft is inspected as a
URL and never opened.

## 12. Still to be confirmed by the client

Unchanged from the previous release, and still deliberately absent from the
site: pack sizes, minimum order quantities, current grades, current stock,
prices, delivery times or guarantees, geographic coverage, certifications,
customer counts, named clients, partnerships, vending payment technology,
machine capacity, refill schedules and any street address. The two company PDFs
list different street addresses, so the site publishes only the common postal
address, P.O. Box 10463, Kampala.

Campaign imagery is illustrative brand photography, not documentary evidence of
Nafaka staff, customers, facilities or stock. See `assets/IMAGE-PROVENANCE.md`.
