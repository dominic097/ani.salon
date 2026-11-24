import * as THREE from '../vendor/three.module.js';
import { startCanvasBloom } from './elor-canvas-fallback.js';

// An original generative bronze bloom. Geometry, motion and lighting are created
// here instead of embedding a video or depending on an external 3D service.
const mount = document.getElementById('sculptureMount');
const canvas = document.getElementById('ritualCanvas');

if (mount && canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.65;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    camera.position.set(0, 0, 7.8);

    scene.add(new THREE.AmbientLight(0xffdfb7, 1.65));
    const key = new THREE.DirectionalLight(0xffead0, 4.4);
    key.position.set(3.5, 4, 6);
    scene.add(key);
    const peach = new THREE.PointLight(0xf0a976, 58, 18);
    peach.position.set(-3, -2, 3);
    scene.add(peach);
    const green = new THREE.PointLight(0x95c9ae, 46, 19);
    green.position.set(3, -1, -2);
    scene.add(green);

    const bloom = new THREE.Group();
    scene.add(bloom);

    const materials = [
      new THREE.MeshPhysicalMaterial({ color: 0xd0a46d, metalness: .65, roughness: .3, clearcoat: .72, clearcoatRoughness: .24, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ color: 0xb77e65, metalness: .56, roughness: .34, clearcoat: .8, clearcoatRoughness: .18, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ color: 0xead1a4, metalness: .51, roughness: .26, clearcoat: .75, clearcoatRoughness: .2, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ color: 0x9b9674, metalness: .62, roughness: .32, clearcoat: .68, side: THREE.DoubleSide })
    ];

    function makePetal(length, width, curl, bend) {
      const segments = 35, across = 17;
      const vertices = [], indices = [], uv = [];
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const fan = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .72);
        for (let j = 0; j <= across; j++) {
          const v = (j / across) * 2 - 1;
          const outward = .1 + u * length;
          const lateral = v * width * fan + .065 * Math.sin(4 * u + bend) * fan;
          const lift = .3 + .45 * Math.sin(Math.PI * u) - curl * u * u + .20 * v * v * fan + .055 * Math.sin(9 * u + 4 * v + bend) * fan;
          vertices.push(outward, lateral, lift);
          uv.push(u, (v + 1) * .5);
        }
      }
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < across; j++) {
          const a = i * (across + 1) + j;
          indices.push(a, a + across + 1, a + 1, a + 1, a + across + 1, a + across + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }

    const rings = [
      { count: 11, length: 1.82, width: .82, origin: .43, z: -.52 },
      { count: 9, length: 1.28, width: .64, origin: .18, z: -.05 },
      { count: 7, length: .83, width: .42, origin: .02, z: .43 }
    ];
    rings.forEach((ring, tier) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + tier * .36;
        const shape = makePetal(ring.length * (.95 + .1 * Math.sin(i * 4.6)), ring.width, .53 - tier * .14, i * 1.61);
        const mesh = new THREE.Mesh(shape, materials[(i + tier) % materials.length]);
        mesh.rotation.z = angle;
        mesh.rotation.y = .17 * Math.sin(i * 2.3 + tier);
        mesh.position.set(Math.cos(angle) * ring.origin, Math.sin(angle) * ring.origin, ring.z + .07 * Math.cos(i * 3.2));
        bloom.add(mesh);

        if (tier === 0 && i % 2 === 0) {
          const edge = [];
          for (let step = 1; step <= 38; step++) {
            const u = step / 39;
            const fan = Math.pow(Math.sin(Math.PI * u), .72);
            const v = 1;
            edge.push(new THREE.Vector3(.1 + u * ring.length, v * ring.width * fan, .3 + .45 * Math.sin(Math.PI * u) - .53 * u * u + .2 * fan));
          }
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), new THREE.LineBasicMaterial({ color: 0xe5c796, transparent: true, opacity: .35 }));
          line.rotation.copy(mesh.rotation);
          line.position.copy(mesh.position);
          bloom.add(line);
        }
      }
    });

    const center = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.28, 2),
      new THREE.MeshPhysicalMaterial({ color: 0xffe5ad, metalness: .84, roughness: .22, clearcoat: .85 })
    );
    center.position.z = .75;
    bloom.add(center);

    const halo = new THREE.Group();
    bloom.add(halo);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xc8ab7d, transparent: true, opacity: .35 });
    const torusA = new THREE.Mesh(new THREE.TorusGeometry(2.83, .009, 5, 180), haloMat);
    torusA.rotation.set(.49, .23, .12);
    halo.add(torusA);
    const torusB = new THREE.Mesh(new THREE.TorusGeometry(3.02, .006, 5, 180), new THREE.MeshBasicMaterial({ color: 0xebd9ae, transparent: true, opacity: .15 }));
    torusB.rotation.set(-.34, .34, 1.22);
    halo.add(torusB);

    // Fine dust gives the object a sense of scale without obscuring the content.
    const pointPositions = [];
    for (let i = 0; i < 155; i++) {
      const angle = i * 2.39996323;
      const radius = 2.65 + Math.sqrt((i * .6180339) % 1) * 1.0;
      pointPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, (i * .19) % 2 - 1);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xeacb9b, size: .026, sizeAttenuation: true, transparent: true, opacity: .7 }));
    scene.add(particles);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dragging = false, lastX = 0, lastY = 0, targetY = -.32, targetX = -.14;
    let pointerTargetY = 0, pointerTargetX = 0;
    let isVisible = false;
    const visibility = new IntersectionObserver(entries => { isVisible = entries[0]?.isIntersecting ?? false; }, { rootMargin: '120px' });
    visibility.observe(mount);
    canvas.addEventListener('pointerdown', event => {
      dragging = true; lastX = event.clientX; lastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', event => {
      const bounds = canvas.getBoundingClientRect();
      pointerTargetY = (event.clientX - bounds.left) / bounds.width - .5;
      pointerTargetX = (event.clientY - bounds.top) / bounds.height - .5;
      if (!dragging) return;
      targetY += (event.clientX - lastX) * .007;
      targetX = Math.max(-.75, Math.min(.75, targetX + (event.clientY - lastY) * .005));
      lastX = event.clientX; lastY = event.clientY;
    });
    canvas.addEventListener('keydown', event => {
      const steps = {ArrowLeft: -.15, ArrowRight: .15, ArrowUp: -.12, ArrowDown: .12};
      if (!(event.key in steps)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') targetY += steps[event.key];
      else targetX = Math.max(-.75, Math.min(.75, targetX + steps[event.key]));
    });
    function stopDragging() { dragging = false; canvas.classList.remove('dragging'); }
    canvas.addEventListener('pointerup', stopDragging);
    canvas.addEventListener('pointercancel', stopDragging);

    function resize() {
      const width = Math.max(1, mount.clientWidth), height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 460 ? 9.7 : width < 620 ? 8.9 : 7.85;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();
    let last = performance.now();
    let frame = 0;
    function render(time) {
      frame = requestAnimationFrame(render);
      if (document.hidden || !isVisible) { last = time; return; }
      const delta = Math.min(60, time - last); last = time;
      if (!motion && !dragging) targetY += delta * .00014;
      bloom.rotation.y += (targetY + pointerTargetY * .16 - bloom.rotation.y) * .035;
      bloom.rotation.x += (targetX + pointerTargetX * .08 - bloom.rotation.x) * .04;
      bloom.rotation.z = Math.sin(time * .00024) * .06;
      halo.rotation.z = motion ? 0 : time * .000036;
      particles.rotation.z = motion ? 0 : -time * .000025;
      center.rotation.y = motion ? 0 : time * .0003;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
    mount.classList.add('is-ready');
    window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); ro.disconnect(); visibility.disconnect(); renderer.dispose(); }, { once: true });
  } catch (error) {
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.id = 'ritualCanvasFallback';
    fallbackCanvas.setAttribute('aria-label', 'Interactive sculptural bronze bloom; drag or use arrow keys to rotate');
    fallbackCanvas.setAttribute('role', 'img');
    fallbackCanvas.tabIndex = 0;
    canvas.replaceWith(fallbackCanvas);
    startCanvasBloom(fallbackCanvas, mount);
    console.info('Using the accessible canvas sculpture on this device.', error?.message);
  }
}
