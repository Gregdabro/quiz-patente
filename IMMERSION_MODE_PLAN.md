---
name: immersion-mode-plan
description: >
  Детальный пошаговый план внедрения Staged Immersion Mode в проект Quiz Patente.
  Читать ВМЕСТЕ с SKILL.md, SKILL_DICTIONARY.md, DICTIONARY_SCALING_SKILL.md.
  Этот документ — единственный источник правды по архитектуре и реализации режима погружения.
  Обновлять по мере завершения шагов.
created: 2026-04-26
status: ready-to-implement
---

# Staged Immersion Mode — План внедрения

## Суть режима

Staged Immersion Mode — пайплайн "Слова → Фразы → Квиз" для последовательного
изучения вопросов экзамена. Пользователь выбирает тему, затем блок из 20 последовательных
вопросов (чанк), изучает термины из entries.json, релевантные именно этим вопросам,
и только потом проходит квиз по этому блоку.

**Ключевые принципы:**
- Флешкарты показывают ТОЛЬКО записи из entries.json (никакого динамического NLP)
- Global Vocabulary State: изученные термины не повторяются в последующих чанках
- Максимум 12 карточек на Stage 1, 8 на Stage 2 (антиперегрузка)
- related_question_ids в entries.json — основа join'а между чанком и словарём
- Никаких изменений в topic_N.json и entries.json (только опциональное поле morphology)

---

## Архитектурная карта (что создаём / что меняем)

### Создаём (новые файлы)
```
src/services/immersionService.js        ← сервис: vocab state + chunk progress
src/hooks/useImmersion.js              ← хук: данные чанка, переходы между стадиями
src/hooks/useFlashCards.js             ← хук: логика одного флешкард-сеанса
src/pages/ImmersionPage.jsx            ← страница выбора чанка
src/pages/ImmersionStudyPage.jsx       ← страница прохождения стадий
src/components/immersion/ChunkCard.jsx ← карточка одного блока (выбор чанка)
src/components/immersion/StageNav.jsx  ← прогресс-индикатор трёх стадий
src/components/immersion/FlashCard.jsx ← компонент одной флешкарты
src/components/immersion/FlashCardDeck.jsx ← обёртка: очередь + анимация
src/components/immersion/ReadyScreen.jsx   ← экран-мостик перед квизом
```

### Меняем (минимально)
```
src/App.jsx                     ← +2 маршрута: /immersion/:topicId и /immersion/:topicId/study/:chunkIndex
src/services/questionsService.js ← +1 функция: loadChunkQuestions(topicId, chunkIndex, chunkSize)
src/hooks/useQuiz.js             ← +1 ветка: topicId.startsWith('immersion:')
src/pages/HomePage.jsx           ← +1 кнопка "Изучить" на карточке темы
src/styles/components.css        ← новые CSS-классы для immersion-компонентов
src/styles/pages.css             ← стили ImmersionPage и ImmersionStudyPage
```

### Не трогаем
```
topic_N.json, entries.json (только опциональное поле morphology)
useTopics, useProgress, useErrorTopics, useSwipe — без изменений
QuizPage, ErrorsPage, DictionaryPage, StatsPage — без изменений
BottomNav — без изменений (4 вкладки остаются)
AppHeader, BottomNav — без изменений (переиспользуем)
SlideTransition — переиспользуем для анимации флешкарт
ConfirmationModal — переиспользуем для выхода из сеанса
```

---

## localStorage: новые ключи

```javascript
// qp_immersion_vocab
// Глобальный словарь изученных терминов. Растёт со временем, никогда не сбрасывается автоматически.
// { [entryId: string]: true }
// Пример: { "sempre": true, "carreggiata": true, "sorpasso": true }

// qp_immersion_progress
// Прогресс по чанкам каждой темы.
// { [topicId: string]: { [chunkIndex: string]: { s1: 'done'|'pending', s2: 'done'|'pending', quiz: 'done'|'pending' } } }
// Пример: { "1": { "0": { s1: 'done', s2: 'done', quiz: 'done' }, "1": { s1: 'done', s2: 'pending', quiz: 'pending' } } }
```

**Правило сброса vocab:** только через явную кнопку в UI (не реализуется в MVP, зарезервировано).

---

## Маршруты

```
/immersion/:topicId              → ImmersionPage     (выбор чанка)
/immersion/:topicId/:chunkIndex  → ImmersionStudyPage (прохождение стадий)
```

