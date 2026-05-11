# Технический аудит Immersion Mode — quiz-patente

> Версия 2.0 — дополнена анализом проблемы quiz→stage coverage и планом её устранения

---

## 1. Executive Summary

**Как работает сейчас:** Immersion Mode — это трёхступенчатый режим обучения. Сначала пользователь изучает термины-карточки (Stage 1), потом фразы (Stage 2), потом проходит квиз по тем же вопросам (Stage 3). Всё построено вокруг концепции «Блок» — 20 вопросов из конкретной темы, взятых строго по порядку.

**Достигается ли главная цель?** — **ДА в одну сторону, ЧАСТИЧНО в другую.**

- **Stage 1/2 → Quiz (прямое направление):** «изучил слово — увидел его в квизе» — **100%**. Все показанные карточки гарантированно встречаются в вопросах Quiz. Рассинхрона нет.
- **Quiz → Stage 1/2 (обратное направление):** «увидел слово в квизе — изучал его раньше» — **~50–66%**. Из-за лимита в 12 карточек Stage 1 значительная часть терминов, встречающихся в вопросах Quiz, пользователю показана не была.

**Главный вывод:** Архитектура грамотная и связь между стадиями надёжная. Проблема не в рассинхроне данных, а в алгоритме отбора карточек. Два точечных исправления поднимут покрытие quiz→stage с ~50–59% до ~85–94%.

---

## 2. Current Architecture — Как всё устроено

Пользователь заходит в режим погружения по конкретной теме (например, «Дорога и транспортные средства»). Ему показывается список «Блоков» — каждый блок это ровно 20 вопросов из этой темы, взятых строго по порядку: Блок 1 = вопросы 1–20, Блок 2 = вопросы 21–40, и так далее.

Внутри каждого блока три стадии:

```
[Блок N = вопросы 1–20 темы X]
         ↓
  Stage 1: Карточки-слова
  (logic_trigger + term, топ 12)
         ↓
  Stage 2: Карточки-фразы
  (phrase + concept, топ 8)
         ↓
  Stage 3: Quiz — те же 20 вопросов
```

**Участвующие файлы:**

| Файл | Роль |
|---|---|
| `immersionService.js` | Ядро: формирование блока, vocab, прогресс |
| `useImmersion.js` | React-контроллер: загрузка данных, управление стадиями |
| `ImmersionPage.jsx` | Выбор блока (список ChunkCard) |
| `ImmersionStudyPage.jsx` | Прохождение блока (Stage 1 → 2 → Quiz) |
| `questionsService.js` | `loadChunkQuestions()` — загрузка вопросов блока для Quiz |
| `useQuiz.js` | Quiz-логика, понимает `immersion:topicId:chunkIndex` |
| `highlightUtils.js` | Подсветка изученных слов в тексте вопросов Quiz |

---

## 3. Block N Generation — Как создаётся блок

Блок формируется детерминировано — без всякой случайности:

```js
// immersionService.js, функция getChunkData()
var start = chunkIndex * 20;
var questions = topicQuestions.slice(start, start + 20); // строго по порядку
```

Для Quiz через `loadChunkQuestions()` в `questionsService.js` — то же самое `slice`. После этого `useQuiz` вызывает `pickSessionQuestions(raw)` — shuffle + slice(0, 30). Перемешивание порядка педагогически нормально: **набор вопросов тот же, только порядок случайный**.

**Итог:** блок полностью детерминирован и воспроизводим. Блок 2 темы 1 — всегда вопросы 21–40.

---

## 4. entries.json Filtering Logic

### Stage 1 — Слова (logic_trigger + term)

```js
// immersionService.js
var relevantEntries = allEntries.filter(function(entry) {
  return entry.related_question_ids.some(id => questionIds[id]);
});

var stage1Cards = relevantEntries
  .filter(e => e.type === 'logic_trigger' || e.type === 'term')
  .sort(_byPriority)   // ← только по priority (1=высший)
  .slice(0, 12);       // ← лимит 12 карточек
```

**Ключевая архитектурная гарантия** — в коде явно прописан запрет на `context_question_ids`:

