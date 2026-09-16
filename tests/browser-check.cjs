/* Rendered-site checks: layout, interaction, accessibility and fail-safes.
 *
 * Needs playwright and @axe-core/playwright on NODE_PATH. Starts its own
 * local server. Sends no enquiry and makes no external request — the WhatsApp
 * draft is inspected as a URL, never opened.
 *
 *   NODE_PATH=... node tests/browser-check.cjs
 */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = process.env.QA_OUTPUT || '/tmp/nafaka-browser-review';
const PORT = Number(process.env.QA_PORT || 8767);
const base = `http://127.0.0.1:${PORT}`;
const PAGES = ['index.html', 'about.html', 'products.html', 'services.html', 'contact.html', '404.html'];

// Every width the brief asks for, plus the intermediate states between them.
const WIDTHS = [320, 360, 375, 390, 393, 412, 414, 430, 540, 600, 700, 768, 834, 900, 1024,
                1180, 1280, 1366, 1440, 1600, 1920];
const TALL = { 320: 568, 360: 800, 375: 812, 390: 844, 393: 873, 412: 915, 414: 896, 430: 932 };

const issues = [];
const notes = [];
const fail = message => issues.push(message);
const ok = message => notes.push(message);

// Assertions record a finding and let the run continue, so one pass reports
// everything rather than stopping at the first problem.
const check = async (label, fn) => {
  try { await fn(); } catch (error) { fail(`${label}: ${error.message.split('\n')[0]}`); }
};

fs.mkdirSync(output, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
  { cwd: root, stdio: 'ignore' });

