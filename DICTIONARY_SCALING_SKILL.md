---
name: dictionary-scaling
description: >
  Технический контекст для масштабирования entries.json с 36 до 300 записей
  в проекте Quiz Patente (Phase 3 Dictionary). Используй этот файл при любой
  задаче, связанной с добавлением новых Entry: написании scaffold-entries.js,
  validate-entries.js, ручном заполнении батчей, запуске link-questions.js.
  Читать ВМЕСТЕ с SKILL.md и SKILL_DICTIONARY.md.
parent_skills:
  - [SKILL.md](file:///Users/greg/MyProjects/app-quiz-patente/SKILL.md) ← основной контекст проекта
  - [SKILL_DICTIONARY.md](file:///Users/greg/MyProjects/app-quiz-patente/SKILL_DICTIONARY.md) ← архитектура DictionaryPage и схема Entry
---

# Dictionary Scaling — Phase 3 v3

> **Статус:** активная фаза разработки  
> **Цель:** 72 → 300 записей (реалистичный milestone: 200–250 высокого качества)  
> **Дата обновления:** 25 апреля 2026  
> **Синхронизирован с:** реальной кодовой базой на 25 апреля 2026

---

## 1. Контекст и текущее состояние

### Что уже готово (не трогать)

| Артефакт | Путь | Статус |
|---|---|---|
| MVP записи | `src/data/dictionary/entries.json` | ✅ 72 записи, все с related_question_ids и examples |
| Частотный анализ | `scripts/output/candidates.json` | ✅ 4998 слов + 23957 биграмм с bias |
| Скрипт анализа | `scripts/analyze-dictionary.js` | ✅ поддерживает --bias-only, --json |
| Скрипт линковки | `scripts/link-questions.js` | ✅ поддерживает --dry-run, --entry |
| Сервис | `src/services/dictionaryService.js` | ✅ кэш в памяти, готов к 300+ записям |
| Хук | `src/hooks/useDictionary.js` | ✅ фильтрация in-memory |

### Что нужно создать (в порядке приоритета)

1. `scripts/scaffold-entries.js` — генератор заготовок Entry из candidates.json
2. `scripts/validate-entries.js` — валидатор схемы и качества
3. Батчи ручного заполнения (Step 4–8 в плане ниже)

---

## 2. Схема Entry (канон)

```json
{
  "id": "semaforo",
  "term": "semaforo",
  "term_ru": "светофор",
  "type": "term",
  "priority": 1,
  "topics": [3, 5, 7, 11, 14],

  "definition": {
    "ru": "Устройство регулирования дорожного движения с помощью световых сигналов. В Италии сигналы светофора имеют приоритет над знаками и разметкой, но уступают жестам регулировщика."
  },

  "quiz_hint": {
    "ru": "Вопросы о semaforo часто проверяют иерархию управления: регулировщик > светофор > знаки. Если в вопросе есть и светофор, и регулировщик — слушай регулировщика.",
    "pattern": "neutral"
  },

  "examples": [
    {
      "it": "Quando il semaforo è verde il conducente deve sempre procedere",
      "ru": "Когда светофор зелёный, водитель всегда обязан двигаться",
      "answer": false,
      "comment_ru": "FALSO — водитель обязан убедиться в безопасности манёвра, даже при зелёном сигнале"
    }
  ],

  "related_question_ids": [82, 355, 430, 482, 483, 484, 485, 486, 487, 488],
  "related_entries": ["precedenza", "segnale"],
  "antonyms_it": []
}
```

### Обязательные поля (валидируются скриптом)

| Поле | Тип | Правило |
|---|---|---|
| `id` | string | snake_case, уникален в массиве |
| `term` | string | итальянское слово/фраза |
| `term_ru` | string | ≠ term, русский перевод |
| `type` | enum | `term` \| `phrase` \| `logic_trigger` \| `concept` |
| `priority` | 1\|2\|3 | 1=высокий, 3=низкий |
| `topics` | number[] | ≥1 темы |
| `definition.ru` | string | ≥80 символов |
| `quiz_hint.ru` | string | ≥60 символов |
| `quiz_hint.pattern` | enum | `false_bias` \| `true_bias` \| `neutral` \| `context_dependent` |
| `examples` | array | ≥1 пример |
| `examples[].answer` | boolean | точный ответ из вопроса |
| `related_question_ids` | number[] | ≥3 id (заполняется link-questions.js) |

### Опциональные поля

| Поле | Когда добавлять |
|---|---|
| `related_entries` | когда есть тесно связанные термины в entries.json |
| `antonyms_it` | только для logic_triggers (sempre↔mai) и concepts |

---

## 3. Критерии отбора кандидатов из candidates.json

### Logic Triggers (изучать первыми)

```
bias_strength >= 25 AND count >= 50
```

| Термин | count | bias% | bias_strength | В entries? |
|---|---|---|---|---|
| riservata | 68 | 82% FALSO | 64 | ✅ |
| consentita | 56 | 71% FALSO | 42 | ✅ |
| purché | 61 | 74% FALSO | 48 | ✅ |
| regolare | 63 | 75% VERO | 50 | ❌ добавить |
| trovare | 59 | 76% VERO | 52 | ❌ добавить |
| prudenza | 85 | 76% VERO | 52 | ✅ |
| modo | 73 | 74% VERO | 48 | ❌ добавить |
| attenzione | 82 | 73% VERO | 46 | ✅ |
| manovra | 111 | 64% VERO | 28 | ❌ добавить |
| area | 89 | 66% FALSO | 32 | ❌ добавить |
| parcheggio | 68 | 69% FALSO | 38 | ❌ добавить |
| ciclomotori | 68 | 68% FALSO | 36 | ❌ добавить |
| obbliga | 104 | 63% FALSO | 25 | ❌ добавить |
| evitare | 109 | 69% VERO | 38 | ❌ добавить |
| fermarsi | 89 | 64% VERO | 28 | ❌ добавить |
| puo essere | 264 | 66% VERO | 32 | ❌ добавить |

### Термины ПДД (высокая частота)

```
count >= 80 AND topics >= 8 AND bias_strength < 25
```

Приоритетный список отсутствующих в entries.json:

| Термин | count | topics | Зачем |
|---|---|---|---|
| veicolo | 1073 | 24 | Базовый термин классификации — центральный |
| semaforo | 179 | 12 | Светофор — отдельная правовая логика |
| transito | 330 | 17 | Проезд (путают со стоянкой) |
| pedoni | 140 | 14 | Пешеходы — отдельный приоритет |
| striscia | 131 | 11 | Линия разметки (путают со знаком) |
| limite | 130 | 11 | Ограничение скорости — числовые ловушки |
| guida | 267 | 15 | Вождение vs управление — тонкость |
| marcia | 265 | 23 | Движение/ход — важен контекст |
| pannello integrativo | 191 | 3 | Доп. табличка — часто путают |
| strade extraurbane | 136 | 14 | Внегородские дороги — зонирование |
| corrispondenza | 121 | 14 | "На уровне" — пространственный термин |
| svoltare | 173 | 12 | Поворот — путают с разворотом |
| luce | 172 | 12 | Свет/фара — много правил |
| km/h | 176 | 12 | Скоростные числовые ограничения |

### Фразы (bigrams)

```
count >= 100 AND topics >= 5
```

| Фраза | count | bias | В entries? |
|---|---|---|---|
| in presenza | 358 | 58% VERO | ❌ добавить |
| puo essere | 264 | 66% VERO | ❌ добавить (как phrase) |
| strade extraurbane | 136 | neutral | ❌ добавить |
| pannello integrativo | 191 | 57% FALSO | ❌ добавить |
| segnale di | 181 | 59% VERO | ❌ добавить |
| di sicurezza | 181 | neutral | опционально |

### Концепции (ручной отбор)

Парные противопоставления для записей типа `concept`:

| Пара | Смысл |
|---|---|
| autostrada / strada extraurbana | Классификация дорог по типу |
| segnale verticale / segnaletica orizzontale | Знаки vs разметка |
| corsie / carreggiate | Полоса vs проезжая часть |
| veicolo / autoveicolo / ciclomotore | Иерархия классификации ТС |
| vero / falso (паттерны в вопросах) | Мета-концепция экзамена |

---

## 4. Скрипты — спецификации

### 4.1 scaffold-entries.js (создать)

**Назначение:** генерирует JSON-заготовки Entry из candidates.json с предзаполненными автоматическими полями.

**Запуск:**
```bash
node scripts/scaffold-entries.js                    # все приоритетные кандидаты
node scripts/scaffold-entries.js --type logic       # только logic_triggers
node scripts/scaffold-entries.js --type terms       # только термины
node scripts/scaffold-entries.js --type phrases     # только фразы
node scripts/scaffold-entries.js --min-bias 25      # порог bias_strength
node scripts/scaffold-entries.js --min-count 50     # порог частоты
```

**Логика:**
1. Читает `scripts/output/candidates.json`
2. Читает `src/data/dictionary/entries.json` (существующие — пропускаем)
3. Применяет фильтры по типу
4. Для каждого кандидата создаёт Entry-заготовку:

```javascript
// Автоматически заполняется:
{
  id: normalize(term),         // snake_case (пробелы → _, убирает диакритику)
  term: term,                  // из candidates
  term_ru: "TODO",             // ← ручное заполнение
  type: inferType(candidate),  // logic_trigger если bias_strength >= 25, иначе term
  priority: inferPriority(count),  // count>=200→p1, count>=80→p2, иначе→p3
  topics: candidate.topics_list || [],  // если есть в candidates
  definition: { ru: "TODO" },
  quiz_hint: {
    ru: "TODO",
    pattern: candidate.bias_label  // маппинг: false_bias→false_bias, true_bias→true_bias, иначе→neutral
  },
  examples: [],
  related_question_ids: []
}
```

5. Сохраняет в `scripts/output/scaffold_[type]_YYYY-MM-DD.json`
6. Выводит в консоль: сколько кандидатов найдено, сколько уже в entries, сколько новых заготовок

**Проверить:**
```bash
node scripts/scaffold-entries.js --type logic --min-bias 25
# → scripts/output/scaffold_logic_*.json с ~15 заготовками
# → каждая заготовка имеет реальные id, topics, pattern
# → ни одна из существующих 36 записей не дублируется
```

### 4.2 validate-entries.js (создать)

**Назначение:** проверяет entries.json на соответствие схеме и минимальным требованиям качества.

**Запуск:**
```bash
node scripts/validate-entries.js                    # полная проверка
node scripts/validate-entries.js --strict           # добавляет проверки related_entries
node scripts/validate-entries.js --entry semaforo   # только одна запись
```

**Правила валидации:**

```
CRITICAL (блокирующие):
  □ id уникален в массиве
  □ type ∈ {term, phrase, logic_trigger, concept}
  □ priority ∈ {1, 2, 3}
  □ term_ru ≠ term (не скопирован)
  □ term_ru ≠ "TODO"
  □ definition.ru ≠ "TODO" AND len >= 80
  □ quiz_hint.ru ≠ "TODO" AND len >= 60
  □ quiz_hint.pattern ∈ {false_bias, true_bias, neutral, context_dependent}
  □ examples.length >= 1
  □ examples[*].answer is boolean (not string "true"/"false")

WARNING (не блокирующие):
  □ related_question_ids.length >= 3
  □ topics.length >= 1
  □ examples[*].comment_ru присутствует и len >= 20
  □ definition.ru не начинается с "Переводится" / "Означает" (анти-паттерн)
```

**Вывод:**
```
Validating entries.json (52 entries)...

❌ CRITICAL (2):
  [segnale_di] term_ru = "TODO" — не заполнено
  [semaforo]   definition.ru слишком короткая (45 символов, минимум 80)

⚠️  WARNING (3):
  [transito]   related_question_ids пусто — запустить link-questions.js
  [veicolo]    topics пустой массив
  [manovra]    examples[0].comment_ru отсутствует

✅ OK: 49 записей прошли валидацию
```

**Проверить:**
```bash
node scripts/validate-entries.js
# → на текущих 36 записях: 0 CRITICAL, 0-2 WARNING
```

---

## 5. Рабочий процесс (батчи)

### Цикл работы над каждым батчем

```
1. scaffold  →  node scripts/scaffold-entries.js --type [тип]
2. заполнить →  открыть scaffold_*.json, заполнить TODO поля (вручную)
3. merge     →  добавить записи в src/data/dictionary/entries.json
4. validate  →  node scripts/validate-entries.js  (0 CRITICAL обязательно)
5. link      →  node scripts/link-questions.js --dry-run  (проверить статистику)
               node scripts/link-questions.js              (применить)
6. validate  →  повторно, теперь 0 WARNING по related_question_ids
7. commit    →  git commit -m "dict: добавлены [N] записей [тип] (батч [N])"
```

### Правило качества definition.ru

```
❌ НЕ ПИСАТЬ: "Слово 'semaforo' переводится как 'светофор'."
❌ НЕ ПИСАТЬ: "Означает регулирование движения."
❌ НЕ ПИСАТЬ: "Важный термин в ПДД."

✅ ПИСАТЬ: механизм работы + правовой контекст + почему это важно для квиза
Шаблон: "[Термин] — это [что именно] в итальянских ПДД. [Как работает / правовой статус].
         [Почему это важно знать при ответе на вопросы / с чем путают]."
```

### Правило качества quiz_hint.ru

```
❌ НЕ ПИСАТЬ: "Обращай внимание на это слово."
❌ НЕ ПИСАТЬ: "Важно понимать значение термина."

✅ ПИСАТЬ: конкретный совет + паттерн
Шаблон: "Вопросы с '[term]' [часто/почти всегда] оказываются [VERO/FALSO], потому что
         [конкретная причина]. [Конкретное действие при виде термина в вопросе]."

Исключение для neutral: объяснить КАК термин меняет смысл вопроса.
```

---

## 6. Батч-план (поэтапно)

### Шаг 1 — scaffold-entries.js (выполнено)

**Цель:** создать скрипт, генерирующий заготовки  
**Verify:** `node scripts/scaffold-entries.js --type logic --min-bias 25` → файл с заготовками [x]

### Шаг 2 — validate-entries.js (выполнено)

**Цель:** создать валидатор  
**Verify:** `node scripts/validate-entries.js` → 0 CRITICAL на текущих 72 записях [x]

### Шаг 3 — Батч A: Logic Triggers true_bias (p1)

**Кандидаты:** regolare, trovare, modo, evitare, fermarsi, puo essere, manovra, visibilita  
**Цель:** 8–10 новых записей  
**Verify:** validate 0 CRITICAL + link → каждая ≥5 question_ids

### Шаг 4 — Батч B: Logic Triggers false_bias (p1)

**Кандидаты:** area, parcheggio, ciclomotori, obbliga, metro/metri, zona, vale, autocarri  
**Цель:** 8–10 новых записей  
**Verify:** аналогично

### Шаг 5 — Батч C: Базовые термины (p1, freq ≥200)

**Кандидаты:** veicolo, semaforo, transito, pedoni, guida, marcia, striscia  
**Цель:** 7–8 новых записей  
**Verify:** аналогично

### Шаг 6 — Батч D: Термины (p2, freq 80–200)

**Кандидаты:** limite, km, luce, svoltare, pannello, corrispondenza, emergenza, semaforo, carico  
**Цель:** 10–12 новых записей

### Шаг 7 — Батч E: Фразы (phrases)

**Кандидаты:** in presenza, puo essere (как phrase), strade extraurbane, pannello integrativo, segnale di, raffigurato indica  
**Цель:** 6–8 новых записей

### Шаг 8 — Батч F: Концепции (concepts)

**Кандидаты:** autostrada/extraurbana, veicolo/autoveicolo/ciclomotore, segnale/segnaletica, corsia/carreggiata  
**Цель:** 8–10 парных записей

### Шаги 9–14 — Тематические батчи (p2/p3 по темам)

По ~15–20 записей на тему. Приоритет по числу вопросов в теме:

| Тема | questions_count | Фокус |
|---|---|---|
| topic_1 | 531 | Общие понятия — много базовых терминов |
| topic_5 | ~400 | Обгоны — много logic_triggers |
| topic_3 | ~380 | Знаки — terminology heavy |
| topic_10 | ~350 | Светофоры/пересечения |
| topic_4 | ~320 | Скоростные ограничения — числовые ловушки |

### Целевые показатели

| После батча | Ожидаемое кол-во записей |
|---|---|
| A + B (Logic Triggers) | ~56 |
| C + D (Термины) | ~76 |
| E (Фразы) | ~84 |
| F (Концепции) | ~94 |
| Тематические батчи (6 штук) | ~180–200 |
| Финальные p3 записи | 220–260 |

---

## 7. Производительность

### Текущее состояние (не требует изменений до 500 записей)

- `dictionaryService._entriesCache` — загрузка один раз за сессию
- Вся фильтрация через `useMemo` в памяти — синхронная
- Vite бандлит `entries.json` в JS chunk при `npm run build`

### Оценка размера

| Записей | Размер JSON | Загрузка (3G ~400KB/s) |
|---|---|---|
| 36 (сейчас) | ~15 KB | ~37ms |
| 150 | ~62 KB | ~155ms |
| 300 | ~125 KB | ~312ms |

**Вывод:** при 300 записях оптимизации не нужны.

### Порог оптимизации (если превысим 500 записей)

Стратегия — ленивая загрузка по типу:

```javascript
// dictionaryService.js — текущий импорт:
const module = await import('../data/dictionary/entries.json');

// Будущий (если нужно, только после 500 записей):
const module = await import(`../data/dictionary/entries_${type}.json`);
```

`loadEntriesByType()` уже готов к этому изменению — менять только тело функции.

---

## 8. Часто задаваемые вопросы

**Q: Когда добавлять related_entries?**  
A: Только когда термин тесно связан с уже существующей записью. Не добавлять "на будущее" — только если соответствующий entry уже в entries.json.

**Q: Нужно ли добавлять antonyms_it?**  
A: Только для logic_triggers с явным антонимом (sempre↔mai, solo↔anche, consentito↔vietato). Для терминов — нет.

**Q: Как выбрать пример (examples)?**  
A: Открыть реальный вопрос из related_question_ids, выбрать тот где term используется наиболее показательно. Скопировать text → `it`, text_ru → `ru`, answer → `answer`, comment.text_ru → `comment_ru`.

**Q: Что делать с глагольными вариантами (vieta/vietato/vietata)?**  
A: Одна запись на лемму. `id: "vieto"` (лемма), `term: "vietato"` (наиболее частая форма). В link-questions.js стратегия OR — он найдёт все варианты.

**Q: Как быть с тематическими концепциями (напр. числовые ограничения)?**  
A: Создавать entry на конкретное число-ловушку только если оно встречается в ≥10 вопросах И является реальной причиной ошибок. Пример: "50 km/h в черте города" — это valid entry типа `concept`.

---

## 9. Команды быстрого старта

```bash
# Сгенерировать заготовки logic_triggers
node scripts/scaffold-entries.js --type logic --min-bias 25

# Сгенерировать заготовки терминов (частота ≥80)  
node scripts/scaffold-entries.js --type terms --min-count 80

# Сгенерировать заготовки фраз
node scripts/scaffold-entries.js --type phrases

# Валидация после ручного заполнения
node scripts/validate-entries.js

# Линковка с вопросами (сначала dry-run)
node scripts/link-questions.js --dry-run
node scripts/link-questions.js

# Анализ новых кандидатов (если нужно обновить данные)
node scripts/analyze-dictionary.js --bias-only
```

---

*Dictionary Scaling SKILL v1.0*  
*Создан на основе: анализа candidates.json (7144 вопросов, апрель 2026)*  
*Следующий шаг: создать scaffold-entries.js → validate-entries.js → Батч A*