# План улучшений Immersion Mode — Детальный анализ и реализация

## 1. Общий обзор

Четыре задачи, порядок по сложности и влиянию:

1. **Bug Fix (навигационный lock)** — критический баг, блокирует UX. Исправляется в одном файле (`FlashCardDeck.jsx`), причина ясна.
2. **Collapsible FlashCards** — рефакторинг `FlashCard.jsx` + минимальный CSS. Простая, высокая учебная ценность.
3. **Restart Block** — новая функция в `immersionService.js` + `ImmersionStudyPage.jsx`. Средняя сложность.
4. **Smart Highlighting** — самая сложная. Требует нового утилитного модуля и изменений в `QuestionCard.jsx`.

---

## 2. Feature 4 — Bug Fix: Navigation Lock (ИСПРАВИТЬ ПЕРВЫМ)

### Диагноз root cause

Баг живёт в `FlashCardDeck.jsx`. Посмотрим на логику кнопки:

```jsx
// FlashCardDeck.jsx — текущая логика
var isCurrentDone = currentCard ? deck.doneIds.has(currentCard.id) : false;

{isCurrentDone ? (
  <button disabled={true}>✓ Запомнено</button>  // ← disabled, нет goNext!
) : (
  <button onClick={deck.markDone}>Понятно ✓</button>
)}
```

**Сценарий бага:**
1. Карточка 2 (index=1) — нажимаем "Понятно ✓" → `doneIds = {id1_карточки_2}`, `markDone` вызывает `goNext` → `cardIndex = 2`
2. Нажимаем "← Назад" → `cardIndex = 1` (карточка 2 снова активна)
3. `isCurrentDone = doneIds.has(card2.id) = true` → рендерится `disabled` кнопка "✓ Запомнено"
4. **Пользователь не может нажать "Вперёд"** — нет кнопки goNext, а "Назад" и "Понятно" оба ведут в сторону уже отвеченных карточек или заблокированы

**Фундаментальная ошибка:** дизайн предполагает два взаимоисключающих состояния кнопки, но не учитывает возврат назад. "Запомнено" (disabled) нельзя трансформировать в способ двигаться вперёд.

### Правильная модель состояний

Нужно разделить три разных понятия:

| Понятие | Когда | Хранится |
|---|---|---|
| `viewed` | карточка была показана | не нужно хранить |
| `marked` | пользователь нажал "Понятно" | `doneIds` в хуке |
| `isDone` | все карточки marked | `doneIds.size >= total` |

**Ключевой принцип:** кнопка навигации "вперёд" (`goNext`) должна быть **всегда доступна** если `cardIndex < total - 1`, независимо от того, отмечена ли карточка.

### Исправление

**Новая логика кнопок — заменить блок `flash-deck__nav` в `FlashCardDeck.jsx`:**

```jsx
// БЫЛО:
{isCurrentDone ? (
  <button disabled={true}>✓ Запомнено</button>
) : (
  <button onClick={deck.markDone}>Понятно ✓</button>
)}

// СТАЛО:
<div className="flash-deck__nav">
  {/* Назад — disabled только на первой */}
  <button
    className="btn btn-secondary flash-deck__nav-btn flash-deck__nav-btn--back"
    onClick={deck.goPrev}
    disabled={deck.cardIndex === 0}
  >
    ← Назад
  </button>

  {/* Центральная группа: "Понятно" или "Запомнено" + отдельная стрелка вперёд */}
  <div className="flash-deck__nav-right">
    {isCurrentDone ? (
      <span className="flash-deck__marked-label">✓ Запомнено</span>
    ) : (
      <button
        className="btn btn-primary flash-deck__nav-btn flash-deck__nav-btn--mark"
        onClick={deck.markDone}
      >
        Понятно ✓
      </button>
    )}

    {/* Стрелка вперёд — ВСЕГДА если не последняя карточка */}
    {!deck.isLast && (
      <button
        className="btn btn-secondary flash-deck__nav-btn flash-deck__nav-btn--next"
        onClick={deck.goNext}
      >
        → Далее
      </button>
    )}
  </div>
</div>
```

**Почему это работает:**
- На отмеченной карточке при возврате назад: показывается `✓ Запомнено` (статус) + кнопка `→ Далее` (навигация). Пользователь видит, что карточка отмечена, и может идти вперёд.
- `markDone` в хуке уже вызывает `goNext` автоматически при первом нажатии — значит при первом прохождении кнопка `→ Далее` вообще не нужна (появляется только при возврате).
- Не нужно трогать `useFlashCards.js` — баг только в рендере.

