# Рефакторинг страницы «Ошибки» — план реализации

> **Статус:** готов к реализации  
> **Ветка:** `feature/errors-page-refactor`  
> **Затронутые файлы:** 9 (5 изменений, 2 новых файла, 2 файла уже в порядке)

---

## Обзор изменений

Текущая реализация: BottomNav ведёт на `/quiz/errors`, что сразу запускает
квиз по всем накопленным ошибкам без возможности выбора темы.

Новая реализация: маршрут `/errors` открывает страницу со списком 25 тем,
на каждой карточке показано количество ошибок. Клик по теме запускает
квиз только с ошибками этой темы через маршрут `/quiz/errors:5`.

---

## Файл 1 — `src/services/errorsService.js`

### Что добавляем

Две новые экспортируемые функции в конец файла, после `getErrorQuestions`.

#### `getErrorCountForQuestions(topicQuestions)`

```js
/**
 * Получить количество ошибок для конкретной темы.
 * Принимает уже загруженный массив вопросов и сверяет с qp_errors.
 * @param {Array} topicQuestions — массив вопросов одной темы
 * @returns {number}
 */
export function getErrorCountForQuestions(topicQuestions) {
  var errorIds = getErrors();
  var count = 0;
  for (var i = 0; i < topicQuestions.length; i++) {
    if (errorIds[String(topicQuestions[i].id)]) {
      count++;
    }
  }
  return count;
}
```

#### `getTotalErrorCount()`

```js
/**
 * Получить общее количество уникальных вопросов с ошибками.
 * @returns {number}
 */
export function getTotalErrorCount() {
  return getErrorIds().length;
}
```

### На что обратить внимание

- `getErrorCountForQuestions` — не путать с `getErrorCount()` (та считает
  все ошибки целиком, без фильтрации по теме).
- Функция `getTotalErrorCount` — обёртка, нужна для читаемости в компонентах.
- Обе функции работают синхронно (localStorage), не возвращают Promise.

---

## Файл 2 — `src/services/questionsService.js`

### Что добавляем

**В начало файла** — дополнительный импорт:

```js
import { getErrors } from './errorsService.js';
```

> ⚠️ Важно: цикличной зависимости нет. `errorsService.js` ничего не
> импортирует. `questionsService` → `errorsService` — односторонняя связь.

**Новая функция** — вставить после `pickSessionQuestions`, перед `loadTopics`:

```js
/**
 * Загружает вопросы одной темы, отфильтрованные по ошибкам пользователя.
 * Shuffle делает pickSessionQuestions / useQuiz — здесь не нужен.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export async function loadTopicErrorQuestions(topicId) {
  const allTopicQuestions = await loadTopicQuestions(topicId);
  const errorIds = getErrors();
  return allTopicQuestions.filter(q => errorIds[String(q.id)]);
}
```

### На что обратить внимание

- Функция возвращает **нефильтрованный по размеру** массив — может прийти
  3, 7 или 0 вопросов. `pickSessionQuestions` в `useQuiz` корректно
  обработает любой размер: `shuffle + slice(0, 30)` вернёт всё, если меньше 30.
- Если ошибок для темы нет — вернётся пустой массив. `QuizPage` покажет
  сообщение «Нет доступных вопросов» — это ожидаемое поведение.

---

## Файл 3 — `src/hooks/useQuiz.js`

### Что меняем

**Импорт** — добавить `loadTopicErrorQuestions`:

```js
import {
  loadTopicQuestions,
  loadAllQuestions,
  loadTopicErrorQuestions,  // ← добавить
  pickSessionQuestions,
} from '../services/questionsService.js';
```

**Ветка в `useEffect`** — добавить между блоком `errors` и `else`:

```js
} else if (typeof topicId === 'string' && topicId.startsWith('errors:')) {
  // Режим «ошибки по конкретной теме»
  const tid = topicId.slice(7); // убираем префикс 'errors:'
  promise = loadTopicErrorQuestions(tid);
} else {
```

