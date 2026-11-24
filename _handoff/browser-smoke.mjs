import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = new URL(process.argv[2] ?? 'https://elor.studio/');
url.hash = '';
assert(['http:', 'https:'].includes(url.protocol), 'Use an HTTP or HTTPS base URL');

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const marker = 'ELOR_SMOKE_WELCOME ';
const scenes = [
  { key: 'film', note: 'A film about the art of becoming' },
  { key: 'future', note: 'The new icon / entirely your own', image: 'elor-beauty-editorial.webp' },
  { key: 'heritage', note: 'The heirloom / rooted in feeling', image: 'bridal-portrait.webp' },
  { key: 'film', note: 'A film about the art of becoming' },
];

async function check(label, options) {
  const page = await browser.newPage(options);
  page.setDefaultTimeout(12000);
  try {
    await page.addInitScript(({ marker }) => {
      let loadedAt;
      let attempts = 0;
      addEventListener('load', () => { loadedAt = performance.now(); }, { once: true });
      // Observe the real browser call. No synthetic media policy or user gesture.
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        if (this.id !== 'welcomeSound') return Reflect.apply(play, this, args);
        attempts++;
        const sample = {
          loadedAt,
          attemptedAt: performance.now(),
          ready: document.readyState,
          veilRunning: document.querySelector('.opening-veil')?.getAnimations()
            .some(animation => animation.animationName === 'veil-exit' && animation.playState === 'running'),
          hadGesture: navigator.userActivation?.hasBeenActive,
        };
        const result = Reflect.apply(play, this, args);
        Promise.resolve(result).then(
          () => console.log(marker + JSON.stringify({ ...sample, result: 'played' })),
          error => console.log(marker + JSON.stringify({ ...sample, result: error.name })),
        );
        return result;
      };

      window.elorSmoke = {
        get attempts() { return attempts; },
        samples: [],
        seats() {
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          return ['left', 'right'].map((side, index) => {
            const actor = rect('.hero-miniature-' + side);
            const button = rect('.hero-choice[data-opening="' + ['film', 'heritage'][index] + '"]');
            return actor && button && {
              x: (actor.left + actor.width / 2) - (button.left + button.width / 2),
              y: actor.bottom - button.top,
            };
          });
        },
      };
      document.addEventListener('click', event => {
        if (!event.target.closest('.hero-choice')) return;
        const frames = [];
        window.elorSmoke.samples.push(frames);
        function sample() {
          frames.push(window.elorSmoke.seats());
          if (frames.length < 28) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
    }, { marker });

    // Waiting for a console event keeps the opening check free of automation-created activation.
    const opening = page.waitForEvent('console', message => message.text().startsWith(marker));
    const [response, event] = await Promise.all([
      page.goto(url.href, { waitUntil: 'load' }), opening,
    ]);
    assert(response?.ok(), label + ' homepage returned an HTTP error');
    const sound = JSON.parse(event.text().slice(marker.length));
    assert.equal(sound.ready, 'complete', label + ' welcome cue before page load');
    assert(sound.attemptedAt >= sound.loadedAt && !sound.veilRunning, label + ' welcome cue before reveal');
    assert.notEqual(sound.hadGesture, true, label + ' welcome probe was activated');
    assert(['played', 'NotAllowedError'].includes(sound.result), label + ' unexpected audio result ' + sound.result);

    assert.match(await page.locator('#heroHeading').innerText(), /Beyond\s+beautiful/i);
    assert.equal(await page.locator('.preview-pill, .site-sound-toggle, #siteSoundToggle').count(), 0);
    assert.equal(await page.getByRole('button', { name: /mute site sounds|play welcome sound/i }).count(), 0);

    const choices = page.locator('.hero-choices');
    await choices.scrollIntoViewIfNeeded();
    const baseline = await page.evaluate(() => window.elorSmoke.seats());
    assert(baseline.every(seat => seat && Math.abs(seat.x) <= 1 && Math.abs(seat.y) <= 3), label + ' initial seats');
    for (const [index, scene] of scenes.entries()) {
      if (index) {
        const control = choices.locator('[data-opening="' + scene.key + '"]');
        if (options.hasTouch) await control.tap();
        else await control.click();
        await page.waitForFunction(i => window.elorSmoke.samples[i - 1]?.length === 28, index);
        assert.equal(await page.locator('#top').getAttribute('data-hero-opening'), scene.key);
      }
      assert.deepEqual(await choices.locator('[aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => node.dataset.opening)), [scene.key]);
      assert.equal(await page.locator('#heroSceneNote').textContent(), scene.note);
      const directed = page.locator('#heroDirectedScene');
      assert.equal(await directed.evaluate(node => node.classList.contains('active')), Boolean(scene.image));
      if (scene.image) assert((await directed.locator('img').getAttribute('src'))?.endsWith('/' + scene.image));
    }
    const samples = await page.evaluate(() => window.elorSmoke.samples);
    assert.equal(samples.length, 3);
    for (const frames of samples) {
      for (const frame of frames) {
        assert(frame.every((seat, i) => seat && Math.abs(seat.x - baseline[i].x) <= 1 &&
          Math.abs(seat.y - baseline[i].y) <= 1), label + ' avatar drift while switching scenes');
      }
    }
    assert.equal(await page.evaluate(() => window.elorSmoke.attempts), 1, label + ' welcome cue replayed on scene selection');

    const menu = page.locator('#menuToggle');
    if (options.hasTouch) {
      await menu.tap();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    }
    const navigation = page.getByRole('navigation', { name: options.hasTouch ? 'Mobile navigation' : 'Main navigation' });
    await navigation.getByRole('link', { name: 'Experiences', exact: true }).click();
    await page.waitForURL(target => target.hash === '#worlds');
    await page.locator('#worlds').waitFor({ state: 'visible' });
    if (options.hasTouch) assert.equal(await menu.getAttribute('aria-expanded'), 'false');

    await page.locator('.header-logo').click();
    await page.waitForURL(target => target.hash === '#top');
    await page.waitForFunction(() => scrollY <= 2);
    console.log('PASS ' + label + ' | scenes, seats, navigation, badge-free UI | welcome ' + sound.result);
  } finally {
    await page.close();
  }
}

try {
  await check('desktop 1440px', { viewport: { width: 1440, height: 900 } });
  await check('phone 393px', { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
} finally {
  await browser.close();
}
