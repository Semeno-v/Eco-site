# EcoGroup — Экология это важно

Информационно-образовательный сайт об экологических проблемах, правилах сортировки отходов и способах помочь природе.

## Стек технологий

| Слой | Технология |
|------|-----------|
| Разметка | Semantic HTML5 |
| Стили | Vanilla CSS (2 200+ строк, переменные, grid, flexbox, glassmorphism) |
| Скрипты | Vanilla JS ES6 (одна точка входа, IIFE-модули) |
| Анимации | AOS 2.3.1 (animate-on-scroll), CSS keyframes |
| Иконки | Font Awesome 6.5 |
| Шрифты | Google Fonts — Rubik, Raleway |

Без фреймворков, без бандлера, без зависимостей в рантайме.

## Структура файлов

```
ecosait/
├── index.html              # Единственная страница (530 строк)
├── manifest.json           # PWA-манифест
├── browserconfig.xml       # Microsoft tile config
├── generate-favicons.js    # Dev-утилита: генерация фавиконок из SVG (Sharp)
│
├── css/
│   └── main.css            # Все стили (~2 200 строк)
│
├── js/
│   └── top.js              # Все скрипты (~430 строк)
│
└── img/
    ├── main.png                    # Hero-изображение (547×394)
    ├── item_1-3.png                # Иконки правил (90×90)
    ├── Video.gif                   # QR-код для теста (164×164)
    ├── trash/
    │   └── trash_can_*.png         # Иконки сортировки (90×90, 4 шт.)
    └── illustration/
        ├── illustration_1-6.png    # Иллюстрации проблем (900×600)
        └── ecology_1.png           # Иллюстрация вывода (500×500)
```

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
 ├── initBurger        — мобильное меню (drag, scroll-lock, ESC)
 ├── initCounters      — анимированные счётчики (IntersectionObserver)
 └── initTheme         — переключатель тем (drag + spring + localStorage)
```

**Ключевые решения:**
- Один `scroll` listener → один rAF → нулевой layout thrashing
- Scrollspy кеширует позиции секций на load/resize, не читает DOM на каждом скролле
- Scroll-lock через `html { overflow: hidden }` (без `position:fixed` → нет прыжка позиции)
- Тема сохраняется в `localStorage`; анти-FOUC скрипт в `<head>` применяет класс до рендера

## Архитектура CSS (`css/main.css`)

```
:root           → токены: цвета, тени, радиусы, эзинги
Reset           → box-sizing, margin/padding 0
Buttons         → .btn, .btn--primary, .btn--outline, .btn--glow
Header          → transparent → frosted on scroll, burger lines
Hero            → full-viewport, parallax img-wrap, QR-card
Rules           → grid карточек правил
Trash           → grid карточек сортировки
Problems        → чередующийся layout, счётчики
Footer          → grid, колонки
Back-to-top     → glassmorphism FAB, 7 keyframe-анимаций
Mobile panel    → slide-in, light/dark glass variants
Responsive      → 6 breakpoints (320 → 1280+)
Theme switch    → day/night orb, drag physics, burst rings
Dark mode       → полный override через html.dark-theme
Print           → скрытие интерактивных элементов
```

## Особенности

- **Светлая тема по умолчанию** — тёмная применяется только если `localStorage['eco-theme'] === 'dark'`
- **prefers-reduced-motion** — AOS, параллакс и счётчики отключаются автоматически
- **iOS safe-area** — `viewport-fit=cover` + `env(safe-area-inset-bottom)`
- **CLS = 0** — все `<img>` имеют явные `width`/`height`
- **LCP оптимизирован** — hero-изображение: `loading="eager"`, `fetchpriority="high"`, `decoding="sync"`, `<link rel="preload">`
- **PWA-ready** — manifest.json, theme-color, apple-touch-icon
