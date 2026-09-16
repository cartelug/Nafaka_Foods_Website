#!/usr/bin/env python3
"""Assemble the static pages from one source of truth.

The deployed site is plain HTML — GitHub Pages runs no build step and nothing
here is required to serve it. This script exists so the header, footer, quick
bar, metadata and preloader are written once instead of six times.

    python3 tools/build_pages.py          # rewrite the HTML files
    python3 tools/build_pages.py --check  # fail if the files are out of date

Edit this file, not the generated HTML.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://cartelug.github.io/Nafaka_Foods_Website/"

# --- verified business facts. Nothing outside this block may be invented. -----
PHONE_PRIMARY = "+256776974521"
PHONE_PRIMARY_DISPLAY = "+256 776 974 521"
PHONE_ALT = "+256752974521"
PHONE_ALT_DISPLAY = "+256 752 974 521"
EMAIL = "nafakafoodsmc@gmail.com"
POSTAL = "P.O. Box 10463<br>Kampala, Uganda"

WA_GENERAL = ("https://wa.me/256776974521?text=Hello%20Nafaka%20Foods%2C"
              "%20I%20would%20like%20to%20make%20an%20enquiry.")
WA_GRAIN = ("https://wa.me/256776974521?text=Hello%20Nafaka%20Foods%2C"
            "%20I%20would%20like%20to%20make%20a%20grain%20enquiry.")
WA_VENDING = ("https://wa.me/256776974521?text=Hello%20Nafaka%20Foods%2C"
              "%20I%20would%20like%20to%20discuss%20smart%20vending%20for%20my%20building.")

NAV = [
    ("index.html", "Home"),
    ("about.html", "Our story"),
    ("products.html", "Grain range"),
    ("services.html", "Smart vending"),
    ("contact.html", "Contact"),
]

ARROW = '<span class="btn__arrow" aria-hidden="true">&#8599;</span>'
ARROW_DOWN = '<span class="btn__arrow" aria-hidden="true">&#8595;</span>'

MARK_PATH = ('M28 24V9h23v12C64 5 91 9 91 36v28c0 17-10 27-27 27h-7V54c0-9-13-9-13 0v37h-9'
             'C18 91 9 79 9 63V28')
MARK_LEAVES = ('M10 38C-1 32 0 21 0 17c13 0 23 8 23 21-5 1-9 1-13 0ZM23 38c1-14 11-22 22-23 0 '
               '14-7 24-22 25ZM11 57C1 51 0 43 0 39c12 0 22 7 23 19-5 1-8 1-12-1ZM23 57c2-13 '
               '11-20 22-21 0 12-7 23-22 23Z')


def brand(extra_class: str = "") -> str:
    cls = f"brand {extra_class}".strip()
    return (
        f'<a class="{cls}" href="index.html">'
        f'<svg class="brand__mark" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">'
        f'<path d="{MARK_PATH}" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round"/>'
        f'<path d="{MARK_LEAVES}" fill="#5c8b46"/></svg>'
        f'<span class="brand__word">NAFAKA<span>FOODS</span>'
        f'<span class="visually-hidden">— home</span></span></a>'
    )


CURRENT_ATTR = ' aria-current="page"'


def header(current: str, cta_href: str, cta_label: str, cta_target: str = "") -> str:
    links = "".join(
        '<a class="nav-link" href="{href}"{now}>{label}</a>'.format(
            href=href, label=label, now=CURRENT_ATTR if href == current else "")
        for href, label in NAV
    )
    menu_links = "".join(
        '<a class="menu-link" href="{href}"{now}><span>{label}</span>'
        '<span class="menu-link__index" aria-hidden="true">{index:02d}</span></a>'.format(
            href=href, label=label, index=index, now=CURRENT_ATTR if href == current else "")
        for index, (href, label) in enumerate(NAV, start=1)
    )
    return f"""  <header class="site-header">
    <div class="shell nav-rail">
      {brand()}
      <nav class="nav-primary" aria-label="Primary">
        {links}
        <span class="nav-indicator" aria-hidden="true"></span>
      </nav>
      <a class="btn nav-action" href="{cta_href}"{cta_target} data-magnetic>{cta_label} {ARROW}</a>
      <details class="menu">
        <summary class="menu-trigger" aria-label="Open navigation" aria-expanded="false" aria-controls="menu-panel">
          <span class="menu-trigger__ticks" aria-hidden="true"><i></i><i></i><i></i></span>
        </summary>
        <div class="menu-panel" id="menu-panel">
          <nav class="menu-nav" aria-label="Primary, mobile">
            {menu_links}
          </nav>
          <div class="menu-foot">
            <a class="btn" href="{WA_GENERAL}" target="_blank" rel="noopener noreferrer">Start on WhatsApp {ARROW}</a>
            <p class="menu-foot__note">Ugandan grain sourcing and distribution.<br>Building forward since 2016.</p>
          </div>
        </div>
      </details>
    </div>
  </header>"""


def footer(current: str) -> str:
    links = "".join(
        '<a href="{href}"{now}>{label}</a>'.format(
            href=href, label=label, now=CURRENT_ATTR if href == current else "")
        for href, label in NAV
    )
    return f"""  <footer class="site-footer" data-surface="deep">
    <div class="shell">
      <div class="footer-grid">
        <div>
          {brand()}
          <p class="footer-note mt-s">Grain that moves life forward. A Ugandan food business connecting
            supply, opportunity and everyday nourishment.</p>
        </div>
        <div>
          <h2 class="footer-heading">Explore</h2>
          <nav class="footer-links" aria-label="Footer">{links}</nav>
        </div>
        <div>
          <h2 class="footer-heading">Start a conversation</h2>
          <div class="footer-links">
            <a href="tel:{PHONE_PRIMARY}">{PHONE_PRIMARY_DISPLAY}</a>
            <a href="tel:{PHONE_ALT}">{PHONE_ALT_DISPLAY}</a>
            <a href="mailto:{EMAIL}">{EMAIL}</a>
          </div>
          <p class="footer-note mt-s">{POSTAL}</p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; <span data-year>2026</span> Nafaka Foods Limited</span>
        <span>Uganda &middot; East Africa</span>
        <a href="#main">Back to top &#8593;</a>
      </div>
    </div>
  </footer>"""


def quick_bar(wa_href: str, wa_label: str) -> str:
    # A complementary landmark, so its links are not loose outside the page's
    # regions when a screen reader walks the document.
    return f"""  <aside class="quick-bar" data-surface="ivory" aria-label="Quick contact">
    <a class="btn" href="{wa_href}" target="_blank" rel="noopener noreferrer">{wa_label} {ARROW}</a>
    <a class="btn btn--line btn--icon" href="tel:{PHONE_PRIMARY}" aria-label="Call Nafaka Foods on {PHONE_PRIMARY_DISPLAY}">
      <span aria-hidden="true">&#9742;</span>
    </a>
  </aside>"""


GATE = f"""  <div class="grain-gate" aria-hidden="true">
    <div>
      <svg class="grain-gate__mark" viewBox="-14 -12 128 124" fill="none" role="presentation">
        <path class="grain-gate__stroke" d="{MARK_PATH}"/>
        <path class="grain-gate__leaf" d="{MARK_LEAVES}"/>
        <ellipse class="grain-gate__grain" cx="49" cy="53" rx="3.1" ry="6.4"/>
      </svg>
      <p class="grain-gate__label meta">Nafaka Foods</p>
    </div>
  </div>"""

# The only blocking script on the page. It decides whether the gate may run at
# all and guarantees that hidden states are released if site.js never arrives.
BOOT = """<script>
  (function(){var d=document.documentElement;d.classList.add('js');
  try{if(!sessionStorage.getItem('nafaka:seen')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('has-gate')}}catch(e){}
  setTimeout(function(){if(!d.classList.contains('js-ready')){d.classList.remove('js','has-gate')}},3000)})();
  </script>"""


def head(*, title: str, description: str, path: str, og_title: str, og_description: str,
         og_image: str, preloads: str = "", robots: str = "index,follow",
         schema: str = "") -> str:
    canonical = SITE if path == "index.html" else SITE + path
    return f"""<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0a291d">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="robots" content="{robots}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Nafaka Foods">
  <meta property="og:locale" content="en_UG">
  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{og_description}">
  <meta property="og:image" content="{SITE}{og_image}">
  <meta property="og:url" content="{canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="assets/nafaka-mark.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="preload" href="assets/fonts/newsreader-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/manrope-700.woff2" as="font" type="font/woff2" crossorigin>
{preloads}  <link rel="stylesheet" href="assets/css/site.css">
  {BOOT}
  <script src="assets/js/enquiry.js" defer></script>
  <script src="assets/js/site.js" defer></script>
{schema}</head>"""


def page(*, path: str, head_html: str, body_class: str, nav_theme: str, current: str,
         cta_href: str, cta_label: str, cta_target: str, wa_href: str, wa_label: str,
         main: str) -> str:
    body_attr = f' class="{body_class}"' if body_class else ""
    return f"""<!doctype html>