**Дополнительные правила для крайних случаев:**
- Последняя карточка, уже отмечена: показывается `✓ Запомнено` без `→ Далее`. Если `isDone` — рендерится `DoneScreen`.
- Частично завершённая колода (некоторые карточки не отмечены, пользователь вернулся): каждая карточка независима, состояние отмечена/не отмечена выводится из `doneIds`.

**CSS для нового layout:**

```css
/* components.css — добавить в блок flash-deck */
.flash-deck__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
}

.flash-deck__nav-right {
  display: flex;
  align-items: center;
}

.flash-deck__nav-right .flash-deck__marked-label {
  color: var(--color-correct);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  margin-right: var(--spacing-3);  /* вместо gap — iOS 12 */
}

.flash-deck__nav-btn--next {
  margin-left: var(--spacing-3);  /* вместо gap — iOS 12 */
}
```

---

## 3. Feature 3 — Collapsible FlashCards

### Цель

Карточка по умолчанию показывает только слово + перевод. Контент (определение, подсказка, пример) скрыт — пользователь разворачивает сам.

### Педагогическое обоснование

Сначала пользователь видит слово → пытается вспомнить/угадать значение → раскрывает объяснение. Это active recall, а не пассивное чтение.

### Изменения в компонентах

**`FlashCard.jsx`** получает новый prop `isExpanded` и callback `onToggle`. Компонент остаётся `React.memo` — при навигации между карточками состояние expanded сбрасывается (управляется снаружи).

```jsx
// FlashCard.jsx — добавляем props
var FlashCard = React.memo(function FlashCard(props) {
  var entry      = props.entry;
  var index      = props.index;
  var total      = props.total;
  var isDone     = props.isDone;
  var isExpanded = props.isExpanded;   // ← новый
  var onToggle   = props.onToggle;     // ← новый

  // ... badge, example — без изменений

  return (
    <div className={'flash-card' + (isDone ? ' flash-card--done' : '')}>

      {/* Заголовок: badge + счётчик — БЕЗ ИЗМЕНЕНИЙ */}
      <div className="flash-card__header">
        <span className={'flash-card__badge ' + badge.cls}>{badge.label}</span>
        <span className="flash-card__counter">{index + 1} / {total}</span>
      </div>

      {/* Термин — ВСЕГДА виден */}
      <div className="flash-card__term-block">
        <p className="flash-card__term">{entry.term}</p>
        <p className="flash-card__term-ru">{entry.term_ru}</p>
      </div>

      {/* Кнопка expand/collapse */}
      <button
        className={'flash-card__expand-btn' + (isExpanded ? ' flash-card__expand-btn--open' : '')}
        onClick={onToggle}
      >
        {isExpanded ? '▲ Скрыть' : '▼ Показать объяснение'}
      </button>

      {/* Раскрывающийся блок — iOS 12 safe: max-height transition */}
      <div className={'flash-card__collapsible' + (isExpanded ? ' flash-card__collapsible--open' : '')}>
        <hr className="flash-card__divider" />

        {entry.definition && entry.definition.ru && (
          <div className="flash-card__section flash-card__section--definition">
            <p className="flash-card__section-label">Что это:</p>
            <p className="flash-card__section-text">{entry.definition.ru}</p>
          </div>
        )}

        {entry.quiz_hint && entry.quiz_hint.ru && (
          <div className="flash-card__section flash-card__section--hint">
            <p className="flash-card__section-label">В квизе:</p>
            <p className="flash-card__section-text">{entry.quiz_hint.ru}</p>
          </div>
        )}

        {example && (
          <div className="flash-card__example">
            <p className="flash-card__example-it">«{example.it}»</p>
            {example.ru && <p className="flash-card__example-ru">→ {example.ru}</p>}
            <p className={'flash-card__example-answer flash-card__example-answer--' + (example.answer ? 'vero' : 'falso')}>
              {example.answer ? '✅ VERO' : '❌ FALSO'}
            </p>
          </div>
        )}

        {isDone && <p className="flash-card__done-mark">✓ Запомнено</p>}
      </div>

    </div>
  );
});
```