### На что обратить внимание

- Проверка `typeof topicId === 'string'` обязательна — `useParams` всегда
  возвращает строку, но проверка защищает от будущих рефакторингов.
- `topicId.slice(7)` — ровно длина строки `'errors:'` (7 символов).
  `'errors:5'.slice(7)` → `'5'`, `'errors:25'.slice(7)` → `'25'`.
- Эта ветка должна стоять **после** ветки `topicId === 'errors'` и
  **перед** финальным `else`.

---

## Файл 4 — `src/hooks/useErrorTopics.js` ← **новый файл**

Создать файл `src/hooks/useErrorTopics.js`:

```js
import { useState, useEffect } from 'react';
import { loadTopics, loadTopicQuestions } from '../services/questionsService.js';
import { getErrors } from '../services/errorsService.js';

const BATCH_SIZE = 5;

export default function useErrorTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1. Загружаем метаданные тем (topics.json — лёгкий файл)
        const rawTopics = await loadTopics();
        if (cancelled) return;

        // 2. Читаем ошибки из localStorage — синхронно, без запросов
        const errorIds = getErrors();
        const errorIdSet = new Set(Object.keys(errorIds));

        // 3. Оптимизация: если ошибок нет — не грузим JSON-файлы тем вообще
        if (errorIdSet.size === 0) {
          const enriched = rawTopics.map(t => ({ ...t, errorCount: 0 }));
          if (!cancelled) {
            setTopics(enriched);
            setLoading(false);
          }
          return;
        }

        // 4. Грузим вопросы батчами по 5, считаем ошибки по каждой теме
        const ids = rawTopics.map(t => t.topic_id);
        const errorCountMap = {};

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          if (cancelled) return;
          const batch = ids.slice(i, i + BATCH_SIZE);
          const batchQuestions = await Promise.all(
            batch.map(tid => loadTopicQuestions(tid))
          );

          batchQuestions.forEach((questions, idx) => {
            const topicId = batch[idx];
            let count = 0;
            for (let j = 0; j < questions.length; j++) {
              if (errorIdSet.has(String(questions[j].id))) count++;
            }
            errorCountMap[topicId] = count;
          });
        }

        if (cancelled) return;

        // 5. Обогащаем темы полем errorCount
        const enriched = rawTopics.map(t => ({
          ...t,
          errorCount: errorCountMap[t.topic_id] || 0,
        }));

        setTopics(enriched);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки тем');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { topics, loading, error };
}
```

### На что обратить внимание

- `BATCH_SIZE = 5` — то же значение, что в `loadAllQuestions`. Не менять.
- `errorIdSet` — используем `Set` вместо прямого обращения к объекту для
  O(1) поиска внутри вложенного цикла по вопросам.
- `cancelled` флаг защищает от утечки состояния при размонтировании
  компонента во время батчевой загрузки.
- `useEffect` имеет пустой массив зависимостей `[]` — данные загружаются
  один раз при монтировании. Это намеренно: ошибки не меняются во время
  нахождения на странице `ErrorsPage`.

---

## Файл 5 — `src/pages/ErrorsPage.jsx` ← **новый файл**

Создать файл `src/pages/ErrorsPage.jsx`:

```jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useErrorTopics from '../hooks/useErrorTopics';
import AppHeader from '../components/layout/AppHeader';
import Spinner from '../components/ui/Spinner';

const ErrorsPage = () => {
  const { topics, loading, error } = useErrorTopics();
  const navigate = useNavigate();

  const totalErrors = useMemo(
    () => topics.reduce((sum, t) => sum + t.errorCount, 0),
    [topics]
  );

  const handleTopicClick = (topic) => {
    if (topic.errorCount === 0) return;
    navigate(`/quiz/errors:${topic.topic_id}`);
  };

  if (loading) return <Spinner />;
  if (error) return <div className="container errors-page__error">{error}</div>;

  return (
    <div className="page errors-page">
      <AppHeader title="Ошибки" />

      <div className="container">
        <div className="errors-page__header">
          <h2 className="errors-page__title">Работа над ошибками</h2>
          <p className="errors-page__subtitle">
            {totalErrors > 0
              ? `Всего вопросов с ошибками: ${totalErrors}`
              : 'Отличная работа! Ошибок нет 🎉'}
          </p>
        </div>

        <div className="grid-2col">
          {topics.map((topic) => (
            <ErrorTopicCard
              key={topic.topic_id}
              topic={topic}
              onClick={() => handleTopicClick(topic)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ErrorTopicCard = React.memo(({ topic, onClick }) => {
  const hasErrors = topic.errorCount > 0;

  return (
    <div
      className={`error-topic-card${hasErrors ? '' : ' error-topic-card--clean'}`}
      onClick={hasErrors ? onClick : undefined}
      role={hasErrors ? 'button' : undefined}
      tabIndex={hasErrors ? 0 : undefined}
      onKeyDown={hasErrors ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="error-topic-card__image-wrap">
        <img
          src={topic.image}
          alt=""
          loading="lazy"
          className="error-topic-card__image"
        />
      </div>

      <div className="error-topic-card__body">
        <p className="error-topic-card__title">{topic.title}</p>

        {hasErrors ? (
          <span className="error-topic-card__badge error-topic-card__badge--errors">
            Ошибок: {topic.errorCount}
          </span>
        ) : (
          <span className="error-topic-card__badge error-topic-card__badge--clean">
            ✅ Нет ошибок
          </span>
        )}
      </div>
    </div>
  );
});

ErrorTopicCard.displayName = 'ErrorTopicCard';

export default ErrorsPage;
```

### На что обратить внимание

- `React.memo` на `ErrorTopicCard` обязателен — 25 карточек, хук
  `useErrorTopics` может несколько раз обновить state во время загрузки.
- `ErrorTopicCard.displayName` — нужен для корректного отображения в
  React DevTools при использовании `React.memo`.
- `handleTopicClick` проверяет `errorCount === 0` как дополнительную защиту,
  хотя карточка уже не передаёт `onClick` через `hasErrors ? onClick : undefined`.
- `useMemo` на `totalErrors` — пересчитывается только когда меняется `topics`.

---

## Файл 6 — `src/App.jsx`

### Что меняем

Добавить импорт и маршрут:

```js
// Добавить импорт
import ErrorsPage from './pages/ErrorsPage';

// Добавить маршрут (после /quiz/:topicId)
<Route path="/errors" element={<ErrorsPage />} />
```

### На что обратить внимание

- Маршрут `/errors` должен стоять **отдельно** от `/quiz/:topicId`.
  Страница `ErrorsPage` — это не квиз, у неё есть BottomNav.
- `isQuizPage` проверяет `location.pathname.startsWith('/quiz/')` —
  `/errors` под это не подпадает, BottomNav будет отображаться. Это правильно.

---

## Файл 7 — `src/components/layout/BottomNav.jsx`

### Что меняем

Одна строка — изменить `to` для вкладки «Ошибки»:

```js
// Было:
{ to: '/quiz/errors', label: 'Ошибки', icon: 'refresh' },

// Стало:
{ to: '/errors', label: 'Ошибки', icon: 'refresh' },
```

### На что обратить внимание

- `NavLink` использует `isActive` для подсветки активной вкладки.
  При пути `/errors` вкладка подсветится корректно.
- При пути `/quiz/errors:5` BottomNav вообще не отображается (скрыт на
  квиз-страницах), поэтому конфликта активной вкладки нет.

---

## Файл 8 — `src/pages/QuizPage.jsx`

### Что меняем

**1. Исправить баг — двойной закрывающий тег** (существующая ошибка в коде):

```jsx
// Было (баг — двойной />):
          <ResultScreen
            ...
          />
          />        {/* ← лишний тег */}
        )}

// Стало:
          <ResultScreen
            ...
          />
        )}
```

