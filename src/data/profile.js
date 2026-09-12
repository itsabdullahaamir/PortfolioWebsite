/**
 * Structured resume data that is NOT part of the five-episode game
 * surface — spec section 2 rule 3 and section 7's `/plain` requirement.
 *
 * Why this file exists: `episodes.js` is a *curated* narrative surface —
 * it deliberately shows a curated set of panels, not the whole resume.
 * But `/plain` is
 * the recruiter escape hatch and has to be actionable on its own — before
 * this file existed it rendered episode panels plus a hardcoded name, with
 * no contact details, no education, and no skills, so a recruiter who took
 * the escape hatch could not actually email anyone. Everything real that
 * did not earn a panel lives here and is rendered only by `/plain`.
 *
 * Nothing in this file is themed or game-flavored — it is plain resume
 * prose on purpose, because its only consumer is the plain document.
 *
 * `highlights` (new, the `/plain` Dossier rebuild): four numbers for the
 * "10-second band" at the top of the document — the stat row a recruiter
 * sees before reading a single sentence of prose. These are facts that
 * already exist elsewhere in this file (rank/CGPA in `education[]`, TA
 * course count derivable from `experience[]`, hackathon placements in
 * `awards[]`) restated as short display-face values rather than a new
 * source of truth, so PlainResume.jsx never hardcodes a number in JSX —
 * per the standing "no component may hardcode copy" rule, a stat number
 * is copy too.
 */

