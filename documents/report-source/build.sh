#!/bin/bash
# Rebuild documents/Nafaka_Foods_Website_Report_and_Plan.pdf from report.html.
#
# The document is set in the website's own Newsreader and Manrope, so it is
# rendered by Chromium rather than a PDF library — nothing else can use the
# brand's WOFF2 files. Needs playwright on NODE_PATH.
#
#   NODE_PATH=/path/to/node_modules documents/report-source/build.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8811}"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 2

node -e "
const {chromium}=require('playwright');
const foot = \`<div style=\"width:100%;margin:0 16mm;display:flex;justify-content:space-between;
  font-family:-apple-system,Arial,sans-serif;font-size:6.6pt;letter-spacing:.11em;
  text-transform:uppercase;color:#4d574f;\">
  <span>Nafaka Foods &middot; Website report &amp; forward plan</span>
  <span class=\"pageNumber\"></span></div>\`;
(async () => {
  const b = await chromium.launch({headless:true, args:['--disable-gpu','--disable-dev-shm-usage']});
  const p = await (await b.newContext()).newPage();
  p.on('response', r => { if (r.status() >= 400) throw new Error('HTTP '+r.status()+' '+r.url()); });
  await p.goto('http://127.0.0.1:${PORT}/documents/report-source/report.html', {waitUntil:'load'});
  await p.evaluate(async () => {
    try { await document.fonts.ready; } catch (e) {}
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  });
  await p.waitForTimeout(1300);
  await p.pdf({
    path: '${ROOT}/documents/Nafaka_Foods_Website_Report_and_Plan.pdf',
    format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: foot
  });
  await b.close();
})();
"
echo "wrote documents/Nafaka_Foods_Website_Report_and_Plan.pdf"