**2. Переменная `backPath`** — вычисляется до хуков, добавить после `useSwipe`:

```js
// Определяем куда возвращаться при выходе
const backPath = topicId.startsWith('errors:') ? '/errors' : '/';
```

**3. Обновить `handleExitRequest`**:

```js
const handleExitRequest = useCallback(() => {
  if (isFinished) {
    navigate(backPath);
  } else {
    setIsExitModalOpen(true);
  }
}, [isFinished, navigate, backPath]);
```

**4. Обновить заголовок в `AppHeader`**:

```jsx
title={
  topicId === 'errors' ? 'Работа над ошибками' :
  topicId === 'all'    ? 'Случайный тест' :
  topicId.startsWith('errors:') ? `Ошибки — Тема ${topicId.slice(7)}` :
  `Тема ${topicId}`
}
```

**5. Обновить `onFinish` в `ResultScreen`**:

```jsx
onFinish={() => navigate(backPath)}
```

**6. Обновить `onConfirm` в `ConfirmationModal`**:

```js
// Было:
onConfirm={() => navigate('/')}

// Стало:
onConfirm={() => navigate(backPath)}
```

> ⚠️ Этот пункт легко пропустить — в оригинальном плане он не был
> исправлен. Модалка выхода должна вести туда же, куда и кнопка назад.

### На что обратить внимание

- `backPath` вычисляется **до первого `return`** (до `if (loading)`), иначе
  нарушается правило хуков (хотя здесь это просто переменная, не хук — но
  порядок вычислений должен быть стабильным).
- `topicId` из `useParams` всегда строка, `.startsWith` безопасен.

---

## Файл 9 — `src/styles/pages.css`

### Что добавляем

Вставить новый блок **перед** секцией `/* === Accessibility / Performance ===*/`:

```css
/* === Errors Page === */

.errors-page__header {
  padding: var(--spacing-5) 0 var(--spacing-4);
}

.errors-page__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin-bottom: var(--spacing-2);
}

.errors-page__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.errors-page__error {
  padding: var(--spacing-9) var(--spacing-4);
  text-align: center;
  color: var(--color-error);
}

/* --- Карточка темы на странице ошибок --- */

.error-topic-card {
  display: -webkit-flex;
  display: flex;
  -webkit-align-items: center;
  align-items: center;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-4);
  cursor: pointer;
  border-left: 4px solid var(--color-wrong);
  transition: box-shadow var(--transition-base), transform var(--transition-base);
  -webkit-transition: box-shadow var(--transition-base), transform var(--transition-base);
}

.error-topic-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  -webkit-transform: translateY(-2px);
}

.error-topic-card:active {
  transform: scale(0.98);
  -webkit-transform: scale(0.98);
}

/* Тема без ошибок — заблокирована, визуально тусклее */
.error-topic-card--clean {
  cursor: default;
  opacity: 0.55;
  border-left-color: var(--color-correct);
}

.error-topic-card--clean:hover {
  box-shadow: var(--shadow-sm);
  transform: none;
  -webkit-transform: none;
}

.error-topic-card--clean:active {
  transform: none;
  -webkit-transform: none;
}

/* Изображение — margin вместо gap (iOS 12) */
.error-topic-card__image-wrap {
  width: 52px;
  height: 52px;
  -webkit-flex-shrink: 0;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: var(--color-bg);
  margin-right: var(--spacing-4);
}

.error-topic-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.error-topic-card__body {
  -webkit-flex: 1;
  flex: 1;
  min-width: 0;
}

.error-topic-card__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  margin: 0 0 var(--spacing-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.error-topic-card__badge {
  display: -webkit-inline-flex;
  display: inline-flex;
  -webkit-align-items: center;
  align-items: center;
  padding: 2px var(--spacing-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.error-topic-card__badge--errors {
  background-color: var(--color-wrong-bg);
  color: var(--color-wrong);
  border: 1px solid var(--color-wrong-border);
}

.error-topic-card__badge--clean {
  background-color: var(--color-correct-bg);
  color: var(--color-correct);
  border: 1px solid var(--color-correct-border);
}
```