<!-- Generated by tools/build_pages.py — edit that file, not this one. -->
<html lang="en-UG">
{head_html}
<body{body_attr} data-nav="{nav_theme}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="route-progress" data-scroll-progress aria-hidden="true"></div>
{GATE}
{header(current, cta_href, cta_label, cta_target)}

  <main id="main" tabindex="-1">
{main}
  </main>

{footer(current)}
{quick_bar(wa_href, wa_label)}
</body>
</html>
"""


# =============================================================================
# SHARED CONTENT HELPERS
# =============================================================================
def station(index: str, eyebrow: str, title: str, note: str = "", surface_note: str = "") -> str:
    """The recurring section opener: drawn rule, index, eyebrow, display line."""
    note_html = f'<p class="station__note prose">{note}</p>' if note else ""
    grid = ' station__grid' if note else ""
    return f"""<div class="station" data-reveal="draw">
          <p class="eyebrow"><span class="index">{index}</span>{eyebrow}</p>
          <div class="station__head{grid}">
            <h2 class="station__title display-2" data-reveal="fall">{title}</h2>
            {note_html}
          </div>
          {surface_note}
        </div>"""


def close_panel(surface: str, eyebrow: str, title: str, body: str, routes: list) -> str:
    rows = "".join(
        f"""<a class="close-panel__route" href="{href}"{target}>
              <span><strong>{label}</strong><small>{note}</small></span>
              {ARROW}
            </a>"""
        for href, label, note, target in routes
    )
    return f"""    <section class="band band--tall" data-surface="{surface}">
      <div class="shell">
        <div class="close-panel__grid">
          <div data-reveal="fall">
            <p class="eyebrow">{eyebrow}</p>
            <h2 class="display-2 mt-s">{title}</h2>
            <p class="lead mt-s">{body}</p>
          </div>
          <div class="close-panel__routes" data-reveal-group="80">
            {rows}
          </div>
        </div>
      </div>
    </section>"""


def chapters(items: list) -> str:
    links = "".join(
        f'<a class="chapters__link" href="#{anchor}">{label}</a>' for anchor, label in items
    )
    return f"""    <nav class="chapters" data-surface="ivory" aria-label="On this page">
      <div class="chapters__scroll">{links}</div>
    </nav>"""


def accordion(items: list) -> str:
    rows = "".join(
        f"""<details class="accordion__item">
            <summary class="accordion__summary">{question}
              <span class="accordion__mark" aria-hidden="true"></span>
            </summary>
            <div class="accordion__body"><p>{answer}</p></div>
          </details>"""
        for question, answer in items
    )
    return f'<div class="accordion">{rows}</div>'


GRAIN_ROUTE = ("contact.html", "Start a grain enquiry",
               "Rice, maize, beans, soya and wider commodities", "")
VENDING_ROUTE = ("contact.html?product=Smart%20vending", "Discuss smart vending",
                 "Offices, institutions and shared commercial spaces", "")
CALL_ROUTE = (f"tel:{PHONE_PRIMARY}", f"Call {PHONE_PRIMARY_DISPLAY}",
              "Speak to the team directly", "")


# =============================================================================
# HOME
# =============================================================================
RAIL_ITEMS = [
    ("products.html#rice", "Rice"),
    ("products.html#maize", "Maize"),
    ("products.html#beans", "Beans"),
    ("products.html#soya", "Soya"),
    ("products.html#wider-range", "Food commodities"),
    ("products.html#wider-range", "Animal-feed inputs"),
    ("services.html", "Smart vending"),
]

AUDIENCES = [
    ("01", "Retailers &amp; commercial buyers",
     "Grain enquiries shaped around the products, volume and timing your operation needs."),
    ("02", "Schools &amp; health facilities",
     "Staple-food conversations for institutions responsible for feeding people every day."),
    ("03", "Hospitality kitchens",
     "Rice and other grains considered around service demands and recurring supply needs."),
    ("04", "Processors &amp; feed businesses",
     "Maize, soya and selected animal-feed ingredients for millers, farmers and dealers."),
]

RICE_TYPES = [
    ("01", "Super rice", "super-rice", "Super%20rice",
     "Ask our team about the Super rice grades and quantities currently available."),
    ("02", "Local rice", "local-rice", "Local%20rice",
     "The locally grown side of the story. Enquire about current Ugandan varieties."),
    ("03", "Pakistan rice", "pakistan-rice", "Pakistan%20rice",
     "An imported selection; current grade, origin details and supply are confirmed at enquiry."),
    ("04", "Basmati rice", "basmati-rice", "Basmati%20rice",
     "An aromatic long-grain option. Ask about the selection available for your requirement."),
]

HERO_ALT = "A grain specialist examining long-grain white rice in a brass sampling pan"


def home_main() -> str:
    rail = "".join(
        f'<a class="route-rail__item" href="{href}">{label}</a>' for href, label in RAIL_ITEMS
    )
    rice_rows = "".join(
        f"""<a class="rice-row" href="products.html#{anchor}">
                <span class="index">{index}</span>
                <span class="rice-row__name">{name}</span>
                <span class="rice-row__arrow" aria-hidden="true">&#8599;</span>
              </a>"""
        for index, name, anchor, _query, _body in RICE_TYPES
    )
    audiences = "".join(
        f"""<div class="measure-row" data-reveal="advance">
              <span class="index measure-row__index">{index}</span>
              <div>
                <h3 class="measure-row__title display-3">{title}</h3>
              </div>
              <p class="measure-row__body">{body}</p>
            </div>"""
        for index, title, body in AUDIENCES
    )

    return f"""    <section class="hero" data-surface="rice">
      <div class="hero__media parallax" data-depth="22" data-reveal="open">
        <picture>
          <source media="(max-width:63.99em)"
                  srcset="assets/images/v3/hero-mobile-640.webp 640w, assets/images/v3/hero-mobile-960.webp 960w"
                  sizes="100vw" width="640" height="800">
          <img src="assets/images/v3/hero-desktop-1672.webp"
               srcset="assets/images/v3/hero-desktop-1120.webp 1120w, assets/images/v3/hero-desktop-1672.webp 1672w"
               sizes="100vw" alt="{HERO_ALT}"
               width="1672" height="941" fetchpriority="high" decoding="async">
        </picture>
      </div>
      <div class="hero__veil" aria-hidden="true"></div>

      <div class="shell hero__lede">
        <div class="hero__copy">
          <p class="eyebrow">Ugandan grain sourcing &amp; distribution</p>
          <h1 class="hero__title display-1">
            <span class="hero__line"><span>Grain that</span></span>
            <span class="hero__line"><span>moves life</span></span>
            <span class="hero__line hero__line--step"><span><em>forward.</em></span></span>
          </h1>
        </div>
      </div>

      <div class="shell hero__support">
        <div class="hero__copy">
          <p class="lead">From a trusted bowl of rice to the supply behind busy kitchens,
            Nafaka connects quality grain with the people and organisations building East Africa.</p>
          <div class="cluster hero__actions">
            <a class="btn" href="products.html#rice" data-magnetic>Find your rice {ARROW}</a>
            <a class="btn btn--line" href="contact.html">Plan a supply {ARROW}</a>
          </div>
          <ul class="hero__meta">
            <li>Trading since 2016</li>
            <li>Ugandan roots</li>
            <li>Business &amp; institutional supply</li>
          </ul>
        </div>
      </div>
    </section>

    <nav class="route-rail" data-surface="ivory" aria-label="What Nafaka moves">
      <div class="route-rail__track">
        <span class="route-rail__item route-rail__lead" aria-hidden="true">The register</span>
        {rail}
      </div>
    </nav>

    <section class="band" data-surface="ivory">
      <div class="shell">
        {station("01", "More than a commodity", "What grain <em>becomes.</em>")}
        <div class="statement__grid">
          <div class="statement__aside" data-reveal="advance">
            <p class="meta">Source &middot; Movement &middot; Table</p>
            <a class="link" href="about.html">Meet Nafaka {ARROW}</a>
          </div>
          <div data-reveal="fall">
            <p class="quote quote--wide statement__quote">What begins as grain becomes energy for a
              school day, service in a busy kitchen, stock on a shop shelf&mdash;and opportunity for
              a grower.</p>
            <p class="lead">Nafaka works along that chain: sourcing and distributing the staples that
              keep households, enterprises and institutions moving.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="band band--tall" data-surface="forest" id="range">
      <div class="shell">
        {station("02", "The range at our heart", "Rice, with room for <em>choice.</em>",
                 "Local and imported selections for different preferences and purchasing needs. Our team "
                 "confirms current grades, origins, quantities and availability with every enquiry.")}
        <div class="range__stage">
          <div class="figure range__photo parallax" data-depth="18" data-reveal="open">
            <img src="assets/images/v3/rice-range-1536.webp"
                 srcset="assets/images/v3/rice-range-900.webp 900w, assets/images/v3/rice-range-1536.webp 1536w"
                 sizes="(max-width:63.99em) 100vw, 62vw"
                 alt="Four bowls presenting different realistic white-rice grain profiles"
                 width="1536" height="1024" loading="lazy" decoding="async">
          </div>
          <div class="range__index">
            <p class="eyebrow eyebrow--bare">Our core range</p>
            <div class="rice-rows" data-reveal-group="60">
              {rice_rows}
            </div>
            <a class="link" href="products.html">Explore every grain {ARROW}</a>
          </div>
        </div>
      </div>
    </section>

    <section class="band" data-surface="ivory">
      <div class="shell">
        {station("03", "Supply shaped around people",
                 "For the organisations that <em>feed communities.</em>")}
        <div class="measures" data-reveal-group="70">
          {audiences}
        </div>
      </div>
    </section>

    <section class="origin" data-surface="deep">
      <div class="figure origin__media parallax" data-depth="24" data-reveal="open">
        <img src="assets/images/v3/supply-1536.webp"
             srcset="assets/images/v3/supply-900.webp 900w, assets/images/v3/supply-1536.webp 1536w"
             sizes="(max-width:63.99em) 100vw, 51vw"
             alt="A commercial kitchen buyer examining a bowl of uncooked long-grain rice"
             width="1536" height="1024" loading="lazy" decoding="async">
      </div>
      <div class="origin__copy">
        <p class="eyebrow" data-reveal="advance">Built from Kabale, looking outward</p>
        <h2 class="display-2 mt-s" data-reveal="fall">A local beginning.<br><em>A regional ambition.</em></h2>
        <p class="lead mt-s" data-reveal="settle">Nafaka began with local and imported rice trading in
          Kabale. The business grew into Nafaka Foods Limited with a wider purpose: create stronger
          routes to market for farmers and move quality food toward the people who need it.</p>
        <div class="origin__milestones" data-reveal-group="70">
          <div class="origin__milestone" data-reveal="settle">
            <strong class="numeral">2016</strong><span>Operations began</span>
          </div>
          <div class="origin__milestone" data-reveal="settle">
            <strong class="numeral">2023</strong><span>Limited company</span>
          </div>
          <div class="origin__milestone" data-reveal="settle">
            <strong class="numeral">EA</strong><span>Regional outlook</span>
          </div>
        </div>
        <p class="mt-m" data-reveal="settle"><a class="link" href="about.html">Read our story {ARROW}</a></p>
      </div>
    </section>

    <section class="venture" data-surface="deep">
      <div class="figure venture__media parallax" data-depth="20" data-reveal="open">
        <picture>
          <source media="(max-width:56.24em)"
                  srcset="assets/images/v3/vending-mobile-640.webp 640w, assets/images/v3/vending-mobile-960.webp 960w"
                  sizes="100vw" width="640" height="800">
          <img src="assets/images/v3/vending-desktop-1672.webp"
               srcset="assets/images/v3/vending-desktop-1120.webp 1120w, assets/images/v3/vending-desktop-1672.webp 1672w"
               sizes="100vw"
               alt="A professional using a phone at a smart snacks-and-drinks vending machine"
               width="1672" height="941" loading="lazy" decoding="async">
        </picture>
      </div>
      <div class="venture__veil" aria-hidden="true"></div>
      <div class="venture__copy">
        <div class="venture__inner">
          <p class="venture__tag" data-reveal="advance"><span>New venture</span> Smart vending</p>
          <h2 class="display-2" data-reveal="fall">Convenience, <em>placed well.</em></h2>
          <p class="lead mt-s" data-reveal="settle">Managed snacks and cold-drinks vending designed for
            the places people work, study, visit and wait.</p>
          <p class="mt-m" data-reveal="settle">
            <a class="btn" href="services.html" data-magnetic>Explore the vending service {ARROW}</a>
          </p>
        </div>
      </div>
    </section>

