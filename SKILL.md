---
name: app-quiz-patente
description: >
  Контекст и план разработки SPA-приложения Quiz Patente — веб-сервис для
  изучения теоретических вопросов итальянских ПДД. Используй этот skill при
  любой задаче, связанной с этим проектом: написании компонентов, хуков,
  утилит, стилей, логики хранения данных, маршрутизации и всего остального.
  Всегда читай этот файл перед началом работы над любой задачей проекта,
  чтобы соблюдать архитектуру, стек, соглашения по именованию и текущий
  статус плана разработки.
---

# Quiz Patente — Контекст проекта (v2 — Синхронизировано с реальной реализацией)

## 1. Суть проекта

Личное веб-приложение (SPA) для подготовки к теоретическому экзамену на
водительские права в Италии. Данные — JSON-файл с 7095 вопросами в формате
true/false, разбитыми на 25 тематических категорий, с переводом на русский язык.

Целевая аудитория: один пользователь (личное использование).
Текущий этап: frontend на localStorage. Запланирован переезд на backend.

**Целевое устройство:** iPad mini 2 (model A1490), Chrome 92 (iOS 12 WebKit).
Внимание: iOS 12 НЕ поддерживает `gap` в flexbox. Используй margins для отступов между элементами.
Современные CSS-фичи разрешены — ориентируемся на Chrome 92+.

---

## 2. Технологический стек

### Текущий (Phase 1 — Frontend only)

| Слой | Решение | Примечание |
|---|---|---|
| Frontend | React 19 + Vite | `npm create vite@latest` |
| Стили | Собственный CSS | без фреймворков, CSS-переменные |
| Роутинг | React Router v6 | `<BrowserRouter>` |
| Данные | JSON-файлы в `src/data/` | разбиты по категориям, ленивая загрузка |
| Хранилище | localStorage | через абстрактный слой (см. секцию 4) |
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

## 3. Структура проекта (актуальная)

```
app-quiz-patente/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD: автодеплой на Vercel
├── public/
├── src/
│   ├── assets/
│   │   └── icons/
│   │       └── index.js        ← каталог SVG-путей (Lucide-based, 15 иконок)
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
│   │   ├── useQuiz.js          ← логика прохождения теста (основной хук)
│   │   ├── useTopics.js        ← загрузка тем с прогрессом
│   │   ├── useProgress.js      ← прогресс по категориям (read-only)
│   │   ├── useErrorTopics.js   ← загрузка тем с подсчетом ошибок (оптимизированно)
│   │   └── useSwipe.js         ← обработка touch-жестов для навигации
│   │
│   ├── components/             ← переиспользуемые UI-компоненты
│   │   ├── ui/                 ← атомарные UI-компоненты
│   │   │   ├── Button.jsx      ← универсальная кнопка (primary, vero, falso, icon)
│   │   │   ├── Card.jsx        ← базовая карточка
│   │   │   ├── Icon.jsx        ← универсальная SVG-иконка (React.memo)
│   │   │   ├── ProgressBar.jsx ← прогресс-бар (тонкая полоска)
│   │   │   ├── Spinner.jsx     ← загрузка (спиннер)
│   │   │   ├── ConfirmationModal.jsx ← модальное окно подтверждения
│   │   │   └── SlideTransition.jsx   ← анимация slide-fade для смены вопросов
│   │   │
│   │   ├── quiz/               ← компоненты специфичные для quiz
│   │   │   ├── QuestionCard.jsx    ← блок с вопросом, картинкой, кнопками V/F
│   │   │   ├── QuizPagination.jsx  ← 30 кружков вверху, кликабельные (горизонтальный слайдер)
│   │   │   ├── CommentAccordion.jsx← раскрывающийся комментарий после ответа
│   │   │   └── ResultScreen.jsx    ← итоговый экран (оверлей) после 30 вопросов
│   │   │
│   │   ├── layout/
│   │   │   ├── AppHeader.jsx   ← верхний хедер (тёмно-синий, sticky)
│   │   │   └── BottomNav.jsx   ← нижняя навигация (4 вкладки, скрыта на /quiz/*)
│   │   │
│   │   └── stats/
│   │       └── TopicStatRow.jsx ← строка статистики по теме (Phase 2, placeholder)
│   │
│   ├── pages/                  ← страницы = роуты
│   │   ├── HomePage.jsx        ← список 25 категорий с прогрессом
│   │   ├── QuizPage.jsx        ← страница прохождения теста (основная логика)
│   │   ├── ErrorsPage.jsx      ← страница для работы над ошибками (выбор темы)
│   │   ├── StatsPage.jsx       ← статистика (Phase 2, placeholder)
│   │   └── DictionaryPage.jsx  ← словарь (Phase 3, placeholder)
│   │
│   ├── styles/
│   │   ├── global.css          ← reset + CSS-переменные + типографика
│   │   ├── layout.css          ← grid, flexbox, container, page-wrapper
│   │   ├── components.css      ← кнопки, карточки, иконки, пагинация, аккордеон
│   │   └── pages.css           ← стили страниц (home, quiz, errors, stats, dictionary)
│   │
│   ├── utils/
│   │   └── shuffle.js          ← перемешивание массива (Fisher-Yates)
│   │
│   ├── App.jsx                 ← роутинг (BrowserRouter + Routes)
│   ├── main.jsx                ← entry point
│   └── index.css               ← @import всех CSS файлов в правильном порядке
│
├── vite.config.js              ← конфиг Vite с plugin-legacy
├── vercel.json                 ← конфиг для SPA (rewrites к /index.html)
├── eslint.config.js            ← конфиг ESLint
├── package.json                ← зависимости
└── README.md
```

