const soundToggle = document.querySelector('#siteSoundToggle');
const welcomeSound = document.querySelector('#welcomeSound');

if (soundToggle && welcomeSound) {
  const preferenceKey = 'elor-site-sounds-muted';
  const actionSound = new Audio(new URL('./elor-brush-stroke.mp3', import.meta.url));
  const actionSelector = 'button, a[href], summary, [role="button"], input:is([type="button"], [type="submit"], [type="reset"], [type="image"])';
  let muted = false;
  let welcomeState = 'pending';
  let presented = false;
  let pointerStart;
  let suppressPointerSoundUntil = 0;
  let lastAction = -Infinity;

  actionSound.preload = 'none';
  actionSound.volume = 0.6;
  try {
    muted = localStorage.getItem(preferenceKey) === '1';
  } catch {
    // The control still works when storage access is unavailable.
  }

  function renderControl() {
    soundToggle.hidden = !presented;
    if (welcomeState === 'blocked' && !muted) {
      soundToggle.removeAttribute('aria-pressed');
      soundToggle.removeAttribute('title');
      soundToggle.textContent = 'Play welcome sound';
    } else {
      soundToggle.setAttribute('aria-pressed', String(muted));
      soundToggle.textContent = 'Mute site sounds';
      soundToggle.title = muted ? 'Unmute site sounds' : 'Mute site sounds';
    }
  }

  async function playWelcome(requested = false) {
    const expectedState = requested ? 'blocked' : 'pending';
    if (!presented || document.hidden || muted || welcomeState !== expectedState) return;
    welcomeState = 'starting';
    renderControl();

    try {
      await welcomeSound.play();
      welcomeState = 'played';
    } catch (error) {
      welcomeState = !muted && error.name === 'NotAllowedError' ? 'blocked' : 'finished';
    }
    renderControl();
  }

  soundToggle.addEventListener('click', () => {
    if (welcomeState === 'blocked' && !muted) {
      playWelcome(true);
      return;
    }

    muted = !muted;
    if (muted) {
      welcomeSound.pause();
      actionSound.pause();
      if (welcomeState === 'pending') welcomeState = 'finished';
    }
    try {
      localStorage.setItem(preferenceKey, muted ? '1' : '0');
    } catch {
      // The current page does not require persistent storage.
    }
    renderControl();
  });

  function findControl(target) {
    const control = target instanceof Element ? target.closest(actionSelector) : null;
    if (!control || control === soundToggle || control.matches(':disabled') ||
        control.closest('[inert], [aria-disabled="true"]')) return null;
    return control;
  }

  function playAction() {
    const now = performance.now();
    if (muted || !presented || document.hidden || now - lastAction < 120) return;
    lastAction = now;
    actionSound.currentTime = 0;
    actionSound.play().catch(() => {});
  }

  document.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.button === 0) {
      suppressPointerSoundUntil = 0;
      pointerStart = findControl(event.target)
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : undefined;
    }
  }, { capture: true, passive: true });

  function pointerTravelled(event) {
    return Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 10;
  }

  document.addEventListener('pointermove', event => {
    if (pointerStart?.id === event.pointerId && !pointerStart.dragged) {
      pointerStart.dragged = pointerTravelled(event);
    }
  }, { capture: true, passive: true });

  function finishPointer(event) {
    if (pointerStart?.id !== event.pointerId) return;
    if (event.type === 'pointercancel' || pointerStart.dragged || pointerTravelled(event)) {
      suppressPointerSoundUntil = performance.now() + 350;
    }
    pointerStart = undefined;
  }

  document.addEventListener('pointerup', finishPointer, { capture: true, passive: true });
  document.addEventListener('pointercancel', finishPointer, { capture: true, passive: true });
  document.addEventListener('click', event => {
    if (!event.isTrusted || (event.detail > 0 && performance.now() < suppressPointerSoundUntil)) return;
    if (findControl(event.target)) playAction();
  }, { capture: true, passive: true });

  document.addEventListener('keydown', event => {
    if (!event.isTrusted || event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    const control = findControl(event.target);
    if (control?.matches('[role="button"]:not(button, a[href], summary, input)')) playAction();
  }, { capture: true });

  async function presentAfterOpening() {
    const curtain = document.querySelector('.opening-veil')?.getAnimations?.()
      .find(animation => animation.animationName === 'veil-exit');
    if (curtain) await curtain.finished.catch(() => {});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      presented = true;
      if (muted) welcomeState = 'finished';
      else actionSound.preload = 'auto';
      renderControl();
      playWelcome();
    }));
  }

  presentAfterOpening();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) playWelcome();
  });
}