Квиз запускается через существующий `/quiz/immersion:topicId:chunkIndex` — новый паттерн topicId.

**Важно:** `/immersion/*` скрывает BottomNav (аналогично `/quiz/*`). Добавить в App.jsx:
```javascript
const hideNav = isQuizPage || location.pathname.startsWith('/immersion/');
```

---

## Алгоритм getChunkData (ядро режима)

```javascript
// В immersionService.js
function getChunkData(topicId, allEntries, topicQuestions, chunkIndex, chunkSize = 20) {
  // 1. Вырезаем чанк (строго последовательно, без shuffle)
  const questions = topicQuestions.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize);
  const questionIds = new Set(questions.map(q => q.id));

  // 2. Join: entries → вопросы чанка через related_question_ids
  const relevantEntries = allEntries.filter(entry =>
    entry.related_question_ids.some(id => questionIds.has(id))
  );

  // 3. Фильтруем уже изученные (global vocab)
  const learnedVocab = getLearnedVocab();
  const newEntries = relevantEntries.filter(e => !learnedVocab[e.id]);

  // 4. Stage 1: logic_trigger + term, топ 12 по priority
  const stage1Cards = newEntries
    .filter(e => e.type === 'logic_trigger' || e.type === 'term')
    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
    .slice(0, 12);

  // 5. Stage 2: phrase + concept, топ 8 по priority
  const stage2Cards = newEntries
    .filter(e => e.type === 'phrase' || e.type === 'concept')
    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
    .slice(0, 8);

  return {
    questions,
    stage1Cards,
    stage2Cards,
    totalRelevant: relevantEntries.length,
    alreadyKnown: relevantEntries.length - newEntries.length,
  };
}
```

**Реальные данные (тема 1, чанк 0, 20 вопросов):** 51 релевантный entry.
После фильтрации по лимитам: ~12 карточек Stage 1 + ~8 карточек Stage 2.

---

## Детальный план по шагам

---

### Шаг 1 — immersionService.js

**Файл:** `src/services/immersionService.js`

**Функции:**

```javascript
// --- Vocab ---
getLearnedVocab()                       // → { [entryId]: true }
markWordLearned(entryId)                // добавляет в qp_immersion_vocab
markWordsLearned(entryIds[])            // батч для завершения стадии
isWordLearned(entryId)                  // → boolean

// --- Progress ---
getChunkProgress(topicId, chunkIndex)   // → { s1, s2, quiz } ('done'|'pending')
markStageComplete(topicId, chunkIndex, stage)  // stage: 's1'|'s2'|'quiz'
isChunkUnlocked(topicId, chunkIndex)    // → boolean (чанк 0 всегда разблокирован)

// --- Core ---
getChunkData(topicId, allEntries, topicQuestions, chunkIndex, chunkSize)
// → { questions, stage1Cards, stage2Cards, totalRelevant, alreadyKnown }

getChunksMetadata(topicId, topicQuestions, chunkSize)
// → Array<{ index, label, questionCount, fromId, toId, progress }>
// Нужно для ImmersionPage (список всех чанков темы)
```

**Критерий готовности:** все функции реализованы, `markWordLearned` сохраняет в localStorage,
`getLearnedVocab` возвращает ранее сохранённые данные после перезагрузки страницы.

---

### Шаг 2 — questionsService.js: loadChunkQuestions

**Файл:** `src/services/questionsService.js` — добавить одну функцию:

```javascript
/**
 * Загружает строго последовательный срез вопросов темы (для режима Immersion).
 * НЕ перемешивает. Возвращает chunkSize вопросов начиная с chunkIndex * chunkSize.
 * @param {string|number} topicId
 * @param {number} chunkIndex
 * @param {number} chunkSize — по умолчанию 20
 * @returns {Promise<Array>}
 */
export async function loadChunkQuestions(topicId, chunkIndex, chunkSize = 20) {
  const all = await loadTopicQuestions(topicId);
  const start = chunkIndex * chunkSize;
  return all.slice(start, start + chunkSize);
}
```

**Критерий готовности:** `loadChunkQuestions('1', 0, 20)` возвращает первые 20 вопросов темы 1
в оригинальном (не перемешанном) порядке.

---

### Шаг 3 — useQuiz.js: ветка immersion:

