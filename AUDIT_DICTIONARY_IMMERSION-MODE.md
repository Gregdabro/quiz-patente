Достаточно данных для полного аудита. Теперь составляю финальный отчёт.Теперь у меня все данные. Пишу финальный отчёт.

---

## Аудит Quiz Patente — Dictionary + Immersion Mode

**Дата:** 30 апреля 2026  
**Версия entries.json:** 241 запись  
**Вопросов в базе:** 7144 (25 тем)

---

## 1. Executive Summary

**Общий статус системы: 🟡 RISKY**

Кодовая архитектура корректна. Словарь как данные — частично некорректен. Immersion Mode как алгоритм — работает, но на плохих данных. Ни одна из проблем не делает систему полностью неработоспособной, но вместе они создают систематический педагогический дефект: пользователю показываются карточки и квиз-вопросы, семантически не связанные с тем что он учит.

**Топ-5 критических проблем:**

1. **Архитектурная ошибка линковки**: `link-questions.js` ищет термин в `text + comment`, но пользователь видит только `text`. В результате 52% всех 6780 линков основаны на вхождении слова в *комментарий*, а не в *вопрос*. Именно это — корневая причина `is_exists: false` в `report.json`.

2. **39% карточек в Immersion Mode — "загрязнённые"**: В Stage 1/2 попадают entries, чей term отсутствует в тексте вопросов чанка (только в комментариях). Пользователь изучает слово, а потом в квизе не видит его ни разу.

3. **16 из 41 logic_trigger имеют неверный `pattern`**: `sempre`, `almeno`, `solo`, `fino`, `ore`, `trova` и другие объявлены с bias, который не подтверждается реальными данными по всей базе вопросов.

4. **522 "мёртвых" линка**: 34 записи имеют linked IDs, где term отсутствует даже в comment — ни `text`, ни `comment` не содержат слово. Это артефакты MANUAL_OVERRIDES в link-questions.js, которые добавляют синонимы и альтернативные паттерны, но не обновляют сами данные.

5. **49 записей с anti-pattern "означает"** в `definition.ru`: Нарушает прямое требование SKILL_DICTIONARY.md. Определения объясняют перевод, а не логику ПДД.

---

## 2. Critical Issues (Blockers)

### Issue #1 — Архитектурная ошибка: comment-based linking

**Проблема.** `link-questions.js` в строке 205–206 делает:
```javascript
const comment = (q.comment && q.comment.text) ? q.comment.text : '';
return normalize(text + ' ' + comment);
```
Поиск термина ведётся по `text + comment`. Но в Practice Mode и Immersion Mode пользователю показывается только `question.text`. Термин присутствует в объяснении ответа (comment), но не в самом вопросе.

**Доказательство из report.json.** `almeno` → `qid=6`:
- `text`: "In una carreggiata extraurbana del tipo rappresentato si può **sempre** marciare per file parallele" — слова `almeno` нет
- `comment`: "...è consentita SOLO quando la carreggiata ha **almeno** due corsie..." — слово есть

**Масштаб:**

| Положение термина | Кол-во линков | % |
|---|---|---|
| В тексте вопроса (`text`) | 2683 | 39% |
| Только в комментарии (`comment`) | 3575 | 52% |
| Нигде не найден | 522 | 7% |

По типам наиболее пострадавшие — `logic_trigger` (59% линков через comment) и `concept` (40% через comment + 28% нигде).

**Корневая причина.** Дизайн-решение при написании скрипта: считалось, что "термин релевантен, если он объясняется в комментарии к вопросу". Это верно для обучения через контекст, но ломает семантику Practice Mode и Immersion Stage 1/2.

**Влияние.** Критическое для обоих режимов:
- Practice Mode: пользователь видит вопросы, которые на первый взгляд не содержат изучаемый термин
- Immersion: карточка показывает термин, которого нет в тексте ни одного вопроса чанка

