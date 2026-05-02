#!/usr/bin/env node
/**
 * validate-immersion.js
 * =====================
 * Проверяет педагогическую чистоту Immersion Mode:
 * для каждого чанка каждой темы убеждается, что карточки Stage 1/2
 * содержат только термины, реально присутствующие в текстах вопросов чанка.
 *
 * "Загрязнённая" карточка — entry попал в Stage через related_question_ids,
 * но term не встречается ни в одном из 20 текстов вопросов чанка.
 *
 * Запуск:
 *   node scripts/validate-immersion.js                  # все темы
 *   node scripts/validate-immersion.js --topic 1        # одна тема
 *   node scripts/validate-immersion.js --topic 1 --chunk 0  # один чанк
 *   node scripts/validate-immersion.js --topic 1 --verbose   # детали по каждой карточке
 *
 * Цель: < 5% загрязнённых карточек (с учётом морфологии итальянского)
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const args       = process.argv.slice(2);
const getArg     = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i+1] ? args[i+1] : def; };
const hasFlag    = (flag) => args.includes(flag);
const TOPIC_ONLY = getArg('--topic', null);
const CHUNK_ONLY = getArg('--chunk', null);
const VERBOSE    = hasFlag('--verbose');
const CHUNK_SIZE = 20;

const DATA_DIR    = path.join(__dirname, '../src/data/questions');
const ENTRIES_PATH = path.join(__dirname, '../src/data/dictionary/entries.json');

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

// Те же MANUAL_OVERRIDES что и в link-questions.js — синхронизировать при изменениях
const SEARCH_OVERRIDES = {
  incidente:              ['incidente', 'sinistro'],
  sinistro:               ['sinistro', 'incidente'],
  stop_segnale:           ['stop', 'fermarsi e dare precedenza', 'fermarsi'],
  alcol_e_droga:          ['alcol', 'sostanze stupefacenti', 'droga', 'ebbrezza'],
  primo_soccorso:         ['primo soccorso', 'soccorrere', 'assistenza ai feriti'],
  manutenzione_ordinaria: ['manutenzione', 'controllo dei livelli', 'efficienza del veicolo'],
  luci:                   ['luci', 'proiettori', 'fari'],
  carico:                 ['carico', 'sporgente'],
  rc_auto:                ['rc auto', 'responsabilita civile auto', 'assicurazione obbligatoria'],
  pneumatici_e_ambiente:  ['pressione degli pneumatici', 'gonfiaggio degli pneumatici', 'battistrada'],
};

// Возвращает массив паттернов для матчинга карточки в текстах вопросов.
// Учитывает: MANUAL_OVERRIDES (синонимы), все варианты через /, vs; итальянский стемминг.
function getCardPatterns(entry) {
  // Если есть явный override — используем только его
  if (SEARCH_OVERRIDES[entry.id]) {
    return SEARCH_OVERRIDES[entry.id].map(normalize);
  }

  const term = normalize(entry.term);

  // Все варианты через / и vs
  const variants = term.split(/\s*\/\s*|\s+vs\s+/).map(s => s.trim()).filter(Boolean);

  const patterns = new Set();

  for (const variant of variants) {
    const words = variant.split(' ');
    const firstWord = words[0];

    // Для phrase — полная фраза (первые 2 слова)
    if (entry.type === 'phrase' && words.length > 1) {
      patterns.add(words.slice(0, 2).join(' '));
    }

    // Добавляем первое слово варианта
    patterns.add(firstWord);

    // Итальянский стемминг: убираем окончания чтобы находить все формы рода/числа
    // consentita/consentito → consent, riservata/o → riserv
    if (firstWord.length > 5) {
      const stem = firstWord
        .replace(/(ita|ito|ata|ato|iti|ite|ate|ati)$/, '')
        .replace(/[aeiou]$/, '');
      if (stem.length >= 4) patterns.add(stem);
    }
  }

  return [...patterns];
}

// Обратная совместимость для --verbose вывода
function getCardPattern(entry) {
  return getCardPatterns(entry)[0];
}

function loadQuestions(topicId) {
  const filePath = path.join(DATA_DIR, `topic_${topicId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getChunkData(allEntries, topicQuestions, chunkIndex) {
  const start     = chunkIndex * CHUNK_SIZE;
  const questions = topicQuestions.slice(start, start + CHUNK_SIZE);
  const questionIds = new Set(questions.map(q => q.id));

  // Join через related_question_ids (text-only, как в immersionService)
  const relevantEntries = allEntries.filter(entry => {
    const ids = entry.related_question_ids;
    if (!ids || ids.length === 0) return false;
    return ids.some(id => questionIds.has(id));
  });

  // Stage 1: logic_trigger + term, топ 12 по priority
  const stage1Cards = relevantEntries
    .filter(e => e.type === 'logic_trigger' || e.type === 'term')
    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
    .slice(0, 12);

  // Stage 2: phrase + concept, топ 8 по priority
  const stage2Cards = relevantEntries
    .filter(e => e.type === 'phrase' || e.type === 'concept')
    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
    .slice(0, 8);

  return { questions, stage1Cards, stage2Cards };
}

function checkCardInChunk(entry, questions) {
  const patterns = getCardPatterns(entry);
  const normTexts = questions.map(q => normalize(q.text || ''));
  return normTexts.some(text => patterns.some(p => text.includes(p)));
}

function main() {
  console.log('🎓 Quiz Patente — Immersion Mode Validator');
  console.log('══════════════════════════════════════════\n');

  const allEntries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf8'));
  console.log(`📖 Entries: ${allEntries.length}`);

  const topicIds = TOPIC_ONLY
    ? [TOPIC_ONLY]
    : Array.from({ length: 25 }, (_, i) => String(i + 1));

  let totalCards     = 0;
  let contaminatedCards = 0;
  let totalChunks    = 0;
  let emptyChunks    = 0; // чанки без карточек

  for (const topicId of topicIds) {
    const topicQuestions = loadQuestions(topicId);
    if (!topicQuestions) { console.warn(`⚠️  topic_${topicId}.json не найден`); continue; }

    const totalChunksInTopic = Math.ceil(topicQuestions.length / CHUNK_SIZE);
    const chunkRange = CHUNK_ONLY !== null
      ? [parseInt(CHUNK_ONLY, 10)]
      : Array.from({ length: totalChunksInTopic }, (_, i) => i);

    let topicContaminated = 0;
    let topicTotal = 0;

    for (const chunkIdx of chunkRange) {
      const { questions, stage1Cards, stage2Cards } = getChunkData(allEntries, topicQuestions, chunkIdx);
      const allCards = [...stage1Cards, ...stage2Cards];
      totalChunks++;

      if (allCards.length === 0) { emptyChunks++; continue; }

      for (const card of allCards) {
        const isInText = checkCardInChunk(card, questions);
        totalCards++;
        topicTotal++;
        if (!isInText) {
          contaminatedCards++;
          topicContaminated++;
          if (VERBOSE) {
            console.log(`  ⚠️  [topic=${topicId} chunk=${chunkIdx}] ${card.id} (${card.type}) — term "${getCardPattern(card)}" не в текстах вопросов`);
          }
        }
      }
    }

    if (TOPIC_ONLY) {
      const rate = topicTotal > 0 ? Math.round(topicContaminated / topicTotal * 100) : 0;
      console.log(`  Topic ${topicId}: ${topicTotal} карточек, загрязнённых: ${topicContaminated} (${rate}%)`);
    }
  }

  // Итог
  const contaminationRate = totalCards > 0 ? (contaminatedCards / totalCards * 100).toFixed(1) : '0';
  const status = parseFloat(contaminationRate) < 5 ? '✅' : parseFloat(contaminationRate) < 15 ? '⚠️' : '❌';

  console.log('\n═══ ИТОГ ═══');
  console.log(`Тем обработано:        ${topicIds.length}`);
  console.log(`Чанков проверено:      ${totalChunks} (пустых: ${emptyChunks})`);
  console.log(`Карточек всего:        ${totalCards}`);
  console.log(`Загрязнённых:          ${contaminatedCards} (${contaminationRate}%)`);
  console.log(`Чистых:                ${totalCards - contaminatedCards} (${(100 - parseFloat(contaminationRate)).toFixed(1)}%)`);
  console.log();
  console.log(`${status} Уровень загрязнения: ${contaminationRate}% (цель: < 5%)`);

  if (parseFloat(contaminationRate) >= 5) {
    console.log('\n💡 Загрязнение > 5% — проверь:');
    console.log('   1. related_question_ids содержат только text-based линки (link-questions.js v2)');
    console.log('   2. term записи не содержит скобок (очистить → definition.ru)');
    console.log('   3. MANUAL_OVERRIDES в link-questions.js не добавляют ложные линки');
    process.exit(1);
  }

  process.exit(0);
}

main();
