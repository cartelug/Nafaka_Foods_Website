# Nafaka Foods website — fresh-run release

Date: 15 September 2026

## Creative reset

This release is a complete brand-led rebuild, not a refinement of the previous layout.

The central idea is **Grain that moves life forward.** It turns Nafaka’s source material into a customer-facing story about the connection between grain, growers, organisations and everyday nourishment.

The hierarchy is deliberate:

1. Rice is the commercial and visual lead.
2. Maize, beans, soya and selected commodities extend the grain story.
3. Smart vending is presented as a separate new venture.

## Delivered

- Five responsive pages: Home, Our Story, Grain Range, Smart Vending and Contact.
- Six new campaign images with separate desktop and mobile hero compositions.
- A rebuilt forest, rice-ivory and brass visual system with self-hosted Newsreader and Manrope fonts.
- Original brand and marketing copy grounded in the company profile and client feedback.
- Product-specific enquiry links for Super, Local, Pakistan and Basmati rice, maize, beans, soya and wider commodities.
- A vending-specific enquiry flow that requests building context instead of a grain quantity.
- Direct phone, email and WhatsApp routes, plus a plain-text WhatsApp message preview.
- Sticky navigation, mobile menu focus management, scroll progress, restrained reveal motion and reduced-motion support.
- Canonical links, social sharing metadata, structured organisation data, sitemap, robots file and branded 404 page.

## Validation completed

- 1,675 HTML, asset, CSS, metadata and palette checks passed across the five public pages.
- Eight enquiry-generation unit tests passed.
- Both JavaScript files pass syntax validation.
- Every local resource reference resolves.
- Every image includes alternative text and intrinsic dimensions.
- WhatsApp drafts use the verified +256 776 974 521 recipient and remain user-reviewed before sending.
- Raw portrait references are excluded from the public repository.
- Responsive source sets include dedicated 4:5 mobile hero and vending compositions.

The repository also contains tests/browser-check.cjs for full browser rendering, multi-viewport overflow checks, interaction checks and WCAG A/AA automation when Playwright, Axe and Chromium are available.

## Source decisions

The supplied company profile supports operations starting in Kabale in 2016 and incorporation in 2023. Client feedback establishes Super, Local, Pakistan and Basmati rice as the principal range. The vending proposal supports the managed-service responsibilities and the proposed snacks-and-cold-drinks scope.

The two company PDFs list different street addresses. The website therefore uses their common postal address, P.O. Box 10463, Kampala, Uganda, and does not publish either conflicting street address.

Pack sizes, minimum order quantities, current grades, current stock, prices and delivery coverage were not confirmed. The website asks the team to confirm these variable commercial details at enquiry rather than inventing them.

Generated images are campaign illustrations and are not identified as actual staff, facilities, customers, stock or certifications. See assets/IMAGE-PROVENANCE.md.

## Running checks

The site is static and requires no build command. Serve it locally with:

    python3 -m http.server

Then run:

    node --check assets/js/site.js
    node --check assets/js/enquiry.js
    node --test tests/enquiry.test.cjs
    python3 -m pip install -r tests/requirements.txt
    python3 tests/check_site.py
