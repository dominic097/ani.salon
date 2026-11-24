# Continue the Èlor site

This handoff records the public launch verified on November 24, 2026. The site is static. `index.html`, `assets/`, `vendor/`, and the crawl files sit at the repository root. GitHub Pages publishes that root from `main` to [elor.studio](https://elor.studio/).

## Pick up here

1. Fetch the latest `main` and start a working branch from it.
2. Read [Design and implementation decisions](design-and-implementation.md) for the approved direction, motion behavior, browser limitations, and file map.
3. Review the [to-do list](TODO.md) and use the [release runbook](release.md) to test and publish any changes.

Run the static checks from the repository root with Node.js 22 or later. Serve the site over HTTP so its modules can load.

```sh
node _handoff/qa-site.mjs
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` for local work. The [existing review preview](https://elor-v14-qa-preview.aziron626625.chatgpt.site/) is the visual baseline for the initial release. It has its own publishing workflow.

## Reusable artifacts

| Artifact | Purpose |
| --- | --- |
| [Static site checks](qa-site.mjs) | Checks IDs, links, media references, chapter controls, reduced-motion integration, and removal of preview UI. |
| [Browser smoke test](browser-smoke.mjs) and [run instructions](browser-qa.md) | Checks desktop and phone-width interactions, fixed avatar seats, navigation, and sound behavior on the live or local site. |
| [Release file hashes](release.sha256) | Identifies the 78 runtime files from the initial approved release. Run `shasum -a 256 -c _handoff/release.sha256` from the repository root to compare. Later content edits will change the affected hashes. |
| [Concept film recipe](render-concept-film.sh) | Recreates a concept cut from the existing editorial WebP assets with FFmpeg. Run `bash _handoff/render-concept-film.sh output.mp4`. Omitting the output path writes `elor-directors-cut-preview.mp4` in your current directory. |
| [Production deployment](https://github.com/dominic097/ani.salon/actions/runs/45419148077) | Shows the launch build and deployment for commit `3620e9a`. |

The launch check compared every runtime file served by the production domain with the approved build and tested hero controls and navigation at desktop and phone widths. The welcome cue attempts playback after the opening. Its audible result follows the visitor's browser autoplay settings.