{close_panel("rice", "Your next supply starts with a conversation",
             "Tell us what needs to <em>move.</em>",
             "Share the product, quantity, location and timing. We&rsquo;ll help shape the next step.",
             [GRAIN_ROUTE, VENDING_ROUTE, CALL_ROUTE])}"""


# =============================================================================
# OUR STORY
# =============================================================================
CHRONOLOGY = [
    ("2016", "The first trade",
     "Operations began in Kabale Town with locally grown rice varieties and imported rice."),
    ("2023", "A company takes shape",
     "The growing business formally incorporated as Nafaka Foods Limited."),
    ("Next", "A wider food future",
     "The direction expands across grain, food supply and practical innovation for regional markets."),
]

DIRECTION = [
    ("01", "Why we move",
     "To help feed communities by keeping quality food within reach for the people and "
     "organisations that depend on it."),
    ("02", "How we work",
     "Source and distribute quality, nutritious food through responsible agricultural and "
     "commercial practices that support sustainable growth."),
    ("03", "Where we are going",
     "Build a leading agribusiness trade company with regional reach, creating jobs, "
     "strengthening food security and opening wider markets."),
]

VALUES = [
    ("01", "Quality",
     "We begin with a simple question: does this product belong in the food chain we want to help build?"),
    ("02", "Consistency",
     "Reliability is part of the product&mdash;from the first conversation through the agreed supply arrangement."),
    ("03", "Customer centricity",
     "The order starts with the buyer&rsquo;s real requirement, not a one-size-fits-all assumption."),
    ("04", "Innovation &amp; sustainability",
     "We keep looking for smarter, more responsible ways to source, serve and grow."),
]


def about_main() -> str:
    entries = "".join(
        f"""<article class="chronology__entry" data-reveal="advance">
              <p class="chronology__year numeral">{year}</p>
              <h3 class="chronology__title display-3">{title}</h3>
              <p class="chronology__body">{body}</p>
            </article>"""
        for year, title, body in CHRONOLOGY
    )
    direction = "".join(
        f"""<div class="measure-row" data-reveal="advance">
              <span class="index measure-row__index">{index}</span>
              <div><h3 class="measure-row__title display-3">{title}</h3></div>
              <p class="measure-row__body">{body}</p>
            </div>"""
        for index, title, body in DIRECTION
    )
    values = "".join(
        f"""<article class="principle" data-reveal="settle">
              <span class="index">{index}</span>
              <h3 class="principle__title display-3">{title}</h3>
              <p class="principle__body">{body}</p>
            </article>"""
        for index, title, body in VALUES
    )

    return f"""    <section class="masthead" data-surface="rice">
      <div class="shell">
        <p class="masthead__crumb"><a href="index.html">Home</a> <span aria-hidden="true">/</span> Our story</p>
        <div class="masthead__grid">
          <div>
            <p class="eyebrow" data-reveal="advance">Why Nafaka exists</p>
            <h1 class="masthead__title display-1 mt-s" data-reveal="fall">Food moves when <em>people connect.</em></h1>
          </div>
          <div class="masthead__aside" data-reveal="settle">
            <p class="lead">We began with rice and a practical belief: when growers have stronger routes
              to market and buyers have dependable access to food, communities move forward.</p>
            <a class="link btn--down" href="#journey">Follow our journey {ARROW_DOWN}</a>
          </div>
        </div>
      </div>
    </section>