**Файл:** `src/hooks/useQuiz.js` — добавить ветку в существующий `if/else` блок:

```javascript
// Паттерн topicId: 'immersion:1:0' → topicId=1, chunkIndex=0
} else if (typeof topicId === 'string' && topicId.startsWith('immersion:')) {
  const parts = topicId.split(':'); // ['immersion', '1', '0']
  const tid = parts[1];
  const chunkIdx = parseInt(parts[2], 10);
  promise = loadChunkQuestions(tid, chunkIdx, 20);
}
```

**Важно:** в ветке `finish()` НЕ сохранять статистику через `saveTestResult` для immersion-режима
(аналогично dict-режиму). Вместо этого вызвать `markStageComplete(tid, chunkIdx, 'quiz')` из immersionService.

**Критерий готовности:** `/quiz/immersion:1:0` открывает квиз с первыми 20 вопросами темы 1
в случайном порядке (pickSessionQuestions применяется). ResultScreen показывается корректно.

---

### Шаг 4 — useImmersion.js

**Файл:** `src/hooks/useImmersion.js`

```javascript
const {
  // Данные страницы выбора чанка (ImmersionPage)
  chunks,           // Array<{ index, label, questionCount, progress, isUnlocked }>
  topicTitle,       // string — название темы

  // Данные текущего чанка (ImmersionStudyPage)
  chunkData,        // { questions, stage1Cards, stage2Cards, totalRelevant, alreadyKnown }
  currentStage,     // 's1' | 's2' | 'quiz_ready'

  loading,
  error,

  // Actions
  completeStage,    // fn('s1'|'s2') → помечает стадию, обновляет vocab, переходит к следующей
} = useImmersion(topicId, chunkIndex);
// chunkIndex = null → режим выбора чанка (только chunks + topicTitle)
// chunkIndex = number → режим изучения (только chunkData + currentStage)
```

**Логика:**
1. При монтировании: параллельно загружает `loadTopicQuestions(topicId)` и `loadDictionaryEntries()`
2. Вычисляет `getChunksMetadata` (для ImmersionPage) или `getChunkData` (для ImmersionStudyPage)
3. `completeStage('s1')` → вызывает `markWordsLearned(stage1Cards.map(e=>e.id))` + `markStageComplete` + обновляет `currentStage`

**Критерий готовности:** хук корректно вычисляет список чанков для темы 1 (531 вопрос → 26 чанков по 20, последний неполный). После вызова `completeStage('s1')` повторный вызов `getLearnedVocab()` содержит все id из stage1Cards.

---

### Шаг 5 — useFlashCards.js

**Файл:** `src/hooks/useFlashCards.js`

```javascript
const {
  currentCard,      // entry | null
  cardIndex,        // number (0-based)
  total,            // number
  isLast,           // boolean
  isDone,           // boolean (все карточки просмотрены)
  goNext,           // fn() → следующая карточка
  goPrev,           // fn() → предыдущая карточка
  markDone,         // fn() → отмечает текущую карточку как "Понятно" и переходит к следующей
  doneIds,          // Set<entryId> — какие карточки уже отмечены
} = useFlashCards(cards); // cards = stage1Cards или stage2Cards
```

**Правило завершения:** `isDone = true` когда `doneIds.size >= total`.
Кнопка "Далее" в родителе разблокируется только когда `isDone`.

**Важно:** хук не знает о localStorage — только управляет локальным состоянием.
Сохранение в vocab происходит в `completeStage` (useImmersion).

**Критерий готовности:** `markDone` на последней карточке устанавливает `isDone = true`.
`goPrev` корректно работает в начале (index 0 → ничего не делает).

---

### Шаг 6 — FlashCard.jsx

**Файл:** `src/components/immersion/FlashCard.jsx`

**Структура карточки (сверху вниз):**

```
┌─────────────────────────────────────────┐
│  [ТИП-BADGE]              N / Total     │
│                                         │
│         {entry.term}                    │  ← 24px bold
│         {entry.term_ru}                 │  ← 18px muted
│                                         │
│  ─────────────────────────────          │
│  📖  {entry.definition.ru}              │  ← 16px
│                                         │
│  🎯  {entry.quiz_hint.ru}               │  ← 16px, выделено фоном
│                                         │
│  [Пример если есть]                     │  ← 14px, курсив
│  «{example.it}»                         │
│  → {example.ru}                         │
│  Ответ: ✅ VERO / ❌ FALSO               │
└─────────────────────────────────────────┘
```