---

## 4. Слой сервисов (services/) — ключевая абстракция

Это главная архитектурная идея. Компоненты и хуки вызывают только сервисы,
никогда не обращаются к localStorage или fetch напрямую.

### services/progressService.js
```javascript
// Сейчас: localStorage. Phase 2: заменить тело функций на fetch('/api/progress')
export function getProgress() { ... }
export function getTopicProgress(topicId) { ... }
export function saveTestResult(topicId, correct, total) { ... }
export function clearProgress() { ... }
```

### services/errorsService.js
```javascript
// Сейчас: localStorage. Phase 2: заменить на fetch('/api/errors')
export function getErrors() { ... }
export function getErrorIds() { ... }
export function getErrorCount() { ... }
export function incrementError(questionId) { ... }
export function decrementError(questionId) { ... }
export function getErrorQuestions(allQuestions) { ... }
export function getErrorCountForQuestions(topicQuestions) { ... }
```

### services/questionsService.js
```javascript
// Сейчас: динамический import() JSON файлов. Phase 2: fetch(`/api/questions/...`)
export async function loadTopics() { ... }
export async function loadTopicQuestions(topicId) { ... }
export async function loadAllQuestions() { ... }
export async function loadTopicErrorQuestions(topicId) { ... }
export function pickSessionQuestions(questions) { ... } // 30 вопросов
```

---

## 5. localStorage — внутренняя схема (только для services/)

