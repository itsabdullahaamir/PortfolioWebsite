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
 */

export const profile = {
  name: 'Abdullah Aamir',
  headline: 'President @ Meri Kahani (FOES) · CS @ FAST ’28',
  summary:
    'Computer Science undergraduate at FAST-NUCES, ranked first in a cohort of 313. Works mostly on graph machine learning, entity resolution, and things that have to keep working offline. Teaches four courses as a TA and builds under hackathon time pressure for fun.',

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
      timespan: 'Aug 2024 — 2028 (expected)',
      detail:
        'Cumulative CGPA 3.96/4.00, ranked 1st in a cohort of 313. Perfect 4.00 SGPA in Fall 2025 (Rector’s List). 73 credit hours as of Spring 2026.',
      coursework:
        'Artificial Intelligence (A+), Software Design & Analysis (A+), Theory of Automata (A+), Discrete Structures (A+), Computer Organization & Assembly Language (A), Data Structures (A), Operating Systems (A), Linear Algebra (A), Probability & Statistics (A), Database Systems (A−).',
    },
    {
      credential: 'A Levels',
      institution: 'The Science School, Islamabad',
      timespan: 'Jul 2022 — May 2024',
      detail: '1 A*, 2 A. Finalist, PakCrypt 2023. Founded the "Badlao" welfare society.',
      coursework: null,
    },
    {
      credential: 'O Levels / IGCSE',
      institution: 'The Science School, Islamabad',
      timespan: 'Jun 2017 — Jun 2022',
      detail:
        '7 A*, 2 A. 3rd place, interschool English Poetry Writing & Recitation (Senior Category).',
      coursework: null,
    },
  ],

  skills: [
    { group: 'Languages', items: ['Python', 'C++', 'SQL (Cypher/Neo4j)', 'x86 Assembly', 'Dart', 'LaTeX'] },
    {
      group: 'ML & Data Science',
      items: ['scikit-learn', 'Entity resolution', 'Classification', 'PU learning', 'RAG', 'Agents', 'Statistical analysis'],
    },
    {
      group: 'Graph & Spatial',
      items: ['Neo4j GDS', 'PageRank', 'Community detection', 'Centrality measures', 'Knowledge graphs', 'Spatial modeling'],
    },
    {
      group: 'Foundations',
      items: ['Linear algebra', 'Probability & statistics', 'Graph theory', 'Algorithm analysis'],
    },
    { group: 'Tools', items: ['Linux', 'Git', 'FastAPI', 'Flask', 'Flutter', 'Jupyter'] },
  ],

  awards: [
    'Gold Medal, Fall 2025 — 1st position, perfect 4.00 SGPA (Rector’s List).',
    'Gold Medal, Fall 2024 — top academic performance.',
    'Silver Medal, Spring 2025 — top academic performance.',
    '2nd place, HackSummer’26 (Microsoft Club & Canva Student Community, GIKI).',
    '2nd place and national finalist (top 10 in Pakistan), atomcamp National AI Hackathon ’26.',
    '2nd Best Delegate, AIESEC Islamabad Youth Speak Forum ’25.',
    'Finalist, PakCrypt Amateur Round 2023 (NCCS, Air University Islamabad).',
  ],

  experience: [
    {
      role: 'Research Assistant',
      org: 'Parallel Computing Networks Lab, FAST-NUCES',
      timespan: 'Jul 2026 — Present',
      detail:
        'Knowledge graph construction and relational data modeling; graph connectivity patterns and link prediction for large-scale networked datasets. Co-authoring an unpublished paper on image-processing methods for visual data analysis and feature extraction with a faculty advisor.',
    },
    {
      role: 'Teaching Assistant',
      org: 'Department of Computer Science, FAST-NUCES',
      timespan: 'Aug 2025 — Present',
      detail:
        'TA for Linear Algebra, Object Oriented Programming, Discrete Structures, and Programming Fundamentals. Led tutorials on recursion, graph traversals, and memory management for 100+ students; designed and graded technical assessments.',
    },
    {
      role: 'President (prev. Social Media Team)',
      org: 'FAST Outreach & Engagement Society (Meri Kahani)',
      timespan: 'Oct 2025 — Present',
      detail: 'Campus lead for the 2026-27 tenure. Ran Executive Council hiring; leads campus outreach and engagement.',
    },
    {
      role: 'CS Event Head',
      org: 'NaSCon, FAST-NUCES',
      timespan: 'Feb 2026 — Present',
      detail:
        'Event Head for Speed Programming and, before it, C++ FaceOff at Pakistan’s largest student-run computing competition.',
    },
    {
      role: 'Director of Human Resources',
      org: 'Isaar',
      timespan: 'Jul 2025 — Present',
      detail:
        'Promoted from Deputy Director of HR. Manages HR queries across all Islamabad chapters and coordinates between them.',
    },
    {
      role: 'Media & Marketing Executive',
      org: 'TEDxFASTIslamabad',
      timespan: 'Dec 2025 — Feb 2026',
      detail: 'Media and marketing for the event.',
    },
    {
      role: 'Discord Server Administrator, then Content Coordination Intern',
      org: 'ProSports',
      timespan: 'Jul 2024 — Present',
      detail:
        'Moderated user-generated content and enforced community guidelines; mediated disputes; organized community events including a PSL Predictor Challenge; relayed user feedback into UX suggestions.',
    },
    {
      role: 'Buddy Program Teacher',
      org: 'FAST Computing Society',
      timespan: 'Oct 2025 — Jun 2026',
      detail: 'Peer-taught previously studied CS courses to current students.',
    },
  ],

  alsoBuilt: [
    {
      name: 'Economic Price Similarity Network Analysis',
      detail:
        'Modeled nationwide market connectivity using graph centrality on CPI data across Pakistani cities to surface non-linear spatial patterns, with a visualization interface for temporal geographic shifts.',
      url: null,
    },
    {
      name: 'CityMind — AI City Management System',
      detail:
        'Applied course search algorithms from optimal city design through to real-time route re-routing over an evolving search space.',
      url: null,
    },
    {
      name: 'PocketMunshi landing page',
      detail:
        'Static single-page site styled as a paper ledger. Vanilla HTML/CSS/JS, no build step, deployed on Cloudflare Pages. Fluid clamp() sizing, honors prefers-reduced-motion, semantic landmarks and lang/dir attributes on Urdu text.',
      url: null,
    },
    {
      name: 'Cricnalize',
      detail: 'Early-stage automated, real-time cricket analytics.',
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
      timespan: 'Mar 2023 — Aug 2024',
      detail:
        'Wrote curriculum-aligned IGCSE Computer Science and CAIE A2 Physics revision notes; created topic-explainer and past-paper video content. Peer educator supporting UN SDG4.',
    },
    {
      role: 'Volunteer',
      org: 'Sundas Foundation',
      timespan: '2025',
      detail:
        'Weeks of thalassemia volunteering — patient visits and blood drives — plus leadership interviews with the Director and Head of Islamabad Operations.',
    },
    {
      role: 'Head of Communications & Outreach',
      org: '"Badlao" Cloth Drive',
      timespan: 'Dec 2022 — Jan 2023',
      detail:
        'Co-founded a welfare drive collecting unused clothes for flood- and cold-affected people, donated via Akhuwat Foundation.',
    },
    {
      role: 'Volunteer',
      org: 'Code for Pakistan Hackathon',
      timespan: '2026',
      detail: 'Event operations support alongside a seven-person crew.',
    },
    {
      role: 'Facilitator',
      org: 'Water Awareness Campaign, Mehra Abadi',
      timespan: 'Jan 2019 — May 2019',
      detail: 'Ran community sessions on water wastage and water-saving techniques.',
    },
  ],

  certifications: [
    'Leveraging Generative AI for Project Management — Project Management Institute',
    'Generative AI Overview for Project Managers — Project Management Institute',
  ],
};
