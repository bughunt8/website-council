# Technical requirements

## Architecture

Cloudflare Pages serves a static build with relative asset paths. The browser uses a same-origin catalog and three recorded JSON files. The upstream zero-dependency Node application remains a separate local program.

`scripts/build.mjs` assembles `dist/` from `site/`, allowed portrait/PDF/font directories, license text, and three exact example folder IDs. Two examples load their original events. The third uses the original viewer parser to transform its council files into equivalent events.

Timestamps are removed from the exported replay records so repeated builds at the same commit have the same bytes. `release.json` records the exact git commit and build mode.

## State

Page state holds the selected example, cards seen, replay position, speed, pause state, and theme. A request-generation counter prevents stale asynchronous session responses from overwriting a newer selection. Replay uses a single timer; changing examples or seeking cancels it.

The brief form generates a text command, optionally including `--quick`. User-entered data is never included in fetch requests, storage APIs, cookies, or catalog data.

## Security

No paid provider calls or public write endpoints. HTML insertion escapes original record content. The build has a negative test that plants a private session and proves it is not exported. No repository root deployment.

`_headers` sets same-origin script/font/connect permissions, MIME sniffing prevention, a restrictive referrer policy, and disabled device permissions. Inline styles remain allowed for compatibility with the retained PDF export library. No inline scripts are allowed.

## Operational distinction

The cloud build requires no Node runtime. `npm start` runs the original local viewer on loopback. Optional local API mode requires the user's own `.env` and is not a Cloudflare deployment setting.
