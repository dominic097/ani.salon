import { loopCharacterMotionInView } from './elor-character-motion.js?v=character-loops';

function smooth(from, to, value) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

function strokes(progress, horizontal, vertical) {
  // Both strokes return to the neutral pose before the pause between passes.
  const gesture = Math.min(1, progress / .73);
  const brow = smooth(.08, .28, gesture) - smooth(.38, .54, gesture);
  const cheek = smooth(.46, .68, gesture) - smooth(.76, 1, gesture);
  return [-horizontal * (brow + .65 * cheek), vertical * (brow - 1.1 * cheek)];
}

loopCharacterMotionInView(document.querySelector('.bridal-painter'), {
  imageUrl: new URL('./elor-bridal-painter.webp?v=photo-face', import.meta.url).href,
  attribute: 'data-painter-playing',
  threshold: .55,
  duration: 3700,
  region: { x: 189, y: 143, radiusX: 26, radiusY: 46 },
  region2: { x: 211, y: 105, radiusX: 32, radiusY: 18 },
  shift: progress => strokes(progress, 8, 13),
  shift2: progress => strokes(progress, 6, 15),
});
