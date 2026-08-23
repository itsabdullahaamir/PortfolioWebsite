import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProgressProvider } from './context/ProgressContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import AmbientLayer from './components/AmbientLayer.jsx';
import TitleScreen from './screens/TitleScreen.jsx';
import ChapterSelect from './screens/ChapterSelect.jsx';
import EpisodeView from './screens/EpisodeView.jsx';
import PlainResume from './screens/PlainResume.jsx';

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
 */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProgressProvider>
        <SettingsProvider>
          <ToastProvider>
            <AmbientLayer />
            <Routes>
              <Route path="/" element={<TitleScreen />} />
              <Route path="/chapters" element={<ChapterSelect />} />
              <Route path="/chapters/:id" element={<EpisodeView />} />
              <Route path="/plain" element={<PlainResume />} />
            </Routes>
          </ToastProvider>
        </SettingsProvider>
      </ProgressProvider>
    </BrowserRouter>
  );
}