### На что обратить внимание

- Нигде не используется `gap` — только `margin-right` на
  `.error-topic-card__image-wrap`. Это намеренно: `gap` в Flexbox не
  поддерживается в iOS Safari 12.
- Все `display: flex` дублируются с `-webkit-flex` для совместимости.
- `-webkit-line-clamp: 2` на заголовке карточки — корректно обрезает
  длинные названия тем. Работает в Safari 12.
- `min-width: 0` на `.error-topic-card__body` — без этого flex-элемент
  не обрезает текст через `-webkit-line-clamp`, а растягивает карточку.

---

## Порядок реализации

Рекомендуемый порядок коммитов:

```
1. errorsService.js     — добавить 2 функции
2. questionsService.js  — добавить импорт + loadTopicErrorQuestions
3. useQuiz.js           — добавить импорт + ветку errors:topicId
4. useErrorTopics.js    — создать файл
5. ErrorsPage.jsx       — создать файл
6. App.jsx              — добавить маршрут + импорт
7. BottomNav.jsx        — обновить ссылку
8. QuizPage.jsx         — backPath + баг с двойным тегом + ConfirmationModal
9. pages.css            — добавить блок стилей
```

---

## Чеклист проверки после реализации

### Функциональность

- [ ] BottomNav → «Ошибки» открывает `/errors`, а не `/quiz/errors`
- [ ] На `/errors` отображаются все 25 тем
- [ ] У тем с ошибками показан бейдж «Ошибок: N» (красный)
- [ ] У тем без ошибок показан бейдж «✅ Нет ошибок» (зелёный), карточка тусклая
- [ ] Клик по теме с ошибками переходит на `/quiz/errors:5`
- [ ] Клик по теме без ошибок — ничего не происходит
- [ ] Квиз на `/quiz/errors:5` загружает только вопросы с ошибками этой темы
- [ ] Вопросы в квизе перемешаны (не в одном и том же порядке каждый раз)
- [ ] Кнопка «← назад» в квизе возвращает на `/errors`, а не на `/`
- [ ] Кнопка «К списку тем» в ResultScreen возвращает на `/errors`
- [ ] Кнопка «Да» в модалке подтверждения выхода возвращает на `/errors`
- [ ] После правильного ответа ошибка декрементируется в `qp_errors`

### Edge cases

- [ ] Если в теме 0 ошибок и пользователь перейдёт напрямую на
  `/quiz/errors:5` — отображается «Нет доступных вопросов»
- [ ] Если `qp_errors` пуст — страница `/errors` открывается мгновенно
  (без загрузки 25 JSON-файлов), показывает «Ошибок нет 🎉»
- [ ] BottomNav не отображается на страницах `/quiz/errors:5`
- [ ] BottomNav отображается на странице `/errors`
- [ ] Вкладка «Ошибки» в BottomNav подсвечивается при нахождении на `/errors`

### Совместимость Safari iOS 12

- [ ] Нет `gap` в flexbox-контейнерах новых стилей
- [ ] Все `display: flex` имеют `-webkit-flex` дублей
- [ ] `transform` имеет `-webkit-transform` дублей
- [ ] `transition` имеет `-webkit-transition` дублей

---

## Известные ограничения (не баги)

**Счётчик ошибок на `/errors` не обновляется в реальном времени.**
После прохождения квиза `errors:5` и возврата на `/errors` счётчики
показывают старые значения — хук `useErrorTopics` с `[]` загружается
один раз. Это намеренно: избегаем повторной загрузки 25 JSON.
Актуальные данные появятся при следующем монтировании страницы.

Если нужно обновление в реальном времени — добавить `key` на компонент
`ErrorsPage` или использовать `navigate('/errors', { replace: true })`
при возврате из квиза. Это отдельная задача.