**Props:**
```jsx
<FlashCard
  entry={entry}           // объект из entries.json
  index={cardIndex}       // текущий индекс (0-based)
  total={total}           // всего карточек в стадии
  isDone={bool}           // эта карточка уже отмечена "Понятно"
/>
```

**Type badge цвета** (CSS-классы `.flash-badge--[type]`):
- `logic_trigger` → жёлтый `#fef3c7` / `#92400e`, текст "ЛОВУШКА 🎯"
- `term` → синий `#dbeafe` / `#1e40af`, текст "ТЕРМИН"
- `phrase` → зелёный `#d1fae5` / `#065f46`, текст "ФРАЗА"
- `concept` → фиолетовый `#ede9fe` / `#5b21b6`, текст "КОНЦЕПЦИЯ"

**Требования iOS 12:**
- Только `max-height` transition для секций (не `height: auto`)
- Без `gap` — `margin-bottom` между секциями
- `React.memo` (перфоманс на iPad mini 2)

**Критерий готовности:** карточка рендерится для всех 4 типов без ошибок. Badge правильного цвета.

---

### Шаг 7 — FlashCardDeck.jsx

**Файл:** `src/components/immersion/FlashCardDeck.jsx`

**Обёртка, которая:**
1. Использует `useFlashCards(cards)` для управления очередью
2. Использует `useSwipe` (уже есть) для свайпов: влево = следующая, вправо = предыдущая
3. Использует `SlideTransition` (уже есть) для анимации смены карточек
4. Рендерит `FlashCard` + кнопки навигации внизу

**Кнопки внизу:**
```
[← Назад]    [Понятно ✓]
```
- "← Назад" — `goPrev()`, задизейблен при `cardIndex === 0`
- "Понятно ✓" — `markDone()`, после нажатия кнопка становится "✓ Запомнено" (disabled)

**После `isDone`:**
- Вместо карточек показывает экран-итог: "Стадия завершена! X терминов изучено."
- Кнопка "Продолжить →" — вызывает `onComplete()` (prop от родителя)

**Props:**
```jsx
<FlashCardDeck
  cards={stage1Cards}    // или stage2Cards
  onComplete={fn}        // вызывается когда isDone и пользователь нажал "Продолжить"
/>
```

**Критерий готовности:** можно пройти колоду из 5 карточек от начала до конца.
Свайп влево/вправо меняет карточку. `onComplete` вызывается ровно один раз.

---

### Шаг 8 — StageNav.jsx

**Файл:** `src/components/immersion/StageNav.jsx`

**Визуал: горизонтальный прогресс-индикатор трёх стадий**

```
[● Слова]  ────  [○ Фразы]  ────  [○ Квиз]
```

Состояния иконок: ○ (pending), ● (active), ✓ (done).

**Props:**
```jsx
<StageNav
  stages={[
    { id: 's1', label: 'Слова',  status: 'done' },    // 'done'|'active'|'pending'
    { id: 's2', label: 'Фразы',  status: 'active' },
    { id: 'quiz', label: 'Квиз', status: 'pending' },
  ]}
/>
```

**Требования iOS 12:**
- Горизонтальный flex без gap: `margin-right: var(--spacing-4)` на каждом элементе кроме последнего
- Линии между элементами — через `::before` или inline `<hr>` с абсолютным позиционированием

**Критерий готовности:** компонент рендерит 3 стадии с правильными статусами.

---

### Шаг 9 — ReadyScreen.jsx

**Файл:** `src/components/immersion/ReadyScreen.jsx`

**Экран-мостик перед запуском квиза:**

```
┌─────────────────────────────────────────┐
│  [Слова ✓] ── [Фразы ✓] ── [Квиз ●]    │
├─────────────────────────────────────────┤
│                                         │
│         🎯 Готов к квизу!               │
│                                         │
│  Ты изучил {s1Count} терминов           │
│  и {s2Count} фраз.                      │
│                                         │
│  Уже знал: {alreadyKnown} терминов ✓   │
│  Впереди: {questionCount} вопросов      │
│                                         │
│       [Начать квиз →]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Props:**
```jsx
<ReadyScreen
  s1Count={number}
  s2Count={number}
  alreadyKnown={number}
  questionCount={number}
  onStart={fn}           // navigate к квизу
