# Èlor browser smoke check

With Node.js and npm installed, run these commands from the repository root.

```sh
npm install --no-save --no-package-lock playwright
npx playwright install chromium
node _handoff/browser-smoke.mjs
```

The default target is the public homepage. To check a different deployment, pass its base URL.

```sh
node _handoff/browser-smoke.mjs https://example.com/
```

Set `CHROMIUM_EXECUTABLE_PATH` to use a compatible installed Chromium-based browser instead of Playwright's managed Chromium.

The check reports a pass for desktop and a phone-sized touch viewport. It switches all hero scenes, measures both seats during each transition, opens Experiences and returns home, and checks that the preview badge and sound controls are absent. It observes the welcome audio attempt without granting a gesture. A browser-policy `NotAllowedError` is an expected outcome. The phone check uses Chromium emulation.
