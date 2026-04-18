---
name: quiz-patente
description: >
  Контекст и план разработки SPA-приложения Quiz Patente — веб-сервис для
  изучения теоретических вопросов итальянских ПДД. Используй этот skill при
  любой задаче, связанной с этим проектом: написании компонентов, хуков,
  утилит, стилей, логики хранения данных, маршрутизации и всего остального.
  Всегда читай этот файл перед началом работы над любой задачей проекта,
  чтобы соблюдать архитектуру, стек, соглашения по именованию и текущий
  статус плана разработки.
---

# Quiz Patente — Контекст проекта

## 1. Суть проекта

Личное веб-приложение (SPA) для подготовки к теоретическому экзамену на
водительские права в Италии. Данные — JSON-файл с 7095 вопросами в формате
true/false, разбитыми на 25 тематических категорий, с переводом на русский язык.

Целевая аудитория: один пользователь (личное использование).
Текущий этап: frontend на localStorage. Запланирован переезд на backend.

**Целевое устройство:** iPad mini 2 (model A1490), Chrome 92.
Современные CSS-фичи разрешены — ориентируемся на Chrome 92+.

---

## 2. Технологический стек

### Текущий (Phase 1 — Frontend only)

| Слой | Решение | Примечание |
|---|---|---|
| Frontend | React + Vite | `npm create vite@latest` |
| Стили | Собственный CSS | без фреймворков, CSS-переменные |
| Роутинг | React Router v6 | `<BrowserRouter>` |
| Данные | JSON-файлы в `src/data/` | разбиты по категориям, ленивая загрузка |
| Хранилище | localStorage | через абстрактный слой (см. секцию 9) |
| Деплой | Vercel + GitHub CI/CD | автодеплой при пуше в `main` |
| Legacy | @vitejs/plugin-legacy | Chrome 92 |

### Будущий (Phase 2 — с Backend)

| Слой | Решение |
|---|---|
| Backend | Node.js + Express.js |
| База данных | MongoDB Atlas ИЛИ Supabase (PostgreSQL) |
| Авторизация | Login/Password (JWT) |
| Хранилище | API вместо localStorage |

**Ключевой принцип:** компоненты никогда не знают откуда берутся данные.
Вся работа с хранилищем — только через `services/` слой. Смена localStorage
на API = правка только файлов в `src/services/`, компоненты не трогаем.

---

## 3. Структура проекта

```
quiz-patente/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD: автодеплой на Vercel
├── public/
├── src/
│   ├── assets/
│   │   └── icons/
│   │       └── index.js          ← каталог SVG-путей (Lucide-based)
│   │
│   ├── data/                   ← статические данные (только чтение)
│   │   ├── topics.json         ← метаданные 25 тем (id, title, image, count)
│   │   └── questions/
│   │       ├── topic_1.json    ← вопросы темы 1 (~200–500 вопросов)
│   │       └── ... topic_25.json
│   │
│   ├── services/               ← ВСЯ работа с данными/хранилищем
│   │   ├── progressService.js  ← сохранить/получить прогресс
│   │   ├── errorsService.js    ← сохранить/получить ошибки
│   │   └── questionsService.js ← загрузка вопросов (сейчас JSON, потом API)
│   │
│   ├── hooks/                  ← React-хуки, используют services
│   │   ├── useQuiz.js          ← логика прохождения теста
│   │   ├── useProgress.js      ← прогресс по категориям
│   │   └── useTopics.js        ← список тем с прогрессом
│   │
│   ├── components/             ← переиспользуемые UI-компоненты
│   │   ├── ui/                 ← атомарные: кнопки, карточки, спиннер
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Icon.jsx        ← универсальная SVG-иконка
│   │   │   ├── ProgressBar.jsx
│   │   │   └── Spinner.jsx
│   │   ├── quiz/               ← компоненты специфичные для quiz
│   │   │   ├── QuestionCard.jsx    ← блок с вопросом, картинкой, кнопками V/F
│   │   │   ├── QuizPagination.jsx  ← 30 кружков вверху, кликабельные
│   │   │   ├── CommentAccordion.jsx← раскрывающийся комментарий после ответа
│   │   │   └── ResultScreen.jsx    ← итоговый экран после 30 вопросов
│   │   ├── layout/
│   │   │   ├── AppHeader.jsx   ← тёмно-синий header
│   │   │   └── BottomNav.jsx   ← нижняя навигация (4 вкладки)
│   │   └── stats/
│   │       └── TopicStatRow.jsx ← строка статистики по теме
│   │
│   ├── pages/                  ← страницы = роуты
│   │   ├── HomePage.jsx        ← список 25 категорий
│   │   ├── QuizPage.jsx        ← страница прохождения теста
│   │   ├── ErrorsPage.jsx      ← повтор ошибок
│   │   ├── StatsPage.jsx       ← статистика
│   │   └── DictionaryPage.jsx  ← словарь (Этап 3)
│   │
│   ├── styles/
│   │   ├── global.css          ← reset + CSS-переменные
│   │   ├── layout.css          ← header, nav, page-wrapper
│   │   ├── components.css      ← кнопки, карточки, прогресс-бар
│   │   └── pages.css           ← стили страниц
│   │
│   ├── utils/
│   │   └── shuffle.js          ← перемешивание массива
│   │
│   ├── App.jsx                 ← роутинг
│   ├── main.jsx
│   └── index.css               ← @import всех CSS файлов
│
├── vite.config.js
├── vercel.json                 ← конфиг для SPA (rewrites)
└── package.json
```