const wire = (page, label) => {
  page.on('pageerror', e => fail(`${label}: uncaught ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') fail(`${label}: console ${m.text()}`); });
  page.on('requestfailed', r => fail(`${label}: request failed ${r.url()}`));
  page.on('response', r => { if (r.status() >= 400) fail(`${label}: HTTP ${r.status()} ${r.url()}`); });
};

const settle = async (page, ms = 2800) => {
  await page.evaluate(async () => { try { await document.fonts.ready; } catch (e) { /* no-op */ } });
  await page.waitForTimeout(ms);
};

const walk = async page => {
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = 'eager';
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.7) {
      scrollTo(0, y);
      await new Promise(r => setTimeout(r, 40));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
};

(async () => {
  for (let n = 0; n < 60; n += 1) {
    try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--disable-gpu', '--disable-dev-shm-usage']
  });

  /* ---- 1. Layout across every width, including the intermediates ---------- */
  for (const width of WIDTHS) {
    const height = TALL[width] || (width < 900 ? 800 : 900);
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900,
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    wire(page, `w${width}`);
    for (const file of PAGES) {
      await page.goto(`${base}/${file}`, { waitUntil: 'load' });
      await settle(page, 600);
      await walk(page);
      const state = await page.evaluate(() => {
        const wide = [...document.querySelectorAll('body *')]
          .filter(el => el.getBoundingClientRect().right > innerWidth + 1.5)
          .slice(0, 4).map(el => el.tagName + '.' + (el.className || '').toString().slice(0, 40));
        // WCAG 2.2 AA (2.5.8) sets 24x24 as the floor for every control. Below
        // the desktop breakpoint, where the pointer is a thumb, the site's own
        // primary controls are held to the 44x44 the brief asks for.
        const PRIMARY = '.btn, .brand, .link, .menu-link, .contact-method__value,' +
          ' .measure-row, .rice-row, .close-panel__route, input, select, textarea, .menu-trigger';
        const touch = innerWidth < 1024;
        // A rule-thin link enlarges its target with an absolutely positioned
        // ::before rather than by growing its own box, so the real pointer
        // target is the union of the two.
        const targetSize = el => {
          const r = el.getBoundingClientRect();
          const before = getComputedStyle(el, '::before');
          const extra = before.content !== 'none' && before.position === 'absolute'
            ? parseFloat(before.height) || 0
            : 0;
          return { w: r.width, h: Math.max(r.height, extra) };
        };
        const small = [...document.querySelectorAll('a[href], button, summary, select, input, textarea')]
          .filter(el => {
            const t = targetSize(el);
            if (t.w === 0 || t.h === 0) return false;
            if (t.h < 24 || t.w < 24) return true;
            return touch && el.closest(PRIMARY) !== null && t.h < 44;
          })
          .slice(0, 4).map(el => {
            const t = targetSize(el);
            return `${el.tagName}:${(el.textContent || '').trim().slice(0, 22)} ` +
              `${Math.round(t.w)}x${Math.round(t.h)}`;
          });
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          wide,
          small,
          broken: [...document.images].filter(i => !i.naturalWidth).map(i => i.currentSrc || i.src),
          h1: document.querySelectorAll('h1').length,
          gateVisible: !!document.querySelector('.grain-gate:not([hidden])')
            && getComputedStyle(document.querySelector('.grain-gate')).display !== 'none'
        };
      });
      if (state.overflow > 1) fail(`${file} @${width}: horizontal overflow ${state.overflow}px ${state.wide}`);
      if (state.broken.length) fail(`${file} @${width}: broken image ${state.broken}`);
      if (state.h1 !== 1) fail(`${file} @${width}: ${state.h1} h1 elements`);
      if (state.small.length) fail(`${file} @${width}: touch target under 44px ${state.small}`);
      if (state.gateVisible) fail(`${file} @${width}: preloader still covering under reduced motion`);
    }
    ok(`layout, images, targets and headings checked on ${PAGES.length} pages @${width}`);
    await context.close();
  }

  /* ---- 2. Interaction, at a phone and a laptop --------------------------- */
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width < 900 ? 844 : 900 },
      isMobile: width < 900, hasTouch: width < 900
    });
    const page = await context.newPage();
    wire(page, `ux${width}`);

    for (const file of PAGES) {
      await page.goto(`${base}/${file}`, { waitUntil: 'load' });
      await settle(page);

      // The preloader must always clear itself.
      const gate = await page.evaluate(() => {
        const el = document.querySelector('.grain-gate');
        return !el || el.hasAttribute('hidden') || getComputedStyle(el).display === 'none';
      });
      if (!gate) fail(`${file} @${width}: preloader did not lift`);

      // Nothing may be left hidden waiting for an animation.
      const stuck = await page.evaluate(() => {
        for (const el of document.querySelectorAll('[data-reveal]')) {
          const r = el.getBoundingClientRect();
          // The site releases at 92% of the viewport, so only flag elements
          // comfortably inside it.
          if (r.top < innerHeight * 0.88 && r.bottom > 0 && !el.classList.contains('is-in')) {
            return el.dataset.reveal + ' / ' + (el.className || el.tagName);
          }
        }
        return null;
      });
      if (stuck) fail(`${file} @${width}: reveal never released (${stuck})`);

      // Accordions.
      await check(`${file} @${width} accordion`, async () => {
        const acc = page.locator('.accordion__item').first();
        if (!(await acc.count())) return;
        await acc.locator('summary').click();
        assert.equal(await acc.evaluate(el => el.open), true, 'did not open');
        await acc.locator('summary').click();
        assert.equal(await acc.evaluate(el => el.open), false, 'did not close');
      });

      // Mobile menu: open, trap, escape, focus restore, link-close.
      if (width < 900) await check(`${file} @${width} menu`, async () => {
        const trigger = page.locator('.menu-trigger');
        await trigger.click();
        await page.waitForTimeout(500);
        assert.equal(await page.locator('.menu').evaluate(el => el.open), true, `${file}: menu did not open`);
        assert.equal(await page.locator('main').evaluate(el => el.inert), true, `${file}: page not inert behind menu`);
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true', `${file}: aria-expanded not set`);
        // body carries overflow-x:clip site-wide, so the lock shows on the
        // block axis only — the inline axis reads "clip" either way.
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden',
          `${file}: background scroll not locked`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
        assert.equal(await page.locator('.menu').evaluate(el => el.open), false, `${file}: Escape did not close menu`);
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('menu-trigger')), true,
          `${file}: focus not restored to the trigger`);
        assert.equal(await page.locator('main').evaluate(el => el.inert), false, `${file}: inert not released`);
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden',
          `${file}: scroll lock not released`);

        await trigger.click();
        await page.waitForTimeout(500);
        await page.locator('.menu-panel a[href="about.html"]').click();
        await page.waitForLoadState('load');
        await settle(page, 1200);
        assert.equal(await page.locator('.menu').evaluate(el => el.open), false,
          `${file}: menu still open after navigating`);
        await page.goBack();
        await settle(page, 1200);
        assert.equal(await page.locator('.menu').evaluate(el => el.open), false,
          `${file}: stale menu after history back`);
      });
    }

    /* ---- 3. The enquiry form ------------------------------------------- */
    await check(`form @${width}`, async () => {
    await page.goto(`${base}/contact.html`, { waitUntil: 'load' });
    await settle(page);

    // Empty submit must not navigate and must explain what is missing.
    await page.locator('#enquiry-form button[type="submit"]').click();
    await page.waitForTimeout(300);
    assert.ok(page.url().endsWith('contact.html'), 'empty submit navigated away');
    assert.equal(await page.locator('#name-error').innerText() !== '', true, 'no inline error for the name field');
    assert.equal(await page.locator('#enquiry-draft').isHidden(), true, 'draft shown for an invalid form');

    // The vending route swaps quantity for building context.
    await page.locator('[data-route-product="Smart vending"]').click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#product').inputValue(), 'Smart vending', 'route did not set the product');
    assert.equal(await page.locator('#quantity-field').isHidden(), true, 'quantity still shown for vending');
    assert.equal(await page.locator('#details').evaluate(el => el.required), true, 'building detail not required');

    // A complete grain enquiry produces a reviewable draft and sends nothing.
    await page.selectOption('#product', 'Basmati rice');
    await page.fill('#name', 'QA Buyer');
    await page.fill('#location', 'Kampala');
    await page.fill('#quantity', '100 kg');
    await page.locator('#enquiry-form button[type="submit"]').click();
    await page.waitForTimeout(400);
    const draft = await page.evaluate(() => ({
      shown: !document.getElementById('enquiry-draft').hidden,
      text: document.getElementById('draft-text').textContent,
      href: document.getElementById('draft-send').getAttribute('href'),
      target: document.getElementById('draft-send').getAttribute('target'),
      focused: document.activeElement.id
    }));
    assert.equal(draft.shown, true, 'draft was not revealed');
    assert.ok(draft.text.includes('Basmati rice'), 'draft is missing the product');
    assert.ok(draft.text.includes('Quantity: 100 kg'), 'draft is missing the quantity');
    const url = new URL(draft.href);
    assert.equal(url.hostname, 'wa.me', 'draft points somewhere other than WhatsApp');
    assert.equal(url.pathname, '/256776974521', 'draft uses the wrong recipient');
    assert.equal(url.searchParams.get('text'), draft.text, 'draft link and preview disagree');
    assert.equal(draft.target, '_blank', 'draft link should open a new tab');
    assert.equal(draft.focused, 'draft-send', 'focus not moved to the send link');
    assert.ok(page.url().endsWith('contact.html'), 'preparing a draft navigated away');

    // A range link pre-selects its variety.
    await page.goto(`${base}/contact.html?product=Super%20rice`, { waitUntil: 'load' });
    await settle(page, 1200);
    assert.equal(await page.locator('#product').inputValue(), 'Super rice', 'query product not applied');
    await page.goto(`${base}/contact.html?product=<script>x()</script>`, { waitUntil: 'load' });
    await settle(page, 1200);
    assert.equal(await page.locator('#product').inputValue(), 'Rice — general', 'unknown product was accepted');
    });

    /* ---- 4. Keyboard path ------------------------------------------------ */
    await check(`keyboard @${width}`, async () => {
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await settle(page);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement.className);
    assert.ok(first.includes('skip-link'), `first tab stop is "${first}", expected the skip link`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main',
      'skip link did not move focus to main');
    // The header CTA is display:none below 60em and the menu's button sits in a
    // closed <details>, where offsetParent still reports a box. checkVisibility
    // accounts for content-visibility, so this lands on a button the reader can
    // actually reach.
    const ring = await page.evaluate(() => {
      const reachable = b => (b.checkVisibility
        ? b.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })
        : b.offsetParent !== null) && b.getBoundingClientRect().width > 0;
      const el = [...document.querySelectorAll('.btn')].find(reachable);
      if (!el) return { style: 'none', label: 'no visible button' };
      el.focus();
      const cs = getComputedStyle(el);
      return {
        style: cs.outlineStyle,
        width: cs.outlineWidth,
        shadow: cs.boxShadow,
        label: (el.textContent || '').trim().slice(0, 24)
      };
    });
    assert.notEqual(ring.style, 'none', `focus ring missing on "${ring.label}"`);
    assert.notEqual(ring.shadow, 'none', `focus ring's second tone missing on "${ring.label}"`);
    });

    /* ---- 5. Internal links all resolve ----------------------------------- */
    for (const file of PAGES) {
      await page.goto(`${base}/${file}`, { waitUntil: 'load' });
      await settle(page, 400);
      const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && !/^(https?:|tel:|mailto:|#)/.test(h)));
      for (const href of [...new Set(links)]) {
        const target = href.split('#')[0].split('?')[0];
        const res = await fetch(`${base}/${target}`);
        if (!res.ok) fail(`${file}: internal link ${href} returned ${res.status}`);
        const hash = href.includes('#') ? href.split('#')[1] : '';
        if (hash) {
          const found = await page.evaluate(async (args) => {
            const html = await (await fetch(args.t)).text();
            return html.includes(`id="${args.h}"`);
          }, { t: target, h: decodeURIComponent(hash) });
          if (!found) fail(`${file}: anchor #${hash} missing in ${target}`);
        }
      }
    }
    ok(`interaction, form, keyboard and link checks passed @${width}`);
    await context.close();
  }

  /* ---- 6. Accessibility -------------------------------------------------- */
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 },
      isMobile: width < 900, hasTouch: width < 900 });
    const page = await context.newPage();
    for (const file of PAGES) {
      await page.goto(`${base}/${file}`, { waitUntil: 'load' });
      await settle(page);
      await walk(page);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
      for (const v of result.violations) {
        fail(`axe ${file} @${width}: ${v.id} (${v.impact}) — ` +
             v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | '));
      }
      if (width === 390 || file === 'index.html') {
        await page.screenshot({ path: `${output}/${file.replace('.html', '')}-${width}.png`, fullPage: true });
      }
    }
    ok(`axe wcag2a/aa + wcag21a/aa clean on ${PAGES.length} pages @${width}`);
    await context.close();
  }

  /* ---- 7. Zoom to 200% ---------------------------------------------------
     Browser zoom halves the layout viewport and doubles the device pixel
     ratio; setting CSS `zoom` instead would measure the scaled coordinate
     space against an unscaled innerWidth and report overflow that is not
     there. These are the real 200% layouts for 1280, 1366 and 1440. */
  for (const [w, h] of [[640, 512], [683, 384], [720, 450]]) {
    const context = await browser.newContext({
      viewport: { width: w, height: h }, deviceScaleFactor: 2
    });
    const page = await context.newPage();
    wire(page, `zoom200-${w * 2}`);
    for (const file of PAGES) {
      await page.goto(`${base}/${file}`, { waitUntil: 'load' });
      await settle(page, 700);
      await walk(page);
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        wide: [...document.querySelectorAll('body *')]
          .filter(el => el.getBoundingClientRect().right > innerWidth + 1.5)
          .slice(0, 3).map(el => el.tagName + '.' + (el.className || '').toString().slice(0, 36))
      }));
      if (state.overflow > 1) {
        fail(`${file} at 200% zoom of ${w * 2}px: overflow ${state.overflow}px ${state.wide}`);
      }
    }
    ok(`200% zoom of ${w * 2}px: no horizontal overflow`);
    await context.close();
  }

  /* ---- 8. JavaScript disabled -------------------------------------------- */
  {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    for (const file of PAGES) {
      await page.goto(`${base}/${file}`, { waitUntil: 'load' });
      const state = await page.evaluate(() => {
        const gate = document.querySelector('.grain-gate');
        // Anything genuinely hidden by the markup (a [hidden] panel, an empty
        // error slot) is fine; what must not exist is content waiting on an
        // animation that can never run.
        const hiddenText = [...document.querySelectorAll('h1, h2, p, a[href]')]
          .filter(el => {
            if (el.closest('[hidden]')) return false;
            if (el.classList.contains('field__error') || el.classList.contains('form-status')) return false;
            const cs = getComputedStyle(el);
            return cs.opacity === '0' || cs.visibility === 'hidden';
          })
          .map(el => el.tagName + '.' + (el.className || '').toString().slice(0, 30));
        return {
          gate: gate ? getComputedStyle(gate).display : 'none',
          h1: (document.querySelector('h1') || {}).textContent || '',
          links: document.querySelectorAll('a[href]').length,
          images: document.images.length,
          hiddenText
        };
      });
      if (state.gate !== 'none') fail(`${file} without JS: preloader is covering the page`);
      if (!state.h1.trim()) fail(`${file} without JS: no visible h1`);
      if (state.links < 10) fail(`${file} without JS: navigation missing (${state.links} links)`);
      if (state.hiddenText.length) {
        fail(`${file} without JS: hidden awaiting animation — ${state.hiddenText.join(', ')}`);
      }
    }
    // The menu must still open with <details> alone.
    await check('no-JS menu', async () => {
      await page.goto(`${base}/index.html`, { waitUntil: 'load' });
      await page.locator('.menu-trigger').click();
      assert.equal(await page.locator('.menu').evaluate(el => el.open), true, 'does not open without JS');
      assert.equal(await page.locator('.menu-panel a[href="contact.html"]').isVisible(), true,
        'links not reachable without JS');
    });
    ok('content, navigation and the menu all work with JavaScript disabled');
    await context.close();
  }

  /* ---- 9. Reduced motion is complete, not broken ------------------------- */
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce',
      isMobile: true, hasTouch: true });
    const page = await context.newPage();
    wire(page, 'reduced');
    for (const file of PAGES) {
      await page.goto(`${base}/${file}`, { waitUntil: 'load' });
      await settle(page, 900);
      const state = await page.evaluate(() => {
        const gate = document.querySelector('.grain-gate');
        const invisible = [...document.querySelectorAll('[data-reveal]')]
          .filter(el => getComputedStyle(el).opacity !== '1').length;
        const moved = [...document.querySelectorAll('.parallax > img, .parallax > picture > img')]
          .filter(el => getComputedStyle(el).transform !== 'none').length;
        return { gate: gate ? getComputedStyle(gate).display : 'none', invisible, moved };
      });
      if (state.gate !== 'none') fail(`${file} reduced motion: preloader still runs`);
      if (state.invisible) fail(`${file} reduced motion: ${state.invisible} elements still transparent`);
      if (state.moved) fail(`${file} reduced motion: parallax still applied`);
    }
    ok('reduced motion shows the full page instantly, with no preloader or parallax');
    await context.close();
  }

  /* ---- 10. Repeat navigation leaves no duplicated listeners -------------- */
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    wire(page, 'repeat');
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await settle(page, 1500);
    for (let i = 0; i < 4; i += 1) {
      await page.click('.nav-primary a[href="products.html"]');
      await page.waitForLoadState('load');
      await page.waitForTimeout(400);
      await page.goBack();
      await page.waitForLoadState('load');
      await page.waitForTimeout(400);
    }
    const second = await page.evaluate(() => {
      const gate = document.querySelector('.grain-gate');
      return {
        gateShown: gate ? getComputedStyle(gate).display !== 'none' : false,
        hero: !!document.querySelector('.hero.is-in')
      };
    });
    if (second.gateShown) fail('preloader replayed during same-session navigation');
    if (!second.hero) fail('hero reveal did not run on a repeat visit');
    ok('repeat navigation: preloader runs once per session, hero always resolves');
    await context.close();
  }

  await browser.close();
  server.kill();

  fs.writeFileSync(path.join(output, 'report.json'),
    JSON.stringify({ issues, notes }, null, 2));
  notes.forEach(n => console.log('  ok  ' + n));
  if (issues.length) {
    console.error('\nISSUES (' + issues.length + '):');
    issues.forEach(i => console.error('  !   ' + i));
    process.exitCode = 1;
  } else {
    console.log('\nAll rendered-site checks passed. Screenshots in ' + output);
  }
})().catch(error => {
  server.kill();
  console.error(error);
  process.exitCode = 1;
});
