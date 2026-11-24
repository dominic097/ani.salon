const hero = document.getElementById('top');
const panel = hero?.querySelector('.hero-miniatures');
const canvas = panel?.querySelector('.hero-atelier-live');
const anchors = [...(panel?.querySelectorAll('.hero-miniature') ?? [])];

if (canvas && anchors.length === 2 && 'WebGL2RenderingContext' in window && 'IntersectionObserver' in window) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const curtains = document.querySelector('.opening-veil')?.getAnimations?.() ?? [];
  const movingAnchors = new Set();
  const cycleDuration = 4.9;
  const ownerSwings = [
    { start: .97, duration: 1.40, strength: .76 },
    { start: 3.07, duration: 1.17, strength: .63 },
  ];
  const daughterSwings = [
    { start: 2.38, duration: 1.13, strength: .82 },
    { start: .38, duration: 1.33, strength: 1 },
  ];
  const firstSwing = daughterSwings[1].start;
  let curtainOpen = !curtains.length;
  let visible = false;
  let loading = false;
  let unavailable = false;
  let scene;
  let frame = 0;
  let pause = 0;
  let loopStart;

  function canShow() {
    return visible && !document.hidden && !reduced.matches && !unavailable;
  }

  function requestFrame() {
    if (!scene || !canShow() || frame) return;
    clearTimeout(pause);
    frame = requestAnimationFrame(draw);
  }

  function stop() {
    cancelAnimationFrame(frame);
    clearTimeout(pause);
    frame = 0;
    loopStart = undefined;
    delete panel.dataset.atelierRenderer;
  }

  async function prepare() {
    if (!canShow() || loading || scene) return;
    loading = true;
    let renderer;
    let texture;
    const actors = [];
    try {
      const [three, { createAtelierRig }] = await Promise.all([
        import('../vendor/three.module.js'),
        import('./elor-avatar-rig.js?v=seated-swings'),
      ]);
      if (!canShow()) return;
      texture = await new three.TextureLoader().loadAsync(new URL('./elor-atelier-miniatures.webp', import.meta.url).href);
      if (!canShow()) {
        texture.dispose();
        return;
      }
      texture.colorSpace = three.SRGBColorSpace;
      renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      const camera = new three.OrthographicCamera(0, 1, 1, 0, .1, 100);
      camera.position.z = 5;
      const stage = new three.Scene();
      for (const [index, person] of ['owner', 'daughter'].entries()) {
        const rig = createAtelierRig(texture, person);
        stage.add(rig.node);
        actors.push({ rig, anchor: anchors[index], cues: index === 0 ? ownerSwings : daughterSwings });
      }
      scene = { renderer, camera, stage, actors, width: 0, height: 0 };
      requestFrame();
    } catch {
      actors.forEach(({ rig }) => rig.dispose());
      texture?.dispose();
      renderer?.dispose();
      unavailable = true;
    } finally {
      loading = false;
    }
  }

  function draw(now) {
    frame = 0;
    if (!canShow() || !scene) return;
    const { renderer, camera, stage, actors } = scene;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);
    if (!width || !height) return;
    if (scene.width !== width || scene.height !== height) {
      scene.width = width;
      scene.height = height;
      renderer.setSize(width, height, false);
      camera.right = width;
      camera.top = height;
      camera.updateProjectionMatrix();
    }
    if (curtainOpen && loopStart === undefined) loopStart = now;
    const cycle = curtainOpen ? ((now - loopStart) / 1000) % cycleDuration : 0;
    let nextSwing = cycleDuration - cycle + firstSwing;
    let swinging = false;

    for (const { rig, anchor, cues } of actors) {
      const { left, top, width: size } = anchor.getBoundingClientRect();
      const swings = cues.map(({ start, duration, strength }) => {
        if (cycle < start) {
          nextSwing = Math.min(nextSwing, start - cycle);
          return 0;
        }
        const progress = (cycle - start) / duration;
        if (progress >= 1) return 0;
        swinging = true;
        return strength * Math.sin(Math.PI * progress) ** 2;
      });
      rig.node.position.set(left - bounds.left + size / 2, height - (top - bounds.top + size / 2), 0);
      rig.node.scale.setScalar(size);
      rig.swingLegs(swings);
    }
    renderer.render(stage, camera);
    if (panel.dataset.atelierRenderer !== 'three') panel.dataset.atelierRenderer = 'three';
    if (swinging || movingAnchors.size) requestFrame();
    else if (curtainOpen) pause = setTimeout(requestFrame, nextSwing * 1000);
  }

  function updateVisibility() {
    if (!canShow()) {
      stop();
      return;
    }
    prepare();
    requestFrame();
  }

  function syncPerch(event) {
    if (!anchors.includes(event.target)) return;
    if (event.type === 'transitionrun') movingAnchors.add(event.target);
    else movingAnchors.delete(event.target);
    requestFrame();
  }

  panel.addEventListener('transitionrun', syncPerch);
  panel.addEventListener('transitionend', syncPerch);
  panel.addEventListener('transitioncancel', syncPerch);
  reduced.addEventListener('change', updateVisibility);
  document.addEventListener('visibilitychange', updateVisibility);
  canvas.addEventListener('webglcontextlost', () => {
    unavailable = true;
    stop();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= .25;
    updateVisibility();
  }, { threshold: .25, rootMargin: '-74px 0px 0px' }).observe(panel);
  if ('ResizeObserver' in window) new ResizeObserver(requestFrame).observe(panel);
  else addEventListener('resize', requestFrame, { passive: true });
  if (!curtainOpen) Promise.allSettled(curtains.map(curtain => curtain.finished)).then(() => {
    curtainOpen = true;
    requestFrame();
  });
  updateVisibility();
}
