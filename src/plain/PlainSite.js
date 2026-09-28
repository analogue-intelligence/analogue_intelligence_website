import { ORG, EMAIL } from '../data/content.js';
import { MEMBERS } from '../data/people.js';
import { LAB, SECTIONS, CONTACT } from './copy.js';

// -----------------------------------------------------------------------------
// PlainSite — the reading version of the lab website.
//
// Laid out the way a research group site normally is. A header with the group
// name and section links, a short statement of what the group does, then
// sections of equal cards, then people, then how to get in touch.
//
// Two rules the first version broke:
//
//   1. Every row is full. Each section declares how many columns it wants and
//      carries a matching number of cards, so no card is left sitting alone at
//      the end of a row. Below 1040px everything drops to two columns, below
//      660px to one, and both divide the counts used here (2, 3 and 4) evenly.
//   2. The page is short. Each card is a few sentences. The full text of every
//      object is in the building, which is one click away at all times.
//
// The words come from plain/copy.js rather than data/content.js, so the
// website and the building can each be written in their own voice without
// either drifting from the facts.
// -----------------------------------------------------------------------------

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

/** Short link keys in copy.js, so the copy file holds no URLs. */
function href(key) {
  if (key === 'email') return EMAIL;
  if (key === 'org') return ORG;
  return `${ORG}/${key}`;
}

export class PlainSite {
  constructor(root = document.getElementById('ui-root')) {
    this.root = root;
  }

  mount() {
    this._stylesheet();
    document.title = `${LAB.name}, ${LAB.strap}`;
    const el = document.createElement('main');
    el.className = 'plain';
    el.innerHTML = this._html();
    this.root.appendChild(el);
    this.el = el;
    this._reveal();
    this._nav();
    window.AI = { mode: 'page', site: this };     // the boot watchdog stands down
  }

