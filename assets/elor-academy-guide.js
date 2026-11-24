import { loopCharacterMotionInView } from './elor-character-motion.js?v=character-loops';

const art = document.querySelector('.academy-guide-art');
const tab = document.getElementById('destination-tab-academy');

if (art && tab) {
  const sync = loopCharacterMotionInView(art, {
    imageUrl: new URL('./elor-academy-guide.webp?v=brush', import.meta.url),
    attribute: 'data-academy-gl',
    // The rail crops the transparent sides of the square art.
    threshold: .55,
    enabled: () => tab.matches('[aria-selected="true"], [aria-current="location"]'),
    duration: 3300,
    region: { x: 155, y: 158, radiusX: 35, radiusY: 29 },
    shift(progress) {
      const phase = Math.max(0, Math.min(1, (progress - .12) / .48));
      const stroke = Math.sin(Math.PI * phase) ** 2;
      return [-10 * stroke, -23 * stroke];
    },
  });
  if (sync) {
    new MutationObserver(sync).observe(tab, { attributeFilter: ['aria-selected', 'aria-current'] });
  }
}
