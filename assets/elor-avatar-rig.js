import * as THREE from '../vendor/three.module.js';

const atlasSize = 768;
const cellWidth = 384;
const figureSize = 394;

// Joint locations refer to the two original seated portraits, in atlas pixels.
const portraits = {
  owner: {
    cell: 0,
    hip: [205, 269],
    neck: [206, 126],
    legSplit: 208,
    arms: [
      { joints: [[141, 165], [128, 226], [105, 271]], inner: [153, 137] },
      { joints: [[252, 153], [274, 224], [295, 269]], inner: [260, 286] },
    ],
    legs: [
      [[180, 261], [183, 296], [196, 355]],
      [[229, 263], [232, 295], [234, 354]],
    ],
  },
  daughter: {
    cell: 1,
    hip: [168, 270],
    neck: [166, 144],
    legSplit: 174,
    arms: [
      { joints: [[124, 171], [109, 226], [94, 271]], inner: [122, 113] },
      { joints: [[206, 173], [221, 227], [239, 271]], inner: [206, 220] },
    ],
    legs: [
      [[139, 263], [146, 296], [154, 348]],
      [[192, 264], [193, 294], [194, 347]],
    ],
  },
};

const { clamp, lerp, smoothstep } = THREE.MathUtils;

function sampleBottom(cell, x) {
  if (cell === 1) return figureSize;
  // The owner's shoe tips extend below the half-cell. The next portrait's
  // hair starts to the left of them at the same height.
  if (x < 180 || x > 262) return 383;
  if (x < 184) return lerp(383, 388, (x - 180) / 4);
  if (x < 190) return lerp(388, 394, (x - 184) / 6);
  if (x <= 255) return figureSize;
  return lerp(394, 383, (x - 255) / 7);
}

function makeJoints(portrait) {
  const bones = [];
  function joint(name, point, parent) {
    const bone = new THREE.Bone();
    bone.name = name;
    if (parent) {
      bone.position.set((point[0] - parent.point[0]) / figureSize, (parent.point[1] - point[1]) / figureSize, 0);
      parent.bone.add(bone);
    } else {
      bone.position.set((point[0] - cellWidth / 2) / figureSize, .5 - point[1] / figureSize, 0);
    }
    return { bone, point, index: bones.push(bone) - 1 };
  }

  function limb(name, points, parent, labels) {
    let previous = parent;
    return points.map((point, index) => {
      previous = joint(`${name}-${labels[index]}`, point, previous);
      return previous;
    });
  }

  const seat = joint('seat', portrait.hip);
  const torso = joint('torso', portrait.hip, seat);
  const head = joint('head', portrait.neck, torso);
  const arms = portrait.arms.map(({ joints }, index) =>
    limb(index ? 'right-arm' : 'left-arm', joints, torso, ['shoulder', 'elbow', 'wrist']));
  const legs = portrait.legs.map((joints, index) =>
    limb(index ? 'right-leg' : 'left-leg', joints, seat, ['hip', 'knee', 'ankle']));
  return { seat, torso, head, arms, legs, bones };
}

