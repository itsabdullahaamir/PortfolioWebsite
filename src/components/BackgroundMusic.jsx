import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext.jsx';
import { useMusic } from '../context/MusicContext.jsx';
import { playlist } from '../lib/musicPlaylist.js';

/**
 * The site-wide "radio" — mounted once at the top of App.jsx (outside the
 * routed screens), NOT by MainMenu.jsx. Its scope has widened twice on
 * direct user request. It started mounted by MainMenu.jsx, so it stopped
 * the instant a visitor navigated anywhere at all; it then moved here and
 * kept playing across menu-ish routes (/ and /plain) while still pausing
 * on /chapters and /chapters/:id. That route gate is now gone too — the
 * user asked for the music to keep playing on the chapter-select and
 * episode screens "alike it is in the Plain Resume Setting," and cutting
 * the bed on navigation is the exact discontinuity the request is about.
 * Nothing else on those screens plays audio, so there is no conflict to
 * duck for, and the Settings `music` toggle remains the way to silence
 * it. NOT spec mechanic 5's cut "ambient audio" pick — see
 * ../styles/CLAUDE.md's note on that — and see ../lib/CLAUDE.md for how
 * ../lib/musicPlaylist.js discovers its tracks.
 *
 * One gate now decides whether it's actually playing (beyond the Settings
 * toggle): `useMusic().started`, a one-way flip for the rest of the
 * session, set by TitleScreen.jsx the moment its beat sequence reaches
 * MENU. This replaces the old mount-triggers-playback design so the radio
 * still never starts during beats 0-2 (StartPrompt/PresentsCard/
 * TitleReveal) even though this component itself is mounted from page
 * load. Because playback no longer depends on the route at all, a
 * navigation doesn't touch the `<audio>` element and the track simply
 * continues across screens rather than pausing and resuming.
 *
 * Renders nothing at all — no <audio>, no badge — when the playlist is
 * empty, same graceful-degradation pattern as TITLE_ART_URL/cover-image
 * placeholders elsewhere in this app: until real license-cleared tracks
 * are dropped into src/assets/audio/, this component is a no-op rather
 * than a broken player.
 *
 * Gated by the Settings `music` toggle (OPTIONS, MainMenu.jsx) —
 * independent of `sound`, which only covers short UI blips. Playback
 * still can't violate "never autoplay": StartPrompt.jsx (Beat 0)
 * guarantees a real user gesture happens before the menu can ever be
 * reached, which is what actually unlocks <audio>.play() here (same
 * platform mechanism ../lib/sound.js relies on for Web Audio). The
 * pointerdown/keydown retry below is a safety net for browsers whose
 * autoplay heuristics are stricter than that guarantee accounts for —
 * mirrors the same pattern TitleScreen.jsx uses for sounds.intro.
 *
 * Volume ramps in over ~600ms on every track start (including the very
 * first one and each auto-advance) instead of jumping straight to full
 * volume, so a track change never pops.
 *
 * The "Now Playing" badge (top-right) shows the track title in the
 * display face plus an artist/source line underneath, sourced from
 * ../lib/musicPlaylist.js's TRACK_META — direct user request for
 * song/artist/album details, not just a generic "playing" indicator.
 *
 * Shuffled, not sequential — direct user request ("it doesn't start
 * from a fixed audio but a randomizer... plays a random audio from the
 * list"). Every advance — auto (`ended`) or manual (the badge, or the
 * Previous/Next Track controls in MainMenu.jsx's OPTIONS panel) — goes
 * through `next()` in `../context/MusicContext.jsx`, which draws from a
 * shuffled bag: every track plays once before any track plays twice.
 * That replaced an independent random roll that only excluded the track
 * currently playing, which let a song legitimately return two or three
 * skips later; see MusicContext.jsx for the full reasoning. Track
 * selection (which index is current, and the next()/previous() logic)
 * lives in that context rather than this component's local state, so
 * OPTIONS can drive Previous/Next without reaching into this component.
 * This file only owns actual playback — the `<audio>` element,
 * play/pause, and the fade-in ramp.
 */

const VOLUME = 0.35;
const FADE_MS = 600;
const FADE_STEPS = 12;
// How long the full "Now Playing" card stays open before it shrinks back
// to the bare equaliser puck. It pops open on every track change (and on
// hover/focus) so a visitor still sees what came on — it just stops
// permanently sitting on top of whatever is in that corner of the menu
// and game screens once they've had a chance to read it.
const COLLAPSE_MS = 4500;

