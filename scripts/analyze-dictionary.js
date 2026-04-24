#!/usr/bin/env node
/**
 * analyze-dictionary.js
 * =====================
 * Анализирует все 7144 вопросов квиза и выявляет кандидатов для словаря.
 *
 * Запуск:
 *   node scripts/analyze-dictionary.js
 *   node scripts/analyze-dictionary.js --top 300       (топ-N слов, default 200)
 *   node scripts/analyze-dictionary.js --bigrams 80    (топ-N биграмм, default 50)
 *   node scripts/analyze-dictionary.js --min-freq 5    (минимальная частота, default 10)
 *   node scripts/analyze-dictionary.js --bias-only     (только слова с сильным bias)
 *   node scripts/analyze-dictionary.js --json          (вывод в JSON вместо таблицы)
 *
 * Выходные файлы (создаются в scripts/output/):
 *   words.txt        — таблица слов (консольный формат)
 *   bigrams.txt      — таблица биграмм
 *   candidates.json  — JSON с полными данными для дальнейшей обработки
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Аргументы CLI ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag, defaultVal) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : defaultVal;
};
const hasFlag = (flag) => args.includes(flag);

const TOP_WORDS   = parseInt(getArg('--top', 200), 10);
const TOP_BIGRAMS = parseInt(getArg('--bigrams', 50), 10);
const MIN_FREQ    = parseInt(getArg('--min-freq', 10), 10);
const BIAS_ONLY   = hasFlag('--bias-only');
const JSON_OUTPUT = hasFlag('--json');

// ─── Пути ────────────────────────────────────────────────────────────────────

const DATA_DIR   = path.join(__dirname, '../src/data/questions');
const OUTPUT_DIR = path.join(__dirname, 'output');

// ─── Стоп-слова (итальянские артикли, предлоги, местоимения, союзы) ──────────
// Убираем их из частотного анализа — они не несут смысловой нагрузки для словаря.
// НО биграммы считаем ДО фильтрации, чтобы поймать фразы типа "in prossimità di".

const STOP_WORDS = new Set([
  // артикли
  'il', 'lo', 'la', 'i', 'gli', 'le', 'l', 'un', 'una', 'uno', 'dei', 'delle', 'degli',
  // предлоги
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'del', 'della', 'dello', 'dei', 'delle', 'degli',
  'al', 'alla', 'allo', 'ai', 'alle', 'agli',
  'dal', 'dalla', 'dallo', 'dai', 'dalle', 'dagli',
  'nel', 'nella', 'nello', 'nei', 'nelle', 'negli',
  'sul', 'sulla', 'sullo', 'sui', 'sulle', 'sugli',
  // местоимения и союзы
  'che', 'chi', 'cui', 'quale', 'quali',
  'e', 'o', 'ma', 'se', 'quando', 'come', 'mentre', 'perché', 'però', 'quindi',
  'si', 'non', 'no', 'sì',
  'è', 'sono', 'ha', 'hanno', 'essere', 'avere',
  'ci', 'vi', 'ne', 'lo', 'la', 'li', 'le',
  'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
  'tale', 'tali', 'ogni', 'qualsiasi', 'qualunque',
  'un', 'una', 'uno',
  // вспомогательные глаголы
  'può', 'possono', 'deve', 'devono', 'vuole', 'vogliono',
  'ha', 'hanno', 'è', 'sono', 'sia', 'siano', 'sarà', 'saranno',
  'viene', 'vengono', 'venga', 'vengano',
  // числительные и прочее
  'primo', 'seconda', 'terzo', 'uno', 'due', 'tre', 'quattro',
  'più', 'meno', 'molto', 'poco', 'tanto', 'quanto',
  'anche', 'ancora', 'già', 'proprio', 'poi', 'così', 'bene', 'male',
  // часто встречающиеся нейтральные слова в контексте квиза
  'indicata', 'indicato', 'rappresentata', 'rappresentato',
  'figura', 'tipo', 'caso',
]);

// ─── Загрузка данных ──────────────────────────────────────────────────────────

function loadAllQuestions() {
  const questions = [];
  for (let i = 1; i <= 25; i++) {
    const filePath = path.join(DATA_DIR, `topic_${i}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Файл не найден: topic_${i}.json`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    questions.push(...data);
  }
  return questions;
}

// ─── Токенизация ──────────────────────────────────────────────────────────────

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // убираем диакритику: à→a, è→e
    .replace(/[^a-z\s]/g, ' ')         // убираем пунктуацию
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalize(text).split(' ').filter(t => t.length > 1);
}

// ─── Основной анализ ──────────────────────────────────────────────────────────

function analyze(questions) {
  // wordMap: слово → { count, vero, falso, topics: Set, question_ids: [] }
  const wordMap   = new Map();
  // bigramMap: биграмма → { count, vero, falso, topics: Set, question_ids: [] }
  const bigramMap = new Map();

  for (const q of questions) {
    const tokens = tokenize(q.text);
    const isVero = q.answer === true;
    const topicId = q.topic_id;

    // ── Слова ──
    const seen = new Set(); // считаем слово один раз на вопрос
    for (const token of tokens) {
      if (seen.has(token)) continue;
      seen.add(token);

      if (!wordMap.has(token)) {
        wordMap.set(token, { count: 0, vero: 0, falso: 0, topics: new Set(), question_ids: [] });
      }
      const entry = wordMap.get(token);
      entry.count++;
      isVero ? entry.vero++ : entry.falso++;
      entry.topics.add(topicId);
      if (entry.question_ids.length < 10) entry.question_ids.push(q.id); // первые 10 примеров
    }

    // ── Биграммы (из ВСЕХ токенов включая стоп-слова) ──
    const allTokens = tokenize(q.text); // без фильтрации
    const seenBi = new Set();
    for (let j = 0; j < allTokens.length - 1; j++) {
      const bigram = allTokens[j] + ' ' + allTokens[j + 1];
      if (seenBi.has(bigram)) continue;
      seenBi.add(bigram);

      if (!bigramMap.has(bigram)) {
        bigramMap.set(bigram, { count: 0, vero: 0, falso: 0, topics: new Set(), question_ids: [] });
      }
      const entry = bigramMap.get(bigram);
      entry.count++;
      isVero ? entry.vero++ : entry.falso++;
      entry.topics.add(topicId);
      if (entry.question_ids.length < 5) entry.question_ids.push(q.id);
    }
  }

  return { wordMap, bigramMap };
}

// ─── Вычисление bias ─────────────────────────────────────────────────────────

function getBias(vero, falso) {
  const total = vero + falso;
  if (total === 0) return { label: 'neutral', strength: 0, pct_vero: 0, pct_falso: 0 };

  const pct_vero  = Math.round((vero / total) * 100);
  const pct_falso = Math.round((falso / total) * 100);
  const strength  = Math.abs(pct_vero - pct_falso); // 0..100

  let label = 'neutral';
  if (pct_falso >= 70) label = 'false_bias';
  else if (pct_vero >= 70) label = 'true_bias';
  else if (pct_falso >= 60) label = 'weak_false_bias';
  else if (pct_vero >= 60) label = 'weak_true_bias';

  return { label, strength, pct_vero, pct_falso };
}

// ─── Форматирование таблицы ───────────────────────────────────────────────────

function padEnd(str, len) {
  str = String(str);
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}
function padStart(str, len) {
  str = String(str);
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}

function biasIcon(label) {
  if (label === 'false_bias')      return '🔴 FALSO';
  if (label === 'true_bias')       return '🟢 VERO ';
  if (label === 'weak_false_bias') return '🟡 falso';
  if (label === 'weak_true_bias')  return '🟡 vero ';
  return '⚪ нейтр';
}

function formatWordsTable(rows) {
  const header = [
    padEnd('Слово', 24),
    padStart('Частота', 8),
    padStart('Темы', 6),
    padStart('VERO%', 7),
    padStart('FALSO%', 7),
    '  Bias',
  ].join(' │ ');

  const separator = '─'.repeat(header.length);
  const lines = [separator, header, separator];

  for (const r of rows) {
    lines.push([
      padEnd(r.term, 24),
      padStart(r.count, 8),
      padStart(r.topics, 6),
      padStart(r.pct_vero + '%', 7),
      padStart(r.pct_falso + '%', 7),
      '  ' + biasIcon(r.bias_label),
    ].join(' │ '));
  }
  lines.push(separator);
  return lines.join('\n');
}

function formatBigramsTable(rows) {
  const header = [
    padEnd('Биграмма', 34),
    padStart('Частота', 8),
    padStart('Темы', 6),
    padStart('VERO%', 7),
    padStart('FALSO%', 7),
    '  Bias',
  ].join(' │ ');

  const separator = '─'.repeat(header.length);
  const lines = [separator, header, separator];

  for (const r of rows) {
    lines.push([
      padEnd(r.term, 34),
      padStart(r.count, 8),
      padStart(r.topics, 6),
      padStart(r.pct_vero + '%', 7),
      padStart(r.pct_falso + '%', 7),
      '  ' + biasIcon(r.bias_label),
    ].join(' │ '));
  }
  lines.push(separator);
  return lines.join('\n');
}

// ─── Главная функция ──────────────────────────────────────────────────────────

function main() {
  console.log('📖 Quiz Patente — Dictionary Analyzer');
  console.log('══════════════════════════════════════\n');

  // 1. Загрузка
  process.stdout.write('Загружаем вопросы... ');
  const questions = loadAllQuestions();
  console.log(`✅ ${questions.length} вопросов из 25 тем\n`);

  // 2. Анализ
  process.stdout.write('Анализируем частотность... ');
  const { wordMap, bigramMap } = analyze(questions);
  console.log(`✅ ${wordMap.size} уникальных слов, ${bigramMap.size} биграмм\n`);

  // 3. Формируем строки для слов (без стоп-слов)
  const wordRows = [];
  for (const [term, data] of wordMap) {
    if (STOP_WORDS.has(term)) continue;
    if (data.count < MIN_FREQ) continue;
    const bias = getBias(data.vero, data.falso);
    if (BIAS_ONLY && bias.label === 'neutral') continue;
    wordRows.push({
      term,
      count:       data.count,
      topics:      data.topics.size,
      vero:        data.vero,
      falso:       data.falso,
      pct_vero:    bias.pct_vero,
      pct_falso:   bias.pct_falso,
      bias_label:  bias.label,
      bias_strength: bias.strength,
      question_ids: data.question_ids,
    });
  }
  // Сортировка: по частоте убывающей
  wordRows.sort((a, b) => b.count - a.count);
  const topWords = wordRows.slice(0, TOP_WORDS);

  // 4. Формируем строки для биграмм (фильтруем мусор)
  const bigramRows = [];
  for (const [term, data] of bigramMap) {
    if (data.count < MIN_FREQ) continue;
    // Пропускаем биграммы из двух стоп-слов
    const parts = term.split(' ');
    if (STOP_WORDS.has(parts[0]) && STOP_WORDS.has(parts[1])) continue;
    const bias = getBias(data.vero, data.falso);
    bigramRows.push({
      term,
      count:       data.count,
      topics:      data.topics.size,
      vero:        data.vero,
      falso:       data.falso,
      pct_vero:    bias.pct_vero,
      pct_falso:   bias.pct_falso,
      bias_label:  bias.label,
      bias_strength: bias.strength,
      question_ids: data.question_ids,
    });
  }
  bigramRows.sort((a, b) => b.count - a.count);
  const topBigrams = bigramRows.slice(0, TOP_BIGRAMS);

  // 5. Выводим результаты
  if (JSON_OUTPUT) {
    // ── JSON вывод ──
    const out = {
      meta: {
        total_questions: questions.length,
        total_unique_words: wordMap.size,
        total_bigrams: bigramMap.size,
        generated_at: new Date().toISOString(),
        settings: { TOP_WORDS, TOP_BIGRAMS, MIN_FREQ },
      },
      words:   topWords,
      bigrams: topBigrams,
    };
    const json = JSON.stringify(out, null, 2);
    console.log(json);

    // Сохраняем
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'candidates.json'), json, 'utf8');
    console.error(`\n✅ Сохранено: scripts/output/candidates.json`);
    return;
  }

  // ── Текстовый вывод ──

  // СЕКЦИЯ 1: Слова с сильным bias (логические триггеры)
  const strongBias = topWords.filter(r =>
    r.bias_label === 'false_bias' || r.bias_label === 'true_bias'
  );

  console.log(`${'═'.repeat(70)}`);
  console.log(`  🎯 ЛОГИЧЕСКИЕ ТРИГГЕРЫ — слова с сильным answer-bias (≥70%)`);
  console.log(`  Кандидаты на type: "logic_trigger" в словаре`);
  console.log(`${'═'.repeat(70)}\n`);
  console.log(formatWordsTable(strongBias));

  // СЕКЦИЯ 2: Все топ слова
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  📊 ТОП-${TOP_WORDS} СЛОВ по частоте (без стоп-слов, min частота: ${MIN_FREQ})`);
  console.log(`${'═'.repeat(70)}\n`);
  console.log(formatWordsTable(topWords));

  // СЕКЦИЯ 3: Биграммы
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  🔗 ТОП-${TOP_BIGRAMS} БИГРАММ — кандидаты на type: "phrase"`);
  console.log(`${'═'.repeat(70)}\n`);
  console.log(formatBigramsTable(topBigrams));

  // СЕКЦИЯ 4: Статистика bias
  const biasStats = {
    false_bias:      topWords.filter(r => r.bias_label === 'false_bias').length,
    true_bias:       topWords.filter(r => r.bias_label === 'true_bias').length,
    weak_false_bias: topWords.filter(r => r.bias_label === 'weak_false_bias').length,
    weak_true_bias:  topWords.filter(r => r.bias_label === 'weak_true_bias').length,
    neutral:         topWords.filter(r => r.bias_label === 'neutral').length,
  };

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  📈 ИТОГОВАЯ СТАТИСТИКА`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Всего вопросов:          ${questions.length}`);
  console.log(`  Уникальных слов:         ${wordMap.size}`);
  console.log(`  Уникальных биграмм:      ${bigramMap.size}`);
  console.log(`  Слов в топ-${TOP_WORDS}:        ${topWords.length}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  🔴 Сильный FALSO bias:   ${biasStats.false_bias} слов`);
  console.log(`  🟢 Сильный VERO bias:    ${biasStats.true_bias} слов`);
  console.log(`  🟡 Слабый bias:          ${biasStats.weak_false_bias + biasStats.weak_true_bias} слов`);
  console.log(`  ⚪ Нейтральные:          ${biasStats.neutral} слов`);
  console.log(`${'═'.repeat(70)}\n`);

  // Сохраняем файлы
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const wordsOutput = [
    `Quiz Patente — Dictionary Candidates: WORDS`,
    `Generated: ${new Date().toISOString()}`,
    `Total questions: ${questions.length} | Unique words: ${wordMap.size}`,
    `Settings: top=${TOP_WORDS}, min-freq=${MIN_FREQ}`,
    '',
    '═══ ЛОГИЧЕСКИЕ ТРИГГЕРЫ (strong bias ≥70%) ═══',
    '',
    formatWordsTable(strongBias),
    '',
    `═══ ТОП-${TOP_WORDS} СЛОВ ═══`,
    '',
    formatWordsTable(topWords),
  ].join('\n');

  const bigramsOutput = [
    `Quiz Patente — Dictionary Candidates: BIGRAMS`,
    `Generated: ${new Date().toISOString()}`,
    `Total questions: ${questions.length} | Unique bigrams: ${bigramMap.size}`,
    '',
    `═══ ТОП-${TOP_BIGRAMS} БИГРАММ ═══`,
    '',
    formatBigramsTable(topBigrams),
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, 'words.txt'),   wordsOutput,   'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'bigrams.txt'), bigramsOutput, 'utf8');

  // Также сохраняем полный JSON для дальнейшей обработки
  const candidatesJson = JSON.stringify({
    meta: {
      total_questions: questions.length,
      total_unique_words: wordMap.size,
      total_bigrams: bigramMap.size,
      generated_at: new Date().toISOString(),
    },
    words:   topWords,
    bigrams: topBigrams,
  }, null, 2);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'candidates.json'), candidatesJson, 'utf8');

  console.log('✅ Файлы сохранены в scripts/output/:');
  console.log('   words.txt      — таблица слов');
  console.log('   bigrams.txt    — таблица биграмм');
  console.log('   candidates.json — полные данные в JSON\n');
  console.log('📋 Следующий шаг: открой scripts/output/words.txt и bigrams.txt,');
  console.log('   отбери кандидатов и создай src/data/dictionary/entries.json\n');
}

main();
