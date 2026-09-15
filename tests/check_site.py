"""Source-level checks only. This script does not render or automate a browser."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qs
import re
import xml.etree.ElementTree as ET
import tinycss2

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html', 'about.html', 'products.html', 'services.html', 'contact.html']
errors = []
checks = 0

def check(condition, message):
    global checks
    checks += 1
    if not condition:
        errors.append(message)

class Document(HTMLParser):
    def __init__(self, name):
        super().__init__(convert_charrefs=True)
        self.name, self.tags, self.ids, self.stack = name, [], [], []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        check(bool(self.stack) and self.stack[-1] == tag, f'{self.name}: unexpected closing tag {tag}')
        if self.stack:
            self.stack.pop()

docs = {}
for page in PAGES:
    doc = Document(page)
    doc.feed((ROOT / page).read_text())
    docs[page] = doc
    check(not doc.stack, f'{page}: unclosed markup {doc.stack}')
    check(len(doc.ids) == len(set(doc.ids)), f'{page}: duplicate IDs')
    check(sum(t == 'h1' for t, a in doc.tags) == 1, f'{page}: expected one h1')
    check(sum(t == 'main' for t, a in doc.tags) == 1, f'{page}: expected one main')
    check(any(t == 'title' for t,a in doc.tags), f'{page}: title missing')
    check(any(t == 'meta' and a.get('name') == 'description' for t,a in doc.tags), f'{page}: description missing')
    check(any(t == 'meta' and a.get('name') == 'robots' and a.get('content') == 'index,follow' for t,a in doc.tags), f'{page}: production indexing metadata missing')
    check(any(t == 'a' and a.get('href') == '#main' and a.get('class') == 'skip-link' for t,a in doc.tags), f'{page}: skip link missing')
    labels = {a.get('for') for t,a in doc.tags if t == 'label'}
    for tag, attrs in doc.tags:
        if tag == 'img':
            check('alt' in attrs, f'{page}: missing image alt')
            check('width' in attrs and 'height' in attrs, f'{page}: missing intrinsic image dimensions')
        if tag in ('input','select','textarea'):
            check(attrs.get('id') in labels, f'{page}: field missing explicit label')
        if attrs.get('target') == '_blank':
            check('noopener' in attrs.get('rel',''), f'{page}: unsafe new-tab link')
        if tag == 'script' and 'src' in attrs:
            check(not attrs['src'].startswith('http'), f'{page}: third-party script dependency')
        if tag == 'a' and attrs.get('aria-current') == 'page':
            check(attrs.get('href') == page, f'{page}: incorrect active navigation')

for page, doc in docs.items():
    for tag, attrs in doc.tags:
        resources = []
        if 'src' in attrs:
            resources.append(attrs['src'])
        if tag in ('a','link') and 'href' in attrs:
            resources.append(attrs['href'])
        if 'srcset' in attrs:
            resources += [item.strip().split()[0] for item in attrs['srcset'].split(',')]
        for value in resources:
            url = urlsplit(value)
            if url.scheme or url.netloc:
                if url.hostname == 'wa.me':
                    check(url.path == '/256776974521', f'{page}: wrong WhatsApp number')
                continue
            target = unquote(url.path) or page
            target_file = ROOT / target
            check(target_file.is_file(), f'{page}: missing file {target}')
            if url.fragment and target in docs:
                check(unquote(url.fragment) in docs[target].ids, f'{page}: missing anchor {value}')
            if target == 'contact.html' and 'product' in parse_qs(url.query):
                product = parse_qs(url.query)['product'][0]
                check(product in ['Super rice','Local rice','Pakistan rice','Basmati rice','Maize','Beans','Soya bean','Other commodities','Smart vending'], f'{page}: unsupported enquiry product {product}')

css_path = ROOT / 'assets/css/site.css'
css = css_path.read_text()
rules = tinycss2.parse_stylesheet(css, skip_whitespace=True, skip_comments=True)
check(not any(r.type == 'error' for r in rules), 'Top-level CSS parse error')
def check_css_rules(rules):
    for rule in rules:
        if rule.type == 'qualified-rule':
            declarations = tinycss2.parse_declaration_list(rule.content, skip_whitespace=True, skip_comments=True)
            check(not any(d.type == 'error' for d in declarations), 'CSS declaration parse error')
        elif rule.type == 'at-rule' and rule.content and rule.lower_at_keyword == 'media':
            check_css_rules(tinycss2.parse_rule_list(rule.content, skip_whitespace=True, skip_comments=True))
check_css_rules(rules)
for url in re.findall(r'url\([\"\']?([^\)\"\']+)', css):
    check((css_path.parent / url).is_file(), f'Missing CSS resource: {url}')
ET.parse(ROOT / 'assets/nafaka-mark.svg')
for font in (ROOT/'assets/fonts').glob('*.ttf'):
    check(font.stat().st_size > 1000, f'Empty or tiny font: {font.name}')
    check(font.read_bytes()[:4] in (b'\x00\x01\x00\x00',b'OTTO'), f'Invalid font signature: {font.name}')
check((ROOT/'assets/fonts/Manrope-OFL.txt').is_file(), 'Missing Manrope license')
check((ROOT/'assets/fonts/Newsreader-OFL.txt').is_file(), 'Missing Newsreader license')
contact = (ROOT/'contact.html').read_text()
check('type="submit" disabled' in contact, 'No-JavaScript form submit must remain disabled')
script = (ROOT/'assets/js/site.js').read_text()
check('textContent = draft.message' in script, 'Draft must render as plain text')
check(not re.search(r'fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon', script), 'Unexpected storage or network action')
check('prefers-reduced-motion' in css and 'prefers-reduced-motion' in script, 'Reduced motion support missing')
check(not (ROOT/'assets/references/people').exists(), 'Raw reference portraits must not be committed')

def luminance(hexcode):
    rgb = [int(hexcode[i:i+2],16)/255 for i in (1,3,5)]
    values = [x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in rgb]
    return .2126*values[0]+.7152*values[1]+.0722*values[2]
for fg,bg in [('#17241b','#fffdf8'),('#566158','#fffdf8'),('#566158','#f7f1e3'),('#f7f1e3','#0b2b1d'),('#c2cfbf','#0b2b1d')]:
    values = sorted((luminance(fg),luminance(bg)))
    ratio = (values[1]+.05)/(values[0]+.05)
    check(ratio >= 4.5, f'Palette text contrast below 4.5: {fg} on {bg}')
    print(f'Palette text contrast {fg} / {bg}: {ratio:.2f}:1')
if errors:
    print('\n'.join(errors))
    raise SystemExit(f'FAILED: {len(errors)} of {checks} source checks')
print(f'PASS: {checks} source checks across {len(PAGES)} pages. Source checks complete.')
