import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Global ESC-to-go-back handler. Not in spec §7 — direct user request:
 * "pressing ESC from any place inside the software should take me to the
 * previous menu."
 *
 * Deliberately hierarchical, not history-based. `navigate(-1)` would walk
 * off the site entirely when a visitor deep-linked straight to an episode
 * or refreshed there, and it would disagree with the on-screen "◂
 * Previous menu" links (which are hard-coded destinations). The mapping
 * below mirrors those links and `PageTransition.jsx`'s own route-depth
 * table:
 *
 *   /chapters/:id  ->  /chapters
 *   /chapters      ->  /
 *   /plain         ->  /
 *   /              ->  no-op (already the top menu; `MainMenu.jsx` has
 *                      its own ESC handler that closes an open OPTIONS
 *                      panel first)
 *
 * Mounted once in `App.jsx` inside `<BrowserRouter>` but outside
 * `<Routes>`, so a single window listener covers every screen rather than
 * each one re-implementing it. Modified-key chords (Cmd/Ctrl/Alt/Shift +
 * Esc) are ignored so this never fights a browser or OS shortcut.
 */
function parentOf(pathname) {
  if (pathname.startsWith('/chapters/')) return '/chapters';
  if (pathname === '/chapters' || pathname === '/plain') return '/';
  return null;
}

export default function EscapeBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const parent = parentOf(location.pathname);
      if (!parent) return;
      event.preventDefault();
      navigate(parent);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [location.pathname, navigate]);

  return null;
}
