#!/usr/bin/env node
/**
 * scaffold-entries.js
 * ===================
 * Генерирует JSON-заготовки Entry из candidates.json для ручного заполнения.
 * Пропускает термины, уже присутствующие в entries.json.
 *
 * Запуск:
 *   node scripts/scaffold-entries.js                       # все кандидаты (дефолтные пороги)
 *   node scripts/scaffold-entries.js --type logic          # только logic_triggers
 *   node scripts/scaffold-entries.js --type terms          # только термины (term)
 *   node scripts/scaffold-entries.js --type phrases        # только фразы (phrase)
 *   node scripts/scaffold-entries.js --min-bias 25         # минимальный bias_strength
 *   node scripts/scaffold-entries.js --min-count 50        # минимальная частота
 *   node scripts/scaffold-entries.js --type logic --min-bias 25
 *
 * Выходной файл: scripts/output/scaffold_[type]_YYYY-MM-DD.json
 *
 * После генерации:
 *   1. Открыть выходной файл
 *   2. Заполнить поля term_ru, definition.ru, quiz_hint.ru, examples
 *   3. Добавить заполненные записи в src/data/dictionary/entries.json
 *   4. Запустить: node scripts/validate-entries.js
 *   5. Запустить: node scripts/link-questions.js --dry-run
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Аргументы CLI ───────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const getArg   = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i+1] ? args[i+1] : def; };
const hasFlag  = (flag) => args.includes(flag);

const TYPE_FILTER = getArg('--type', 'all');   // all | logic | terms | phrases
const MIN_BIAS    = parseInt(getArg('--min-bias',  '20'), 10);
const MIN_COUNT   = parseInt(getArg('--min-count', '40'), 10);

// ─── Пути ────────────────────────────────────────────────────────────────────

const CANDIDATES_PATH = path.join(__dirname, 'output/candidates.json');
const ENTRIES_PATH    = path.join(__dirname, '../src/data/dictionary/entries.json');
const OUTPUT_DIR      = path.join(__dirname, 'output');

// ─── Стоп-слова (функциональные слова итальянского) ────────────────────────────

const STOP_WORDS = new Set([
  'ad', 'ed', 'od', 'al', 'del', 'della', 'dell', 'dei', 'degli', 'delle',
  'nel', 'nella', 'nell', 'nei', 'negli', 'nelle', 'per', 'con', 'che', 'non',
  'una', 'uno', 'un', 'gli', 'le', 'li', 'lo', 'la', 'da', 'in', 'di', 'su', 'se', 'ma',
  'ci', 'si', 'e', 'o', 'è', 'ho', 'ha', 'hai', 'hanno', 'né', 'ne', 'anche',
  'posto', 'raffigurato', 'veicoli', 'presenza',
]);

function isStopWord(term) {
  const normalized = term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return STOP_WORDS.has(normalized);
}

// ─── Нормализация термина → id ────────────────────────────────────────────────
// Пробелы → _, убираем диакритику, только a-z0-9_

function termToId(term) {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // диакритика
    .replace(/[^a-z0-9\s]/g, '')      // пунктуация
    .trim()
    .replace(/\s+/g, '_');
}

// ─── Собираем множество уже существующих id и term'ов ─────────────────────────

function loadExistingIds(entriesPath) {
  const existing = new Set();
  if (!fs.existsSync(entriesPath)) return existing;

  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
  for (const e of entries) {
    existing.add(e.id);
    existing.add(termToId(e.term));
    // Также добавляем нормализованный term (без диакритики)
    const normTerm = e.term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    existing.add(normTerm);
  }
  return existing;
}

// ─── Определение типа по данным кандидата ─────────────────────────────────────

function inferType(candidate, requestedType) {
  if (requestedType === 'phrases') return 'phrase';
  if (requestedType === 'terms')   return 'term';
  if (requestedType === 'logic')   return 'logic_trigger';

  // auto-detect для 'all'
  if (candidate.bias_strength >= MIN_BIAS) return 'logic_trigger';
  return 'term';
}

// ─── Определение приоритета по частоте ───────────────────────────────────────

function inferPriority(count) {
  if (count >= 200) return 1;
  if (count >= 80)  return 2;
  return 3;
}

// ─── Определение pattern для quiz_hint ───────────────────────────────────────

function inferPattern(biasLabel) {
  if (biasLabel === 'false_bias' || biasLabel === 'weak_false_bias') return 'false_bias';
  if (biasLabel === 'true_bias'  || biasLabel === 'weak_true_bias')  return 'true_bias';
  return 'neutral';
}

// ─── Список тем из topics (первые 10 из question_ids — берём topic_id) ─────────
// candidates.json не хранит topics_list напрямую — храним пустой массив,
// пользователь заполнит вручную или мы добавим через link-questions.

function buildEntry(candidate, type) {
  const id      = termToId(candidate.term);
  const pattern = inferPattern(candidate.bias_label);

  // Строим подсказку в комментарии для пользователя
  const directionHint = candidate.pct_falso > candidate.pct_vero
    ? `(${candidate.pct_falso}% FALSO, ${candidate.pct_vero}% VERO, встречается в ${candidate.count} вопросах)`
    : `(${candidate.pct_vero}% VERO, ${candidate.pct_falso}% FALSO, встречается в ${candidate.count} вопросах)`;

  return {
    // ── Метаданные для пользователя (удалить перед merge в entries.json) ──
    _scaffold_hint: {
      count:         candidate.count,
      topics_count:  candidate.topics,
      pct_vero:      candidate.pct_vero,
      pct_falso:     candidate.pct_falso,
      bias_label:    candidate.bias_label,
      bias_strength: candidate.bias_strength,
      sample_ids:    candidate.question_ids || [],
      direction:     directionHint,
    },

    // ── Обязательные поля ──
    id,
    term:    candidate.term,
    term_ru: 'TODO',
    type,
    priority: inferPriority(candidate.count),
    topics:  [],   // заполнить вручную или через скрипт

    definition: {
      ru: 'TODO — объяснение механизма работы в ПДД (минимум 80 символов, НЕ перевод)',
    },

    quiz_hint: {
      ru:      `TODO — конкретный совет для квиза ${directionHint}`,
      pattern,
    },

    examples: [
      // Пример заполнения (скопировать из реального вопроса по sample_ids выше):
      // {
      //   "it": "...",
      //   "ru": "...",
      //   "answer": true/false,
      //   "comment_ru": "VERO/FALSO — почему"
      // }
    ],

    related_question_ids: [],  // заполняется link-questions.js
  };
}

// ─── Главная функция ──────────────────────────────────────────────────────────

function main() {
  console.log('🏗️  Quiz Patente — Scaffold Dictionary Entries');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Загрузка candidates.json
  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.error('❌ Файл не найден: scripts/output/candidates.json');
    console.error('   Запусти сначала: node scripts/analyze-dictionary.js');
    process.exit(1);
  }
  const candidates = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
  console.log(`📊 Загружено кандидатов: ${candidates.words.length} слов, ${candidates.bigrams.length} биграмм`);

  // 2. Загрузка существующих entries
  const existingIds = loadExistingIds(ENTRIES_PATH);
  const existingCount = existingIds.size / 3; // каждый entry даёт ~3 ключа (id, term, normTerm)
  console.log(`📖 Уже в entries.json: ${Math.round(existingCount)} записей (пропускаем их)\n`);

  // 3. Отбор кандидатов по фильтрам
  let newEntries = [];

  if (TYPE_FILTER === 'phrases') {
    // ── Фразы из bigrams ──
    const phraseCandidates = candidates.bigrams.filter(b =>
      b.count >= MIN_COUNT &&
      b.topics >= 4 &&
      !existingIds.has(termToId(b.term)) &&
      !existingIds.has(b.term) &&
      !isStopWord(b.term)
    );
    phraseCandidates.sort((a, b) => b.count - a.count);

    for (const c of phraseCandidates) {
      newEntries.push(buildEntry(c, 'phrase'));
    }
    console.log(`🔍 Фильтр: phrases, min-count=${MIN_COUNT}, topics>=4`);

  } else {
    // ── Слова (logic_triggers или terms) ──
    let wordCandidates = candidates.words.filter(w => {
      if (existingIds.has(w.term)) return false;
      if (existingIds.has(termToId(w.term))) return false;
      if (w.count < MIN_COUNT) return false;
      if (isStopWord(w.term)) return false;

      if (TYPE_FILTER === 'logic') {
        return w.bias_strength >= MIN_BIAS;
      }
      if (TYPE_FILTER === 'terms') {
        return w.bias_strength < MIN_BIAS && w.topics >= 5;
      }
      // 'all' — берём всё что проходит пороги
      return w.bias_strength >= MIN_BIAS || (w.count >= 80 && w.topics >= 8);
    });
    wordCandidates.sort((a, b) => {
      // Logic triggers — по bias_strength, остальные — по count
      if (TYPE_FILTER === 'logic') return b.bias_strength - a.bias_strength;
      return b.count - a.count;
    });

    for (const c of wordCandidates) {
      const type = inferType(c, TYPE_FILTER);
      newEntries.push(buildEntry(c, type));
    }

    const filterDesc = TYPE_FILTER === 'logic'
      ? `logic_triggers, min-bias=${MIN_BIAS}, min-count=${MIN_COUNT}`
      : TYPE_FILTER === 'terms'
      ? `terms, count>=80, topics>=5, bias<${MIN_BIAS}`
      : `all, min-bias=${MIN_BIAS} OR (count>=80 AND topics>=8)`;
    console.log(`🔍 Фильтр: ${filterDesc}`);
  }

  if (newEntries.length === 0) {
    console.log('✅ Нечего добавлять — все кандидаты уже в entries.json или не прошли фильтры.');
    return;
  }

  console.log(`\n📋 Новых заготовок: ${newEntries.length}\n`);

  // 4. Вывод в консоль (summary)
  for (const e of newEntries) {
    const h = e._scaffold_hint;
    const dir = h.pct_falso > h.pct_vero
      ? `→ FALSO ${h.pct_falso}%`
      : `→ VERO  ${h.pct_vero}%`;
    console.log(`  ${e.term.padEnd(28)} type=${e.type.padEnd(15)} count=${String(h.count).padEnd(5)} ${dir}  strength=${h.bias_strength}`);
  }

  // 5. Сохранение
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const dateStr   = new Date().toISOString().split('T')[0];
  const typeLabel = TYPE_FILTER === 'all' ? 'mixed' : TYPE_FILTER;
  const outPath   = path.join(OUTPUT_DIR, `scaffold_${typeLabel}_${dateStr}.json`);

  const output = {
    _meta: {
      generated_at:  new Date().toISOString(),
      type_filter:   TYPE_FILTER,
      min_bias:      MIN_BIAS,
      min_count:     MIN_COUNT,
      total_entries: newEntries.length,
      instructions: [
        '1. Заполни поля term_ru, definition.ru, quiz_hint.ru, examples в каждой записи',
        '2. Удали поле _scaffold_hint из каждой записи перед merge',
        '3. Добавь заполненные записи в src/data/dictionary/entries.json',
        '4. node scripts/validate-entries.js  (должно быть 0 CRITICAL)',
        '5. node scripts/link-questions.js --dry-run',
        '6. node scripts/link-questions.js',
      ],
    },
    entries: newEntries,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\n✅ Сохранено: scripts/output/scaffold_${typeLabel}_${dateStr}.json`);
  console.log(`\n📋 Следующие шаги:`);
  console.log(`   1. Открой файл и заполни TODO-поля в каждой записи`);
  console.log(`   2. Удали поля _scaffold_hint перед добавлением в entries.json`);
  console.log(`   3. Запусти: node scripts/validate-entries.js\n`);
}

main();
