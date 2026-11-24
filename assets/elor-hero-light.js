(() => {
  'use strict';

  const hero = document.getElementById('top');
  const canvas = document.getElementById('heroLightCanvas');
  if (!hero) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const observeVisibility = 'IntersectionObserver' in window;
  const curtain = document.querySelector('.opening-veil')?.getAnimations?.()
    .find(animation => animation.animationName === 'veil-exit');
  const burstDuration = 4200;
  const sceneAnimations = new Set([
    'elor-scene-opacity', 'elor-scene-drift', 'elor-directed-drift', 'hero-light-sweep', 'lightwalk',
  ]);
  let visible = !observeVisibility;
  let openingReady = !curtain;
  let introduced = false;
  let renderer;
  let unavailable = !canvas || typeof WebGL2RenderingContext === 'undefined';
  let waiting = false;
  let timer = 0;
  let frame = 0;
  let startedAt = 0;
  let lastPaint;
  let elapsed = 0;
  let tone = 0;

  function canAnimate() {
    return openingReady && visible && !document.hidden && !reduced.matches;
  }

  function stopBurst() {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    timer = 0;
    frame = 0;
    delete hero.dataset.heroMotion;
  }

  function draw(now) {
    frame = 0;
    if (!renderer || !timer || !canAnimate()) return;
    if (lastPaint === undefined || now - lastPaint >= 30) {
      const delta = lastPaint === undefined ? 0 : Math.min(.09, (now - lastPaint) / 1000);
      lastPaint = now;
      elapsed = Math.max(0, Math.min(now - startedAt, burstDuration)) / 1000;
      const selected = hero.dataset.heroOpening;
      const desiredTone = selected === 'heritage' ? 1 : selected === 'future' ? 2 : 0;
      tone += (desiredTone - tone) * (1 - Math.exp(-4 * delta));
      renderer.draw(elapsed, tone);
      hero.dataset.heroRenderer = 'webgl';
    }
    frame = requestAnimationFrame(draw);
  }

  function resize() {
    if (!renderer) return;
    renderer.resize(hero.clientWidth, hero.clientHeight);
    if (!timer && hero.dataset.heroRenderer === 'webgl' && !reduced.matches) renderer.draw(elapsed, tone);
  }

  function useFallback() {
    unavailable = true;
    renderer = undefined;
    delete hero.dataset.heroRenderer;
  }

  async function prepareRenderer() {
    try {
      if (!timer || !canAnimate()) return;
      const { createHeroLight } = await import('./elor-hero-webgl.js?v=premultiplied-light');
      if (!timer || !canAnimate()) return;
      renderer = createHeroLight(canvas);
      if (!renderer) unavailable = true;
      resize();
    } catch {
      useFallback();
    } finally {
      waiting = false;
      scheduleRenderer();
    }
  }

  function scheduleRenderer() {
    if (!timer || !canAnimate()) return;
    if (renderer) {
      if (!frame) frame = requestAnimationFrame(draw);
    } else if (!unavailable && !waiting) {
      waiting = true;
      if ('requestIdleCallback' in window) {
        requestIdleCallback(prepareRenderer, { timeout: 800 });
      } else {
        setTimeout(prepareRenderer, 100);
      }
    }
  }

  function startBurst() {
    if (!canAnimate()) return;
    stopBurst();

    // Restart only the artwork tracks, keeping the page and button transitions independent.
    for (const animation of hero.getAnimations?.({ subtree: true }) ?? []) {
      if (sceneAnimations.has(animation.animationName)) animation.currentTime = 0;
    }
    startedAt = performance.now();
    lastPaint = undefined;
    hero.dataset.heroMotion = '';
    timer = setTimeout(stopBurst, burstDuration);
    scheduleRenderer();
  }

  function syncOpening() {
    if (!canAnimate()) {
      stopBurst();
    } else if (!introduced) {
      introduced = true;
      startBurst();
    }
  }

  hero.addEventListener('click', event => {
    if (event.target.closest?.('.hero-choice[data-opening]')) startBurst();
  });
  canvas?.addEventListener('webglcontextlost', useFallback);
  document.addEventListener('visibilitychange', syncOpening);
  reduced.addEventListener('change', syncOpening);

  if (observeVisibility) {
    new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= .08;
      syncOpening();
    }, { threshold: .08 }).observe(hero);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    addEventListener('resize', resize, { passive: true });
  }

  if (curtain) {
    curtain.finished.catch(() => {}).then(() => {
      openingReady = true;
      syncOpening();
    });
  } else {
    syncOpening();
  }
})();