/>
```

**Критерий готовности:** экран рендерится с реальными числами. Кнопка вызывает `onStart`.

---

### Шаг 10 — ChunkCard.jsx

**Файл:** `src/components/immersion/ChunkCard.jsx`

**Карточка одного блока на ImmersionPage:**

```
┌─────────────────────────────────────────┐
│  Блок 1 · вопросы 1–20                 │
│                                         │
│  [✓ Слова] [✓ Фразы] [✓ Квиз]         │ ← три маленькие таблетки
│                                  [ → ] │ ← кнопка входа
└─────────────────────────────────────────┘
```

Для заблокированного чанка (предыдущий не завершён):
```
┌─────────────────────────────────────────┐
│  Блок 3 · вопросы 41–60                │
│                                         │
│  [○ Слова] [○ Фразы] [○ Квиз]         │
│                              [🔒 locked]│ ← серая, не кликабельная
└─────────────────────────────────────────┘
```

**Props:**
```jsx
<ChunkCard
  chunk={{ index, label, questionCount, progress, isUnlocked }}
  onSelect={fn}    // navigate к ImmersionStudyPage
/>
```

**Критерий готовности:** заблокированный чанк не реагирует на клик (pointer-events: none или disabled).

---

### Шаг 11 — ImmersionPage.jsx

**Файл:** `src/pages/ImmersionPage.jsx`

**Маршрут:** `/immersion/:topicId`

**Структура (сверху вниз):**
```
AppHeader "Погружение: {topicTitle}" ← кнопка назад → /
Spinner (при loading)
список ChunkCard (все чанки темы)
```

**Логика:**
1. Читает `topicId` из `useParams()`
2. Вызывает `useImmersion(topicId, null)` → получает `{ chunks, topicTitle, loading, error }`
3. Рендерит список `ChunkCard`
4. `onSelect(chunkIndex)` → `navigate('/immersion/${topicId}/${chunkIndex}')`

**BottomNav:** скрыт (за счёт логики в App.jsx — см. Шаг 14).

**Критерий готовности:** страница показывает все чанки темы 1 (27 чанков: 26 полных + 1 неполный из 11 вопросов). Первый чанк разблокирован, остальные заблокированы (нет прогресса).

---

### Шаг 12 — ImmersionStudyPage.jsx

**Файл:** `src/pages/ImmersionStudyPage.jsx`

**Маршрут:** `/immersion/:topicId/:chunkIndex`

**Структура (сверху вниз):**
```
AppHeader "{topicTitle} · Блок {N}" ← кнопка назад → /immersion/:topicId
StageNav (три стадии с текущим статусом)
─────────────────────────────────────
[Stage 1 активна]:   FlashCardDeck (stage1Cards)
[Stage 2 активна]:   FlashCardDeck (stage2Cards)
[Quiz готов]:        ReadyScreen
```

**Логика:**
1. Читает `topicId` и `chunkIndex` из `useParams()`
2. Вызывает `useImmersion(topicId, parseInt(chunkIndex))` → получает `{ chunkData, currentStage, completeStage, loading }`
3. Передаёт `onComplete={completeStage}` в FlashCardDeck
4. Когда `currentStage === 'quiz_ready'` → показывает ReadyScreen
5. ReadyScreen `onStart` → `navigate('/quiz/immersion:${topicId}:${chunkIndex}')`

**Выход из сеанса:** кнопка "←" в AppHeader → ConfirmationModal (если стадия не завершена):
"Выйти? Прогресс стадии не сохранится." Да → `navigate('/immersion/${topicId}')`.

**Edge case: нет карточек.** Если `stage1Cards.length === 0`:
- Stage 1 автоматически помечается как done
- Сразу переходим к Stage 2 (или сразу к quiz_ready если и Stage 2 пуста)
- Пользователю показывается сообщение: "Ты уже знаешь все термины этого блока 🎉"

**Критерий готовности:** можно пройти полный цикл — изучить все карточки Stage 1, нажать "Продолжить",
перейти к Stage 2, завершить, увидеть ReadyScreen, нажать "Начать квиз" → открывается `/quiz/immersion:1:0`.

---

### Шаг 13 — HomePage.jsx: кнопка "Изучить"

**Файл:** `src/pages/HomePage.jsx`

**Изменение:** добавить маленькую вторичную кнопку "📚 Изучить" на каждую карточку темы.

**Расположение:** под ProgressBar внутри карточки темы. Кнопка небольшая, вторичная (не конкурирует с основным действием — входом в квиз).

```jsx
<button
  className="btn btn-secondary btn-sm topic-card__immersion-btn"
  onClick={(e) => {
    e.stopPropagation(); // не запускать навигацию в квиз
    navigate('/immersion/' + topic.topic_id);
  }}
