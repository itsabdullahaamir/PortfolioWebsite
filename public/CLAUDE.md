# public/ — static files served as-is

Parent: [`/CLAUDE.md`](../CLAUDE.md). Any change in this folder updates
this file and the root repo map in the same change.

Vite serves everything here unprocessed at the site root. Currently:

| File | Status | Notes |
|---|---|---|
| `favicon.svg` | ✅ | Referenced from `index.html` via `%BASE_URL%favicon.svg` (not a raw `/favicon.svg`, which would break once `vite.config.js` set a non-root `base` for GitHub Pages). |
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
