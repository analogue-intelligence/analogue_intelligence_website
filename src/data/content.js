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
// lb_espresso was removed: its floating label overlapped the Curator. To bring
// it back, restore the entry and the ctx.interact() call in rooms/lobby.js, but
// move the machine along the bar first.
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
      'Colour comes from CLIP. Fitness combines colourfulness, balance and symmetry terms drawn from the image-aesthetics literature.',
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
      'The nested squares are for Josef Albers, who spent decades proving that a colour is never one thing on its own.',
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

  // ------------------------------------------------------- partners room ----
  // Five panels, not nine. The room is a pitch: it should read as confident and
  // specific, lead with what a partner gains, and never spend a paragraph on
  // what we refuse. Independence is stated once, as a reason to trust the
  // findings, rather than as a list of things not for sale.
  pt_thesis: {
    category: 'contact', title: 'What we do', tag: 'The work',
    subtitle: 'Intelligence that holds up outside the benchmark',
    body: [
      'Analogue Intelligence builds and tests intelligent systems in the place they actually have to work: a physical room, with latency in it, and contact, and light that is never quite what the model assumed.',
      'We do this by refusing the usual separation of software, models, hardware and design into different teams. The failures worth understanding happen at the seams between them, and they are only visible to a group that works across all four.',
      'The timing is favourable. Raw capability is no longer the limiting factor in this field \u2014 deployment and honest evaluation are, and the cost of running real physical experiments has fallen far enough that a focused group can answer questions that used to need an industrial lab.',
    ],
  },
  pt_evidence: {
    category: 'contact', title: 'Track record', tag: 'Evidence',
    subtitle: 'Delivered work, and the building it was made in',
    body: [
      'Three projects stand on plinths in the Hall of Fame, and the hardware they ran on is in the room next door: a tri-mode UAV navigation framework prepared for ICRA, a geometric pass-ranking system evaluated on international match data, and a generative design system submitted to the evolutionary computation community.',
      'Alongside them: supervised theses, taught courses, and a public workshop programme now in its twenty-fifth year. The group delivers on schedule, which is the least glamorous and most relevant thing a partner can know about it.',
      'We sit within the Vrije Universiteit Amsterdam, Faculty of Science \u2014 so partnerships come with research infrastructure, ethics review, an excellent supply of students, and an institution that will still be here in ten years.',
    ],
    action: { label: 'See the projects \u2192', href: '#hall' },
  },
  pt_people: {
    category: 'people', title: 'Who you work with', tag: 'The group',
    subtitle: 'Senior people, directly',
    body: [
      'This is a small group inside a large university, and that is the offer. The person who answers your first email is the person who will run the work \u2014 no account management, no queue between you and someone who understands the problem.',
      'It also means we take on a limited number of partnerships and give each of them real attention. We would rather say that at the start than have you discover it halfway through.',
      'Walk around and talk to whoever is on the floor. They will describe what they are working on far better than any page of biographies.',
    ],
  },
  pt_directions: {
    category: 'contact', title: 'What support unlocks', tag: 'Roadmap',
    subtitle: 'Three directions, ready to run',
    body: [
      'Predictive control for dynamic environments \u2014 navigation that acts on where a scene is heading rather than where it is. Proven in simulation and ready for sustained hardware trials.',
      'Evaluation methodology \u2014 separating genuine modelling improvements from changes in how a test set was drawn. The groundwork is done; it needs funded researchers to carry it.',
      'Creative computing as a research instrument \u2014 treating generative systems as experiments that produce evidence, not just outputs. Results in hand, ready to be written up and published.',
      'Each of these is a defined piece of work with a clear next step, so support translates into something specific and visible rather than into general capacity.',
    ],
  },
  pt_partnership: {
    category: 'contact', title: 'Ways to work together', tag: 'Partnership',
    subtitle: 'Five routes in, one conversation',
    body: [
      'Bring us a problem from your own work that deserves proper investigation. Fund one of the directions above. Share a student through co-supervision or a placement. Commission an independent evaluation of a system you already have. Or simply visit and see what is here.',
      'Every route follows the same shape: a conversation, then a scoped pilot small enough that either side can step away, then a longer programme if the pilot earns one. Partners get early sight of results, named acknowledgement, and a genuine voice in which questions get asked.',
      'One principle underpins all of it: we publish what we find, including the results where our own methods come off worse. That independence is precisely what makes our findings worth acting on \u2014 and it is why an evaluation from this group carries weight elsewhere.',
    ],
  },
  pt_contact: {
    category: 'contact', title: 'Start a conversation', tag: 'Get in touch',
    subtitle: 'One email, no forms',
    body: [
      'Tell us who you are and what interests you, in as few sentences as you like. We will reply with an honest view of whether there is something here for you and what a sensible first step would be.',
      'If you are still deciding, come and visit instead. An afternoon in the building tends to settle the question faster than any amount of correspondence.',
    ],
    action: { label: 'hello@analogue-intelligence.org \u2192', href: EMAIL },
  },


  // ---------------------------------------------------------- the classroom --
  cl_open: {
    category: 'people', title: 'The open lecture series', tag: 'AI literacy',
    subtitle: 'One talk every month or two, for anyone at all',
    body: [
      'Almost everybody now uses systems they have never been told anything about \u2014 and that includes students of the subject. A full course is the obvious answer and the wrong one: too formal to attend, and it reaches exactly the people who were already going to learn.',
      'So instead we organize a talk, every month or once every three weeks, on one thing. No registration, no prerequisites, no assessment. The first is about what a language model is actually doing when it writes \u2014 tokenisation, prediction, temperature, attention, alignment \u2014 in an hour, without equations on the way in.',
      'The intention is to run it outside the university as well as inside: for people who are not students, for children, for older people who have been handed these tools with no explanation at all.',
    ],
    action: { label: 'Ask to be told when \u2192', href: EMAIL },
  },
  cl_topics: {
    category: 'ai', title: 'What is on the board', tag: 'This month',
    subtitle: 'Tokenisation, prediction, and the temperature dial',
    body: [
      'A sentence cut into tokens, four candidates for the next one with their probabilities, and an arrow pointing at the dial that flattens the distribution. That is most of what a language model does when it writes, and it fits on a whiteboard.',
      'The format is deliberately this: one mechanism per session, drawn, with enough time for the room to argue about it. Everybody leaves able to say what it is doing.',
    ],
  },
  cl_attend: {
    category: 'contact', title: 'Coming to one', tag: 'Practical',
    subtitle: 'Turn up',
    body: [
      'Sessions are announced on the board here and by email to anyone who has asked to be told. There is no list to join and nothing to pay.',
      'Planned next: reinforcement learning \u2014 how a system learns from consequences rather than examples. Version control, and why it is the first thing anyone should learn. What continuous integration is actually for. And what happens to a model after it is trained, which is where most of the real work turns out to be.',
      'If you would like one of these run somewhere else \u2014 a school, a library, a community centre \u2014 that is exactly the point of it, so please ask.',
    ],
    action: { label: 'Get in touch \u2192', href: EMAIL },
  },
  cl_python: {
    category: 'software', title: 'Introduction to Python', tag: 'Taught course',
    subtitle: 'The first programming most of our students do',
    body: [
      'A first course in programming, taught in Python: the ordinary business of variables, control flow, data structures and functions, object oriented programming, and the much less ordinary business of learning to read an error message without panicking.',
      'It is a normal university course with enrolment, deadlines and marks \u2014 the formal half of what happens in this room. Most of the people who end up with a project in the Hall of Fame started here.',
    ],
  },
  cl_applied: {
    category: 'software', title: 'Applied Programming', tag: 'Taught course',
    subtitle: 'Where the first course stops being enough',
    body: [
      'What to do once you can write code and the problem is bigger than one file: structuring a project, testing it, versioning it, and handing it to someone who was not there when you wrote it.',
      'This is the point at which programming becomes engineering, and the point at which most self-taught programmers discover what they skipped.',
    ],
  },

  welcome: {
    category: 'vision', title: 'Analogue Intelligence Lab', tag: 'Welcome',
    subtitle: 'You have arrived',
    body: [
      'Hello, and well done for walking all the way up the path.',
      'This is the Analogue Intelligence lab. Inside there is a hall of the things we have built, a workshop where robotics and studio practice share a floor, a classroom anyone may sit in, a room for people who want to support the work, and a library upstairs.',
      'Nothing in here is behind glass. Walk up to anything that catches your eye and read it exactly the way you just read this sign \u2014 that is the whole interface, and you have now learnt all of it.',
    ],
  },
};

export const TITLE = 'Analogue Intelligence Lab';
export const SUBTITLE = 'Software, AI, and Creativity';
