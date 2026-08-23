/**
 * Single source of truth for all resume content — spec section 7.
 * Every component reads from this file. No component may hardcode copy.
 *
 * Structure note: episodes are organized by CATEGORY (education,
 * teaching/research, leadership & volunteering, hackathons, projects),
 * not chronology. An earlier version told the story in narrative order
 * (an "origin story" episode mixing school notes, a first competition,
 * and university rank; a "roles" episode mixing a paid TA job with
 * unpaid campus leadership) — a recruiter skimming for "what did they do
 * professionally vs. for fun" had to read every panel to sort it out.
 * Each episode below is now a single answer to one category question.
 *
 * Scope note: the five episodes are a *curated* surface, not the whole
 * resume. Anything real that did not earn a panel (extra projects,
 * volunteering, certifications, transcript detail, awards) lives in
 * `./profile.js` and is rendered by the `/plain` route, so the recruiter
 * escape hatch stays complete even though the game surface is selective.
 *
 * Panel shape (spec section 6):
 *   header    → 2-5 words, uppercase, display face
 *   timestamp → "2024 — Present" style
 *   body      → 30-60 words of plain prose
 *   tags      → 2-5 short tags
 *   link      → optional absolute URL string, or null
 */

/**
 * How the `/plain` route treats this episode's panels. The game surface
 * and the plain document are deliberately not the same shape: `/plain`
 * builds a real resume out of `./profile.js`, so episodes whose material
 * is already covered there (education, roles, volunteering) would only
 * duplicate it. Values:
 *   'covered'  → do not render on /plain; profile.js already carries it
 *   'projects' → render its panels under the Projects heading
 * This lives in the data, not in PlainResume.jsx, so the editorial call
 * about what is redundant stays next to the content it describes.
 */
export const PLAIN_SECTIONS = [{ role: 'projects', heading: 'Projects' }];

