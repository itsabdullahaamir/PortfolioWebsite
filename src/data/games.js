/**
 * Game-layer content: one minigame per episode.
 *
 * WHY THIS IS A SEPARATE FILE FROM episodes.js
 * episodes.js is the resume. Its panel bodies are 30-60 words because
 * spec section 6 says so and because that is the right length to READ.
 * Nobody reads 45 words while playing. A beat here is one line, 10-20
 * words, sized to be taken in during a two-second pause in a game.
 *
 * So this file is a second, shorter cut of the same facts -- never new
 * ones. Every beat below traces to a panel in episodes.js or an entry in
 * profile.js. If you edit a fact there, edit it here. If you cannot
 * point at where a beat came from, it does not belong in this file: the
 * one thing a resume cannot survive is the game surface inventing a
 * credential.
 *
 * THE DESIGN RULE THE FIVE GAMES SHARE
 * The mechanic must be a metaphor for the work, not a trophy ceremony.
 * "Collect the skill coins" is the failure mode. Every game below is
 * built so that the thing you do with your hands is the thing the panel
 * describes: you stack semesters, you triage a room of students, you
 * watch four meters drain because you cannot save all four, you survive
 * a night you cannot win, you wire five modules onto one shared graph.
 *
 * AND THE HONEST ONE
 * fortyEight is deliberately unwinnable past second place. The real
 * record is three second places and a national top ten; a game that let
 * you take gold would be a nicer game and a dishonest one. Do not
 * "fix" it.
 */

/**
 * Shape:
 *   episodeId  matches an episodes.js id -- the join key for gating,
 *              routing (/play/:episodeId) and the results screen's
 *              "read the full episode" link.
 *   kind       which scene module renders it (src/game/scenes/<kind>.js)
 *   title      shown on the door in the overworld and on the brief card
 *   verb       one word for what you do. Kept distinct across all five
 *              on purpose -- five reskins of one mechanic would be worse
 *              than no minigames at all.
 *   brief      the how-to-play line. Must be understandable in one read;
 *              if it needs two sentences the game is too complicated.
 *   controls   { pointer, key } -- BOTH are required. Every game is
 *              playable one-handed on a phone and from a keyboard.
 *   goal       the win condition, stated plainly on the brief card.
 *   why        THE LINE THAT KEEPS THIS A RESUME. One or two sentences
 *              saying what the mechanic stands for -- which part of the
 *              record you are handling while you play. Play.jsx shows it
 *              on the brief card and again on the results card, so a
 *              visitor is never left holding a toy with no idea what it
 *              had to do with the person. If you add a sixth game and
 *              cannot write this line, the mechanic is wrong, not the
 *              copy.
 *   modules    OPTIONAL, liveGraph only: [{ label, role }] for the five
 *              module boxes. Mechanical labels, never a credential.
 *   beats      revealed IN ORDER, one per success event. The scene
 *              decides what a "success" is; it emits
 *              ctx.emit('reveal', { index }) and this array supplies the
 *              copy. Aim to reveal all of them on a competent run.
 *   outro      shown on the results card. One line, no flattery.
 */