```js
// АРХИТЕКТУРНОЕ ТРЕБОВАНИЕ: использовать ТОЛЬКО related_question_ids
// context_question_ids здесь ЗАПРЕЩЕНЫ — термин только в комментарии,
// в тексте вопроса его не будет.
```

### Stage 2 — Фразы (phrase + concept)

Аналогично Stage 1, только `type === 'phrase' || 'concept'`, лимит 8. Типы не пересекаются — нет риска что одна entry попадёт в обе стадии.

**Покрытие по теме 1 (данные):**

| Блок | Вопросов | Покрыто entries | Stage 1 карточек | Stage 2 карточек |
|---|---|---|---|---|
| 1 | 20 | 20 (100%) | 12 | 4 |
| 2 | 20 | 20 (100%) | 12 | 8 |
| 3 | 20 | 20 (100%) | 12 | 7 |
| 4 | 20 | 20 (100%) | 12 | 6 |
| 5 | 20 | 20 (100%) | 12 | 6 |

---

## 5. Quiz Relationship Analysis

**Прямая связь (Stage → Quiz) — 100%.**

```
getChunkData (Stage 1/2):              loadChunkQuestions (Quiz):
topicQuestions.slice(N*20, N*20+20)    topicQuestions.slice(N*20, N*20+20)
        ↓                                       ↓
  questionIds = {1,2,...20}              те же 20 вопросов
        ↓                                       ↓
  entries JOIN questionIds            pickSessionQuestions → shuffle
  (только related_question_ids)       (порядок случайный, набор тот же)
```

Smart Highlighting (`highlightUtils.js`) дополнительно усиливает связь визуально: в тексте вопросов Quiz подсвечиваются термины из `getLearnedVocab()` — именно те, что пользователь изучил в Stage 1/2.

---

## 6. Main Problems

### Проблема 1 (КРИТИЧЕСКАЯ): Белые пятна quiz→stage — покрытие ~50–59%

**Суть проблемы.** Лимит в 12 карточек для Stage 1 необходим (антиперегрузка), но текущая сортировка только по `priority` не учитывает, сколько вопросов блока покрывает каждый термин. Это создаёт ситуацию, когда термины с высоким приоритетом, но встречающиеся лишь в 1–2 вопросах, вытесняют термины с чуть меньшим приоритетом, но присутствующие в 9–13 вопросах.

**Реальный пример из чанка 0, тема 1:**

Термин `strada` (prio=2, type=term) встречается в **13 из 20 вопросов** чанка, но не показывается — вытеснен 12 терминами с priority=1, часть из которых покрывает лишь 1 вопрос:

| Показан | Термин | Priority | Покрывает вопросов |
|---|---|---|---|
| ✅ | `conducente` | 1 | 1 |
| ✅ | `manovra` | 1 | 1 |
| ✅ | `sempre` | 1 | 1 |
| ✅ | `unico / unica` | 1 | 1 |
| ❌ | `strada` | **2** | **13** |
| ❌ | `senso` | **2** | **9** |
| ❌ | `corsie` | **2** | **4** |

Пользователь видит слово «strada» в 13 вопросах квиза подряд — и ни разу не изучал его карточку.

**Масштаб проблемы (данные по теме 1):**

| Чанк | Покрытие quiz→stage (текущее) | Вопросов без показанного термина |
|---|---|---|
| 0 | 59% | 3 из 20 |
| 1 | 51% | 4 из 20 |
| 2 | 55% | 4 из 20 |
| 3 | 48% | 5 из 20 |
| 4 | 50% | 2 из 20 |

В чанке 3 почти половина терминов в вопросах Quiz пользователь не видел в Stage 1/2.

---

### Проблема 2 (архитектурная): Дублирование константы CHUNK_SIZE

Значение `20` и формула `chunkIndex * size` продублированы в двух независимых местах:

```js
// immersionService.js:
var DEFAULT_CHUNK_SIZE = 20; // не экспортируется

// questionsService.js:
const size = chunkSize || 20; // отдельный хардкод

// useImmersion.js:
var CHUNK_SIZE = 20; // третья копия
```

Если изменить размер чанка в одном файле и забыть в другом — Stage 1/2 и Quiz начнут использовать разные наборы вопросов. Рассинхрон возникнет незаметно.

---

### Проблема 3 (UX): Авто-пропуск пустых стадий не реализован в хуке

