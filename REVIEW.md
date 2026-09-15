# Nafaka Foods website — September 2026 release

The five-page rice-first redesign is complete. It uses the campaign imagery and desktop/mobile compositions recovered from the previous build.

## Delivered

- Home, About, Products, Smart Vending and Contact with a shared forest/ivory visual system, self-hosted Newsreader and Manrope, and responsive WebP imagery.
- Rice remains the core business; smart vending is presented as the newly introduced second business.
- Product-specific enquiry links, optional quantity/business fields, vending-specific fields, plain-text message review and a correctly encoded WhatsApp handoff.
- Keyboard-accessible mobile navigation, focus handling, native FAQs, reduced motion and no-JavaScript contact fallbacks.
- Production indexing metadata, canonical URLs, structured company data, sitemap, robots file and a branded 404 page.
- Fixed an inherited unclosed homepage wrapper and a validation error that could remain after switching from vending to grain.
- Connected the dedicated desktop campaign images on Home, About and Products, and replaced internal image caveats with concise customer-facing copy.

## Validation — 15 September 2026

- 1,714 HTML, asset, CSS, metadata and palette source checks passed across five pages after the final copy and image-source refinement.
- Eight enquiry unit tests passed.
- Chromium checked every page at 320, 360, 390, 430, 768, 1024 and 1440 pixels: no horizontal overflow, broken images or JavaScript errors.
- Axe WCAG A/AA automated scans at 390 and 1440 pixels reported no violations. This is an automated check, not a comprehensive compliance certification.
- Browser interaction checks passed for navigation, Escape closure, FAQs, product prefill, encoded draft recipient/content, conditional fields, whitespace validation and no-JavaScript fallbacks.
- Desktop/mobile screenshots reviewed. Actual WhatsApp messages were not sent; the handoff URL and message content were checked.

## Source decisions

The supplied company profile supports operations starting in Kabale in 2016 and incorporation in 2023. The client feedback establishes Super, Local, Pakistan and Basmati rice as the principal range. The vending proposal supports the managed-service responsibilities and commercial model.

The two company PDFs list different street addresses. The website therefore uses their common Kampala/postal address and asks visitors to contact the team for visits and collection details. Both supplied phone numbers and the email are present.

Generated images illustrate the food story and product categories; they are not identified as actual staff, testimonials or inventory. Raw portrait references are excluded. See assets/IMAGE-PROVENANCE.md. Product prices, grades, quantities and delivery arrangements are confirmed through enquiries.

## Running checks

The site is static and needs no build tool. Serve it with `python3 -m http.server`.

```sh
node --check assets/js/site.js
node --test tests/enquiry.test.cjs
python3 -m pip install -r tests/requirements.txt
python3 tests/check_site.py
```

`tests/browser-check.cjs` requires Playwright and @axe-core/playwright on NODE_PATH. Set CHROMIUM_EXECUTABLE_PATH to an installed Chromium binary when needed. It starts a local server, writes review screenshots/results to /tmp/nafaka-browser-review, and does not send external messages.
