// Canvas rendering path for browsers whose security policy disables WebGL.
// The bloom still has genuine depth rotation, touch/drag input and animation.
export function startCanvasBloom(canvas, mount) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) { mount.classList.add('is-fallback'); return; }

  let width = 1, height = 1, pixelRatio = 1;
  let tiltX = -.24, tiltY = -.22, dragging = false, lastX = 0, lastY = 0;
  let pointerX = 0, pointerY = 0, frame = 0, then = 0, isVisible = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rings = [
    { n: 11, len: 1.75, w: .78, origin: .42, z: -.35 },
    { n: 9, len: 1.25, w: .62, origin: .21, z: .17 },
    { n: 7, len: .82, w: .44, origin: .03, z: .63 }
  ];
  const palette = [
    ['#694c3e', '#e3b278', '#ffe2a7', '#94694a'],
    ['#553e32', '#c88e66', '#f8cc91', '#8f5347'],
    ['#86705a', '#c6af83', '#ffedc6', '#a47e5e'],
    ['#465848', '#ad9c76', '#e6cc9e', '#5f6c57']
  ];
  const pieces = [];
  rings.forEach((ring, tier) => {
    for (let i = 0; i < ring.n; i++) {
      pieces.push({ ...ring, tier, i, angle: i / ring.n * Math.PI * 2 + tier * .37, tone: palette[(i + tier) % palette.length] });
    }
  });

  function rotatePoint(x, y, z) {
    const cy = Math.cos(tiltY), sy = Math.sin(tiltY);
    const cx = Math.cos(tiltX), sx = Math.sin(tiltX);
    const x1 = x * cy + z * sy;
    const z1 = z * cy - x * sy;
    return { x: x1, y: y * cx - z1 * sx, z: y * sx + z1 * cx };
  }
  function project(x, y, z) {
    const p = rotatePoint(x, y, z);
    const factor = Math.min(width, height) * .80 / (4.6 - p.z * .25);
    return { x: width / 2 + p.x * factor, y: height / 2 - p.y * factor, depth: p.z };
  }
  function petalPoint(piece, u, side) {
    const fan = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .7);
    const radial = piece.origin + piece.len * u;
    const lateral = side * piece.w * fan;
    const a = piece.angle;
    const x = radial * Math.cos(a) - lateral * Math.sin(a);
    const y = radial * Math.sin(a) + lateral * Math.cos(a);
    const z = piece.z + .30 + .56 * Math.sin(Math.PI * u) - .5 * u * u + .2 * side * side * fan;
    return project(x, y, z);
  }
  function drawBloom(time) {
    context.clearRect(0, 0, width, height);
    const cX = width / 2, cY = height / 2;
    const maxSize = Math.min(width, height);

    // Fine elliptical latitude lines add a jewelry-like silhouette.
    context.save();
    context.translate(cX, cY);
    context.rotate(-.32 + .12 * Math.sin(tiltY));
    context.strokeStyle = 'rgba(221,185,126,.22)';
    context.lineWidth = 1;
    context.beginPath(); context.ellipse(0, 0, maxSize * .43, maxSize * .34, 0, 0, Math.PI * 2); context.stroke();
    context.strokeStyle = 'rgba(245,212,162,.15)';
    context.beginPath(); context.ellipse(0, 0, maxSize * .39, maxSize * .45, .5, 0, Math.PI * 2); context.stroke();
    context.restore();

    const depthSorted = pieces.map(piece => {
      const base = project(piece.origin * Math.cos(piece.angle), piece.origin * Math.sin(piece.angle), piece.z);
      return { piece, depth: base.depth };
    }).sort((a, b) => a.depth - b.depth);
    depthSorted.forEach(({ piece }) => {
      const left = [], right = [];
      for (let i = 0; i <= 22; i++) {
        const u = i / 22;
        left.push(petalPoint(piece, u, -1));
        right.push(petalPoint(piece, u, 1));
      }
      const base = left[0], tip = left[left.length - 1];
      const grad = context.createLinearGradient(base.x - 15, base.y + 20, tip.x + 32, tip.y - 35);
      piece.tone.forEach((color, i) => grad.addColorStop(i / 3, color));
      context.beginPath();
      context.moveTo(base.x, base.y);
      for (let i = 1; i < left.length; i++) context.lineTo(left[i].x, left[i].y);
      for (let i = right.length - 2; i >= 0; i--) context.lineTo(right[i].x, right[i].y);
      context.closePath();
      context.fillStyle = grad;
      context.shadowBlur = 15;
      context.shadowColor = '#1b100b66';
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(255,228,177,.33)';
      context.lineWidth = 1;
      context.stroke();
      // The reflected crease makes every petal catch the light differently.
      const mid1 = petalPoint(piece, .28, 0), mid2 = petalPoint(piece, .84, 0);
      context.beginPath();context.moveTo(mid1.x, mid1.y);context.quadraticCurveTo((mid1.x+mid2.x)/2+7,(mid1.y+mid2.y)/2-5,mid2.x,mid2.y);
      context.strokeStyle = 'rgba(255,231,187,.18)';context.stroke();
    });

    const center = project(0, 0, 1);
    const centerGradient = context.createRadialGradient(center.x - 9, center.y - 10, 3, center.x, center.y, maxSize * .07);
    centerGradient.addColorStop(0, '#fff4c8');centerGradient.addColorStop(.4, '#ddaa68');centerGradient.addColorStop(1, '#5f4638');
    context.beginPath();context.arc(center.x, center.y, maxSize * .05, 0, Math.PI * 2);
    context.fillStyle = centerGradient;context.fill();
    context.strokeStyle='rgba(255,239,202,.55)';context.stroke();

    // Slow drifting points, never fast enough to compete with the wording.
    for (let i = 0; i < 70; i++) {
      const a = i * 2.399963 + time * .000045;
      const r = maxSize * (.36 + (i * .6180339 % 1) * .18);
      const x = cX + Math.cos(a) * r;
      const y = cY + Math.sin(a) * r * .83;
      const alpha = .2 + .25 * Math.sin(time * .001 + i);
      context.fillStyle = `rgba(239,204,151,${alpha})`;
      context.fillRect(x, y, i % 6 === 0 ? 2.2 : 1.1, i % 6 === 0 ? 2.2 : 1.1);
    }
  }
  function tick(time) {
    frame = requestAnimationFrame(tick);
    if (document.hidden || !isVisible || time - then < 30) return;
    then = time;
    if (!reduced && !dragging) tiltY += .0022;
    tiltX += (pointerY * .12 - tiltX - .18) * .006;
    drawBloom(time);
  }
  function resize() {
    width = Math.max(1, mount.clientWidth);
    height = Math.max(1, mount.clientHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (reduced) drawBloom(0);
  }
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.classList.add('dragging');canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    pointerX = (e.clientX / Math.max(1, width)) - .5;
    pointerY = (e.clientY / Math.max(1, height)) - .5;
    if (dragging) { tiltY += (e.clientX-lastX)*.008; tiltX = Math.max(-.8,Math.min(.8,tiltX+(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY; }
  });
  canvas.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowLeft') tiltY -= .16;
    if (e.key === 'ArrowRight') tiltY += .16;
    if (e.key === 'ArrowUp') tiltX = Math.max(-.8,tiltX - .12);
    if (e.key === 'ArrowDown') tiltX = Math.min(.8,tiltX + .12);
    drawBloom(performance.now());
  });
  const stop=()=>{dragging=false;canvas.classList.remove('dragging')};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  const visibility = new IntersectionObserver(entries => {isVisible = entries[0]?.isIntersecting ?? false}, {rootMargin:'120px'});
  visibility.observe(mount);
  resize();
  requestAnimationFrame(tick);
  mount.classList.add('is-ready', 'is-2d');
  window.addEventListener('pagehide',()=>{observer.disconnect();visibility.disconnect();cancelAnimationFrame(frame)},{once:true});
}
