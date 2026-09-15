/* Run with playwright and @axe-core/playwright available on NODE_PATH.
 * Optional CHROMIUM_EXECUTABLE_PATH selects an installed browser binary.
 * Starts its own local server; does not send any enquiry or external message.
 */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.QA_OUTPUT || '/tmp/nafaka-browser-review';
const pages = ['index.html', 'about.html', 'products.html', 'services.html', 'contact.html'];
const issues = [], results = [];
fs.mkdirSync(output, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', '8767', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
let browser;
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of document.images) img.loading = 'eager';
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    // Exercise every reveal using actual scroll before taking full-page captures.
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * .75) {
      scrollTo(0, y); await new Promise(r => setTimeout(r, 30));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(750);
}
(async () => {
  for (let n = 0; n < 30; n++) {
    try { await fetch('http://127.0.0.1:8767'); break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--disable-gpu', '--disable-dev-shm-usage'] });
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', e => issues.push(`${width}: script error ${e.message}`));
    page.on('response', r => { if (r.status() >= 400) issues.push(`${width}: HTTP ${r.status()} ${r.url()}`); });
    for (const filename of pages) {
      await page.goto(`http://127.0.0.1:8767/${filename}`);
      await settle(page);
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, broken: [...document.images].filter(i => !i.naturalWidth).map(i => i.src), heading: document.querySelector('h1').innerText }));
      if (layout.overflow) issues.push(`${filename} ${width}: horizontal overflow`);
      if (layout.broken.length) issues.push(`${filename} ${width}: broken images ${layout.broken}`);
      if ([390, 1440].includes(width)) {
        await page.screenshot({ path: `${output}/${filename.replace('.html', '')}-${width}.png`, fullPage: true });
        const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        for (const v of a11y.violations) issues.push({ page: filename, width, rule: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) });
      }
      if (width <= 850) {
        await page.locator('.menu summary').click();
        assert.equal(await page.locator('main').evaluate(el => el.inert), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.menu').evaluate(el => el.open), false);
      }
      const faq = page.locator('.faq-list details').first();
      if (await faq.count()) { await faq.locator('summary').click(); assert.equal(await faq.evaluate(el => el.open), true); }
      results.push(`${filename} ${width}: layout, images, menu and FAQ checked`);
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8767/contact.html?product=Basmati%20rice');
  assert.equal(await page.locator('#product').inputValue(), 'Basmati rice');
  await page.locator('#name').fill('Amina & Co.');
  await page.locator('#location').fill('Kampala');
  await page.locator('#quantity').fill('100 kg');
  await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('#message-preview').isVisible(), true);
  const draftUrl = new URL(await page.locator('#whatsapp-send').getAttribute('href'));
  assert.equal(draftUrl.hostname, 'wa.me');
  assert.equal(draftUrl.pathname, '/256776974521');
  assert.ok(draftUrl.searchParams.get('text').includes('Quantity: 100 kg'));
  await page.locator('#product').selectOption('Smart vending');
  await page.locator('#details').fill('   ');
  await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('#message-preview').isVisible(), false);
  await page.locator('#product').selectOption('Beans');
  await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('#message-preview').isVisible(), true);
  await page.locator('#product').selectOption('Smart vending');
  await page.locator('#details').fill('Office building in Kampala, 80 visitors per day.');
  await page.locator('button[type=submit]').click();
  assert.ok(!(await page.locator('#message-text').innerText()).includes('Quantity:'));
  results.push('Product prefill, exact WhatsApp recipient, draft encoding, vending fields and stale validation regression passed.');
  await context.close();
  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJS.newPage();
  await fallback.goto('http://127.0.0.1:8767/contact.html');
  assert.equal(await fallback.locator('.no-js-note').isVisible(), true);
  assert.equal(await fallback.locator('button[type=submit]').isDisabled(), true);
  await fallback.locator('.menu summary').click();
  assert.equal(await fallback.locator('.menu-panel').isVisible(), true);
  results.push('No-JavaScript contact fallback and native mobile navigation passed.');
  await noJS.close();
  fs.writeFileSync(`${output}/results.json`, JSON.stringify({ results, issues }, null, 2));
  console.log(JSON.stringify({ checks: results.length, issues }, null, 2));
  if (issues.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.kill(); });
