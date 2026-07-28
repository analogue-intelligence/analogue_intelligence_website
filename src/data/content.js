// -----------------------------------------------------------------------------
// content.js — everything the building can say.
//
// Geometry never holds copy. A room file places a drone and calls it
// 'ex_zephyr'; what the drone *says* lives here. Edit freely — nothing in
// world/ or ui/ needs to change when you rewrite a paragraph.
//
// ⚠ LINKS: these point at the analogue-intelligence org with the repository
// names the projects are most likely to use. Check them before you ship.
// -----------------------------------------------------------------------------

export const ORG = 'https://github.com/analogue-intelligence';
export const EMAIL = 'mailto:hello@analogue-intelligence.org';

export const CATEGORIES = {
  vision: { label: 'The Lab', color: '#c9a24a' },
  software: { label: 'Software Engineering', color: '#c97a3a' },
  ai: { label: 'Artificial Intelligence', color: '#b4547e' },
  robotics: { label: 'Robotics & Hardware', color: '#4f7d93' },
  creative: { label: 'Creative Technology', color: '#8a5aa0' },
  people: { label: 'The Team', color: '#5e8a6a' },
  contact: { label: 'Get In Touch', color: '#c9822f' },
};

// RESTBENCH and GUARDIAN were removed from the Hall of Fame at the author's
// request. To put either back: restore its entry here and add a row to EXHIBITS
// in world/rooms/hall.js — the plinth, spotlight and lamp are generated from
// that row, so nothing else needs touching.
export const CONTENT = {
  // ======================================================= HALL OF FAME ====
  ex_zephyr: {
    category: 'robotics',
    title: 'ZEPHYR',
    tag: 'A quadrotor, mid-hover',
    subtitle: 'Zonal Escape and Potential Hybrid Routing',
    body: [
      'A tri-mode navigation framework for UAVs flying through cluttered, moving environments. A Gaussian subharmonic potential field handles open space, an inverse-power field handles close quarters, and a learned PPO escape policy takes over when the drone gets pinned.',
      'The interesting part is the mode controller. A reactive Schmitt trigger switches too late in dynamic scenes, so the current version rolls the plan forward and switches on what is about to happen rather than what already has.',
      'Ablations across six configurations show a Pareto trade-off rather than a clean win: the full stack gives the best path smoothness and obstacle clearance, while the escape policy recovers from every freeze it is handed but is limited by how quickly a freeze is detected in the first place.',
    ],
    action: { label: 'Read the code →', href: `${ORG}/zephyr` },
  },

  ex_atlas: {
    category: 'ai',
    title: 'ATLAS',
    tag: 'A scuffed match ball',
    subtitle: 'Action Target Landscape Analysis System',
    body: [
      'A pass-ranking framework that scores every available option on the pitch using four geometric penalties — triangle, vector, radius and direction — instead of an opaque learned scorer.',
      'Evaluated on StatsBomb event data from Euro 2020 and 2024, with hit-rate at three as the primary metric, plus ablations and sensitivity analysis over each penalty term.',
      'The aim is a model a coach can argue with: every ranking decomposes into four numbers you can point at on a diagram.',
    ],
    action: { label: 'Read the code →', href: `${ORG}/atlas` },
  },

  ex_daedalus: {
    category: 'creative',
    title: 'DAEDALUS',
    tag: 'A print still drying',
    subtitle: 'Poems, embedded and drawn',
    body: [
      'A generative system that reads a poem, maps its word embeddings through a CPPN evolved with NEAT, and renders the result as vector artwork scored on analytic aesthetic measures.',
      'Colour comes from CLIP, which needed a mean-centring fix before it would stop collapsing every poem onto the same three hues. Fitness combines colourfulness, balance and symmetry terms drawn from the image-aesthetics literature.',
      'Somewhere between a research artefact and a printmaking studio: the same pipeline produces the paper and the plots in it.',
    ],
    action: { label: 'Read the code →', href: `${ORG}/daedalus` },
  },



  ex_origin: {
    category: 'vision',
    title: 'Analogue Intelligence Lab',
    tag: 'Nested squares, glowing faintly',
    subtitle: 'Software Engineering for Creative & Physical Systems',
    body: [
      'A research group at the intersection of software engineering and creative computing, studying how intelligent systems are built, embodied, and understood.',
      'We treat models, hardware, engineering and art as one practice rather than four departments. Less interested in intelligence measured on a leaderboard than in intelligence that holds up in a room with furniture in it.',
    ],
  },

  // ========================================================= ROBOTICS ======
  rb_arm: {
    category: 'robotics',
    title: 'The arm',
    tag: 'Six axes, currently idle',
    body: [
      'A manipulator is the cheapest way to find out whether a policy actually understands what it is doing. Simulation forgives a plan that is nearly right; a gripper does not.',
      'Most of what we learn here is about the gap: reward shaping that looked principled in a notebook, curriculum stages that collapse the moment contact dynamics enter the picture.',
    ],
  },
  rb_quadruped: {
    category: 'robotics',
    title: 'Legged locomotion',
    tag: 'A quadruped, powered down',
    body: [
      'Walking is a controlled fall that keeps being interrupted. Legged platforms are where reinforcement learning stops being an optimisation problem and becomes a question about balance, latency and torque limits.',
    ],
  },
  rb_dronecage: {
    category: 'robotics',
    title: 'The flight cage',
    tag: 'Netting, scuffed props, spare batteries',
    body: [
      'Where ZEPHYR gets tested against things that move. Every scenario in the ablation study started as a taped-out floor plan in here.',
      'The failure taxonomy on the whiteboard came from watching the same crash happen four different ways and finally admitting they were four different failures.',
    ],
  },
  rb_bench: {
    category: 'robotics',
    title: 'The bench',
    tag: 'Solder, spare parts, a scope',
    body: [
      'Nothing in the lab reaches a plinth without spending time here first. The oscilloscope settles most arguments faster than the logs do.',
    ],
  },

  // =========================================================== STUDIO ======
  st_plotter: {
    category: 'creative',
    title: 'The pen plotter',
    tag: 'Mid-drawing, ink still wet',
    body: [
      'Where DAEDALUS output stops being an SVG and starts being an object. A plotter is an unforgiving critic: a composition that reads well on a screen often falls apart at pen width.',
    ],
  },
  st_mediawall: {
    category: 'creative',
    title: 'The media wall',
    tag: 'Four feeds, one signal chain',
    body: [
      'Real-time work — TouchDesigner patches, camera feeds, shader sketches. Most of the lab\'s creative research starts with a signal and asks what a machine can make of it.',
    ],
  },
  st_easel: {
    category: 'creative',
    title: 'Generative prints',
    tag: 'A wall of near-misses',
    body: [
      'Every print here is a member of a population that was scored, ranked and mostly discarded. Aesthetic fitness functions are opinions written in arithmetic, and hanging the results is how we check whose opinion the arithmetic encoded.',
    ],
  },
  st_p5table: {
    category: 'creative',
    title: 'Teaching table',
    tag: 'Sketchbooks and laptops',
    body: [
      'Workshop material lives here — including the p5.js random-walker sessions we run for Processing Community Day.',
      'The walker is the best first program in creative coding: four lines of code, and immediately you are arguing about probability distributions.',
    ],
  },

  // ========================================================== LIBRARY ======
  lib_software: {
    category: 'software',
    title: 'Software Engineering',
    tag: 'A worn technical volume',
    body: [
      'The scaffolding. Systems that scale, adapt, and hold up under real load.',
      'Reliable architecture is the precondition for everything else in the building — the models, the robots and the art all run on top of it.',
    ],
  },
  lib_ai: {
    category: 'ai',
    title: 'Artificial Intelligence',
    tag: 'A book that hums faintly',
    body: [
      'The reasoning. Models that learn, adapt, and occasionally surprise us.',
      'We care about learning systems that stay legible once they leave the benchmark and meet the world.',
    ],
  },
  lib_robotics: {
    category: 'robotics',
    title: 'Robotics & Hardware',
    tag: 'A heavy, oil-stained manual',
    body: [
      'The body. Intelligence given weight, motion, and consequence.',
      'When a system has to move, balance and act, the gap between a clever idea and a working one becomes physical.',
    ],
  },
  lib_creative: {
    category: 'creative',
    title: 'Creative Technology',
    tag: 'A hand-bound sketchbook',
    body: [
      'The play. Where the research becomes something you can feel.',
      'Generative art, computer vision and interaction design — the surface where the lab\'s ideas become experiences rather than papers.',
    ],
  },
  lib_theses: {
    category: 'vision',
    title: 'Theses and drafts',
    tag: 'Bound, spiral-bound, unbound',
    body: [
      'Student work, in every state of completion. We supervise theses and projects across all four shelves, and the best ones tend to start from something that annoyed the student personally.',
    ],
    action: { label: 'Ask about a thesis →', href: EMAIL },
  },
  lib_globe: {
    category: 'vision',
    title: 'How the lab works',
    tag: 'A well-travelled globe',
    body: [
      'Small mixed teams — an engineer, a researcher, and often an artist on the same problem.',
      'Ideas move from a whiteboard to something running quickly, because we would rather learn from a rough prototype than a polished proposal.',
    ],
  },

  // ============================================================ LOBBY ======
  lb_espresso: {
    category: 'vision',
    title: 'The machine',
    tag: 'Hissing, slightly overdue a service',
    body: [
      'Every project in the Hall of Fame was argued into existence within two metres of this thing.',
    ],
  },
  lb_board: {
    category: 'contact',
    title: 'The lab is open',
    tag: 'A pinned notice board',
    body: [
      'We take on students looking for a thesis or a project, researchers working on shared questions, and collaborators from industry and the arts.',
      'If our work speaks to yours, we would be glad to hear from you.',
    ],
    action: { label: 'Get in touch →', href: EMAIL },
  },
  lb_gramophone: {
    category: 'creative',
    title: 'Signal and sound',
    tag: 'An old brass horn',
    body: [
      'The oldest signal-processing device in the building, and still the most legible: a groove, a needle, a cone, and no software anywhere in the chain.',
    ],
  },
};

export const TITLE = 'Analogue Intelligence';
export const SUBTITLE = 'Software Engineering and AI for Creative & Physical Systems';