export const episodes = [
  {
    id: 'education',
    number: 1,
    title: 'THE RECORD BOOK',
    subtitle: 'Grades, ranks, and how they got there',
    cover: '/covers/ep1.webp',
    plainRole: 'covered',
    panels: [
      {
        header: 'RANK ONE OF 313',
        timestamp: '2024 — Present',
        body: 'Started BS Computer Science at FAST-NUCES and finished the first semester at the top of a 313-person cohort. Three top-of-semester finishes followed, including a perfect 4.00 in Fall 2025. Cumulative CGPA sits at 3.96, with gold medals in Fall 2024 and Fall 2025.',
        tags: ['FAST-NUCES', 'CGPA 3.96', 'Gold Medal'],
        link: null,
      },
      {
        header: 'BEFORE THE DEGREE',
        timestamp: '2017 — 2024',
        body: 'O Levels: 7 A*, 2 A, plus third place in an interschool English poetry competition. A Levels: 1 A*, 2 A, plus a finalist run at PakCrypt. Somewhere in between, co-founded "Badlao," a welfare drive collecting clothes for flood- and cold-affected families.',
        tags: ['A Levels', 'O Levels', 'The Science School'],
        link: null,
      },
    ],
    choicePrompt: 'So — how did the grades happen?',
    choices: [
      { label: "What's the university record?", target: 'panel-0' },
      { label: 'And before that?', target: 'panel-1' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'academia',
    number: 2,
    title: 'OFFICE HOURS',
    subtitle: 'Teaching it, then researching it',
    cover: '/covers/ep2.webp',
    plainRole: 'covered',
    panels: [
      {
        header: 'THE TUTORIAL ROOM',
        timestamp: '2025 — Present',
        body: 'Teaching assistant across Programming Fundamentals, Discrete Structures, Object Oriented Programming, and now Linear Algebra. Ran tutorials on recursion, graph traversals, and memory management for more than a hundred students, and designed and graded the assessments. Explaining pointers badly once teaches you more than explaining them well ten times.',
        tags: ['Teaching', 'FAST-NUCES', '100+ Students'],
        link: null,
      },
      {
        header: 'KNOWLEDGE GRAPHS',
        timestamp: '2026 — Present',
        body: 'Research assistant at the Parallel Computing Networks lab at FAST, working on knowledge graph construction and relational modeling — structuring and linking complex networked datasets, then probing connectivity patterns and link prediction methods at a scale where the interesting failures only show up late.',
        tags: ['Knowledge Graphs', 'Link Prediction', 'Research'],
        link: null,
      },
      {
        header: 'A PAPER IN PROGRESS',
        timestamp: '2026 — Present',
        body: 'Co-authoring a paper on image processing with a faculty advisor: computational methods for visual data analysis and feature extraction. Unfinished, unpublished, and listed here anyway, because this episode is about the questions that do not have answers yet rather than the ones that do.',
        tags: ['Image Processing', 'Research', 'Unpublished'],
        link: null,
      },
    ],
    choicePrompt: 'You teach and you research — which comes first?',
    choices: [
      { label: 'Tell me about the teaching.', target: 'panel-0' },
      { label: 'What are you researching?', target: 'panel-1' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'guild',
    number: 3,
    title: 'ORGANIZED CHAOS',
    subtitle: 'On leading rooms full of people',
    cover: '/covers/ep3.webp',
    plainRole: 'covered',
    panels: [
      {
        header: 'NOTES FOR STRANGERS',
        timestamp: '2023 — 2024',
        body: 'Wrote curriculum-aligned revision notes for IGCSE Computer Science, then A2 Physics, for ZNotes — a free study platform used by students who cannot pay for tutoring. Also recorded topic explainers and past-paper walkthroughs. Teaching the syllabus turned out to be the fastest way to actually learn it.',
        tags: ['ZNotes', 'Teaching', 'Peer Education'],
        link: null,
      },
      {
        header: 'RUNNING THE SOCIETY',
        timestamp: '2025 — Present',
        body: 'Joined the FAST Outreach & Engagement Society on the social media team, and a year later was leading it as President for the 2026-27 tenure. Ran Executive Council hiring, and now handle campus outreach and engagement — which mostly means deciding what the society is actually for.',
        tags: ['President', 'Leadership', 'FOES'],
        link: null,
      },
      {
        header: 'EVENT HEAD, NASCON',
        timestamp: '2026 — Present',
        body: "Event Head for C++ FaceOff, then Speed Programming, at NaSCon — Pakistan's largest student-run computing competition. Alongside it: media and marketing for TEDxFASTIslamabad, and HR Director for Isaar, fielding queries and coordinating goals across every Islamabad chapter.",
        tags: ['NaSCon', 'Event Management', 'TEDx', 'HR'],
        link: null,
      },
      {
        header: 'MODERATING STRANGERS',
        timestamp: '2024 — Present',
        body: 'Two years administering the ProSports Discord community, remotely: enforcing guidelines, mediating disputes, running fan events like the PSL Predictor Challenge, and relaying user feedback into UX suggestions. Also spent a summer there as content coordination intern. Moderation is unglamorous and teaches you exactly how people behave at scale.',
        tags: ['Community', 'Moderation', 'ProSports'],
        link: null,
      },
    ],
    choicePrompt: 'They say you run the room. Which room?',
    choices: [
      { label: 'You teach strangers too?', target: 'panel-0' },
      { label: 'What do you actually run?', target: 'panel-1' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'sidequests',
    number: 4,
    title: '48 HOURS, NO SLEEP',
    subtitle: 'Competitions, and what came out of them',
    cover: '/covers/ep4.webp',
    plainRole: 'projects',
    panels: [
      {
        header: 'FIRST NATIONAL ROUND',
        timestamp: '2023',
        body: 'Entered PakCrypt, a three-round national cybersecurity competition run by NCCS at Air University. Cleared registration, screening, and a cryptography problem-solving round to reach the on-campus Amateur Track final. First time competing against people from outside school, and the first sign this was worth taking seriously.',
        tags: ['Cryptography', 'Cybersecurity', 'PakCrypt'],
        link: null,
      },
      {
        header: 'PARWANA, SECOND PLACE',
        timestamp: '2026',
        body: "Built in three hours at HackSummer'26 and took second place. It checks a Pakistani overseas-job message against the government's own BEOE register and returns a verdict with a dated evidence chain. No model call sits on the path from message to verdict — six classical extraction stages and a state machine do the work.",
        tags: ['Python', 'Flask', 'Entity Resolution', 'NLP'],
        link: 'https://github.com/itsabdullahaamir/parwana',
      },
      {
        header: 'EDUGAP, NATIONAL FINALS',
        timestamp: '2026',
        body: "Second place at atomcamp's National AI Hackathon, and a place in the national top ten. EduGap parses course outlines, scrapes Rozee.pk for live Pakistani job postings, maps the gap between what is taught and what is hired for, then closes it with a Socratic tutor agent over two RAG databases.",
        tags: ['RAG', 'Agents', 'Python', 'EdTech'],
        link: null,
      },
      {
        header: 'TAXNET, ONE GRAPH',
        timestamp: '2026',
        body: 'Forty-eight hours, one graph. An entity-resolution pipeline — phonetic blocking, sentence-transformer matching, IDF-weighted Jaccard, logistic-regression fusion — reaching F1 around 0.90 on 110,000-plus records at near-linear runtime. On top of it: PageRank, community detection, cycle enumeration, and Positive-Unlabeled learning for scoring.',
        tags: ['Neo4j GDS', 'scikit-learn', 'FastAPI', 'Graph ML'],
        link: null,
      },
      {
        header: 'PROMPTOPIA, NO MEDAL',
        timestamp: '2026',
        body: 'A generative-AI competition run by Google Developer Groups at FAST. Two-person team, one brief: use image generation to make a case about water pollution, then build the product deck proposing a fix. No placement on this one — included because not every competition ends with a medal.',
        tags: ['Generative AI', 'Google DGC'],
        link: null,
      },
    ],
    choicePrompt: 'Forty-eight hours, no sleep. Was it worth it?',
    choices: [
      { label: 'Where did the competing start?', target: 'panel-0' },
      { label: 'Show me something with real numbers.', target: 'panel-3' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'build',
    number: 5,
    title: 'THINGS THAT SHIPPED',
    subtitle: 'The ones that got finished',
    cover: '/covers/ep5.webp',
    plainRole: 'projects',
    panels: [
      {
        header: 'POCKETMUNSHI, BY VOICE',
        timestamp: '2026 — Present',
        body: 'A voice-first digital khaata for bazaar and kirana merchants: record udhaar and payments by speaking Urdu or Punjabi, get a Paper ID to scribble on the paper slip, verify later when the shop is quiet. Flutter, Riverpod, Drift over SQLite. Offline-first, no backend — the merchant owns their data.',
        tags: ['Flutter', 'Dart', 'SQLite', 'Offline-First'],
        link: null,
      },
      {
        header: 'MARIO, IN ASSEMBLY',
        timestamp: '2025',
        body: "Rebuilt Super Mario's mechanics in x86 Assembly using the Irvine32 library, near enough from scratch: pixel-perfect collision detection and stack management done by hand. Sixty-two commits, which is the honest measure of it — this was not a weekend. The demo recording is more convincing than the description.",
        tags: ['x86 Assembly', 'Irvine32', 'Game Dev'],
        link: 'https://github.com/itsabdullahaamir/MarioInAssemblyAndIrvine',
      },
      {
        header: 'A CITY IN C++',
        timestamp: '2025',
        body: 'An Islamabad simulation built for a Data Structures course with every structure written from scratch — no STL, no templates, a custom string class. Linked lists, a hash table with separate chaining, a graph running Dijkstra, an N-ary tree of zones down to houses, and a binary heap, across seven city modules.',
        tags: ['C++', 'Data Structures', 'Dijkstra'],
        link: null,
      },
    ],
    choicePrompt: 'Enough talk. What actually shipped?',
    choices: [
      { label: 'What are you building right now?', target: 'panel-0' },
      { label: 'Show me something low-level.', target: 'panel-1' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
    // Mechanic 4: the one branching moment, placed at the end of this
    // episode per spec section 5. Both paths converge on `resolution` —
    // that convergence IS the joke, so the two labels have to feel like a
    // real fork first. Nothing renders this yet; the branch UI is Phase 8
    // work. `resolution` holds the convergent outcome copy the spec asks
    // for ("a summary of shipped work").
    branch: {
      prompt: 'One more question, and then you can go.',
      options: [
        { label: '"Pick the safe stack."', outcome: 'summary' },
        { label: '"Build the weird thing."', outcome: 'summary' },
      ],
      resolution:
        'Either way: a ledger app for shopkeepers who do not trust apps, a plumber in x86 assembly, and a city simulated without a standard library. The answer was always going to be the weird thing. It just took a few semesters to admit it.',
    },
  },
];

export const getEpisodeById = (id) => episodes.find((ep) => ep.id === id);

export const getNextEpisode = (id) => {
  const index = episodes.findIndex((ep) => ep.id === id);
  if (index === -1 || index === episodes.length - 1) return null;
  return episodes[index + 1];
};