### Ключи
```javascript
const STORAGE_KEY_PROGRESS = 'qp_progress';
const STORAGE_KEY_ERRORS = 'qp_errors';
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
- Правильный ответ → счётчик -1
- При счётчике <= 0 → удалить ключ
- Используется для страницы `/errors` и режима `/quiz/errors:*`

---

## 6. Структура данных JSON

### Тема (topics.json)
```json
[
  {
    "topic_id": 1,
    "title": "Strada, veicoli, doveri conducente",
    "image": "https://quizpatente-web.s3.eu-central-1.amazonaws.com/media/images/quiz/thumbs/01.png",
    "questions_count": 531
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
  "image": "https://quizpatentelng.s3.eu-central-1.amazonaws.com/imgquiz/550.jpg",
  "comment": {
    "text": "Su una carreggiata con due corsie...",
    "text_ru": "На проезжей части с двумя полосами...",
    "image": "https://quizpatentelng.s3.eu-central-1.amazonaws.com/imgcommenti/02_169_05_per004e.jpg"
  },
  "answer": true
}
```

**Правила:**
- `answer`: `true` = VERO, `false` = FALSO
- `audio` — отсутствует в файлах (вырезан на этапе подготовки)
- `image`, `comment.image`: S3 URL с `loading="lazy"`, `alt=""`
- В каждой сессии всегда 30 вопросов (случайная выборка из доступных)
- При режиме `/quiz/errors:topicId` — 30 вопросов из текущих ошибок этой темы

---

## 7. useQuiz hook — контракт (основной)

Главный хук для управления сессией теста.

```javascript
const {
  questions,   // Array<question> — 30 вопросов в текущей сессии
  current,     // number (0-based) — индекс активного вопроса
  goTo,        // fn(index: number) → void — перейти к вопросу по индексу (пагинация)
  answered,    // Map<questionId, boolean> — ответы пользователя
  answer,      // fn(userAnswer: boolean) → void — ответить на текущий вопрос
  results,     // Array<{questionId, correct, topicId}> — результаты для каждого ответа
  isFinished,  // boolean — все 30 вопросов отвечены?
  finish,      // fn() → void — завершить сессию (сохранить статистику)
  reset,       // fn() → void — перезапустить сессию (новые 30 вопросов)
  loading,     // boolean
  error,       // string | null
} = useQuiz(topicId);
```

**topicId варианты:**
- `"1"`–`"25"` — конкретная тема
- `"all"` — случайные вопросы из всех тем
- `"errors"` — случайные вопросы из всех текущих ошибок пользователя
- `"errors:1"` — вопросы из ошибок конкретной темы (используется на ErrorsPage)

---

## 8. Остальные хуки

### useTopics.js
Загружает список 25 тем и обогащает каждую полем `progress` из progressService.
```javascript
const { topics, loading, error } = useTopics();
// topics[i].progress = { lastRun, correct, total, bestScore, runs } | null
```

### useProgress.js
Читает весь прогресс из progressService (read-only).
```javascript
const { progress, refresh, getForTopic } = useProgress();
// progress[topicId] = { lastRun, correct, total, bestScore, runs } | undefined
```

### useErrorTopics.js
Загружает темы с подсчётом количества ошибок в каждой (оптимизировано батчами).
Используется на странице ErrorsPage для отображения тем с количеством ошибок.
```javascript
const { topics, loading, error } = useErrorTopics();
// topics[i].errorCount = number
```

### useSwipe.js
Хук для обработки touch-жестов свайпа (влево = следующий, вправо = предыдущий).
Используется на QuizPage для мобильной навигации между вопросами.
```javascript
const handlers = useSwipe({
  onSwipeLeft: () => { ... },
  onSwipeRight: () => { ... },
  threshold: 60
});
// Возвращает { onTouchStart, onTouchMove, onTouchEnd } для прикрепления к элементу
```

---

## 9. Система дизайна (Design System)

### 9.1 CSS-переменные

#### Цвета
```css
:root {
  /* === Основные === */
  --color-primary:         #2563eb;   /* синий — акцент */
  --color-primary-hover:   #1d4ed8;
  --color-primary-dark:    #1d4ed8;
  --color-header-bg:       #0d1b2a;   /* тёмно-синий — header */
  --color-header-text:     #ffffff;

  /* === Акцентные (Redesign v3) === */
  --color-accent-dark:     #101B30;   /* тёмно-синий для текста в кнопках */
  --color-accent-light:    #D7E2FF;   /* светло-голубой для borders/backgrounds */
  --color-accent-error-light: #FFDAD7; /* светло-красный для FALSO границ */
  --color-btn-quiz-bg:     #FDFBD4;   /* светло-жёлтый фон кнопок VERO/FALSO */

  /* === Фоны === */
  --color-bg:              #f3f4f6;   /* фон страниц */
  --color-surface:         #ffffff;   /* фон карточек */
  --color-surface-alt:     #f9fafb;
  --color-border:          #e5e7eb;

  /* === Текст === */
  --color-text:            #111827;
  --color-text-secondary:  #6b7280;
  --color-text-muted:      #9ca3af;

  /* === Статусы === */
  --color-correct:         #34C759;   /* зелёный — верно */
  --color-correct-bg:      #f0fdf4;
  --color-correct-border:  #bbf7d0;
  --color-success:         #34C759;
  --color-success-bg:      #f0fdf4;
  --color-wrong:           #dc2626;   /* красный — ошибка */
  --color-wrong-bg:        #fef2f2;
  --color-wrong-border:    #fecaca;
  --color-error:           #dc2626;
  --color-error-bg:        #fef2f2;
  --color-unanswered:      #d1d5db;   /* пагинация — не отвечен */
  --color-active:          #2563eb;   /* пагинация — активный вопрос */
}
```

#### Типографика
```css
:root {
  --font-family:            -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs:           14px;
  --font-size-sm:           16px;
  --font-size-base:         18px;
  --font-size-md:           20px;
  --font-size-lg:           24px;
  --font-size-xl:           28px;
  --font-size-2xl:          36px;
  --font-size-3xl:          48px;
  --font-weight-normal:     400;
  --font-weight-medium:     500;
  --font-weight-bold:       700;
  --line-height:            1.5;
}
```

#### Отступы (Spacing System)
```css
:root {
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;    /* часто используется */
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-7: 28px;
  --spacing-8: 32px;
  --spacing-9: 40px;
  --spacing-10: 48px;
}
```

**Важно:** В iOS 12 не используется `gap` в flexbox. Все отступы между элементами делаются через `margin-*`.

#### Радиусы
```css
:root {
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-full: 9999px;
}
```

#### Тени
```css
:root {
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.12);
}
```

#### Анимации
```css
:root {
  --transition-fast: 0.1s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.35s ease;
}
```

#### Layout
```css
:root {
  --header-height: 52px;
  --nav-height:    56px;
}
```

### 9.2 Компоненты

#### Кнопка VERO (правильный ответ)
```css
.btn-vero {
  background-color: var(--color-btn-quiz-bg);
  border: 2px solid var(--color-accent-light);
  color: var(--color-accent-dark);
  font-size: var(--font-size-lg);
  font-weight: 700;
  border-radius: var(--radius-sm);
  width: 150px;
  height: 60px;
}
.btn-vero.correct {
  background-color: var(--color-correct);
  border-color: var(--color-correct);
  color: #fff;
}
```

#### Кнопка FALSO (неправильный ответ)
```css
.btn-falso {
  background-color: var(--color-btn-quiz-bg);
  border: 2px solid var(--color-accent-error-light);
  color: var(--color-accent-dark);
  font-size: var(--font-size-lg);
  font-weight: 700;
  border-radius: var(--radius-sm);
  width: 150px;
  height: 60px;
}
.btn-falso.wrong {
  background-color: var(--color-wrong);
  border-color: var(--color-wrong);
  color: #fff;
}
```

#### Карточка темы (HomePage)
- Белая карточка (`--color-surface`), `border-radius: --radius-lg`, `--shadow-sm`
- Изображение темы слева (96×96px, ленивая загрузка)
- Название темы (жирный текст) + количество вопросов
- ProgressBar внизу карточки
- На hover: `--shadow-md` + сдвиг на 2px вверх

#### Пагинация (QuizPagination)
- 30 кружков по 28×28px
- Горизонтальный слайдер со стрелками (если не помещается)
- Состояния: серый (не отвечен), синий (активный), зелёный (верно), красный (неверно)
- Клик → `goTo(index)`
- Кнопка "VERIFICA" в конце трека для финиша теста

#### Аккордеон комментария (CommentAccordion)
- Раскрывается после ответа на вопрос
- Фон: `--color-correct-bg` (если верно) или `--color-wrong-bg` (если неверно)
- Статус: "✅ Corretto!" или "❌ Sbagliato!"
- Показывает итальянский + русский текст
- Изображение комментария (если есть)

---

## 10. Система иконок (Icon System)

**Подход:** Inline SVG компоненты (не спрайты, не иконочный шрифт).
**Источник:** [Lucide Icons](https://lucide.dev/) (MIT), stroke-based, `viewBox="0 0 24 24"`.

### Архитектура
```
src/assets/icons/index.js   ← экспорт: ICONS { name: '<path ...>' }
src/components/ui/Icon.jsx  ← React компонент с React.memo
```

### Использование
```jsx
import Icon from '../ui/Icon';

