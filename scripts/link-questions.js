#!/usr/bin/env node
/**
 * link-questions.js v2
 * =================
 * Проставляет ДВА поля в entries.json (СТРОГО РАЗДЕЛЕНЫ):
 *
 *   related_question_ids  — термин в question.TEXT
 *                           Используется в Immersion Stage 1/2, Practice Mode (primary).
 *
 *   context_question_ids  — термин только в question.COMMENT
 *                           НЕ используется для предквизовых карточек.
 *
 * Запуск:
 *   node scripts/link-questions.js
 *   node scripts/link-questions.js --max 30    (лимит id на каждое поле)
 *   node scripts/link-questions.js --dry-run
 *   node scripts/link-questions.js --entry sempre
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const args    = process.argv.slice(2);
const getArg  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i+1] ? args[i+1] : def; };
const hasFlag = (flag) => args.includes(flag);

const MAX_IDS  = parseInt(getArg('--max', 30), 10);
const DRY_RUN  = hasFlag('--dry-run');
const ONLY_ID  = getArg('--entry', null);

const DATA_DIR    = path.join(__dirname, '../src/data/questions');
const ENTRIES_IN  = path.join(__dirname, '../src/data/dictionary/entries.json');
const ENTRIES_OUT = path.join(__dirname, '../src/data/dictionary/entries.json');
const BACKUP_OUT  = path.join(__dirname, 'output/entries_backup.json');
const REPORT_OUT  = path.join(__dirname, 'output/link-report.txt');

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MANUAL_OVERRIDES = {
  intersezione: ['intersezione'],
  stop_segnale: ['stop', 'fermarsi e dare precedenza'],
  senso_vietato: ['senso vietato', 'divieto di accesso', 'segnale di divieto'],
  parcheggio_scambio: ['parcheggio di scambio', 'parcheggio scambiatore', 'parcheggio riservato'],
  itinerario_extraurbano: ['itinerario extraurbano', 'extraurbana', 'fondo blu'],
  itinerario_autostradale: ['itinerario autostradale', 'autostrada', 'fondo verde'],
  fine_diritto_precedenza: ['fine del diritto di precedenza', 'fine della precedenza'],
  ordine_incrocio: ['ordine di precedenza', "precedenza all'incrocio", 'ordine di transito'],
  preavviso_incrocio: ['preavviso di incrocio'],
  precedenza_a_sinistra: ['precedenza a sinistra', 'precedenza da sinistra'],
  alcol_e_droga: ['alcol', 'sostanze stupefacenti', 'droga', 'ebbrezza'],
  primo_soccorso: ['primo soccorso', 'soccorrere', 'assistenza ai feriti'],
  rc_auto: ['rc auto', 'responsabilita civile auto', 'assicurazione obbligatoria'],
  risarcimento_danni: ['risarcimento', 'risarcire'],
  inquinamento_atmosferico: ['inquinamento', 'gas di scarico', 'emissioni'],
  consumo_carburante: ['consumo di carburante', 'consumo di benzina', 'consumo del veicolo'],
  pneumatici_e_ambiente: ['pressione degli pneumatici', 'gonfiaggio degli pneumatici', 'battistrada'],
  manutenzione_ordinaria: ['manutenzione', 'controllo dei livelli', 'efficienza del veicolo'],
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
  carico: ['carico', 'sporgente'],
};

function getSearchPatterns(entry) {
  if (MANUAL_OVERRIDES[entry.id]) return MANUAL_OVERRIDES[entry.id];

  const term = normalize(entry.term);

  if (term.includes(' / ')) return term.split(' / ').map(s => s.trim());
  if (term.includes(' vs ')) return term.split(' vs ').map(s => s.trim());

  const words = term.split(' ');
  if (words.length > 1) {
    const REDUCE_TO_FIRST = new Set(['attraversamento']);
    if (REDUCE_TO_FIRST.has(words[0])) return [words[0]];
    return [term];
  }

  return [term];
}

function matchesText(normalizedText, patterns) {
  for (const pattern of patterns) {
    if (normalizedText.includes(pattern)) return true;
  }
  return false;
}

function loadAllQuestions() {
  const questions = [];
  for (let i = 1; i <= 25; i++) {
    const filePath = path.join(DATA_DIR, `topic_${i}.json`);
    if (!fs.existsSync(filePath)) { console.warn(`⚠️  Не найден: topic_${i}.json`); continue; }
    questions.push(...JSON.parse(fs.readFileSync(filePath, 'utf8')));
  }
  return questions;
}

function main() {
  console.log('🔗 Quiz Patente — Link Questions v2 (text/context split)');
  console.log('══════════════════════════════════════════════════════════\n');

  const entries = JSON.parse(fs.readFileSync(ENTRIES_IN, 'utf8'));
  console.log(`📖 Entries: ${entries.length}`);

  process.stdout.write('📂 Загружаем вопросы... ');
  const questions = loadAllQuestions();
  console.log(`✅ ${questions.length} вопросов\n`);

  // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ v2: text и comment нормализуются РАЗДЕЛЬНО
  const normText    = questions.map(q => normalize(q.text || ''));
  const normComment = questions.map(q => normalize((q.comment && q.comment.text) ? q.comment.text : ''));

  const reportLines = [
    `Quiz Patente — Link Report v2 (text/context split)`,
    `Generated: ${new Date().toISOString()}`,
    `MAX_IDS per field: ${MAX_IDS}`,
    '',
  ];

  let totalRelated = 0, totalContext = 0, totalDead = 0, totalEntries = 0;

  for (const entry of entries) {
    if (ONLY_ID && entry.id !== ONLY_ID) continue;
    totalEntries++;

    const patterns   = getSearchPatterns(entry);
    const relatedIds = [];  // term в question.text
    const contextIds = [];  // term только в question.comment

    for (let i = 0; i < questions.length; i++) {
      const inText    = matchesText(normText[i], patterns);
      const inComment = matchesText(normComment[i], patterns);

      if (inText) {
        if (relatedIds.length < MAX_IDS) relatedIds.push(questions[i].id);
      } else if (inComment) {
        if (contextIds.length < MAX_IDS) contextIds.push(questions[i].id);
      }

      if (relatedIds.length >= MAX_IDS && contextIds.length >= MAX_IDS) break;
    }

    entry.related_question_ids = relatedIds;
    entry.context_question_ids = contextIds;

    const isDead = relatedIds.length === 0 && contextIds.length === 0;
    const line = `${entry.id.padEnd(32)} text=${String(relatedIds.length).padStart(3)}  comment=${String(contextIds.length).padStart(3)}  ${isDead ? '⚠️ DEAD' : ''}`;
    console.log(line);
    reportLines.push(line);

    totalRelated += relatedIds.length;
    totalContext += contextIds.length;
    if (isDead) totalDead++;
  }

  const total = totalRelated + totalContext;
  const summary = [
    '', '═══ ИТОГ ═══',
    `Entries обработано:           ${totalEntries}`,
    `related_question_ids (text):  ${totalRelated}  (${Math.round(totalRelated/total*100)}%) — для Immersion`,
    `context_question_ids (comment): ${totalContext}  (${Math.round(totalContext/total*100)}%) — только контекст`,
    `Мёртвых записей (DEAD):       ${totalDead}`,
  ];
  summary.forEach(l => console.log(l));
  reportLines.push(...summary);

  if (DRY_RUN) { console.log('\n⚠️  --dry-run: файлы НЕ записаны.'); return; }

  fs.mkdirSync(path.dirname(BACKUP_OUT), { recursive: true });
  fs.copyFileSync(ENTRIES_IN, BACKUP_OUT);
  console.log(`\n💾 Бэкап: scripts/output/entries_backup.json`);

  fs.writeFileSync(ENTRIES_OUT, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`✅ Обновлён: src/data/dictionary/entries.json`);

  fs.writeFileSync(REPORT_OUT, reportLines.join('\n'), 'utf8');
  console.log(`📋 Отчёт:  scripts/output/link-report.txt\n`);
}

main();