---

## 4. Слой сервисов (services/) — ключевая абстракция

Это главная архитектурная идея. Компоненты и хуки вызывают только сервисы,
никогда не обращаются к localStorage или fetch напрямую.

### services/progressService.js
```javascript
// Сейчас: localStorage. Потом: заменить тело функций на fetch('/api/progress')
export function getProgress() { ... }
export function saveTestResult(topicId, results) { ... }
export function getTopicProgress(topicId) { ... }
```

### services/errorsService.js
```javascript
export function getErrors() { ... }
export function saveErrors(results) { ... }
export function getErrorQuestions(allQuestions) { ... }
export function clearErrors() { ... }
```

### services/questionsService.js
```javascript
// Сейчас: динамический import() JSON файлов
// Потом: fetch(`/api/questions/${topicId}`)
export async function loadTopicQuestions(topicId) { ... }
export async function loadAllQuestions() { ... }
export async function loadErrorQuestions() { ... }
```

---

## 5. localStorage — внутренняя схема (только для progressService / errorsService)

### Ключи
```javascript
const KEYS = {
  PROGRESS: 'qp_progress',
  ERRORS:   'qp_errors',
};
```

### qp_progress
```json
{
  "1": {
    "lastRun": 1712000000000,
    "correct": 24,
    "total": 30,
    "bestScore": 27,
    "runs": 5
  }
}
```

### qp_errors
```json
{
  "78": 2,
  "245": 1,
  "603": 3
}
```

Значение = счётчик неправильных ответов.
Правильный ответ → счётчик -1. При 0 → удалить ключ.

---

## 6. Структура данных JSON

### Тема (topics.json)
```json
[
  {
    "topic_id": 1,
    "title": "Strada, veicoli, doveri conducente",
    "image": "https://quizpatente-web.s3.../thumbs/01.png",
    "questions_count": 518
  }
]
```

### Вопрос (topic_N.json — массив)
```json
{
  "id": 1,
  "topic_id": 1,
  "text": "In una carreggiata del tipo rappresentato...",
  "text_ru": "На проезжей части представленного типа...",
  "image": "https://quizpatentelng.s3.../imgquiz/550.jpg",
  "comment": {
    "text": "Su una carreggiata con due corsie...",
    "text_ru": "На проезжей части с двумя полосами...",
    "image": "https://quizpatentelng.s3.../imgcommenti/02_169_05_per004e.jpg"
  },
  "answer": true
}
```

**Правила:**
- `answer`: `true` = VERO, `false` = FALSO
- `audio` — отсутствует в файлах (вырезан скриптом split-questions.js)
- Изображения: URL напрямую из JSON, всегда `loading="lazy"`, `alt=""`
- В сессии всегда 30 вопросов (случайная выборка из доступных)

---

## 7. useQuiz hook — контракт

```javascript
const {
  questions,   // массив 30 вопросов сессии
  current,     // индекс активного вопроса (0-based)
  goTo,        // fn(index) — прыгнуть к вопросу по индексу (пагинация)
  answered,    // Map<questionId, boolean> — ответы пользователя
  answer,      // fn(userAnswer: boolean) — ответить на текущий вопрос
  results,     // массив { questionId, correct, topicId } — только отвеченные
  isFinished,  // boolean — все 30 вопросов отвечены
  finish,      // fn() — завершить сессию вручную (кнопка финиша)
  loading,     // boolean
  error,       // string | null
} = useQuiz(topicId);
```

`topicId`: `"1"`–`"25"` | `"all"` | `"errors"`