{chapters([("purpose", "Purpose"), ("journey", "Journey"),
           ("direction", "Direction"), ("values", "Values")])}

    <section class="band" data-surface="ivory" id="purpose">
      <div class="shell">
        {station("01", "Our role in the chain", "Between the harvest and <em>the table.</em>")}
        <div class="statement__grid">
          <div class="statement__aside" data-reveal="advance">
            <p class="meta">Trading &middot; Value addition &middot; Distribution</p>
            <p class="lead">Nafaka Foods is a Ugandan agribusiness focused on grain trading, value
              addition and distribution.</p>
          </div>
          <div data-reveal="fall">
            <p class="quote quote--wide statement__quote">Our work sits between the harvest and the
              people who turn grain into meals, livelihoods and momentum.</p>
            <p class="prose">We serve commercial businesses, schools, health facilities, hospitality
              providers, government institutions, NGOs, poultry farmers, animal-feed dealers and millers.
              Different operations need different conversations; our job is to understand the requirement
              and help move the right product toward it.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="band band--tall" data-surface="deep" id="journey">
      <div class="shell">
        {station("02", "A business built in stages", "Rooted here. <em>Growing outward.</em>",
                 "What started as rice trading in Kabale has grown into a wider grain and "
                 "food-distribution ambition for Uganda and the East African region.")}
        <div class="chronology" data-reveal-group="90">
          {entries}
        </div>
      </div>
    </section>

    <section class="band" data-surface="ivory" id="direction">
      <div class="shell">
        {station("03", "Purpose, mission and vision", "A clear direction for <em>every connection.</em>")}
        <div class="measures" data-reveal-group="70">
          {direction}
        </div>
      </div>
    </section>

    <section class="band" data-surface="rice" id="values">
      <div class="shell">
        {station("04", "The standards underneath the work", "Values made <em>practical.</em>")}
        <div class="principles" data-reveal-group="70">
          {values}
        </div>
      </div>
    </section>

