/* The Living Edit: visitor-directed editorial storytelling for the private èlor concept. */
(() => {
  'use strict';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const progress = document.getElementById('readingProgress');
  let progressScheduled = false;
  const paintProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 0}%`;
    progressScheduled = false;
  };
  addEventListener('scroll', () => {
    if (!progressScheduled) { progressScheduled = true; requestAnimationFrame(paintProgress); }
  }, { passive: true });
  addEventListener('resize', paintProgress);
  const destination = document.querySelector('[data-destination-explorer]');
  if (destination && typeof ResizeObserver === 'function') {
    new ResizeObserver(paintProgress).observe(destination);
  }
  paintProgress();

  // The audience can direct the opening film's mood, but the original film is the default.
  const heroScene = document.getElementById('heroDirectedScene');
  const heroSceneImage = document.getElementById('heroSceneImage');
  const sceneNote = document.getElementById('heroSceneNote');
  const film = document.getElementById('heroFilm');
  const hero = document.getElementById('top');
  const openings = {
    film: { image: '', note: 'A film about the art of becoming' },
    heritage: { image: 'assets/bridal-portrait.webp', note: 'The heirloom / rooted in feeling' },
    future: { image: 'assets/elor-beauty-editorial.webp', note: 'The new icon / entirely your own' },
  };
  const sceneButtons = [...document.querySelectorAll('[data-opening]')];
  sceneButtons.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.opening;
    const entry = openings[key];
    if (!entry) return;
    sceneButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    hero.dataset.heroOpening = key;
    sceneNote.textContent = entry.note;
    if (key === 'film') {
      heroScene.classList.remove('active');
    } else {
      heroSceneImage.src = entry.image;
      heroScene.classList.add('active');
      film.pause();
    }
  }));

  // A local, playful way to arrive with a feeling instead of a booking form.
  const roots = {
    heritage: {
      image: 'assets/bridal-portrait.webp', subject: 'The Heirloom',
      idea: 'Rooted in the beauty of what came before', path: '#unveiling', pathLabel: 'Discover the bridal atelier',
    },
    between: {
      image: 'assets/bridal-editorial.webp', subject: 'The Beautiful Between',
      idea: 'Where old-world craft meets a new point of view', path: '#worlds', pathLabel: 'Explore the beauty worlds',
    },
    future: {
      image: 'assets/elor-beauty-editorial.webp', subject: 'The New Icon',
      idea: 'Unmistakably modern, unmistakably yours', path: '#worlds', pathLabel: 'Explore the beauty worlds',
    },
  };
  const lights = {
    amber: { phrase: 'in gold', atmosphere: 'warm, sculptural light' },
    dawn: { phrase: 'at first light', atmosphere: 'the softness of a new beginning' },
    noir: { phrase: 'after dark', atmosphere: 'a little mystery and shadow' },
  };
  const energies = {
    still: { phrase: 'with quiet confidence', label: 'Softly powerful' },
    magnetic: { phrase: 'with magnetic presence', label: 'Impossible to ignore' },
    unbound: { phrase: 'without permission', label: 'Beautifully unbound' },
  };
  const state = { root: 'heritage', light: 'amber', energy: 'still' };
  const buttons = [...document.querySelectorAll('[data-edit-axis]')];
  const stage = document.getElementById('editStage');
  const image = document.getElementById('editPortrait');
  const heading = document.getElementById('editResultTitle');
  const body = document.getElementById('editResultCopy');
  const caption = document.getElementById('editPortraitCaption');
  const action = document.getElementById('editDirect');
  const announcement = document.getElementById('editAnnouncement');
  let imageRequest = 0;

  function renderEdit() {
    const root = roots[state.root], light = lights[state.light], energy = energies[state.energy];
    const title = `${root.subject} ${light.phrase}`;
    const description = `${root.idea}, imagined through ${light.atmosphere}, ${energy.phrase}.`;
    heading.textContent = title;
    body.textContent = description;
    caption.textContent = energy.label;
    stage.dataset.light = state.light;
    stage.dataset.energy = state.energy;
    action.href = root.path;
    action.textContent = root.pathLabel;
    announcement.textContent = `Your edit: ${title}. ${description}`;
    if (!image.src.endsWith('/' + root.image)) {
      const request = ++imageRequest;
      const next = new Image();
      next.onload = () => {
        if (request !== imageRequest) return;
        if (reduceMotion.matches) { image.src = root.image; image.alt = `${root.subject} editorial mood portrait`; return; }
        image.style.opacity = '0';
        setTimeout(() => {
          if (request !== imageRequest) return;
          image.src = root.image;
          image.alt = `${root.subject} editorial mood portrait`;
          image.style.opacity = '1';
        }, 210);
      };
      next.src = root.image;
    }
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const axis = button.dataset.editAxis;
    const value = button.dataset.editValue;
    if (!(axis in state) || !({ root: roots, light: lights, energy: energies }[axis]?.[value])) return;
    state[axis] = value;
    buttons.filter(b => b.dataset.editAxis === axis)
      .forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    renderEdit();
  }));
  renderEdit();

  // Light follows the reader only on pointer devices; reduced motion stays stable.
  if (matchMedia('(pointer:fine)').matches && !reduceMotion.matches) {
    stage.addEventListener('pointermove', e => {
      const bounds = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height));
      stage.style.setProperty('--edit-tilt-x', `${(x - .5) * -17}px`);
      stage.style.setProperty('--edit-tilt-y', `${(y - .5) * -17}px`);
      stage.style.setProperty('--light-x', `${x * 100}%`);
      stage.style.setProperty('--light-y', `${y * 100}%`);
    }, { passive: true });
    stage.addEventListener('pointerleave', () => {
      stage.style.setProperty('--edit-tilt-x', '0px');
      stage.style.setProperty('--edit-tilt-y', '0px');
      stage.style.setProperty('--light-x', '60%');
      stage.style.setProperty('--light-y', '38%');
    });
  }
})();
