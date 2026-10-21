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
 * Naming note: episode `title` is a PLAIN CATEGORY LABEL, not a
 * flavor line. An earlier pass gave every episode a Telltale-style
 * name ("THE RECORD BOOK", "48 HOURS, NO SLEEP", "THINGS THAT SHIPPED")
 * with the factual description demoted to `subtitle`. That inverted the
 * priority the 90-second rule needs: the chapter-select screen showed
 * five flavor titles, three of which truncated, and nothing on it told a
 * recruiter that episode 2 is teaching and research — the most
 * employable thing here. The game framing now lives entirely in the
 * chrome ("SEASON 1", "EPISODE 2", the window art) and in the panel
 * copy, which frees the label to be flat and factual. `subtitle` is now
 * a contents line: literally what is inside, no voice.
 *
 * ZNotes ("NOTES FOR STRANGERS") sits in episode 2, not episode 3, for
 * the same reason. It is peer teaching, and under a leadership heading
 * nobody looking for teaching experience would ever find it.
 *
 * `scene` names which key-art composition
 * src/components/EpisodeArt.jsx draws for this episode. It is content,
 * not styling: the drawing is a rendering of what the episode contains,
 * so the choice belongs next to the copy it illustrates rather than in a
 * lookup table in the screen.
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
 *   'covered'      → do not render on /plain; profile.js already carries it
 *   'projects'     → render its panels under the Projects heading
 *   'competitions' → render its panels under the Competitions & hackathons
 *                    heading
 * This lives in the data, not in PlainResume.jsx, so the editorial call
 * about what is redundant stays next to the content it describes.
 *
 * `competitions` is new (the Dossier rebuild of `/plain`). Before this
 * batch the `competitions` episode was tagged `plainRole: 'projects'`,
 * which meant its five hackathon panels rendered mixed in with the three
 * real project panels under one flat "Projects" heading on /plain — a
 * real bug, not a stylistic choice; a recruiter scanning for shipped
 * projects had to sort hackathon sprints out of the same list by eye.
 * The two now split into their own sections, in the order this array is
 * in (Projects first, Competitions second — recruiter-priority order per
 * the Dossier rebuild brief), and PlainResume.jsx reads `heading` from
 * here rather than hardcoding the string a second time.
 */
export const PLAIN_SECTIONS = [
  { role: 'projects', heading: 'Projects' },
  { role: 'competitions', heading: 'Competitions & hackathons' },
];

