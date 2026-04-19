# Технический аудит проекта quiz-patente
## Bug Analysis & Fix Plan — полный отчёт

> **Цель аудита:** выявить узкие места производительности, архитектурные и кодовые проблемы, подготовить пошаговый план оптимизации.  
> **Приоритетная цель:** стабильная работа на **iPad Mini 2 (iOS 12.5.8, чип A7, ~1 ГБ ОЗУ, Safari 12)**.

---

## 1. Обзор проекта

| Параметр | Значение |
|---|---|
| Фреймворк | React 19 + Vite |
| Количество компонентов | 18 |
| Вопросов в базе | 7 144 |
| Размер данных JSON | **8.3 МБ** |
| CSS-переменных undefined | **4** |
| Inline-стилей в JSX | **46** |
| Роутер | react-router-dom v7 |
| Сборщик | Vite 8 + plugin-legacy (таргет iOS 12) |

---

## 2. Что сделано хорошо

- Архитектура в целом чистая: **сервисы → хуки → компоненты**, без перемешивания.
- CSS использует design tokens через CSS-переменные — единая система типографики и отступов.
- `will-change` и `perspective` убраны из анимаций — правильное решение для iPad Mini 2 с 1 ГБ RAM.
- `React.memo` применён на `QuestionCard` и `Icon` — двух самых часто перерисовываемых компонентах.
- `@vitejs/plugin-legacy` настроен корректно: таргет `ios_saf >= 12`, подключён `regenerator-runtime`.
- Анимации используют `transform: translate3d` и `opacity` — GPU-safe свойства.
- Race condition в `useQuiz` защищён через `answeringRef` и флаг `cancelled` в `useEffect`.
- Свайп-хук `useSwipe` корректно фильтрует горизонтальные жесты от вертикального скролла.

---

## 3. Критические находки

### 3.1 HIGH — Деструктивный антипаттерн `useState` в `useQuiz`

**Файл:** `src/hooks/useQuiz.js`

**Проблема:** Все 7 вызовов `useState` записаны в нечитаемом и нестандартном стиле:

```js
// ПЛОХО — так не пишут в React
var questionsRef = useState([]);
var questions = questionsRef[0];
var setQuestions = questionsRef[1];
```

Это не оптимизация — это антипаттерн. Ломает подсказки ESLint (`eslint-plugin-react-hooks`), мешает читать код, усложняет рефакторинг.

**Исправление:**
```js
// ХОРОШО — стандартный React-паттерн
const [questions, setQuestions] = useState([]);
const [current, setCurrent] = useState(0);
const [answered, setAnswered] = useState(() => new Map());
const [results, setResults] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [isFinished, setIsFinished] = useState(false);
```

---

### 3.2 HIGH — `loadAllQuestions` грузит все 25 JSON одновременно

**Файл:** `src/services/questionsService.js`

**Проблема:** Режимы `"all"` и `"errors"` вызывают `Promise.all` из 25 параллельных fetch-запросов — это **8.3 МБ** JSON в оперативную память единовременно.

```js
// ОПАСНО для iPad Mini 2 — OOM и белый экран
export async function loadAllQuestions() {
  var promises = [];
  for (var i = 1; i <= 25; i++) {
    promises.push(loadTopicQuestions(i));
  }
  var results = await Promise.all(promises); // 25 запросов разом
  ...
}
```

На устройстве с ~1 ГБ RAM и слабым A7-чипом это первый кандидат на OOM-сбой и белый экран смерти (WSOD). Safari iOS 12 не имеет механизма восстановления из OOM — вкладка просто умирает.

**Исправление — батчевая загрузка:**
```js
// ХОРОШО — загрузка пачками по 5 тем
async function loadAllQuestions() {
  const ids = Array.from({ length: 25 }, (_, i) => i + 1);
  const all = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(id => loadTopicQuestions(id))
    );
    all.push(...results.flat());
  }
  return all;
}
```

**Ожидаемый результат:** пиковое потребление памяти снижается в ~5 раз. Риск WSOD устраняется.

---

### 3.3 HIGH — 4 неопределённые CSS-переменные

**Файлы:** `src/styles/components.css`, `src/styles/pages.css`

**Проблема:** Следующие переменные **используются** в стилях, но **нигде не объявлены** в `:root`. Браузер подставляет `initial`, что может ломать шрифты, цвета и радиусы незаметно для разработчика:

