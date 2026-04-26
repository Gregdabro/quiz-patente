Читаю все три SKILL-файла и распаковываю проект.Достаточно данных. Пишу отчёт.Данных достаточно. Пишу полный отчёт.

---

# Технический аудит — Quiz Patente / Phase 3 Dictionary

**Дата аудита:** 26 апреля 2026  
**Аудитор:** Senior Frontend Architect  
**Источники истины:** `SKILL.md` (v2), `SKILL_DICTIONARY.md` (v1.0), `DICTIONARY_SCALING_SKILL.md` (v1.0)

---

## 1. Executive Summary

| Параметр | Значение |
|---|---|
| Текущая фаза | **Phase 3 v2** — полностью реализована (раньше расписания) |
| Записей в `entries.json` | **206** |
| Целевой рубеж по SKILL | 200–250 качественных записей |
| Прогресс к финальному milestone (300) | **~69%** по количеству, **~85%** по качеству (p1/p2 записи доминируют) |
| CRITICAL-ошибок схемы | **0** |
| WARNING-ошибок | **1** (один `related_question_ids < 3`) |
| Архитектурных нарушений | **0** |
| iOS 12 compliance | **✅ полная** |
| Phase 3 v2 фичи | **✅ все реализованы** (StudyCard, ModeToggle, TopicFilter, URL `?topic=N`) |

**Вывод:** проект находится в отличном состоянии. DictionaryPage полностью функциональна с обоими режимами (List + Study), инструментальная инфраструктура (scaffold, validate, link) работает. Главная открытая задача — контентное расширение записей в тематических батчах.

---

## 2. Gap Analysis — расхождения с документами SKILL

### 2.1 Расширение `quiz_hint.pattern` (несоответствие канону)

**Описание.** `DICTIONARY_SCALING_SKILL.md` (секция 2, поле `pattern`) определяет **4 допустимых значения**: `false_bias`, `true_bias`, `neutral`, `context_dependent`. В реальном `entries.json` присутствуют **4 записи с нестандартными значениями**:

| Entry ID | Реальный pattern | Ожидаемый по спецификации |
|---|---|---|
| `sempre` | `weak_false_bias` | `false_bias` |
| `tutti` | `weak_false_bias` | `false_bias` |
| `unico` | `weak_false_bias` | `false_bias` |
| `pericolo` | `weak_true_bias` | `true_bias` |

**Первопричина.** Скрипт `scaffold-entries.js` вводит значения `weak_false_bias` / `weak_true_bias` (функция `inferPattern` маппит `weak_*` → `*_bias`), однако при ручном заполнении эти значения были перенесены в `entries.json` без нормализации. Валидатор `validate-entries.js` **легализовал эти значения** — `VALID_PATTERNS` в нём содержит все 6 вариантов (включая `weak_*`), тогда как SKILL допускает только 4.

**Последствие.** Несоответствие не ломает UI (DictionaryEntryCard не отображает `pattern` напрямую), но создаёт семантическую рассогласованность и потенциально сломает будущую логику, которая будет использовать `pattern` для фильтрации или отображения.

---

### 2.2 Phase 3 v2 реализована досрочно (позитивное расхождение)

`SKILL_DICTIONARY.md` (секция 15) помечал следующее как **"Phase 3 v2 — после стабилизации MVP"**:

- StudyCard / flashcard режим — **реализован** ✅
- ModeToggle — **реализован** ✅  
- TopicFilter — **реализован** ✅  
- URL параметр `?topic=N` — **реализован** ✅  
- `useDictionary` с `topicFilter` — **реализован** ✅  

Это позитивное расхождение, но `SKILL_DICTIONARY.md` требует синхронизации — чекбоксы в секции 15 помечены `[x]`, документ актуален.

---

### 2.3 Отсутствие `index_by_topic.json` и `index_by_type.json`

**Описание.** `SKILL_DICTIONARY.md` (секция 3) описывает дополнительные индексы:
```
src/data/dictionary/index_by_topic.json
src/data/dictionary/index_by_type.json
```

**Статус:** файлы **не созданы**. Однако SKILL явно указывает: "MVP: только entries.json. Индексы добавляются в v2 когда нужна фильтрация по теме." Фильтрация по теме реализована **in-memory** через `useMemo` в `useDictionary.js` — это соответствует архитектуре MVP. При 206 записях и целевых 300 эти индексы не нужны (порог оптимизации 500+).