Комментарий в `ImmersionStudyPage.jsx` говорит: *«useImmersion должен был перейти сам»*. Но хук никогда не делает авто-пропуск. Если все слова блока уже в vocab, пользователь видит empty-state экран и нажимает «Продолжить» дважды подряд — это лишние клики.

---

### Проблема 4 (UX): Порог `isPassed` не адаптирован для коротких блоков

```js
// ResultScreen.jsx:
const isPassed = wrongCount <= 4; // ≤4 ошибки — порог для 30 вопросов
```

Последний блок темы может содержать 11 вопросов. Там 4 ошибки = 63% правильных — явно не «сдано». Для immersion-блоков по 20 вопросов порог тоже неоптимален (≤4 = 80%, а не 87% как в экзамене).

---

## 7. Proposed Architecture

**Принцип:** никакого rewrite. Точечные изменения в трёх местах.

### Решение проблемы 1: комбинация Sort Fix + Pre-Quiz Glossary

#### Sort Fix (Вариант C): двухкритериальная сортировка

Вместо сортировки только по `priority` — сортировать по `(priority, -coverage)`. Внутри одного уровня приоритета выбирать термины, покрывающие **больше вопросов блока**.

```js
// Было:
.sort(_byPriority)              // key = priority

// Станет:
.sort(_byPriorityThenCoverage)  // key = (priority, -coverage_in_chunk)
```

Это не нарушает педагогическую иерархию: термины priority=1 всегда идут раньше priority=2. Но **внутри** каждого уровня приоритета порядок станет умным — сначала термины, встречающиеся в большем числе вопросов.

**Эффект по данным:**

| Чанк | Покрытие ДО | Покрытие ПОСЛЕ Sort Fix |
|---|---|---|
| 0 | 59% | 66% (+7%) |
| 1 | 51% | 68% (+17%) |
| 2 | 55% | 56% (+1%) |

#### Pre-Quiz Glossary (Вариант D): шпаргалка на ReadyScreen

Термины, не вошедшие в карточки (dropped), но встречающиеся в **2+ вопросах блока**, показываются пользователю в компактном списке на экране перед стартом Quiz. Это пассивное знакомство — без карточек и флипов, просто: «термин = перевод».

```
┌─────────────────────────────────────┐
│  🎯 Готов к квизу!                  │
│                                     │
│  Изучено терминов:     12           │
│  Вопросов в квизе:     20           │
│                                     │
│  📋 Ещё встретятся в квизе (5):     │
│  strada = дорога                    │
│  senso = направление / смысл        │
│  corsie = полосы движения (мн.ч.)   │
│  carreggiate = проезжие части       │
│  centro = центр                     │
│                                     │
│        [ Начать квиз → ]            │
└─────────────────────────────────────┘
```

**Порог включения в глоссарий:** coverage ≥ 2 вопросов блока. Термины, встречающиеся лишь в 1 вопросе, не включаются — слишком мало контекста для пассивного запоминания.

**Итоговое покрытие quiz→stage (карточки + глоссарий):**

| Чанк | Карточки (Sort Fix) | Карточки + Глоссарий | Glossary терминов |
|---|---|---|---|
| 0 | 66% | **94%** | 5 |
| 1 | 68% | **91%** | 8 |
| 2 | 56% | **87%** | 5 |
| 3 | 54% | **78%** | 2 |
| 4 | 60% | **88%** | 6 |

---

## 8. Implementation Plan

### Шаг 1 — Sort Fix: двухкритериальная сортировка (30 мин, критично) [✅ Done]

**Файл:** `src/services/immersionService.js`

**Что менять:**

```js
// ── ДО ────────────────────────────────────────────────────────────
// 4. Stage 1: logic_trigger + term, топ 12 по priority (1 = высший).
var stage1Cards = newEntries
  .filter(function (e) {
    return e.type === 'logic_trigger' || e.type === 'term';
  })
  .sort(_byPriority)
  .slice(0, 12);

// 5. Stage 2: phrase + concept, топ 8 по priority.
var stage2Cards = newEntries
  .filter(function (e) {
    return e.type === 'phrase' || e.type === 'concept';
  })
  .sort(_byPriority)
  .slice(0, 8);
```

