/* The original portrait and CSS sunlight are visible immediately. Load WebGL only nearby. */
(() => {
  'use strict';
  const stage = document.getElementById('lightRoomStage');
  const canvas = document.getElementById('lightRoomGPU');
  if (!stage || !canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.WebGL2RenderingContext) return;
  let requested = false;
  async function upgrade() {
    if (requested) return;
    requested = true;
    try {
      const scene = await import('./elor-light-webgl.js');
      await scene.startLightRoomWebGL(stage, canvas);
    } catch (error) {
      // Progressive enhancement: the portrait and CSS sunlight remain intact.
      stage.classList.remove('webgl-ready');
      canvas.hidden = true;
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      upgrade();
    }, {rootMargin:'260px 0px',threshold:0});
    observer.observe(stage);
  } else {
    // The still portrait does not wait for unsupported browser features.
    requestAnimationFrame(upgrade);
  }
})();
