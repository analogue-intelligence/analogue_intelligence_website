// -----------------------------------------------------------------------------
// content.js — the single source of truth for everything the room can "say".
// Edit copy here; the world and UI read from these objects. Nothing hardcoded
// in the geometry files.
// -----------------------------------------------------------------------------

// Category → accent colour. Reused for object labels, modal headers, and the
// glow tint of the object when it enters the light. Same palette as the site.
export const CATEGORIES = {
  vision:    { label: 'Vision',              color: '#3a0ca3' }, // indigo
  software:  { label: 'Software Engineering', color: '#fb5607' }, // orange
  ai:        { label: 'Artificial Intelligence', color: '#f72585' }, // magenta
  robotics:  { label: 'Robotics & Hardware', color: '#1d2b53' }, // navy
  creative:  { label: 'Creative Technology',  color: '#7b2cbf' }, // purple
  contact:   { label: 'The Lab',              color: '#ffb703' }, // amber
};

// Interactable payloads. `id` links a piece of geometry to its content.
// `title` is the modal heading, `body` is an array of paragraphs, `tag` is the
// short line shown on the floating label in-world.
export const CONTENT = {
  vision_desk: {
    category: 'vision',
    title: 'Analogue Intelligence',
    tag: 'The reading desk',
    body: [
      'A research group studying how intelligent systems are built, embodied, and understood.',
      'We treat software engineering and creative computing as a single practice — where machine learning, hardware, robotics, and creative technology shape one another rather than standing apart.',
      'Less interested in intelligence measured by benchmarks than in intelligence that holds up in the physical world: engineered, embodied, and felt.',
    ],
  },

  book_software: {
    category: 'software',
    title: 'Software Engineering',
    tag: 'A worn technical volume',
    body: [
      'The scaffolding. Systems that scale, adapt, and hold up under real load.',
      'Reliable architecture is the precondition for everything else in the lab — the models, the robots, and the art all run on top of it.',
    ],
  },

  book_ai: {
    category: 'ai',
    title: 'Artificial Intelligence',
    tag: 'A book that hums faintly',
    body: [
      'The reasoning. Models that learn, adapt, and occasionally surprise us.',
      'We care about learning systems that stay legible and useful once they leave the benchmark and meet the world.',
    ],
  },

  book_robotics: {
    category: 'robotics',
    title: 'Robotics & Hardware',
    tag: 'A heavy, oil-stained manual',
    body: [
      'The body. Intelligence given weight, motion, and consequence.',
      'When a system has to move, balance, and act, the gap between a clever idea and a working one becomes physical.',
    ],
  },

  book_creative: {
    category: 'creative',
    title: 'Creative Technology',
    tag: 'A hand-bound sketchbook',
    body: [
      'The play. Where the research becomes something you can feel.',
      'Generative art, computer vision, and interaction design — the surface where the lab\'s ideas become experiences rather than papers.',
    ],
  },

  globe: {
    category: 'vision',
    title: 'How the lab works',
    tag: 'A well-travelled globe',
    body: [
      'We work in small, mixed teams — an engineer, a researcher, and often an artist on the same problem.',
      'Ideas move quickly from a whiteboard to something running, because we\'d rather learn from a rough prototype than a perfect proposal.',
    ],
  },

  gramophone: {
    category: 'creative',
    title: 'Signal & sound',
    tag: 'An old brass gramophone',
    body: [
      'A lot of the lab\'s creative work starts with a signal — audio, motion, an image feed — and asks what a machine can make of it.',
      'This corner is where experiments in sound, vision, and generative media tend to begin.',
    ],
  },

  contact_board: {
    category: 'contact',
    title: 'The lab is open',
    tag: 'A pinned notice board',
    body: [
      'We welcome students looking for a thesis or project, researchers exploring shared questions, and collaborators from industry and the arts.',
      'If our work speaks to yours, we\'d be glad to hear from you.',
    ],
    action: { label: 'Get in touch →', href: 'mailto:hello@analogue-intelligence.org' },
  },
};

export const TITLE = 'Analogue Intelligence';
export const SUBTITLE = 'The other AI.';
