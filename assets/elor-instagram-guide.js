import { loopCharacterMotionInView } from './elor-character-motion.js?v=character-loops';

function ease(from, to, progress) {
  const t = Math.max(0, Math.min(1, (progress - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

function pointAtLink(progress, reach, lift) {
  const active = Math.min(1, progress / .52);
  const gesture = ease(.08, .35, active) - ease(.53, .88, active);
  return [reach * gesture, lift * gesture];
}

loopCharacterMotionInView(document.querySelector('.hero-instagram-link .instagram-guide'), {
  imageUrl: new URL('./elor-instagram-pointing.webp', import.meta.url).href,
  attribute: 'data-instagram-cue',
  duration: 3050,
  region: { x: 56, y: 199, radiusX: 70, radiusY: 36 },
  region2: { x: 106, y: 231, radiusX: 63, radiusY: 44 },
  shift: progress => pointAtLink(progress, 24, 16),
  shift2: progress => pointAtLink(progress, 10, 8),
});