| Переменная | Где используется |
|---|---|
| `--color-secondary` | `pages.css` — градиент фона home-header и results-score |
| `--font-size-base` | `components.css` — класс `.btn`, `pages.css` — несколько мест |
| `--font-size-3xl` | `pages.css` — `.home-header__title` |
| `--radius-xl` | `pages.css` — `.quiz-question-card` |

**Исправление — добавить в `src/styles/global.css` в `:root`:**
```css
/* Недостающие переменные */
--color-secondary:  #6366f1;   /* индиго-акцент, используется в градиентах */
--font-size-base:   18px;      /* базовый размер текста для кнопок */
--font-size-3xl:    48px;      /* крупный заголовок главной страницы */
--radius-xl:        20px;      /* скругление крупных карточек квиза */
```

---

### 3.4 HIGH — `borderBlock` не поддерживается в Safari iOS 12

**Файл:** `src/components/quiz/ResultScreen.jsx`

**Проблема:** Логическое CSS-свойство `borderBlock` появилось в Safari 15. На iOS 12 оно **молча игнорируется** — граница исчезает, блок статистики теряет разделители.

```jsx
// ЛОМАЕТСЯ на Safari 12
style={{ borderBlock: '1px solid var(--color-border)' }}
```

**Исправление:**
```jsx
// РАБОТАЕТ везде
style={{
  borderTop: '1px solid var(--color-border)',
  borderBottom: '1px solid var(--color-border)'
}}
```

---

### 3.5 HIGH — `loading="eager"` + `decoding="sync"` на изображениях вопросов

**Файл:** `src/components/quiz/QuestionCard.jsx`

**Проблема:** У изображений вопросов явно выставлена блокирующая загрузка:

```jsx
// ПЛОХО — блокирует рендер
<img
  src={question.image}
  loading="eager"
  decoding="sync"
  className="question-card__image"
/>
```

`decoding="sync"` означает, что браузер **не покажет ничего** до тех пор, пока изображение не раскодировано. На A7-чипе это заметная пауза при каждой смене вопроса.

**Исправление:**
```jsx
// ХОРОШО — не блокирует рендер, изображение подгружается асинхронно
<img
  src={question.image}
  loading="lazy"
  decoding="async"
  className="question-card__image"
/>
```

---

### 3.6 MED — `window.location.reload()` как перезапуск квиза

**Файл:** `src/components/quiz/ResultScreen.jsx`

**Проблема:** Кнопка "Попробовать снова" вызывает полную перезагрузку страницы:

```jsx
<Button onClick={() => window.location.reload()}>
  🔁 Попробовать снова
</Button>
```

На медленном Safari iOS 12 это **2–4 секунды** потери. Все состояния сбрасываются, JS-бандл перепарсивается.

**Исправление — добавить функцию `reset()` в `useQuiz`:**

```js
// В useQuiz.js — добавить reset
const reset = useCallback(() => {
  setQuestions([]);
  setCurrent(0);
  setAnswered(new Map());
  setResults([]);
  setIsFinished(false);
  isSavedRef.current = false;
  answeringRef.current = false;
  // useEffect с [topicId] перезапустится автоматически
  // если topicId не изменился — форсируем через дополнительный trigger-state
}, []);
```

В `QuizPage.jsx` и `ResultScreen.jsx` передать `onRestart={reset}` вместо `() => window.location.reload()`.

---

### 3.7 MED — `SlideTransition` рендерит два `QuestionCard` одновременно

**Файл:** `src/components/ui/SlideTransition.jsx`

**Проблема:** Во время анимации в DOM присутствуют **два экземпляра QuestionCard** одновременно: уходящий (`exit`) и входящий (`enter`). Каждый потенциально содержит изображение из внешнего S3. На слабом GPU iPad Mini 2 это удвоенная нагрузка при каждом свайпе.

```jsx
return (
  <div className="slide-transition-wrapper">
    {exiting && (            // ← первый QuestionCard (уходящий)
      <div className={`slide-transition-card exit-${exiting.direction}`}>
        {exiting.element}
      </div>
    )}
    <div className={`slide-transition-card ${...}`}>
      {children}             // ← второй QuestionCard (входящий)
    </div>
  </div>
);
```

**Исправление (два варианта):**

*Вариант A — упрощённый переход только через opacity (меньше GPU-нагрузки):*
```css
/* Вместо translate3d — только fade */
.slide-transition-card.exit-forward,
.slide-transition-card.exit-backward {
  position: absolute;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
```