export default function BackgroundMusic() {
  const { music } = useSettings();
  const { started, trackIndex, next } = useMusic();
  const shouldPlay = music && started;
  const prefersReducedMotion = useReducedMotion();
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const collapseTimerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const track = playlist[trackIndex];
  const isPlaylist = playlist.length > 1;

  const scheduleCollapse = () => {
    clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => setExpanded(false), COLLAPSE_MS);
  };
  const openBadge = () => {
    clearTimeout(collapseTimerRef.current);
    setExpanded(true);
  };

  // Pop the card open whenever the track changes (including the first
  // one), then let it settle closed again on its own.
  useEffect(() => {
    if (!isPlaying) return undefined;
    openBadge();
    scheduleCollapse();
    return () => clearTimeout(collapseTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return undefined;

    if (!shouldPlay) {
      audio.pause();
      setIsPlaying(false);
      return undefined;
    }

    const fadeIn = () => {
      clearInterval(fadeIntervalRef.current);
      audio.volume = 0;
      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step += 1;
        audio.volume = Math.min(VOLUME, (VOLUME * step) / FADE_STEPS);
        if (step >= FADE_STEPS) clearInterval(fadeIntervalRef.current);
      }, FADE_MS / FADE_STEPS);
    };

    let removeRetryListeners = null;
    const attemptPlay = () => {
      audio
        .play()
        .then(() => {
          fadeIn();
          setIsPlaying(true);
        })
        .catch(() => {
          // Blocked by the browser's autoplay policy — shouldn't happen
          // post-StartPrompt, but heuristics vary. Retry on the next
          // real gesture rather than staying silent for the rest of the
          // session.
          const retry = () => {
            removeRetryListeners?.();
            attemptPlay();
          };
          window.addEventListener('pointerdown', retry, { once: true });
          window.addEventListener('keydown', retry, { once: true });
          removeRetryListeners = () => {
            window.removeEventListener('pointerdown', retry);
            window.removeEventListener('keydown', retry);
          };
        });
    };
    attemptPlay();

    return () => {
      removeRetryListeners?.();
      clearInterval(fadeIntervalRef.current);
      audio.pause();
      setIsPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlay, trackIndex]);

  if (playlist.length === 0) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={track.src}
        preload="auto"
        loop={!isPlaylist}
        onEnded={isPlaylist ? next : undefined}
      />
      {music && isPlaying ? (
        <button
          type="button"
          onClick={() => {
            if (!expanded) {
              openBadge();
              scheduleCollapse();
            } else if (isPlaylist) {
              next();
            }
          }}
          onMouseEnter={openBadge}
          onMouseLeave={scheduleCollapse}
          onFocus={openBadge}
          onBlur={scheduleCollapse}
          aria-label={
            !expanded
              ? `Now playing ${track.title}${track.artist ? ` by ${track.artist}` : ''}. Click to show track details.`
              : isPlaylist
                ? `Now playing ${track.title}${track.artist ? ` by ${track.artist}` : ''}. Click to skip to the next track.`
                : `Now playing ${track.title}${track.artist ? ` by ${track.artist}` : ''}.`
          }
          className={`fixed right-4 top-4 z-50 flex items-center border border-bone/20 bg-ink/90 text-left shadow-[4px_4px_0_var(--shadow)] sm:right-8 sm:top-6 ${
            expanded ? 'gap-2 px-3 py-2.5' : 'gap-0 p-2'
          }`}
        >
          <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
            {[0, 1, 2].map((bar) => (
              <span
                key={bar}
                className={`w-[3px] origin-bottom bg-signal ${
                  !prefersReducedMotion ? 'animate-[eq-bar_0.9s_ease-in-out_infinite]' : ''
                }`}
                style={{ height: '100%', animationDelay: `${bar * 0.18}s` }}
              />
            ))}
          </span>
          {expanded ? (
            <span className="min-w-0">
              <span className="block font-display text-[10px] uppercase leading-none tracking-[0.2em] text-signal">
                Now Playing
              </span>
              <span className="mt-1 block max-w-[13rem] truncate font-display text-sm leading-none text-bone">
                {track.title}
              </span>
              {track.artist || track.album || track.source ? (
                <span className="mt-1 block max-w-[13rem] truncate font-body text-[11px] leading-none text-bone/60">
                  {[track.artist, track.album || track.source].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </span>
          ) : null}
        </button>
      ) : null}
    </>
  );
}
