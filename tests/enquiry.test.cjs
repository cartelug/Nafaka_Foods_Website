const test = require('node:test');
const assert = require('node:assert/strict');
const { products, build } = require('../assets/js/enquiry.js');
const base = {name:'Test Buyer', location:'Kampala', product:'Basmati rice'};
test('Every approved product creates a correctly encoded WhatsApp draft', () => {
  for (const product of products) {
    const draft = build({...base, product, details:'Office building enquiry'});
    const url = new URL(draft.url);
    assert.equal(url.hostname,'wa.me'); assert.equal(url.pathname,'/256776974521');
    assert.equal(url.searchParams.get('text'),draft.message);
    assert.ok(draft.message.includes(product));
  }
});
test('Grain draft includes quantity and optional business', () => {
  const {message} = build({...base, quantity:'100 kg', business:'Test School'});
  assert.ok(message.includes('Quantity: 100 kg')); assert.ok(message.includes('Business / institution: Test School'));
});
test('Vending excludes stale grain quantity', () => {
  const {message} = build({...base, product:'Smart vending', quantity:'100 kg', details:'Office, Kololo, 80 people daily'});
  assert.ok(!message.includes('Quantity:')); assert.ok(message.includes('80 people daily'));
});
test('Required values cannot be blank or whitespace', () => {
  assert.throws(()=>build({...base,name:'  '})); assert.throws(()=>build({...base,location:''}));
  assert.throws(()=>build({...base,product:'Smart vending',details:' '}));
});
test('Unknown product falls back to a valid general rice enquiry', () => {
  assert.ok(build({...base,product:'<script>bad()</script>'}).message.includes('Rice — general'));
});
test('Unicode, punctuation and line breaks round-trip as plain text', () => {
  const {message,url}=build({...base,name:'Amina & Co.',details:'Beans + rice?\nCall before delivery — thanks.'});
  assert.equal(new URL(url).searchParams.get('text'),message);
});
test('Empty optional fields do not add empty lines or null values', () => {
  const {message}=build(base); assert.ok(!message.includes('undefined')); assert.ok(!message.includes('null')); assert.ok(!message.includes('\n\n'));
});
test('Long enquiry remains URL encoded without raw angle brackets', () => {
  const {message,url}=build({...base,details:'<b>Message</b> & text'.repeat(40)});
  assert.equal(new URL(url).searchParams.get('text'),message); assert.ok(!url.includes('<b>'));
});