  /** Only the people who chose this version ever fetch this stylesheet. */
  _stylesheet() {
    if (document.querySelector('link[data-plain]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './src/styles/plain.css';
    link.dataset.plain = '1';
    document.head.appendChild(link);
  }

  _html() {
    const nav = SECTIONS.map((s) => `<a href="#${s.id}">${esc(s.nav)}</a>`).join('')
      + '<a href="#contact">Contact</a>';

    return `
      <header class="p-top">
        <a class="p-wordmark" href="#top">
          <img src="./assets/logo.png" alt="" />
          <span>${esc(LAB.name)}</span>
        </a>
        <nav class="p-nav">${nav}</nav>
        <a class="p-switch" href="?mode=building">Explore the building</a>
      </header>

      <section class="p-hero" id="top">
        <div class="p-hero-text">
          <p class="p-kicker">${esc(LAB.affiliation)}</p>
          <h1>${esc(LAB.name)}</h1>
          <p class="p-sub">${esc(LAB.strap)}</p>
          ${LAB.intro.map((b) => `<p class="p-lead">${esc(b)}</p>`).join('')}
          <div class="p-hero-actions">
            <a class="p-btn" href="#contact">Get in touch</a>
            <a class="p-btn ghost" href="${ORG}" target="_blank" rel="noopener">Code on GitHub</a>
            <a class="p-btn ghost" href="?mode=building">Walk through the lab</a>
          </div>
        </div>
        <div class="p-hero-mark" aria-hidden="true">
          <svg viewBox="0 0 320 320">
            <rect class="h1" x="10"  y="10"  width="300" height="300" />
            <rect class="h2" x="52"  y="60"  width="216" height="216" />
            <rect class="h3" x="100" y="112" width="120" height="120" />
            <rect class="h4" x="140" y="154" width="40"  height="40"  />
          </svg>
        </div>
      </section>

      ${SECTIONS.map((s) => this._section(s)).join('')}
      ${this._contact()}

      <footer class="p-foot">
        <p class="p-foot-title">${esc(LAB.name)}</p>
        <p>${esc(LAB.affiliation)}</p>
        <p class="p-foot-links">
          <a href="${EMAIL}">hello@analogue-intelligence.org</a>
          <a href="${ORG}" target="_blank" rel="noopener">github.com/analogue-intelligence</a>
          <a href="?mode=building">Explorable version</a>
        </p>
      </footer>`;
  }

  _section(spec) {
    let body = '';
    if (spec.style === 'people') body = this._people();
    else if (spec.style === 'list') body = spec.items.map((i) => this._listItem(i)).join('');
    else body = spec.cards.map((c) => this._card(c, spec.style)).join('');

    return `
      <section class="p-section" id="${spec.id}">
        <div class="p-section-head reveal">
          <h2>${esc(spec.title)}</h2>
          ${spec.lead ? `<p class="p-section-lead">${esc(spec.lead)}</p>` : ''}
        </div>
        <div class="p-grid${spec.style === 'list' ? ' p-grid-list' : ''}" style="--cols:${spec.cols}">
          ${body}
        </div>
      </section>`;
  }

  _card(c, style) {
    const action = c.action
      ? `<a class="p-card-action" href="${href(c.action.href)}"${c.action.href === 'email' ? '' : ' target="_blank" rel="noopener"'}>${esc(c.action.label)}</a>`
      : '';
    // Short tiles carry no kicker: in that row the label and the heading say
    // the same thing, and one of them is enough.
    const kicker = c.kicker && style !== 'brief' && c.kicker !== c.title
      ? `<p class="p-card-cat">${esc(c.kicker)}</p>` : '';
    return `
      <article class="p-card${style === 'brief' ? ' p-card-brief' : ''} reveal" style="--accent:${c.accent}">
        ${kicker}
        <h3>${esc(c.title)}</h3>
        ${c.sub ? `<p class="p-card-sub">${esc(c.sub)}</p>` : ''}
        <p>${esc(c.body)}</p>
        ${action}
      </article>`;
  }

  _listItem(i) {
    return `
      <div class="p-item reveal">
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.body)}</p>
      </div>`;
  }

  /**
   * Name and role. What each person says in the building is a conversation you
   * steer with questions, and flattening that into a biography here would
   * represent neither well.
   */
  _people() {
    return MEMBERS.map((m) => `
      <article class="p-person reveal" style="--accent:${m.accent}">
        <span class="p-person-dot" aria-hidden="true"></span>
        <h3>${esc(m.name)}</h3>
        <p class="p-person-role">${esc(m.role)}</p>
      </article>`).join('');
  }

  _contact() {
    return `
      <section class="p-section p-contact" id="contact">
        <div class="p-contact-inner reveal">
          <h2>${esc(CONTACT.title)}</h2>
          ${CONTACT.body.map((b) => `<p>${esc(b)}</p>`).join('')}
          <div class="p-hero-actions">
            <a class="p-btn" href="${EMAIL}">hello@analogue-intelligence.org</a>
            <a class="p-btn ghost" href="?mode=building">Visit the lab</a>
          </div>
        </div>
      </section>`;
  }

  /** Blocks rise as they arrive. Nothing moves if the visitor asked for calm. */
  _reveal() {
    const items = [...this.el.querySelectorAll('.reveal')];
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || !('IntersectionObserver' in window)) return;   // everything stays visible
    this.el.classList.add('has-motion');                       // now it may hide
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        setTimeout(() => e.target.classList.add('in'), i * 60);
        io.unobserve(e.target);
      });
      // Reveal a little before a block arrives, so jumping to a section with a
      // nav link never lands on a heading with a blank space under it.
    }, { rootMargin: '240px 0px 240px 0px', threshold: 0.01 });
    items.forEach((n) => io.observe(n));
  }

  /** Highlight whichever section is under the reader. */
  _nav() {
    const links = [...this.el.querySelectorAll('.p-nav a')];
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`));
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    this.el.querySelectorAll('.p-section').forEach((s) => spy.observe(s));

    const top = this.el.querySelector('.p-top');
    top.classList.add('ready');
    window.addEventListener('scroll', () => {
      top.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }
}
