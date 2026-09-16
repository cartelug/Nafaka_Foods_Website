# Nafaka Foods web image provenance

The site uses commissioned AI-generated campaign imagery. It is illustrative brand photography, not documentary evidence of Nafaka staff, customers, facilities, stock, certifications or endorsements.

The supplied portrait references were used only to guide appearance in selected campaign scenes. Raw portraits are deliberately excluded from the public repository.

## Fresh-run production assets

| Production files | Generated original | Website role |
| --- | --- | --- |
| images/v3/hero-desktop-* | exec-4fca5bb8-8669-4b47-a131-02b2d798f0a4.png | Homepage desktop rice campaign hero |
| images/v3/hero-mobile-* | exec-e5c892e7-111e-40c3-8878-c4b42cb4a505.png | Dedicated mobile hero composition |
| images/v3/rice-range-* | exec-5c769a24-d4fc-4fb3-af06-314cfeca75a3.png | Rice-range editorial still life |
| images/v3/supply-* | exec-8affcee6-2607-4ed2-94f7-611468869702.png | Business supply story |
| images/v3/vending-desktop-* | exec-4788df32-4c24-4efa-a9ad-46d742cff4f4.png | Vending desktop campaign image |
| images/v3/vending-mobile-* | exec-81dff4de-6ec7-4efa-9e50-820ebea314bf.png | Dedicated mobile vending composition |

Production files are resized WebP exports. The generated originals are preserved separately in the project handoff pack.

## Visual constraints used

- Rice remains the unmistakable core of the primary brand imagery.
- Forest green, rice ivory, pale timber and restrained brass define the campaign palette.
- Desktop hero scenes reserve useful left-side space for accessible live HTML copy.
- Mobile images are independently recomposed so faces, hands, rice and vending-machine controls remain inside a safe central frame.
- Product images include no embedded headlines, fabricated product labels or unverifiable packaging.
- Vending imagery depicts sealed snacks and cold drinks only, with no fresh meals, hot beverages or alcohol.
- The vending machine remains forest green with brass trim, five shelves, a touchscreen, contactless reader, dispense flap and botanical linework.
- No raw portrait reference is shipped publicly.

## Role lock

The 2026 creative-development pass changed presentation only. Every production
image is still used in the role it already held, and `tests/check_site.py` now
fails if a role moves between pages:

| Asset | Role |
| --- | --- |
| `images/v3/hero-desktop-*`, `hero-mobile-*` | Homepage hero |
| `images/v3/rice-range-*` | Homepage range stage / Grain range masthead |
| `images/v3/supply-*` | Homepage origin story |
| `images/v3/vending-desktop-*` | Homepage vending band |
| `images/v3/vending-mobile-*` | Homepage vending band (small screens) / Smart vending masthead |

Presentation techniques used, and nothing else: the existing desktop and mobile
variants, controlled crops via `object-position`, fixed aspect frames,
`clip-path` aperture reveals, parallax capped at 26px, and two tonal veils
placed so the copy stays legible. No image was replaced, generated, re-coloured
beyond those veils, or given a different subject.

The Smart vending masthead now serves the upright vending composition at every
width, because that page's picture column is an upright frame. It is the same
approved photograph, in the variant prepared for that shape - the machine, the
contactless reader and the person all stay inside the crop.

## Legacy campaign assets

The earlier quality, table, rice and grains WebP assets remain in the repository for archive continuity and possible secondary use. The fresh-run pages primarily reference the images/v3 set.

## Generator transparency

The built-in image generator was used. Its interface did not expose a user-selectable model name, so this repository makes no unsupported model claim.
