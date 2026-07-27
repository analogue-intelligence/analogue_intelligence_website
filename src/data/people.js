// -----------------------------------------------------------------------------
// people.js — everyone in the building who can be talked to.
//
// THESE ARE REAL PEOPLE. TWO OF THEM HAVE NOT WRITTEN THEIR LINES YET.
//
// Mauricio's and Banno's dialogue is deliberately Lorem Ipsum. Their names,
// roles and links are real and correct; the words are for them to supply. A
// visitor will reasonably assume they are being addressed by the person on the
// label, so nobody should be given invented opinions — placeholder Latin is the
// honest state until each of them writes their own.
//
// To fill one in: replace the strings in `greeting` and each `answer`, and
// change the `q` prompts to the questions they'd actually want asked. Keep the
// shape — an array of paragraphs per answer, one line revealed per click.
//
// `appearance` uses exactly the same keys as the character creator, so you can
// design a colleague in the mirror and paste the object here. `patrol` is a
// loop of world coordinates — keep the points inside the room and clear of
// furniture, since NPCs walk their route without collision checks.
// -----------------------------------------------------------------------------

export const CURATOR = {
  id: 'curator',
  name: 'The Curator',
  role: 'Front of house',
  accent: '#c9a24a',
  position: [-7.5, 0, 16.1],
  facing: 0,
  // Deliberately outside every palette the creator offers: a plum coat, an
  // apron in lab green, and silver hair. Whatever a visitor builds for
  // themselves, the person behind the counter is unmistakably not one of them.
  appearance: {
    name: 'The Curator', skin: '#b87642', hairStyle: 'long', hairColor: '#efe9dc',
    coat: '#7d3b52', trousers: '#3b2f3a', accessory: 'apron', build: 'sturdy', height: 1.06,
  },
  greeting: [
    'Welcome to Analogue Intelligence.',
    'Walk with <b>W A S D</b> or the <b>arrow keys</b>, or click anywhere on the floor. Objects light up when you are close — press <b>E</b> or click to read one.',
    'Through the double doors is the Hall of Fame. The lab is off either side of it, and the library is up the stairs at the back. Take your time.',
  ],
  questions: [
    {
      q: 'What is Analogue Intelligence?',
      answer: [
        'A research group studying how intelligent systems are built, embodied and understood — treating software, models, hardware and art as one practice rather than four.',
        'The name is a small joke and a serious claim: we care about intelligence that has to survive contact with a physical room, not only a leaderboard.',
      ],
    },
    {
      q: 'What is in the building?',
      answer: [
        'Five rooms. This lobby; the Hall of Fame, where six of our projects are on plinths; the Robotics Lab to the west; the Creative Studio to the east; and the library upstairs, where the four research pillars each have a shelf.',
        'Every room stays dark until you walk into it. That is deliberate — the building should reward wandering.',
      ],
    },
    {
      q: 'Who works here?',
      answer: [
        'Three of us are usually somewhere on the floor. Walk up to anyone and click them — they will tell you what they are working on far more enthusiastically than I will.',
      ],
    },
    {
      q: 'Can I work or study with you?',
      answer: [
        'Gladly. We supervise theses and projects, and collaborate with researchers, industry and artists.',
        'The notice board by the window has the details, or write to us directly.',
      ],
      action: { label: 'Get in touch →', href: 'mailto:hello@analogue-intelligence.org' },
    },
    {
      q: 'How do I get around?',
      answer: [
        '<b>W A S D</b> or the <b>arrow keys</b> to walk. Click the floor to head somewhere. <b>E</b> reads whatever you are standing next to.',
        'Doors open as you approach them. The stairs at the back-right of the Hall of Fame go up to the library.',
        '<b>C</b> reopens the mirror by the door if you want to change how you look. <b>P</b> toggles the painted finish, and <b>Q</b> steps the graphics down if your machine is labouring.',
      ],
    },
  ],
  farewell: 'Take your time. Nothing in here is behind glass.',
};

export const MEMBERS = [
  {
    id: 'member_ioana',
    name: 'Ioana-Teodora',
    role: 'Reinforcement learning · embodied navigation',
    accent: '#4f7d93',
    room: 'robotics',
    appearance: {
      skin: '#d99b6c', hairStyle: 'curls', hairColor: '#1c1712',
      coat: '#4f6472', trousers: '#2c333d', accessory: 'glasses', build: 'regular', height: 1.0,
    },
    patrol: [[-19, 0, 4], [-24, 0, 3], [-24, 0, -5], [-19, 0, -6]],
    greeting: [
      'Oh — hello. Mind the tape on the floor, the cage is live.',
      'I work on navigation: getting something with rotors to cross a room full of things that also move.',
    ],
    questions: [
      {
        q: 'What are you working on?',
        answer: [
          'ZEPHYR, mostly. A tri-mode controller for drone navigation — two potential-field regimes and a learned escape policy for when the fields cancel out and the thing just sits there humming.',
          'The current problem is the switch between modes. Reacting to a freeze is already too late in a dynamic scene, so we roll the plan forward and switch on the prediction instead.',
        ],
      },
      {
        q: 'Does it work?',
        answer: [
          'Depends what you mean. Best clearance and smoothest paths of anything we have tried, and the escape policy recovers from every freeze it is actually handed.',
          'But raw success rate is not the best in the set, and pretending otherwise would make the whole paper worthless. It is a Pareto trade-off, and we say so.',
        ],
      },
      {
        q: 'How did you end up here?',
        answer: [
          'Through the creative side, oddly. I was making generative work before I was training policies and always had a passion for robotics, so when I found this group it was a perfect fit.',
        ],
      },
    ],
  },

  {
    id: 'member_mauricio',
    name: 'Mauricio',
    role: 'Assistant Professor · Vrije Universiteit Amsterdam',
    accent: '#c97a3a',
    room: 'studio',
    appearance: {
      skin: '#b87642', hairStyle: 'crop', hairColor: '#3a2a1c',
      coat: '#c9822f', trousers: '#4a3a2a', accessory: 'none', build: 'regular', height: 1.04,
    },
    patrol: [[22, 0, 3], [30, 0, 3], [31, 0, -4], [23, 0, -5]],
    // ⚠ PLACEHOLDER — for Mauricio to write. Research areas: software evolution
    // & maintenance, creative computing, software language engineering, sports.
    greeting: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    ],
    questions: [
      {
        q: 'What do you work on?',
        answer: ['Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'],
      },
      {
        q: 'Where can I read your work?',
        answer: ['Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.'],
        action: { label: 'maveme.github.io →', href: 'https://maveme.github.io/' },
      },
      {
        q: 'What brought you here?',
        answer: ['Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'],
      },
    ],
  },

  {
    id: 'member_banno',
    name: 'Banno',
    role: 'Lecturer · Artificial Intelligence, Faculty of Science, VU Amsterdam',
    accent: '#5e8a5a',
    room: 'hall',
    appearance: {
      skin: '#8d5524', hairStyle: 'bob', hairColor: '#241c14',
      coat: '#5e6b3e', trousers: '#3f4a44', accessory: 'none', build: 'regular', height: 1.01,
    },
    patrol: [[0, 0, 8], [-6, 0, 3], [-5, 0, -7], [3, 0, -6], [4, 0, 6]],
    // ⚠ PLACEHOLDER — for Banno to write.
    greeting: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    ],
    questions: [
      {
        q: 'What do you teach?',
        answer: ['Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'],
      },
      {
        q: 'What are you working on?',
        answer: ['Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'],
      },
      {
        q: 'What should I look at here?',
        answer: ['Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'],
      },
    ],
  },
];