**`FlashCardDeck.jsx`** — управляет состоянием `isExpanded`:

```jsx
// В FlashCardDeck добавить локальный state
var [isExpanded, setIsExpanded] = useState(false);

// При смене карточки (через markDone / goNext / goPrev) — сбрасывать expanded
// Используем useEffect по cardIndex
useEffect(function() {
  setIsExpanded(false);
}, [deck.cardIndex]);

// Передать в FlashCard:
<FlashCard
  entry={currentCard}
  index={deck.cardIndex}
  total={deck.total}
  isDone={isCurrentDone}
  isExpanded={isExpanded}
  onToggle={function() { setIsExpanded(function(prev) { return !prev; }); }}
/>
```

**UX правила:**
- Expanded сбрасывается при переходе к другой карточке (через `useEffect` по `cardIndex`) — каждая карточка начинает свёрнутой.
- Состояние expanded **не персистируется** между сессиями — не нужно в localStorage.
- `onToggle` не зависит от `isExpanded` через замыкание — используем functional update `prev => !prev`.

**CSS (iOS 12 safe — max-height вместо height: auto):**

```css
/* components.css */
.flash-card__collapsible {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height var(--transition-slow), opacity var(--transition-base);
}

.flash-card__collapsible--open {
  max-height: 600px;   /* достаточно для самого длинного контента */
  opacity: 1;
}

.flash-card__expand-btn {
  width: 100%;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--spacing-2) var(--spacing-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  margin-top: var(--spacing-3);
}

.flash-card__expand-btn--open {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
```

**Важно:** `React.memo` на `FlashCard` продолжает работать — props `isExpanded` и `onToggle` изменятся только при реальной смене значений. `onToggle` стабилен если завернуть в `useCallback` в `FlashCardDeck`.

---

## 4. Feature 2 — Restart Block

### Что сбрасывается / что нет

| | Сбрасывается | Не сбрасывается |
|---|---|---|
| Stage progress (s1/s2/quiz в localStorage) | ✅ | — |
| Flashcard state в хуке (doneIds, cardIndex) | ✅ (ре-монтирование) | — |
| isExpanded | ✅ (ре-монтирование) | — |
| Global vocabulary (qp_immersion_vocab) | — | ✅ (принципиально) |
| Quiz результаты других чанков | — | ✅ |

### Новая функция в `immersionService.js`

```javascript
/**
 * Сбросить прогресс одного чанка (Stage 1, Stage 2, Quiz → все 'pending').
 * Global vocab НЕ затрагивается.
 * @param {string|number} topicId
 * @param {number} chunkIndex
 */
export function resetChunkProgress(topicId, chunkIndex) {
  var all = _getAllProgress();
  var topicKey = String(topicId);
  var chunkKey = String(chunkIndex);

  if (all[topicKey]) {
    delete all[topicKey][chunkKey];  // удаляем запись → getChunkProgress вернёт все 'pending'
  }

  _saveProgress(all);
}
```

Это минимальное решение — удаление ключа даёт тот же эффект что и `{ s1: 'pending', s2: 'pending', quiz: 'pending' }`, потому что `getChunkProgress` уже обрабатывает отсутствие ключа.

### UI в `ImmersionStudyPage.jsx`

**Расположение кнопки:** в `AppHeader` справа (уже зарезервировано в SKILL.md). Не в контентной области — чтобы не мешать при изучении.

**Логика:**

```jsx
// ImmersionStudyPage.jsx — добавить:
var [showRestartModal, setShowRestartModal] = useState(false);

function handleRestart() {
  // 1. Сбросить прогресс в localStorage
  resetChunkProgress(topicId, chunkIndex);
  // 2. Принудительно ре-монтировать FlashCardDeck через key
  // Лучший способ — изменить ключ компонента, React сам сбросит state
  setDeckKey(function(prev) { return prev + 1; });
  // 3. Сбросить currentStage в useImmersion (через метод)
  resetStage();
  setShowRestartModal(false);
}
```

**Кнопка "Начать заново"** — показывать только когда есть какой-то прогресс (хотя бы одна стадия `done`). Иначе кнопка бессмысленна.

**ConfirmationModal** — переиспользуем уже существующий компонент:

```jsx
<ConfirmationModal
  isOpen={showRestartModal}
  title="Начать заново?"
  message="Прогресс блока сбросится. Изученные слова останутся в словаре."
  confirmText="Сбросить"
  cancelText="Отмена"
  onConfirm={handleRestart}
  onCancel={function() { setShowRestartModal(false); }}
/>
```

