/* =============================================================================
   NAFAKA FOODS — interaction layer
   -----------------------------------------------------------------------------
   No framework and no animation library. Everything the motion grammar needs
   (masked reveals, aperture clips, scroll-linked transforms) is native CSS; a
   library would add payload and a second source of truth for timing without
   changing a single frame on the devices this site is built for.

   Rules this file keeps:
   · one rAF loop writes all scroll-linked values; nothing else reads layout
     during scroll
   · geometry is measured on init and on resize, never inside a frame
   · every observer and listener registers a teardown and is released on
     pagehide, so a bfcache restore never doubles anything up
   · the document is complete before this file runs; it only enhances
   ============================================================================ */
'use strict';

(function () {
  const root = document.documentElement;
  // Tells the inline boot script that this file arrived; without it the boot
  // script strips html.js after 3s and every hidden state is released.
  root.classList.add('js-ready');

  const teardowns = [];
  const onTeardown = fn => teardowns.push(fn);

  /* --- small helpers ------------------------------------------------------ */
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const clamp = (n, min, max) => (n < min ? min : n > max ? max : n);

  const listen = (target, type, handler, options) => {
    if (!target) return;
    target.addEventListener(type, handler, options);
    onTeardown(() => target.removeEventListener(type, handler, options));
  };

  /* --- the page's alignment anchor --------------------------------------- */
  // Full-bleed panels pad by --edge so their copy starts on the same line as
  // shell content. Measuring a real shell is exact; the CSS fallback uses
  // 100vw, which is off by half a classic scrollbar.
  (function edge() {
    const shell = $('.shell');
    if (!shell) return;
    const sync = () => root.style.setProperty('--edge', getComputedStyle(shell).paddingLeft);
    sync();
    listen(window, 'resize', sync, { passive: true });
    listen(window, 'orientationchange', sync, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync).catch(() => {});
  })();

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = matchMedia('(hover: hover) and (pointer: fine)');
  const desktopQuery = matchMedia('(min-width: 60em)');
  let reduced = motionQuery.matches;

  const onQuery = (query, handler) => {
    if (query.addEventListener) {
      query.addEventListener('change', handler);
      onTeardown(() => query.removeEventListener('change', handler));
    } else if (query.addListener) {            // Safari < 14
      query.addListener(handler);
      onTeardown(() => query.removeListener(handler));
    }
  };
  onQuery(motionQuery, event => { reduced = event.matches; root.classList.toggle('reduce-motion', reduced); });
  root.classList.toggle('reduce-motion', reduced);

  /* =========================================================================
     SCROLL ENGINE
     One rAF loop drives every scroll-linked value on the page.

     Geometry is cached on init and re-measured on resize, font load and
     pageshow — never inside a frame. Offscreen targets are skipped with a
     numeric comparison, which is why this does not need an
     IntersectionObserver: the reveal verbs clip their elements to nothing
     while hidden, and a clipped element reports a zero intersection rect, so
     an observer would never release it.
     ========================================================================= */
  const scrollEngine = (() => {
    const targets = [];        // geometry-linked: receive a normalised position
    const always = [];         // per-frame callbacks for fixed chrome
    let frame = 0;
    let viewportHeight = window.innerHeight;
    let docHeight = 0;
    const progressBar = $('[data-scroll-progress]');
    const MARGIN = 120;            // px of slack around the viewport

    const measureOne = target => {
      const rect = target.el.getBoundingClientRect();
      target.top = rect.top + window.scrollY;
      target.height = rect.height;
      if (target.measure) target.measure(target);
    };

    const measureAll = () => {
      viewportHeight = window.innerHeight;
      docHeight = document.documentElement.scrollHeight - viewportHeight;
      targets.forEach(measureOne);
      request();
    };

    const run = () => {
      frame = 0;
      const y = window.scrollY;

      if (progressBar) {
        progressBar.style.setProperty('--progress',
          docHeight > 0 ? clamp(y / docHeight, 0, 1).toFixed(4) : '0');
      }

      for (let i = 0; i < always.length; i += 1) always[i](y, viewportHeight);

      for (let i = 0; i < targets.length; i += 1) {
        const target = targets[i];
        if (target.top > y + viewportHeight + MARGIN) continue;
        if (target.top + target.height < y - MARGIN) continue;
        // -1 above the viewport centre, +1 below it.
        const centre = target.top + target.height / 2 - y;
        const p = clamp((centre - viewportHeight / 2) / ((viewportHeight + target.height) / 2), -1, 1);
        target.apply(p, target);
      }
    };

    const request = () => { if (!frame) frame = requestAnimationFrame(run); };

    listen(window, 'scroll', request, { passive: true });
    listen(window, 'resize', measureAll, { passive: true });
    listen(window, 'orientationchange', measureAll, { passive: true });
    listen(window, 'pageshow', measureAll);
    listen(window, 'load', measureAll);
    onTeardown(() => { if (frame) cancelAnimationFrame(frame); });

    // Fonts settle after first paint and change every offset; re-measure once.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll).catch(() => {});

    measureAll();

    return {
      add(el, apply, measure) {
        if (!el) return;
        const target = { el, apply, measure, top: 0, height: 0 };
        targets.push(target);
        measureOne(target);
        request();
      },
      // For chrome that is fixed to the viewport and has no page geometry of
      // its own (the header rail, the quick bar, the reveal queue).
      onFrame(fn) { always.push(fn); request(); }
    };
  })();

  /* =========================================================================
     REVEALS
     Elements declare a verb with data-reveal. Each is released once, when its
     top edge crosses the release line, with a stagger inside its group.
     ========================================================================= */
  (function reveals() {
    const items = $$('[data-reveal]');
    if (!items.length) return;

    if (reduced) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }

    // Stagger is assigned once, from the element's position in its group.
    $$('[data-reveal-group]').forEach(group => {
      const step = Number(group.dataset.revealGroup) || 70;
      $$('[data-reveal]', group).forEach((el, index) => {
        el.style.setProperty('--reveal-delay', Math.min(index, 6) * step + 'ms');
      });
    });

    // Offsets live here, not on the elements: no attribute churn in the markup.
    let pending = [];
    const release = el => { el.classList.add('is-in'); };

    // Anything already on screen arrives with the page, not on scroll.
    const line = () => window.scrollY + window.innerHeight * 0.92;
    const firstLine = line();
    items.forEach(el => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (top < firstLine) release(el);
      else pending.push({ el, top });
    });

    if (!pending.length) return;

    const check = () => {
      if (!pending.length) return;
      const edgeY = line();
      const still = [];
      for (let i = 0; i < pending.length; i += 1) {
        const item = pending[i];
        if (item.top < edgeY) release(item.el); else still.push(item);
      }
      pending = still;
    };

    // Offsets shift when fonts land or the window changes; recompute then.
    const remeasure = () => {
      pending.forEach(item => {
        item.top = item.el.getBoundingClientRect().top + window.scrollY;
      });
      check();
    };
    listen(window, 'resize', remeasure, { passive: true });
    listen(window, 'load', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure).catch(() => {});

    scrollEngine.onFrame(check);
    check();
  })();

  /* =========================================================================
     WORD SPLITTING
     Display headings arrive a word at a time. The split walks the existing
     nodes so the editorial <em> survives — a naive innerHTML rewrite would
     flatten it — and it runs before the reveal pass so the delays are in place
     when the heading is released.
     ========================================================================= */
  (function splitWords() {
    if (reduced) return;

    const wrap = (node, counter) => {
      const parts = node.textContent.split(/(\s+)/);
      if (parts.length === 1 && !parts[0].trim()) return;
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (!part) return;
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        const outer = document.createElement('span');
        outer.className = 'word';
        const inner = document.createElement('span');
        inner.textContent = part;
        // Each word leaves a beat after the one before it.
        inner.style.setProperty('--wd', Math.min(counter.n, 14) * 45 + 'ms');
        counter.n += 1;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      node.replaceWith(frag);
    };

    const walk = (el, counter) => {
      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) wrap(node, counter);
        else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('word')) {
          walk(node, counter);
        }
      });
    };

    $$('[data-reveal="words"]').forEach(el => walk(el, { n: 0 }));
  })();

  /* =========================================================================
     COUNTERS
     A figure rolls the last stretch up to its real value as it arrives, so the
     number reads as settling rather than appearing. The element always holds
     its final text, so a reader who never triggers it still sees the truth.
     ========================================================================= */
  (function counters() {
    const items = $$('[data-count]').filter(el => /^\d+$/.test(el.textContent.trim()));
    if (!items.length || reduced) return;

    items.forEach(el => {
      const target = Number(el.textContent.trim());
      const from = Math.max(0, target - 24);
      let raf = 0;
      let done = false;

      const roll = () => {
        if (done) return;
        done = true;
        const start = performance.now();
        const step = now => {
          const t = clamp((now - start) / 900, 0, 1);
          // Ease out so the last digits settle rather than snap.
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(from + (target - from) * eased));
          if (t < 1) raf = requestAnimationFrame(step); else el.textContent = String(target);
        };
        raf = requestAnimationFrame(step);
      };

      el.dataset.countTarget = String(target);
      el._roll = roll;
      onTeardown(() => { if (raf) cancelAnimationFrame(raf); el.textContent = String(target); });
    });

    // Released on the same line as every other reveal.
    const pending = items.slice();
    const check = () => {
      if (!pending.length) return;
      const line = window.scrollY + window.innerHeight * 0.9;
      for (let i = pending.length - 1; i >= 0; i -= 1) {
        const el = pending[i];
        if (el.getBoundingClientRect().top + window.scrollY < line) {
          el._roll();
          pending.splice(i, 1);
        }
      }
    };
    scrollEngine.onFrame(check);
    check();
  })();

  /* =========================================================================
     AMBIENT MOTION
     Continuous motion is the one thing that can quietly cost battery all day,
     so it only runs while its section is on screen. The CSS keeps every loop
     behind .is-live; this decides when that class is there.
     ========================================================================= */
  (function ambient() {
    if (reduced || !('IntersectionObserver' in window)) return;
    const fields = $$('[data-ambient], .station');
    if (!fields.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-live', entry.isIntersecting));
    }, { rootMargin: '10% 0px' });
    fields.forEach(el => observer.observe(el));

    // A backgrounded tab should not keep drifting grain.
    const onVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      fields.forEach(el => { el.style.animationPlayState = hidden ? 'paused' : ''; });
      document.documentElement.classList.toggle('is-idle', hidden);
    };
    listen(document, 'visibilitychange', onVisibility);
    onTeardown(() => observer.disconnect());
  })();

  /* =========================================================================
     PARALLAX — capped, transform-only, pointer-and-width gated in CSS.
     ========================================================================= */
  (function parallax() {
    if (reduced) return;
    // The same condition the stylesheet applies the transform under, so a
    // phone never pays for a value it will not use.
    const query = matchMedia('(min-width: 56.25em) and (hover: hover)');
    let live = query.matches;
    onQuery(query, event => { live = event.matches; });

    $$('.parallax').forEach(el => {
      const depth = Number(el.dataset.depth) || 26;
      el.style.setProperty('--depth', depth + 'px');
      scrollEngine.add(el, (p, target) => {
        if (!live) return;
        target.el.style.setProperty('--p', p.toFixed(4));
      });
    });
  })();

  /* =========================================================================
     HEADER — rail state plus a single sliding indicator. Hover never reads
     layout: positions are measured once and replayed from cached numbers.
     ========================================================================= */
  (function header() {
    const bar = $('.site-header');
    if (!bar) return;

    let railed = false;
    const setRail = () => {
      const next = window.scrollY > 16;
      if (next !== railed) { railed = next; bar.classList.toggle('is-railed', next); }
    };
    scrollEngine.onFrame(setRail);
    setRail();

    const nav = $('.nav-primary', bar);
    const indicator = $('.nav-indicator', nav);
    if (!nav || !indicator) return;

    const links = $$('.nav-link', nav);
    const boxes = new Map();
    const measure = () => {
      const base = nav.getBoundingClientRect();
      links.forEach(link => {
        const rect = link.getBoundingClientRect();
        boxes.set(link, { x: rect.left - base.left, w: rect.width });
      });
    };
    const moveTo = link => {
      const box = link && boxes.get(link);
      if (!box) { indicator.style.setProperty('--nav-o', '0'); return; }
      indicator.style.setProperty('--nav-x', box.x + 'px');
      indicator.style.setProperty('--nav-w', box.w + 'px');
      indicator.style.setProperty('--nav-o', '1');
    };
    const current = links.find(link => link.getAttribute('aria-current') === 'page') || null;
    const rest = () => moveTo(current);

    measure();
    rest();

    links.forEach(link => {
      listen(link, 'pointerenter', () => moveTo(link));
      listen(link, 'focus', () => moveTo(link));
    });
    listen(nav, 'pointerleave', rest);
    listen(nav, 'focusout', event => { if (!nav.contains(event.relatedTarget)) rest(); });

    const remeasure = () => { measure(); rest(); };
    listen(window, 'resize', remeasure, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure).catch(() => {});
  })();

  /* =========================================================================
     MOBILE MENU
     <details> owns the open state so the menu still works without this file.
     The script adds the closing choreography, the scroll lock, focus handling
     and the state hygiene a history navigation needs.
     ========================================================================= */
  (function mobileMenu() {
    const menu = $('.menu');
    const trigger = $('.menu-trigger', menu);
    const panel = $('.menu-panel', menu);
    if (!menu || !trigger || !panel) return;

    // The brand stays live while the panel is open: it is a legitimate way out,
    // it is visible on the rail above the panel, and it joins the focus loop.
    const outside = ['main', '.site-footer', '.quick-bar', '.site-header .nav-primary', '.site-header .nav-action']
      .map(sel => $(sel)).filter(Boolean);
    const brand = $('.site-header .brand');

    let closing = 0;

    $$('.menu-link', panel).forEach((link, index) => link.style.setProperty('--i', index));

    // overflow:hidden holds the page still without moving it, so the reader
    // returns to exactly the same place when the panel closes.
    const lock = () => { document.body.style.overflow = 'hidden'; };
    const unlock = () => { document.body.style.overflow = ''; };

    const applyState = open => {
      outside.forEach(el => { el.inert = open; });
      root.classList.toggle('menu-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      trigger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (open) lock(); else unlock();
    };

    const close = ({ restoreFocus = true, immediate = false } = {}) => {
      if (!menu.open) return;
      window.clearTimeout(closing);
      const finish = () => {
        menu.classList.remove('is-closing');
        menu.open = false;
        if (restoreFocus) trigger.focus({ preventScroll: true });
      };
      if (immediate || reduced) { finish(); return; }
      menu.classList.add('is-closing');
      closing = window.setTimeout(finish, 360);
    };

    listen(menu, 'toggle', () => {
      if (menu.open) menu.classList.remove('is-closing');
      applyState(menu.open);
    });
    applyState(menu.open);

    // The trigger is a <summary>; intercept so closing can be choreographed.
    listen(trigger, 'click', event => {
      if (!menu.open) return;
      event.preventDefault();
      close();
    });

    listen(document, 'keydown', event => {
      if (event.key === 'Escape' && menu.open) { event.preventDefault(); close(); }
    });

    // Focus stays inside the panel while it is the only thing on screen.
    listen(menu, 'keydown', event => {
      if (event.key !== 'Tab' || !menu.open) return;
      const focusables = [brand, trigger].concat(
        $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', panel)
      ).filter(el => el && (el.offsetParent !== null || el === trigger));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    $$('a[href]', panel).forEach(link => listen(link, 'click', () => close({ restoreFocus: false })));

    onQuery(desktopQuery, event => { if (event.matches) close({ restoreFocus: false, immediate: true }); });
    listen(window, 'orientationchange', () => close({ restoreFocus: false, immediate: true }));

    // A back/forward restore must never return to a half-open menu.
    listen(window, 'pageshow', () => close({ restoreFocus: false, immediate: true }));
    listen(window, 'popstate', () => close({ restoreFocus: false, immediate: true }));
    onTeardown(() => {
      window.clearTimeout(closing);
      unlock();
      root.classList.remove('menu-open');
      outside.forEach(el => { el.inert = false; });
    });
  })();

  /* =========================================================================
     MOBILE QUICK BAR — appears once the hero has been read, never before.
     ========================================================================= */
  (function quickBar() {
    const bar = $('.quick-bar');
    if (!bar) return;
    let shown = false;
    const update = () => {
      const next = window.scrollY > window.innerHeight * 0.42;
      if (next !== shown) { shown = next; bar.classList.toggle('is-shown', next); }
    };
    scrollEngine.onFrame(update);
    update();
  })();

  /* =========================================================================
     CHAPTER NAV — marks the section the reader is actually in.
     ========================================================================= */
  (function chapters() {
    const nav = $('.chapters');
    if (!nav || !('IntersectionObserver' in window)) return;
    const links = $$('.chapters__link', nav);
    const map = new Map();
    links.forEach(link => {
      const id = (link.getAttribute('href') || '').replace(/^#/, '');
      const section = id && document.getElementById(id);
      if (section) map.set(section, link);
    });
    if (!map.size) return;

    const visible = new Set();
    const mark = () => {
      let best = null;
      map.forEach((link, section) => {
        if (!visible.has(section)) return;
        if (!best || section.offsetTop < best.offsetTop) best = section;
      });
      links.forEach(link => link.removeAttribute('aria-current'));
      if (best) map.get(best).setAttribute('aria-current', 'true');
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      });
      mark();
    }, { rootMargin: '-25% 0px -60% 0px' });
    map.forEach((link, section) => observer.observe(section));
    onTeardown(() => observer.disconnect());
  })();

  /* =========================================================================
     MAGNETISM — 4px maximum, fine pointers only, off under reduced motion.
     A hint that the button is reaching back, not a gimmick.
     ========================================================================= */
  (function magnetic() {
    if (reduced || !pointerQuery.matches) return;
    const limit = 4;
    $$('[data-magnetic]').forEach(el => {
      let frame = 0;
      let box = null;
      const onMove = event => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!box) return;
          const dx = (event.clientX - (box.left + box.width / 2)) / box.width;
          const dy = (event.clientY - (box.top + box.height / 2)) / box.height;
          el.style.setProperty('--mx', (clamp(dx, -1, 1) * limit).toFixed(2) + 'px');
          el.style.setProperty('--my', (clamp(dy, -1, 1) * limit).toFixed(2) + 'px');
        });
      };
      const onEnter = () => { box = el.getBoundingClientRect(); };
      const onLeave = () => {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
      };
      listen(el, 'pointerenter', onEnter);
      listen(el, 'pointermove', onMove);
      listen(el, 'pointerleave', onLeave);
      listen(el, 'blur', onLeave);
      onTeardown(() => { if (frame) cancelAnimationFrame(frame); });
    });
  })();

  /* =========================================================================
     ACCORDIONS — one open answer at a time, per list.
     ========================================================================= */
  $$('.accordion').forEach(list => {
    $$('.accordion__item', list).forEach(item => {
      listen(item, 'toggle', () => {
        if (!item.open) return;
        $$('.accordion__item[open]', list).forEach(other => { if (other !== item) other.open = false; });
      });
    });
  });

  /* =========================================================================
     FOOTER YEAR
     ========================================================================= */
  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* =========================================================================
     THE GATE + HERO HAND-OFF
     The gate lifts upward while the hero headline falls downward: the
     momentum is handed over rather than cut. Four independent fail-safes are
     described in the stylesheet; this is the third — a hard ceiling that runs
     whatever the network is doing.
     ========================================================================= */
  (function gate() {
    const hero = document.querySelector('.hero');
    const gateEl = document.querySelector('.grain-gate');
    const CEILING = 1800;   // ms. Nothing keeps the page covered past this.

    const startHero = () => {
      if (!hero) return;
      // Lines fall in sequence; the first is already on its way as the gate lifts.
      Array.from(hero.querySelectorAll('.hero__line > span')).forEach((line, index) => {
        line.style.setProperty('--line-delay', index * 95 + 'ms');
      });
      requestAnimationFrame(() => hero.classList.add('is-in'));
    };

    if (!root.classList.contains('has-gate') || !gateEl) {
      root.classList.remove('has-gate');
      startHero();
      return;
    }
    gateEl.removeAttribute('hidden');

    let done = false;
    const lift = () => {
      if (done) return;
      done = true;
      window.clearTimeout(ceiling);
      try { sessionStorage.setItem('nafaka:seen', '1'); } catch (error) { /* private mode */ }

      // gate-lifting keeps the gate rendered; dropping has-gate immediately
      // gives the page back its scroll before the wipe has even finished.
      root.classList.add('gate-lifting');
      root.classList.remove('has-gate');
      gateEl.classList.add('is-lifting');

      // Paint the start state, then hand the movement to the hero: the gate
      // wipes down as the headline falls down.
      requestAnimationFrame(() => {
        gateEl.classList.add('is-lifted');
        startHero();
      });

      const finish = () => {
        window.clearTimeout(sweep);
        gateEl.setAttribute('hidden', '');
        root.classList.remove('gate-lifting');
      };
      const sweep = window.setTimeout(finish, 1100);
      gateEl.addEventListener('transitionend', finish, { once: true });
    };

    const ceiling = window.setTimeout(lift, CEILING);

    // Leave once the grain has finished its route AND the hero picture is
    // decoded — so the reveal lands on a finished image rather than a gap.
    // Neither wait can hold the page: the ceiling above always wins.
    let floor;
    const routeDone = new Promise(resolve => { floor = window.setTimeout(resolve, 950); });
    const heroImage = hero && hero.querySelector('.hero__media img');
    const imageDone = !heroImage || heroImage.complete
      ? Promise.resolve()
      : new Promise(resolve => {
          heroImage.addEventListener('load', resolve, { once: true });
          heroImage.addEventListener('error', resolve, { once: true });
        });

    Promise.all([routeDone, imageDone]).then(lift);
    onTeardown(() => { window.clearTimeout(ceiling); window.clearTimeout(floor); });
  })();

  /* =========================================================================
     ENQUIRY FORM
     Builds a WhatsApp draft for the visitor to review. Nothing is transmitted
     from this page: no request is made, no message is sent, and the draft is
     only ever opened by the visitor's own click on the resulting link.
     ========================================================================= */
  (function enquiryForm() {
    const form = document.getElementById('enquiry-form');
    if (!form || typeof NafakaEnquiry === 'undefined') return;

    const fields = {
      product: form.elements.product,
      name: form.elements.name,
      business: form.elements.business,
      quantity: form.elements.quantity,
      location: form.elements.location,
      details: form.elements.details
    };
    const quantityField = document.getElementById('quantity-field');
    // The wording changes, the required marker does not: they are separate
    // nodes so rewriting one never destroys the other.
    const detailsLabelText = document.querySelector('[data-details-label]');
    const detailsRequiredMark = document.querySelector('label[for="details"] .field__req');
    const submit = form.querySelector('button[type="submit"]');
    const draft = document.getElementById('enquiry-draft');
    const draftText = document.getElementById('draft-text');
    const draftLink = document.getElementById('draft-send');
    const status = document.getElementById('enquiry-status');

    const errorFor = input => document.getElementById(input.id + '-error');
    const wrapFor = input => input.closest('.field');

    const setError = (input, message) => {
      const box = errorFor(input);
      const wrap = wrapFor(input);
      if (box) box.textContent = message || '';
      if (wrap) {
        if (message) wrap.setAttribute('data-state', 'invalid');
        else wrap.removeAttribute('data-state');
      }
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    };

    const validate = input => {
      const value = String(input.value || '').trim();
      if (input.required && !value) {
        setError(input, input.dataset.required || 'This field is needed to start the enquiry.');
        return false;
      }
      setError(input, '');
      return true;
    };

    const hideDraft = () => {
      if (draft && !draft.hidden) { draft.hidden = true; }
      if (status) status.textContent = '';
    };

    // Vending enquiries ask about the building instead of a grain quantity.
    const syncProduct = () => {
      const vending = fields.product.value === 'Smart vending';
      if (quantityField) quantityField.hidden = vending;
      fields.quantity.disabled = vending;
      fields.details.required = vending;
      fields.details.placeholder = vending
        ? 'Building type, location and approximate daily footfall'
        : 'Delivery timing, recurring needs or questions';
      fields.details.dataset.required = 'Please describe the building so we can assess the location.';
      if (detailsLabelText) {
        detailsLabelText.textContent = vending
          ? 'Tell us about the building'
          : 'Anything else we should know?';
      }
      if (detailsRequiredMark) detailsRequiredMark.hidden = !vending;
      if (!vending) setError(fields.details, '');
      markRoutes();
      hideDraft();
    };

    // The product can be pre-selected from a range link, but only from the
    // approved list — never from arbitrary query text.
    const requested = new URLSearchParams(location.search).get('product');
    if (requested && NafakaEnquiry.products.includes(requested)) fields.product.value = requested;

    // The two route cards are real links, so they still lead somewhere useful
    // without this script; here they simply set the field in place.
    const routes = $$('[data-route-product]');
    const markRoutes = () => {
      const vending = fields.product.value === 'Smart vending';
      routes.forEach(route => {
        const isVending = route.dataset.routeProduct === 'Smart vending';
        route.setAttribute('aria-current', String(isVending === vending));
      });
    };
    routes.forEach(route => listen(route, 'click', event => {
      event.preventDefault();
      fields.product.value = route.dataset.routeProduct;
      syncProduct();
      fields.name.focus({ preventScroll: true });
    }));

    listen(fields.product, 'change', syncProduct);
    ['name', 'location', 'details'].forEach(key => {
      const input = fields[key];
      listen(input, 'blur', () => { if (input.dataset.touched) validate(input); });
      listen(input, 'input', () => {
        input.dataset.touched = '1';
        if (wrapFor(input) && wrapFor(input).getAttribute('data-state') === 'invalid') validate(input);
      });
    });
    listen(form, 'input', hideDraft);
    syncProduct();
    if (submit) submit.disabled = false;

    listen(form, 'submit', event => {
      event.preventDefault();

      const required = [fields.name, fields.location].concat(fields.details.required ? [fields.details] : []);
      let firstInvalid = null;
      required.forEach(input => {
        input.dataset.touched = '1';
        if (!validate(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        if (status) status.textContent = 'Please complete the highlighted fields before we prepare your message.';
        firstInvalid.focus();
        return;
      }

      let built;
      try {
        built = NafakaEnquiry.build({
          product: fields.product.value,
          name: fields.name.value,
          business: fields.business.value,
          quantity: fields.quantity.disabled ? '' : fields.quantity.value,
          location: fields.location.value,
          details: fields.details.value
        });
      } catch (error) {
        if (status) status.textContent = error.message;
        return;
      }

      if (draftText) draftText.textContent = built.message;
      if (draftLink) draftLink.href = built.url;
      if (draft) draft.hidden = false;
      if (status) status.textContent = 'Your message is ready to review. Nothing has been sent yet.';
      if (draftLink) {
        draftLink.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
        draftLink.focus({ preventScroll: true });
      }
    });
  })();

  /* =========================================================================
     TEARDOWN — bfcache-safe. Everything registered above is released here.
     ========================================================================= */
  listen(window, 'pagehide', () => {
    while (teardowns.length) {
      const fn = teardowns.pop();
      try { fn(); } catch (error) { /* teardown must never throw */ }
    }
  });
})();
