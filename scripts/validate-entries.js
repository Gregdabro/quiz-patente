#!/usr/bin/env node
/**
 * validate-entries.js
 * ===================
 * Проверяет src/data/dictionary/entries.json на соответствие схеме
 * и минимальным требованиям качества.
 *
 * Запуск:
 *   node scripts/validate-entries.js                    # полная проверка
 *   node scripts/validate-entries.js --strict           # + проверка related_entries
 *   node scripts/validate-entries.js --entry semaforo   # только одна запись
 *
 * Выходные коды:
 *   0 — нет CRITICAL ошибок
 *   1 — есть CRITICAL ошибки (блокирует merge)
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Аргументы CLI ───────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const STRICT  = args.includes('--strict');
const ONLY_ID = (() => { const i = args.indexOf('--entry'); return i !== -1 ? args[i+1] : null; })();

// ─── Пути ────────────────────────────────────────────────────────────────────

const ENTRIES_PATH = path.join(__dirname, '../src/data/dictionary/entries.json');

// ─── Константы схемы ─────────────────────────────────────────────────────────

const VALID_TYPES    = new Set(['term', 'phrase', 'logic_trigger', 'concept']);
const VALID_PATTERNS = new Set([
  'false_bias', 'true_bias', 'neutral', 'context_dependent',
]);
const VALID_PRIOS    = new Set([1, 2, 3]);

// Анти-паттерны в definition.ru — признак что написан как перевод, не объяснение
const ANTIPATTERNS_DEF = [
  /^переводится\s/i,
  /^означает\s/i,
  /^слово\s.{0,20}\bозначает\b/i,
  /^термин\s.{0,20}\bпереводится\b/i,
];

// ─── Типы ошибок ──────────────────────────────────────────────────────────────

function critical(id, msg) { return { level: 'CRITICAL', id, msg }; }
function warning(id, msg)  { return { level: 'WARNING',  id, msg }; }

// ─── Валидация одной записи ───────────────────────────────────────────────────

function validateEntry(entry, allIds) {
  const issues = [];
  const id = entry.id || '(нет id)';

  // ── CRITICAL ──

  // id: строка, snake_case, уникальность проверяется снаружи
  if (!entry.id || typeof entry.id !== 'string') {
    issues.push(critical(id, 'поле id отсутствует или не строка'));
  } else if (!/^[a-z0-9_]+$/.test(entry.id)) {
    issues.push(critical(id, `id содержит недопустимые символы: "${entry.id}" (разрешено: a-z, 0-9, _)`));
  }

  // term
  if (!entry.term || typeof entry.term !== 'string' || entry.term.trim() === '') {
    issues.push(critical(id, 'поле term отсутствует или пустое'));
  }

  // term_ru
  if (!entry.term_ru || typeof entry.term_ru !== 'string') {
    issues.push(critical(id, 'поле term_ru отсутствует'));
  } else if (entry.term_ru === 'TODO') {
    issues.push(critical(id, 'term_ru = "TODO" — не заполнено'));
  } else if (entry.term && entry.term_ru === entry.term) {
    issues.push(critical(id, `term_ru совпадает с term — скопировано вместо перевода`));
  }

  // type
  if (!VALID_TYPES.has(entry.type)) {
    issues.push(critical(id, `неверный type: "${entry.type}" (допустимо: ${[...VALID_TYPES].join(', ')})`));
  }

  // priority
  if (!VALID_PRIOS.has(entry.priority)) {
    issues.push(critical(id, `неверный priority: ${entry.priority} (допустимо: 1, 2, 3)`));
  }

  // definition.ru
  if (!entry.definition || !entry.definition.ru) {
    issues.push(critical(id, 'поле definition.ru отсутствует'));
  } else if (entry.definition.ru === 'TODO' || entry.definition.ru.includes('TODO')) {
    issues.push(critical(id, 'definition.ru содержит TODO — не заполнено'));
  } else if (entry.definition.ru.length < 80) {
    issues.push(critical(id, `definition.ru слишком короткая (${entry.definition.ru.length} симв., минимум 80)`));
  }

  // quiz_hint.ru
  if (!entry.quiz_hint || !entry.quiz_hint.ru) {
    issues.push(critical(id, 'поле quiz_hint.ru отсутствует'));
  } else if (entry.quiz_hint.ru === 'TODO' || entry.quiz_hint.ru.includes('TODO')) {
    issues.push(critical(id, 'quiz_hint.ru содержит TODO — не заполнено'));
  } else if (entry.quiz_hint.ru.length < 60) {
    issues.push(critical(id, `quiz_hint.ru слишком короткая (${entry.quiz_hint.ru.length} симв., минимум 60)`));
  }

  // quiz_hint.pattern
  if (!entry.quiz_hint || !VALID_PATTERNS.has(entry.quiz_hint.pattern)) {
    const got = entry.quiz_hint ? entry.quiz_hint.pattern : 'отсутствует';
    issues.push(critical(id, `неверный quiz_hint.pattern: "${got}" (допустимо: ${[...VALID_PATTERNS].join(', ')})`));
  }

  // examples: должен быть массив с ≥1 элементом
  if (!Array.isArray(entry.examples) || entry.examples.length === 0) {
    issues.push(critical(id, 'examples пустой или отсутствует — нужен минимум 1 пример'));
  } else {
    for (let i = 0; i < entry.examples.length; i++) {
      const ex = entry.examples[i];
      if (typeof ex.answer !== 'boolean') {
        issues.push(critical(id, `examples[${i}].answer не boolean — это "${ex.answer}" (тип: ${typeof ex.answer})`));
      }
      if (!ex.it || ex.it.trim() === '') {
        issues.push(critical(id, `examples[${i}].it отсутствует или пустое`));
      }
      if (!ex.ru || ex.ru.trim() === '') {
        issues.push(critical(id, `examples[${i}].ru отсутствует или пустое`));
      }
    }
  }

  // topics — обязательный массив (может быть пустым в scaffold, но будет warning)
  if (!Array.isArray(entry.topics)) {
    issues.push(critical(id, 'поле topics не массив'));
  }

  // ── WARNING ──

  // topics пустой
  if (Array.isArray(entry.topics) && entry.topics.length === 0) {
    issues.push(warning(id, 'topics пустой массив — заполнить вручную'));
  }

  // related_question_ids < 3
  if (!Array.isArray(entry.related_question_ids) || entry.related_question_ids.length < 3) {
    const count = Array.isArray(entry.related_question_ids) ? entry.related_question_ids.length : 0;
    issues.push(warning(id, `related_question_ids: ${count} (минимум 3) — запустить link-questions.js`));
  }

  // examples[].comment_ru отсутствует
  if (Array.isArray(entry.examples)) {
    for (let i = 0; i < entry.examples.length; i++) {
      const ex = entry.examples[i];
      if (!ex.comment_ru || ex.comment_ru.trim().length < 20) {
        issues.push(warning(id, `examples[${i}].comment_ru отсутствует или слишком короткий`));
      }
    }
  }

  // definition.ru — анти-паттерны (перевод вместо объяснения)
  if (entry.definition && entry.definition.ru) {
    for (const pattern of ANTIPATTERNS_DEF) {
      if (pattern.test(entry.definition.ru)) {
        issues.push(warning(id, `definition.ru начинается с анти-паттерна (похоже на перевод, а не объяснение)`));
        break;
      }
    }
  }

  // _scaffold_hint — заготовка не была очищена
  if (entry._scaffold_hint !== undefined) {
    issues.push(warning(id, 'поле _scaffold_hint присутствует — удалить перед merge'));
  }

  // STRICT: related_entries ссылаются на несуществующие id
  if (STRICT && Array.isArray(entry.related_entries) && allIds) {
    for (const ref of entry.related_entries) {
      if (!allIds.has(ref)) {
        issues.push(warning(id, `related_entries содержит "${ref}" — такой записи нет в entries.json`));
      }
    }
  }

  return issues;
}

// ─── Главная функция ──────────────────────────────────────────────────────────

function main() {
  console.log('✅ Quiz Patente — Dictionary Validator');
  console.log('══════════════════════════════════════\n');

  if (!fs.existsSync(ENTRIES_PATH)) {
    console.error('❌ Файл не найден: src/data/dictionary/entries.json');
    process.exit(1);
  }

  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf8'));
  } catch (e) {
    console.error(`❌ Ошибка парсинга JSON: ${e.message}`);
    process.exit(1);
  }

  // Фильтр на конкретную запись
  const toValidate = ONLY_ID ? entries.filter(e => e.id === ONLY_ID) : entries;
  if (ONLY_ID && toValidate.length === 0) {
    console.error(`❌ Запись с id="${ONLY_ID}" не найдена`);
    process.exit(1);
  }

  console.log(`Validating entries.json (${entries.length} entries${ONLY_ID ? `, показываем только "${ONLY_ID}"` : ''})...\n`);

  // Собираем все id для cross-reference (STRICT)
  const allIds = new Set(entries.map(e => e.id));

  // Проверка уникальности id
  const idCount = {};
  for (const e of entries) {
    idCount[e.id] = (idCount[e.id] || 0) + 1;
  }

  const allIssues = [];

  // Дубликаты id — critical
  for (const [id, count] of Object.entries(idCount)) {
    if (count > 1) {
      allIssues.push(critical(id, `id встречается ${count} раза — дубликат`));
    }
  }

  // Валидация каждой записи
  for (const entry of toValidate) {
    const issues = validateEntry(entry, allIds);
    allIssues.push(...issues);
  }

  // ── Группировка результатов ──
  const criticals = allIssues.filter(i => i.level === 'CRITICAL');
  const warnings  = allIssues.filter(i => i.level === 'WARNING');
  const okCount   = toValidate.length - new Set(criticals.map(i => i.id)).size;

  if (criticals.length > 0) {
    console.log(`❌ CRITICAL (${criticals.length}):`);
    for (const issue of criticals) {
      console.log(`  [${issue.id}] ${issue.msg}`);
    }
    console.log();
  }

  if (warnings.length > 0) {
    console.log(`⚠️  WARNING (${warnings.length}):`);
    for (const issue of warnings) {
      console.log(`  [${issue.id}] ${issue.msg}`);
    }
    console.log();
  }

  if (criticals.length === 0 && warnings.length === 0) {
    console.log('🎉 Все записи прошли валидацию без замечаний!\n');
  }

  console.log(`✅ OK: ${okCount} из ${toValidate.length} записей без CRITICAL ошибок`);

  if (criticals.length > 0) {
    console.log(`\n🚫 Исправь CRITICAL ошибки перед merge в entries.json`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`\n💡 WARNING ошибки не блокируют, но желательно исправить`);
  }

  process.exit(0);
}

main();