**Кнопка рестарта в AppHeader:**

```jsx
// ImmersionStudyPage.jsx — в JSX AppHeader (через prop rightAction или аналог)
// Смотрим AppHeader — если поддерживает rightContent, используем его
// Если нет — добавляем inline кнопку рядом с AppHeader
```

Нужно проверить, поддерживает ли `AppHeader` правый слот. Если нет — минимальное изменение: добавить prop `rightContent`.

### Нужно добавить в `useImmersion.js`

```javascript
// Новый экспорт из хука — сброс currentStage к начальному значению
resetStage: function() {
  setCurrentStage(_computeInitialStage(topicId, chunkIndex));
}
```

Где `_computeInitialStage` — та же логика что уже используется при монтировании для определения с какой стадии начать.

**Edge cases:**
- Рестарт во время Stage 1: `doneIds` сбрасывается через `key` prop, `currentStage → 's1'`.
- Рестарт после полного завершения: то же самое — все три стадии становятся `pending`, пользователь заново проходит все три.
- Рестарт в квизе: пользователь в момент рестарта находится в `/quiz/immersion:...`. Кнопки рестарта там нет — он вернётся на `ImmersionStudyPage` после завершения квиза, и там уже сможет нажать "Начать заново".

---

## 5. Feature 1 — Smart Highlighting (Умная подсветка)

### Архитектурный выбор

**Что НЕ делаем:** NLP, морфологический анализ на лету, regexp по всем 171 entry при каждом рендере вопроса.

**Что делаем:** нормализованный поиск по `entry.term` + опциональные `morphology` варианты из entries.json. Предвычисляем lookup при загрузке — `O(1)` при рендере вопроса.

### Алгоритм матчинга

```
1. Загружены entries → строим lookup Map
2. Пользователь изучал entry X → она в learnedVocab
3. Для каждого вопроса: tokenize text → ищем токены в lookup
4. Находим совпадения → оборачиваем в <mark> с tooltip данными
```

**Lookup структура** (строится один раз в `dictionaryService.js` или новом `highlightService.js`):

```javascript
// Map: нормализованное_слово → Entry
// Пример: { "segnale": entry_segnale, "sorpasso": entry_sorpasso, ... }
// + для phrase: { "in prossimita di": entry_phrase, ... }
```

**Нормализация** (убирает диакритику, lowercase):

```javascript
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // убираем диакритику
    .trim();
}
```

**Алгоритм токенизации и матчинга:**

Сложность в том, что некоторые entries — фразы (`in prossimità di`, 3 слова). Надо искать как одиночные слова, так и n-граммы.

```javascript
/**
 * Найти все совпадения изученных терминов в тексте вопроса.
 * Возвращает массив сегментов: { text, entry|null }
 * 
 * Алгоритм:
 * 1. Сортируем ключи lookup по убыванию длины (фразы раньше слов)
 * 2. Проходим текст слева направо, жадно матчим самое длинное совпадение
 * 3. Возвращаем сегменты для React рендеринга
 */
function tokenizeWithHighlights(text, learnedLookup) {
  if (!text || learnedLookup.size === 0) {
    return [{ text: text, entry: null }];
  }

  var segments = [];
  var normalText = normalize(text);
  var pos = 0;

  while (pos < text.length) {
    var matched = false;

    // Пробуем все ключи от длинных к коротким
    for (var i = 0; i < sortedKeys.length; i++) {
      var key = sortedKeys[i];  // нормализованный ключ
      var keyLen = key.length;

      // Проверяем совпадение в нормализованном тексте
      if (normalText.substr(pos, keyLen) === key) {
        // Проверяем что это целое слово (граница слова)
        var before = pos > 0 ? normalText[pos - 1] : ' ';
        var after = pos + keyLen < normalText.length ? normalText[pos + keyLen] : ' ';
        var isBoundary = /\W/.test(before) && /\W/.test(after);

        if (isBoundary) {
          // Сохраняем оригинальный текст (с диакритикой)
          segments.push({
            text: text.substr(pos, keyLen),
            entry: learnedLookup.get(key)
          });
          pos += keyLen;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Добавляем символ к предыдущему plain сегменту или создаём новый
      var last = segments[segments.length - 1];
      if (last && !last.entry) {
        last.text += text[pos];
      } else {
        segments.push({ text: text[pos], entry: null });
      }
      pos++;
    }
  }

  return segments;
}
```

