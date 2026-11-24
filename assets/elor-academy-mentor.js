import { loopCharacterMotionInView } from "./elor-character-motion.js?v=character-loops";

const mentor = document.querySelector("#academy .academy-mentor");

if (mentor) {
  const imageSize = 1254;
  const sourceArea = { x: 289, y: 776, width: 360, height: 312 };
  for (const [side, pixels] of Object.entries(sourceArea)) {
    mentor.style.setProperty(`--academy-mentor-canvas-${side}`, `${pixels / imageSize * 100}%`);
  }

  function pass(progress, start, length) {
    const phase = Math.max(0, Math.min(1, (progress - start) / length));
    return Math.sin(Math.PI * phase) ** 2;
  }

  function stroke(progress) {
    // Two light annotations, then a pause while she points at the page.
    return pass(progress, .09, .34) + .63 * pass(progress, .49, .25);
  }

  loopCharacterMotionInView(mentor, {
    imageUrl: new URL("./elor-academy-mentor.webp", import.meta.url),
    attribute: "data-academy-mentor-gl",
    sourceArea,
    threshold: .7,
    duration: 4600,
    region: { x: 155, y: 150, radiusX: 119, radiusY: 123 },
    shift(progress) {
      const amount = stroke(progress);
      return [-10 * amount, 24 * amount];
    },
    region2: { x: 214, y: 175, radiusX: 103, radiusY: 126 },
    shift2(progress) {
      const amount = stroke(progress);
      return [-22 * amount, 17 * amount];
    },
  });
}