```js
// ── ПОСЛЕ ─────────────────────────────────────────────────────────
// Считаем coverage для каждого entry: сколько вопросов блока оно покрывает.
// Используется как вторичный критерий сортировки внутри одного priority.
for (var k = 0; k < newEntries.length; k++) {
  var _ids = newEntries[k].related_question_ids || [];
  var _cov = 0;
  for (var m = 0; m < _ids.length; m++) {
    if (questionIds[_ids[m]]) _cov++;
  }
  newEntries[k]._coverage = _cov;
}

// 4. Stage 1: logic_trigger + term, топ 12.
// Сортировка: (priority ASC, coverage DESC) — важные термины сначала,
// внутри одного priority — термины, встречающиеся в большем числе вопросов.
var stage1Cards = newEntries
  .filter(function (e) {
    return e.type === 'logic_trigger' || e.type === 'term';
  })
  .sort(_byPriorityThenCoverage)
  .slice(0, 12);

// 5. Stage 2: phrase + concept, топ 8.
var stage2Cards = newEntries
  .filter(function (e) {
    return e.type === 'phrase' || e.type === 'concept';
  })
  .sort(_byPriorityThenCoverage)
  .slice(0, 8);
```

Добавить новую функцию-компаратор в раздел «Приватные хелперы»:

```js
// Было:
function _byPriority(a, b) {
  return (a.priority || 3) - (b.priority || 3);
}

// Добавить рядом:
function _byPriorityThenCoverage(a, b) {
  var pDiff = (a.priority || 3) - (b.priority || 3);
  if (pDiff !== 0) return pDiff;
  // Внутри одного priority — больше coverage идёт первым
  return (b._coverage || 0) - (a._coverage || 0);
}
```

Также добавить поле `glossaryCards` в возвращаемый объект `getChunkData`:

```js
// ── ДО ────────────────────────────────────────────────────────────
return {
  questions:     questions,
  stage1Cards:   stage1Cards,
  stage2Cards:   stage2Cards,
  totalRelevant: relevantEntries.length,
  alreadyKnown:  alreadyKnown,
};

// ── ПОСЛЕ ─────────────────────────────────────────────────────────
// Глоссарий: dropped entries с coverage >= 2.
// Это термины, не вошедшие в карточки, но встречающиеся в 2+ вопросах блока.
// Показываются пассивно на ReadyScreen перед стартом Quiz.
var shownIds = {};
for (var si = 0; si < stage1Cards.length; si++) shownIds[stage1Cards[si].id] = true;
for (var si2 = 0; si2 < stage2Cards.length; si2++) shownIds[stage2Cards[si2].id] = true;

var glossaryCards = newEntries
  .filter(function (e) {
    return !shownIds[e.id] && (e._coverage || 0) >= 2;
  })
  .sort(function (a, b) { return (b._coverage || 0) - (a._coverage || 0); });

return {
  questions:     questions,
  stage1Cards:   stage1Cards,
  stage2Cards:   stage2Cards,
  glossaryCards: glossaryCards,   // ← новое поле
  totalRelevant: relevantEntries.length,
  alreadyKnown:  alreadyKnown,
};
```

**Verify:** запустить симуляцию (см. Шаг 5) — покрытие quiz→stage для чанка 0 должно вырасти с 59% до 66%.

---

### Шаг 2 — Glossary компонент: GlossaryList (45 мин, важно) [✅ Done]

**Новый файл:** `src/components/immersion/GlossaryList.jsx`

