import { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProgressProvider } from './context/ProgressContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { MusicProvider } from './context/MusicContext.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import AmbientLayer from './components/AmbientLayer.jsx';
import BackgroundMusic from './components/BackgroundMusic.jsx';
import EscapeBack from './components/EscapeBack.jsx';
import PageTransition, { noteRouteChange } from './components/PageTransition.jsx';
import TitleScreen from './screens/TitleScreen.jsx';
import ChapterSelect from './screens/ChapterSelect.jsx';
import EpisodeView from './screens/EpisodeView.jsx';
import PlainResume from './screens/PlainResume.jsx';
import Floor from './screens/Floor.jsx';
import Play from './screens/Play.jsx';

/**
 * Route-change transition. `TitleScreen`/`ChapterSelect`/`EpisodeView`/
 * `PlainResume` are nested under one layout `<Route element={<AnimatedOutlet />}>`
 * rather than each getting an `element` directly on the top-level
 * `<Routes>`, specifically so this can use `useOutlet()` instead of the
 * `<Routes location={location} key={location.pathname}>` trick most
 * framer-motion/react-router writeups suggest. That trick was tried
 * first and, in manual testing, never actually mounted the new matched
 * screen after a navigation — `useOutlet()` (giving `PageTransition.jsx`
 * itself the `location.pathname` key, rather than `Routes`) is the
 * documented fallback for exactly this kind of failure and is what's
 * used here.
 *
 * `noteRouteChange()` is called during render, deliberately: the
 * transition is now a directional camera dolly (in when going deeper,
 * out when coming back to the menu — see `PageTransition.jsx`), and both
 * the outgoing screen and the incoming one have to agree on which way
 * the camera is moving. The outgoing one is an element `AnimatePresence`
 * is holding onto, so its props are frozen at the previous navigation's
 * values and can't carry the answer; a module-level value set here,
 * before either child renders, can. It's idempotent per pathname, so
 * StrictMode's double render is harmless.
 *
 * The scroll reset is standard SPA behaviour the app didn't have —
 * React Router does not reset scroll on navigation, so arriving at a
 * screen part-way down the previous one's scroll position was already
 * possible. It matters more now because the transition wrapper is
 * viewport-fixed while animating: without this, a long page would snap
 * from its top (where the animation framed it) to a stale scroll offset
 * the instant it settled. `PageTransition.jsx` freezes the OUTGOING
 * screen's own scroll position so this reset doesn't yank it mid-fade.
 */
function AnimatedOutlet() {
  const location = useLocation();
  const element = useOutlet();

  noteRouteChange(location.pathname);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={location.pathname}>{element}</PageTransition>
    </AnimatePresence>
  );
}

/**
 * Router root — spec section 7 ("Routing: React Router. Routes: /,
 * /chapters, /chapters/:id, /plain") and root CLAUDE.md Phase 4.
 * Provider nesting: ProgressProvider -> SettingsProvider -> ToastProvider,
 * wrapping the routed screens. No resume copy lives here — every screen
 * below reads from src/data/episodes.js.
 *
 * `AmbientLayer` is mounted once here, inside SettingsProvider, so it can
 * read useSettings().motion — it renders the mechanic-5 film grain
 * overlay and syncs the `motion-off` class onto <html> (see its own
 * doc comment for why). It renders nothing itself besides that overlay.
 *
 * `BackgroundMusic` (the main-menu "radio") is likewise mounted once here
 * rather than by `MainMenu.jsx` — it used to live there and unmount (stop)
 * on every navigation away from the menu, including into `/plain`. Direct
 * user follow-up request: the radio should keep playing across menu-ish
 * navigation and only stop specifically on entering `/chapters` or
 * `/chapters/:id`. Mounting it here means it survives every route change;
 * it gates its own play/pause on `useLocation()` internally (see that
 * file) and on `MusicProvider`'s `started` flag, which `TitleScreen.jsx`
 * flips true the moment its beat sequence reaches MENU — so it still
 * never starts during beats 0-2, only once the menu itself is showing.
 *
 * The four screens are nested under a layout route (`<AnimatedOutlet />`)
 * rather than each having its own top-level `element` — see that
 * component's doc comment for why (route-transition motion, added on
 * direct user request for a "parallax effect" between menus).
 */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProgressProvider>
        <SettingsProvider>
          <MusicProvider>
            <ToastProvider>
              <AmbientLayer />
              <BackgroundMusic />
              <EscapeBack />
              <Routes>
                <Route element={<AnimatedOutlet />}>
                  <Route path="/" element={<TitleScreen />} />
                  <Route path="/chapters" element={<ChapterSelect />} />
                  <Route path="/chapters/:id" element={<EpisodeView />} />
                  <Route path="/plain" element={<PlainResume />} />
                  {/* The game surface. /floor is the walkable overworld
                      behind NEW GAME; /play/:id is one room on it. Both
                      sit inside the same AnimatedOutlet layout as every
                      other screen so the camera dolly, the scroll reset
                      and ESC all treat them like anywhere else. */}
                  <Route path="/floor" element={<Floor />} />
                  <Route path="/play/:id" element={<Play />} />
                </Route>
              </Routes>
            </ToastProvider>
          </MusicProvider>
        </SettingsProvider>
      </ProgressProvider>
    </BrowserRouter>
  );
}
