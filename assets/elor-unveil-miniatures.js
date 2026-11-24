import { playCharacterMotion } from './elor-character-motion.js';

const frame = document.getElementById('unveilFrame');
const range = document.getElementById('unveilRange');
const band = frame?.querySelector('.unveil-miniatures');
const figures = band?.querySelectorAll('.unveil-miniature');

if (range && figures?.length === 2 && 'IntersectionObserver' in window) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const atlasUrl = new URL('./elor-atelier-miniatures.webp', import.meta.url);
  let visible = false;
  let greeted = false;
  let previousValue = range.valueAsNumber;

  function active() {
    return visible && !reduced.matches && !document.hidden;
  }

  async function acknowledge() {
    const image = new Image();
    image.src = atlasUrl.href;
    try {
      await image.decode();
    } catch {
      return;
    }
    if (!active()) return;

    const tile = image.naturalWidth / 2;
    const hands = [
      { x: 309, y: 96, radiusX: 47, radiusY: 30 },
      { x: 63, y: 56, radiusX: 43, radiusY: 29 },
    ];
    await Promise.all(Array.from(figures, async (figure, index) => {
      const canvas = document.createElement('canvas');
      figure.append(canvas);
      await playCharacterMotion({
        canvas,
        image,
        duration: 1040,
        sourceArea: { x: index * tile, y: tile, width: tile, height: tile },
        region: hands[index],
        shift(progress) {
          const delay = index === 0 ? .15 : 0;
          const phase = Math.max(0, (progress - delay) / (1 - delay));
          const lift = Math.sin(Math.PI * phase) ** 2;
          return [(index === 0 ? -10 : 10) * lift, (index === 0 ? 13 : 10) * lift];
        },
        active,
        ready() { figure.dataset.unveilingGl = ''; },
      });
      delete figure.dataset.unveilingGl;
      canvas.remove();
    }));
  }

  function greetOnSeamMove() {
    const value = range.valueAsNumber;
    if (value === previousValue) return;
    previousValue = value;
    if (greeted) return;
    // Keyboard focus can scroll the seam into view just before the observer runs.
    const bounds = band.getBoundingClientRect();
    const visibleHeight = Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 74);
    visible = bounds.height > 0 && visibleHeight / bounds.height >= .35;
    if (!active()) return;
    greeted = true;
    acknowledge();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= .35;
  }, { threshold: .35, rootMargin: '-74px 0px 0px' }).observe(band);

  range.addEventListener('input', greetOnSeamMove);
  function trackPointerDrag() {
    // A dragged seam updates the range directly, without dispatching an input event.
    if (frame.classList.contains('dragging')) greetOnSeamMove();
  }
  frame.addEventListener('pointerdown', trackPointerDrag, { passive: true });
  frame.addEventListener('pointermove', trackPointerDrag, { passive: true });
}
