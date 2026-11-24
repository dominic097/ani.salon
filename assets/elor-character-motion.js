const vertexShader = `
  varying vec2 imageUV;
  void main() {
    imageUV = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D illustration;
  uniform vec2 imageSize;
  uniform vec2 textureSize;
  uniform vec2 sourceOrigin;
  uniform vec4 region;
  uniform vec4 region2;
  uniform vec2 offset;
  uniform vec2 offset2;
  varying vec2 imageUV;

  float influence(vec2 point, vec4 area) {
    vec2 delta = (point - area.xy) / area.zw;
    float weight = max(0.0, 1.0 - dot(delta, delta));
    return weight * weight;
  }

  void main() {
    vec2 point = vec2(imageUV.x, 1.0 - imageUV.y) * imageSize;
    vec2 source = point + offset * influence(point, region)
      + offset2 * influence(point, region2);
    vec2 uv = (source + sourceOrigin) / textureSize;
    gl_FragColor = texture2D(illustration, vec2(uv.x, 1.0 - uv.y));
    #include <colorspace_fragment>
  }
`;

/**
 * Articulate a small region of a single alpha illustration in Three.js.
 * Anchored pixels outside the motion regions are sampled without displacement.
 */
export async function playCharacterMotion({
  canvas,
  image,
  duration,
  sourceArea = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
  region,
  shift,
  region2 = region,
  shift2 = () => [0, 0],
  repeat = false,
  signal,
  active,
  ready,
}) {
  if (!('WebGL2RenderingContext' in window) || signal?.aborted || !active()) return false;

  let renderer;
  let texture;
  let geometry;
  let material;
  try {
    const THREE = await import('../vendor/three.module.js');
    if (signal?.aborted || !active()) return false;

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });
    renderer.setSize(sourceArea.width, sourceArea.height, false);
    renderer.setClearColor(0, 0);

    texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    const bounds = ({ x, y, radiusX, radiusY }) => new THREE.Vector4(x, y, radiusX, radiusY);
    const displacement = new THREE.Vector2();
    const displacement2 = new THREE.Vector2();
    material = new THREE.ShaderMaterial({
      uniforms: {
        illustration: { value: texture },
        imageSize: { value: new THREE.Vector2(sourceArea.width, sourceArea.height) },
        textureSize: { value: new THREE.Vector2(image.naturalWidth, image.naturalHeight) },
        sourceOrigin: { value: new THREE.Vector2(sourceArea.x, sourceArea.y) },
        region: { value: bounds(region) },
        region2: { value: bounds(region2) },
        offset: { value: displacement },
        offset2: { value: displacement2 },
      },
      vertexShader,
      fragmentShader,
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
    });
    geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    const surface = new THREE.Mesh(geometry, material);
    surface.frustumCulled = false;
    scene.add(surface);
    const camera = new THREE.Camera();

    renderer.render(scene, camera);
    ready();
    await new Promise((resolve, reject) => {
      let start;
      let frame = 0;
      function finish(error) {
        cancelAnimationFrame(frame);
        signal?.removeEventListener('abort', stop);
        canvas.removeEventListener('webglcontextlost', lose);
        if (error) reject(error);
        else resolve();
      }
      function stop() { finish(); }
      function lose() { finish(new Error('Character WebGL context lost')); }
      function advance(now) {
        start ??= now;
        const elapsed = (now - start) / duration;
        if ((!repeat && elapsed >= 1) || signal?.aborted || !active()) {
          finish();
          return;
        }
        try {
          const progress = repeat ? elapsed % 1 : elapsed;
          displacement.set(...shift(progress));
          displacement2.set(...shift2(progress));
          renderer.render(scene, camera);
          frame = requestAnimationFrame(advance);
        } catch (error) {
          finish(error);
        }
      }
      signal?.addEventListener('abort', stop, { once: true });
      canvas.addEventListener('webglcontextlost', lose, { once: true });
      if (signal?.aborted) stop();
      else frame = requestAnimationFrame(advance);
    });
    return true;
  } catch {
    return false;
  } finally {
    texture?.dispose();
    material?.dispose();
    geometry?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
}

/** Run one repeat session at a time, and leave the caller's still visible on failure. */
export function loopCharacterMotionInView(element, {
  imageUrl, attribute, threshold = .5, enabled = () => true, ...motion
}) {
  if (!element || !('IntersectionObserver' in window)) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const curtain = document.querySelector('.opening-veil')?.getAnimations?.()
    .find(animation => animation.animationName === 'veil-exit');
  let ready = !curtain;
  let visible = false;
  let unavailable = false;
  let imageReady;
  let session;

  function canPlay() {
    return !unavailable && ready && visible && enabled() && !document.hidden && !reduced.matches;
  }

  async function loadArtwork() {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    return image;
  }

  async function start() {
    const controller = new AbortController();
    session = controller;
    const { signal } = controller;
    const canvas = document.createElement('canvas');
    const active = () => !signal.aborted && canPlay();

    try {
      imageReady ??= loadArtwork();
      const image = await imageReady;
      if (!active()) return;

      const rendered = await playCharacterMotion({
        ...motion,
        canvas,
        image,
        repeat: true,
        signal,
        active,
        ready() {
          if (!active()) return;
          element.append(canvas);
          element.setAttribute(attribute, '');
        },
      });
      if (!rendered && !signal.aborted) unavailable = true;
    } catch {
      unavailable = true;
    } finally {
      canvas.remove();
      element.removeAttribute(attribute);
      session = undefined;
      sync();
    }
  }

  function sync() {
    if (!canPlay()) {
      session?.abort();
    } else if (!session) {
      start();
    }
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= threshold;
    sync();
  }, { threshold, rootMargin: '-68px 0px 0px' });

  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  observer.observe(element);

  if (curtain) {
    curtain.finished.catch(() => {}).then(() => {
      ready = true;
      sync();
    });
  }
  return sync;
}