// Базовое — наследует цвет от родителя
<Icon name="home" size={24} />

// С явным цветом
<Icon name="check" size={16} color="var(--color-correct)" />

// С CSS-классом
<Icon name="comment" size={30} className="my-class" />

// Со strokeWidth
<Icon name="translate" size={20} strokeWidth={1.5} />
```

### Доступные иконки (15 шт.)

| Имя | Где используется |
|---|---|
| `home` | BottomNav — Главная |
| `refresh` | BottomNav — Ошибки |
| `chart` | BottomNav — Статистика |
| `book` | BottomNav — Словарь |
| `arrow-left` | AppHeader — Кнопка "Назад" |
| `comment` | QuestionCard — Кнопка комментария |
| `translate` | QuestionCard — Кнопка перевода |
| `check` | Статусы (верно) |
| `x` | Статусы (ошибка) |
| `check-circle` | ResultScreen (верно) |
| `x-circle` | ResultScreen (ошибка) |
| `flag` | Финиш |
| `trophy` | Результат |
| `rotate` | Повторить тест |
| `log-out` | Выход (не используется, зарезервировано) |

### Принципы
- **React.memo** на Icon — предотвращает лишние ре-рендеры (критично для iPad mini 2)
- **currentColor** — цвет наследуется от CSS родителя, если не указан `color` prop
- **Минимум инлайн-стилей** — используются CSS-переменные
- **Tree-shaking** — Vite включает только импортированные иконки

### Добавление новой иконки
1. Найти на [lucide.dev](https://lucide.dev/)
2. Скопировать содержимое `<svg>` (только `<path>` / `<line>` и т.д., без самого `<svg>`)
3. Добавить в `src/assets/icons/index.js`:
   ```javascript
   'my-icon': '<path d="M..." /><line ... />',
   ```
4. Использовать: `<Icon name="my-icon" />`

---

## 11. Маршруты (Routing)

### Актуальная карта маршрутов
```
/                     → HomePage — список 25 тем с прогрессом
/quiz/:topicId        → QuizPage — прохождение теста
                         topicId: "1"–"25" | "all" | "errors:*"
