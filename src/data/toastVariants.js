/**
 * Copy pool for the memory toast — mechanic 1, spec section 5.
 * ToastProvider picks from these by trigger context so the phrasing
 * doesn't get stale. Keep entries short: one line, all caps, in the
 * "the game is narrating your browsing" voice.
 */

export const toastVariants = {
  episodeFirstOpen: [
    'THE RECRUITER WILL REMEMBER THAT.',
    'THIS EPISODE HAS BEEN NOTED.',
  ],
  panelExpand: [
    'YOUR CURIOSITY HAS BEEN NOTED.',
    'THE RECRUITER WILL REMEMBER THAT.',
  ],
  choiceMade: [
    'THIS CHOICE WILL HAVE CONSEQUENCES.',
    'NOTED.',
  ],
  pdfDownload: [
    'THE RECRUITER WILL REMEMBER THAT.',
    'A COPY HAS BEEN MADE.',
  ],
  /*
    The floor (src/game/scenes/overworld.js): trying to enter a door that
    is still locked. This is a failure, not an achievement, so it must
    NOT reuse episodeFirstOpen's "the recruiter noticed you" voice — it
    fired that exact pool on a locked door until this batch, which read
    as nonsense (being praised for failing to get in). These lines stay
    in the same short/ALL CAPS/one-line voice as the rest of the file but
    are about the door itself, and point at the one thing that always
    works: the stairwell to the Episode Explorer.
  */
  doorLocked: [
    'THE DOOR IS BARRED.',
    'THE STAIRS ARE OPEN, THOUGH.',
    'NOT YET. TRY THE STAIRS.',
  ],
  /*
    Title-screen easter egg (components/TitleBackdrop.jsx): the one lit
    window on an otherwise dark building. Clicking it reveals someone
    still at a desk. Deliberately the only pool written in the first
    person — everywhere else the toast narrates the *visitor's* browsing,
    but this one is the scene talking back about whoever is up there, so
    it earns a different voice. Keep it dry, not boastful.
  */
  lateNightWindow: [
    'SOMEONE IS STILL UP THERE.',
    '03:47. THE BUILD IS STILL RUNNING.',
    'HE WILL SLEEP AFTER THIS ONE COMMIT.',
  ],
};

/** Picks a variant string for a given trigger, cycling deterministically. */
export function pickToastVariant(trigger, seed = 0) {
  const pool = toastVariants[trigger] ?? ['NOTED.'];
  return pool[seed % pool.length];
}