**Важный нюанс:** нормализованный текст (`normalText`) используется только для поиска позиций. Оригинальный `text` используется для отображения (с диакритикой, заглавными буквами).

### Новый файл: `src/utils/highlightUtils.js`

```javascript
// src/utils/highlightUtils.js

/**
 * Утилиты для подсветки изученных терминов в тексте вопроса.
 * Используется QuestionCard в режиме Immersion.
 */

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Построить lookup Map для быстрого поиска.
 * Вызывается один раз при загрузке entries + vocab.
 *
 * @param {Array} entries — все записи из entries.json
 * @param {Object} learnedVocab — { [entryId]: true }
 * @returns {Map<string, Object>} — нормализованный_термин → entry
 */
export function buildLearnedLookup(entries, learnedVocab) {
  var lookup = new Map();
  if (!entries || !learnedVocab) return lookup;

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!learnedVocab[entry.id]) continue;  // только изученные

    // Основной термин
    lookup.set(normalize(entry.term), entry);

    // Морфологические варианты (если есть поле morphology)
    if (entry.morphology && Array.isArray(entry.morphology)) {
      for (var j = 0; j < entry.morphology.length; j++) {
        lookup.set(normalize(entry.morphology[j]), entry);
      }
    }
  }

  return lookup;
}

/**
 * Разбить текст на сегменты: обычный текст и совпадения с терминами.
 *
 * @param {string} text — оригинальный текст вопроса
 * @param {Map} lookup — результат buildLearnedLookup
 * @returns {Array<{ text: string, entry: Object|null }>}
 */
export function segmentText(text, lookup) {
  if (!text || lookup.size === 0) {
    return [{ text: text || '', entry: null }];
  }

  // Сортируем ключи по убыванию длины: фразы раньше одиночных слов
  var sortedKeys = Array.from(lookup.keys()).sort(function(a, b) {
    return b.length - a.length;
  });

  var normText = normalize(text);
  var segments = [];
  var pos = 0;

  while (pos < text.length) {
    var matched = false;

    for (var i = 0; i < sortedKeys.length; i++) {
      var key = sortedKeys[i];

      // Быстрая проверка перед дорогим substr
      if (normText[pos] !== key[0]) continue;

      var slice = normText.substr(pos, key.length);
      if (slice !== key) continue;

      // Проверка границы слова
      var charBefore = pos > 0 ? normText[pos - 1] : ' ';
      var charAfter = pos + key.length < normText.length
        ? normText[pos + key.length] : ' ';

      if (!/[a-z\u00e0-\u00fc]/.test(charBefore) && !/[a-z\u00e0-\u00fc]/.test(charAfter)) {
        segments.push({
          text: text.substr(pos, key.length),
          entry: lookup.get(key)
        });
        pos += key.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Склеиваем с предыдущим plain сегментом
      if (segments.length > 0 && segments[segments.length - 1].entry === null) {
        segments[segments.length - 1].text += text[pos];
      } else {
        segments.push({ text: text[pos], entry: null });
      }
      pos++;
    }
  }

  return segments;
}
```

### Новый компонент: `src/components/quiz/HighlightedText.jsx`

```jsx
// src/components/quiz/HighlightedText.jsx

import React, { useState } from 'react';

/**
 * Рендерит текст вопроса с подсветкой изученных терминов.
 * Клик по подсвеченному слову → inline tooltip с определением.
 */
var HighlightedText = React.memo(function HighlightedText(props) {
  var segments = props.segments;  // из segmentText()
  var [activeId, setActiveId] = useState(null);

  if (!segments || segments.length === 0) return null;

  return (
    <span>
      {segments.map(function(seg, idx) {
        if (!seg.entry) {
          return <span key={idx}>{seg.text}</span>;
        }

        var entry = seg.entry;
        var isActive = activeId === entry.id + '_' + idx;

        return (
          <span key={idx} className="hl-word-wrapper">
            <mark
              className={'hl-word' + (isActive ? ' hl-word--active' : '')}
              onClick={function(e) {
                e.stopPropagation();
                setActiveId(isActive ? null : entry.id + '_' + idx);
              }}
            >
              {seg.text}
              <span className="hl-word__icon">💡</span>
            </mark>

            {isActive && (
              <span className="hl-tooltip" role="tooltip">
                <strong className="hl-tooltip__term">{entry.term}</strong>
                <span className="hl-tooltip__sep"> — </span>
                <span className="hl-tooltip__def">
                  {entry.definition ? entry.definition.ru : entry.term_ru}
                </span>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
});

HighlightedText.displayName = 'HighlightedText';
export default HighlightedText;
```