/errors               → ErrorsPage — выбор темы для работы над ошибками
/stats                → StatsPage — статистика (Phase 2, placeholder)
/dictionary           → DictionaryPage — словарь (Phase 3, placeholder)
```

### Варианты topicId для /quiz/:topicId
- **"1"–"25"**: конкретная тема (30 случайных вопросов из этой темы)
- **"all"**: 30 случайных вопросов из всех 25 тем
- **"errors"**: 30 вопросов из всех текущих ошибок пользователя (если есть)
- **"errors:1"** (и т.д.): 30 вопросов из ошибок конкретной темы

### ErrorsPage — Новая функция
**Маршрут:** `/errors`  
**Назначение:** Позволить пользователю выбрать, какую тему с ошибками повторять.

**Компонент:** `src/pages/ErrorsPage.jsx`  
**Логика:**
1. Загружает все темы и подсчитывает ошибки в каждой
2. Показывает темы с количеством ошибок
3. Клик на тему → `useNavigate('/quiz/errors:' + topicId)`
4. Если ошибок нет → "Отличная работа! Ошибок нет 🎉"

**Использует:** `useErrorTopics()` hook (оптимизирован с батчингом)

---

## 12. Структура страниц

### HomePage (`/`)
- **Компоненты:** AppHeader + список CardComponent для каждой темы + BottomNav
- **Логика:** useTopics → обогащение прогрессом + ProgressBar
- **Интерактивность:** Клик на карточку → navigate(`/quiz/${topicId}`)

### QuizPage (`/quiz/:topicId`)
- **Структура (сверху вниз):**
  1. AppHeader (название темы / "Случайный тест" / "Ошибки")
  2. QuizPagination (30 кружков + кнопка VERIFICA)
  3. SlideTransition (анимация смены вопросов)
  4. QuestionCard (вопрос + картинка + кнопки VERO/FALSO)
  5. Кнопки действий (перевод, комментарий, финиш)
  6. CommentAccordion (раскрывается по клику на 💬)
  7. ResultScreen (оверлей с результатами после финиша)

- **Логика:** useQuiz(topicId) → управление состоянием теста
- **Жесты:** useSwipe → свайп влево/вправо для навигации
- **Выход:** Если не завершён → ConfirmationModal; если завершён → navigate(backPath)

### ErrorsPage (`/errors`)
- **Компоненты:** AppHeader + список ErrorTopicCard + BottomNav
- **Логика:** useErrorTopics → подсчёт ошибок по каждой теме
- **Интерактивность:** Клик на тему → navigate(`/quiz/errors:${topicId}`)
- **Состояние:** Если ошибок нет → "Отличная работа!"

### StatsPage (`/stats`) — Phase 2
- **Текущий статус:** Placeholder "🚀 В разработке"
- **Планируемый контент:** Общая статистика + таблица с прогрессом по темам

### DictionaryPage (`/dictionary`) — Phase 3
- **Текущий статус:** Placeholder "🚀 В разработке"
- **Планируемый контент:** Интерактивный словарь терминов ПДД

---

## 13. Новые компоненты и хуки (Phase 1, уже реализованы)

### Компоненты

#### ConfirmationModal.jsx
**Назначение:** Универсальное модальное окно подтверждения.  
**Props:**
```jsx
<ConfirmationModal
  isOpen={boolean}
  title={string}           // optional
  message={string}
  confirmText={string}     // default: "Да"
  cancelText={string}      // default: "Нет"
  onConfirm={() => void}
  onCancel={() => void}
