# Èlor design and implementation decisions

The live site is a first look at a proposed beauty house and academy in Perumbakkam, Chennai. The editorial portraits and architectural scenes express that concept. Keep their framing and copy honest about the studio's opening status.

## Brand and layout

- Use the ivory Èlor wordmark and the current dark, warm editorial palette. The experimental palette switcher and purple wordmark treatments were withdrawn. Reopen color separately when the brand direction is reviewed.
- The hero has three selectable scenes, Motion, Heritage, and Unbound. The clear portrait crop, full-bleed imagery, and readable heading take priority over effects. The Discover Èlor link stays in position while only its centered down arrow animates.
- The contact panel is on the hero's upper right on desktop and follows Discover Èlor on smaller screens. The hero and footer provide Instagram, Facebook, email, and click-to-call destinations. The phone link uses `tel:`; the device chooses its calling app.
- Experiences fills the available width. Keep the Unbound portrait's face visible and separation between Lookbook cards. Academy disclosures keep the adjacent image frame steady.
- The Destination groups Spaces, Ritual, Lookbook, Light Room, and Academy. Desktop scroll advances through the five sections and then gives way to Come as You Are. Mobile uses the compact selector. The section links and keyboard operation remain valid.
- The review badge, Instagram Reels embed, Copy My Edit, Light Room filler copy, and hero pointer spotlight were removed after review. The Instagram profile link remains part of contact navigation.

## Motion and characters

- The seated miniatures stay above Motion and Heritage when the visitor selects Unbound. Their gentle leg motion is independent of scene selection. Keep their ledge and the labels clear. Scene choices still change the hero imagery and copy.
- The daughter stands after the Instagram handle and points back to its link. Keep prominent directional gestures rare. The Arrival pair stays outdoors with grounded feet. The studio interior remains free of animated figures.
- The bridal painter uses a single rigid hand-and-brush pivot. Keep the grip, brush, portrait on the easel, and face intact. The fitted art, shading, and masks are already in the released assets.
- The Academy mentor uses the glasses-free look and a notebook gesture. In Come as You Are, the owner stays to the left of the copy and faces into it, including on narrow screens.
- Maintain the existing character likeness across poses. Use the published stylized artwork as the starting point for any new poses. Follow the same proportions, facial features, costumes, and color where the scene calls for continuity.
- The seated leg swings, Instagram pointing, painting, and Academy scenes have brief recurring movement. Other greetings are short single passes. Use smooth joints over pose swaps, stop offscreen work, and preserve still compositions for reduced motion.
- The Safari hero washout came from bright RGB values in low-alpha pixels combined with screen blending. The published shader outputs premultiplied alpha and composites normally. Keep that contract if the shader changes, and check the active Motion burst in native Safari. The CSS fallback continues to provide a restrained sweep without WebGL.
- Light Room keeps the portrait visible while its lazy WebGL light enhancement loads. Maintain the CSS fallback and reduced-motion behavior. Treat phone-width browser measurements as emulation evidence. A physical iPhone pass, including high-refresh behavior, was deferred.

## Sound and discoverability

- The welcome clip is 5.25 seconds. The page attempts it once after the window load and opening curtain complete. The brush applies to deliberate button and link actions. The dedicated sound controls were removed at the user's request.
- Clean Chrome and Edge profiles blocked the audible welcome cue on first load and refresh. Allowing autoplay in test profiles made it play in both. Safari showed the same browser-policy split. The user accepted this at launch. A real interaction can start sound if the product direction changes. A hidden button programmed to click cannot grant activation.
- Canonical metadata points to `https://elor.studio/`. The release includes structured data, `robots.txt`, `sitemap.xml`, and `llms.txt`. Verify the live files and crawler policies after material content changes. Search and assistant indexing are separate outcomes.

## Where to make changes

| Area | Source and artifacts |
| --- | --- |
| Page structure, content, anchors, contact, metadata | [index.html](../index.html) |
| Hero imagery, scene selection, typography, and transitions | [elor-art-direction.js](../assets/elor-art-direction.js), [elor-art-direction.css](../assets/elor-art-direction.css) |
| Hero light shader, fallback, and runtime | [elor-hero-webgl.js](../assets/elor-hero-webgl.js), [elor-hero-light.js](../assets/elor-hero-light.js), [elor-hero-light.css](../assets/elor-hero-light.css) |
| Hero miniatures and seating | [elor-perched-stylists.js](../assets/elor-perched-stylists.js), [elor-atelier-live.js](../assets/elor-atelier-live.js), [elor-avatar-rig.js](../assets/elor-avatar-rig.js), [elor-atelier-miniatures.webp](../assets/elor-atelier-miniatures.webp) |
| Destination navigation and panels | [elor-destination-explorer.js](../assets/elor-destination-explorer.js), [elor-destination-explorer.css](../assets/elor-destination-explorer.css) |
| Bridal, Ritual, and Lookbook interactions | [elor-chapters.js](../assets/elor-chapters.js), [elor-chapters.css](../assets/elor-chapters.css) |
| Arrival, painter, Academy, Instagram, and closing | Matching `elor-arrival-guide`, `elor-bridal-painter`, `elor-academy-mentor`, `elor-instagram-guide`, and `elor-invitation-guide` assets |
| Light Room | [elor-webgl-loader.js](../assets/elor-webgl-loader.js), [elor-light-webgl.js](../assets/elor-light-webgl.js), [elor-light-room.css](../assets/elor-light-room.css) |
| Audio | [elor-site-sound.js](../assets/elor-site-sound.js), [welcome clip](../assets/elor-welcome-preview.mp3), [brush clip](../assets/elor-brush-stroke.mp3) |
| Shared renderer | [Three.js](../vendor/three.module.js) and its [bundled license](../vendor/THREE-LICENSE.txt) |

## Deferred work

- **Booking.** Decide opening details, service availability, and contact or appointment workflow before enabling bookings.
- **Device verification.** Test physical iPhone Safari with real touch, autoplay, and reduced motion at common widths and refresh rates.
- **Final palette.** Revisit with the brand owner after content and interaction changes settle.
- **Optional creative work.** A rendered video fallback and additional small character moments are explorations. Candidate gestures include a petal in a Ritual bowl, tying silk in The Unveiling, and a small prism in Light Room.
- **Search visibility.** Validate the sitemap and canonical on the live domain as content evolves. Track discovery separately from the crawl files' HTTP availability.