**Почему click, не hover:** мобильный приоритет (iPad). Hover на тач-устройствах ненадёжен.

**Dismiss logic:**
- Повторный клик на тот же элемент → закрывает tooltip (`setActiveId(null)`)
- Клик на другой элемент → открывает новый tooltip (старый закрывается — `activeId` один)
- Клик вне элементов → не нужен обработчик на document (достаточно что у каждого `mark` своя логика toggle)

**Tooltip positioning (CSS):** `position: absolute` внутри `relative` враппера. Позиция снизу по умолчанию, достаточно для большинства случаев. Для iPad mini 2 не нужен JS-repositioning.

**CSS:**

```css
/* components.css */
.hl-word-wrapper {
  position: relative;
  display: inline;
}

.hl-word {
  background: #fef3c7;    /* светло-жёлтый — ненавязчиво */
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  border-bottom: 1px dashed #92400e;
  font-style: normal;   /* reset mark default */
}

.hl-word--active {
  background: #fde68a;
}

.hl-word__icon {
  font-size: 10px;
  margin-left: 2px;
  vertical-align: super;
}

.hl-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  max-width: 280px;
  background: var(--color-header-bg);
  color: var(--color-header-text);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  line-height: var(--line-height);
  z-index: 100;
  box-shadow: var(--shadow-md);
  /* Стрелочка вниз */
  display: inline-block;
}

.hl-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 12px;
  border: 5px solid transparent;
  border-top-color: var(--color-header-bg);
}

.hl-tooltip__term {
  color: #fbbf24;   /* жёлтый акцент */
}
```

### Интеграция в QuestionCard

**Проблема:** `QuestionCard` ничего не знает о Immersion Mode. Нельзя загружать entries прямо в него.

**Решение:** `lookup` строится в `QuizPage` (или `useQuiz`) и передаётся вниз только если режим `immersion:*`. Это не нарушает архитектуру — `QuizPage` уже знает `topicId`.

```jsx
// QuizPage.jsx — добавить:
var isImmersionMode = typeof topicId === 'string' && topicId.startsWith('immersion:');

// Загрузить lookup если immersion (через новый хук или эффект)
var [learnedLookup, setLearnedLookup] = useState(null);

useEffect(function() {
  if (!isImmersionMode) return;

  // Загружаем entries + vocab, строим lookup
  loadDictionaryEntries().then(function(entries) {
    var vocab = getLearnedVocab();
    setLearnedLookup(buildLearnedLookup(entries, vocab));
  });
}, [isImmersionMode]);

// Передать в QuestionCard:
<QuestionCard
  ...
  learnedLookup={learnedLookup}  // null в обычном квизе
/>
```

**В `QuestionCard.jsx` — минимальное изменение:**

```jsx
// QuestionCard.jsx — в рендере текста вопроса
import HighlightedText from './HighlightedText';
import { segmentText } from '../../utils/highlightUtils';

// В JSX — вместо:
<p className="question-text__it">{question.id}. {question.text}</p>

// Стало:
<p className="question-text__it">
  {question.id}.{' '}
  {props.learnedLookup && props.learnedLookup.size > 0
    ? <HighlightedText segments={segmentText(question.text, props.learnedLookup)} />
    : question.text
  }
</p>
```

**Производительность:** `segmentText` вызывается при каждом рендере вопроса. `QuestionCard` обёрнут в `React.memo` (проверить). Если нет — добавить. `segmentText` при пустом `lookup` (`size === 0`) возвращает мгновенно.

### Поле `morphology` в entries.json

Это опциональное поле для покрытия склонений. Пример:

```json
{
  "id": "segnale",
  "term": "segnale",
  "morphology": ["segnali", "segnaletica"],
  ...
}
```

В MVP поле отсутствует у большинства entries — алгоритм работает без него (только exact match). Добавлять `morphology` можно постепенно для самых частых терминов.

