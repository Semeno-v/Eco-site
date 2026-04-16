/**
 * EcoGroup — main script
 * Single rAF scroll dispatcher · cached scrollspy · iOS-safe burger
 */

/* =====================================================
   Scroll dispatcher — ONE passive listener + ONE rAF
   All scroll-dependent modules register via _scroll.on()
   ===================================================== */
const _scroll = (function () {
  const handlers = [];
  let raf = 0;

  function run() {
    const y = window.scrollY;
    for (let i = 0; i < handlers.length; i++) handlers[i](y);
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(run);
  }

  window.addEventListener('scroll',    schedule, { passive: true });
  window.addEventListener('touchmove', schedule, { passive: true });
  window.addEventListener('touchend',  schedule, { passive: true });
  if ('onscrollend' in window) window.addEventListener('scrollend', schedule, { passive: true });

  return {
    on:  function (fn) { handlers.push(fn); },
    run: run,  // call once for initial state
  };
})();

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

  // Cache total scrollable height — update on resize
  let scrollable = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
  window.addEventListener('resize', () => {
    scrollable = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
  }, { passive: true });

  _scroll.on(function (y) {
    bar.style.width = (scrollable <= 0 ? 0 : (y / scrollable) * 100) + '%';
  });
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

  _scroll.on(function (y) {
    header.classList.toggle('scrolled', y > 10);
  });
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
    visible   = true;
    launching = false;
    btn.classList.remove('btn-up--out', 'btn-up--launch');
    void btn.offsetHeight; // force reflow so animation restarts clean
    btn.classList.add('btn-up--in');
  }

  function hide() {
    if (!visible) return;
    visible = false;
    btn.classList.remove('btn-up--in');
    if (launching) return;
    btn.classList.add('btn-up--out');
    btn.addEventListener('animationend', () => {
      if (!visible && !launching) btn.classList.remove('btn-up--out');
    }, { once: true });
  }

  _scroll.on(function (y) {
    y > 500 ? show() : hide();
  });

  // Extra check after iOS momentum scroll settles
  window.addEventListener('touchend', () => setTimeout(_scroll.run, 200), { passive: true });

  function launch() {
    launching = true;
    visible   = false;
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

  // Reset on back/forward cache
  window.addEventListener('pageshow', e => {
    if (e.persisted) { visible = false; launching = false; btn.className = ''; _scroll.run(); }
  });
})();

/* =====================================================
   Burger / Mobile navigation
   ===================================================== */
