const artwork = new URL('./elor-bridal-painter.webp?v=photo-face', import.meta.url);
const imageSize = 384;
const wrist = { x: 192, y: 125 };
const loopDuration = 3700;
const playing = 'data-painter-playing';

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function smooth(from, to, value) {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

function wristAngle(progress) {
  const firstStroke = smooth(.07, .24, progress) - smooth(.29, .43, progress);
  const secondStroke = smooth(.38, .54, progress) - smooth(.60, .74, progress);
  return .12 * firstStroke - .088 * secondStroke;
}

function drawingSurface() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = imageSize;
  return canvas.getContext('2d');
}

function pixelAt(x, y) {
  return (y * imageSize + x) * 4;
}

function sample(source, x, y, channel) {
  const left = Math.floor(x);
  const top = Math.floor(y);
  const u = x - left;
  const v = y - top;
  const read = (dx, dy) => source[pixelAt(left + dx, top + dy) + channel];
  return (read(0, 0) * (1 - u) + read(1, 0) * u) * (1 - v)
    + (read(0, 1) * (1 - u) + read(1, 1) * u) * v;
}

// The source shaft crosses the easel's blank left margin. Recover the narrow
// strip beneath it along the rim's slope, then extend the exposed source shaft
// across that strip so it contains brush pixels only when the wrist pivots.
function separateShaft(source, stationary, moving, x, y) {
  const pixel = pixelAt(x, y);
  const fraction = (y - 98) / 8;
  const fade = Math.min(1, (238 - x) / 3, y - 98, 106 - y);
  for (let channel = 0; channel < 4; channel++) {
    const above = sample(source, x + .2 * (y - 98), 98, channel);
    const below = sample(source, x + .2 * (y - 106), 106, channel);
    const repaired = above * (1 - fraction) + below * fraction;
    stationary[pixel + channel] = source[pixel + channel] * (1 - fade) + repaired * fade;
  }

  const thickness = 1 - .62 * smooth(220, 238, x);
  const axis = 103 - .08 * (x - 216);
  const shaftRow = 103 + (y - axis) / thickness;
  if (shaftRow < 99 || shaftRow > 107) return;
  const amber = smooth(220, 227, x);
  const gold = [45, 31, 6];
  for (let channel = 0; channel < 3; channel++) {
    moving[pixel + channel] = sample(source, 216, shaftRow, channel) + amber * gold[channel];
  }
  moving[pixel + 3] = sample(source, 216, shaftRow, 3) * (1 - smooth(235, 238, x));
}

async function prepareArtwork() {
  const image = new Image();
  image.src = artwork;
  await image.decode();

  const plate = drawingSurface();
  const hand = drawingSurface();
  if (!plate || !hand) throw new Error('Painter textures unavailable');
  plate.drawImage(image, 0, 0, imageSize, imageSize);
  const background = plate.getImageData(0, 0, imageSize, imageSize);
  const original = background.data.slice();
  const foreground = hand.createImageData(imageSize, imageSize);

  for (let y = 90; y < 135; y++) {
    for (let x = 167; x < 238; x++) {
      if (x >= 217) {
        if (y >= 99 && y <= 106) separateShaft(original, background.data, foreground.data, x, y);
        continue;
      }
      if (x < 180 && (y < 99 || y > 111)) continue;
      if (x >= 214 && (y < 99 || y > 112)) continue;

      // The overlap is confined to the wrist joint. The forearm remains part
      // of the stationary plate while the hand and its brush move together.
      const joint = wrist.y + .28 * (x - wrist.x);
      const opacity = 1 - smooth(joint + 1, joint + 6, y);
      if (!opacity) continue;
      const pixel = pixelAt(x, y);
      foreground.data.set(original.subarray(pixel, pixel + 4), pixel);
      foreground.data[pixel + 3] *= opacity;
      if (y < joint - 1) background.data[pixel + 3] = 0;
    }
  }

  plate.putImageData(background, 0, 0);
  hand.putImageData(foreground, 0, 0);
  return { plate: plate.canvas, hand: hand.canvas };
}

function createPainter(THREE, textures, canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power',
  });
  renderer.setSize(imageSize, imageSize, false);
  renderer.setClearColor(0, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, imageSize, imageSize, 0, .1, 10);
  camera.position.z = 2;
  const geometry = new THREE.PlaneGeometry(imageSize, imageSize);
  const materials = [textures.plate, textures.hand].map(surface => {
    const map = new THREE.CanvasTexture(surface);
    map.colorSpace = THREE.SRGBColorSpace;
    map.generateMipmaps = false;
    map.minFilter = THREE.LinearFilter;
    return new THREE.MeshBasicMaterial({
      map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    });
  });
  const [plate, hand] = materials.map(material => new THREE.Mesh(geometry, material));
  const pivot = new THREE.Group();
  const center = imageSize / 2;
  plate.position.set(center, center, 0);
  pivot.position.set(wrist.x, imageSize - wrist.y, 0);
  hand.position.set(center - wrist.x, wrist.y - center, 0);
  hand.renderOrder = 1;
  pivot.add(hand);
  scene.add(plate, pivot);

  return {
    draw(progress) {
      pivot.rotation.z = wristAngle(progress);
      renderer.render(scene, camera);
    },
    dispose() {
      for (const material of materials) {
        material.map.dispose();
        material.dispose();
      }
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

function observePainter(element) {
  if (!element || !('IntersectionObserver' in window) || !('WebGL2RenderingContext' in window)) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const curtain = document.querySelector('.opening-veil')?.getAnimations?.()
    .find(animation => animation.animationName === 'veil-exit');
  let ready = !curtain;
  let visible = false;
  let unavailable = false;
  let assets;
  let session;

  function stop() {
    if (!session) return;
    const { painter, canvas, frame } = session;
    session = undefined;
    cancelAnimationFrame(frame);
    element.removeAttribute(playing);
    canvas.remove();
    painter?.dispose();
  }

  async function start() {
    const canvas = document.createElement('canvas');
    const current = { canvas, frame: 0, painter: undefined };
    session = current;

    try {
      assets ??= Promise.all([import('../vendor/three.module.js'), prepareArtwork()]);
      const [THREE, textures] = await assets;
      if (session !== current) return;

      const painter = createPainter(THREE, textures, canvas);
      current.painter = painter;
      painter.draw(0);
      element.append(canvas);
      element.setAttribute(playing, '');
      canvas.addEventListener('webglcontextlost', () => {
        if (session !== current) return;
        unavailable = true;
        stop();
      }, { once: true });

      const began = performance.now();
      function advance(now) {
        try {
          painter.draw(((now - began) % loopDuration) / loopDuration);
          current.frame = requestAnimationFrame(advance);
        } catch {
          unavailable = true;
          stop();
        }
      }
      current.frame = requestAnimationFrame(advance);
    } catch {
      if (session !== current) return;
      unavailable = true;
      stop();
    }
  }

  function sync() {
    if (!ready || !visible || document.hidden || reduced.matches || unavailable) stop();
    else if (!session) start();
  }

  const threshold = .55;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= threshold;
    sync();
  }, { threshold, rootMargin: '-68px 0px 0px' });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  observer.observe(element);
  if (curtain) curtain.finished.catch(() => {}).then(() => {
    ready = true;
    sync();
  });
}

observePainter(document.querySelector('.bridal-painter'));