**Вердикт:** не баг, всё по плану.

---

### 2.4 `BottomNav` отсутствует в `DictionaryPage.jsx`

**Описание.** `SKILL.md` (секция 14): "BottomNav используется на DictionaryPage". В коде `DictionaryPage.jsx` нет импорта `BottomNav` — **ни одного вхождения**.

**Но:** `BottomNav` рендерится глобально в `App.jsx` через `AppContent` — он показывается на всех страницах, кроме `/quiz/*`. Это **архитектурно верно** и соответствует реальной структуре проекта. Формулировка в SKILL вводит в заблуждение — страницам не нужно самим рендерить BottomNav.

**Вердикт:** не баг. Архитектура правильная.

---

### 2.5 Scaffold output содержит нерелевантные кандидаты

`scaffold_terms_2026-04-26.json` содержит 105 кандидатов, из которых первые позиции — `raffigurato`, `veicoli`, `presenza`, `ad`, `posto`, `nell`. Это **функциональные слова и артикли**, не подходящие ни под один тип Entry. Скрипт не фильтрует стоп-слова. Текущий `--min-count 40` недостаточен для очистки мусора при поиске по `terms`.

---

## 3. Code & Data Quality

### 3.1 Качество данных — отличное

| Проверка | Результат |
|---|---|
| Дубли `id` | 0 |
| `term_ru = "TODO"` | 0 |
| `definition.ru < 80 символов` | 0 |
| `quiz_hint.ru < 60 символов` | 0 |
| `examples` пустые | 0 |
| `examples[].answer` не boolean | 0 |
| Неверный `type` | 0 |
| Неверный `priority` | 0 |
| `related_question_ids < 3` | **1** (запись `precedenza_a_sinistra`) |
| Нестандартный `pattern` | **4** (см. 2.1) |

Среднее `related_question_ids` на запись: **28 штук** — превосходный результат (норма по SKILL: ≥3).

---

### 3.2 Размер `entries.json` — норма, но требует мониторинга

| Метрика | Значение |
|---|---|
| Размер JSON | **248 KB** (в памяти), 446 KB на диске с форматированием |
| Записей | 206 |
| Средняя запись | 1231 байт |
| Самая большая | `centro_abitato_vs_fuori` — 2 KB |

По прогнозу `DICTIONARY_SCALING_SKILL.md`: 300 записей → ~125 KB. **Реальность: 248 KB при 206 записях** — в ~2 раза больше прогноза. Причина: `related_question_ids` содержит в среднем 28 id на запись (лимит `link-questions.js` — 30), что само по себе добавляет ~300–400 байт на запись.

При целевых 300 записях реальный размер составит ~360 KB в памяти. Это **ниже порога оптимизации** (5 MB), загрузка на 3G займёт ~900 ms — допустимо. Кэш в `_entriesCache` срабатывает корректно.

---

### 3.3 Хардкод цветов в `StudyCard.jsx` — минорный риск

`DictionaryEntryCard.jsx` — чист от хардкода цветов.  
`StudyCard.jsx` содержит объект `TYPE_BADGE` с захардкоженными hex-цветами (`#fef3c7`, `#dbeafe` и т.д.). Эти значения **совпадают со спецификацией** из `SKILL_DICTIONARY.md` (секция 8), но не вынесены в CSS-переменные. Если дизайн-система изменится, потребуется правка в JS-коде, а не только в `global.css`.

Это **осознанный трейдоф** (inline style для badge — единственный разумный вариант для динамических цветов без CSS-in-JS), не архитектурная ошибка.

---

### 3.4 StudyCard использует `display: none` вместо `rotateY` — правильное решение

Flip-анимация в `StudyCard` реализована через `display: none / flex` переключение (CSS-класс `--flipped`), а **не** через `transform: rotateY` (который запрещён для iOS 12 в `SKILL_DICTIONARY.md`, секция 14). Это верное решение — анимация безопасна для iPad mini 2.

---

### 3.5 `validate-entries.js` легализует `weak_*` pattern — несоответствие SKILL

Валидатор содержит в `VALID_PATTERNS`:
```javascript
'false_bias', 'weak_false_bias',
'true_bias',  'weak_true_bias',
'neutral', 'context_dependent'
```

SKILL определяет только 4 допустимых значения. Это означает, что валидатор **не отловит** записи с `weak_*` как CRITICAL-ошибку, хотя должен.