{close_panel("deep", "Build the next link", "Let&rsquo;s move good food <em>forward.</em>",
             "Tell us what your organisation needs and where it needs to go.",
             [GRAIN_ROUTE,
              ("products.html", "Explore the range",
               "Rice first, with maize, beans, soya and more alongside it", ""),
              CALL_ROUTE])}"""


# =============================================================================
# GRAIN RANGE
# =============================================================================
COMMODITIES = [
    ("maize", "Maize", "Food &amp; feed applications",
     "High-quality maize products for food production and animal-feed needs.",
     "Maize", "Enquire about maize"),
    ("beans", "Beans", "Popular Ugandan varieties",
     "A range spanning familiar bean varieties; ask what is currently available.",
     "Beans", "Enquire about beans"),
    ("soya", "Soya", "Protein-rich crop",
     "Soya bean products for food, processing and other relevant applications.",
     "Soya%20bean", "Enquire about soya"),
]

ORDER_STEPS = [
    ("01", "Name the grain", "Tell us the rice variety or commodity you are looking for."),
    ("02", "Set the context",
     "Share the estimated quantity, delivery location, timing and whether the need is recurring."),
    ("03", "Shape the supply",
     "Our team discusses current availability, pricing, grades, pack sizes and practical "
     "arrangements with you."),
]

PRODUCT_FAQ = [
    ("Are pack sizes and minimum quantities listed online?",
     "No fixed sizes or minimum quantities are published here. They are confirmed with the team "
     "because current stock and supply arrangements can differ by product."),
    ("Can Nafaka supply businesses and institutions?",
     "Yes. The company profile includes commercial buyers, education and health institutions, "
     "hospitality providers, government organisations, NGOs, farmers, feed dealers and millers "
     "among its target clients."),
    ("How do I receive current pricing?",
     "Send the product, quantity, location and timing through the enquiry form or WhatsApp. The "
     "team will discuss current availability and commercial details directly."),
]


def products_main() -> str:
    rice = "".join(
        f"""<a class="measure-row" id="{anchor}" href="contact.html?product={query}" data-reveal="advance">
              <span class="index measure-row__index">{index}</span>
              <div><h3 class="measure-row__title display-3">{name}</h3></div>
              <p class="measure-row__body">{body}</p>
              <span class="measure-row__arrow" aria-hidden="true">&#8599;</span>
            </a>"""
        for index, name, anchor, query, body in RICE_TYPES
    )
    commodities = "".join(
        f"""<article class="commodity" id="{anchor}" data-reveal="settle">
              <p class="meta">{label}</p>
              <h3 class="commodity__name display-2">{name}</h3>
              <p class="commodity__body">{body}</p>
              <a class="link" href="contact.html?product={query}">{cta} {ARROW}</a>
            </article>"""
        for anchor, name, label, body, query, cta in COMMODITIES
    )
    steps = "".join(
        f"""<article class="sequence__step" data-reveal="advance">
              <span class="index">{index}</span>
              <h3 class="sequence__title display-3">{title}</h3>
              <p class="sequence__body">{body}</p>
            </article>"""
        for index, title, body in ORDER_STEPS
    )

    return f"""    <section class="masthead masthead--split" data-surface="deep">
      <div class="masthead__grid">
        <div class="masthead__panel">
          <p class="masthead__crumb"><a href="index.html">Home</a> <span aria-hidden="true">/</span> Grain range</p>
          <p class="eyebrow" data-reveal="advance">The Nafaka range</p>
          <h1 class="display-1 mt-s" data-reveal="fall">Find the grain that <em>fits.</em></h1>
          <p class="lead mt-s" data-reveal="settle">Rice leads our range. Maize, beans, soya and
            selected commodities extend the possibilities for food businesses, institutions and processors.</p>
          <p class="mt-m" data-reveal="settle">
            <a class="btn btn--down" href="#rice" data-magnetic>Start with rice {ARROW_DOWN}</a>
          </p>
        </div>
        <div class="figure masthead__media parallax" data-depth="20" data-reveal="open">
          <img src="assets/images/v3/rice-range-1536.webp"
               srcset="assets/images/v3/rice-range-900.webp 900w, assets/images/v3/rice-range-1536.webp 1536w"
               sizes="(max-width:63.99em) 100vw, 57vw"
               alt="Four bowls of uncooked white rice showing different grain profiles"
               width="1536" height="1024" fetchpriority="high" decoding="async">
        </div>
      </div>
    </section>

{chapters([("rice", "Rice range"), ("other-grains", "Other grains"),
           ("wider-range", "Wider range"), ("ordering", "How to enquire")])}

    <section class="band" data-surface="ivory" id="rice">
      <div class="shell">
        {station("01", "The foundation of our business",
                 "Four names. One clear place to <em>begin.</em>",
                 "Every row opens an enquiry with that variety already selected. Grades, origins and "
                 "current availability are confirmed by the team.")}
        <div class="measures" data-reveal-group="70">
          {rice}
        </div>
      </div>
    </section>

    <section class="band band--tall" data-surface="forest" id="other-grains">
      <div class="shell">
        {station("02", "Beyond rice", "Staples that keep more work <em>moving.</em>",
                 "Our wider grain range supports food production, institutional kitchens and selected "
                 "animal-feed requirements.")}
        <div class="commodities" data-reveal-group="80">
          {commodities}
        </div>
        <div class="wide-note" data-surface="moss" id="wider-range" data-reveal="settle">
          <h3 class="display-3">More within reach</h3>
          <div>
            <p class="prose">The company&rsquo;s wider scope includes sugar, coffee, cocoa and
              animal-feed inputs such as concentrates, premix and additives. Availability is confirmed
              directly with our team.</p>
            <p class="mt-s"><a class="link" href="contact.html?product=Other%20commodities">Ask about another product {ARROW}</a></p>
          </div>
        </div>
      </div>
    </section>

    <section class="band" data-surface="ivory" id="ordering">
      <div class="shell">
        {station("03", "A clearer path to supply", "From requirement to <em>next step.</em>")}
        <div class="sequence" data-reveal-group="80">
          {steps}
        </div>
      </div>
    </section>

    <section class="band band--tight" data-surface="rice">
      <div class="shell">
        {station("04", "Before you enquire", "Useful answers, <em>up front.</em>")}
        {accordion(PRODUCT_FAQ)}
      </div>
    </section>