```jsx
/**
 * GlossaryList.jsx
 * Компактный список терминов, не вошедших в карточки Stage 1/2,
 * но встречающихся в 2+ вопросах блока. Показывается на ReadyScreen
 * перед стартом Quiz — пассивное знакомство без активного изучения.
 *
 * Props:
 *   cards {Array} — glossaryCards из getChunkData
 *                   каждый элемент: { term, term_ru, type, _coverage }
 *
 * iOS 12: нет gap в flex — margin-bottom на элементах.
 */

import React, { useState } from 'react';

var GlossaryList = React.memo(function GlossaryList(props) {
  var cards = props.cards;
  var [expanded, setExpanded] = useState(false);

  if (!cards || cards.length === 0) return null;

  // Показываем первые 4 сразу, остальные — по клику «Показать все»
  var PREVIEW_LIMIT = 4;
  var visible = expanded ? cards : cards.slice(0, PREVIEW_LIMIT);
  var hasMore = !expanded && cards.length > PREVIEW_LIMIT;

  return (
    <div className="glossary-list">
      <p className="glossary-list__title">
        {'📋 Ещё встретятся в квизе (' + cards.length + '):'}
      </p>
      <ul className="glossary-list__items">
        {visible.map(function (e) {
          return (
            <li key={e.id} className="glossary-list__item">
              <span className="glossary-list__term">{e.term}</span>
              <span className="glossary-list__sep">{' = '}</span>
              <span className="glossary-list__translation">{e.term_ru}</span>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          className="glossary-list__more-btn"
          onClick={function () { setExpanded(true); }}
        >
          {'Ещё ' + (cards.length - PREVIEW_LIMIT) + ' →'}
        </button>
      )}
    </div>
  );
});

export default GlossaryList;
```

---

### Шаг 3 — ReadyScreen: принять и отрендерить glossaryCards (20 мин) [✅ Done]

**Файл:** `src/components/immersion/ReadyScreen.jsx`

```jsx
// ── ДО ────────────────────────────────────────────────────────────
import React from 'react';
import Button from '../ui/Button';

const ReadyScreen = ({ s1Count, s2Count, alreadyKnown, questionCount, onStart }) => {

// ── ПОСЛЕ ─────────────────────────────────────────────────────────
import React from 'react';
import Button from '../ui/Button';
import GlossaryList from './GlossaryList';

const ReadyScreen = ({ s1Count, s2Count, alreadyKnown, questionCount, glossaryCards, onStart }) => {
```

Добавить рендер GlossaryList перед кнопкой «Начать квиз»:

```jsx
// Вставить перед тегом <Button>:
{glossaryCards && glossaryCards.length > 0 && (
  <GlossaryList cards={glossaryCards} />
)}
```

---

### Шаг 4 — ImmersionStudyPage: передать glossaryCards в ReadyScreen (10 мин) [✅ Done]

**Файл:** `src/pages/ImmersionStudyPage.jsx`

Найти блок `currentStage === 'quiz_ready'` и добавить проп:

```jsx
// ── ДО ────────────────────────────────────────────────────────────
<ReadyScreen
  s1Count={chunkData.stage1Cards.length}
  s2Count={chunkData.stage2Cards.length}
  alreadyKnown={chunkData.alreadyKnown}
  questionCount={chunkData.questions.length}
  onStart={handleStartQuiz}
/>

// ── ПОСЛЕ ─────────────────────────────────────────────────────────
<ReadyScreen
  s1Count={chunkData.stage1Cards.length}
  s2Count={chunkData.stage2Cards.length}
  alreadyKnown={chunkData.alreadyKnown}
  questionCount={chunkData.questions.length}
  glossaryCards={chunkData.glossaryCards}
  onStart={handleStartQuiz}
/>
```

---

### Шаг 5 — CSS: стили для GlossaryList (20 мин) [✅ Done]

**Файл:** `src/styles/components.css` (добавить в конец секции immersion)

```css
/* ─── GlossaryList — шпаргалка перед квизом ────────────────────── */

.glossary-list {
  width: 100%;
  margin-top: var(--spacing-5);
  background-color: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
}

.glossary-list__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-3);
}

.glossary-list__items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.glossary-list__item {
  font-size: var(--font-size-xs);
  padding: var(--spacing-1) 0;
  border-bottom: 1px solid var(--color-border);
}

.glossary-list__item:last-child {
  border-bottom: none;
}

.glossary-list__term {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.glossary-list__sep {
  color: var(--color-text-muted);
  margin: 0 var(--spacing-1);
}

.glossary-list__translation {
  color: var(--color-text-secondary);
}

.glossary-list__more-btn {
  display: block;
  width: 100%;
  margin-top: var(--spacing-2);
  background: none;
  border: none;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  cursor: pointer;
  text-align: center;
  padding: var(--spacing-1) 0;
}
```

---

### Шаг 6 — Единая константа CHUNK_SIZE (15 мин) [✅ Done]

**Файл:** `src/services/immersionService.js`

