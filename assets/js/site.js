'use strict';
const menu = document.querySelector('.menu');
if (menu) {
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
  menu.addEventListener('keydown', event => {
    if (!menu.open || event.key !== 'Tab') return;
    const items = [...menu.querySelectorAll('summary, a[href]')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
  const wide = matchMedia('(min-width: 851px)');
  wide.addEventListener('change', event => { if (event.matches) menu.open = false; });
  menu.addEventListener('toggle', () => {
    document.querySelector('main').inert = menu.open;
    document.querySelector('.site-footer').inert = menu.open;
    document.querySelector('.mobile-cta').inert = menu.open;
    menu.querySelector('summary').setAttribute('aria-label', menu.open ? 'Close navigation' : 'Open navigation');
  });
}
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); entry.target.classList.remove('reveal-pending'); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal-pending'); observer.observe(el); } });
}
const form = document.querySelector('#enquiry-form');
if (form) {
  const params = new URLSearchParams(location.search);
  const allowed = NafakaEnquiry.products;
  const product = params.get('product');
  if (allowed.includes(product)) form.elements.product.value = product;
  const preview = document.querySelector('#message-preview');
  const quantity = document.querySelector('#quantity-field');
  const note = document.querySelector('#details');
  const label = document.querySelector('label[for="details"]');
  function updateEnquiry() {
    note.setCustomValidity('');
    const vending = form.elements.product.value === 'Smart vending';
    quantity.hidden = vending;
    form.elements.quantity.disabled = vending;
    label.textContent = vending ? 'Tell us about your building *' : 'Anything else we should know?';
    note.required = vending;
    note.placeholder = vending ? 'Building type, location and approximate daily footfall' : 'Delivery timing, recurring needs or questions';
    preview.hidden = true;
  }
  form.elements.product.addEventListener('change', updateEnquiry);
  form.addEventListener('input', () => { preview.hidden = true; });
  updateEnquiry();
  form.querySelector('button[type="submit"]').disabled = false;
  ['name', 'location'].forEach(key => {
    const input = form.elements[key];
    input.addEventListener('input', () => input.setCustomValidity(input.value.trim() ? '' : 'Please enter a value.'));
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    let draft;
    try { draft = NafakaEnquiry.build(data); } catch (error) {
      note.setCustomValidity(error.message); note.reportValidity();
      note.addEventListener('input', () => note.setCustomValidity(''), {once:true}); return;
    }
    document.querySelector('#message-text').textContent = draft.message;
    document.querySelector('#whatsapp-send').href = draft.url;
    preview.hidden = false;
    document.querySelector('#message-status').textContent = 'Your draft is ready. Nothing has been sent yet.';
    preview.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'nearest'});
    document.querySelector('#whatsapp-send').focus({preventScroll:true});
  });
}