*Вариант B — сократить длительность до 150мс:*
```css
/* Было 300ms → стало 150ms */
transition: opacity 0.15s ease, transform 0.15s ease;
```
И в `SlideTransition.jsx`:
```js
const timer = setTimeout(() => setExiting(null), 150); // было 300
```

---

### 3.8 MED — 22 неиспользуемые CSS-переменные в `:root`

**Файл:** `src/styles/global.css`

**Проблема:** В `:root` объявлены переменные, которые нигде не применяются в стилях. Это создаёт ложное впечатление, что система устроена иначе, и мешает рефакторингу.

**Неиспользуемые переменные для удаления:**

```css
/* УДАЛИТЬ — нигде не используются */
--color-active
--color-correct          /* используется только в inline-стилях JSX как строка */
--color-correct-bg
--color-correct-border
--color-header-bg        /* используется inline в AppHeader */
--color-header-text      /* используется inline в AppHeader */
--color-primary-hover
--color-unanswered
--color-wrong
--color-wrong-bg
--color-wrong-border
--font-weight-bold
--font-weight-normal
--header-height
--nav-height

/* УДАЛИТЬ — полный дубликат системы --spacing-*, нигде не используется */
--space-xs
--space-sm
--space-md
--space-lg
--space-xl
--space-2xl

/* УДАЛИТЬ — нигде не используются */
--spacing-7
--spacing-9
```

> **Примечание:** Перед удалением `--color-correct`, `--color-wrong` и `--color-header-bg/text` убедись, что переменные не используются в JSX inline-стилях через строки — в этом случае их нужно перенести в CSS-классы, а не просто удалить.

---

### 3.9 MED — 46 inline-стилей в JSX нарушают DRY

**Файлы:** `src/pages/HomePage.jsx`, `src/components/quiz/ResultScreen.jsx`, `src/pages/QuizPage.jsx`

**Проблема:** 46 мест с `style={{...}}` — дублирующиеся комбинации, которые нельзя переиспользовать, централизованно изменить или протестировать. Особенно критично в `ResultScreen.jsx`, где 13 inline-стилей в одном компоненте.

**Исправление:** вынести повторяющиеся комбинации в именованные CSS-классы.

Пример — `ResultScreen.jsx`:
```css
/* Добавить в pages.css */
.result-screen-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--color-bg);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
}

.result-screen-card {
  max-width: 400px;
  width: 100%;
  background-color: var(--color-surface);
  padding: var(--spacing-8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
}
```

---

### 3.10 LOW — `Spinner` использует эмодзи вместо CSS-анимации

**Файл:** `src/components/ui/Spinner.jsx`

**Проблема:** Компонент содержит класс `spinner`, но CSS-стили для него **отсутствуют** в `components.css`. Вместо анимации — статичный эмодзи `⏳`.

```jsx
// Текущий код — заглушка
const Spinner = () => (
  <div className="row-center" style={{ padding: '40px 0' }}>
    <div className="spinner">
      <span>⏳ Caricamento...</span>  {/* нет CSS для .spinner */}
    </div>
  </div>
);
```

**Исправление — добавить в `components.css`:**
```css
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  -webkit-animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@-webkit-keyframes spin {
  to { -webkit-transform: rotate(360deg); }
}
```

И упростить компонент:
```jsx
const Spinner = ({ className = '' }) => (
  <div className={`row-center ${className}`} style={{ padding: '40px 0' }}>
    <div className="spinner" role="status" aria-label="Загрузка..." />
  </div>
);
```

---

### 3.11 LOW — `StatsPage` и `DictionaryPage` — нерабочие заглушки в навигации

**Файлы:** `src/pages/StatsPage.jsx`, `src/pages/DictionaryPage.jsx`

**Проблема:** Оба компонента содержат только текст "скоро появится", но доступны из `BottomNav`. Пользователь нажимает вкладку и видит пустую страницу — плохой UX.

**Исправление:** до готовности фичи — либо скрыть пункты из навигации, либо показывать информативный `coming-soon` экран с иконкой и объяснением.

---

### 3.12 LOW — Мёртвые ассеты в `src/assets/`

**Файл:** `src/assets/`

**Проблема:** Три файла находятся в папке ассетов, но нигде не импортируются:
- `hero.png` (44 КБ)
- `react.svg` (4.1 КБ)
- `vite.svg` (8.6 КБ)

Они могут попасть в бандл в зависимости от настроек Vite, занимая место без пользы.

**Исправление:** удалить файлы из репозитория.

