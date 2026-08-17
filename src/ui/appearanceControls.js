import {
  SKIN, HAIR_STYLE, HAIR_COLOR, BLUSH, COAT, BUILD, trousersFor,
} from '../character/appearance.js';

// -----------------------------------------------------------------------------
// appearanceControls.js — the character options, once.
//
// Two places need these controls: the prologue, where you build a character
// standing on a road before you have seen the building, and the `C` key, which
// reopens the same choices later. They were about to become two copies of the
// same markup and the same handlers, which is how an option quietly ends up
// existing in one of them and not the other.
//
// The option arrays in character/appearance.js stay the single source of truth;
// this is the single source of *interface* for them.
// -----------------------------------------------------------------------------

/**
 * Build the control groups into `host`.
 *
 * Returns the group elements in order, so a caller that wants to reveal them
 * one at a time can, and a `sync()` that pushes the current appearance back
 * into the selected states.
 */
export function buildAppearanceControls(host, appearance, onChange, opts = {}) {
  host.innerHTML = '';
  const groups = [];

  const group = (key, label, render) => {
    const wrap = document.createElement('div');
    wrap.className = 'ap-group';
    wrap.dataset.group = key;
    if (opts.stagger) wrap.classList.add('ap-pending');
    wrap.innerHTML = `<span class="ap-label">${label}</span>`;
    const row = document.createElement('div');
    row.className = 'ap-row';
    wrap.appendChild(row);
    render(row);
    host.appendChild(wrap);
    groups.push(wrap);
    return wrap;
  };

  const set = (key, value) => {
    appearance[key] = value;
    // the coat picks the trousers, so the figure stays coordinated for free
    if (key === 'coat') appearance.trousers = trousersFor(value);
    sync();
    onChange(appearance, key);
  };

  const swatches = (key, values) => (row) => {
    for (const v of values) {
      const b = document.createElement('button');
      b.className = 'ap-swatch';
      b.style.background = v;
      b.dataset.value = v;
      b.setAttribute('aria-label', `${key} ${v}`);
      b.addEventListener('click', () => set(key, v));
      row.appendChild(b);
    }
  };

  const chips = (key, options) => (row) => {
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'ap-chip';
      b.textContent = o.label;
      b.dataset.value = o.id;
      b.addEventListener('click', () => set(key, o.id));
      row.appendChild(b);
    }
  };

  if (opts.name !== false) {
    group('name', 'Name', (row) => {
      const input = document.createElement('input');
      input.className = 'ap-name';
      input.type = 'text';
      input.maxLength = 18;
      input.value = appearance.name ?? 'Visitor';
      input.addEventListener('input', () => {
        appearance.name = input.value.trim() || 'Visitor';
        onChange(appearance, 'name');
      });
      row.appendChild(input);
    });
  }

  group('skin', 'Skin', swatches('skin', SKIN));
  group('hairStyle', 'Hair', chips('hairStyle', HAIR_STYLE));
  group('hairColor', 'Hair colour', swatches('hairColor', HAIR_COLOR));
  // Called "Eyes" because that is what they are. There are no drawn eyes on
  // these faces — the two warm marks do the whole job — so the honest label for
  // their colour is the feature people actually see.
  group('blush', 'Eyes', swatches('blush', BLUSH));
  group('coat', 'Coat', swatches('coat', COAT));
  group('build', 'Build', chips('build', BUILD));

  group('height', 'Height', (row) => {
    const input = document.createElement('input');
    input.className = 'ap-height';
    input.type = 'range';
    input.min = '0.88'; input.max = '1.12'; input.step = '0.01';
    input.value = String(appearance.height ?? 1);
    input.addEventListener('input', () => {
      appearance.height = parseFloat(input.value);
      onChange(appearance, 'height');
    });
    row.appendChild(input);
  });

  function sync() {
    for (const b of host.querySelectorAll('.ap-swatch, .ap-chip')) {
      const key = b.closest('.ap-group').dataset.group;
      b.classList.toggle('on', String(appearance[key]) === b.dataset.value);
    }
    const nameEl = host.querySelector('.ap-name');
    if (nameEl && nameEl.value !== appearance.name) nameEl.value = appearance.name ?? 'Visitor';
    const hEl = host.querySelector('.ap-height');
    if (hEl) hEl.value = String(appearance.height ?? 1);
  }

  sync();
  return { groups, sync };
}

/** Randomise in place, respecting the coat/trousers pairing. */
export function randomiseAppearance(a) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const coat = pick(COAT);
  Object.assign(a, {
    skin: pick(SKIN),
    hairStyle: pick(HAIR_STYLE).id,
    hairColor: pick(HAIR_COLOR),
    blush: pick(BLUSH),
    coat,
    trousers: trousersFor(coat),
    accessory: 'none',
    build: pick(BUILD).id,
    height: 0.88 + Math.random() * 0.24,
  });
  return a;
}