{close_panel("ivory", "Ready when your requirement is", "Let&rsquo;s find the right <em>grain.</em>",
             "Begin with a product and a quantity. We&rsquo;ll build the conversation from there.",
             [GRAIN_ROUTE,
              (WA_GRAIN, "Message us on WhatsApp",
               "Opens a chat with the team &mdash; nothing is sent until you press send",
               ' target="_blank" rel="noopener noreferrer"'),
              CALL_ROUTE])}"""


# =============================================================================
# SMART VENDING
# =============================================================================
VENDING_SPECS = [
    ("01", "Convenience within reach",
     "Sealed snacks and cold drinks available inside the building, reducing the need for an extra trip."),
    ("02", "A better daily experience",
     "A useful amenity for staff, tenants, students, patients, visitors and meeting guests."),
    ("03", "Managed from end to end",
     "Nafaka proposes the machine, installation, stock, monitoring, maintenance and customer support."),
    ("04", "Agreed for the location",
     "Final machine features and product selection are agreed for each approved setting."),
]

VENDING_STOCK = ["Biscuits &amp; cookies", "Crisps", "Confectionery", "Energy bars",
                 "Bottled water", "Soft drinks", "Juices", "Energy drinks", "Iced beverages"]

VENDING_PROCESS = [
    ("01", "Assess", "Review the building, footfall, visibility, power and security."),
    ("02", "Agree", "Confirm the engagement model, access and commercial terms."),
    ("03", "Install", "Deliver, position and commission the selected equipment."),
    ("04", "Prepare", "Load inventory, test operations and provide user guidance."),
    ("05", "Support", "Monitor the service, replenish stock and maintain the machine."),
]

VENDING_FAQ = [
    ("Which locations can be considered?",
     "The proposal covers commercial and institutional settings such as office buildings, hospitals, "
     "universities, churches, banks, airports, industrial facilities and government offices. Every "
     "location is assessed before agreement."),
    ("What does the building provide?",
     "A suitable agreed space, access to power and support for the equipment&rsquo;s safety and "
     "security. Rent, utilities, access and the wider commercial arrangement are agreed with Nafaka."),
    ("Can the service operate after normal hours?",
     "The machines can support extended-hours access where the building&rsquo;s access, power, "
     "security and agreed operating conditions allow it."),
    ("Who restocks and maintains the machine?",
     "Under the proposed managed model, Nafaka handles stock replenishment, monitoring, preventive "
     "maintenance and technical and customer-care support."),
]


def services_main() -> str:
    specs = "".join(
        f"""<div class="spec" data-reveal="advance">
              <span class="index">{index}</span>
              <div>
                <h3 class="spec__title display-3">{title}</h3>
                <p class="spec__body">{body}</p>
              </div>
            </div>"""
        for index, title, body in VENDING_SPECS
    )
    tags = "".join(f"<li>{item}</li>" for item in VENDING_STOCK)
    process = "".join(
        f"""<article class="sequence__step" data-reveal="advance">
              <span class="index">{index}</span>
              <h3 class="sequence__title display-4">{title}</h3>
              <p class="sequence__body">{body}</p>
            </article>"""
        for index, title, body in VENDING_PROCESS
    )

    return f"""    <section class="masthead masthead--split" data-surface="deep">
      <div class="masthead__grid">
        <div class="masthead__panel">
          <p class="masthead__crumb"><a href="index.html">Home</a> <span aria-hidden="true">/</span> Smart vending</p>
          <p class="venture__tag" data-reveal="advance"><span>New venture</span> Beyond grain</p>
          <h1 class="display-1" data-reveal="fall">Refreshment, right where the day <em>happens.</em></h1>
          <p class="lead mt-s" data-reveal="settle">A professionally managed snacks-and-drinks service
            designed for offices, institutions and shared commercial spaces.</p>
          <p class="mt-m" data-reveal="settle">
            <a class="btn" href="contact.html?product=Smart%20vending" data-magnetic>Discuss your building {ARROW}</a>
          </p>
        </div>
        <div class="figure masthead__media parallax" data-depth="18" data-reveal="open">
          <!-- The upright vending composition, in an upright frame: the machine,
               the reader and the person all stay inside the crop at every width. -->
          <img src="assets/images/v3/vending-mobile-960.webp"
               srcset="assets/images/v3/vending-mobile-640.webp 640w, assets/images/v3/vending-mobile-960.webp 960w"
               sizes="(max-width:63.99em) 100vw, 57vw"
               alt="A professional making a contactless purchase from a snacks-and-drinks vending machine"
               width="640" height="800" fetchpriority="high" decoding="async">
        </div>
      </div>
    </section>

{chapters([("why", "Why it works"), ("service", "The service"),
           ("process", "The process"), ("questions", "Questions")])}

    <section class="band" data-surface="ivory" id="why">
      <div class="shell">
        {station("01", "A small amenity with daily value",
                 "Less time looking. More time <em>living and working.</em>")}
        <div class="specs" data-reveal-group="70">
          {specs}
        </div>
      </div>
    </section>

    <section class="split" data-surface="deep" id="service">
      <div class="split__half">
        <p class="eyebrow" data-reveal="advance">What people can choose</p>
        <h2 class="display-2 mt-s" data-reveal="fall">Snacks. Cold drinks. <em>Simple access.</em></h2>
        <p class="prose mt-s" data-reveal="settle">The proposed range is built around sealed,
          self-service refreshments suitable for each approved location.</p>
        <ul class="tags" data-reveal="settle">{tags}</ul>
      </div>
      <div class="split__half">
        <p class="eyebrow" data-reveal="advance">What Nafaka manages</p>
        <h2 class="display-2 mt-s" data-reveal="fall">Technology with a <em>human service.</em></h2>
        <p class="prose mt-s" data-reveal="settle">The proposed solution combines cash and cashless
          payment options, temperature-controlled beverage storage and stock monitoring with ongoing
          operational support.</p>
        <p class="prose mt-s" data-reveal="settle">Fresh prepared meals, hot beverages and alcohol are
          outside the proposed range. Final machine features and product selection are agreed for
          the location.</p>
      </div>
    </section>

    <section class="band" data-surface="ivory" id="process">
      <div class="shell">
        {station("02", "A practical route to placement",
                 "From promising space to <em>working service.</em>")}
        <div class="sequence sequence--five" data-reveal-group="60">
          {process}
        </div>
      </div>
    </section>

    <section class="band band--tight" data-surface="rice" id="questions">
      <div class="shell">
        {station("03", "A fit for the right setting", "Before a machine <em>moves in.</em>")}
        {accordion(VENDING_FAQ)}
      </div>
    </section>

