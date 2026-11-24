/* èlor / sunlight arrives by itself; no scrolling, cursor tracking or canvas work. */
(() => {
  'use strict';
  const stage = document.getElementById('lightRoomStage');
  if (!stage) return;
  const portrait = document.getElementById('lightRoomPortrait');
  const title = document.getElementById('lightRoomTitle');
  const tag = document.getElementById('lightRoomTag');
  const announcement = document.getElementById('lightRoomAnnounce');
  const buttons = [...document.querySelectorAll('.light-room-look[data-light-look]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const looks = {
    heirloom: {
      src: 'assets/elor-light-room-original.webp',
      alt: 'Tamil woman in sculptural Kanjivaram silk, touched by window sunlight',
      title: 'The heirloom<br><em>is alive.</em>', tag: 'HERITAGE IS A LIVING THING', focus: '73%'
    },
    unbound: {
      src: 'assets/elor-beauty-editorial.webp',
      alt: 'Contemporary beauty portrait emerging from warm light',
      title: 'Never<br><em>one thing.</em>', tag: 'A NEW EXPRESSION / IN YOUR OWN LIGHT', focus: '66%'
    },
    detail: {
      src: 'assets/bridal-detail.webp',
      alt: 'Bridal jewelry and silk revealed by a soft beam of window light',
      title: 'The detail<br><em>stays.</em>', tag: 'THE INTIMACY OF CRAFT', focus: '68%'
    }
  };
  let inView = false;
  let request = 0;
  let chosen = 'heirloom';

  function playReveal() {
    if (!inView || reducedMotion.matches) return;
    stage.classList.remove('is-lit');
    // Restart the same authored reveal after a deliberate look change or re-entry.
    void stage.offsetWidth;
    stage.dataset.lightRevealStarted = String(performance.now());
    stage.classList.add('is-lit');
  }

  async function chooseLook(key) {
    const look = looks[key];
    if (!look || key === chosen) return;
    chosen = key;
    const myRequest = ++request;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lightLook === key)));
    const next = new Image();
    next.src = look.src;
    try { await next.decode(); } catch (_) { /* The original remains visible. */ return; }
    if (request !== myRequest) return;
    portrait.src = next.src;
    portrait.alt = look.alt;
    title.innerHTML = look.title;
    tag.textContent = look.tag;
    stage.style.setProperty('--sun-focus-x', look.focus);
    stage.dataset.lightLook = key;
    announcement.textContent = `Now showing ${key}. Sunlight reveals the portrait.`;
    playReveal();
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => chooseLook(button.dataset.lightLook));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = buttons[(index + step + buttons.length) % buttons.length];
      next.focus();
      chooseLook(next.dataset.lightLook);
    });
  });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stage.classList.remove('is-lit');
    else playReveal();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (visible && !inView) { inView = true; playReveal(); }
      else if (!visible) { inView = false; stage.classList.remove('is-lit'); }
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' }).observe(stage);
  } else {
    inView = true;
    playReveal();
  }
})();