---

## 8. UX-флоу страницы Quiz

### Макет страницы (сверху вниз):
```
┌─────────────────────────────────────────┐
│  AppHeader  (тёмно-синий, название темы)│
├─────────────────────────────────────────┤
│  QuizPagination                         │
│  [1][2][3]...[30]  ← кликабельные      │
│  серый=не отвечен, зелёный=верно,       │
│  красный=неверно, синий=активный        │
├─────────────────────────────────────────┤
│  QuestionCard                           │
│  ┌───────────────────────────────────┐  │
│  │ [изображение вопроса, если есть]  │  │
│  │                                   │  │
│  │ Текст вопроса (итальянский)       │  │
│  │ Текст перевода (русский, скрыт)   │  │
│  │                           [V] [F] │  │ ← кнопки справа внизу карточки
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  [🇷🇺 перевод]              [💬][✅]   │
│  кнопка перевода слева   комментарий   │
│                          и финиш справа │
├─────────────────────────────────────────┤
│  CommentAccordion (раскрывается вниз)   │
│  ✅ Corretto! / ❌ Sbagliato!           │
│  Правильный ответ: VERO/FALSO           │
│  Текст комментария (IT)                 │
│  Текст комментария (RU)                 │
│  [изображение комментария]              │
└─────────────────────────────────────────┘
```

### Состояния кнопок V / F:
- До ответа: обе активны
- После ответа: правильная — зелёная, неправильная (если выбрана) — красная, обе задизейблены

### Кнопка перевода (🇷🇺):
- Тоггл: показывает/скрывает `text_ru` прямо под итальянским текстом
- Состояние перевода сохраняется на всю сессию (если включил — остаётся)

### Кнопка комментария (💬):
- Появляется только после ответа на текущий вопрос
- Открывает/закрывает CommentAccordion

### Кнопка финиша (✅):
- Активна только когда все 30 вопросов отвечены (`isFinished === true`)
- При нажатии → ResultScreen

### ResultScreen (поверх страницы, или отдельный роут):
```
Результат: 24 / 30
Правильных: 80%
[🔁 Попробовать снова] [← К темам]
```

---

## 9. Дизайн-система (Design Guide)

### Цвета
```css
:root {
  /* Основные */
  --color-primary:         #2563eb;   /* синий — акцент */
  --color-primary-hover:   #1d4ed8;
  --color-header-bg:       #0d1b2a;   /* тёмно-синий — header */
  --color-header-text:     #ffffff;

  /* Фоны */
  --color-bg:              #f3f4f6;   /* фон страниц */
  --color-surface:         #ffffff;   /* фон карточек */
  --color-border:          #e5e7eb;

  /* Текст */
  --color-text:            #111827;
  --color-text-secondary:  #6b7280;
  --color-text-muted:      #9ca3af;

  /* Статусы */
  --color-correct:         #16a34a;
  --color-correct-bg:      #f0fdf4;
  --color-correct-border:  #bbf7d0;
  --color-wrong:           #dc2626;
  --color-wrong-bg:        #fef2f2;
  --color-wrong-border:    #fecaca;
  --color-unanswered:      #d1d5db;   /* пагинация — не отвечен */
  --color-active:          #2563eb;   /* пагинация — активный */
}
```

### Типографика
```css
:root {
  --font-family:    -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs:   12px;
  --font-size-sm:   13px;
  --font-size-md:   15px;
  --font-size-lg:   17px;
  --font-size-xl:   20px;
  --font-size-2xl:  24px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold:   700;
  --line-height:    1.5;
}
```

### Отступы и радиусы
```css
:root {
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 48px;

  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10);

  --header-height: 52px;
  --nav-height:    56px;
}
```

### Компонент: кнопка VERO
```css
.btn-vero {
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-md);
  padding: 10px 24px;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  border: 2px solid transparent;
  cursor: pointer;
  min-width: 80px;
}
.btn-vero:disabled { opacity: 0.5; cursor: default; }
.btn-vero.correct  { background: var(--color-correct); }
```

### Компонент: кнопка FALSO
```css
.btn-falso {
  background: #fff;
  color: var(--color-text);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 24px;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  cursor: pointer;
  min-width: 80px;
}
.btn-falso:disabled { opacity: 0.5; cursor: default; }
.btn-falso.wrong    { border-color: var(--color-wrong); color: var(--color-wrong); }
```

