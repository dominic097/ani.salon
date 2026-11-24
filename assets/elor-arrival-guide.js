import { playCharacterMotion } from './elor-character-motion.js';

const guide = document.querySelector('.arrival-guide');
const stage = guide?.closest('.room-stage');
const image = stage?.querySelector('#roomImage');
const arrival = stage?.querySelector('[data-room="arrival"]');
const family = guide?.querySelector('.arrival-family');

if (image && arrival && family) {
  const arrivalImage = image.src;
  const poseUrl = new URL('./elor-arrival-sketchbook-open.webp?v=arrival-likeness', import.meta.url);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const curtain = document.querySelector('.opening-veil')?.getAnimations?.()
    .find(animation => animation.animationName === 'veil-exit');
  let openingReady = !curtain;
  let inView = false;
  let played = false;

  function canAnimate() {
    return openingReady && !guide.hidden && inView && !reducedMotion.matches && !document.hidden;
  }

  async function animateSketchbook() {
    const pose = new Image();
    pose.src = poseUrl.href;
    try {
      await pose.decode();
    } catch {
      return;
    }
    if (!canAnimate()) return;

    const canvas = family.querySelector('.arrival-family-motion');
    await playCharacterMotion({
      canvas,
      image: pose,
      duration: 2230,
      region: { x: 240, y: 227, radiusX: 52, radiusY: 28 },
      shift(progress) {
        const phase = Math.max(0, (progress * 2230 - 410) / 1820);
        const tug = Math.sin(Math.PI * phase) ** 2;
        return [8 * tug, 12 * tug];
      },
      active: canAnimate,
      ready() { family.dataset.motionReady = ''; },
    });
    delete family.dataset.motionReady;
  }

  function syncMotion() {
    if (played || !canAnimate()) return;
    played = true;
    animateSketchbook();
  }

  function fitPhoto() {
    if (guide.hidden) return;
    const scale = Math.max(image.clientWidth / image.naturalWidth, image.clientHeight / image.naturalHeight);
    guide.style.setProperty('--arrival-photo-width', `${image.naturalWidth * scale}px`);
    guide.style.setProperty('--arrival-photo-height', `${image.naturalHeight * scale}px`);
  }

  function syncRoom() {
    guide.hidden = arrival.getAttribute('aria-pressed') !== 'true' ||
      image.currentSrc !== arrivalImage || !image.complete || !image.naturalWidth;
    fitPhoto();
    syncMotion();
  }

  const selection = new MutationObserver(syncRoom);
  selection.observe(arrival, { attributes: true, attributeFilter: ['aria-pressed'] });
  selection.observe(image, { attributes: true, attributeFilter: ['src'] });
  image.addEventListener('load', syncRoom);
  image.addEventListener('error', syncRoom);
  if ('ResizeObserver' in window) new ResizeObserver(fitPhoto).observe(image);
  else addEventListener('resize', fitPhoto, { passive: true });
  syncRoom();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= .55;
      syncMotion();
    }, { threshold: .55, rootMargin: '-95px 0px 0px' }).observe(family);

    document.addEventListener('visibilitychange', syncMotion);
    reducedMotion.addEventListener('change', syncMotion);
    if (curtain) {
      curtain.finished.catch(() => {}).then(() => {
        openingReady = true;
        syncMotion();
      });
    }
  }
}
