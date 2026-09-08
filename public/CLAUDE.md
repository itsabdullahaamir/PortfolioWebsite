# public/ — static files served as-is

Parent: [`/CLAUDE.md`](../CLAUDE.md). Any change in this folder updates
this file and the root repo map in the same change.

Vite serves everything here unprocessed at the site root. Currently:

| File | Status | Notes |
|---|---|---|
| `favicon.svg` | ✅ | Referenced from `index.html` via `%BASE_URL%favicon.svg` (not a raw `/favicon.svg`, which would break once `vite.config.js` set a non-root `base` for GitHub Pages), and also wired as `apple-touch-icon`. **This batch — replaced the leftover Claude/Vite scaffold starburst with the site's own logo:** a slab-serif "A" monogram drawn in the design tokens (bone `#EFE7D8` letterform on an ink `#141210` field, `#C4321E` signal crossbar), a flat three-`<path>` SVG with no filters so it stays legible at 16px. Hex values are inlined here on purpose — a `public/` file is served unprocessed and has no access to `tokens.css`; keep them in sync with §3 if a token ever changes. `index.html` also gained `<meta name="theme-color" content="#141210">` and its `<title>` lost an em dash (now `Abdullah Aamir · Interactive Resume`). |
| `portrait.jpg` | ✅ | Headshot for the `/plain` Dossier identity block (`src/screens/PlainResume.jsx`, driven by `profile.photo` in `src/data/profile.js`). Served at the site root, resolved in the component against `import.meta.env.BASE_URL` so it works under the `/PortfolioWebsite/` subpath. **Now a real color headshot** (400×400 JPG) supplied by the site owner. Any square-ish JPG/PNG/WebP works at this path; the component renders it at full color (the earlier `grayscale` treatment was removed on direct feedback that it read as too washed-out and too small) at 160px / 144px (`lg:`) with a 2px `--ink` border. If the file is ever absent the component hides the frame rather than showing a broken image. |
| `404.html` | ✅ | New — GitHub Pages deploy support. Pages serves this repo as a project site at `/PortfolioWebsite/` with no server-side rewrites, so a direct/refreshed load of any client-routed path (`/chapters`, `/plain`, etc.) would 404 for real. This is the standard rafgraph/spa-github-pages redirect trick (`pathSegmentsToKeep = 1`): it re-encodes the requested path into a query string and redirects to the site root, where a matching inline script in `index.html`'s `<head>` decodes it and restores the real URL via `history.replaceState` before React Router mounts. Only fires on a real 404 — normal in-app navigation via `<Link>` never touches it. |

## Resolved cleanup item

`src/App.jsx` used to reference an SVG sprite via `<use href="/icons.svg#...">`
for several icons (documentation, social, github, discord, x, bluesky) —
default-`create-vite`-template scaffolding, not part of the spec. `App.jsx`
has since been rewritten as the router root (root `CLAUDE.md` §5 Phase 4)
and that markup, including the sprite references, was deleted, not
recreated. `icons.svg` still does not exist in this folder and nothing in
the app references it anymore.

## What actually belongs here going forward

Per the spec, nothing else is required in `public/` — cover images live
in `src/assets/covers/` (imported/bundled, not static-served) and fonts
in `src/assets/fonts/` (also bundled). No PDF resume file exists here
yet; `src/screens/PlainResume.jsx`'s "Download PDF" control currently
calls `window.print()` instead of linking a static file (browsers' print
dialogs offer "Save as PDF"). If a real PDF ends up being a static file
rather than a rendered `/plain` export, it would live here — that's still
an open question in spec §10, not yet decided.