### Компонент: карточка темы (HomePage)
- Белая карточка, border-radius: --radius-lg, shadow-sm
- Изображение темы слева (48×48px)
- Название темы + прогресс "X / Y вопросов"
- ProgressBar под текстом (тонкая полоска, синяя)
- При hover: shadow-md

### Компонент: пагинация (QuizPagination)
- 30 кружков, 28×28px
- gap: 4px, горизонтальная прокрутка если не помещается
- Состояния: серый (не отвечен), синий (активный), зелёный (верно), красный (неверно)
- Клик → goTo(index)

---

## 9.5. Система иконок (Icon System)

**Подход:** Inline SVG компоненты (не спрайты, не иконочный шрифт).
**Источник:** [Lucide Icons](https://lucide.dev/) (MIT), stroke-based, `viewBox="0 0 24 24"`.

### Архитектура

```
src/assets/icons/index.js   ← каталог: объект ICONS { name: '<path ...>' }
src/components/ui/Icon.jsx  ← обёртка: <svg> + React.memo
```

### Использование

```jsx
import Icon from '../ui/Icon';

// Базовое — наследует цвет от родителя через currentColor
<Icon name="home" size={24} />

// С явным цветом
<Icon name="check" size={16} color="var(--color-correct)" />

// С доп. классом
<Icon name="comment" size={22} className="my-class" />
```

### Доступные иконки (15 шт.)

| Имя | Где используется |
|---|---|
| `home` | BottomNav — Главная |
| `refresh` | BottomNav — Ошибки |
| `chart` | BottomNav — Статистика |
| `book` | BottomNav — Словарь |
| `arrow-left` | AppHeader — Назад |
| `comment` | QuestionCard — Комментарий |
| `translate` | (доступна, сейчас используется emoji 🇷🇺) |
| `check` | Статус — верно |
| `x` | Статус — неверно |
| `check-circle` | ResultScreen — верно |
| `x-circle` | ResultScreen — неверно |
| `flag` | Финиш |
| `trophy` | Результат |
| `rotate` | Попробовать снова |
| `log-out` | Выход |

### Добавление новой иконки (3 шага)

1. Найти иконку на [lucide.dev](https://lucide.dev/)
2. Скопировать содержимое `<svg>` и добавить в `src/assets/icons/index.js`:
   ```javascript
   'new-icon': '<path d="M..." />',
   ```
3. Использовать: `<Icon name="new-icon" />`

### Принципы

- **`React.memo`** на Icon — предотвращает лишние ре-рендеры SVG DOM (критично для iPad mini 2)
- **`currentColor`** — цвет иконки наследуется от CSS родителя
- **Tree-shaking** — Vite включает в бандл только импортированные иконки
- **Никаких icon-библиотек** (FontAwesome и т.п.) — они слишком тяжёлые
- **Emoji `🇷🇺`** оставлен для кнопки перевода — лучше UX-узнаваемость

---

## 10. Маршруты

```
/                     → HomePage
/quiz/:topicId        → QuizPage  (topicId = 1–25 | "all" | "errors")
/stats                → StatsPage
/dictionary           → DictionaryPage  (Этап 3)
```

Страница Errors отдельной страницей не нужна — это просто `/quiz/errors`.
Кнопка "Ripasso errori" в HomeP age или BottomNav ведёт на `/quiz/errors`.

---

## 11. Навигация

### AppHeader
- Фон: `--color-header-bg` (#0d1b2a)
- Текст белый
- Высота: `--header-height` (52px)
- На QuizPage: показывает название темы + кнопку "← назад"
- На остальных: показывает название раздела

### BottomNav (4 вкладки)
```
🏠 Главная  |  🔁 Ошибки  |  📊 Статистика  |  📖 Словарь
/           |  /quiz/errors |  /stats         |  /dictionary
```
- Высота: `--nav-height` (56px)
- Активная вкладка: синяя иконка + синий текст
- Все страницы: `padding-bottom: var(--nav-height)`

---

## 12. DevOps — GitHub + Vercel CI/CD

### vercel.json (SPA rewrites — обязательно!)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Workflow GitHub Actions (.github/workflows/deploy.yml)
При пуше в `main` → Vercel автоматически деплоит.
Vercel подключается к GitHub репозиторию через интерфейс vercel.com —
отдельный workflow файл не нужен, Vercel сам настраивает хуки.

### Шаги настройки CI/CD:
1. `git init` + создать репозиторий на GitHub
2. Подключить репозиторий на vercel.com (Import Project)
3. Vercel автоматически деплоит при каждом пуше в `main`
4. Preview-деплой создаётся для каждого PR автоматически

---

## 13. Vite конфиг

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 92'],
    }),
  ],
});
```

---

## 14. Что НЕ делаем (сейчас)

| Что | Почему / Когда |
|---|---|
| Backend | Phase 2 — после завершения frontend |
| Авторизация | Phase 2 |
| Синхронизация между устройствами | Phase 2 |
| Tailwind / UI-фреймворк | Собственный CSS — полный контроль |
| TypeScript | Добавим при переходе на Phase 2 |
| Аудио | Вырезано из JSON, не нужно |
| Анимации/transitions | Не нужны для обучения |
| Геймификация | Не нужна |
| Скачивание изображений | S3 URL работают напрямую |
| Круговые графики (Chart.js) | Простые прогресс-бары достаточно |
| Отдельная страница Errors | Это просто /quiz/errors |

---

## 15. План разработки и статус

### ✅ Этап 0 — Подготовка (выполнено)
- [x] Написать `scripts/split-questions.js`
- [x] Запустить скрипт → `topics.json` + 25 файлов `topic_N.json`
- [x] Проект инициализирован (Vite + React)

### Этап 1 — Фундамент и Quiz (текущий)

**1.1 Настройка проекта**
- [x] `vite.config.js` — plugin-legacy
- [x] `vercel.json` — SPA rewrites
- [x] `src/index.css` — импорт всех стилей
- [x] `src/styles/global.css` — CSS-переменные + reset

**1.2 Сервисный слой**
- [x] `src/services/questionsService.js`
- [x] `src/services/progressService.js`
- [x] `src/services/errorsService.js`
- [x] `src/utils/shuffle.js`

**1.3 Хуки**
- [x] `src/hooks/useTopics.js`
- [x] `src/hooks/useQuiz.js`
- [x] `src/hooks/useProgress.js`

**1.4 Layout**
- [x] `src/components/layout/AppHeader.jsx`
- [x] `src/components/layout/BottomNav.jsx`
- [x] `src/App.jsx` — роутинг

**1.5 UI-компоненты (атомарные)**
- [x] `src/components/ui/Button.jsx`
- [x] `src/components/ui/Card.jsx`
- [x] `src/components/ui/Icon.jsx` — SVG-иконки (Lucide)
- [x] `src/components/ui/ProgressBar.jsx`
- [x] `src/components/ui/Spinner.jsx`
- [x] `src/assets/icons/index.js` — каталог SVG-путей

**1.6 Quiz-компоненты**
- [x] `src/components/quiz/QuizPagination.jsx`
- [x] `src/components/quiz/QuestionCard.jsx`
- [x] `src/components/quiz/CommentAccordion.jsx`
- [x] `src/components/quiz/ResultScreen.jsx`

**1.7 Страницы**
- [x] `src/pages/HomePage.jsx`
- [x] `src/pages/QuizPage.jsx`

**1.8 Стили**
- [x] `src/styles/layout.css`
- [x] `src/styles/components.css`
- [x] `src/styles/pages.css`

### Этап 2 — Статистика
- [ ] `src/pages/StatsPage.jsx`
- [ ] `src/components/stats/TopicStatRow.jsx`

### Этап 3 — Словарь
- [ ] `src/data/dictionary.json`
- [ ] `src/pages/DictionaryPage.jsx`

### Phase 2 — Backend (будущее)
- [ ] Node.js + Express.js API
- [ ] MongoDB Atlas или Supabase
- [ ] JWT авторизация
- [ ] Замена services/ на API-запросы

---

## 16. Соглашения по коду

- **Компоненты:** PascalCase, `.jsx` (`QuestionCard.jsx`)
- **Хуки:** camelCase с префиксом `use` (`useQuiz.js`)
- **Сервисы:** camelCase с суффиксом `Service` (`progressService.js`)
- **Утилиты:** camelCase (`shuffle.js`)
- **CSS-классы:** kebab-case (`.question-card`, `.btn-vero`)
- **Стили:** только через CSS-классы, inline style только для динамических значений (например ширина прогресс-бара)
- **Данные:** только через `services/`, никогда не импортировать JSON в компонентах напрямую
- **Изображения:** всегда `loading="lazy"` + `alt=""`
- **Язык UI:** итальянский для терминов quiz (VERO/FALSO, Corretto/Sbagliato), русский для навигации

---

## 17. Инициализация (справочно — уже выполнено)

```bash
npm create vite@latest quiz-patente -- --template react
cd quiz-patente
npm install react-router-dom
npm install -D @vitejs/plugin-legacy terser
```