---

## 4. Анализ зависимостей

| Библиотека | Версия | Назначение | Статус |
|---|---|---|---|
| `react` / `react-dom` | 19.2.x | UI-фреймворк | ⚠️ React 19 очень новый — требует проверки на Safari 12 |
| `react-router-dom` | 7.14.0 | Роутинг | ✅ OK |
| `@vitejs/plugin-legacy` | 8.0.1 | Полифилы для iOS 12 | ✅ OK, критически нужен |
| `@vitejs/plugin-react` | 6.0.1 | Fast Refresh в dev | ✅ OK |
| `terser` | 5.46.1 | Минификация бандла | ✅ OK |
| `regenerator-runtime` | через legacy | Полифил async/await | ✅ OK, нужен для iOS 12 |

> **Риск React 19:** React 19 вышел в декабре 2024 года и содержит изменения в модели параллельного рендеринга. Его работа на Safari 12 (WebKit 606) **не гарантирована** официально. Если при тестировании возникнут крэши или визуальные артефакты — откат до React 18.3.x, который официально поддерживает iOS 12 через `plugin-legacy`.

---

## 5. Стратегия для iPad Mini 2 (iOS 12, A7, ~1 ГБ ОЗУ)

### 5.1 Память
- Не грузить все 25 JSON разом — использовать батчевую загрузку (см. п. 3.2).
- `will-change` с анимаций убран — хорошо, оставить так.
- Убрать дублирующийся рендер QuestionCard в SlideTransition (см. п. 3.7).
- `loading="lazy"` на изображениях вопросов — не держать в памяти картинки ещё не открытых вопросов.

### 5.2 JS-выполнение
- `plugin-legacy` генерирует ES5-бандл — это правильно, трогать не нужно.
- Исправить антипаттерн `useState` — это не влияет на производительность напрямую, но улучшает читаемость и корректность ESLint-анализа.
- Не пересоздавать `new Map(answered)` при каждом ответе — рассмотреть `useReducer` для `answered` как альтернативу.
- Убрать `setTimeout(50)` для снятия блокировки ответа — использовать `useEffect` или `requestAnimationFrame` как более предсказуемый механизм.

### 5.3 Совместимость Safari 12
- Заменить `borderBlock` → `borderTop` + `borderBottom` (см. п. 3.4).
- Убедиться, что все 4 undefined CSS-переменные объявлены (см. п. 3.3).
- `@vitejs/plugin-legacy` с `additionalLegacyPolyfills: ['regenerator-runtime/runtime']` покрывает async/await.
- Проверить React 19 на реальном устройстве или симуляторе iOS 12 (см. п. 4).

### 5.4 GPU и анимации
- `translate3d` в SlideTransition — GPU-safe, оставить.
- `will-change` убран — правильно, не добавлять обратно.
- Уменьшить время анимации с 300 мс до 150–200 мс (меньше времени с двумя компонентами в DOM).
- Добавить `prefers-reduced-motion` (см. Фаза 2, шаг 8).

---

## 6. Пошаговый план оптимизации

### Фаза 1 — Критично (исправить немедленно)

#### [DONE] Шаг 1 — Исправить паттерн `useState` в `useQuiz`
- **Файл:** `src/hooks/useQuiz.js`
- **Сложность:** низкая
- **Время:** ~15 минут
- **Результат:** чистый, идиоматичный код, корректная работа ESLint
- **Что делать:** заменить все `var xRef = useState(...)` на `const [x, setX] = useState(...)`

#### [DONE] Шаг 2 — Добавить 4 undefined CSS-переменные
- **Файл:** `src/styles/global.css`
- **Сложность:** низкая
- **Время:** ~5 минут
- **Результат:** устранение невидимых ошибок рендеринга
- **Что делать:** добавить в `:root` переменные `--color-secondary`, `--font-size-base`, `--font-size-3xl`, `--radius-xl`

#### [DONE] Шаг 3 — Исправить `borderBlock` → Safari 12
- **Файл:** `src/components/quiz/ResultScreen.jsx`
- **Сложность:** низкая
- **Время:** ~5 минут
- **Результат:** корректное отображение разделителей статистики на iOS 12
- **Что делать:** заменить `borderBlock` на `borderTop` + `borderBottom`

#### [DONE] Шаг 4 — Исправить `loading`/`decoding` на изображениях вопросов
- **Файл:** `src/components/quiz/QuestionCard.jsx`
- **Сложность:** низкая
- **Время:** ~5 минут
- **Результат:** устранение блокировки рендера при смене вопроса
- **Что делать:** `loading="eager"` → `loading="lazy"`, `decoding="sync"` → `decoding="async"`