export const games = [
  {
    episodeId: 'education',
    kind: 'stack',
    title: 'THE STACK',
    verb: 'Timing',
    brief: 'A block swings across the top. Drop it on the one below.',
    controls: { pointer: 'Tap to drop', key: 'Space to drop' },
    goal: 'Stack all eight. Overhang narrows the next block; miss the tower entirely three times and it stops.',
    why: 'The tower you stack is the transcript: one block per result, in the order they were earned. Nothing here is a score; every row is a line off the record.',
    beats: [
      { label: 'O LEVELS', text: 'Seven A*, two A. Third at an interschool poetry competition.' },
      { label: 'A LEVELS', text: 'One A*, two A, and a finalist run at PakCrypt.' },
      { label: 'SEMESTER ONE', text: 'BS Computer Science at FAST-NUCES. Rank one of a 313-person cohort.' },
      { label: 'GOLD', text: 'Top of semester. The first of two gold medals.' },
      { label: 'GOLD, AGAIN', text: 'Then a second gold, and a silver after it.' },
      { label: 'FALL 2025', text: 'A perfect 4.00 for the semester.' },
      { label: 'THE RUNNING TOTAL', text: '73 credit hours. Cumulative CGPA 3.96.' },
      { label: 'STILL GOING', text: 'Fifth semester, in progress.' },
    ],
    outro: 'Four top-of-semester finishes in a row. The tower is the transcript.',
  },
  {
    episodeId: 'teaching',
    kind: 'handsUp',
    title: 'HANDS UP',
    verb: 'Triage',
    brief: 'Hands go up across the hall. Reach one before it drops.',
    controls: { pointer: 'Tap a raised hand', key: 'Arrows to aim, Space to answer' },
    goal: 'Answer 12 before 6 give up. More hands go up than one person can reach, which is the job.',
    why: 'Every hand you reach is a course taught or a research thread picked up. The hands you cannot reach are not padding; they are what a hundred students in one room actually costs.',
    beats: [
      { label: 'AUG 2025', text: 'Teaching assistant, Programming Fundamentals.' },
      { label: 'THEN TWO MORE', text: 'Object Oriented Programming, and Discrete Structures.' },
      { label: 'NOW', text: 'Linear Algebra, and a second round of Programming Fundamentals. Four courses, more than a hundred students.' },
      { label: 'THE TUTORIALS', text: 'Recursion, graph traversals, memory management. Designed and graded the assessments too.' },
      { label: 'ZNOTES', text: 'Revision notes for IGCSE CS and A2 Physics, free for students who cannot pay for tutoring.' },
      { label: 'CHIP', text: 'Research assistant on an HEC-funded project: does disease incidence in Pakistan track the weather?' },
      { label: 'THE HARD PART', text: 'Not the model. The national health and climate data is barely documented.' },
      { label: 'JUST STARTED', text: 'A second thread on why knee surgeries fail. Too early to claim a result, or even a settled role.' },
    ],
    outro: 'You could not reach all of them either. That is what a hundred students in one room means.',
  },
  {
    episodeId: 'leadership',
    kind: 'eventDay',
    title: 'EVENT DAY',
    verb: 'Management',
    brief: 'Four things are failing at different speeds. Top up whichever is worst.',
    controls: { pointer: 'Tap a meter to work it', key: '1-4 or arrows, Space to work' },
    goal: 'Get to the end of the day with all four still standing. You will not keep them all full.',
    why: 'Each meter is a real society, event or community. Topping one up means letting another slide, which is the honest shape of holding four roles at once.',
    beats: [
      { label: 'THE SOCIETY', text: 'Joined FAST Outreach & Engagement Society on the social media team.' },
      { label: 'PRESIDENT', text: 'A year later, leading it for the 2026-27 tenure. Ran Executive Council hiring.' },
      { label: 'FCS EVENTS', text: 'Runs the semester calendar jointly with FAST Computing Society: an orientation, a guest-speaker session.' },
      { label: 'NASCON', text: 'CS Event Head for Speed Programming at Pakistan’s largest student-run computing competition.' },
      { label: 'THE JOB', text: 'Problem sets and rules, briefing the volunteer panel, coordinating sponsors and judges.' },
      { label: 'TEDX', text: 'Media and marketing for TEDxFASTIslamabad. HR Director for Isaar across every Islamabad chapter.' },
      { label: 'PROSPORTS', text: 'Two years moderating a Discord community. Guidelines, disputes, fan events, feedback into UX.' },
      { label: 'SUNDAS', text: 'Weeks of thalassemia volunteering: patient visits, blood drives, then interviews with the director.' },
      { label: 'OFF CAMPUS', text: 'A water-conservation campaign in Mehra Abadi. Event crew at a Code for Pakistan hackathon.' },
    ],
    outro: 'Nothing here ran on a full tank. Running the room means choosing what to let slip.',
  },
  {
    episodeId: 'competitions',
    kind: 'fortyEight',
    title: 'FORTY-EIGHT HOURS',
    verb: 'Endurance',
    brief: 'Hold to climb, release to fall. Get through the night.',
    controls: { pointer: 'Hold anywhere', key: 'Hold Space' },
    goal: 'Reach hour 48. You cannot place first; nobody here ever did.',
    why: 'Each hour survived is a competition entry, in the order they happened. The marker you cannot reach at the end is the first place he never took.',
    beats: [
      { label: 'HOUR 0', text: 'PakCrypt, 2023. Three national rounds. First time competing against anyone outside school.' },
      { label: 'HOUR 6', text: 'Parwana, built in three hours at HackSummer’26. Second place.' },
      { label: 'HOUR 14', text: 'It checks an overseas-job message against the BEOE register of 5,251 licensed agencies.' },
      { label: 'HOUR 20', text: 'No model call on the path from message to verdict. Six classical stages and a state machine.' },
      { label: 'HOUR 28', text: 'EduGap: a curriculum against live Rozee.pk postings, reporting where they drifted apart.' },
      { label: 'HOUR 34', text: 'Second place nationally, and a top-ten place. The architecture and the pitch were his; the engineering was two teammates’.' },
      { label: 'HOUR 42', text: 'TaxNet: entity resolution to F1 near 0.90 over 110,000+ records, then PageRank across the graph.' },
      { label: 'HOUR 48', text: 'Promptopia, runners-up. Three second places and a national top ten.' },
    ],
    outro: 'Second, second, second. You got as far as anyone got, which was the point.',
  },
  {
    episodeId: 'projects',
    kind: 'liveGraph',
    title: 'ONE LIVE GRAPH',
    verb: 'Wiring',
    brief: 'Five modules, one shared graph. Connect each one to it.',
    controls: { pointer: 'Drag from a module to the graph', key: 'Arrows to pick, Space to connect' },
    goal: 'Wire all five. Then change one thing and watch the rest re-adapt.',
    why: 'Each module is a real component of CityMind, and the graph is the one shared structure they all read from. Wiring them is how the project was actually assembled.',
    /**
     * Mechanical labels for liveGraph.js's five module boxes. `role` is
     * what that module DOES inside the system, not a claim about the
     * person -- each line traces to a beat below (the CSP solver that
     * places the city, the A* router, the risk-to-road-weight loop). It
     * lives here rather than in the scene because a scene file may not
     * contain copy.
     */
    modules: [
      { label: 'LAYOUT', role: 'Places the city' },
      { label: 'ROUTING', role: 'Plans the routes' },
      { label: 'RISK', role: 'Scores the danger' },
      { label: 'DEMAND', role: 'Weights the roads' },
      { label: 'FEEDBACK', role: 'Closes the loop' },
    ],
    beats: [
      { label: 'CITYMIND', text: 'Five AI algorithms sharing a single live city graph.' },
      { label: 'LAYOUT', text: 'A constraint-satisfaction solver places the city.' },
      { label: 'ROUTING', text: 'An A* router replans emergency routes around live flooding.' },
      { label: 'FEEDBACK', text: 'Predicted crime risk turns into road-weight multipliers, and routing changes again.' },
      { label: 'THE POINT', text: 'Change one thing and every module re-adapts. That is why it is one graph and not five.' },
      { label: 'BEFORE IT', text: 'An Islamabad simulation in C++: no STL, no templates, a custom string class.' },
      { label: 'FROM SCRATCH', text: 'Linked lists, a chained hash table, Dijkstra, an N-ary zone tree, a binary heap.' },
      { label: 'AND ONE MORE', text: 'Super Mario rebuilt in x86 assembly. Sixty-two commits, which is the honest measure of it.' },
    ],
    outro: 'Two cities built from nothing, and a plumber written in assembly.',
  },
];

export const getGame = (episodeId) => games.find((game) => game.episodeId === episodeId);

/**
 * Play order for the overworld's door gating. Deliberately the same
 * order as episodes.js rather than an independent list -- two orderings
 * would drift the moment an episode is added.
 */
export const gameOrder = games.map((game) => game.episodeId);
