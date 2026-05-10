# TODO: Dictionary & Immersion Mode Fixes

This list is extracted from the `AUDIT_DICTIONARY_IMMERSION-MODE.md` file and contains the actionable items needed to fix the data and logic issues in the Dictionary module.

## Phase 1 — Быстрые правки

- [ ] **1.1. Разделить `related_question_ids` на два поля в `link-questions.js`**
  - Создать два поля: `related_question_ids` (term in question.text) и `context_question_ids` (term in comment).
  - Обновить `getChunkData` (Immersion) и Practice Mode для фильтрации строго по `related_question_ids`.
- [ ] **1.2. Исправить 34 записи с "мёртвыми" линками**
  - Очистить `term` от скобок с пояснениями (например: `intersezione (a T / a X)` → `intersezione`, перенести старое в `definition.ru`).
  - Перегенерировать линки и проверить через `validate-entries.js --strict`.
- [ ] **1.3. Обновить `pattern` для 16 `logic_triggers`**
  - Запустить реальный bias-расчёт по `question.text` (не comment) для всех `logic_triggers`.
  - Обновить `pattern` у записей, где реальный bias < 65% (например, `sempre`, `almeno`, `ore` → `neutral`).
- [ ] **1.4. Переклассифицировать `consente`**
  - Изменить `type` с `logic_trigger` на `term` (так как pattern: neutral).

## Phase 2 — Структурные правки

- [ ] **2.1. Переклассифицировать 12 concept-записей**
  - Записи без `vs` или `/` в term перевести в тип `term` (напр. `facolta`, `divieto`, `obbligo`).
- [ ] **2.2. Исправить anti-pattern "означает" в 49 `definition.ru`**
  - Переписать определения по шаблону (механизм работы + правовой контекст + важность для квиза), убрав формулировки "Означает...".
- [ ] **2.3. Добавить новые проверки в `validate-entries.js`**
  - `concept` без 'vs' или '/' в term → WARNING.
  - `logic_trigger` с `pattern: neutral` → ERROR.
  - `term` содержит скобки → ERROR.
  - Проверка `real_bias` по `question.text`.
- [ ] **2.4. Обновить `getChunkData` в Immersion Mode**
  - Фильтровать карточки для Stage 1/2 строго по `entry.related_question_ids`.

## Phase 3 — Идеальная архитектура

- [ ] **3.1. Разделить `entries.json` на text-linked и context-enriched**
  - Утвердить схему с `related_question_ids`, `context_question_ids` и `examples[].question_id`.
- [ ] **3.2. Валидация bias на всей базе**
  - Добавить в `analyze-dictionary.js` режим `--validate-patterns` для проверки заявленных паттернов по всем вопросам базы.
- [ ] **3.3. UI-разграничение в Practice Mode**
  - Добавить метку "Этот термин встречается в объяснении ответа", когда вопрос показывается из `context_question_ids`.