**Edge cases подсветки:**
- Несколько совпадений в одном предложении → каждое независимо, у каждого свой `key` (`entryId + '_' + idx`)
- Наложение фраз → жадный алгоритм с приоритетом более длинных ключей решает это
- Нет совпадений → `segmentText` возвращает `[{ text: fullText, entry: null }]` → `HighlightedText` рендерит plain span → идентично текущему поведению
- Очень длинный текст (100+ слов) → алгоритм O(n × m) где n=длина текста, m=количество изученных терминов. При 50 изученных терминах и среднем тексте 20 слов → ~1000 операций → нет проблем

---

## 6. Integration Plan

### Порядок файлов по каждой фиче

**Bug Fix (Feature 4):**
```
1. FlashCardDeck.jsx — изменить layout кнопок
2. components.css — добавить .flash-deck__nav-right, .flash-deck__nav-btn--next
```

**Collapsible (Feature 3):**
```
1. FlashCard.jsx — добавить props isExpanded/onToggle, скрыть контент
2. FlashCardDeck.jsx — добавить useState(isExpanded) + useEffect сброс
3. components.css — .flash-card__collapsible, .flash-card__expand-btn
```

**Restart (Feature 2):**
```
1. immersionService.js — добавить resetChunkProgress()
2. AppHeader.jsx — проверить/добавить prop rightContent
3. ImmersionStudyPage.jsx — кнопка + ConfirmationModal + логика
4. useImmersion.js — добавить resetStage()
```

**Highlighting (Feature 1):**
```
1. src/utils/highlightUtils.js — НОВЫЙ файл
2. src/components/quiz/HighlightedText.jsx — НОВЫЙ компонент
3. QuizPage.jsx — загрузка lookup в immersion-режиме
4. QuestionCard.jsx — передача learnedLookup + условный рендер HighlightedText
5. components.css — .hl-word, .hl-tooltip, .hl-word-wrapper
```

---

## 7. Риски и Edge Cases

| Риск | Вероятность | Митигация |
|---|---|---|
| `normalize('NFD')` падает на Safari 12 | Низкая | Протестировано в SKILL_DICTIONARY.md, уже используется в dictionaryService |
| Tooltip уходит за край экрана на iPhone | Средняя | `max-width: 280px` + `left: 0` покрывает большинство случаев; MVP без JS-repositioning |
| `morphology` варианты конфликтуют между записями | Низкая | Валидация при добавлении записей |
| `useEffect` по `cardIndex` в FlashCardDeck запускается при первом рендере | Есть | Добавить `skipFirstRender` ref или проверить что `cardIndex=0` при маунте — сброс expand на 0 безвреден |
| `AppHeader` не поддерживает `rightContent` prop | Нужно проверить | Прочитать `AppHeader.jsx` перед реализацией |
| `learnedLookup` пересчитывается при каждом рендере QuizPage | Средняя | `useState` + `useEffect` с `[]` зависимостями — вычисляется один раз |
| Restart сбрасывает стадию, но entries не перефильтровываются | Есть | После `resetChunkProgress` перезагрузка `chunkData` через key или принудительный re-fetch в `useImmersion` |

---

## 8. Приоритет реализации

```
1. [30 мин]  Bug Fix (Feature 4)
             → FlashCardDeck.jsx + CSS
             → Verify: возврат назад на отмеченную карточку не блокирует движение вперёд

2. [45 мин]  Collapsible FlashCards (Feature 3)
             → FlashCard.jsx + FlashCardDeck.jsx + CSS
             → Verify: карточка открыта по умолчанию свёрнутой, раскрывается по клику,
               сбрасывается при переходе к следующей карточке

3. [60 мин]  Restart Block (Feature 2)
             → immersionService.js (1 функция)
             → AppHeader.jsx (если нужен rightContent)
             → ImmersionStudyPage.jsx + useImmersion.js
             → Verify: после рестарта прогресс в localStorage сброшен,
               FlashCardDeck начинает с начала

4. [120 мин] Smart Highlighting (Feature 1)
             → highlightUtils.js (утилиты)
             → HighlightedText.jsx (компонент)
             → QuizPage.jsx (загрузка lookup)
             → QuestionCard.jsx (интеграция)
             → CSS
             → Verify: термин "segnale" подсвечен в вопросе,
               клик показывает tooltip с определением,
               в обычном квизе подсветки нет
```
