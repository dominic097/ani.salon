(() => {
  'use strict';

  const hero = document.getElementById('top');
  const opening = hero?.querySelector('.hero-choices');
  const panel = opening?.querySelector('.hero-miniatures');
  const motion = opening?.querySelector('[data-opening="film"]');
  const heritage = opening?.querySelector('[data-opening="heritage"]');
  if (!panel || !motion || !heritage) return;

  function alignOpeningFigures() {
    const bounds = panel.getBoundingClientRect();
    const rtl = getComputedStyle(opening).direction === 'rtl';
    function setPerch(property, choice) {
      const button = choice.getBoundingClientRect();
      const offset = rtl ? bounds.right - button.right : button.left - bounds.left;
      opening.style.setProperty(property, `${offset + button.width / 2}px`);
    }

    // Seat each figure above its own button independently of the chosen scene.
    setPerch('--hero-miniature-perch', motion);
    setPerch('--hero-miniature-neighbor', heritage);
  }

  alignOpeningFigures();
  if ('ResizeObserver' in window) {
    const resizes = new ResizeObserver(alignOpeningFigures);
    for (const element of [opening, motion, heritage]) resizes.observe(element);
  } else {
    addEventListener('resize', alignOpeningFigures, { passive: true });
  }
})();
