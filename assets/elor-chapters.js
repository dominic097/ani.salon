/* èlor V8 — three small, accessible interactions with no tracking or external data. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const bridalImage = document.getElementById('bridalWorldsImage');
  const bridalFrame = bridalImage?.closest('.bridal-worlds-image');
  if (bridalFrame) {
    const photo = document.createElement('div');
    photo.className = 'bridal-photo';
    const light = document.createElement('div');
    light.className = 'bridal-unbound-light';
    light.setAttribute('aria-hidden', 'true');
    const grass = document.createElement('div');
    grass.className = 'bridal-unbound-grass';
    grass.setAttribute('aria-hidden', 'true');
    bridalImage.before(photo, grass);
    photo.append(bridalImage, light);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        bridalFrame.classList.toggle('bridal-image-in-view', entry.isIntersecting);
      }, { threshold: .12 }).observe(bridalFrame);
    } else {
      bridalFrame.classList.add('bridal-image-in-view');
    }
  }
  const bridalButtons = [...document.querySelectorAll('[data-bridal-world]')];
  const bridalWorlds = {
    heirloom: {image:'assets/elor-bridal-atelier-v8.webp',alt:'Bride in rich Kanjivaram silk in a softly illuminated bridal atelier',word:'Heirloom',number:'01',title:'A beautiful inheritance.',copy:'Deep silk, luminous gold and a gaze that carries every generation forward.'},
    modern: {image:'assets/bridal-editorial.webp',alt:'Contemporary bridal portrait with sculptural styling',word:'Unbound',number:'02',title:'Tradition, rewritten.',copy:'For the bride who makes her own rules: an elegant tension between bold form and effortless presence.'},
    detail: {image:'assets/bridal-detail.webp',alt:'Close-up of intricate bridal jewelry and silk',word:'The detail',number:'03',title:'The smallest things stay.',copy:'The intimacy of a jewel, a fold of silk, the ritual of getting ready. Beauty remembered in fragments.'}
  };
  let bridalRequest = 0;
  function selectBridal(key, focus = false) {
    const item = bridalWorlds[key];
    if (!item || !bridalImage) return;
    bridalButtons.forEach(button => {
      const active = button.dataset.bridalWorld === key;
      button.setAttribute('aria-pressed', String(active));
      if (active && focus) button.focus();
    });
    const request = ++bridalRequest;
    bridalImage.classList.add('changing');
    const next = new Image();
    next.onload = () => {
      if (request !== bridalRequest) return;
      bridalImage.src = item.image;
      bridalImage.alt = item.alt;
      bridalImage.dataset.bridalLook = key;
      if (bridalFrame) bridalFrame.dataset.bridalLook = key;
      document.getElementById('bridalWorldsWord').textContent = item.word;
      document.getElementById('bridalWorldsCounter').textContent = item.number;
      document.getElementById('bridalWorldsTitle').textContent = item.title;
      document.getElementById('bridalWorldsCopy').textContent = item.copy;
      bridalImage.classList.remove('changing');
    };
    next.onerror = () => {
      if (request === bridalRequest) bridalImage.classList.remove('changing');
    };
    next.src = item.image;
    if (reduced.matches && next.complete && next.naturalWidth) next.onload();
  }
  bridalButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectBridal(button.dataset.bridalWorld));
    button.addEventListener('keydown', event => {
      if (!['ArrowRight','ArrowLeft'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const target = bridalButtons[(index + delta + bridalButtons.length) % bridalButtons.length];
      selectBridal(target.dataset.bridalWorld, true);
    });
  });

  const ritualBackdrop = document.getElementById('ritualBackdrop');
  const ritualCopy = document.getElementById('ritualCopy');
  const ritualDetail = document.getElementById('ritualDetail');
  const ritualButtons = [...document.querySelectorAll('[data-ritual]')];
  const ritualScenes = {
    breathe: {
      image: 'assets/headspa-concept.webp',
      alt: 'A quiet head-spa room with a reclining chair',
      copy: 'The world can wait. Enter a softer rhythm of water, touch and intentional time.',
      detail: 'A moment to arrive, settle into the chair and leave the pace of the day at the door.',
    },
    release: {
      image: 'assets/elor-headspa-ritual-v8.webp',
      alt: 'A calm head-spa water ritual in an intimate green-stone retreat',
      copy: 'A slow sequence, shaped by the feeling of water and the quiet choreography of care.',
      detail: 'Warm light, gentle hands and a little room to simply be.',
    },
    return: {
      image: 'assets/courtyard-concept.webp',
      alt: 'The studio’s shaded courtyard and greenery',
      copy: 'Carry that quiet with you. A small pause can shift the way the rest of the day feels.',
      detail: 'Time to return to your own rhythm, unhurried and completely yourself.',
    },
  };
  function selectRitual(key, focus = false) {
    const scene = ritualScenes[key];
    if (!scene || !ritualBackdrop || !ritualCopy || !ritualDetail) return;
    ritualBackdrop.src = scene.image;
    ritualBackdrop.alt = scene.alt;
    ritualCopy.textContent = scene.copy;
    ritualDetail.textContent = scene.detail;
    ritualButtons.forEach(button => {
      const selected = button.dataset.ritual === key;
      button.setAttribute('aria-pressed', String(selected));
      if (selected && focus) button.focus();
    });
  }
  ritualButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectRitual(button.dataset.ritual));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const target = ritualButtons[(index + delta + ritualButtons.length) % ritualButtons.length];
      selectRitual(target.dataset.ritual, true);
    });
  });

  const filters = [...document.querySelectorAll('[data-lookbook-filter]')];
  const galleryFigures = [...document.querySelectorAll('[data-lookbook-category]')];
  filters.forEach(filter => filter.addEventListener('click', () => {
    const name = filter.dataset.lookbookFilter;
    filters.forEach(button => button.setAttribute('aria-pressed',String(button === filter)));
    galleryFigures.forEach(figure => {
      figure.hidden = name !== 'all' && figure.dataset.lookbookCategory !== name;
    });
  }));

  const dialog = document.getElementById('lookbookDialog');
  const large = document.getElementById('lookbookLargeImage');
  const caption = document.getElementById('lookbookLargeCaption');
  const close = document.getElementById('lookbookClose');
  let lastOpener = null;
  galleryFigures.forEach(figure => {
    const opener = figure.querySelector('[data-lookbook-open]');
    opener?.addEventListener('click', () => {
      const img = opener.querySelector('img');
      const figcaption = figure.querySelector('figcaption');
      if (!dialog || !img || !large) return;
      large.src = img.currentSrc || img.src;
      large.alt = img.alt;
      caption.textContent = figcaption?.textContent || '';
      lastOpener = opener;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      close?.focus();
    });
  });
  close?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog?.addEventListener('close', () => lastOpener?.focus());

  const constellationImage = document.getElementById('constellationImage');
  const constellationButtons = [...document.querySelectorAll('[data-constellation]')];
  const directions = {
    form:{image:'assets/elor-beauty-editorial.webp',alt:'Modern beauty expression portrait',title:'The shape of you.',copy:'Hair, texture and silhouette as a language of self-expression. There is no one signature you have to wear.'},
    craft:{image:'assets/bridal-detail.webp',alt:'Fine bridal ornament and hand-crafted detail',title:'The eye for detail.',copy:'Beauty can live in the smallest gesture. In the line of an eye, the turn of a braid, the light on a jewel.'},
    ritual:{image:'assets/elor-headspa-ritual-v8.webp',alt:'Water and gentle touch in a scalp spa ritual',title:'The luxury of pause.',copy:'A softer pace creates space for a different kind of expression—unhurried, grounded, inwardly luminous.'}
  };
  let constellationRequest = 0;
  function selectDirection(key, focus = false) {
    const direction = directions[key];
    if (!direction || !constellationImage) return;
    constellationButtons.forEach(button => {
      const selected = button.dataset.constellation === key;
      button.setAttribute('aria-pressed', String(selected));
      if (selected && focus) button.focus();
    });
    const request = ++constellationRequest;
    constellationImage.classList.add('changing');
    const next = new Image();
    next.onload = () => {
      if (request !== constellationRequest) return;
      constellationImage.src = direction.image;
      constellationImage.alt = direction.alt;
      document.getElementById('constellationCopyTitle').textContent = direction.title;
      document.getElementById('constellationCopyBody').textContent = direction.copy;
      constellationImage.classList.remove('changing');
    };
    next.onerror = () => constellationImage.classList.remove('changing');
    next.src = direction.image;
  }
  constellationButtons.forEach((button,index) => {
    button.addEventListener('click', () => selectDirection(button.dataset.constellation));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const target = constellationButtons[(index + delta + constellationButtons.length) % constellationButtons.length];
      selectDirection(target.dataset.constellation, true);
    });
  });
})();