```js
// Было:
var DEFAULT_CHUNK_SIZE = 20;

// Стало (с экспортом):
export var CHUNK_SIZE = 20;
// Заменить все вхождения DEFAULT_CHUNK_SIZE → CHUNK_SIZE в этом файле
```

**Файл:** `src/services/questionsService.js`

```js
// Добавить импорт:
import { CHUNK_SIZE } from './immersionService.js';

// В функции loadChunkQuestions заменить:
// const size = chunkSize || 20;
// на:
const size = chunkSize || CHUNK_SIZE;
```

**Файл:** `src/hooks/useImmersion.js`

```js
// Заменить:
// var CHUNK_SIZE = 20;
// на:
import { CHUNK_SIZE } from '../services/immersionService.js';
```

---

### Шаг 7 — Авто-пропуск пустых стадий (25 мин) [✅ Done]

**Файл:** `src/hooks/useImmersion.js`

Добавить `useEffect` после `useMemo` для `chunkData`:

```js
// Добавить import: useEffect уже импортирован ✓

// После блока useMemo chunkData добавить:
useEffect(function () {
  if (!isStudyMode || !chunkData) return;

  if (currentStage === 's1' && chunkData.stage1Cards.length === 0) {
    markStageComplete(topicId, chunkIndex, 's1');
    setCurrentStage('s2');
  }
}, [isStudyMode, chunkData, currentStage, topicId, chunkIndex]);
// eslint-disable-line react-hooks/exhaustive-deps

useEffect(function () {
  if (!isStudyMode || !chunkData) return;

  if (currentStage === 's2' && chunkData.stage2Cards.length === 0) {
    markStageComplete(topicId, chunkIndex, 's2');
    setCurrentStage('quiz_ready');
  }
}, [isStudyMode, chunkData, currentStage, topicId, chunkIndex]);
// eslint-disable-line react-hooks/exhaustive-deps
```

---

### Шаг 8 — Динамический порог isPassed (20 мин, опционально) [✅ Done]

**Файл:** `src/components/quiz/ResultScreen.jsx`

```jsx
// ── ДО ────────────────────────────────────────────────────────────
const ResultScreen = ({ results, questions = [], total, topicId, onRestart, onClose, onFinish }) => {
  const isPassed = wrongCount <= 4;

// ── ПОСЛЕ ─────────────────────────────────────────────────────────
const ResultScreen = ({ results, questions = [], total, topicId, passingThreshold, onRestart, onClose, onFinish }) => {
  const threshold = passingThreshold != null ? passingThreshold : 4;
  const isPassed = wrongCount <= threshold;
```

**Файл:** `src/pages/QuizPage.jsx` — передать prop при immersion-режиме:

```jsx
// Найти место где рендерится ResultScreen и добавить:
var passingThreshold = (typeof topicId === 'string' && topicId.startsWith('immersion:'))
  ? Math.max(1, Math.round(questions.length * 0.13))
  : 4;

// В JSX:
<ResultScreen
  ...
  passingThreshold={passingThreshold}
/>
```

---

## 9. File-Level Changes — Итоговая таблица

| Файл | Что меняется | Приоритет | Шаг |
|---|---|---|---|
| `immersionService.js` | Экспортировать `CHUNK_SIZE`, добавить `_coverage` и `_byPriorityThenCoverage`, добавить `glossaryCards` в return | **Критично** | 1, 6 |
| `questionsService.js` | Импортировать `CHUNK_SIZE` из immersionService | Важно | 6 |
| `useImmersion.js` | Импортировать `CHUNK_SIZE`, добавить `useEffect` авто-пропуска | Важно | 6, 7 |
| `ReadyScreen.jsx` | Принять `glossaryCards` prop, добавить `<GlossaryList>` | Важно | 3 |
| `ImmersionStudyPage.jsx` | Передать `glossaryCards` в ReadyScreen | Важно | 4 |
| `GlossaryList.jsx` | Создать новый компонент | Важно | 2 |
| `components.css` | CSS для `.glossary-list` | Важно | 5 |
| `ResultScreen.jsx` | Принять `passingThreshold` prop | Опционально | 8 |
| `QuizPage.jsx` | Передать `passingThreshold` при immersion | Опционально | 8 |