---

### 3.6 `scaffold-entries.js` — отсутствие стоп-слов

Скрипт не фильтрует итальянские стоп-слова (`ad`, `nell`, `ed`, `posto`, `anche`). При запуске `--type terms --min-count 40` генерирует 105 заготовок, из которых значительная часть — бесполезные функциональные слова. Это не баг, но создаёт ручную работу по отбору.

---

## 4. Архитектурный комплаенс

| Проверка | Статус | Детали |
|---|---|---|
| Работа с данными только через `services/` | ✅ | `useDictionary.js` импортирует только из `dictionaryService.js` |
| CSS-переменные вместо хардкода | ✅ (в CSS) / ⚠️ (в JS) | StudyCard badge — inline hex, допустимо |
| `flexbox gap` отсутствует | ✅ | Только `margin-*` в dict-компонентах |
| `-webkit-overflow-scrolling: touch` | ✅ | TypeFilter, TopicFilter |
| `React.memo` на компоненты | ✅ | DictionaryEntryCard, StudyCard, TypeFilter, TopicFilter |
| `React.memo` на Icon | ✅ | Подтверждено |
| `max-height` transition (не `height: auto`) | ✅ | Аккордеон DictionaryEntryCard |
| `normalize('NFD')` для поиска с диакритикой | ✅ | `dictionaryService.searchEntries` |
| debounce в SearchBar | ✅ | Через `setTimeout`/`clearTimeout` |
| `loadDictionaryEntries` кэшируется | ✅ | `_entriesCache` в `dictionaryService.js` |
| Маршрут `/dictionary` зарегистрирован | ✅ | `App.jsx` |
| URL `?topic=N` работает | ✅ | `useSearchParams` в `DictionaryPage.jsx` |
| `padding-bottom: var(--nav-height)` | ✅ | `.dictionary-page` в `pages.css` |
| `import.meta.glob` для JSON | ✅ | `dictionaryService.js` |

Архитектурный комплаенс — **100%**. Нарушений "Архитектурного закона" не обнаружено.

---

## 5. Статус батч-плана (по DICTIONARY_SCALING_SKILL.md)

| Батч | Кандидаты | Статус |
|---|---|---|
| **Скрипты** (scaffold, validate) | — | ✅ реализованы |
| **A** Logic Triggers true_bias | regolare, trovare, modo, evitare, fermarsi, visibilita, manovra | ✅ все в entries.json |
| **B** Logic Triggers false_bias | area, parcheggio, ciclomotori, obbliga, vale, autocarri | ✅ все в entries.json |
| **C** Базовые термины (p1) | veicolo, semaforo, transito, pedoni, guida, marcia, striscia | ✅ все в entries.json |
| **D** Термины p2 (freq 80–200) | limite, km, luce, svoltare, pannello, corrispondenza | частично (проверить) |
| **E** Фразы | in presenza, strade extraurbane, pannello integrativo | частично |
| **F** Концепции | autostrada/extraurbana, veicolo/ciclomotore, corsia/carreggiata | частично |
| **Тематические батчи** | topics 1,5,3,10,4 | в процессе |

Батчи A, B, C **завершены полностью**. Общий прогресс по контенту соответствует рубежу "после батча E/F" из плана: ожидалось ~94 записей, реально **206** — проект **значительно опережает расписание**.

---

## 6. Action Plan

Задачи отсортированы по приоритету. Первые две — блокирующие (нарушение спецификации).

### 🔴 Приоритет 1 — Устранить расхождения со спецификацией

**Задача 1.1 — Нормализовать `weak_*` pattern в entries.json**

4 записи содержат нестандартные значения. Исправить вручную или скриптом:
- `sempre`: `weak_false_bias` → `false_bias`
- `tutti`: `weak_false_bias` → `false_bias`
- `unico`: `weak_false_bias` → `false_bias`
- `pericolo`: `weak_true_bias` → `true_bias`

Затем запустить `node scripts/link-questions.js` для подтверждения целостности.

**Задача 1.2 — Убрать `weak_*` из `VALID_PATTERNS` в `validate-entries.js`**

```javascript
// Было:
const VALID_PATTERNS = new Set([
  'false_bias', 'weak_false_bias',
  'true_bias',  'weak_true_bias',
  'neutral', 'context_dependent',
]);

// Стало (по SKILL):
const VALID_PATTERNS = new Set([
  'false_bias', 'true_bias', 'neutral', 'context_dependent',
]);
```

