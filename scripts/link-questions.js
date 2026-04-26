#!/usr/bin/env node
/**
 * link-questions.js
 * =================
 * Автоматически проставляет related_question_ids в entries.json.
 * Для каждой записи словаря ищет вопросы, в тексте которых встречается термин.
 *
 * Стратегия матчинга:
 *   1. Простые термины (solo, sempre, carreggiata) — поиск слова в тексте.
 *   2. Термины с вариантами (tutti / tutte) — OR по всем вариантам.
 *   3. Фразы (in prossimità di) — поиск нормализованной подстроки.
 *   4. Концепции-пары (divieto vs obbligo) — OR по обоим словам.
 *
 * Запуск:
 *   node scripts/link-questions.js
 *   node scripts/link-questions.js --max 50    (лимит id на запись, default 30)
 *   node scripts/link-questions.js --dry-run   (показать статистику без записи)
 *   node scripts/link-questions.js --entry sempre  (только одна запись)
 *
 * Результат:
 *   Перезаписывает src/data/dictionary/entries.json, добавляя поле
 *   related_question_ids в каждую запись.
 *   Бэкап оригинала сохраняется как scripts/output/entries_backup.json.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Аргументы CLI ───────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const getArg  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i+1] ? args[i+1] : def; };
const hasFlag = (flag) => args.includes(flag);

const MAX_IDS  = parseInt(getArg('--max', 30), 10);
const DRY_RUN  = hasFlag('--dry-run');
const ONLY_ID  = getArg('--entry', null);

// ─── Пути ─────────────────────────────────────────────────────────────────────

const DATA_DIR    = path.join(__dirname, '../src/data/questions');
const ENTRIES_IN  = path.join(__dirname, '../src/data/dictionary/entries.json');
const ENTRIES_OUT = path.join(__dirname, '../src/data/dictionary/entries.json');
const BACKUP_OUT  = path.join(__dirname, 'output/entries_backup.json');
const REPORT_OUT  = path.join(__dirname, 'output/link-report.txt');

// ─── Нормализация (убирает диакритику, lowercase) ────────────────────────────

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Разбор term → массив поисковых паттернов ────────────────────────────────
//
// Правила:
//   "solo"                  → ['solo']
//   "tutti / tutte"         → ['tutti', 'tutte']
//   "è vietato / è vietata" → ['e vietato', 'e vietata']
//   "divieto vs obbligo"    → ['divieto', 'obbligo']
//   "in prossimità di"      → ['in prossimita di']   (фраза целиком)
//   "attraversamento pedonale" → ['attraversamento']  (первое слово достаточно)

// ─── Ручные переопределения паттернов для сложных случаев ─────────────────────

const MANUAL_OVERRIDES = {
  // Упрощаем поиск для записей с лишними пояснениями в скобках
  intersezione: ['intersezione'],
  
  // Добавляем синонимы и сокращения
  stop_segnale: ['stop', 'fermarsi e dare precedenza'],
  senso_vietato: ['senso vietato', 'divieto di accesso', 'segnale di divieto'],
  
  // Расширяем поиск для специфичных терминов
  parcheggio_scambio: ['parcheggio di scambio', 'parcheggio scambiatore', 'parcheggio riservato'],
  itinerario_extraurbano: ['itinerario extraurbano', 'extraurbana', 'fondo blu'],
  itinerario_autostradale: ['itinerario autostradale', 'autostrada', 'fondo verde'],
  
  // Уточняем фразы
  fine_diritto_precedenza: ['fine del diritto di precedenza', 'fine della precedenza'],
  ordine_incrocio: ['ordine di precedenza', 'precedenza all\'incrocio', 'ordine di transito'],
  preavviso_incrocio: ['preavviso di incrocio'],
  precedenza_a_sinistra: ['precedenza a sinistra', 'precedenza da sinistra'],

  // Новые темы (22-24)
  alcol_e_droga: ['alcol', 'sostanze stupefacenti', 'droga', 'ebbrezza'],
  primo_soccorso: ['primo soccorso', 'soccorrere', 'assistenza ai feriti'],
  rc_auto: ['rc auto', 'responsabilita civile auto', 'assicurazione obbligatoria'],
  risarcimento_danni: ['risarcimento', 'risarcire'],
  inquinamento_atmosferico: ['inquinamento', 'gas di scarico', 'emissioni'],
  consumo_carburante: ['consumo di carburante', 'consumo di benzina', 'consumo del veicolo'],
  pneumatici_e_ambiente: ['pressione degli pneumatici', 'gonfiaggio degli pneumatici', 'battistrada'],
  manutenzione_ordinaria: ['manutenzione', 'controllo dei livelli', 'efficienza del veicolo'],

  // Новые батчи (Task 9)
  km: ['km/h', 'km'],
  tonnellate: ['tonnellate', ' t '],
  punti: ['punti'],
  anni: ['anni'],
  incidente: ['incidente', 'sinistro'],
  sinistro: ['sinistro', 'incidente'],
  svolta: ['svolta', 'svoltare'],
  attraversare: ['attraversare', 'attraversamento'],
  pedonale: ['pedonale', 'pedoni'],
  barriere: ['barriere', 'passaggio a livello'],
  luci: ['luci', 'proiettori', 'fari'],
  carico: ['carico', 'sporgente']
};

function getSearchPatterns(entry) {
  // Проверяем наличие ручного переопределения
  if (MANUAL_OVERRIDES[entry.id]) {
    return MANUAL_OVERRIDES[entry.id];
  }

  const term = normalize(entry.term);

  // Вариативные термины через ' / '
  if (term.includes(' / ')) {
    return term.split(' / ').map(s => s.trim());
  }

  // Концептуальные пары через ' vs '
  if (term.includes(' vs ')) {
    return term.split(' vs ').map(s => s.trim());
  }

  // Многословные фразы — ищем целиком (in prossimita di, senso unico, ...)
  // Исключение: "attraversamento pedonale" → только первое слово (уникально и достаточно)
  const words = term.split(' ');
  if (words.length > 1) {
    const REDUCE_TO_FIRST = new Set(['attraversamento']);
    if (REDUCE_TO_FIRST.has(words[0])) {
      return [words[0]];
    }
    return [term];
  }

  return [term];
}

// ─── Проверка совпадения ──────────────────────────────────────────────────────
//
// Для однословных паттернов — ищем слово (с учётом границ слова через пробелы/знаки).
// Для многословных фраз — ищем подстроку.

function matchesQuestion(normalizedText, patterns) {
  for (const pattern of patterns) {
    const isPhrase = pattern.includes(' ');
    if (isPhrase) {
      if (normalizedText.includes(pattern)) return true;
    } else {
      // Substring-поиск: надёжнее boundary для итальянского морфологии.
      // Ложные срабатывания маловероятны для специфичных терминов ПДД.
      if (normalizedText.includes(pattern)) {
        return true;
      }
    }
  }
  return false;
}

// ─── Загрузка вопросов ────────────────────────────────────────────────────────

function loadAllQuestions() {
  const questions = [];
  for (let i = 1; i <= 25; i++) {
    const filePath = path.join(DATA_DIR, `topic_${i}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Не найден: topic_${i}.json`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    questions.push(...data);
  }
  return questions;
}

// ─── Главная функция ──────────────────────────────────────────────────────────

function main() {
  console.log('🔗 Quiz Patente — Link Questions to Dictionary');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Загружаем entries
  const entries = JSON.parse(fs.readFileSync(ENTRIES_IN, 'utf8'));
  console.log(`📖 Загружено entries: ${entries.length}`);

  // 2. Загружаем вопросы
  process.stdout.write('📂 Загружаем вопросы... ');
  const questions = loadAllQuestions();
  console.log(`✅ ${questions.length} вопросов из 25 тем\n`);

  // 3. Нормализуем тексты вопросов и комментариев один раз (для производительности)
  const normalizedTexts = questions.map(q => {
    const text = q.text || '';
    const comment = (q.comment && q.comment.text) ? q.comment.text : '';
    return normalize(text + ' ' + comment);
  });

  // 4. Для каждой записи — находим совпадающие вопросы
  const reportLines = [
    `Quiz Patente — Link Report`,
    `Generated: ${new Date().toISOString()}`,
    `MAX_IDS: ${MAX_IDS}`,
    '',
  ];

  let totalLinked = 0;
  let totalIds    = 0;

  for (const entry of entries) {
    if (ONLY_ID && entry.id !== ONLY_ID) continue;

    const patterns = getSearchPatterns(entry);
    const matchingIds = [];

    for (let i = 0; i < questions.length; i++) {
      if (matchesQuestion(normalizedTexts[i], patterns)) {
        matchingIds.push(questions[i].id);
        if (matchingIds.length >= MAX_IDS) break;
      }
    }

    entry.related_question_ids = matchingIds;

    const line = `${entry.id.padEnd(30)} patterns=${JSON.stringify(patterns).padEnd(40)} found=${matchingIds.length}`;
    console.log(line);
    reportLines.push(line);

    if (matchingIds.length > 0) totalLinked++;
    totalIds += matchingIds.length;
  }

  // 5. Итоговая статистика
  const summary = [
    '',
    '═══ ИТОГ ═══',
    `Всего entries:       ${entries.length}`,
    `С совпадениями:      ${totalLinked}`,
    `Без совпадений:      ${entries.length - totalLinked}`,
    `Всего question_ids:  ${totalIds}`,
    `Среднее на entry:    ${(totalIds / entries.length).toFixed(1)}`,
  ];
  summary.forEach(l => console.log(l));
  reportLines.push(...summary);

  if (DRY_RUN) {
    console.log('\n⚠️  --dry-run: файлы НЕ записаны.');
    return;
  }

  // 6. Бэкап оригинала
  fs.mkdirSync(path.dirname(BACKUP_OUT), { recursive: true });
  fs.copyFileSync(ENTRIES_IN, BACKUP_OUT);
  console.log(`\n💾 Бэкап: scripts/output/entries_backup.json`);

  // 7. Записываем обновлённый entries.json (форматированный)
  fs.writeFileSync(ENTRIES_OUT, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`✅ Обновлён: src/data/dictionary/entries.json`);

  // 8. Сохраняем отчёт
  fs.writeFileSync(REPORT_OUT, reportLines.join('\n'), 'utf8');
  console.log(`📋 Отчёт:  scripts/output/link-report.txt\n`);
}

main();
