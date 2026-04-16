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

  let visible   = false;
  let launching = false;

  function show() {
    if (visible) return;
    visible = true;
    launching = false;
    btn.classList.remove('btn-up--out', 'btn-up--launch');
    void btn.offsetHeight; // force reflow so animation restarts clean
    btn.classList.add('btn-up--in');
  }

  function hide() {
    if (!visible) return;
    visible = false;
    btn.classList.remove('btn-up--in');
    if (launching) return; // launch animation handles disappearance
    btn.classList.add('btn-up--out');
    btn.addEventListener('animationend', () => {
      if (!visible && !launching) btn.classList.remove('btn-up--out');
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

  function launch() {
    launching = true;
    visible = false;
    btn.classList.remove('btn-up--in', 'btn-up--out');
    void btn.offsetHeight;
    btn.classList.add('btn-up--launch');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    btn.addEventListener('animationend', () => {
      btn.classList.remove('btn-up--launch');
      launching = false;
    }, { once: true });
  }

  btn.addEventListener('click', launch);
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
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

  function lockScroll() {
    // overflow:hidden on <html> blocks input without resetting scrollY —
    // no position:fixed needed, no repaint jump on unlock.
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    html.style.overflow = 'hidden';
    // Compensate for scrollbar disappearing so layout doesn't shift
    if (sbw > 0) html.style.paddingRight = sbw + 'px';
  }

  function unlockScroll() {
    html.style.overflow    = '';
    html.style.paddingRight = '';
    // scrollY is unchanged — nothing to restore
  }

  function open() {
    lockScroll();
    html.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
  }

  function close(targetId) {
    html.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    unlockScroll();

    if (targetId) {
      // Small delay lets the panel slide out before we jump to the anchor
      setTimeout(() => {
        const target = document.getElementById(targetId);
        if (target) {
          const headerH = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--header-h')
          ) || 60;
          const top = target.getBoundingClientRect().top + window.scrollY - headerH;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 80);
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


/* =====================================================
   Animated counters — count up when visible
   ===================================================== */
(function initCounters() {
  const counters = document.querySelectorAll('.counter[data-to]');
  if (!counters.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const to  = parseFloat(el.dataset.to);
      const dur = 1600;
      const t0  = performance.now();
      function tick(now) {
        const p    = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
        el.textContent = Math.round(to * ease);
        if (p < 1) requestAnimationFrame(tick);
        else { el.textContent = to; obs.unobserve(el); }
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });

  counters.forEach(el => io.observe(el));
})();

/* =====================================================
   Hero parallax — subtle depth on scroll (desktop only)
   ===================================================== */
(function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const img = document.querySelector('.hero__img-wrap img');
  if (!img) return;
  img.style.willChange = 'transform';
  let raf = 0;
  window.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      img.style.transform = `scale(1.08) translateY(${window.scrollY * 0.10}px)`;
    });
  }, { passive: true });
})();

/* =====================================================
   Theme switch — reliable day/night toggle
   ===================================================== */
(function initTheme() {
  const html = document.documentElement;
  const KEY  = 'eco-theme';

  function isDark() { return html.classList.contains('dark-theme'); }

  function applyTheme(dark) {
    html.classList.toggle('dark-theme', dark);
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
    document.querySelectorAll('.theme-switch__input').forEach(cb => { cb.checked = dark; });
  }

  // Label click activates the checkbox → fires 'change' → applyTheme
  document.querySelectorAll('.theme-switch__input').forEach(cb => {
    cb.checked = isDark();
    cb.addEventListener('change', function() {
      applyTheme(this.checked);
      // Burst ripple on the track
      const label = this.closest('.theme-switch');
      if (label) {
        label.classList.remove('theme-switch--burst');
        void label.offsetWidth; // reflow to restart animation
        label.classList.add('theme-switch--burst');
        label.addEventListener('animationend', () => {
          label.classList.remove('theme-switch--burst');
        }, { once: true });
      }
    });
  });
})();
