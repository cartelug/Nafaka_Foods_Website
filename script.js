const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  mobileMenu.classList.toggle('open', !open);
  document.body.classList.toggle('menu-open', !open);
});

mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  mobileMenu.classList.remove('open');
  document.body.classList.remove('menu-open');
}));

document.getElementById('year').textContent = new Date().getFullYear();

const leadForm = document.getElementById('lead-form');
if (leadForm) {
  leadForm.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const lines = [
      `Hello Nafaka Foods, I would like to enquire about ${data.get('interest') || 'your products and services'}.`,
      '',
      `Name: ${data.get('name')}`
    ];
    if (data.get('organisation')) lines.push(`Organisation: ${data.get('organisation')}`);
    lines.push(`Phone: ${data.get('phone')}`, `Interested in: ${data.get('interest')}`);
    if (data.get('message')) lines.push(`Notes: ${data.get('message')}`);
    window.open(`https://wa.me/256776974521?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');

    const button = form.querySelector('.button-green');
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.innerHTML = 'Opening WhatsApp…';
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }, 2200);
  });
}

/* ---------------------------------------------------------------------
   Progressive motion layer: Lenis smooth scroll + GSAP/ScrollTrigger.
   Everything above this line works with zero JS dependency risk.
   Everything below only ENHANCES an already-complete, already-visible
   page — every element this touches is opacity:1 in the base CSS, so
   a blocked CDN, a slow network or a script error simply leaves the
   page exactly as good as it is without this file finishing.
   --------------------------------------------------------------------- */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  let lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
  }

  if (hasGSAP && hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    if (!reduceMotion) {
      // Staggered reveal for every .reveal element, grouped by
      // whatever enters the viewport together.
      gsap.set('.reveal', { opacity: 0, y: 28 });
      ScrollTrigger.batch('.reveal', {
        start: 'top 88%',
        once: true,
        onEnter: batch => gsap.to(batch, {
          opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, overwrite: true
        })
      });

      // Hero background parallax — the image itself is pre-scaled in
      // CSS (transform:scale(1.12)) so this never exposes an edge.
      gsap.to('.hero-media', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });

      // Count-up on the heritage stat, from the number already
      // printed in the HTML (so the resting value is always correct).
      document.querySelectorAll('[data-count-to]').forEach(el => {
        const target = parseFloat(el.dataset.countTo);
        const counter = { val: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () => gsap.to(counter, {
            val: target,
            duration: 1.4,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(counter.val); }
          })
        });
      });

      // Magnetic pull on primary buttons, pointer devices only.
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.button, .nav-cta').forEach(btn => {
          btn.addEventListener('mousemove', e => {
            const r = btn.getBoundingClientRect();
            gsap.to(btn, {
              x: (e.clientX - r.left - r.width / 2) * 0.22,
              y: (e.clientY - r.top - r.height / 2) * 0.35,
              duration: 0.4,
              ease: 'power3.out'
            });
          });
          btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
          });
        });
      }
    }

    // Smooth-height FAQ accordion, single-open. Falls back to the
    // browser's native <details> open/close if GSAP never loads.
    document.querySelectorAll('.faq-item').forEach(item => {
      const summary = item.querySelector('.faq-q');
      const panel = item.querySelector('.faq-a');
      summary.addEventListener('click', e => {
        e.preventDefault();
        const isOpen = item.hasAttribute('open');
        if (isOpen) {
          gsap.to(panel, {
            height: 0, duration: 0.35, ease: 'power2.in',
            onComplete: () => item.removeAttribute('open')
          });
        } else {
          document.querySelectorAll('.faq-item[open]').forEach(other => {
            if (other !== item) {
              const otherPanel = other.querySelector('.faq-a');
              gsap.to(otherPanel, {
                height: 0, duration: 0.3, ease: 'power2.in',
                onComplete: () => other.removeAttribute('open')
              });
            }
          });
          item.setAttribute('open', '');
          gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: 0.5, ease: 'power2.out' });
        }
      });
    });

    ScrollTrigger.refresh();
  }
})();
