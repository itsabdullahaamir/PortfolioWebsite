import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import TitleBackdrop from './TitleBackdrop.jsx';
import { profile } from '../data/profile.js';
import { sounds, useSound } from '../lib/sound.js';

/**
 * Beat 3 of the opening sequence — spec section 4.1.
 * Plain vertical text list over the SAME backdrop TitleReveal used — per
 * spec, this continuity (one scene, menu fades in over it, no cut to a
 * separate "menu screen") is the actual Walking Dead structure. No
 * boxes, no button chrome: text sits directly on the art. The backdrop
 * itself is `TitleBackdrop.jsx`, shared with TitleReveal.jsx so the two
 * beats render pixel-identical scenery instead of two hand-copied
 * gradients that could drift apart.
 *
 * Selection state: the active item shifts right + a `▸` arrow in
 * --signal + brighter text. No box or background fill on selection.
 * Up/down arrows move selection, Enter activates (native <button>
 * Enter/Space handles activation) — a real menu, not decoration.
 *
 * CONTINUE is omitted entirely (not disabled) unless useProgress().hasSave.
 * PLAIN RESUME (item key 'extras', unchanged — only the label moved) is
 * the recruiter escape hatch — it goes straight to /plain, which is where
 * the actual "download PDF" control lives (see screens/PlainResume.jsx;
 * no static PDF asset exists yet, so that control uses window.print()).
 * Labeled plainly rather than in-universe ("EXTRAS") because a recruiter
 * scanning the menu needs to recognize it as the resume without reading
 * an explanatory line underneath — see the removed orientation-line note
 * further down this file.
 * OPTIONS expands inline motion/sound/typewriter toggles read/written via
 * useSettings() rather than a separate SettingsTray screen — that
 * component is out of this batch's scope (see src/components/CLAUDE.md).
 */

// import titleArt from '../assets/title-art/scene.webp'; // same backdrop as TitleReveal
const TITLE_ART_URL = null;
const VERSION = 'v1.0';