#### Шаг 5 — Батчевая загрузка в `loadAllQuestions`
- **Файл:** `src/services/questionsService.js`
- **Сложность:** средняя
- **Время:** ~30 минут
- **Результат:** снижение пикового потребления памяти в ~5 раз, устранение риска WSOD на iPad Mini 2
- **Что делать:** переписать `loadAllQuestions` с `Promise.all(25)` на батчевую загрузку пачками по 5

#### Шаг 6 — Заменить `window.location.reload()` на `reset()`
- **Файлы:** `src/hooks/useQuiz.js`, `src/components/quiz/ResultScreen.jsx`, `src/pages/QuizPage.jsx`
- **Сложность:** средняя
- **Время:** ~45 минут
- **Результат:** перезапуск квиза за ~100 мс вместо 2–4 секунд
- **Что делать:** добавить функцию `reset()` в `useQuiz`, передать как `onRestart` в `ResultScreen`

---

### Фаза 2 — Важно (сделать в ближайшую итерацию)

#### Шаг 7 — Оптимизировать `SlideTransition`
- **Файл:** `src/components/ui/SlideTransition.jsx` + `src/styles/pages.css`
- **Сложность:** средняя
- **Время:** ~1 час
- **Результат:** меньше GPU-нагрузки при свайпе на iPad Mini 2
- **Что делать:** либо уменьшить длительность анимации до 150 мс, либо упростить до fade-only без translate3d

#### Шаг 8 — Добавить `prefers-reduced-motion`
- **Файл:** `src/styles/pages.css`
- **Сложность:** низкая
- **Время:** ~10 минут
- **Результат:** корректная работа для пользователей с вестибулярными нарушениями, плюс автоматическое отключение анимаций для устройств с ограниченными ресурсами
- **Что делать:**
```css
@media (prefers-reduced-motion: reduce) {
  .slide-transition-card {
    animation: none !important;
    transition: none !important;
  }
  .progress-bar__fill {
    transition: none !important;
  }
}
```

#### Шаг 9 — Удалить мёртвые ассеты
- **Файл:** `src/assets/`
- **Сложность:** низкая
- **Время:** ~5 минут
- **Результат:** чистый репозиторий без балласта
- **Что делать:** удалить `hero.png`, `react.svg`, `vite.svg`

#### Шаг 10 — Убрать дублирующую систему `--space-*` из `:root`
- **Файл:** `src/styles/global.css`
- **Сложность:** низкая
- **Время:** ~10 минут
- **Результат:** единая, непротиворечивая система отступов
- **Что делать:** удалить `--space-xs/sm/md/lg/xl/2xl` и другие неиспользуемые переменные (полный список в п. 3.8)

#### Шаг 11 — Вынести inline-стили в CSS-классы
- **Файлы:** `src/pages/HomePage.jsx`, `src/components/quiz/ResultScreen.jsx`, `src/pages/QuizPage.jsx`
- **Сложность:** средняя
- **Время:** ~2 часа
- **Результат:** устранение дублирования, единое место управления стилями
- **Что делать:** для каждого повторяющегося `style={{...}}` создать именованный CSS-класс в соответствующем файле стилей

---

### Фаза 3 — Улучшения (планировать на следующий спринт)

#### Шаг 12 — Добавить CSS-анимацию для `Spinner`
- **Файлы:** `src/components/ui/Spinner.jsx`, `src/styles/components.css`
- **Сложность:** низкая
- **Время:** ~20 минут
- **Результат:** профессиональный индикатор загрузки вместо статичного эмодзи
- **Что делать:** добавить CSS-класс `.spinner` с `@keyframes spin` (код в п. 3.10)

#### Шаг 13 — Убрать заглушки из `BottomNav` или добавить информативный placeholder
- **Файлы:** `src/pages/StatsPage.jsx`, `src/pages/DictionaryPage.jsx`, `src/components/layout/BottomNav.jsx`
- **Сложность:** низкая
- **Время:** ~30 минут
- **Результат:** честный UX — пользователь понимает, что функция в разработке
- **Что делать:** либо скрыть пункты меню до готовности фичей, либо добавить информативный coming-soon экран

