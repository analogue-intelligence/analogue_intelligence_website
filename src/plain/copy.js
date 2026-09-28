// -----------------------------------------------------------------------------
// copy.js — the text of the reading version.
//
// The building has its own voice. It is written to be walked around in, one
// object at a time, and it can afford a turn of phrase because you are reading
// three sentences while standing in front of a drone. A research group website
// is read differently. People arrive with a question (what do these people
// work on, can I do a thesis here, who do I email) and want it answered in
// plain sentences.
//
// So this file holds the same facts in direct language. It is separate from
// data/content.js on purpose, so rewriting the website does not rewrite the
// building and vice versa. Every claim here already appears in content.js; no
// new facts have been invented.
//
// House style for this file:
//   1. State the thing. No metaphors, no flourishes.
//   2. No dashes and no colons, except before a list.
//   3. Short sentences. If a sentence needs a comma to survive, split it.
// -----------------------------------------------------------------------------

export const LAB = {
  name: 'Analogue Intelligence Lab',
  strap: 'Software engineering, artificial intelligence, robotics and creative technology',
  affiliation: 'Vrije Universiteit Amsterdam, Faculty of Science',
  intro: [
    'We study how intelligent systems are built and how they behave once they leave the simulator. Software, models, hardware and design are treated as one field of work rather than four separate ones.',
    'The group supervises theses, teaches programming courses, runs public lectures, and works with partners from industry and the arts.',
  ],
};

export const SECTIONS = [
  {
    id: 'projects',
    nav: 'Projects',
    title: 'Projects',
    lead: 'Three current projects, each with working code and published results.',
    cols: 3,
    cards: [
      {
        kicker: 'Robotics',
        title: 'ZEPHYR',
        sub: 'Navigation for drones in cluttered, moving environments',
        body: 'A navigation framework with three modes. One potential field handles open space, a second handles close quarters, and a learned escape policy takes over when the drone is stuck. Tested across six configurations, prepared for ICRA.',
        action: { label: 'Read the code', href: 'zephyr' },
        accent: '#4f7d93',
      },
      {
        kicker: 'Artificial intelligence',
        title: 'ATLAS',
        sub: 'Ranking passes in football from event data',
        body: 'Every available pass is scored with four geometric penalties rather than one learned model, so each ranking can be explained by four numbers. Evaluated on StatsBomb data from Euro 2020 and 2024.',
        action: { label: 'Read the code', href: 'atlas' },
        accent: '#b4547e',
      },
      {
        kicker: 'Creative technology',
        title: 'DAEDALUS',
        sub: 'Generating artwork from poems',
        body: 'Word embeddings of a poem are mapped through a network evolved with NEAT and rendered as vector artwork. Colour comes from CLIP. Results are scored on measures of colourfulness, balance and symmetry.',
        action: { label: 'Read the code', href: 'daedalus' },
        accent: '#8a5aa0',
      },
    ],
  },

  {
    id: 'research',
    nav: 'Research',
    title: 'Research areas',
    lead: 'Four areas, worked on together rather than in separate teams.',
    cols: 4,
    style: 'brief',
    cards: [
      {
        kicker: 'Software engineering',
        title: 'Software engineering',
        body: 'How systems are designed, tested and maintained when they have to run for a long time and change often.',
        accent: '#c97a3a',
      },
      {
        kicker: 'Artificial intelligence',
        title: 'Artificial intelligence',
        body: 'Learning systems that remain understandable after they leave the benchmark they were measured on.',
        accent: '#b4547e',
      },
      {
        kicker: 'Robotics',
        title: 'Robotics and hardware',
        body: 'Control, perception and motion on real machines, where timing, contact and torque limits decide what works.',
        accent: '#4f7d93',
      },
      {
        kicker: 'Creative technology',
        title: 'Creative technology',
        body: 'Generative systems, computer vision and interaction design used as research instruments that produce evidence.',
        accent: '#8a5aa0',
      },
    ],
  },

  {
    id: 'teaching',
    nav: 'Teaching',
    title: 'Teaching',
    lead: 'Two university courses and an open lecture series that anyone can attend.',
    cols: 3,
    cards: [
      {
        kicker: 'Course',
        title: 'Introduction to Python',
        sub: 'First year programming',
        body: 'Variables, control flow, data structures, functions and object oriented programming. A normal university course with enrolment, deadlines and marks.',
        accent: '#c97a3a',
      },
      {
        kicker: 'Course',
        title: 'Applied Programming',
        sub: 'Second course',
        body: 'What to do once a problem is larger than one file. Structuring a project, testing it, versioning it and handing it to someone else.',
        accent: '#c97a3a',
      },
      {
        kicker: 'Open lectures',
        title: 'Open lecture series',
        sub: 'Every three to four weeks, free, no registration',
        body: 'One talk on one mechanism, with time for questions. The first explains what a language model does when it writes. We also run these outside the university.',
        action: { label: 'Ask to be told when', href: 'email' },
        accent: '#5e8a6a',
      },
    ],
  },

  {
    id: 'people',
    nav: 'People',
    title: 'People',
    lead: 'Small teams, usually an engineer, a researcher and an artist on the same problem. The person who answers your first email is the person who runs the work.',
    cols: 2,
    style: 'people',
  },

  {
    id: 'partners',
    nav: 'Partners',
    title: 'Working with us',
    lead: 'We take on a limited number of partnerships so that each one gets real attention.',
    cols: 2,
    cards: [
      {
        kicker: 'What we do',
        title: 'Testing systems where they have to work',
        body: 'We build and test intelligent systems in physical rooms, with the latency, contact and lighting that a model does not assume. The failures worth understanding happen between software, models, hardware and design, and are only visible to a group that works across all four.',
        accent: '#c9822f',
      },
      {
        kicker: 'Track record',
        title: 'Delivered work',
        body: 'Three projects with published results, supervised theses, taught courses and a public workshop programme now in its twenty fifth year. The group sits within the Vrije Universiteit Amsterdam, so partnerships come with research infrastructure, ethics review and students.',
        accent: '#c9822f',
      },
      {
        kicker: 'Open directions',
        title: 'Three directions ready to run',
        body: 'Predictive control for changing environments. Evaluation methods that separate real improvements from changes in how a test set was drawn. Creative computing used as a research instrument. Each one has results in hand and a defined next step.',
        accent: '#c9822f',
      },
      {
        kicker: 'Ways in',
        title: 'How a partnership starts',
        body: 'Bring a problem from your own work, fund one of the directions above, share a student, commission an independent evaluation, or visit. Each route starts with a conversation, then a small pilot either side can step away from. We publish what we find, including results that go against our own methods.',
        accent: '#c9822f',
      },
    ],
  },
];

export const CONTACT = {
  title: 'Contact',
  body: [
    'We take on students looking for a thesis or a project, researchers working on shared questions, and collaborators from industry and the arts.',
    'Write a few sentences about who you are and what interests you. You will get an honest answer about whether there is something here for you and what a sensible first step would be.',
  ],
};
