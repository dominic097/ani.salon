// The Unveiling — a responsive, hand-drawn silk seam between two editorial portraits.
// No video, WebGL or motion library is required. Pointer, touch and keyboard all work.
const frame = document.getElementById('unveilFrame');
const image = document.getElementById('unveilModern');
const range = document.getElementById('unveilRange');
const grip = document.getElementById('unveilGrip');
const trace = document.getElementById('unveilTrace');
const glowPath = document.getElementById('traceGlow');
const linePath = document.getElementById('traceLine');

if (frame && image && range && grip && trace && glowPath && linePath) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let target = 52;
  let position = 52;
  let dragging = false;
  let interacted = false;
  let scheduled = false;
  let start = performance.now();
  let previousTime = start;
  let width = 1;
  let height = 1;

  const clamp = (number, low, high) => Math.max(low, Math.min(high, number));
  function measure() {
    const bounds = frame.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    trace.setAttribute('viewBox', `0 0 ${width} ${height}`);
    draw(performance.now());
  }

  function draw(now) {
    const points = [];
    const speed = Math.min(1, Math.abs(target - position) / 18);
    const amplitude = reducedMotion ? 0 : 6 + speed * 10;
    const phase = now * .0015;
    for (let i = 0; i <= 40; i++) {
      const y = height * i / 40;
      const edge = Math.sin(Math.PI * i / 40);
      const fold = (Math.sin(i * .24 + phase) * .5 + Math.sin(i * .11 - phase * .45) * .5) * edge * amplitude;
      const x = width * position / 100 + fold;
      points.push({ x, y });
    }
    const coords = points.map(point => `${point.x.toFixed(1)}px ${point.y.toFixed(1)}px`);
    image.style.clipPath = `polygon(${coords.join(',')}, ${width}px ${height}px, ${width}px 0px)`;
    const d = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    glowPath.setAttribute('d', d);
    linePath.setAttribute('d', d);
    grip.style.left = `${position}%`;
    grip.style.top = `${57 + Math.sin(phase + 2) * (reducedMotion ? 0 : 1)}%`;
  }

  function animate(now) {
    scheduled = false;
    // The first entrance performs one quiet reveal; it never auto-repeats.
    if (!interacted && !reducedMotion) {
      const elapsed = now - start;
      if (elapsed < 2300) {
        const t = elapsed / 2300;
        target = 52 + Math.sin(t * Math.PI * 1.7) * 19 * Math.sin(Math.PI * t);
      } else {
        target = 52;
      }
    }
    const delta = Math.min(48, now - previousTime);
    previousTime = now;
    position += (target - position) * (reducedMotion ? 1 : 1 - Math.exp(-delta / 95));
    draw(now);
    if (dragging || Math.abs(target - position) > .025 || (!interacted && !reducedMotion && now - start < 2700)) requestFrame();
  }

  function requestFrame() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(animate);
  }

  function setPosition(percent) {
    interacted = true;
    target = clamp(percent, 18, 82);
    range.value = String(Math.round(target));
    requestFrame();
  }

  function fromPointer(event) {
    const rect = frame.getBoundingClientRect();
    setPosition((event.clientX - rect.left) / rect.width * 100);
  }

  frame.addEventListener('pointerdown', event => {
    if (event.target === range || event.button > 0) return;
    dragging = true;
    frame.classList.add('dragging');
    frame.setPointerCapture?.(event.pointerId);
    fromPointer(event);
  });
  frame.addEventListener('pointermove', event => {
    if (dragging) fromPointer(event);
  });
  function finishDrag() {
    dragging = false;
    frame.classList.remove('dragging');
    requestFrame();
  }
  frame.addEventListener('pointerup', finishDrag);
  frame.addEventListener('pointercancel', finishDrag);
  frame.addEventListener('lostpointercapture', finishDrag);
  range.addEventListener('input', () => setPosition(Number(range.value)));
  window.addEventListener('resize', measure, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(frame);
  measure();
  if (!reducedMotion) requestFrame();
}
