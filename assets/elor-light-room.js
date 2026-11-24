/* èlor / The Light Room — a tactile canvas darkroom, with no WebGL requirement. */
(() => {
  'use strict';
  const stage = document.getElementById('lightRoomStage');
  if (!stage) return;
  const canvas = document.getElementById('lightRoomCanvas');
  const portrait = document.getElementById('lightRoomPortrait');
  const heading = document.getElementById('lightRoomTitle');
  const tag = document.getElementById('lightRoomTag');
  const hint = document.getElementById('lightRoomHint');
  const announce = document.getElementById('lightRoomAnnounce');
  const revealButton = document.getElementById('lightRoomReveal');
  const resetButton = document.getElementById('lightRoomReset');
  const buttons = [...document.querySelectorAll('[data-light-look]')];
  const motionReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const looks = {
    heirloom: {
      src: 'assets/elor-light-room-original.webp',
      alt: 'Original editorial portrait of a Tamil woman wearing sculptural copper Kanjivaram silk in dramatic light',
      title: 'The heirloom<br><em>is alive.</em>',
      tag: 'HERITAGE IS A LIVING THING'
    },
    unbound: {
      src: 'assets/elor-beauty-editorial.webp',
      alt: 'Contemporary beauty editorial with sculptural dark fashion and natural skin texture',
      title: 'Never<br><em>one thing.</em>',
      tag: 'A NEW EXPRESSION / IN YOUR OWN LIGHT'
    },
    detail: {
      src: 'assets/bridal-detail.webp',
      alt: 'South Indian jewelry and bridal silk close-up study',
      title: 'The detail<br><em>stays.</em>',
      tag: 'THE INTIMACY OF CRAFT'
    }
  };
  let ctx;
  let logicalWidth = 1;
  let logicalHeight = 1;
  let active = 'heirloom';
  let pointerDown = false;
  let imageRequest = 0;
  let pendingPoint = null;
  let paintScheduled = false;
  let scrollFrame = 0;
  let scrollProgress = 0;
  const chapter = document.getElementById('light-room');

  const available = !!canvas.getContext;
  const reduce = () => motionReduced.matches || !available;

  function revealAt(x, y, scale = 1) {
    if (!ctx || reduce()) return;
    const radius = Math.max(75, Math.min(logicalWidth, logicalHeight) * .20) * scale;
    const gradient = ctx.createRadialGradient(x, y, radius * .06, x, y, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(.42, 'rgba(0,0,0,.96)');
    gradient.addColorStop(.75, 'rgba(0,0,0,.62)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gradient;
    ctx.fillRect(x-radius, y-radius, radius*2, radius*2);
    ctx.restore();
  }

  function drawScrollLight() {
    if (!ctx || reduce() || canvas.classList.contains('is-revealed')) return;
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    const ink = ctx.createLinearGradient(0, 0, logicalWidth, logicalHeight);
    const mobile = matchMedia('(max-width:760px)').matches;
    ink.addColorStop(0, mobile ? 'rgba(6,9,9,.71)' : 'rgba(6,9,9,.91)');
    ink.addColorStop(.5, mobile ? 'rgba(11,14,13,.66)' : 'rgba(11,14,13,.86)');
    ink.addColorStop(1, mobile ? 'rgba(12,12,11,.68)' : 'rgba(12,12,11,.88)');
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    // A narrow travelling beam opens gradually as the chapter is scrolled.
    const p = scrollProgress;
    const x = logicalWidth * (.26 + .50 * p);
    const y = logicalHeight * (.57 - .22 * p);
    const spread = .95 + p * 2.25;
    revealAt(x, y, spread);
    stage.style.setProperty('--light-x', `${26 + p * 50}%`);
    stage.style.setProperty('--light-y', `${57 - p * 22}%`);
  }

  function redrawVeil() {
    if (reduce()) return;
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    logicalWidth = bounds.width;
    logicalHeight = bounds.height;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(logicalWidth * dpr);
    canvas.height = Math.round(logicalHeight * dpr);
    ctx = canvas.getContext('2d', {alpha: true});
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScrollLight();
  }

  function updateScrollLight() {
    scrollFrame = 0;
    if (reduce() || !chapter) return;
    const rect = chapter.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const travel = Math.max(1, rect.height - innerHeight * .35);
    const next = Math.max(0, Math.min(1, (innerHeight * .75 - rect.top) / travel));
    if (Math.abs(next - scrollProgress) < .002) return;
    scrollProgress = next;
    stage.style.setProperty('--light-depth-y', `${((next - .5) * -28).toFixed(2)}px`);
    drawScrollLight();
  }
  function scheduleScrollLight() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollLight);
  }
  addEventListener('scroll', scheduleScrollLight, {passive:true});

  function reset() {
    if (reduce()) return;
    canvas.classList.remove('is-revealed');
    redrawVeil();
    revealButton.disabled = false;
    hint.textContent = 'SCROLL TO MOVE THE LIGHT · DRAG TO EXPLORE';
  }

  function paintPoint() {
    paintScheduled = false;
    if (!pendingPoint || reduce() || canvas.classList.contains('is-revealed')) return;
    const point = pendingPoint;
    pendingPoint = null;
    revealAt(point.x, point.y, point.touch ? .8 : 1);
  }

  function moveLight(event) {
    if (reduce() || canvas.classList.contains('is-revealed')) return;
    if (event.pointerType !== 'mouse' && !pointerDown) return;
    const bounds = stage.getBoundingClientRect();
    const x = Math.min(bounds.width, Math.max(0, event.clientX - bounds.left));
    const y = Math.min(bounds.height, Math.max(0, event.clientY - bounds.top));
    stage.style.setProperty('--light-x', `${x / bounds.width * 100}%`);
    stage.style.setProperty('--light-y', `${y / bounds.height * 100}%`);
    pendingPoint = { x, y, touch: event.pointerType !== 'mouse' };
    if (!paintScheduled) {
      paintScheduled = true;
      requestAnimationFrame(paintPoint);
    }
  }

  stage.addEventListener('pointerdown', event => {
    if (reduce() || canvas.classList.contains('is-revealed')) return;
    pointerDown = true;
    if (event.pointerType !== 'mouse') {
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }
    moveLight(event);
  });
  stage.addEventListener('pointermove', moveLight, {passive: true});
  const releasePointer = () => { pointerDown = false; };
  stage.addEventListener('pointerup', releasePointer);
  stage.addEventListener('pointercancel', releasePointer);
  stage.addEventListener('pointerleave', releasePointer);

  revealButton.addEventListener('click', () => {
    canvas.classList.add('is-revealed');
    revealButton.disabled = true;
    hint.textContent = 'THE PORTRAIT / REVEALED';
    announce.textContent = 'The entire editorial portrait is now visible.';
  });
  resetButton.addEventListener('click', () => {
    reset();
    announce.textContent = 'The portrait is veiled again. Move or drag on the image to reveal it.';
  });

  function chooseLook(key, focus = false) {
    const look = looks[key];
    if (!look) return;
    active = key;
    buttons.forEach(button => {
      const selected = button.dataset.lightLook === key;
      button.setAttribute('aria-pressed', String(selected));
      if (selected && focus) button.focus();
    });
    const request = ++imageRequest;
    portrait.classList.add('light-room-changing');
    const next = new Image();
    next.onload = () => {
      if (imageRequest !== request) return;
      portrait.src = look.src;
      portrait.alt = look.alt;
      heading.innerHTML = look.title;
      tag.textContent = look.tag;
      portrait.classList.remove('light-room-changing');
      reset();
      announce.textContent = `Now showing ${buttons.find(b => b.dataset.lightLook === key)?.querySelector('strong')?.textContent || key}.`;
    };
    next.onerror = () => {
      portrait.classList.remove('light-room-changing');
      announce.textContent = 'This editorial image is temporarily unavailable.';
    };
    next.src = look.src;
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => chooseLook(button.dataset.lightLook));
    button.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const target = buttons[(index + step + buttons.length) % buttons.length];
      chooseLook(target.dataset.lightLook, true);
    });
  });

  function syncPreferences() {
    if (reduce()) {
      canvas.style.display = 'none';
      revealButton.hidden = true;
      resetButton.hidden = true;
      hint.textContent = 'PORTRAIT / FULLY VISIBLE';
    } else {
      canvas.style.display = '';
      revealButton.hidden = false;
      resetButton.hidden = false;
      reset();
    }
  }
  motionReduced.addEventListener?.('change', syncPreferences);
  let resizeFrame = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(redrawVeil);
  }, {passive: true});
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(redrawVeil);
    });
    resize.observe(stage);
  }
  syncPreferences();
  scheduleScrollLight();
})();