#### Шаг 14 — Проверить совместимость React 19 с Safari iOS 12
- **Сложность:** высокая
- **Время:** неопределённо — зависит от найденных проблем
- **Результат:** уверенность в стабильности на целевом устройстве
- **Что делать:** запустить приложение на реальном iPad Mini 2 или симуляторе iOS 12. Если есть крэши, ошибки рендеринга или проблемы с гидратацией — откатиться на React 18.3.x

---

## 7. Чеклист финальной проверки

После выполнения всех шагов, убедиться в следующем:

### Совместимость
- [ ] Приложение запускается на Safari iOS 12 без ошибок в консоли
- [ ] Кнопки VERO/FALSO нажимаются и реагируют корректно
- [ ] Анимация смены вопросов работает без лагов и артефактов
- [ ] Пагинация прокручивается горизонтально без заеданий
- [x] `borderBlock` заменён на `borderTop`/`borderBottom`
- [x] Все 4 undefined CSS-переменные объявлены

### Память и производительность
- [ ] Режим "все вопросы" запускается без OOM на iPad Mini 2
- [ ] Батчевая загрузка работает и данные появляются корректно
- [x] Изображения используют `loading="lazy"` и `decoding="async"`
- [ ] Перезапуск квиза работает через `reset()`, а не `reload()`

### Качество кода
- [x] `useQuiz` использует стандартную деструктуризацию `const [x, setX]`
- [ ] Мёртвые ассеты (`hero.png`, `react.svg`, `vite.svg`) удалены
- [ ] Неиспользуемые CSS-переменные удалены из `:root`
- [ ] ESLint не выдаёт ошибок (`npm run lint`)
- [ ] `Spinner` имеет CSS-анимацию вместо эмодзи

### UX
- [ ] `prefers-reduced-motion` добавлен
- [ ] Страницы StatsPage/DictionaryPage не вводят пользователя в заблуждение
- [ ] Кнопка "Попробовать снова" не перезагружает страницу

---

## 8. Контекст для реализации

### Структура проекта
```
src/
├── assets/              # статические ресурсы (hero.png, react.svg, vite.svg — удалить)
│   └── icons/index.js   # каталог SVG-иконок (Lucide-based)
├── components/
│   ├── layout/
│   │   ├── AppHeader.jsx
│   │   └── BottomNav.jsx
│   ├── quiz/
│   │   ├── CommentAccordion.jsx
│   │   ├── QuestionCard.jsx     ← React.memo, исправить loading/decoding
│   │   ├── QuizPagination.jsx
│   │   └── ResultScreen.jsx     ← исправить borderBlock, вынести стили
│   └── ui/
│       ├── Button.jsx
│       ├── Card.jsx
│       ├── ConfirmationModal.jsx
│       ├── Icon.jsx             ← React.memo
│       ├── ProgressBar.jsx
│       ├── SlideTransition.jsx  ← оптимизировать двойной рендер
│       └── Spinner.jsx          ← добавить CSS-анимацию
├── data/
│   ├── questions/topic_1..25.json   # 8.3 МБ всего
│   └── topics.json
├── hooks/
│   ├── useQuiz.js       ← главный хук, исправить useState-паттерн
│   ├── useProgress.js
│   ├── useSwipe.js
│   └── useTopics.js
├── pages/
│   ├── DictionaryPage.jsx   ← заглушка
│   ├── HomePage.jsx         ← вынести inline-стили
│   ├── QuizPage.jsx
│   └── StatsPage.jsx        ← заглушка
├── services/
│   ├── errorsService.js
│   ├── progressService.js
│   └── questionsService.js  ← исправить loadAllQuestions
├── styles/
│   ├── components.css   ← добавить .spinner
│   ├── global.css       ← добавить 4 undefined vars, удалить unused vars
│   ├── layout.css
│   └── pages.css        ← добавить prefers-reduced-motion, вынести стили
└── utils/
    └── shuffle.js       # Фишер-Йейтс, без проблем
```

### Ключевые данные
- Вопросов всего: **7 144**
- Вопросов с изображениями: **3 978 из 7 144** (55%)
- Вопросов с комментариями: **7 140 из 7 144** (99.9%)
- Изображения: внешний S3 — `https://quizpatentelng.s3.eu-central-1.amazonaws.com/`
- Сессия квиза: случайные **30 вопросов** из выбранной темы или всей базы
- LocalStorage: `qp_errors` (счётчик ошибок), `qp_progress` (история прохождения)

---

*Отчёт подготовлен на основе полного статического анализа кодовой базы quiz-patente-main.*