(function initBurger() {
  const html    = document.documentElement;
  const burger  = document.querySelector('.burger');
  const overlay = document.getElementById('menuOverlay');
  const links   = document.querySelectorAll('.menu__link[href^="#"]');

  if (!burger) return;

  function lockScroll() {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    html.style.overflow = 'hidden';
    if (sbw > 0) html.style.paddingRight = sbw + 'px';
  }

  function unlockScroll() {
    html.style.overflow     = '';
    html.style.paddingRight = '';
  }

  const nav = document.querySelector('.header__menu');

  function open() {
    lockScroll();
    html.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    // Move focus into menu for keyboard users
    setTimeout(() => nav?.querySelector('a[href], button')?.focus(), 80);
  }

  function close(targetId) {
    html.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    unlockScroll();
    burger.focus();

    if (targetId) {
      setTimeout(() => {
        const target = document.getElementById(targetId);
        if (target) {
          const headerH = parseFloat(
            getComputedStyle(html).getPropertyValue('--header-h')
          ) || 60;
          const top = target.getBoundingClientRect().top + window.scrollY - headerH;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 80);
    }
  }

  const isOpen = () => html.classList.contains('menu-open');

  // Focus trap: keep Tab within the open menu panel
  function trapFocus(e) {
    if (e.key !== 'Tab' || !isOpen() || !nav) return;
    const items = [...nav.querySelectorAll('a[href], button')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  burger.addEventListener('click', () => isOpen() ? close() : open());
  overlay?.addEventListener('click', () => close());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) close();
    else trapFocus(e);
  });

  links.forEach(a => {
    a.addEventListener('click', e => {
      if (!isOpen()) return;
      e.preventDefault();
      close(a.getAttribute('href').replace('#', '').trim());
    });
  });

  window.addEventListener('pageshow', e => { if (e.persisted && isOpen()) close(); });
})();

/* =====================================================
   Scrollspy — active nav link
   Positions cached on load/resize — ZERO layout reads on scroll
   ===================================================== */
(function initScrollspy() {
  const links = [...document.querySelectorAll('.menu__link[href^="#"]')];
  const targets = links
    .map(a => {
      const id = a.getAttribute('href').slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { id, el, link: a, top: 0 } : null;
    })
    .filter(Boolean);

  if (!targets.length) return;

  let activeId      = null;
  let cachedHeaderH = 60;

  // Pre-compute absolute top positions — no getBoundingClientRect in scroll
  function cachePositions() {
    const y = window.scrollY;
    targets.forEach(t => {
      t.top = t.el.getBoundingClientRect().top + y;
    });
  }

  // Cache header height — update on load/resize, never inside scroll handler
  function cacheHeaderH() {
    cachedHeaderH = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h')
    ) || 60;
  }

  function update(y) {
    let current = targets[0];
    for (const t of targets) {
      if (t.top - cachedHeaderH - 20 <= y) current = t;
      else break;
    }

    if (!current || activeId === current.id) return;
    activeId = current.id;
    targets.forEach(t =>
      t.link.classList.toggle('menu__link--active', t.id === activeId)
    );
  }

  // Cache positions and header height on load and resize
  window.addEventListener('load', () => { cacheHeaderH(); cachePositions(); update(window.scrollY); });
  window.addEventListener('resize', () => { cacheHeaderH(); cachePositions(); update(window.scrollY); }, { passive: true });
  cacheHeaderH();
  cachePositions();

  _scroll.on(update);
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
      const el  = entry.target;
      const to  = parseFloat(el.dataset.to);
      const dur = 1600;
      const t0  = performance.now();

      function tick(now) {
        const p    = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
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
   Hero parallax — desktop only, rAF-throttled
   ===================================================== */
(function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 767px)').matches) return;
  const img = document.querySelector('.hero__img-wrap img');
  if (!img) return;
  img.style.willChange = 'transform';
  _scroll.on(function (y) {
    img.style.transform = `scale(1.08) translateY(${y * 0.10}px)`;
  });
})();

/* =====================================================
   Theme switch — toggle + drag with spring physics
   ===================================================== */
(function initTheme() {
  const html = document.documentElement;
  const KEY  = 'eco-theme';

  // Must match CSS: track 58px, thumb 22px+3px offset each side → TRAVEL = 58-22-3-3 = 30... adjusted to 28
  const TRAVEL = 28;

  function isDark() { return html.classList.contains('dark-theme'); }

  function applyTheme(dark) {
    html.classList.toggle('dark-theme', dark);
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
    document.querySelectorAll('.theme-switch__input').forEach(cb => { cb.checked = dark; });
  }

  function burst(label) {
    if (!label) return;
    label.classList.remove('theme-switch--burst');
    void label.offsetWidth;
    label.classList.add('theme-switch--burst');
    label.addEventListener('animationend', () => label.classList.remove('theme-switch--burst'), { once: true });
  }

  document.querySelectorAll('.theme-switch__input').forEach(cb => {
    cb.checked = isDark();
    cb.addEventListener('change', function () {
      applyTheme(this.checked);
      burst(this.closest('.theme-switch'));
    });
  });

  // ── Drag interaction ──────────────────────────────────
  document.querySelectorAll('.theme-switch').forEach(label => {
    const input = label.querySelector('.theme-switch__input');
    const thumb = label.querySelector('.theme-switch__thumb');
    if (!thumb || !input) return;

    let dragging     = false;
    let startX       = 0;
    let startVal     = 0;
    let didDrag      = false;
    let themeChanged = false;

    function currentVal() { return isDark() ? TRAVEL : 0; }

    function setThumb(x, animate) {
      const clamped = Math.max(0, Math.min(TRAVEL, x));
      thumb.style.transition = animate
        ? 'transform .46s cubic-bezier(.34,1.56,.64,1), background .40s ease, box-shadow .40s ease'
        : 'background .40s ease, box-shadow .40s ease';
      thumb.style.transform = `translateX(${clamped}px)`;
    }

    function cleanup() {
      thumb.addEventListener('transitionend', () => {
        thumb.style.transform  = '';
        thumb.style.transition = '';
      }, { once: true });
    }

    thumb.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragging     = true;
      didDrag      = false;
      themeChanged = false;
      startX       = e.clientX;
      startVal     = currentVal();
      thumb.setPointerCapture(e.pointerId);

      thumb.style.transition = 'transform .15s var(--ease-spring), background .40s ease, box-shadow .40s ease';
      thumb.style.transform  = `translateX(${startVal}px) scale(1.22) scaleX(0.9)`;
      e.preventDefault();
    });

    thumb.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 2) didDrag = true;
      const x = Math.max(0, Math.min(TRAVEL, startVal + dx));

      const stretch = 1 + Math.abs(dx) * 0.003;
      thumb.style.transition = 'background .40s ease, box-shadow .40s ease';
      thumb.style.transform  = `translateX(${x}px) scale(1.10) scaleX(${Math.min(stretch, 1.22)})`;

      const shouldBeDark = x / TRAVEL >= 0.5;
      if (shouldBeDark !== isDark()) {
        applyTheme(shouldBeDark);
        themeChanged = true;
      }
    });

    thumb.addEventListener('pointerup', e => {
      if (!dragging) return;
      dragging = false;
      thumb.releasePointerCapture(e.pointerId);

      if (!didDrag) {
        thumb.style.transform  = '';
        thumb.style.transition = '';
        return;
      }

      const target = isDark() ? TRAVEL : 0;
      setThumb(target, true);
      cleanup();
      if (themeChanged) burst(label);
    });

    thumb.addEventListener('pointercancel', () => {
      if (!dragging) return;
      dragging = false;
      setThumb(isDark() ? TRAVEL : 0, true);
      cleanup();
    });
  });

  // Initial run
  _scroll.run();
})();
