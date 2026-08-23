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