**Fix.** В link-questions.js нужно разделить два типа линков и сохранять их раздельно:
```javascript
// Вместо единого поля related_question_ids:
"related_question_ids": [318],          // term в question.text
"context_question_ids": [6, 37, 38...]  // term только в comment
```
Immersion Mode использует только `related_question_ids`. Practice Mode может использовать оба поля (с пометкой в UI).

---

### Issue #2 — 39% карточек Immersion "загрязнены"

**Проблема.** Алгоритм `getChunkData` из плана:
```javascript
const relevantEntries = allEntries.filter(entry =>
  entry.related_question_ids.some(id => questionIds.has(id))
);
```
Условие выполняется, если хотя бы один ID из `related_question_ids` попадает в чанк. Но поскольку 52% линков основаны на comment-matching, entry попадает в Stage 1/2 через связь по комментарию.

**Конкретные примеры для чанка 0 темы 1:**

Entry `consentita` попадает в Stage 1 через `qid=1` (linked), но в тексте qid=1 ("In una carreggiata del tipo rappresentato si può sorpassare anche in curva") слова `consentita/consentito` нет. Оно есть в comment к этому вопросу. Пользователь изучает карточку про "consentita", проходит 20 вопросов чанка — и не встречает это слово ни разу.

**Масштаб по первым 5 чанкам темы 1:**

| Чанк | Всего entries | "Загрязнённых" | % |
|---|---|---|---|
| 0 | 51 | 25 | 49% |
| 1 | 55 | 16 | 29% |
| 2 | 52 | 20 | 38% |
| 3 | 52 | 23 | 44% |
| 4 | 45 | 17 | 37% |