{close_panel("deep", "Start with the setting", "Could vending work <em>here?</em>",
             "Tell us about the building, location and approximate daily footfall.",
             [VENDING_ROUTE,
              (WA_VENDING, "Message us on WhatsApp",
               "Opens a chat with the team &mdash; nothing is sent until you press send",
               ' target="_blank" rel="noopener noreferrer"'),
              CALL_ROUTE])}"""


# =============================================================================
# CONTACT
# =============================================================================
CONTACT_FAQ = [
    ("What belongs in a grain enquiry?",
     "The product, estimated quantity, town or delivery area and preferred timing. If your "
     "organisation needs recurring supply, include the likely frequency."),
    ("What belongs in a vending enquiry?",
     "The building type, location, approximate daily footfall and any potential installation area "
     "you already have in mind."),
    ("Does the form confirm an order?",
     "No. It only prepares a WhatsApp enquiry. An order or vending arrangement is confirmed after "
     "the details and commercial terms are agreed directly."),
]

PRODUCT_OPTIONS = ["Rice — general", "Super rice", "Local rice", "Pakistan rice", "Basmati rice",
                   "Maize", "Beans", "Soya bean", "Other commodities", "Smart vending"]


def contact_main() -> str:
    options = "".join(f"<option>{name}</option>" for name in PRODUCT_OPTIONS)
    return f"""    <section class="masthead" data-surface="deep">
      <div class="shell">
        <p class="masthead__crumb"><a href="index.html">Home</a> <span aria-hidden="true">/</span> Contact</p>
        <div class="masthead__grid">
          <div>
            <p class="eyebrow" data-reveal="advance">Start where you are</p>
            <h1 class="masthead__title display-1 mt-s" data-reveal="fall">What needs to <em>move?</em></h1>
          </div>
          <div class="masthead__aside" data-reveal="settle">
            <p class="lead">A rice requirement. A recurring grain supply. A vending opportunity. Give us
              the context and we&rsquo;ll help shape the next conversation.</p>
            <a class="btn" href="{WA_GENERAL}" target="_blank" rel="noopener noreferrer" data-magnetic>Message us directly {ARROW}</a>
          </div>
        </div>
      </div>
    </section>

    <section class="band" data-surface="ivory">
      <div class="shell contact-layout">
        <aside data-reveal="advance">
          <p class="eyebrow">Reach the team</p>
          <div class="contact-methods mt-s">
            <div class="contact-method">
              <span class="contact-method__label">Primary phone &amp; WhatsApp</span>
              <a class="contact-method__value" href="tel:{PHONE_PRIMARY}">{PHONE_PRIMARY_DISPLAY}</a>
            </div>
            <div class="contact-method">
              <span class="contact-method__label">Alternative phone</span>
              <a class="contact-method__value" href="tel:{PHONE_ALT}">{PHONE_ALT_DISPLAY}</a>
            </div>
            <div class="contact-method">
              <span class="contact-method__label">Email</span>
              <a class="contact-method__value" href="mailto:{EMAIL}">{EMAIL}</a>
            </div>
            <div class="contact-method">
              <span class="contact-method__label">Postal address</span>
              <span class="contact-method__value">{POSTAL}</span>
            </div>
          </div>
        </aside>

        <div data-reveal="settle">
          <h2 class="display-2">Give us the <em>starting point.</em></h2>
          <p class="lead mt-s">Two kinds of enquiry start here. Pick the one that matches your need&mdash;the
            form adapts to it.</p>

          <div class="enquiry-routes mt-m" role="group" aria-label="Choose the kind of enquiry">
            <a class="enquiry-route" href="contact.html?product=Rice%20%E2%80%94%20general#enquiry-form"
               data-route-product="Rice — general">
              <strong>Grain supply</strong>
              <small>Rice, maize, beans, soya and wider commodities. Tell us the product, quantity,
                location and timing.</small>
            </a>
            <a class="enquiry-route" href="contact.html?product=Smart%20vending#enquiry-form"
               data-route-product="Smart vending">
              <strong>Smart vending</strong>
              <small>Offices, institutions and shared commercial spaces. Tell us the building,
                location and daily footfall.</small>
            </a>
          </div>

          <noscript>
            <p class="form-note">The message builder needs JavaScript. Please use the WhatsApp,
              telephone or email links on this page instead.</p>
          </noscript>

          <form id="enquiry-form" action="contact.html" method="get" novalidate>
            <div class="form-grid">
              <div class="field field--full">
                <label class="field__label" for="product">What are you interested in?</label>
                <select id="product" name="product">{options}</select>
              </div>
              <div class="field">
                <label class="field__label" for="name">Your name <span class="field__req" aria-hidden="true">*</span></label>
                <input id="name" name="name" type="text" autocomplete="name" enterkeyhint="next"
                       maxlength="100" placeholder="Your full name" required
                       aria-describedby="name-error" data-required="Please tell us who we are replying to.">
                <p class="field__error" id="name-error"></p>
              </div>
              <div class="field">
                <label class="field__label" for="business">Business or institution</label>
                <input id="business" name="business" type="text" autocomplete="organization"
                       enterkeyhint="next" maxlength="150" placeholder="Organisation name, if relevant">
              </div>
              <div class="field" id="quantity-field">
                <label class="field__label" for="quantity">Estimated quantity</label>
                <input id="quantity" name="quantity" type="text" inputmode="text" enterkeyhint="next"
                       maxlength="100" placeholder="For example, 100 kg">
              </div>
              <div class="field">
                <label class="field__label" for="location">Your location <span class="field__req" aria-hidden="true">*</span></label>
                <input id="location" name="location" type="text" autocomplete="address-level2"
                       enterkeyhint="next" maxlength="150" placeholder="Town or area" required
                       aria-describedby="location-error" data-required="Please add the town or area for delivery.">
                <p class="field__error" id="location-error"></p>
              </div>
              <div class="field field--full">
                <label class="field__label" for="details"><span data-details-label>Anything
                  else we should know?</span>
                  <span class="field__req" aria-hidden="true" hidden>*</span></label>
                <textarea id="details" name="details" maxlength="1000" enterkeyhint="done"
                          placeholder="Delivery timing, recurring needs or questions"
                          aria-describedby="details-error"></textarea>
                <p class="field__error" id="details-error"></p>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn" type="submit" disabled>Prepare my WhatsApp message {ARROW}</button>
              <p class="form-note">Nothing is sent automatically and no payment is taken here. You
                review the message before it goes anywhere.</p>
            </div>
            <p class="form-note form-status" id="enquiry-status" role="status" aria-live="polite"></p>
          </form>

          <section class="draft" id="enquiry-draft" aria-labelledby="draft-title" hidden>
            <h3 class="display-3" id="draft-title">Your message is ready</h3>
            <pre class="draft__text" id="draft-text"></pre>
            <a class="btn" id="draft-send" href="{WA_GENERAL}" target="_blank" rel="noopener noreferrer">Open WhatsApp to send {ARROW}</a>
            <p class="form-note mt-s">Nothing has been sent yet. WhatsApp opens with this text ready
              for you to check and send.</p>
          </section>
        </div>
      </div>
    </section>

    <section class="band band--tight" data-surface="rice">
      <div class="shell">
        {station("01", "Help us begin well", "The details that <em>matter.</em>")}
        {accordion(CONTACT_FAQ)}
      </div>
    </section>"""


def not_found_main() -> str:
    routes = [
        ("index.html", "Return to the homepage", "Grain that moves life forward", ""),
        ("products.html", "Browse the grain range", "Rice first, with maize, beans and soya alongside", ""),
        ("contact.html", "Start an enquiry", "Tell us what needs to move", ""),
    ]
    rows = "".join(
        f"""<a class="close-panel__route" href="{href}">
              <span><strong>{label}</strong><small>{note}</small></span>
              {ARROW}
            </a>"""
        for href, label, note, _t in routes
    )
    return f"""    <section class="lost" data-surface="deep">
      <div class="shell">
        <p class="eyebrow"><span class="index">404</span>Page not found</p>
        <h1 class="display-1 mt-s">This page has <em>moved on.</em></h1>
        <p class="lead mt-s">The link may be old or mistyped. Everything Nafaka offers is still one
          step away.</p>
        <div class="close-panel__routes lost__routes">{rows}</div>
      </div>
    </section>"""


# =============================================================================
# ASSEMBLY
# =============================================================================
ORG_SCHEMA = """  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Nafaka Foods Limited","url":"https://cartelug.github.io/Nafaka_Foods_Website/","logo":"https://cartelug.github.io/Nafaka_Foods_Website/assets/nafaka-logo.webp","foundingDate":"2023","description":"A Ugandan grain trading, value addition and food distribution company whose operations began in Kabale in 2016.","email":"nafakafoodsmc@gmail.com","telephone":"+256776974521","address":{"@type":"PostalAddress","addressLocality":"Kampala","addressCountry":"UG","postOfficeBoxNumber":"10463"},"contactPoint":[{"@type":"ContactPoint","contactType":"sales","telephone":"+256776974521"},{"@type":"ContactPoint","contactType":"sales","telephone":"+256752974521"}]}</script>
"""

HOME_PRELOAD = (
    '  <link rel="preload" href="assets/images/v3/hero-desktop-1672.webp" as="image" '
    'media="(min-width:64em)">\n'
    '  <link rel="preload" href="assets/images/v3/hero-mobile-960.webp" as="image" '
    'media="(max-width:63.99em)">\n'
)

PAGES = [
    dict(
        path="index.html",
        title="Nafaka Foods | Grain That Moves Life Forward",
        description="Nafaka Foods sources and distributes rice, maize, beans and soya for kitchens, "
                    "businesses and institutions across Uganda and East Africa.",
        og_title="Nafaka Foods | Grain That Moves Life Forward",
        og_description="Rice at the heart of a growing Ugandan grain business, connecting quality food "
                       "with the people and organisations that need it.",
        og_image="assets/images/v3/hero-desktop-1672.webp",
        preloads=HOME_PRELOAD,
        schema=ORG_SCHEMA,
        body_class="",
        nav_theme="light",
        cta_href="contact.html", cta_label="Plan your supply",
        wa_href=WA_GENERAL, wa_label="Enquire on WhatsApp",
        main=home_main,
    ),
    dict(
        path="about.html",
        title="Our Story | Nafaka Foods",
        description="Discover Nafaka Foods’ journey from rice trading in Kabale in 2016 to a "
                    "Ugandan grain and food-distribution company with a regional outlook.",
        og_title="Our Story | Nafaka Foods",
        og_description="A Ugandan grain business creating stronger connections between farmers, food "
                       "and the organisations that serve communities.",
        og_image="assets/images/v3/supply-1536.webp",
        body_class="", nav_theme="light",
        cta_href="contact.html", cta_label="Plan your supply",
        wa_href=WA_GENERAL, wa_label="Enquire on WhatsApp",
        main=about_main,
    ),
    dict(
        path="products.html",
        title="Rice, Maize, Beans &amp; Soya | Nafaka Foods",
        description="Explore Nafaka Foods’ Super, Local, Pakistan and Basmati rice, together with "
                    "maize, beans, soya and selected food and animal-feed commodities.",
        og_title="The Nafaka Grain Range",
        og_description="Rice at the heart, with maize, beans, soya and selected commodities alongside it.",
        og_image="assets/images/v3/rice-range-1536.webp",
        body_class="", nav_theme="dark",
        cta_href="contact.html", cta_label="Plan your supply",
        wa_href=WA_GRAIN, wa_label="Enquire on WhatsApp",
        main=products_main,
    ),
    dict(
        path="services.html",
        title="Managed Smart Vending | Nafaka Foods",
        description="Bring professionally managed snacks and cold-drinks vending to your office, "
                    "institution or commercial building with Nafaka Foods.",
        og_title="Smart Vending by Nafaka Foods",
        og_description="A managed refreshment service designed around the places people work, study, "
                       "visit and wait.",
        og_image="assets/images/v3/vending-desktop-1672.webp",
        body_class="", nav_theme="dark",
        cta_href="contact.html?product=Smart%20vending", cta_label="Discuss a location",
        wa_href=WA_VENDING, wa_label="Discuss vending",
        main=services_main,
    ),
    dict(
        path="contact.html",
        title="Contact &amp; Supply Enquiries | Nafaka Foods",
        description="Talk to Nafaka Foods about rice, grain supply or smart vending. Prepare a direct "
                    "WhatsApp enquiry, call or email the team.",
        og_title="Start a Conversation | Nafaka Foods",
        og_description="Tell Nafaka what you need, where it needs to go and when you need it.",
        og_image="assets/images/v3/hero-desktop-1672.webp",
        body_class="", nav_theme="dark",
        cta_href=WA_GENERAL, cta_label="Open WhatsApp",
        cta_target=' target="_blank" rel="noopener noreferrer"',
        wa_href=WA_GENERAL, wa_label="Enquire on WhatsApp",
        main=contact_main,
    ),
    dict(
        path="404.html",
        title="Page Not Found | Nafaka Foods",
        description="The page you requested could not be found. Return to Nafaka Foods or start a "
                    "grain enquiry.",
        og_title="Page Not Found | Nafaka Foods",
        og_description="The link may be old. The Nafaka range is right where it should be.",
        og_image="assets/images/v3/hero-desktop-1672.webp",
        robots="noindex,follow",
        body_class="", nav_theme="dark",
        cta_href="contact.html", cta_label="Plan your supply",
        wa_href=WA_GENERAL, wa_label="Enquire on WhatsApp",
        main=not_found_main,
    ),
]


def render(spec: dict) -> str:
    head_html = head(
        title=spec["title"],
        description=spec["description"],
        path=spec["path"],
        og_title=spec["og_title"],
        og_description=spec["og_description"],
        og_image=spec["og_image"],
        preloads=spec.get("preloads", ""),
        robots=spec.get("robots", "index,follow"),
        schema=spec.get("schema", ""),
    )
    current = spec["path"] if spec["path"] != "404.html" else ""
    return page(
        path=spec["path"],
        head_html=head_html,
        body_class=spec["body_class"],
        nav_theme=spec["nav_theme"],
        current=current,
        cta_href=spec["cta_href"],
        cta_label=spec["cta_label"],
        cta_target=spec.get("cta_target", ""),
        wa_href=spec["wa_href"],
        wa_label=spec["wa_label"],
        main=spec["main"](),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="exit non-zero if any generated file is out of date")
    args = parser.parse_args()

    stale = []
    for spec in PAGES:
        target = ROOT / spec["path"]
        rendered = render(spec)
        if args.check:
            if not target.exists() or target.read_text(encoding="utf-8") != rendered:
                stale.append(spec["path"])
        else:
            target.write_text(rendered, encoding="utf-8")
            print(f"wrote {spec['path']}")

    if args.check:
        if stale:
            print("out of date: " + ", ".join(stale), file=sys.stderr)
            return 1
        print(f"{len(PAGES)} pages match tools/build_pages.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
