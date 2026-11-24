// Cinema-grade micro-interactions for the private èlor concept.
// Everything here is optional; navigation and content never depend on animation.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.getElementById('cinemaProgress');
  const hero = document.getElementById('top');
  const film = document.getElementById('heroFilm');
  const smoothFilm = document.getElementById('heroSmoothFilm');
  const content = document.querySelector('.hero-content');
  let queued = false;

  function update() {
    queued = false;
    const extent = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / extent))})`;
    if (reduced.matches || !hero || !film || !content) return;
    const y = Math.min(Math.max(0, scrollY), innerHeight * 1.2);
    if (smoothFilm) smoothFilm.style.transform = `translate3d(0, ${(y * .095).toFixed(2)}px, 0) scale(${(1 + y * .00005).toFixed(4)})`;
    else film.style.transform = `translate3d(0, ${(y * .095).toFixed(2)}px, 0)`;
    content.style.transform = `translate3d(0, ${(y * .045).toFixed(2)}px, 0)`;
    content.style.opacity = String(Math.max(.08, 1 - y / (innerHeight * .90)));
  }
  const requestUpdate = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', requestUpdate, {passive: true});
  addEventListener('resize', requestUpdate, {passive: true});
  requestUpdate();

  if (!reduced.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const links = document.querySelectorAll('.final-link,.desktop-nav .border-link');
    links.forEach(link => {
      link.addEventListener('pointermove', event => {
        const rect = link.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) * .10;
        const y = (event.clientY - (rect.top + rect.height / 2)) * .10;
        link.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      }, {passive: true});
      link.addEventListener('pointerleave', () => { link.style.translate = '0 0'; });
      link.addEventListener('blur', () => { link.style.translate = '0 0'; });
    });
  }

  // The opening ident happens at most once per tab session. Subsequent visits
  // return straight to the content, with no repeated interruption.
  const veil = document.querySelector('.opening-veil');
  if (veil) {
    try {
      if (sessionStorage.getItem('elor-intro-seen')) veil.style.display = 'none';
      else sessionStorage.setItem('elor-intro-seen', '1');
    } catch (_) { /* Private-browsing storage may be disabled. */ }
  }
})();