/>
```
**Используется:** QuizPage для выхода из незавершённого теста.

#### SlideTransition.jsx
**Назначение:** Плавная CSS-анимация смены вопросов (slide-fade).  
**Props:**
```jsx
<SlideTransition contentKey={question.id} direction="forward" | "backward">
  {children}
</SlideTransition>
```
**Используется:** QuizPage для анимации перехода между вопросами.

### Хуки

#### useSwipe.js
**Назначение:** Обработка touch-жестов на мобильных устройствах.  
**Использование:**
```jsx
const handlers = useSwipe({
  onSwipeLeft: () => handleGoTo(current + 1),
  onSwipeRight: () => handleGoTo(current - 1),
  threshold: 60
});
// Прикрепить к элементу: <div {...handlers}>
```
**Используется:** QuizPage для мобильной навигации между вопросами.

#### useErrorTopics.js
**Назначение:** Загрузить темы с подсчётом ошибок в каждой (оптимизировано).  
**Возвращает:**
```javascript
{ topics, loading, error }
// topics[i].errorCount = number
```
**Используется:** ErrorsPage для отображения ошибок по темам.

---

## 14. Навигация (Layout)

### AppHeader
- **Фон:** `--color-header-bg` (#0d1b2a — тёмно-синий)
- **Текст:** `--color-header-text` (белый)
- **Высота:** `--header-height` (52px)
- **Позиция:** `sticky` (прилипает к верхней части при скролле)
- **Содержимое:**
  - Слева: кнопка "← назад" (показывается на `/quiz/*` и `/errors`)
  - Центр: название страницы / темы
  - Справа: зарезервировано для доп. кнопок

### BottomNav
- **Маршруты (4 вкладки):**
  ```
  🏠 Главная   |  🔁 Ошибки    |  📊 Статистика  |  📖 Словарь
  /            |  /errors      |  /stats         |  /dictionary
  ```
- **Высота:** `--nav-height` (56px)
- **Позиция:** fixed внизу (sticky, как на мобильных)
- **Активная вкладка:** синяя иконка + синий текст (NavLink active state)
- **Видимость:** Скрыта на `/quiz/*` страницах (см. App.jsx логика)
- **Используется на:** HomePage, ErrorsPage, StatsPage, DictionaryPage

**Важно:** все страницы должны иметь `padding-bottom: var(--nav-height)` для контента, чтобы он не скрывался под BottomNav.

---

## 15. DevOps — GitHub + Vercel CI/CD

### vercel.json (обязательный для SPA)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Это перенаправляет все маршруты на /index.html, позволяя React Router обрабатывать навигацию на клиенте.

### vite.config.js
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['ios_saf >= 12', 'safari >= 12', 'chrome >= 92'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  build: {
    target: ['es2015', 'safari12', 'ios12'],
  }
})
```

### Деплой
1. Пушим в `main` на GitHub
2. Vercel автоматически срабатывает (webhook)
3. Vercel собирает (`npm run build`) и деплоит на vercel.app
4. Для каждого PR — автоматический preview-деплой

---

## 16. Что НЕ делаем (сейчас)

| Что | Почему / Когда |
|---|---|
| Backend | Phase 2 — после завершения frontend |
| Авторизация | Phase 2 |
| Синхронизация между устройствами | Phase 2 |
| Tailwind / UI-фреймворк | Собственный CSS — полный контроль |
| TypeScript | Phase 2 (добавим при переходе на backend) |
| Аудио | Вырезано из JSON на этапе подготовки |
| Геймификация | Не нужна для личного использования |
| Скачивание изображений | S3 URL работают напрямую с lazy loading |
| Круговые графики | Простые ProgressBar достаточно |
| Дополнительные анимации | Необходимая анимация уже есть (SlideTransition) |

---

## 17. План разработки и статус (актуальный)

### ✅ Этап 0 — Подготовка (выполнено)
- [x] Инициализация проекта (Vite + React)
- [x] Загрузка и обработка данных (7095 вопросов)

### ✅ Этап 1 — Фундамент и Quiz (выполнено ~95%)

**1.1 Настройка проекта**
- [x] `vite.config.js` — plugin-legacy для iOS 12
- [x] `vercel.json` — SPA rewrites
- [x] `package.json` — зависимости

**1.2 Сервисный слой**
- [x] `src/services/questionsService.js` (батчинг, динамический import)
- [x] `src/services/progressService.js` (localStorage)
- [x] `src/services/errorsService.js` (счётчик ошибок)
- [x] `src/utils/shuffle.js` (Fisher-Yates)

**1.3 Хуки**
- [x] `src/hooks/useQuiz.js` (основная логика)
- [x] `src/hooks/useTopics.js` (загрузка с прогрессом)
- [x] `src/hooks/useProgress.js` (read-only прогресс)
- [x] `useErrorTopics.js` (подсчёт ошибок по темам)
- [x] `useSwipe.js` (свайпы для iPad)

**1.4 Layout**
- [x] `src/components/layout/AppHeader.jsx`
- [x] `src/components/layout/BottomNav.jsx`
- [x] `src/App.jsx` — роутинг

**1.5 UI-компоненты (атомарные)**
- [x] `src/components/ui/Button.jsx` (primary, vero, falso, icon)
- [x] `src/components/ui/Card.jsx`
- [x] `src/components/ui/Icon.jsx` (React.memo)
- [x] `src/components/ui/ProgressBar.jsx`
- [x] `src/components/ui/Spinner.jsx`
- [x] `src/components/ui/ConfirmationModal.jsx` (новое)
- [x] `src/components/ui/SlideTransition.jsx` (новое)
- [x] `src/assets/icons/index.js` (15 Lucide иконок)

**1.6 Quiz-компоненты**
- [x] `src/components/quiz/QuestionCard.jsx`
- [x] `src/components/quiz/QuizPagination.jsx` (горизонтальный слайдер)
- [x] `src/components/quiz/CommentAccordion.jsx`
- [x] `src/components/quiz/ResultScreen.jsx` (оверлей)

**1.7 Страницы**
- [x] `src/pages/HomePage.jsx` (тема + ProgressBar)
- [x] `src/pages/QuizPage.jsx` (основная логика)
- [x] `src/pages/ErrorsPage.jsx` (выбор темы для ошибок — новое!)

**1.8 Стили**
- [x] `src/styles/global.css` (reset + variables)
- [x] `src/styles/layout.css` (grid, flexbox, container)
- [x] `src/styles/components.css` (компоненты)
- [x] `src/styles/pages.css` (страницы)

### ⏳ Этап 2 — Статистика (планируется)
- [ ] `src/pages/StatsPage.jsx` (реальная реализация)
- [ ] `src/components/stats/TopicStatRow.jsx`
- [ ] Вычисление статистики (всего тестов, средний результат, прогресс по темам)

### ✅ Этап 3 — Словарь (выполнено)
> [!IMPORTANT]
> Для работы над архитектурой словаря, UI и хуками строго использовать [SKILL_DICTIONARY.md](file:///Users/greg/MyProjects/app-quiz-patente/SKILL_DICTIONARY.md).

- [x] `src/data/dictionary/entries.json` (терминология ПДД)
- [x] `src/pages/DictionaryPage.jsx` (полная реализация: поиск, фильтры, режимы)
- [x] `src/services/dictionaryService.js` (управление данными и прогрессом)
- [x] `src/hooks/useDictionary.js` (логика фильтрации и навигации)

### 🔮 Phase 2 — Backend (будущее)
- [ ] Node.js + Express.js API
- [ ] MongoDB Atlas или Supabase (PostgreSQL)
- [ ] JWT авторизация
- [ ] Замена services/ на API-запросы (API слой)

---

## 18. Соглашения по коду

- **Компоненты:** PascalCase, `.jsx` (`QuestionCard.jsx`)
- **Хуки:** camelCase с префиксом `use` (`useQuiz.js`)
- **Сервисы:** camelCase с суффиксом `Service` (`progressService.js`)
- **Утилиты:** camelCase (`shuffle.js`)
- **CSS-классы:** kebab-case (`.question-card`, `.btn-vero`, `.modal-backdrop`)
- **Стили:** только через CSS-классы; inline `style=` только для динамических значений (ширина, высота)
- **Данные:** только через `services/`, никогда не импортировать JSON прямо в компоненты
- **Изображения:** всегда `loading="lazy"` + `alt=""`
- **Язык UI:**
  - Итальянский: VERO, FALSO, Corretto, Sbagliato, VERIFICA
  - Русский: вся остальная навигация и текст
- **React Hooks:** ES6 деструктуризация (`const [state, setState] = useState(...)`), стрелочные функции, `const` для компонентов — всё это безопасно благодаря @vitejs/plugin-legacy (транспиляция в ES5)

---

## 19. Синхронизация с реальной реализацией

Этот документ (v2) полностью синхронизирован с кодовой базой по состоянию на 25 апреля 2026 г.

**Ключевые исправления относительно v1:**
1. ✅ Фиксирован маршрут `/errors` (было: `/quiz/errors`)
2. ✅ Добавлена документация ErrorsPage
3. ✅ Исправлены имена переменных spacing (`--space-*` → `--spacing-*`)
4. ✅ Добавлены компоненты: ConfirmationModal, SlideTransition
5. ✅ Добавлены хуки: useSwipe, useErrorTopics
6. ✅ Обновлена структура проекта в секции 3
7. ✅ Добавлена информация о батчинге в useErrorTopics
8. ✅ Документированы все 15 иконок
9. ✅ Добавлены дизайн-токены и переходы (transitions)

**Статус:**
- Phase 1: ~95% завершено
- Ready for Phase 2: Stats page development
- Ready for Phase 2 Backend: API scaffolding

---

## 20. Инициализация (справочно — уже выполнено)

```bash
npm create vite@latest app-quiz-patente -- --template react
cd app-quiz-patente
npm install react-router-dom
npm install -D @vitejs/plugin-legacy terser
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview built version
```

---

## 21. Дополнительные правила (Импортированные и адаптированные)

### [Workflow & AI Behavior]

#### Rule 1: Think Before Coding (Сначала думай, потом пиши)
Перед предложением любого решения или написанием кода необходимо провести фазу наблюдения:
1. **Поиск и чтение**: Всегда ищи существующие реализации аналогичных функций в проекте.
2. **Контекст архитектуры**: Убедись, что план не нарушает "Архитектурный закон" (обязательное использование Service-слоя).
3. **Краевые случаи**: Сформулируй не только "счастливый путь", но и обработку ошибок или ограничений старых браузеров (Chrome 92).
4. **Декларация плана**: Всегда кратко опиши, что ты собираешься сделать, прежде чем начать редактирование файлов.

#### Rule 2: Goal-Driven Execution (Выполнение на основе целей)
Каждая задача должна быть трансформирована в набор проверяемых критериев успеха:
1. Разбей сложную задачу на мелкие, проверяемые этапы (напр., "создать метод в сервисе" -> "проверить его вызов в хуке" -> "обновить UI").
2. После выполнения каждого этапа проверяй его результат (через чтение DOM или проверку состояния).
3. Конечная цель считается достигнутой только после верификации всех критериев успеха.

### [Code Quality & Maintenance]

#### Rule 3: Surgical Changes (Хирургические изменения)
При работе с существующим кодом (особенно в legacy-окружении iPad mini 2):
1. **Минимальное вмешательство**: Изменяй только те строки, которые необходимы для выполнения задачи.
2. **Стилистическая мимикрия**: Твой код должен быть неотличим от существующего. Следуй установленным паттернам именования и структуры (BEM, CSS-переменные).
3. **Локальная чистка**: Удаляй только те неиспользуемые импорты или переменные, которые возникли в результате *твоих* изменений. Не проводи глобальный рефакторинг "попутно", если это не было целью задачи.

#### Rule 4: Simplicity First (Простота превыше всего)
Выбирай самое простое решение, которое решает задачу:
1. **Минимум зависимостей**: Отдавай предпочтение стандартным библиотекам и нативному JS/CSS (с учетом ограничений 2021 года).
2. **Лаконичность**: Избегай сверхсложных абстракций. Если задачу можно решить простым условием `if` вместо сложного паттерна — используй `if`.
3. **Читаемость**: Код должен быть самодокументированным. Сложная логика должна сопровождаться краткими техническими комментариями.

### [Data Integrity]

#### Rule 5: Data is Ground Truth (Данные — основа системы)
В проекте с 7000+ вопросов данные важнее логики отображения:
1. Если баг связан с конкретным вопросом, сначала проверь соответствующий `topic_N.json`.
2. Не пытайся исправлять ошибки в данных (напр. неправильный перевод) через JS-код компонента. Исправляй либо сам JSON, либо логику в `services/`.

---
