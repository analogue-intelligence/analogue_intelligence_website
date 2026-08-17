// -----------------------------------------------------------------------------
// people.js — everyone in the building who can be talked to.
// Mauricio's and Banno's dialogue is deliberately Lorem Ipsum. 
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
  position: [-10.6, 0, 16.2],
  facing: 0,
  // Deliberately outside every palette the creator offers: a plum coat, an
  // apron in lab green, and silver hair. Whatever a visitor builds for
  // themselves, the person behind the counter is unmistakably not one of them.
  appearance: {
    name: 'The Curator', skin: '#b87642', hairStyle: 'long', hairColor: '#f2ede2',
    coat: '#7d3b52', trousers: '#3b2f3a', accessory: 'apron', build: 'sturdy', height: 1.06,
  },
  greeting: [
    'Welcome to Analogue Intelligence.',
    'Walk with <b>W A S D</b> or the <b>arrow keys</b>, or click anywhere on the floor. Objects light up when you are close — press <b>E</b> or click to read one.',
    'The Classroom is the door on your left \u2014 that is where the open lectures happen, and anyone can come to those. Through the double doors ahead is the Hall of Fame. The Research Lab is the long room to the west \u2014 robotics and studio share it, which people always ask about. The Partners Room is east, and the library is up the stairs at the back.',
  ],
  questions: [
    {
      q: 'What is Analogue Intelligence?',
      answer: [
        'We investigate how software and intelligent systems are engineered, executed, and maintained when code interacts with the physical, tangible, and creative worlds',
        // 'A research group studying how intelligent systems are built, embodied and understood — treating software, models, hardware and art as one practice rather than four.',
        'The name is a small joke and a serious claim: we care about intelligence that has to survive contact with a physical room, not only a leaderboard.',
      ],
    },
    {
      q: 'What is in the building?',
      answer: [
        'Six rooms. This lobby; the Classroom, just there on the left; the Hall of Fame, where our projects stand on plinths; the Research Lab to the west; the Partners Room to the east; and the library upstairs, where the four research pillars each have a shelf.',
        'Every room stays dark until you walk into it. That is deliberate — the building should reward wandering.',
      ],
    },
    {
      q: 'Who works here?',
      answer: [
        'Our lab is inherently multidisciplinary. We bring together computer scientists, designers, artists, historians, and thinkers from across disciplines to tackle complex problems from every angle.',
        'Three of us are usually somewhere on the floor. Walk up to anyone and click them — they will tell you what they are working on far more enthusiastically than I will.',
      ],
    },
    {
      q: 'Can I work or study with you?',
      answer: [
        'Gladly. We supervise theses and projects, and collaborate with researchers, industry and artists.',
        'The Partners Room, east of the hall, makes the whole case in order \u2014 what we claim, why now, what we have built, and one desk with an address on it.',
      ],
      action: { label: 'Get in touch →', href: 'mailto:m.verano.merino@vu.nl' },
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
    room: 'lab',
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
          'Through the creative side, oddly. I was making generative work before I was training policies, and the two turned out to be the same question asked with different tooling.',
          'Which is more or less the argument this whole group is built on, so I fitted.',
        ],
      },
    ],
  },

  {
    id: 'member_mauricio',
    name: 'Mauricio',
    role: 'Assistant Professor · VU Amsterdam',
    accent: '#c97a3a',
    room: 'lab',
    appearance: {
      skin: '#b87642', hairStyle: 'crop', hairColor: '#3a2a1c',
      coat: '#c9822f', trousers: '#4a3a2a', accessory: 'none', build: 'regular', height: 1.04,
    },
    patrol: [[-46, 0, 3], [-54, 0, 3], [-55, 0, -4], [-47, 0, -5]],
    // ⚠ PLACEHOLDER — for Mauricio to write.
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
        answer: ['You can find my work on my personal website.'],
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
    role: 'Lecturer · Artificial Intelligence, VU Amsterdam',
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
