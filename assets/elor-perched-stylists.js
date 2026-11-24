(() => {
  'use strict';

  const hero = document.getElementById('top');
  const opening = hero?.querySelector('.hero-choices');
  const panel = opening?.querySelector('.hero-miniatures');
  const openingFigure = panel?.querySelector('.hero-miniature-left');
  if (!openingFigure) return;

  function alignOpeningFigures() {
    const choices = [...opening.querySelectorAll('.hero-choice')];
    const selected = choices.findIndex(button => button.getAttribute('aria-pressed') === 'true');
    if (selected < 0) return;

    const bounds = panel.getBoundingClientRect();
    const rtl = getComputedStyle(opening).direction === 'rtl';
    function setPerch(property, choice) {
      const button = choice.getBoundingClientRect();
      const offset = rtl ? bounds.right - button.right : button.left - bounds.left;
      opening.style.setProperty(property, `${offset + button.width / 2}px`);
    }

    const companion = selected < choices.length - 1 ? selected + 1 : Math.max(0, selected - 1);
    // Their resting artwork faces inward, so keep the pair in the same order.
    setPerch('--hero-miniature-perch', choices[Math.min(selected, companion)]);
    setPerch('--hero-miniature-neighbor', choices[Math.max(selected, companion)]);
  }

  alignOpeningFigures();
  new MutationObserver(alignOpeningFigures).observe(opening, {
    attributes: true,
    attributeFilter: ['aria-pressed'],
    subtree: true,
  });
  if ('ResizeObserver' in window) new ResizeObserver(alignOpeningFigures).observe(opening);
  else addEventListener('resize', alignOpeningFigures, {passive: true});
})();