export const episodes = [
  {
    id: 'education',
    number: 1,
    title: 'EDUCATION',
    subtitle: 'FAST-NUCES, A Levels, O Levels',
    cover: '/covers/ep1.webp',
    scene: 'lecture',
    plainRole: 'covered',
    panels: [
      {
        header: 'RANK ONE OF 313',
        timestamp: '2024 to present',
        body: 'Started BS Computer Science at FAST-NUCES and finished the first semester at the top of a 313-person cohort. Three top-of-semester finishes followed: two gold medals, one silver, and a perfect 4.00 in Fall 2025. Cumulative CGPA sits at 3.96 across 73 credit hours, now in the fifth semester.',
        tags: ['FAST-NUCES', 'CGPA 3.96', 'Rank 1 of 313'],
        link: null,
      },
      {
        header: 'BEFORE THE DEGREE',
        timestamp: '2017 to 2024',
        body: 'O Levels: 7 A*, 2 A, plus third place in an interschool English poetry competition. A Levels: 1 A*, 2 A, plus a finalist run at PakCrypt. In the same years, co-founded "Badlao," a welfare drive collecting clothes for flood- and cold-affected families.',
        tags: ['A Levels', 'O Levels', 'The Science School'],
        link: null,
      },
    ],
    choicePrompt: 'So how did the grades happen?',
    choices: [
      { label: "What's the university record?", target: 'panel-0' },
      { label: 'And before that?', target: 'panel-1' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'teaching',
    number: 2,
    title: 'TEACHING & RESEARCH',
    subtitle: 'Five courses as TA, an HEC-funded lab, two research threads',
    cover: '/covers/ep2.webp',
    scene: 'study',
    plainRole: 'covered',
    panels: [
      {
        header: 'THE TUTORIAL ROOM',
        timestamp: '2025 to present',
        body: 'Teaching assistant across Programming Fundamentals, Discrete Structures, Object Oriented Programming, and now Linear Algebra, Operating Systems, and a second round of Programming Fundamentals. Ran tutorials on recursion, graph traversals, and memory management for more than a hundred students. Wrote and graded the assessments, and held office hours through every exam week.',
        tags: ['Teaching', 'FAST-NUCES', '100+ Students'],
        link: null,
      },
      {
        header: 'NOTES FOR STRANGERS',
        timestamp: '2023 to 2024',
        body: 'Wrote curriculum-aligned revision notes for IGCSE Computer Science, then A2 Physics, for ZNotes, a free study platform used by students who cannot pay for tutoring. Also recorded topic explainers and past-paper walkthroughs for the same audience.',
        tags: ['ZNotes', 'Teaching', 'Peer Education'],
        link: null,
      },
      {
        header: 'DISEASE AND WEATHER',
        timestamp: '2026 to present',
        body: 'Research assistant on CHIP, an HEC-funded project at the Parallel Computing Networks lab, asking whether disease incidence in Pakistan tracks weather and natural-disaster patterns. The hard part is not the model. It is that the national health and climate data is barely documented, so most of the work is sourcing it, cleaning it, and building a structure to predict on.',
        tags: ['Knowledge Graphs', 'HEC-Funded', 'Research'],
        link: null,
      },
      {
        header: 'WHY KNEE SURGERIES FAIL',
        timestamp: '2026 to present',
        body: 'A second research thread, just started, with a faculty advisor: using medical image analysis and feature-extraction techniques to work out why knee surgeries fail. It is too early to claim a result, or even a settled role. It is listed here because the work has genuinely started, not because it has finished.',
        tags: ['Image Processing', 'Research', 'Early Stage'],
        link: null,
      },
    ],
    choicePrompt: 'You teach and you research. Which comes first?',
    choices: [
      { label: 'Tell me about the teaching.', target: 'panel-0' },
      { label: 'What are you researching?', target: 'panel-2' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'leadership',
    number: 3,
    title: 'LEADERSHIP & COMMUNITY',
    subtitle: 'Society president, NaSCon, TEDx, moderation, volunteering',
    cover: '/covers/ep3.webp',
    scene: 'hall',
    plainRole: 'covered',
    panels: [
      {
        header: 'RUNNING THE SOCIETY',
        timestamp: '2025 to present',
        body: "Joined the FAST Outreach & Engagement Society on the social media team, and eight months later was leading it as President for the 2026-27 tenure. Ran Executive Council hiring, and now runs the semester's event calendar jointly with FAST Computing Society: a freshman orientation, a guest-speaker session, and whatever comes after.",
        tags: ['President', 'Leadership', 'FOES'],
        link: null,
      },
      {
        header: 'EVENT HEAD, NASCON',
        // The event ran on 18 October 2026, so this panel is no longer
        // written in the future tense. The C++ FaceOff round, which an
        // earlier pass removed as an unverified claim, is restored: the
        // live LinkedIn record shows it as a completed CS Event Head post
        // from February to July 2026, which is the evidence that pass
        // was missing. The scale figures come from the organiser's own
        // post-event report, not from an estimate.
        timestamp: '2026',
        body: "CS Event Head for Speed Programming at NaSCon, Pakistan's largest student-run computing competition: 99 teams, 270 participants, and a 150,000 rupee prize pool, run with a volunteer panel through a network failure on the day. Ran C++ FaceOff for the same event earlier that year. Alongside it, media and marketing for TEDxFASTIslamabad, and HR Director for Isaar.",
        tags: ['NaSCon', 'Event Management', 'TEDx', 'HR'],
        link: null,
      },
      {
        header: 'MODERATING STRANGERS',
        timestamp: '2024 to present',
        body: 'Two years administering the ProSports Discord community, remotely: enforcing guidelines, mediating disputes, running fan events like the PSL Predictor Challenge, and relaying user feedback into UX suggestions. Also spent a summer there as content coordination intern.',
        tags: ['Community', 'Moderation', 'ProSports'],
        link: null,
      },
      {
        header: 'OFF CAMPUS',
        timestamp: '2019 to 2026',
        body: 'Weeks of thalassemia volunteering with the Sundas Foundation (patient visits, blood drives), then interviews with its director about eliminating the disease in Pakistan. Before that, a water-conservation campaign in Mehra Abadi. Since then, event crew at a Code for Pakistan hackathon and a webinar helping students apply to university.',
        tags: ['Volunteering', 'Sundas Foundation', 'Community'],
        link: null,
      },
    ],
    choicePrompt: 'They say you run the room. Which room?',
    choices: [
      { label: 'What do you actually run?', target: 'panel-0' },
      { label: 'What about outside the society?', target: 'panel-2' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'competitions',
    number: 4,
    title: 'COMPETITIONS',
    subtitle: 'Six hackathons, a national win, and two second places',
    cover: '/covers/ep4.webp',
    scene: 'nightshift',
    plainRole: 'competitions',
    panels: [
      {
        header: 'FIRST NATIONAL ROUND',
        timestamp: '2023',
        body: 'Entered PakCrypt, a three-round national cybersecurity competition run by NCCS at Air University. Cleared registration, screening, and a cryptography problem-solving round to reach the on-campus Amateur Track final. First time competing against people from outside school, and the first sign this was worth taking seriously.',
        tags: ['Cryptography', 'Cybersecurity', 'PakCrypt'],
        link: null,
      },
      {
        header: 'OUTSIDE THE PODIUM',
        timestamp: '2026',
        body: 'Three hackathon weekends in a row ended just outside the podium: fourth at the n8n hackathon S&P Global ran at FAST-NUCES, fifth at CUST, and top four at Barani. Six hackathons went on the board in one year. These were the three that did not finish in the top two.',
        tags: ['Hackathons', 'S&P Global', 'CUST', 'Barani'],
        link: null,
      },
      {
        header: 'PARWANA, SECOND PLACE',
        timestamp: '2026',
        body: "Built in three hours at HackSummer'26 and took second place. It checks a Pakistani overseas-job message against the government's own BEOE register of 5,251 licensed agencies and returns a verdict with a dated evidence chain. No model call sits on the path from message to verdict; six classical extraction stages and a state machine do the work.",
        tags: ['Python', 'Flask', 'Entity Resolution', 'NLP'],
        link: 'https://github.com/itsabdullahaamir/parwana',
      },
      {
        header: 'EDUGAP, SECOND OF A HUNDRED',
        timestamp: '2026',
        body: "Second place out of a hundred teams at the Islamabad regional round of atomcamp's National AI Hackathon, which bought a seat in the national final. EduGap reads a curriculum, scrapes Rozee.pk for live job postings, and reports where the two have drifted apart. Contributed the architecture and planning and led the pitch; the engineering belonged to two teammates.",
        tags: ['RAG', 'Agents', 'Architecture', 'Pitch'],
        link: 'https://github.com/rayyan-41/EduGap_Curriculum-Job-Listings-Gap-Identifier',
      },
      {
        // The only outright win on the whole site. Deliberately states the
        // placement and nothing about the build: the finale project has not
        // been recorded here yet, and a panel that guessed at one would be
        // the exact failure mode src/data/CLAUDE.md warns about.
        header: 'THE NATIONAL FINAL',
        timestamp: '2026',
        body: 'The regional result put the team among the last ten in the country, and the national final of atomcamp’s National AI Hackathon ended in first place. Every other entry on this page is a near-miss of some size. This is the one that was won outright.',
        tags: ['National Final', 'First Place', 'atomcamp'],
        link: null,
      },
      {
        header: 'TAXNET, ONE GRAPH',
        timestamp: '2026',
        body: 'Forty-eight hours, one graph. Entity resolution (phonetic blocking, sentence-transformer matching, IDF-weighted Jaccard, logistic-regression fusion) reaching F1 near 0.90 on 110,000-plus records, then PageRank, community detection and Positive-Unlabeled scoring over it. Same split as EduGap: design input and the presentation, not the pipeline.',
        tags: ['Neo4j GDS', 'Graph ML', 'Architecture', 'Pitch'],
        link: null,
      },
      {
        header: 'PROMPTOPIA, RUNNERS-UP',
        timestamp: '2026',
        body: 'A generative-AI competition run by Google Developer Groups at FAST. Two-person team with Raja Muhammad Ali, one brief: use image generation to build a case about water pollution, then a product deck proposing the fix. Came second; the deck had to sell the idea, not just render it.',
        tags: ['Generative AI', 'Google DGC'],
        link: null,
      },
    ],
    choicePrompt: 'Forty-eight hours, no sleep. Was it worth it?',
    choices: [
      { label: 'Where did the competing start?', target: 'panel-0' },
      { label: 'What did you actually win?', target: 'panel-4' },
      { label: 'Skip ahead.', target: 'next', silent: true },
    ],
  },
  {
    id: 'projects',
    number: 5,
    title: 'PROJECTS',
    subtitle: 'Two cities from scratch and Mario in x86 assembly',
    cover: '/covers/ep5.webp',
    scene: 'workbench',
    plainRole: 'projects',
    panels: [
      {
        header: 'MARIO, IN ASSEMBLY',
        timestamp: '2025',
        body: "Rebuilt Super Mario's mechanics in x86 Assembly using the Irvine32 library, close to from scratch: pixel-perfect collision detection and stack management done by hand. Sixty-two commits across the build, and a demo recording that shows the whole thing running.",
        tags: ['x86 Assembly', 'Irvine32', 'Game Dev'],
        link: 'https://github.com/itsabdullahaamir/MarioInAssemblyAndIrvine',
      },
      {
        header: 'CITYMIND, ONE LIVE GRAPH',
        timestamp: '2026',
        body: 'Five AI algorithms sharing a single live city graph, so a flood or a risk shift propagates and every module re-adapts. Owned the constraint-satisfaction layout solver, the A* emergency router that replans around live flooding, and the feedback loop turning predicted crime risk into road-weight multipliers. Built the dashboard too.',
        tags: ['Python', 'CSP', 'A* Search', 'scikit-learn'],
        link: 'https://github.com/ALI-Z-Ather/CityMind',
      },
      {
        header: 'A CITY IN C++',
        timestamp: '2025',
        body: 'An Islamabad simulation built for a Data Structures course with every structure written from scratch: no STL, no templates, a custom string class. Linked lists, a hash table with separate chaining, a graph running Dijkstra, an N-ary tree of zones down to houses, and a binary heap, across seven city modules.',
        tags: ['C++', 'Data Structures', 'Dijkstra'],
        link: null,
      },
    ],
    choicePrompt: 'Enough talk. What actually shipped?',
    choices: [
      { label: 'Show me something low-level.', target: 'panel-0' },
      { label: 'What about the bigger systems?', target: 'panel-1' },
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
        'Either way: a plumber rebuilt in x86 assembly, and two cities simulated from scratch, one of them a single live graph shared across five AI modules. The weird option was the one that kept getting built.',
    },
  },
];

export const getEpisodeById = (id) => episodes.find((ep) => ep.id === id);

export const getNextEpisode = (id) => {
  const index = episodes.findIndex((ep) => ep.id === id);
  if (index === -1 || index === episodes.length - 1) return null;
  return episodes[index + 1];
};
