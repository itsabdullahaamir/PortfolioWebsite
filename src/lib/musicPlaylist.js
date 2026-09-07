/**
 * Auto-discovers whatever lofi tracks live in ../assets/audio/ at build
 * time via Vite's import.meta.glob — no manifest file to hand-edit when a
 * track is added, removed, or renamed. Drop MP3/OGG files into that
 * folder (create it if it doesn't exist yet) and they show up here
 * automatically, in filename order.
 *
 * Two supported filename conventions, both auto-parsed with no manifest
 * to hand-edit:
 *   1. `NN-title.mp3` — e.g. `01-chillhop-flow.mp3`. The numeric prefix
 *      sets a deterministic sort position; the rest becomes the title.
 *      Use TRACK_META below to attach an artist/source credit, since
 *      this convention has nowhere in the filename to put one.
 *   2. `Artist - Title.mp3` — e.g. `Lakey Inspired - Blue Boi.mp3`. Artist
 *      and title are split on the first ` - ` and used directly, no
 *      TRACK_META entry needed. This is the convention most royalty-free
 *      music sites (Mixkit, Pixabay, YouTube Audio Library, etc.) already
 *      name their downloads with, so files sourced from those and dropped
 *      in as-is just work.
 * Either way, title-casing is applied and the display name is what
 * `BackgroundMusic.jsx` shows in its "Now Playing" badge.
 *
 * Only license-cleared tracks belong here — see ../components/CLAUDE.md
 * for where to source them. This module has no way to verify a file's
 * actual license once it's in the folder — that responsibility is on
 * whoever drops the file in, not on this auto-discovery code.
 *
 * TRACK_META is an escape hatch for filenames that don't carry an artist
 * (convention 1 above) or need a correction/override. Keyed by filename,
 * optional per file — anything not listed here falls back to whatever
 * convention 2's parser extracts, or to a bare filename-derived title
 * with no artist if neither applies. There's no true "album" for most
 * royalty-free tracks (licensed individually, not released as part of a
 * record), so `source` carries a platform/license credit in that slot
 * instead of a fabricated album name.
 */
const TRACK_META = {
  '01-sweet-september.mp3': { artist: 'Arulo', source: 'Mixkit' },
  '02-sleepy-cat.mp3': { artist: 'Alejandro Magaña (A. M.)', source: 'Mixkit' },
};

const trackModules = import.meta.glob('../assets/audio/*.{mp3,MP3,ogg,OGG}', {
  eager: true,
  query: '?url',
  import: 'default',
});

// Capitalizes only the first character of each space-separated word —
// deliberately not a `\b\w` regex, which mis-fires on contractions
// (`can't` -> `Can'T`) because an apostrophe counts as a word boundary.
// A fully-uppercase word (e.g. a filename like `HEAVYLIGHT.mp3`) is
// lowercased first so it reads as a normal title instead of shouting in
// the "Now Playing" badge; a word that's only partly capitalized (e.g.
// `Artificial.Music`) is left alone rather than assumed to be a mistake.
function titleCase(str) {
  return str
    .split(' ')
    .map((word) => {
      if (!word) return word;
      const isAllCaps = word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase();
      const normalized = isAllCaps ? word.toLowerCase() : word;
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(' ');
}

// Strips a leading `NN-`/`NN_`/`NN.` order prefix, splits on the first
// ` - ` (Artist - Title convention) if present, and title-cases both
// halves. Returns `{ title, artist }`, `artist` null when no ` - ` split
// was found (convention 1, or just an unstructured filename).
function parseFilename(path) {
  const base = path
    .split('/')
    .pop()
    .replace(/\.(mp3|ogg)$/i, '')
    .replace(/^\d+[-_.\s]*/, '');

  const dashIndex = base.indexOf(' - ');
  if (dashIndex === -1) {
    const cleaned = base.replace(/[-_]+/g, ' ').trim();
    return { title: titleCase(cleaned || base), artist: null };
  }

  const artist = base.slice(0, dashIndex).trim();
  const title = base.slice(dashIndex + 3).trim();
  return { title: titleCase(title), artist: titleCase(artist) };
}

export const playlist = Object.keys(trackModules)
  .sort()
  .map((path) => {
    const filename = path.split('/').pop();
    const meta = TRACK_META[filename] || {};
    const parsed = parseFilename(path);
    return {
      src: trackModules[path],
      title: meta.title || parsed.title,
      artist: meta.artist || parsed.artist,
      album: meta.album || null,
      source: meta.source || null,
    };
  });
