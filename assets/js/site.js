'use strict';

const header = document.querySelector('.site-header');
const progress = document.querySelector('.scroll-progress');
let ticking = false;

function updateScrollState() {
  const top = window.scrollY;
  if (header) header.classList.toggle('is-scrolled', top > 24);
  if (progress) {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (distance > 0 ? Math.min(top / distance, 1) : 0) + ')';
  }
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(updateScrollState);
    ticking = true;
  }
}, { passive: true });
updateScrollState();

const menu = document.querySelector('.menu');
if (menu) {
  const summary = menu.querySelector('summary');
  const wide = matchMedia('(min-width: 901px)');
  const inertTargets = [
    document.querySelector('main'),
    document.querySelector('.site-footer'),
    document.querySelector('.mobile-cta')
  ].filter(Boolean);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      summary.focus();
    }
  });

  menu.addEventListener('keydown', event => {
    if (!menu.open || event.key !== 'Tab') return;
    const items = [...menu.querySelectorAll('summary, a[href], button:not([disabled])')];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.open = false;
  }));

  const closeOnWide = event => {
    if (event.matches) menu.open = false;
  };
  if (wide.addEventListener) wide.addEventListener('change', closeOnWide);
  else wide.addListener(closeOnWide);

  menu.addEventListener('toggle', () => {
    inertTargets.forEach(target => { target.inert = menu.open; });
    document.body.classList.toggle('menu-open', menu.open);
    summary.setAttribute('aria-label', menu.open ? 'Close navigation' : 'Open navigation');
  });
}

document.querySelectorAll('[data-year]').forEach(element => {
  element.textContent = new Date().getFullYear();
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      entry.target.classList.remove('reveal-pending');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

  document.querySelectorAll('.reveal').forEach((element, index) => {
    if (element.getBoundingClientRect().top > window.innerHeight * 0.78) {
      element.classList.add('reveal-pending');
      element.style.transitionDelay = Math.min(index % 4, 3) * 55 + 'ms';
      observer.observe(element);
    }
  });
}

document.querySelectorAll('.faq-list details').forEach(item => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    const list = item.closest('.faq-list');
    list.querySelectorAll('details[open]').forEach(other => {
      if (other !== item) other.open = false;
    });
  });
});

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
    label.textContent = vending ? 'Tell us about the building *' : 'Anything else we should know?';
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
    try {
      draft = NafakaEnquiry.build(data);
    } catch (error) {
      note.setCustomValidity(error.message);
      note.reportValidity();
      note.addEventListener('input', () => note.setCustomValidity(''), { once: true });
      return;
    }
    document.querySelector('#message-text').textContent = draft.message;
    document.querySelector('#whatsapp-send').href = draft.url;
    preview.hidden = false;
    document.querySelector('#message-status').textContent = 'Your draft is ready. Nothing has been sent yet.';
    preview.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    document.querySelector('#whatsapp-send').focus({ preventScroll: true });
  });
}