export const profile = {
  name: 'Abdullah Aamir',

  // Headshot for the /plain Dossier's identity block. A bare filename in
  // `public/` — PlainResume.jsx resolves it against import.meta.env.BASE_URL
  // (so it works under the GitHub Pages `/PortfolioWebsite/` subpath) and
  // hides the frame entirely if the file is missing, same
  // graceful-degradation pattern as the not-yet-drawn episode cover art.
  // Set to null to remove the photo without touching the component.
  photo: 'portrait.jpg',

  headline: 'President @ Meri Kahani (FOES) · CS @ FAST ’28',
  summary:
    'Computer Science undergraduate at FAST-NUCES, ranked first in a cohort of 313 on a 3.96 CGPA. Research assistant on an HEC-funded project linking disease incidence to weather and disaster patterns in Pakistan, teaching assistant across five courses, and a two-time hackathon runner-up. Works mostly on graph machine learning, entity resolution, and software that has to keep working offline.',

  highlights: [
    // '#1' rather than '1 / 313': at 375px the tile gives the value 130px
    // of content width, and '1 / 313' in the 40px display face needs more
    // than that, so it wrapped to two lines and rendered the first tile
    // 107px tall against 53px for the other three — a visibly ragged row.
    // The denominator moves into the label, which is small enough to fit
    // on one line. Same fact, no information lost.
    { value: '#1', label: 'Of 313 in cohort' },
    { value: '3.96', label: 'CGPA · 73 credits' },
    { value: '5', label: 'Courses TA’d' },
    { value: '2×', label: 'Hackathon runner-up' },
  ],

  contact: {
    email: 'i240574@isb.nu.edu.pk',
    location: 'Islamabad, Pakistan',
    links: [
      { label: 'GitHub', url: 'https://github.com/itsabdullahaamir' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/itsabdullahaamir' },
    ],
  },

  education: [
    {
      credential: 'BS Computer Science',
      institution: 'FAST-NUCES, Islamabad',
      timespan: 'Aug 2024 to 2028 (expected)',
      detail:
        'Cumulative CGPA 3.96/4.00, ranked 1st in a cohort of 313. Perfect 4.00 SGPA in Fall 2025 (Rector’s List). 73 credit hours as of Spring 2026; currently in the fifth semester.',
      coursework:
        'Artificial Intelligence (A+), Software Design & Analysis (A+), Theory of Automata (A+), Discrete Structures (A+), Computer Organization & Assembly Language (A), Data Structures (A), Operating Systems (A), Linear Algebra (A), Probability & Statistics (A), Database Systems (A−). In progress (Fall 2026): Design & Analysis of Algorithms, Computer Networks, Computer Architecture, Applied Human-Computer Interaction, Technical & Business Writing.',
    },
    {
      credential: 'A Levels',
      institution: 'The Science School, Islamabad',
      timespan: 'Jul 2022 to May 2024',
      detail:
        '1 A*, 2 A. Finalist, PakCrypt 2023. Founded the "Badlao" welfare society. Head of Administration for the school bonfire; administration and announcements for the sports gala and an earthquake-relief bake sale.',
      coursework: null,
    },
    {
      credential: 'O Levels / IGCSE',
      institution: 'The Science School, Islamabad',
      timespan: 'Jun 2017 to Jun 2022',
      detail:
        '7 A*, 2 A. 3rd place, interschool English Poetry Writing & Recitation (Senior Category).',
      coursework: null,
    },
  ],

  skills: [
    { group: 'Languages', items: ['Python', 'C++', 'SQL (Cypher/Neo4j)', 'x86 Assembly', 'Dart', 'LaTeX'] },
    {
      group: 'ML & Data Science',
      items: [
        'scikit-learn',
        'Entity resolution',
        'Classification',
        'Feature extraction',
        'PU learning',
        'RAG',
        'Agents',
        'Statistical analysis',
      ],
    },
    {
      group: 'Graph & Spatial',
      items: [
        'Neo4j GDS',
        'PageRank',
        'Community detection',
        'Centrality measures',
        'Knowledge graphs',
        'Link prediction',
        'Spatial modeling',
      ],
    },
    {
      group: 'Foundations',
      items: ['Linear algebra', 'Probability & statistics', 'Graph theory', 'Algorithm analysis'],
    },
    { group: 'Tools', items: ['Linux', 'Git', 'FastAPI', 'Flask', 'Flutter', 'Jupyter', 'SQLite'] },
    {
      group: 'Other',
      items: ['Event management', 'HR operations', 'Community management', 'Public speaking', 'Technical writing'],
    },
  ],

  awards: [
    'Gold Medal, Fall 2025: 1st position, perfect 4.00 SGPA (Rector’s List).',
    'Gold Medal, Fall 2024: top academic performance.',
    'Silver Medal, Spring 2025: top academic performance.',
    '2nd place, HackSummer’26 (Microsoft Club & Canva Student Community, GIKI).',
    '2nd place and national finalist (top 10 in Pakistan), atomcamp National AI Hackathon ’26.',
    'Runners-up, Promptopia ’26 (generative-AI competition, Google Developer Groups, FAST-NUCES).',
    '2nd Best Delegate, AIESEC Islamabad Youth Speak Forum ’25.',
    'Finalist, PakCrypt Amateur Round 2023 (NCCS, Air University Islamabad).',
  ],

  experience: [
    {
      role: 'Research Assistant',
      org: 'Parallel Computing Networks Lab, FAST-NUCES',
      timespan: 'Jul 2026 to present',
      detail:
        'Working on CHIP, an HEC-funded project investigating the relationship between disease incidence and weather and natural-disaster patterns in Pakistan. Sourcing and cleaning sparse, poorly documented national health and climate data, constructing a knowledge graph over it, and training a disease-prediction model on that structure.',
    },
    {
      role: 'Research Collaborator, Image Processing',
      org: 'FAST-NUCES, with a faculty advisor',
      timespan: '2026 to present',
      detail:
        'Early-stage research using medical image analysis and feature-extraction techniques to identify why knee surgeries fail. Scope and individual contribution are still being defined.',
    },
    {
      role: 'Teaching Assistant',
      org: 'Department of Computer Science, FAST-NUCES',
      timespan: 'Aug 2025 to present',
      detail:
        'TA for Linear Algebra, Operating Systems, and Programming Fundamentals (Aug 2026 to present); previously Object Oriented Programming and Discrete Structures (Jan to Jun 2026), and an earlier round of Programming Fundamentals (Aug to Dec 2025). Led tutorials on recursion, graph traversals, and memory management for 100+ students; designed and graded technical assessments.',
    },
    {
      role: 'President (prev. Social Media Team)',
      org: 'FAST Outreach & Engagement Society (Meri Kahani)',
      timespan: 'Oct 2025 to present',
      detail:
        'Campus lead for the 2026-27 tenure. Ran Executive Council hiring; leads campus outreach and engagement, running the semester calendar jointly with FAST Computing Society, including a freshman orientation event and a guest-speaker session.',
    },
    {
      role: "CS Event Head",
      org: "NaSCon, FAST-NUCES",
      timespan: "2026 (upcoming)",
      detail:
        "Event Head for Speed Programming at Pakistan’s largest student-run computing competition. Responsible for setting problem sets and rules, briefing the volunteer panel, coordinating with sponsors and judges, and running the event on competition day.",
    },
    {
      role: 'Director of Human Resources',
      org: 'Isaar',
      timespan: 'Jul 2025 to present',
      detail:
        'Promoted from Deputy Director of HR. Manages HR queries across all Islamabad chapters and coordinates between them.',
    },
    {
      role: 'Media & Marketing Executive',
      org: 'TEDxFASTIslamabad',
      timespan: 'Dec 2025 to Feb 2026',
      detail:
        'Ran social and print promotion on the media and marketing team (content calendar, speaker-announcement graphics, and day-of coverage) in the run-up to the event.',
    },
    {
      role: 'Discord Server Administrator, then Content Coordination Intern',
      org: 'ProSports',
      timespan: 'Jul 2024 to present',
      detail:
        'Discord server administrator since Jul 2024; content coordination intern Jun to Sep 2025. Moderated user-generated content and enforced community guidelines; mediated disputes; organized community events including a PSL Predictor Challenge; relayed user feedback into UX suggestions.',
    },
    {
      role: 'Buddy Program Teacher',
      org: 'FAST Computing Society',
      timespan: 'Oct 2025 to Jun 2026',
      detail:
        'Paired with junior students to re-teach CS courses already passed: weekly problem sessions on programming fundamentals and data structures, plus exam-prep walkthroughs.',
    },
  ],

  alsoBuilt: [
    {
      name: 'Economic Price Similarity Network Analysis',
      detail:
        'Modeled inter-city market connectivity from Pakistani CPI data as a graph, ranking cities by betweenness, closeness, and eigenvector centrality. Python, NetworkX, pandas.',
      url: null,
    },
    {
      name: 'Governance Crisis: group research report',
      detail:
        'A 21-page report on the governance crisis caused by weak bureaucracy under corruption and political interference.',
      url: null,
    },
    {
      name: 'Cricnalize',
      detail:
        'Early-stage tool for automated, real-time cricket analytics: ball-by-ball ingestion feeding running win-probability and player-form estimates. Prototype stage.',
      url: null,
    },
    {
      name: 'Assembly lab codes',
      detail: 'FAST Assembly lab tasks, Fall 2025.',
      url: 'https://github.com/itsabdullahaamir/AssemblyLabCodes',
    },
  ],

  volunteering: [
    {
      role: 'Notes & Video Contributor',
      org: 'ZNotes',
      timespan: 'Mar 2023 to Aug 2024',
      detail:
        'Wrote curriculum-aligned IGCSE Computer Science and CAIE A2 Physics revision notes; created topic-explainer and past-paper video content. Peer educator supporting UN SDG4.',
    },
    {
      role: 'Volunteer',
      org: 'Sundas Foundation',
      timespan: '2025',
      detail:
        'Weeks of thalassemia volunteering (patient visits and blood drives) plus leadership interviews with the Director and Head of Islamabad Operations.',
    },
    {
      role: 'Head of Communications & Outreach',
      org: '"Badlao" Cloth Drive',
      timespan: 'Dec 2022 to Jan 2023',
      detail:
        'Co-founded a welfare drive collecting unused clothes for flood- and cold-affected people, donated via Akhuwat Foundation.',
    },
    {
      role: 'Volunteer',
      org: 'Code for Pakistan Hackathon',
      timespan: '2026',
      detail:
        'Event operations on a seven-person crew across the civic-tech hackathon: participant check-in, team logistics, and mentor scheduling over the weekend.',
    },
    {
      role: 'Panelist',
      org: 'Help 4 Help university applications webinar',
      timespan: '2024',
      detail:
        'Panelist on a student-run webinar for university applicants: walked through program selection, the FAST admission test, and scholarship options, then took live questions.',
    },
    {
      role: 'Facilitator',
      org: 'Water Awareness Campaign, Mehra Abadi',
      timespan: 'Jan 2019 to May 2019',
      detail:
        'Ran door-to-door and small-group sessions in the neighbourhood on household water wastage and low-cost saving measures, with follow-up visits to check uptake.',
    },
  ],

  certifications: [
    'Leveraging Generative AI for Project Management (Project Management Institute)',
    'Generative AI Overview for Project Managers (Project Management Institute)',
  ],
};
