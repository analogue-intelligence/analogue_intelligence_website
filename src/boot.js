// -----------------------------------------------------------------------------
// boot.js — the front door.
//
// Two ways in, and nothing heavy loads until one of them is chosen:
//
//   · the building — the explorable 3D version (src/main.js)
//   · the page     — the same lab, written down (src/plain/PlainSite.js)
//
// Both are dynamic imports. Someone who wants the facts in ten seconds never
// downloads three.js, never compiles a shader, and never waits for a building
// to be raised; someone who wants the walkthrough gets exactly what they got
// before, one click later.
//
// The choice can be skipped with ?mode=page or ?mode=building (handy for
// links, and for anyone who wants to bookmark their preference), and it is
// remembered for a returning visitor — the door still opens on the chooser,
// but their last choice is the one already focused.
// -----------------------------------------------------------------------------

const KEY = 'ai.mode';
const root = document.getElementById('ui-root');

/** Start one of the two sites. Everything below just decides which. */
async function enter(mode) {
  window.AI_MODE = mode;                  // tells the boot watchdog we started
  try { localStorage.setItem(KEY, mode); } catch { /* private browsing */ }
  document.body.classList.add(`mode-${mode}`);
  if (mode === 'page') {
    const { PlainSite } = await import('./plain/PlainSite.js');
    new PlainSite().mount();
  } else {
    await import('./main.js');
  }
}

function chooser(previous) {
  document.body.classList.add('choosing');
  const el = document.createElement('div');
  el.className = 'chooser';
  el.innerHTML = `
    <div class="chooser-card">
      <div class="chooser-mark" aria-hidden="true">
        <img src="./assets/logo.png" alt="" />
      </div>
      <h1>Analogue Intelligence Lab</h1>
      <p class="chooser-sub">Software, AI, and Creativity</p>
      <p class="chooser-lead">Two ways to visit. You can switch at any time.</p>

      <div class="chooser-options">
        <button class="chooser-opt" data-mode="building" type="button">
          <span class="chooser-kicker">Walk in</span>
          <span class="chooser-title">The building</span>
          <span class="chooser-body">Explore a 3D lab room by room: projects on plinths, a workshop, a classroom, a library upstairs. Takes a moment to load.</span>
          <span class="chooser-go">Enter the building &rarr;</span>
        </button>
        <button class="chooser-opt" data-mode="page" type="button">
          <span class="chooser-kicker">Just read</span>
          <span class="chooser-title">The page</span>
          <span class="chooser-body">Everything the building says, written down and in order — the work, the research, the teaching, the people, and how to get in touch.</span>
          <span class="chooser-go">Read the page &rarr;</span>
        </button>
      </div>
      <p class="chooser-note">The page loads instantly and works on any device. The building is the fun one.</p>
    </div>`;

  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));

  const pick = (mode) => {
    document.body.classList.remove('choosing');
    el.classList.remove('on');
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 420);
    enter(mode);
  };

  for (const b of el.querySelectorAll('.chooser-opt')) {
    b.addEventListener('click', () => pick(b.dataset.mode));
  }
  // a returning visitor's last choice is the one under the cursor already
  const first = el.querySelector(`.chooser-opt[data-mode="${previous || 'building'}"]`)
    || el.querySelector('.chooser-opt');
  first.classList.add('is-last');
  first.focus({ preventScroll: true });
}

const asked = new URLSearchParams(location.search).get('mode');
let remembered = null;
try { remembered = localStorage.getItem(KEY); } catch { /* ignore */ }

if (asked === 'page' || asked === 'building') enter(asked);
else chooser(remembered);
