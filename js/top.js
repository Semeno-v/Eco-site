/**
 * EcoGroup — main script
 * Clean, no duplicates. iOS-style interactions.
 */

/* =====================================================
   AOS — animate on scroll
   ===================================================== */
(function initAOS() {
  if (!window.AOS) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  AOS.init({
    disable: reduced,
    once: true,
    duration: 650,
    easing: 'ease',
    offset: 40,
  });
})();

/* =====================================================
   Scroll progress bar
   ===================================================== */
(function initProgressBar() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  function update() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const pct = scrollHeight <= clientHeight ? 0
      : (scrollTop / (scrollHeight - clientHeight)) * 100;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
})();

/* =====================================================
   Header: CSS var for height + transparent → frosted
   ===================================================== */
(function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  function setH() {
    document.documentElement.style.setProperty(
      '--header-h', header.getBoundingClientRect().height + 'px'
    );
  }
  setH();
  window.addEventListener('resize', setH, { passive: true });

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
})();

/* =====================================================
   Back-to-top button
   ===================================================== */
(function initBackToTop() {
  const btn = document.getElementById('buttonUp');
  if (!btn) return;

  let visible = false;

  function show() {
    if (visible) return;
    visible = true;
    btn.classList.remove('btn-up--out');
    void btn.offsetHeight; // force reflow so animation restarts clean
    btn.classList.add('btn-up--in');
  }

  function hide() {
    if (!visible) return;
    visible = false;
    btn.classList.remove('btn-up--in');
    btn.classList.add('btn-up--out');
    btn.addEventListener('animationend', () => {
      if (!visible) btn.classList.remove('btn-up--out');
    }, { once: true });
  }

  function sync() {
    const y = window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0;
    y > 500 ? show() : hide();
  }

  // rAF wrapper — ensures scrollY is read after browser updates position
  let raf = 0;
  function scheduleSync() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  }

  window.addEventListener('scroll',    scheduleSync, { passive: true });
  window.addEventListener('touchmove', scheduleSync, { passive: true });
  // touchend fires after momentum scroll settles on iOS
  window.addEventListener('touchend',  () => { scheduleSync(); setTimeout(sync, 200); }, { passive: true });
  // scrollend is supported on modern Chrome/Android
  if ('onscrollend' in window) window.addEventListener('scrollend', sync, { passive: true });
  sync();

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
  });
})();

/* =====================================================
   Burger / Mobile navigation
   KEY FIX: anchor navigation works even while scroll-locked.
   We intercept the href, close the menu first (restoring scroll),
   then scroll to the target after the panel slide-out.
   ===================================================== */
(function initBurger() {
  const html    = document.documentElement;
  const burger  = document.querySelector('.burger');
  const overlay = document.getElementById('menuOverlay');
  const links   = document.querySelectorAll('.menu__link[href^="#"]');

  if (!burger) return;

  let savedScrollY = 0;

  function lockScroll() {
    savedScrollY = window.scrollY || window.pageYOffset;
    Object.assign(document.body.style, {
      position: 'fixed',
      top: `-${savedScrollY}px`,
      left: '0', right: '0',
      width: '100%',
      overflowY: 'scroll',
    });
  }

  function unlockScroll(targetScrollY) {
    Object.assign(document.body.style, {
      position: '', top: '', left: '', right: '', width: '', overflowY: '',
    });
    // Restore original position (or jump to target anchor)
    window.scrollTo(0, targetScrollY !== undefined ? targetScrollY : savedScrollY);
  }

  function open() {
    lockScroll();
    html.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
  }

  function close(targetId) {
    html.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');

    if (targetId) {
      // Unlock scroll to top of page first, then animate to anchor
      unlockScroll(savedScrollY);
      // Wait for panel slide-out (iOS spring ~460ms), then scroll to section
      setTimeout(() => {
        const target = document.getElementById(targetId);
        if (target) {
          const headerH = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--header-h')
          ) || 60;
          const top = target.getBoundingClientRect().top + window.scrollY - headerH;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 80); // short delay — just enough for body to unfreeze
    } else {
      unlockScroll();
    }
  }

  const isOpen = () => html.classList.contains('menu-open');

  burger.addEventListener('click', () => isOpen() ? close() : open());
  overlay?.addEventListener('click', () => close());
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) close(); });

  // Intercept anchor links — close panel then navigate
  links.forEach(a => {
    a.addEventListener('click', e => {
      if (!isOpen()) return; // desktop: let native behavior work
      e.preventDefault();
      const hash = a.getAttribute('href'); // e.g. "#ecomain"
      const targetId = hash.replace('#', '').trim();
      close(targetId);
    });
  });

  // Reset on back/forward cache
  window.addEventListener('pageshow', e => { if (e.persisted && isOpen()) close(); });
})();

/* =====================================================
   Scrollspy — highlight active nav link
   ===================================================== */
(function initScrollspy() {
  const links = [...document.querySelectorAll('.menu__link[href^="#"]')];
  const targets = links
    .map(a => {
      const id = a.getAttribute('href').slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { id, el, link: a } : null;
    })
    .filter(Boolean);

  if (!targets.length) return;

  let activeId = null;

  function update() {
    const hh = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h')
    ) || 60;
    const y = window.scrollY;

    let current = targets[0];
    for (const t of targets) {
      const top = t.el.getBoundingClientRect().top + y;
      if (top - hh - 20 <= y) current = t;
      else break;
    }

    if (!current || activeId === current.id) return;
    activeId = current.id;
    targets.forEach(t =>
      t.link.classList.toggle('menu__link--active', t.id === activeId)
    );
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('load', update);
  update();
})();
