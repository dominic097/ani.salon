import { playCharacterMotion } from "./elor-character-motion.js";

const guide = document.querySelector("#invitation .invitation-guide");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

if (guide && "IntersectionObserver" in window && !reducedMotion.matches) {
  const imageUrl = new URL("elor-invitation-owner.webp?v=photo-face", import.meta.url);

  const observer = new IntersectionObserver(async ([entry]) => {
    if (entry.intersectionRatio < .6 || document.hidden) return;
    observer.disconnect();

    const portrait = new Image();
    portrait.src = imageUrl.href;
    try {
      await portrait.decode();
    } catch {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "invitation-guide-canvas";
    guide.append(canvas);

    try {
      await playCharacterMotion({
        canvas,
        image: portrait,
        duration: 1450,
        region: { x: 337, y: 382, radiusX: 58, radiusY: 47 },
        shift(progress) {
          const lift = Math.sin(Math.PI * progress) ** 2;
          return [-8 * lift, 24 * lift];
        },
        active() {
          const bounds = guide.getBoundingClientRect();
          return !reducedMotion.matches && !document.hidden && bounds.bottom > 74 && bounds.top < innerHeight;
        },
        ready() {
          guide.dataset.invitationWelcome = "playing";
        },
      });
    } finally {
      if (guide.dataset.invitationWelcome === "playing") guide.dataset.invitationWelcome = "settled";
      canvas.remove();
    }
  }, { threshold: .6, rootMargin: "-74px 0px 0px" });

  observer.observe(guide);
}