>
  📚 Изучить
</button>
```

**CSS:** `.topic-card__immersion-btn` — небольшая, `padding: 6px 12px`, `font-size: var(--font-size-xs)`.

**Критерий готовности:** кнопка видна на каждой карточке, клик открывает `/immersion/1` для темы 1.
Основной клик по карточке по-прежнему открывает квиз.

---

### Шаг 14 — App.jsx: маршруты и скрытие BottomNav

**Файл:** `src/App.jsx`

**Два изменения:**

```jsx
// 1. Импорт новых страниц
import ImmersionPage from './pages/ImmersionPage';
import ImmersionStudyPage from './pages/ImmersionStudyPage';

// 2. Маршруты
<Route path="/immersion/:topicId" element={<ImmersionPage />} />
<Route path="/immersion/:topicId/:chunkIndex" element={<ImmersionStudyPage />} />

// 3. Логика скрытия BottomNav
const isQuizPage = location.pathname.startsWith('/quiz/');
const isImmersionStudy = location.pathname.startsWith('/immersion/') &&
  location.pathname.split('/').length > 3; // /immersion/1 → показать, /immersion/1/0 → скрыть

// BottomNav показывается на /immersion/:topicId (выбор чанка)
// BottomNav скрыт на /immersion/:topicId/:chunkIndex (изучение)
const hideNav = isQuizPage || isImmersionStudy;
```

**Критерий готовности:** BottomNav виден на `/immersion/1` и скрыт на `/immersion/1/0`.

---

### Шаг 15 — Стили

**Файлы:** `src/styles/components.css` и `src/styles/pages.css`

**Новые классы (добавить в конец соответствующих файлов):**

```css
/* === components.css: FlashCard === */
.flash-card { ... }
.flash-card__badge { ... }
.flash-badge--logic-trigger { background: #fef3c7; color: #92400e; }
.flash-badge--term          { background: #dbeafe; color: #1e40af; }
.flash-badge--phrase        { background: #d1fae5; color: #065f46; }
.flash-badge--concept       { background: #ede9fe; color: #5b21b6; }
.flash-card__term { ... }
.flash-card__term-ru { ... }
.flash-card__definition { ... }
.flash-card__hint { background: var(--color-surface-alt); ... }
.flash-card__example { ... }
.flash-card__counter { ... }

/* === components.css: FlashCardDeck === */
.flash-deck { ... }
.flash-deck__nav { display: flex; } /* margin-right на кнопках, без gap */
.flash-deck__done-screen { ... }

/* === components.css: StageNav === */
.stage-nav { display: flex; align-items: center; }
.stage-nav__item { ... }
.stage-nav__item--active { ... }
.stage-nav__item--done { ... }
.stage-nav__item--pending { ... }
.stage-nav__connector { flex: 1; height: 2px; background: var(--color-border); }

/* === components.css: ChunkCard === */
.chunk-card { ... }
.chunk-card--locked { opacity: 0.5; pointer-events: none; }
.chunk-card__stages { display: flex; } /* margin-right между таблетками */
.chunk-pill { ... }
.chunk-pill--done { ... }
.chunk-pill--active { ... }
.chunk-pill--pending { ... }

/* === pages.css: ImmersionPage === */
.immersion-page { ... }
.immersion-page__list { ... }

/* === pages.css: ImmersionStudyPage === */
.immersion-study { ... }
.immersion-study__ready { ... }

/* === pages.css: кнопка на карточке темы === */
.topic-card__immersion-btn { ... }
```

**Правило iOS 12:** все flex-контейнеры используют `margin-right` / `margin-bottom` вместо `gap`.

**Критерий готовности:** нет визуальных дефектов на viewport 768px (iPad mini 2 ширина).

---

### Шаг 16 — Верификация полного пайплайна

**Сценарий для ручного тестирования:**

1. Открыть `/` → найти Тему 1 → нажать "📚 Изучить" → попасть на `/immersion/1`
2. Убедиться: отображается список чанков, Блок 1 разблокирован, остальные заблокированы
3. Нажать Блок 1 → попасть на `/immersion/1/0`
4. Убедиться: StageNav показывает "● Слова, ○ Фразы, ○ Квиз"
5. Пройти Stage 1: отметить "Понятно ✓" на каждой карточке → нажать "Продолжить"
6. Убедиться: StageNav показывает "✓ Слова, ● Фразы, ○ Квиз"
7. Пройти Stage 2 → нажать "Продолжить"
8. Убедиться: показывается ReadyScreen с реальными числами
9. Нажать "Начать квиз →" → попасть на `/quiz/immersion:1:0`
10. Убедиться: квиз содержит ровно 20 вопросов из темы 1 (в случайном порядке, но все из блока 0)
11. Пройти квиз → ResultScreen → выйти → попасть на `/immersion/1`
12. Убедиться: Блок 1 показывает "✓ Слова, ✓ Фразы, ✓ Квиз", Блок 2 разблокирован
13. Открыть Блок 2 → убедиться: слова, которые встречались в Блоке 1, НЕ показываются снова

**Проверка глобального vocab:** открыть DevTools → Application → localStorage → `qp_immersion_vocab`
должен содержать все entryId из stage1Cards и stage2Cards блока 0.

---

## Порядок реализации (рекомендуемый)

```
Шаг 1  → immersionService.js           (чистый сервис, нет зависимостей)
Шаг 2  → questionsService.js           (одна функция, легко проверить)
Шаг 3  → useQuiz.js                    (ветка immersion:, проверить через URL)
Шаг 5  → useFlashCards.js              (изолированный хук, легко тестировать)
Шаг 4  → useImmersion.js               (зависит от Шагов 1-2)
Шаг 6  → FlashCard.jsx                 (чистый UI-компонент, нет зависимостей)
Шаг 8  → StageNav.jsx                  (чистый UI)
Шаг 9  → ReadyScreen.jsx               (чистый UI)
Шаг 10 → ChunkCard.jsx                 (чистый UI)
Шаг 7  → FlashCardDeck.jsx             (зависит от FlashCard + useFlashCards + useSwipe)
Шаг 11 → ImmersionPage.jsx             (зависит от ChunkCard + useImmersion)
Шаг 12 → ImmersionStudyPage.jsx        (зависит от всего выше)
Шаг 15 → Стили                         (параллельно с Шагами 6-12)
Шаг 13 → HomePage.jsx                  (последнее: кнопка входа)
Шаг 14 → App.jsx                       (последнее: маршруты)
Шаг 16 → Полная верификация            (после всего)
```

---

## Что не входит в MVP (зарезервировано)

| Фича | Почему не сейчас | Когда |
|---|---|---|
| Кнопка "Сбросить словарь" | Не нужна при первом прохождении | После первого полного цикла |
| `morphology` поле в entries | Небольшое улучшение покрытия | При пополнении entries.json |
| Фильтр чанков по прогрессу | Список короткий, не нужен | Если тем > 5 и чанков > 20 |
| Статистика по режиму Immersion | Нет места в UI | Phase 2 Stats |
| Шорткат "Пропустить стадию" | Убирает учебный эффект | Никогда (принципиально) |
| Анимация flip карточки | Нестабильна на Chrome 92 iOS | Никогда |
| SRS (интервальные повторения) | Overkill | Phase 2 Backend |

---

## Связанные файлы (читать при работе над этим планом)

- `SKILL.md` — технический стек, CSS-переменные, iOS 12 ограничения
- `SKILL_DICTIONARY.md` — схема Entry, типы, badge-цвета
- `DICTIONARY_SCALING_SKILL.md` — схема related_question_ids, morphology
- `src/services/questionsService.js` — как грузятся вопросы (паттерн для loadChunkQuestions)
- `src/hooks/useQuiz.js` — как добавлять новые ветки topicId
- `src/components/ui/SlideTransition.jsx` — переиспользовать в FlashCardDeck
- `src/hooks/useSwipe.js` — переиспользовать в FlashCardDeck

---

*Версия плана: 1.0*
*Создан: 2026-04-26*
*На основе: Staged Immersion Mode — Полный архитектурный разбор (апрель 2026)*
