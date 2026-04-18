# EcoGroup — Экология это важно

Информационно-образовательный сайт об экологических проблемах, правилах сортировки отходов и способах помочь природе.

## Стек технологий

| Слой | Технология |
|------|-----------|
| Разметка | Semantic HTML5 |
| Стили | Vanilla CSS (2 250+ строк, переменные, grid, flexbox, glassmorphism) |
| Скрипты | Vanilla JS ES6 (одна точка входа, IIFE-модули) |
| Анимации | AOS 2.3.1 (animate-on-scroll), CSS keyframes |
| Иконки | Font Awesome 6.5 |
| Шрифты | Google Fonts — Rubik, Raleway |
| PWA | Service Worker (Cache API), Web App Manifest |

Без фреймворков, без бандлера, без зависимостей в рантайме.

## Структура файлов

```
ecosait/
├── index.html              # Главная страница (~560 строк)
├── 404.html                # Страница ошибки + offline PWA (инлайн CSS/JS)
├── sw.js                   # Service Worker (eco-v3, cache-first / network-first)
├── manifest.json           # PWA-манифест (иконки до 512px, categories)
├── browserconfig.xml       # Microsoft tile config
├── robots.txt              # Директивы для поисковых роботов
├── sitemap.xml             # XML-карта сайта
├── generate-favicons.js    # Dev-утилита: генерация фавиконок из SVG (Sharp)
│
├── css/
│   └── main.css            # Все стили (~2 250 строк)
│
├── js/
│   └── top.js              # Все скрипты (~456 строк)
│
└── img/
    ├── main.png / main.webp              # Hero-изображение (547×394)
    ├── item_1-3.png / .webp             # Иконки правил (90×90)
    ├── Video.gif / Video.webp           # QR-код для теста (164×164)
    ├── trash/
    │   └── trash_can_*.png / .webp      # Иконки сортировки (90×90, 4 шт.)
    └── illustration/
        ├── illustration_1-6.png / .webp # Иллюстрации проблем (900×600)
        └── ecology_1.png / .webp        # Иллюстрация вывода (500×500)
```

Каждое изображение существует в двух форматах: PNG (fallback) и WebP (основной, −70% размера).
Favicon-ассеты (Apple, Android, MS) хранятся в корне `ecosait/` и подключены через `<head>`.

## Запуск

Статический сайт — достаточно любого HTTP-сервера:

```bash
# Python (встроен в macOS / Linux)
python3 -m http.server 3333 --directory ecosait

# Node.js
npx serve ecosait

# VS Code
# Live Server → Right click index.html → Open with Live Server
```

После запуска откройте [http://localhost:3333](http://localhost:3333).

> **Важно:** Service Worker работает только по `http://` или `https://`, не через `file://`.

## Архитектура JS (`js/top.js`)

Все модули изолированы в IIFE и регистрируются через центральный rAF-диспетчер скролла:

```
_scroll (центральный dispatcher)
 ├── initProgressBar   — полоса прогресса
 ├── initHeader        — прозрачный → frosted header
 ├── initBackToTop     — кнопка «Наверх» (spring-анимация, launch)
 ├── initScrollspy     — активная ссылка в навигации
 └── initParallax      — parallax героя (только desktop)

Независимые модули:
 ├── initAOS           — animate-on-scroll
 ├── initBurger        — мобильное меню (фокус-ловушка, scroll-lock, ESC)
 ├── initCounters      — анимированные счётчики (IntersectionObserver)
 └── initTheme         — переключатель тем (drag + spring + localStorage)
```

**Ключевые решения:**
- Один `scroll` listener → один rAF → нулевой layout thrashing
- Scrollspy кеширует `--header-h` через `cachedHeaderH` (не вызывает `getComputedStyle` на каждом скролле)
- Scroll-lock через `html { overflow: hidden }` (без `position:fixed` → нет прыжка позиции)
- Фокус-ловушка в мобильном меню: Tab/Shift+Tab замкнуты внутри панели, ESC закрывает
- Тема сохраняется в `localStorage`; анти-FOUC скрипт в `<head>` применяет класс до рендера

## Архитектура CSS (`css/main.css`)

```
:root           → токены: цвета, тени, радиусы, эзинги (incl. --ease-luxury)
                  Light mode: --lm-bg, --lm-bg-alt, --lm-card, --lm-card-alt
Reset           → box-sizing, margin/padding 0, focus-visible стили
Buttons         → .btn, .btn--primary, .btn--outline, .btn--glow
Header          → transparent → frosted on scroll, burger lines
Hero            → full-viewport, parallax img-wrap, QR-card
Rules           → grid карточек правил
Trash           → grid карточек сортировки
Problems        → чередующийся layout, счётчики
Footer          → grid, колонки
Back-to-top     → glassmorphism FAB, 7 keyframe-анимаций
Mobile panel    → slide-in, Quiet Luxury easing, deep sage (light) / forest (dark)
Responsive      → 6 breakpoints (320 → 1280+)
Theme switch    → day/night orb, drag physics, burst rings
Dark mode       → полный override через html.dark-theme
Reduced motion  → animation: none для декоративных элементов
Print           → скрытие интерактивных элементов
```

## Особенности

### Производительность
- **WebP-изображения** — все 15 изображений сконвертированы в WebP (−72% в среднем), подключены через `<picture>` с PNG-fallback
- **`defer` на скриптах** — AOS.js и top.js загружаются без блокировки парсинга, порядок гарантирован
- **Hero LCP** — `loading="eager"`, `fetchpriority="high"`, `decoding="sync"`, `<link rel="preload" type="image/webp">`
- **CLS = 0** — все `<img>` имеют явные `width`/`height`
- **Scroll hot path** — `getComputedStyle` вызывается только на `load`/`resize`, не на каждом `scroll`

### PWA
- **Service Worker** (`sw.js`, версия `eco-v3`) — precache всех страниц и изображений (PNG + WebP), network-first для навигации, cache-first для ассетов, `/404.html` как offline-fallback
- **Manifest** — иконки 36–512px, `display: standalone`, `categories: ["education", "lifestyle"]`
- **404/offline-страница** — автоопределение состояния сети, SVG micro-анимации, автоперенаправление при восстановлении соединения

### SEO
- `<link rel="canonical">`, `og:url`, полный Open Graph + Twitter Card с абсолютными URL
- JSON-LD (`EducationalOrganization`) с `contactPoint`
- `sitemap.xml` + `robots.txt`
- `<meta name="googlebot" content="notranslate">`

### Безопасность
- SRI `integrity`-хэши на всех CDN-ресурсах (AOS, Font Awesome)
- `crossorigin="anonymous"` + `referrerpolicy="no-referrer"` на внешних скриптах

### Доступность (WCAG 2.1 AA)
- Skip-link (`#main`), семантические `<main id="main">`, `<nav aria-label>`, `<article>`
- `aria-live="polite" aria-atomic="true"` на анимированных счётчиках
- `aria-expanded` на бургере, фокус-ловушка в мобильном меню
- `focus-visible` стили на всех интерактивных элементах
- `prefers-reduced-motion` — отключает декоративные анимации

### Дизайн
- **Светлая тема** — sage-white палитра (`#f2f4f1`), устраняет эффект «ослепления» от чистого белого; секции варьируются от `#dce8da` до `#e9ede8`
- **Мобильное меню (Quiet Luxury)** — панель `#1b2a1e` (deep sage) в светлой теме / `#050f08` в тёмной; анимация на `cubic-bezier(0.16,1,0.3,1)`; белые ссылки с teal-счётчиками в обеих темах
- **Тёмная тема** — `#0d1117` base, полный override через `html.dark-theme`