function skinAt(x, y, portrait, rig) {
  const influences = [];
  function add(joint, weight) {
    if (weight > .0001) influences.push({ index: joint.index, weight });
  }

  let armWeight = 0;
  for (const [index, { joints, inner }] of portrait.arms.entries()) {
    const side = index ? 1 : -1;
    const [shoulder, elbow, wrist] = joints;
    const boundary = lerp(inner[0], inner[1], clamp((y - shoulder[1]) / (wrist[1] - shoulder[1]), 0, 1));
    const amount = smoothstep(side * (x - boundary), -8, 15) *
      smoothstep(y, shoulder[1] - 9, shoulder[1] + 26) *
      (1 - smoothstep(y, wrist[1] + 12, wrist[1] + 27));
    if (!amount) continue;

    armWeight += amount;
    const bend = smoothstep(y, elbow[1] - 18, elbow[1] + 18);
    const palm = Math.max(
      smoothstep(y, wrist[1] - 12, wrist[1] + 9),
      smoothstep(side * (x - wrist[0]), -3, 16) * smoothstep(y, wrist[1] - 16, wrist[1] - 4),
    );
    const [upper, forearm, hand] = rig.arms[index];
    add(upper, amount * (1 - bend) * (1 - palm));
    add(forearm, amount * bend * (1 - palm));
    add(hand, amount * palm);
  }

  const remaining = Math.max(0, 1 - armWeight);
  const legWeight = remaining * smoothstep(y, portrait.hip[1] - 12, portrait.hip[1] + 36);
  const rightLeg = smoothstep(x, portrait.legSplit - 11, portrait.legSplit + 11);
  for (const [index, [, knee, ankle]] of portrait.legs.entries()) {
    const amount = legWeight * (index ? rightLeg : 1 - rightLeg);
    const bend = smoothstep(y, knee[1] - 15, knee[1] + 17);
    const toe = smoothstep(y, ankle[1] - 10, ankle[1] + 15);
    const [thigh, shin, foot] = rig.legs[index];
    add(thigh, amount * (1 - bend) * (1 - toe));
    add(shin, amount * bend * (1 - toe));
    add(foot, amount * toe);
  }

  const headWeight = 1 - smoothstep(y, portrait.neck[1] - 1, portrait.neck[1] + 27);
  const upperBody = remaining - legWeight;
  add(rig.head, upperBody * headWeight);
  add(rig.torso, upperBody * (1 - headWeight));

  const strongest = influences.sort((a, b) => b.weight - a.weight).slice(0, 4);
  const weightTotal = strongest.reduce((sum, entry) => sum + entry.weight, 0);
  const indices = [0, 0, 0, 0];
  const weights = [0, 0, 0, 0];
  strongest.forEach(({ index, weight }, slot) => {
    indices[slot] = index;
    weights[slot] = weight / weightTotal;
  });
  return { indices, weights };
}

function makeSurface(portrait, rig) {
  const columns = [...new Set([...Array.from({ length: 49 }, (_, index) => index * 8), 180, 184, 190, 255, 262])].sort((a, b) => a - b);
  const rows = 53;
  const positions = [];
  const uv = [];
  const skinIndices = [];
  const skinWeights = [];
  const triangles = [];

  for (let row = 0; row <= rows; row++) {
    for (const x of columns) {
      const y = row * sampleBottom(portrait.cell, x) / rows;
      positions.push((x - cellWidth / 2) / figureSize, .5 - y / figureSize, 0);
      uv.push((portrait.cell * cellWidth + clamp(x, .5, cellWidth - .5)) / atlasSize, 1 - (y + .5) / atlasSize);
      const { indices, weights } = skinAt(x, y, portrait, rig);
      skinIndices.push(...indices);
      skinWeights.push(...weights);
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns.length - 1; col++) {
      const a = row * columns.length + col;
      const b = a + columns.length;
      triangles.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(triangles);
  return geometry;
}

/** Create a seated textured rig. The caller owns and shares the atlas texture. */
export function createAtelierRig(texture, person) {
  const daughter = person === 'daughter';
  const portrait = daughter ? portraits.daughter : portraits.owner;
  const joints = makeJoints(portrait);
  const geometry = makeSurface(portrait, joints);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: .055, depthWrite: false, toneMapped: false,
  });
  const node = new THREE.SkinnedMesh(geometry, material);
  node.name = daughter ? 'Atelier daughter' : 'Atelier owner';
  node.frustumCulled = false;
  node.add(joints.seat.bone);
  const skeleton = new THREE.Skeleton(joints.bones);
  node.bind(skeleton);
  function swingLegs(swings) {
    // The seated silhouette above the knees stays in its authored pose.
    for (const [index, [, shin, foot]] of joints.legs.entries()) {
      const side = index ? 1 : -1;
      const swing = swings[index];
      shin.bone.rotation.set(-.82 * swing, 0, side * .29 * swing);
      foot.bone.rotation.set(.21 * swing, 0, side * .11 * swing);
    }
  }

  function dispose() {
    skeleton.dispose();
    geometry.dispose();
    material.dispose();
  }

  return { node, swingLegs, dispose };
}