**Что НЕ трогать:** `getChunkData` (структура), `loadChunkQuestions`, `useQuiz`, `ImmersionPage`, `highlightUtils`, `FlashCardDeck`, `FlashCard`, `StageNav` — всё работает правильно.

---

## 10. Validation & Testing

### Юнит-тест логики (псевдокод)

```js
// Проверить Sort Fix: strada должна войти в top-12 если её coverage выше
// чем у терминов с тем же priority, которые сейчас вытесняют её

function testSortFix() {
  var chunk0 = getChunkData(1, allEntries, topic1Questions, 0, 20);
  var shownTerms = chunk0.stage1Cards.map(e => e.term);
  // До фикса: ['carreggiata', 'circolazione', 'conducente', ...]
  // После фикса: 'conducente' (1 вопрос) должен уступить место
  //              термину с coverage > 1 внутри того же priority
  console.assert(!shownTerms.includes('conducente') ||
    chunk0.stage1Cards.find(e => e.term === 'conducente')._coverage > 1);
}

// Проверить Glossary: strada должна попасть в glossaryCards
function testGlossary() {
  var chunk0 = getChunkData(1, allEntries, topic1Questions, 0, 20);
  var glossTerms = chunk0.glossaryCards.map(e => e.term);
  console.assert(glossTerms.includes('strada'));
  // Все glossary entries должны иметь coverage >= 2
  chunk0.glossaryCards.forEach(e => {
    console.assert(e._coverage >= 2);
  });
}
```

### Ручные QA сценарии

1. Пройти Блок 1 темы 1 → на ReadyScreen проверить что секция «Ещё встретятся в квизе» показывается (ожидается 5 терминов).
2. Проверить что glossary-термины НЕ включают термины из показанных карточек Stage 1/2.
3. Кнопка «Ещё N →» — появляется если glossary > 4 терминов.
4. Пройти Блок, где весь vocab уже изучен → Stage 1 должна пропускаться автоматически (не показывать empty-state экран).
5. Сравнить список Stage 1 карточек до и после Sort Fix: термины с высоким coverage внутри одного priority должны идти первыми.

### Debug logging (временно)

```js
// В getChunkData после вычисления:
console.log('[getChunkData] chunk', chunkIndex,
  'stage1:', stage1Cards.map(e => e.term + '(' + e._coverage + ')'),
  'glossary:', (glossaryCards || []).map(e => e.term + '(' + e._coverage + ')')
);
```

### Edge cases

- Чанк где все entries уже в vocab → `glossaryCards = []`, `stage1Cards = []`, `stage2Cards = []` → ReadyScreen без глоссария, авто-пропуск Stage 1 и 2.
- Последний блок темы (< 20 вопросов) → glossary работает корректно, порог coverage >= 2 может дать меньше терминов.
- Entry с `related_question_ids = []` → `_coverage = 0`, не попадёт ни в карточки, ни в глоссарий.

---

## 11. Final Recommendation

**Порядок внедрения:**

1. **Шаг 1 (Sort Fix)** — одна функция-компаратор и одно новое поле в `return`. Самое высокое соотношение эффект/сложность. Поднимает покрытие с ~50% до ~66%.

2. **Шаги 2–5 (Glossary)** — новый компонент + минимальные изменения в трёх существующих файлах. Поднимает эффективное покрытие до ~87–94%.

3. **Шаг 6 (CHUNK_SIZE)** — защитная мера от будущих расхождений. Делать вместе с Шагом 1.

4. **Шаг 7 (авто-пропуск)** — UX-улучшение для возвращающегося пользователя. Самостоятельная правка.

5. **Шаг 8 (порог isPassed)** — только если нужна точность оценки для коротких блоков.

**Итоговый эффект двух ключевых изменений (Sort Fix + Glossary):**

| Метрика | До | После |
|---|---|---|
| Покрытие quiz→stage | 50–59% | **87–94%** |
| Вопросов без хотя бы одного изученного термина | 3–5 из 20 | **0–1 из 20** |
| Когнитивная связь «видел в квизе — изучал раньше» | Частичная | **Практически полная** |

Оба изменения хирургически точны: не меняют архитектуру, не влияют на прогресс пользователя, не требуют миграции данных.
