import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];
const ids = new Set();

for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
  if (ids.has(id)) errors.push(`Duplicate id: ${id}`);
  ids.add(id);
}

for (const [, target] of html.matchAll(/\bhref="#([^"]+)"/g)) {
  if (!ids.has(target)) errors.push(`Broken page anchor: #${target}`);
}

for (const [, resource] of html.matchAll(/\b(?:src|href|poster)="(assets\/[^"?#]+)"/g)) {
  if (!fs.existsSync(path.join(root, resource))) errors.push(`Missing resource: ${resource}`);
}

const artCss = fs.readFileSync(path.join(root, 'assets/elor-art-direction.css'), 'utf8');
const artJs = fs.readFileSync(path.join(root, 'assets/elor-art-direction.js'), 'utf8');
for (const id of ['readingProgress', 'heroDirectedScene', 'heroSceneImage', 'heroSceneNote',
  'editStage', 'editPortrait', 'editResultTitle', 'editResultCopy', 'editPortraitCaption',
  'editDirect', 'editAnnouncement']) {
  if (!ids.has(id)) errors.push(`Missing interaction target: ${id}`);
  if (!artJs.includes(`'${id}'`)) errors.push(`Not wired to script: ${id}`);
}
for (const axis of ['root', 'light', 'energy']) {
  if (!html.includes(`data-edit-axis="${axis}"`)) errors.push(`Missing signature axis: ${axis}`);
}
if (!html.includes('prefers-reduced-motion') || !artCss.includes('prefers-reduced-motion')) {
  errors.push('Reduced-motion handling not present');
}
if (html.includes('A little more magic.') || html.includes('sculptureMount')) {
  errors.push('The rejected sculpture interaction is still on the page');
}
if (html.includes('not èlor client work') || html.includes('not real client work') || html.includes('not a representation of completed client work')) {
  errors.push('Unwanted editorial labels are still visible');
}
for (const id of ['bridal-worlds','bridalWorldsImage','bridalWorldsTitle','ritual','ritualCopy',
  'ritualDetail','lookbook','lookbookDialog','lookbookLargeImage','constellation',
  'constellationImage','constellationCopyTitle','academy']) {
  if (!ids.has(id)) errors.push(`Missing V8 chapter element: ${id}`);
}
for (const interaction of ['data-bridal-world="heirloom"','data-ritual="breathe"',
  'data-lookbook-filter="bridal"','data-constellation="craft"']) {
  if (!html.includes(interaction)) errors.push(`Missing V8 interaction: ${interaction}`);
}
for (const asset of ['elor-chapters.js','elor-chapters.css','elor-bridal-atelier-v8.webp','elor-headspa-ritual-v8.webp']) {
  if (!fs.existsSync(path.join(root,'assets',asset))) errors.push(`Missing V8 asset: ${asset}`);
}
for (const asset of ['elor-mobile-realtime.css','elor-webgl-loader.js','elor-light-webgl.js']) {
  if (!fs.existsSync(path.join(root,'assets',asset))) errors.push(`Missing progressive lighting asset: ${asset}`);
}
if (!html.includes('id="lightRoomGPU"') || !html.includes('data-light-look="heirloom"')) {
  errors.push('Missing progressive WebGL canvas or state');
}
const gpuLoader=fs.readFileSync(path.join(root,'assets/elor-webgl-loader.js'),'utf8');
if (!gpuLoader.includes('IntersectionObserver') || !gpuLoader.includes("import('./elor-light-webgl.js')")) {
  errors.push('WebGL is not lazy-loaded when the portrait approaches');
}
if (!gpuLoader.includes('prefers-reduced-motion') || !gpuLoader.includes('WebGL2RenderingContext')) {
  errors.push('Missing accessibility or capability fallback');
}
if (html.includes('preview-pill') || /V15\s*\/\s*compact destination/i.test(html)) {
  errors.push('Preview version badge is visible on the site');
}

if (html.includes('siteSoundToggle') || html.includes('Mute site sounds')) {
  errors.push('A site sound control is visible on the page');
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}
console.log(`PASS: ${ids.size} unique IDs, anchors, media, V8 interactions and editorial language checks.`);