**Fix.** После введения двух полей (Issue #1) — фильтровать Stage 1/2 строго по `related_question_ids` (text-based). Записи из `context_question_ids` можно показывать как "бонусный контекст" после квиза, но не в предквизовой подготовке.

---

### Issue #3 — 16 logic_trigger с неверным `pattern`

**Проблема.** Bias вычислялся по `related_question_ids` (30 вопросов, из которых многие связаны через comment). При проверке по всей базе (реальные вхождения в тексте вопросов) паттерн не подтверждается.

**Список записей с расхождением (реальный n >= 60):**

| entry | term | объявлен | реальный | VERO | FALSO | n |
|---|---|---|---|---|---|---|
| `sempre` | sempre | false_bias | neutral | 29 | 53 | 82 |
| `solo` | solo | false_bias | false_bias ✓ | 61 | 185 | 246 |
| `almeno` | almeno | false_bias | neutral | 27 | 40 | 67 |
| `metros` | metri | false_bias | neutral | 66 | 119 | 185 |
| `obbliga` | obbliga | false_bias | neutral | 126 | 169 | 295 |
| `ore` | ore | false_bias | neutral | 438 | 437 | 875 |
| `indica` | indica | false_bias | neutral | 488 | 681 | 1169 |
| `trova` | trova | false_bias | neutral | 105 | 96 | 201 |
| `vale` | vale | false_bias | neutral | 24 | 37 | 61 |
| `pericolo` | pericolo | true_bias | neutral | 197 | 116 | 313 |
| `prima` | prima | true_bias | neutral | 131 | 77 | 208 |
| `dopo` | dopo | true_bias | neutral | 93 | 68 | 161 |
| `necessario` | necessario | true_bias | neutral | 80 | 48 | 128 |
| `maggiore` | maggiore | true_bias | neutral | 41 | 28 | 69 |
| `fino` | fino | false_bias | neutral | 26 | 46 | 72 |
| `immediatamente` | immediatamente | false_bias | neutral | 12 | 17 | 29 |

Особо опасные: `ore` (n=875, 50/50 — совершенно нейтральное слово), `indica` (n=1169, 58% FALSO — граница, но не bias), `sempre` (n=82, 64% FALSO — близко, но не достигает порога 65%).

**Корневая причина.** Bias вычислялся на маленькой выборке из 30 related_question_ids, которые отобраны нерепрезентативно (включают comment-based линки). Плюс ручное присвоение pattern без статистической верификации.

**Fix.** Запустить `analyze-dictionary.js --bias-only` по тексту вопросов (не comment) и обновить pattern. Порог для bias: ≥65% в одну сторону при n≥30.

---

### Issue #4 — 522 "мёртвых" линка (term нигде не найден)

**Проблема.** 34 записи имеют linked question IDs, где термин не найден ни в `text`, ни в `comment`. Это происходит из-за `MANUAL_OVERRIDES` в link-questions.js: скрипт использует синонимы (`alcol`, `sostanze stupefacenti`, `droga` для `alcol_e_droga`), находит вопросы по синонимам, но запись в entries.json хранит `term: 'alcol e sostanze stupefacenti'` — и при проверке ни одного вхождения целой фразы не находится.

**Примеры:**

| entry | term | мёртвых линков | причина |
|---|---|---|---|
| `intersezione` | intersezione (a T / a X) | 30/30 | скобки ломают split по `/` |
| `alcol_e_droga` | alcol e sostanze stupefacenti | 30/30 | MANUAL_OVERRIDE ищет по синонимам |
| `rc_auto` | R.C. Auto (Responsabilità Civile Auto) | 30/30 | скобки и точки ломают поиск |
| `tonnellate` | tonnellate (t) | 30/30 | скобки |
| `punti` | punti (patente a punti) | 30/30 | скобки |
| `stop_segnale` | fermarsi e dare precedenza (STOP) | 29/30 | скобки |

**Паттерн**: скобки в term ломают split-логику. MANUAL_OVERRIDES работают при линковке, но term в entries.json остаётся с оригинальным (нечистым) значением.

**Fix.** Очистить `term` от пояснений в скобках — они должны быть в `definition.ru`. Либо добавить в validate-entries.js проверку: `term` не должен содержать скобки.

---

## 3. Data Quality Issues

### 3.1 "Означает" anti-pattern в definition.ru

**Масштаб: 49 из 241 записи (20%).**

SKILL_DICTIONARY.md явно запрещает: *"НЕ ПИСАТЬ: «Означает регулирование движения»"*. Записи с этим паттерном объясняют перевод, а не механику ПДД и логику вопросов. Примеры нарушителей: `area_di_servizio`, `attenzione`, `consentita`, `divieto`, `evitare`, `fermarsi` и ещё 43 записи.

Это системная проблема батчевой генерации: LLM-шаблон для definition.ru сводился к "термин означает X", вместо объяснения "почему это важно для квиза и какие правила работают".

### 3.2 Семантически некорректные concepts

Записи `facolta`, `divieto`, `obbligo`, `forza_centrifuga`, `stabilita_veicolo`, `responsabilita_civile`, `responsabilita_penale`, `risarcimento_danni`, `inquinamento_atmosferico`, `pneumatici_e_ambiente`, `manutenzione_ordinaria` отнесены к типу `concept`, но не являются парными противопоставлениями. Тип `concept` по архитектуре — это "парные оппозиции" (sosta vs fermata, obbligo vs facoltà). Одиночные концепции должны быть `term`.

Из 22 concept-записей реально парными являются ~10. Остальные 12 — это термины или группы терминов, ошибочно классифицированные как concepts.

### 3.3 logic_trigger с `pattern: neutral` (1 запись)

`consente` имеет `type: logic_trigger` и `pattern: neutral`. По определению logic_trigger — это предиктор ответа. Нейтральный предиктор — оксюморон. Запись должна быть переклассифицирована в `term` или `phrase`.

### 3.4 Phrases с 1–2 словами (17 записей)

`dei_veicoli`, `la_velocita`, `puo_essere`, `raffigurato_indica` — двусловные или однословные, что противоречит типу `phrase` ("устойчивые конструкции"). Часть из них (`raffigurato_indica`, `raffigurato_vieta`, `raffigurato_preannuncia`) — шаблонные фразы квиза, что корректно, но граница с `logic_trigger` размыта.

---

## 4. Linking Issues (related_question_ids)

### Полная картина

| Тип проблемы | Кол-во линков | % от 6780 |
|---|---|---|
| Term в `text` (валидные) | 2683 | 39% |
| Term только в `comment` | 3575 | 52% |
| Term нигде не найден ("мёртвые") | 522 | 7% |

### По типам записей

| Тип записи | Валидных (text) | Comment-only | Нигде | Всего |
|---|---|---|---|---|
| term | 41% | 52% | 5% | 3764 |
| phrase | 39% | 51% | 8% | 1177 |
| logic_trigger | 37% | 59% | 2% | 1230 |
| concept | 30% | 40% | 28% | 609 |

`concept` — наихудший тип: 28% мёртвых линков (176 из 609). Это следствие того, что concepts используют `vs`-паттерн и MANUAL_OVERRIDES, которые часто не совпадают с фактическим term в entries.

### Конкретные примеры из report.json

`almeno`: из 30 linked IDs — 4 содержат слово в text, 26 — только в comment. Реально вопросов с `almeno` в базе — 67, но в related_question_ids нет ни одного "правильного" ID из топ реальных вхождений (`134`, `318`, `324`... — только `318` попал случайно).

`attenzione`: из 30 linked IDs — ~9 содержат term в text (хорошо для true_bias с n=9). Но 21 — через comment. Паттерн `true_bias` подтверждён реально (88% VERO по text-only выборке).

`prima`: из 30 linked IDs — только 3 содержат term в text. По всей базе (n=208) — true_bias не подтверждается (63% VERO, нужно ≥65%).

---

## 5. Practice Mode Audit

**Статус: работает функционально, семантически ненадёжен.**

Practice Mode (Quiz Link `dict:*`) фильтрует вопросы по `related_question_ids`. Поскольку 52% этих ID — comment-based, пользователь видит вопросы где изучаемый термин отсутствует в видимом тексте. С точки зрения UX это выглядит как баг: "Я учу слово `almeno`, нажимаю практиковать — и вижу вопросы про автострады без единого `almeno`."

Из 5 вопросов для `almeno` в report.json — 4 имеют `is_exists: false`. Это значит скрипт аудита (который генерировал report.json) проверял только `question.text` — и корректно детектировал проблему.

**Отдельная проблема:** пользователь не получает объяснения почему этот вопрос связан с термином. Если бы UI показывал "этот вопрос связан через контекст объяснения", восприятие было бы совершенно другим. Контекстные линки (через comment) педагогически ценны — просто они не должны смешиваться с прямыми линками.

---

## 6. Immersion Mode Audit

### Stage 1 и Stage 2

**Алгоритм корректен, данные — нет.**

`getChunkData` правильно разделяет entries по типу (`logic_trigger`/`term` → Stage 1, `phrase`/`concept` → Stage 2) и правильно ограничивает 12 и 8 карточками. Проблема — в исходных данных для join.

**Нарушение архитектурного принципа:** IMMERSION_MODE_PLAN явно пишет:

> "Флешкарты показывают ONLY записи из entries.json... related_question_ids в entries.json — основа join'а между чанком и словарём"

Имплицитное предположение плана: `related_question_ids` содержат вопросы, в тексте которых присутствует термин. Это предположение нарушено на уровне данных.

**Конкретный пример — чанк 0 темы 1, Stage 1:**

Топ-12 карточек включают: `agente_traffico`, `consentita`, `incrocio`, `lanterna_semaforica`, `semaforo`. Ни один из этих терминов не присутствует в тексте 20 вопросов чанка 0. Тексты чанка — исключительно про `carreggiata`, `corsia`, `sorpasso`, `marcia`. Пользователь изучает "светофор" и "агент дорожного движения", а потом проходит 20 вопросов про обгоны и полосы — полная несвязность.

**Риск Global Vocabulary State:** поскольку загрязнённые entries помечаются как "learned" через `markWordsLearned`, они исключаются из последующих чанков. Но пользователь их фактически не встречал в вопросах. Это создаёт скрытый дефицит: важные термины исчезают из будущих сессий не потому что выучены, а потому что были случайно показаны в нерелевантном чанке.

### Скрытый риск: leaking entries между чанками

Записи с большим количеством related_question_ids (30 максимум по скрипту) попадают в многие чанки. `corsia_vs_carreggiata` с 30 linked IDs из темы 1 попадает в чанки 0–1 (19 из 30 вопросов — в чанке 0). После первого чанка этот concept помечается как learned и исчезает из всех последующих — хотя в реальных текстах вопросов чанка 0 эти понятия встречались часто.

---

## 7. Системные корневые причины

### A. Data Pipeline Flaw (главная причина)

`link-questions.js` принял архитектурное решение: искать term в `text + comment`. Это решение не было задокументировано как потенциально проблемное. В результате вся база `related_question_ids` смешивает два семантически разных типа связи: "термин в вопросе" и "термин в объяснении ответа".

Оба типа педагогически ценны, но для разных целей. Смешение делает невозможным правильный отбор для Practice Mode и Immersion.

### B. Modeling Flaw

`pattern` вычислялся по выборке из 30 linked question IDs — не по всей базе. Это статистически ненадёжно: выборка смещена (берутся первые 30 найденных, а не случайные), и contaminated comment-based линками. Порог bias (65%) правильный, но входные данные неверные.

Также: тип `concept` определён как "парные оппозиции", но 12 из 22 записей — одиночные термины. Отсутствие валидации типа против структуры term позволило накопить неверные классификации.

### C. Implementation Flaw (minor)

`validate-entries.js` проверяет длину полей и наличие TODO, но не проверяет:
- Совпадение `type` с семантикой `term` (concept без vs//, logic_trigger с neutral pattern)
- Скобки в `term`
- Реальный bias на основе `question.text` (не `related_question_ids`)

Отсутствие этих проверок позволило проблемам накопиться незамеченными.

---

## 8. Fix Plan

### Phase 1 — Быстрые правки (1–2 дня)

**1.1. Разделить related_question_ids на два поля в link-questions.js**

```javascript
// Изменить вывод скрипта:
entry.related_question_ids = textMatchIds;    // term в question.text
entry.context_question_ids = commentMatchIds; // term только в comment
```

Запустить `node scripts/link-questions.js` — это перегенерирует entries.json с двумя полями. Добавить в `getChunkData` (Immersion) и Practice Mode фильтрацию строго по `related_question_ids`.

**1.2. Исправить 34 записи с "мёртвыми" линками**

Очистить `term` от скобок с пояснениями (перенести в `definition.ru`):
- `intersezione (a T / a X)` → `intersezione`  
- `R.C. Auto (Responsabilità Civile Auto)` → `RC Auto`  
- `tonnellate (t)` → `tonnellate`  
- `punti (patente a punti)` → `punti della patente`

После этого перегенерировать линки. Проверить: `node scripts/validate-entries.js --strict`.

**1.3. Обновить `pattern` для 16 logic_triggers**

Запустить реальный bias-расчёт по `question.text` (не comment) для всех logic_triggers. Обновить pattern тех записей где реальный bias < 65%:

```
sempre → neutral (реальный 64% FALSO, близко но не достигает)
almeno → neutral
ore → neutral (50/50 — полностью нейтральное)
trova → neutral
dopo → neutral
prima → neutral
metri → neutral (64% FALSO)
и т.д.
```

**1.4. Переклассифицировать `consente`**

`type: logic_trigger` + `pattern: neutral` — противоречие. Изменить на `type: term`.

---

### Phase 2 — Структурные правки (3–5 дней)

**2.1. Переклассифицировать 12 concept-записей**

Записи без `vs` или `/` в term — переводить в `term`:

```
facolta → term
divieto → term (уже есть как самостоятельный юридический термин)
obbligo → term
forza_centrifuga → term
stabilita_veicolo → term
responsabilita_civile → term
responsabilita_penale → term
risarcimento_danni → term
inquinamento_atmosferico → term
pneumatici_e_ambiente → term (или phrase)
manutenzione_ordinaria → term
```

**2.2. Исправить anti-pattern "означает" в 49 definition.ru**

Переписать definition.ru для всех 49 записей по шаблону из SKILL_DICTIONARY.md: механизм работы + правовой контекст + почему важно для квиза. Можно батчами по типу.

**2.3. Добавить новые проверки в validate-entries.js**

```javascript
// Новые CRITICAL правила:
// 1. concept без 'vs' или '/' в term → предупреждение "возможно неверный тип"
// 2. logic_trigger с pattern: neutral → ошибка
// 3. term содержит скобки → ошибка
// 4. Проверка real_bias по question.text (не related_question_ids)
```

**2.4. Обновить getChunkData в Immersion Mode**

После разделения полей — обновить фильтр:

```javascript
// Было:
const relevantEntries = allEntries.filter(entry =>
  entry.related_question_ids.some(id => questionIds.has(id))
);

// Станет:
const relevantEntries = allEntries.filter(entry =>
  (entry.related_question_ids || []).some(id => questionIds.has(id))
);
// context_question_ids не используется для Stage 1/2
```

---

### Phase 3 — Идеальная архитектура (1–2 недели)

**3.1. Разделить entries.json на text-linked и context-enriched**

Создать pipeline с тремя типами связи:

| Поле | Семантика | Используется в |
|---|---|---|
| `related_question_ids` | term в question.text | Immersion Stage 1/2, Practice Mode (primary) |
| `context_question_ids` | term в comment | Practice Mode (secondary, с пометкой) |
| `examples[].question_id` | ручной выбор лучшего примера | FlashCard пример |

**3.2. Валидация bias на всей базе**

Добавить в analyze-dictionary.js режим `--validate-patterns`, который:
1. Для каждого logic_trigger берёт question IDs из `related_question_ids`
2. Подсчитывает VERO/FALSO только по `question.text`
3. Сравнивает с declared pattern
4. Выводит список расхождений

**3.3. UI-разграничение в Practice Mode**

При показе вопросов из `context_question_ids` — добавить метку "этот термин встречается в объяснении ответа". Это педагогически ценно (контекстное обучение) и устраняет недоумение пользователя.

---

## 9. Validation Strategy

После каждой фазы правок — обязательная верификация:

**После Phase 1:**

```bash
# Проверить что все related_question_ids содержат term в text
node scripts/validate-entries.js --strict

# Вывод должен показать:
# ✅ 0 CRITICAL
# ⚠️ 0 WARNING по related_question_ids
```

Ручная проверка: открыть Practice Mode для `almeno` → убедиться что все вопросы содержат слово `almeno` в тексте.

**После Phase 2:**

Симулировать Immersion Mode скриптом:

```javascript
// scripts/validate-immersion.js
// Для каждого чанка каждой темы:
// 1. Вычислить getChunkData
// 2. Для каждого entry в stage1Cards и stage2Cards:
//    проверить что term содержится в тексте хотя бы одного вопроса чанка
// 3. Вывести % "загрязнённых" карточек
// Цель: < 5% (с учётом морфологии)
```

**Ключевые метрики после исправлений:**

| Метрика | Текущее | Цель |
|---|---|---|
| % линков через text | 39% | ≥ 85% |
| "Загрязнённых" карточек в Immersion | ~39% | < 5% |
| logic_triggers с верным pattern | 25/41 (61%) | 41/41 (100%) |
| "Мёртвых" линков | 522 (7%) | 0 |
| definition.ru без anti-pattern | 192/241 | 241/241 |