export default function MainMenu({ reducedMotion }) {
  const navigate = useNavigate();
  const { hasSave, lastEpisodeId } = useProgress();
  const settings = useSettings();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [visible, setVisible] = useState(!!reducedMotion);
  const itemRefs = useRef([]);
  const playSound = useSound();

  useEffect(() => {
    if (reducedMotion) return undefined;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Deliberately NOT auto-focusing the first item on mount. An earlier
  // version called itemRefs.current[0]?.focus() here, and browsers'
  // :focus-visible heuristic treats a page's very first (script-driven)
  // focus as keyboard-worthy — so every visitor, mouse users included,
  // got the --signal focus ring around NEW GAME on load, inconsistently
  // across browsers (reported live as "sometimes" a big red box).
  // Keyboard users still reach the menu the normal way: Tab moves focus
  // to the first button via native tab order, which *does* legitimately
  // trigger :focus-visible, and arrow keys take over from there via
  // handleKeyDown below. Nothing here is unreachable by keyboard alone.

  const items = [
    { key: 'new-game', label: 'NEW GAME', action: () => navigate('/chapters') },
    hasSave
      ? {
          key: 'continue',
          label: 'CONTINUE',
          action: () => navigate(`/chapters/${lastEpisodeId}`),
        }
      : null,
    { key: 'episodes', label: 'EPISODES', action: () => navigate('/chapters') },
    { key: 'extras', label: 'PLAIN RESUME', action: () => navigate('/plain') },
    { key: 'options', label: 'OPTIONS', action: () => setOptionsOpen((open) => !open) },
  ].filter(Boolean);

  // Reached by arrow-key navigation (handleKeyDown below).
  const focusIndex = (index) => {
    const clamped = (index + items.length) % items.length;
    itemRefs.current[clamped]?.focus();
    setSelected(clamped);
    playSound('navigate');
  };

  // Mouse hover changing which item is selected — guarded so re-entering
  // the item that's already selected (e.g. a keyboard move landing under
  // a stationary cursor) doesn't double-fire the cue.
  const hoverIndex = (index) => {
    if (selected !== index) playSound('navigate');
    setSelected(index);
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusIndex(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusIndex(index - 1);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-40 overflow-hidden ${TITLE_ART_URL ? 'bg-cover bg-center' : ''}`}
      style={TITLE_ART_URL ? { backgroundImage: `url(${TITLE_ART_URL})` } : undefined}
    >
      {!TITLE_ART_URL ? <TitleBackdrop reducedMotion={reducedMotion} interactive /> : null}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"
      />
      {/* Left-edge scrim. The backdrop's skyline now rises to ~70% of the
          frame, so the menu text sits over lit windows and rooftops
          rather than over empty sky — this keeps the --bone menu items
          readable against whatever happens to be behind them, the same
          job the bottom gradient does for the title in TitleReveal.jsx.
          Kept to the left third so it darkens the text column without
          flattening the scene the menu is supposed to sit inside. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-ink/80 via-ink/35 to-transparent"
      />

      {/* `pointer-events-none` on the nav is load-bearing, not tidiness:
          this element is `h-full`, so it covers the ENTIRE viewport and
          sits above TitleBackdrop.jsx in paint order. Left clickable, it
          swallowed every click aimed at the scene behind it — which is
          why the backdrop's easter-egg window could never actually be
          hit (the embers still worked, but only because those run off a
          window-level listener that doesn't care what's on top). Pointer
          events are re-enabled on the real controls below, so the empty
          space around them lets clicks through to the scene. */}
      <nav
        aria-label="Main menu"
        className="pointer-events-none relative flex h-full flex-col items-start justify-end gap-1 px-8 pb-20 transition-opacity duration-700 ease-out sm:px-16 sm:pb-24"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {/* Identity block above the menu items. The menu used to be five
            bare verbs over a picture, which told a recruiter landing here
            nothing — not whose resume this is, not what they're looking
            at. Name and headline come from ../data/profile.js rather than
            being retyped here, so there is still exactly one source of
            truth for them (see ../data/CLAUDE.md). */}
        <div className="mb-7 max-w-md">
          <p className="font-display text-2xl uppercase leading-none tracking-wide text-bone drop-shadow-[2px_2px_0_var(--ink)] sm:text-3xl">
            {profile.name}
          </p>
          <p className="mt-2 font-body text-sm text-bone/70">{profile.headline}</p>
        </div>

        <ul className="pointer-events-auto flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={item.key}>
              <button
                ref={(el) => (itemRefs.current[index] = el)}
                type="button"
                onClick={() => {
                  playSound('select');
                  item.action();
                }}
                onFocus={() => setSelected(index)}
                onMouseEnter={() => hoverIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`flex items-center gap-2 border-none bg-transparent py-1 text-left font-display text-lg uppercase tracking-wide transition-transform duration-[120ms] ease-out ${
                  selected === index ? 'translate-x-2 text-bone' : 'text-bone/60'
                }`}
              >
                <span className="inline-block w-4" aria-hidden="true">
                  {selected === index ? <span className="text-signal">▸</span> : null}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {optionsOpen ? (
          // Toggle labels use font-display (Alfa Slab One), same as every
          // item in the <ul> above, not font-body. They read as menu
          // items — same nav, same interaction model — not as resume
          // body prose, so tokens.css's "titles only" restriction on the
          // display face doesn't cover them; Inter here read as a plain
          // settings row bolted onto an in-universe menu.
          <div
            role="group"
            aria-label="Options"
            className="pointer-events-auto mt-4 flex flex-col gap-2 border-l-2 border-bone/30 pl-4"
          >
            <button
              type="button"
              onClick={() => settings.toggle('motion')}
              className="text-left font-display text-sm uppercase tracking-normal text-bone/80 hover:text-bone"
            >
              Motion: {settings.motion ? 'On' : 'Off'}
            </button>
            {/* SOUND is back: ../lib/sound.js synthesizes short UI blips
                with the Web Audio API (menu navigate/select, the memory
                toast) rather than needing shipped audio files, so this
                toggle now actually gates something. Clicking it plays
                `sounds.select()` UNCONDITIONALLY — the one deliberate
                exception to routing everything through `playSound()` —
                specifically so turning sound ON gets an immediate
                audible answer instead of silence until the next
                unrelated action. `settings.sound` still defaults to
                false (spec's "never autoplay" rule), and creating the
                AudioContext requires this very click as its first user
                gesture, so nothing can play before this button is
                pressed at least once. */}
            <button
              type="button"
              onClick={() => {
                sounds.select();
                settings.toggle('sound');
              }}
              className="text-left font-display text-sm uppercase tracking-normal text-bone/80 hover:text-bone"
            >
              Sound: {settings.sound ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => settings.toggle('typewriter')}
              className="text-left font-display text-sm uppercase tracking-normal text-bone/80 hover:text-bone"
            >
              Typewriter: {settings.typewriter ? 'On' : 'Off'}
            </button>
          </div>
        ) : null}

        {/* Keyboard hint. The escape hatch used to need a second line
            spelling out what EXTRAS was, because "EXTRAS" alone didn't
            read as "the actual resume" — renaming the item itself to
            "PLAIN RESUME" (see items[] above) makes that line redundant,
            so it's gone rather than kept as leftover explanation of a
            label that no longer needs explaining. */}
        <p className="mt-8 max-w-md font-body text-xs uppercase leading-relaxed tracking-[0.18em] text-bone/45">
          ↑ ↓ to navigate · Enter to select
        </p>
      </nav>

      <span className="absolute bottom-3 right-4 font-body text-xs text-bone/50">{VERSION}</span>
    </div>
  );
}