После этого `validate-entries.js` будет корректно выдавать CRITICAL для любых будущих `weak_*` значений.

**Verify:** `node scripts/validate-entries.js` → 0 CRITICAL, 1 WARNING (precedenza_a_sinistra).

---

**Задача 1.3 — Линковать `precedenza_a_sinistra`**

Единственная запись с `related_question_ids < 3`. Запустить:
```bash
node scripts/link-questions.js --entry precedenza_a_sinistra --dry-run
node scripts/link-questions.js --entry precedenza_a_sinistra
```

После — 0 WARNING.

---

### 🟡 Приоритет 2 — Улучшение инструментов

**Задача 2.1 — Добавить стоп-слова в `scaffold-entries.js`**

Скрипт генерирует нерелевантные кандидаты (`ad`, `nell`, `ed`, `anche`, `posto`). Добавить константу `STOP_WORDS` из итальянских функциональных слов и фильтровать до генерации заготовок. Это сократит ручную работу при запуске `--type terms`.

Примерный список для фильтрации: `ad, ed, od, al, del, della, nel, nella, degli, delle, per, con, che, non, una, uno, gli, le, da, in, di, su, se, ma, ci, si, lo, la, li, ho, ha, ha, hai, né, né`.

**Задача 2.2 — Добавить `--limit N` флаг в `scaffold-entries.js`**

При 105 кандидатах в выводе сложно работать. Флаг `--limit 20` покажет топ-20 по релевантности (count × bias_strength). Это не обязательно, но ускорит контентные батчи.

---

### 🟢 Приоритет 3 — Контентные батчи (основная работа)

Проект достиг 206 записей и опережает план. Следующие контентные шаги по DICTIONARY_SCALING_SKILL.md:

**Батч D — Термины p2** (если не все завершены): `limite`, `km/h` (числовые ловушки), `luce`, `svoltare`, `pannello integrativo`, `corrispondenza`, `emergenza`. Проверить через `node scripts/scaffold-entries.js --type terms --min-count 80`.

**Тематические батчи** — по ~15–20 записей на приоритетную тему:
1. **topic_1** (531 вопрос) — общие понятия, много базовых терминов
2. **topic_5** — обгоны, logic_triggers
3. **topic_3** — знаки, терминология
4. **topic_10** — светофоры, пересечения
5. **topic_4** — скоростные ограничения, числовые ловушки

Рабочий цикл для каждого батча:
```bash
node scripts/scaffold-entries.js --type terms --min-count 50
# → заполнить TODO вручную
node scripts/validate-entries.js          # 0 CRITICAL
node scripts/link-questions.js --dry-run  # проверить статистику
node scripts/link-questions.js            # применить
git commit -m "dict: батч [тема], +N записей"
```

---

### ℹ️ Не требует действий

- **index_by_topic.json / index_by_type.json** — не нужны до 500+ записей, фильтрация in-memory работает корректно.
- **StudyCard хардкод цветов** — архитектурно допустимо для inline badge-стилей.
- **BottomNav в DictionaryPage** — архитектура глобального рендера в App.jsx верна.
- **Размер entries.json** (~248 KB) — в пределах нормы, кэш работает.

---

## 7. Сводная таблица

| Категория | Статус | Критичность |
|---|---|---|
| Схема entries.json (CRITICAL-поля) | ✅ 0 нарушений | — |
| `weak_*` pattern в 4 записях | ⚠️ несоответствие SKILL | Низкая |
| `VALID_PATTERNS` в валидаторе | ⚠️ расширен сверх SKILL | Низкая |
| Архитектурный закон (services/) | ✅ соблюдён | — |
| iOS 12 compatibility | ✅ полная | — |
| Phase 3 v2 (StudyCard, ModeToggle, TopicFilter) | ✅ реализована | — |
| URL `?topic=N` | ✅ работает | — |
| Производительность | ✅ 248KB, кэш работает | — |
| Контентный прогресс (206/250 target) | ✅ 82% | — |
| Тематические батчи | ⏳ в процессе | — |
| Стоп-слова в scaffold | ⚠️ отсутствуют | Низкая |

**Итог:** проект в отличном техническом состоянии. Единственные реальные задачи — исправить `weak_*` pattern в 4 записях и продолжить контентные тематические батчи.