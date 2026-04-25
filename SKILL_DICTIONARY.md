---
name: dictionary-phase3
description: >
  Контекст и план разработки DictionaryPage (Phase 3) для проекта Quiz Patente.
  Используй этот skill при любой задаче, связанной со словарём: написании
  dictionaryService, useDictionary хука, компонентов dictionary/, страницы
  DictionaryPage, скрипта анализа данных, заполнении entries.json.
  Всегда читай этот файл перед началом работы над любой задачей Phase 3.
parent_skills:
  - [SKILL.md](file:///Users/greg/MyProjects/app-quiz-patente/SKILL.md) ← основной контекст проекта
---

# DictionaryPage — Phase 3: Context-Aware Learning Dictionary

---

## 1. Суть и переосмысление задачи

### ❌ Неправильная постановка (чего НЕ строим)

"Словарь терминов ПДД" в виде списка слов с переводами — провальный подход.
Причина: пользователь уже видит переводы в каждом вопросе (`text_ru`).
Ещё один список переводов не добавляет учебной ценности.

### ✅ Правильная постановка

**Реальная проблема пользователя:**
> "Я читаю вопрос, понимаю все слова по отдельности, но не понимаю почему
> ответ именно такой. Я не могу предсказать правильный ответ, потому что
> не понимаю логику итальянских ПДД через язык."

Это проблема **семантического разрыва**, а не лексического.

**Примеры что пользователь не знает:**
- `sempre` ("всегда") → почти гарантирует ответ FALSO
- `è vietato` vs `non è consentito` → синонимы в контексте ПДД
- `in prossimità di` → кардинально меняет зону действия правила
- `obbligo` vs `facoltà` → противоположные правовые концепции

### ✅ Определение системы

**DictionaryPage = Language Decoder для квизов ПДД**

Три слоя объяснений:
1. **Терминология ПДД** — юридические понятия (precedenza, carreggiata, obbligo)
2. **Языковые паттерны** — конструкции, меняющие смысл (in prossimità di, fuori dai centri abitati)
3. **Логические триггеры** — слова, предсказывающие ответ (sempre → скорее FALSO)

### Failure modes простого словаря (не повторять)

| Подход | Почему не работает |
|---|---|
| Список слов с переводом | Дублирует text_ru, нет учебной ценности |
| Алфавитный глоссарий | Нет связи с вопросами, нет контекста |
| Flashcards "слово → перевод" | Не объясняет как слово меняет смысл вопроса |
| Только терминология ПДД | Игнорирует языковые ловушки (sempre/mai/solo) |

---

## 2. Модель данных

### Центральная сущность: Entry

```json
{
  "id": "sempre",
  "term": "sempre",
  "term_ru": "всегда",
  "type": "logic_trigger",
  "priority": 1,
  "topics": [1, 2, 5, 14],

  "definition": {
    "ru": "Указывает на абсолютное утверждение без исключений. В ПДД Италии практически не существует правил без исключений."
  },

  "quiz_hint": {
    "ru": "Вопросы с 'sempre' чаще оказываются FALSO — в ПДД почти всегда есть исключения из абсолютных правил. Будь осторожен с категоричными утверждениями.",
    "pattern": "false_bias"
  },

  "examples": [
    {
      "it": "È sempre vietato superare i veicoli in corrispondenza di un incrocio",
      "ru": "Обгон транспортных средств на перекрёстке всегда запрещён",
      "answer": false,
      "comment_ru": "FALSO — обгон разрешён в определённых условиях"
    }
  ],

  "related_question_ids": [145, 892, 1203, 3401],
  "related_entries": ["mai", "solo", "tranne", "eccetto"],

  "antonyms_it": ["mai", "talvolta"]
}
```

### Типы записей (поле `type`)

| Тип | Что включает | Примеры |
|---|---|---|
| `term` | Юридические термины ПДД | precedenza, carreggiata, sosta, fermata |
| `phrase` | Устойчивые фразы и конструкции | in prossimità di, fuori dai centri abitati |
| `logic_trigger` | Слова-предикторы ответа | sempre, mai, solo, tranne |
| `concept` | Правовые концепции (парные) | obbligo vs facoltà, divieto vs limitazione |

### Поле `pattern` (только для logic_triggers)

| Значение | Смысл |
|---|---|
| `false_bias` | Слово склоняет к FALSO (sempre, solo, mai) |
| `true_bias` | Слово склоняет к VERO (generalmente, di norma) |
| `neutral` | Нейтральное, важно для понимания, не для предсказания |
| `context_dependent` | Зависит от остального предложения |

### Поле `priority`

| Значение | Когда учить |
|---|---|
| `1` | Первым: встречается в 10+ вопросах, есть чёткий quiz_hint |
| `2` | Вторым: важный термин, встречается в 5-10 вопросах |
| `3` | Для глубокого понимания: редкое, специфичное |

### Связи между сущностями

```
Entry ──── many-to-many ──── Question
  │                             │
  └── related_entries ─ Entry  topic_id
  │
  └── type → определяет формат карточки
  └── priority → определяет порядок изучения
```

---

## 3. Файловая структура данных

```
src/data/
  dictionary/
    entries.json           ← массив всех Entry (72 записи в MVP, до 300 в финале)
    index_by_topic.json    ← { "1": ["sempre", "carreggiata", ...] }  (Phase 3 v2)
    index_by_type.json     ← { "logic_trigger": ["sempre", "mai", ...] } (Phase 3 v2)

> [!WARNING]
> При добавлении новых терминов, генерации батчей или работе со скриптами линковки строго переключиться на [DICTIONARY_SCALING_SKILL.md](file:///Users/greg/MyProjects/app-quiz-patente/DICTIONARY_SCALING_SKILL.md).
```

**MVP: только entries.json.** Индексы добавляются в v2 когда нужна фильтрация по теме.
Фильтрация в MVP работает в памяти (по загруженному массиву).

---

## 4. Приоритетные кандидаты для entries.json (MVP — priority:1)

### Logic Triggers (изучать первыми — дают навык предсказания ответа)

| Термин | Перевод | Pattern |
|---|---|---|
| sempre | всегда | false_bias |
| mai | никогда | false_bias |
| solo | только | false_bias |
| tranne | кроме | context_dependent |
| eccetto | за исключением | context_dependent |
| almeno | по крайней мере / не менее | neutral |
| anche | также / даже | context_dependent |
| purché | при условии что | context_dependent |
| salvo | кроме / за исключением | context_dependent |
| comunque | в любом случае / тем не менее | context_dependent |

### Ключевые термины ПДД (высокая частота во всех темах)

| Термин | Перевод |
|---|---|
| carreggiata | проезжая часть |
| corsia | полоса движения |
| sosta | стоянка |
| fermata | остановка |
| precedenza | приоритет / право проезда |
| incrocio | перекрёсток |
| sorpasso | обгон |
| attraversamento | пешеходный переход |
| spartitraffico | разделительная полоса |
| banchina | обочина |

### Ключевые фразы

| Фраза | Перевод |
|---|---|
| in prossimità di | вблизи / в непосредственной близости от |
| fuori dai centri abitati | за пределами населённых пунктов |
| nei centri abitati | в населённых пунктах |
| è vietato | запрещено |
| è consentito | разрешено |
| è obbligatorio | обязательно |

### Правовые концепции (парные противопоставления)

| Пара | Смысл |
|---|---|
| obbligo / facoltà | обязанность / право (по выбору) |
| divieto / limitazione | запрет / ограничение |
| segnale / segnaletica | знак / разметка |

---

## 5. Pipeline создания entries.json

### Шаг 1 — Анализ частотности (скрипт)

**Файл:** `scripts/analyze-dictionary.js`

Что делает:
- Загружает все 25 `topic_N.json`
- Токенизирует итальянский текст вопросов (разбиение по пробелам, очистка пунктуации)
- Считает частоту каждого слова и биграммы
- Для каждого кандидата выводит: частота + answer-bias (% VERO vs FALSO)
- Выявляет logic_triggers с математической точностью

**Ключевой вывод скрипта:**
```
sempre:       847 вхождений | VERO: 23% | FALSO: 77% → false_bias ✓
generalmente: 112 вхождений | VERO: 61% | FALSO: 39% → true_bias
carreggiata:  534 вхождения | VERO: 52% | FALSO: 48% → neutral (term)
```

### Шаг 2 — Ручная категоризация и написание определений

После скрипта — список ~200 кандидатов с данными. Затем вручную:
- Присвоить `type` (term/phrase/logic_trigger/concept)
- Написать `definition.ru` (2-3 предложения, НЕ перевод, а объяснение)
- Написать `quiz_hint.ru` (практический совет для квиза)
- Выбрать 1-2 примера из реальных вопросов
- Проставить `priority` (1/2/3)

**Правило качества:** лучше 10 идеальных записей, чем 150 посредственных.

### Шаг 3 — Линковка к вопросам (скрипт)

Скрипт автоматически проставляет `related_question_ids` — ищет точное
вхождение термина в тексте вопросов. Ручная проверка выборочно.

### Шаг 4 — Построение индексов (Phase 3 v2)

Скрипт генерирует `index_by_topic.json` и `index_by_type.json`
из финального `entries.json`. Добавляется после MVP.

---

## 6. Сервисный слой

### services/dictionaryService.js (НОВЫЙ)

```javascript
// src/services/dictionaryService.js
// Сейчас: JSON файлы. Phase 2 Backend: заменить на fetch('/api/dictionary/...')

const STORAGE_KEY = 'qp_dictionary';

// --- Загрузка данных ---
// Кэш в памяти — entries.json грузится один раз за сессию
let _entriesCache = null;

export async function loadDictionaryEntries() {
  if (_entriesCache) return _entriesCache;
  const module = await import('../data/dictionary/entries.json');
  _entriesCache = module.default;
  return _entriesCache;
}

export async function loadEntriesByType(type) {
  const all = await loadDictionaryEntries();
  return type === 'all' ? all : all.filter(e => e.type === type);
}

export async function loadEntriesByTopic(topicId) {
  const all = await loadDictionaryEntries();
  return all.filter(e => e.topics.includes(Number(topicId)));
}

export function getEntry(entryId) {
  if (!_entriesCache) return null;
  return _entriesCache.find(e => e.id === entryId) || null;
}

// --- Клиентский поиск (синхронный) ---
export function searchEntries(entries, query) {
  if (!query || query.trim().length < 2) return entries;
  // Нормализация для диакритики (безопасно в Safari 12)
  const normalize = (str) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = normalize(query.trim());
  return entries.filter(e =>
    normalize(e.term).includes(q) ||
    normalize(e.term_ru).includes(q) ||
    normalize(e.definition.ru).includes(q)
  );
}

// --- Прогресс изучения (localStorage) ---
export function getDictionaryProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markAsSeen(entryId) {
  const progress = getDictionaryProgress();
  if (!progress[entryId]) progress[entryId] = {};
  progress[entryId].seen = true;
  _saveProgress(progress);
}

export function markAsPracticed(entryId) {
  const progress = getDictionaryProgress();
  if (!progress[entryId]) progress[entryId] = {};
  progress[entryId].seen = true;
  progress[entryId].practiced = true;
  _saveProgress(progress);
}

function _saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('dictionaryService: не удалось сохранить прогресс', e);
  }
}
```

### Схема localStorage (qp_dictionary)

```json
{
  "sempre":           { "seen": true,  "practiced": true  },
  "carreggiata":      { "seen": true,  "practiced": false },
  "in_prossimita_di": { "seen": false, "practiced": false }
}
```

---

## 7. Хук

### hooks/useDictionary.js (НОВЫЙ)

```javascript
// src/hooks/useDictionary.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as dictionaryService from '../services/dictionaryService.js';

export default function useDictionary({ typeFilter = 'all' } = {}) {
  const [allEntries, setAllEntries] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка при монтировании
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    dictionaryService.loadDictionaryEntries()
      .then((entries) => {
        if (cancelled) return;
        // Сортировка по priority, затем по алфавиту
        const sorted = [...entries].sort((a, b) =>
          (a.priority || 3) - (b.priority || 3) || a.term.localeCompare(b.term)
        );
        setAllEntries(sorted);
        setProgress(dictionaryService.getDictionaryProgress());
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Ошибка загрузки словаря');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Клиентская фильтрация (без перезагрузки)
  const filteredEntries = useMemo(() => {
    let result = allEntries;

    // Фильтр по типу
    if (typeFilter !== 'all') {
      result = result.filter(e => e.type === typeFilter);
    }

    // Поиск
    if (searchQuery.trim().length >= 2) {
      result = dictionaryService.searchEntries(result, searchQuery);
    }

    return result;
  }, [allEntries, typeFilter, searchQuery]);

  const markSeen = useCallback((entryId) => {
    dictionaryService.markAsSeen(entryId);
    setProgress(dictionaryService.getDictionaryProgress());
  }, []);

  const markPracticed = useCallback((entryId) => {
    dictionaryService.markAsPracticed(entryId);
    setProgress(dictionaryService.getDictionaryProgress());
  }, []);

  // Статистика прогресса
  const stats = useMemo(() => {
    const total = allEntries.length;
    const seen = Object.values(progress).filter(p => p.seen).length;
    const practiced = Object.values(progress).filter(p => p.practiced).length;
    return { total, seen, practiced };
  }, [allEntries, progress]);

  return {
    entries: filteredEntries,
    allEntries,
    progress,
    stats,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    markSeen,
    markPracticed,
  };
}
```

---

## 8. Компонентная архитектура

### Структура директории

```
src/components/dictionary/
  SearchBar.jsx          ← поисковая строка с debounce
  TypeFilter.jsx         ← горизонтальные кнопки-фильтры
  DictionaryEntryCard.jsx ← компактная карточка (List Mode)
  StudyCard.jsx          ← большая карточка (Study Mode, Phase 3 v2)
  ModeToggle.jsx         ← переключатель Список/Карточки (Phase 3 v2)
```

### SearchBar.jsx

```jsx
// Props: value, onChange, placeholder
// Особенности:
// - debounce 300ms (через useState + useEffect + setTimeout)
// - clearTimeout при unmount и при каждом новом вводе
// - SafeProp: autoComplete="off", autoCorrect="off" для iOS
// - Иконка поиска (lucide: search — добавить в icons/index.js)
```

### TypeFilter.jsx

```jsx
// Props: value, onChange
// Значения: 'all' | 'logic_trigger' | 'term' | 'phrase' | 'concept'
// Отображение:
//   'all'           → 'Все'
//   'logic_trigger' → 'Ловушки 🎯'
//   'term'          → 'Термины'
//   'phrase'        → 'Фразы'
//   'concept'       → 'Концепции'
// Горизонтальный скролл (overflow-x: auto, -webkit-overflow-scrolling: touch)
// НЕ использовать gap — использовать margin-right для iOS 12
```

### DictionaryEntryCard.jsx

```jsx
// Props: entry, isExpanded, onToggle, isSeen, onMarkSeen
// Поведение:
// - Компактный вид (свёрнут): term + term_ru + type badge
// - Развёрнутый вид (аккордеон): + definition.ru + quiz_hint.ru + example
// - При первом разворачивании → onMarkSeen(entry.id)
// - React.memo для производительности (iPad mini 2)

// Визуальная структура (свёрнутый):
// ┌─────────────────────────────────────────┐
// │ [ЛОВУШКА]        sempre        ✓ seen  │
// │ всегда           >                      │
// └─────────────────────────────────────────┘

// Визуальная структура (развёрнутый):
// ┌─────────────────────────────────────────┐
// │ [ЛОВУШКА]        sempre        ✓ seen  │
// │ всегда           ∧                      │
// ├─────────────────────────────────────────┤
// │ 📖 Что это:                             │
// │ Указывает на абсолютное утверждение...  │
// │                                         │
// │ 🎯 В квизе:                             │
// │ Вопросы с 'sempre' чаще FALSO...        │
// │                                         │
// │ Пример:                                 │
// │ "È sempre vietato superare..."          │
// │ Ответ: ❌ FALSO                          │
// └─────────────────────────────────────────┘
```

### Type badge цвета

| Тип | Цвет фона | Цвет текста |
|---|---|---|
| `logic_trigger` | `#fef3c7` (жёлтый) | `#92400e` |
| `term` | `#dbeafe` (синий) | `#1e40af` |
| `phrase` | `#d1fae5` (зелёный) | `#065f46` |
| `concept` | `#ede9fe` (фиолетовый) | `#5b21b6` |

---

## 9. Страница DictionaryPage

### DictionaryPage.jsx (финальная структура)

```jsx
// src/pages/DictionaryPage.jsx

const DictionaryPage = () => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const {
    entries,
    stats,
    progress,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    markSeen,
  } = useDictionary({ typeFilter });

  // Аккордеон: один открытый одновременно
  const handleToggle = (entryId) => {
    setExpandedId(prev => prev === entryId ? null : entryId);
    if (expandedId !== entryId) {
      markSeen(entryId);
    }
  };

  // Layout:
  // AppHeader "Словарь"
  // stats mini-bar (X / Y изучено)
  // SearchBar
  // TypeFilter
  // список DictionaryEntryCard
  // BottomNav
};
```

### Layout страницы (сверху вниз)

```
┌─────────────────────────────────────────┐
│  AppHeader "Словарь"                    │ ← sticky
├─────────────────────────────────────────┤
│  Изучено: 12 / 35  ██████░░░░ 34%       │ ← mini progress bar
├─────────────────────────────────────────┤
│  🔍 [Поиск термина...]                  │ ← SearchBar
├─────────────────────────────────────────┤
│  [Все] [Ловушки🎯] [Термины] [Фразы]   │
│  [Концепции]                            │ ← TypeFilter (горизонт. скролл)
├─────────────────────────────────────────┤
│  DictionaryEntryCard                    │
│  DictionaryEntryCard (expanded ↓)       │
│    definition + quiz_hint + example     │
│  DictionaryEntryCard                    │
│  ...                                    │
└─────────────────────────────────────────┘
│  BottomNav                              │
```

---

## 10. Маршрутизация и интеграция

### Маршрут

```
/dictionary → DictionaryPage
```

Маршрут уже зарегистрирован в `App.jsx` и в BottomNav. Только заменяем заглушку.

### Связь с QuizPage (MVP)

В MVP кнопка "Практиковать" в карточке → `navigate('/quiz/N')` (просто тема).

**Phase 3 v2 (после MVP):** расширить `useQuiz` и `questionsService`:
```javascript
// Новый topicId паттерн: 'dict:sempre'
// questionsService.loadQuestionsByEntry('sempre')
//   → loadAllQuestions() → filter by related_question_ids
// useQuiz: добавить ветку topicId.startsWith('dict:')
```

### Интеграция с HomePage (после MVP)

На карточке темы добавить кнопку "Термины темы →" → navigate('/dictionary?topic=N').
DictionaryPage читает `?topic` из URL и предфильтровывает.

---

## 11. CSS-классы (BEM)

### Новые классы в components.css

```css
/* === Dictionary Entry Card === */
.dict-entry-card { ... }
.dict-entry-card--expanded { ... }
.dict-entry-card__header { ... }
.dict-entry-card__term { ... }
.dict-entry-card__term-ru { ... }
.dict-entry-card__badge { ... }
.dict-entry-card__badge--logic-trigger { ... }
.dict-entry-card__badge--term { ... }
.dict-entry-card__badge--phrase { ... }
.dict-entry-card__badge--concept { ... }
.dict-entry-card__seen-mark { ... }
.dict-entry-card__toggle-icon { ... }
.dict-entry-card__body { ... }
.dict-entry-card__section { ... }
.dict-entry-card__section-label { ... }
.dict-entry-card__example { ... }
.dict-entry-card__example-answer { ... }

/* === Type Filter === */
.dict-type-filter { ... }
.dict-type-filter__btn { ... }
.dict-type-filter__btn--active { ... }

/* === Search Bar === */
.dict-search { ... }
.dict-search__input { ... }
.dict-search__icon { ... }
.dict-search__clear { ... }
```

### Новые классы в pages.css

```css
/* === Dictionary Page === */
.dictionary-page { ... }
.dict-progress-bar { ... }
.dict-progress-bar__fill { ... }
.dict-progress-label { ... }
.dict-list { ... }
.dict-empty { ... }
.dict-empty__text { ... }
```

---

## 12. Система иконок (дополнение)

Для DictionaryPage нужны новые иконки в `src/assets/icons/index.js`:

```javascript
// Добавить:
'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
'chevron-down': '<path d="m6 9 6 6 6-6"/>',
'chevron-up': '<path d="m18 15-6-6-6 6"/>',
// 'check' уже есть
```

---

## 13. localStorage (дополнение к схеме проекта)

### Новый ключ

```javascript
const STORAGE_KEY_DICTIONARY = 'qp_dictionary';
```

### Схема

```json
{
  "sempre":      { "seen": true,  "practiced": true  },
  "carreggiata": { "seen": true,  "practiced": false },
  "sosta":       { "seen": false, "practiced": false }
}
```

**Правила:**
- `seen = true` при первом разворачивании карточки (аккордеон)
- `practiced = true` при нажатии "Практиковать" и переходе в квиз
- Ключ = `entry.id` (строка)
- Не удалять ключи при флаге false (хранить явно)

---

## 14. iOS 12 совместимость (специфика для Dictionary)

- **Горизонтальный скролл TypeFilter:** `overflow-x: auto; -webkit-overflow-scrolling: touch;` — без `gap`
- **Аккордеон:** CSS `max-height` transition (не height: auto) — iOS 12 поддерживает
- **Поиск с диакритикой:** `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` перед `includes()`
- **Debounce в SearchBar:** через `setTimeout`/`clearTimeout`, не через внешние библиотеки
- **Анимация карточки:** только `max-height` + `opacity`, никаких `transform: rotateY` (flip не используем в MVP)

---

## 15. Plan разработки — пошаговый

### ✅ Выполнено (Phase 1 + 2)
- [x] DictionaryPage.jsx — заглушка (coming-soon UI)
- [x] Маршрут `/dictionary` зарегистрирован в App.jsx
- [x] BottomNav ведёт на `/dictionary`

### 📋 Phase 3 — порядок реализации

#### Шаг 1 — Скрипт анализа данных
- [x] `scripts/analyze-dictionary.js`
- [x] Вывод: топ-200 слов по частоте + answer-bias для каждого
- [x] Вывод: топ-50 биграмм (фразы)
- **Output:** таблица кандидатов для ручного отбора

#### Шаг 2 — Данные (entries.json)
> [!WARNING]
> При добавлении новых терминов, генерации батчей или работе со скриптами линковки строго переключиться на [DICTIONARY_SCALING_SKILL.md](file:///Users/greg/MyProjects/app-quiz-patente/DICTIONARY_SCALING_SKILL.md).

- [x] `src/data/dictionary/entries.json` — **57 записей** (Phase 3 v3, апрель 2026)
  - Батч A выполнен: +12 logic_trigger/phrase (true_bias)
  - Батч B выполнен: +9 logic_trigger (false_bias)
  - Батчи C–F (термины, фразы, концепции) — в очереди, см. [DICTIONARY_SCALING_SKILL.md](file:///Users/greg/MyProjects/app-quiz-patente/DICTIONARY_SCALING_SKILL.md)
- [x] Поля: id, term, term_ru, type, priority, topics, definition.ru, quiz_hint.ru, examples[0..1]
- [x] related_question_ids заполнены скриптом
- **Качество важнее количества**

#### Шаг 3 — Сервис
- [x] `src/services/dictionaryService.js`
- [x] Функции: loadDictionaryEntries, loadEntriesByType, searchEntries
- [x] Функции: getDictionaryProgress, markAsSeen, markAsPracticed
- [x] Кэш в памяти (`_entriesCache`)

#### Шаг 4 — Хук
- [x] `src/hooks/useDictionary.js`
- [x] Принимает: `{ typeFilter, topicFilter }`
- [x] Возвращает: entries, stats, progress, loading, error, searchQuery, setSearchQuery, markSeen

#### Шаг 5 — Иконки
- [x] Добавить `search`, `chevron-down`, `chevron-up` в `src/assets/icons/index.js`

#### Шаг 6 — Компоненты
- [x] `src/components/dictionary/SearchBar.jsx`
- [x] `src/components/dictionary/TypeFilter.jsx`
- [x] `src/components/dictionary/DictionaryEntryCard.jsx` (с аккордеоном)
- [x] `src/components/dictionary/TopicFilter.jsx`
- [x] `src/components/dictionary/ModeToggle.jsx`
- [x] `src/components/dictionary/StudyCard.jsx`

#### Шаг 7 — Страница
- [x] `src/pages/DictionaryPage.jsx` — полная реализация (v3)

#### Шаг 8 — Стили
- [x] Добавить CSS-классы в `src/styles/components.css`
- [x] Добавить CSS-классы в `src/styles/pages.css`

#### Шаг 9 — Линковка вопросов
- [x] Расширить `scripts/analyze-dictionary.js` — добавить проставление related_question_ids
- [x] Обновить entries.json с реальными question_ids

#### Phase 3 v2 (выполнено)
- [x] Study Mode (StudyCard — большая карточка)
- [x] ModeToggle (Список / Карточки)
- [x] TopicFilter (фильтр по теме)
- [ ] index_by_topic.json + index_by_type.json (планируется для оптимизации)
- [ ] Quiz Link: topicId паттерн `dict:*` в useQuiz (планируется)
- [x] Интеграция с HomePage (кнопка "Термины темы")
- [x] URL параметр `?topic=N` для предфильтрации

---

## 16. Что НЕ делаем (сейчас)

| Что | Почему / Когда |
|---|---|
| Flip-анимация карточек | Аккордеон проще и работает на iOS 12 |
| Study Mode (flashcards) | Phase 3 v2 — после стабилизации MVP |
| Quiz Link (dict: topicId) | Требует изменений useQuiz — Phase 3 v2 |
| TopicFilter | Нужен index_by_topic.json — Phase 3 v2 |
| 150+ записей сразу | Контент-работа — добавлять итерационно |
| NLP/автоматическое извлечение | Нет Python/spacy в проекте — гибридный подход |
| Полноценный SRS (Spaced Repetition) | Overkill для личного проекта |
| Страница отдельного термина (/dictionary/:id) | Аккордеон достаточен для MVP |

---

## 17. Риски

| Риск | Митигация |
|---|---|
| Контент важнее кода — плохие quiz_hint бесполезны | Начать с 10 идеальных записей |
| Over-engineering JSON схемы (20+ полей) | MVP: только 8 полей, расширять по нужде |
| Quiz Link усложняет useQuiz | В MVP navigate к теме, не к filtered вопросам |
| Поиск с диакритикой падает на Safari 12 | normalize('NFD') + remove diacritics перед includes() |
| related_question_ids устаревают при обновлении данных | Скрипт перегенерирует при обновлении |
| Огромный entries.json тормозит | Кэш в памяти (_entriesCache) после первой загрузки |

---

## 18. Соглашения по именованию (дополнение)

Всё наследует от основного SKILL.md плюс:

- **Компоненты dictionary/:** PascalCase, префикс `Dictionary` только для страниц
  - `DictionaryEntryCard.jsx` (не `EntryCard` — для ясности при импорте)
  - `SearchBar.jsx`, `TypeFilter.jsx` — без префикса (они достаточно специфичны)
- **CSS-классы:** префикс `dict-` для всего связанного со словарём
  - `.dict-entry-card`, `.dict-type-filter`, `.dict-search`
- **localStorage ключ:** `qp_dictionary` (по аналогии с `qp_progress`, `qp_errors`)
- **Файл сервиса:** `dictionaryService.js` (суффикс Service — как в проекте)
- **Файл хука:** `useDictionary.js` (префикс use — как в проекте)

---

*Phase 3 SKILL создан на основе Architecture Brainstorm: DictionaryPage.*
*Версия: 1.0 | Дата: апрель 2026*
*Следующий документ для чтения: SKILL.md (основной контекст проекта)*
