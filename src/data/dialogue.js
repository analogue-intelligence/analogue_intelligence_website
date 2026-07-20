// -----------------------------------------------------------------------------
// dialogue.js — the librarian/guide's script. A tiny branching tree: a greeting
// plus a set of pre-established questions the visitor can pick. Each answer can
// optionally offer a link (the contact point) or point the player somewhere.
// -----------------------------------------------------------------------------

export const GUIDE = {
  name: 'The Curator',

  greeting: [
    'Welcome to the Analogue Intelligence Research Group!',
    'You\'re free to wander — walk with W A S D, or click a spot on the floor. Objects light up when you\'re close; click one to read about our work, and take the stairs up to the research library.',
    'Or ask me something, if you\'d rather not roam.',
  ],

  // Each question shows as a button; `answer` is an array of paragraphs.
  questions: [
    {
      q: 'What is Analogue Intelligence?',
      answer: [
        'We study how intelligent systems are built, embodied, and understood — treating software, models, hardware, and art as one practice.',
        'The "analogue" is a small joke and a serious claim: we care about intelligence that lives in the physical world, not only on a leaderboard.',
      ],
    },
    {
      q: 'What do you research here?',
      answer: [
        'Four surfaces of the same question. Look for the books on the upper floor — Software Engineering, Artificial Intelligence, Robotics & Hardware, and Creative Technology each have one.',
        'The desk by the window holds our broader vision, if you want the short version first.',
      ],
    },
    {
      q: 'Can I work or study with you?',
      answer: [
        'Gladly. We take on students for theses and projects, and collaborate with researchers, industry, and artists.',
        'The notice board near the entrance has the details — or just reach out.',
      ],
      action: { label: 'Get in touch →', href: 'mailto:hello@analogue-intelligence.org' },
    },
    {
      q: 'How do I move around again?',
      answer: [
        'W / A / S / D to walk. Or click anywhere on the floor and you\'ll head there.',
        'Stairs take you up to the research library. Keep an eye on the edge of your lamplight — things announce themselves when you get close.',
      ],
    },
  ],

  farewell: 'Take your time. The lamp is yours.',
};
