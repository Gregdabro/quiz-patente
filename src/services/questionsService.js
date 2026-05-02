/**
 * questionsService.js
 * Загрузка вопросов из JSON-файлов (src/data/).
 * Сейчас: динамический import(). Phase 2: заменить на fetch('/api/questions/...')
 */

import { shuffle } from '../utils/shuffle.js';
import { getErrors } from './errorsService.js';

const SESSION_SIZE = 30;

const topicsCache = import.meta.glob('../data/topics.json');
const questionsCache = import.meta.glob('../data/questions/topic_*.json');

/**
 * Загружает все вопросы одной темы.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export async function loadTopicQuestions(topicId) {
  const path = '../data/questions/topic_' + topicId + '.json';
  if (!questionsCache[path]) {
    throw new Error('Вопросы темы не найдены: ' + path);
  }
  const module = await questionsCache[path]();
  return module.default || module;
}

/**
 * Загружает строго последовательный срез вопросов темы (для режима Immersion).
 * НЕ перемешивает — порядок из JSON сохраняется как есть.
 * Вызывается из useQuiz при topicId вида 'immersion:topicId:chunkIndex'.
 * @param {string|number} topicId
 * @param {number} chunkIndex — индекс блока (0-based)
 * @param {number} [chunkSize=20] — количество вопросов в блоке
 * @returns {Promise<Array>}
 */
export async function loadChunkQuestions(topicId, chunkIndex, chunkSize) {
  const size = chunkSize || 20;
  const all = await loadTopicQuestions(topicId);
  const start = chunkIndex * size;
  return all.slice(start, start + size);
}

/**
 * Загружает все вопросы из всех тем (1–25).
 * @returns {Promise<Array>}
 */
export async function loadAllQuestions() {
  const ids = Array.from({ length: 25 }, (_, i) => i + 1);
  const all = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(id => loadTopicQuestions(id))
    );
    all.push(...results.flat());
  }
  return all;
}

/**
 * Возвращает случайную выборку из SESSION_SIZE вопросов.
 * @param {Array} questions — полный список вопросов
 * @returns {Array} — 30 перемешанных вопросов
 */
export function pickSessionQuestions(questions) {
  const shuffled = shuffle(questions);
  return shuffled.slice(0, SESSION_SIZE);
}

/**
 * Загружает вопросы одной темы, отфильтрованные по ошибкам пользователя.
 * Shuffle делает pickSessionQuestions / useQuiz — здесь не нужен.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export async function loadTopicErrorQuestions(topicId) {
  const allTopicQuestions = await loadTopicQuestions(topicId);
  const errorIds = getErrors();
  return allTopicQuestions.filter(q => errorIds[String(q.id)]);
}

/**
 * Загружает вопросы, связанные с конкретной записью словаря.
 * Используется в режиме Quiz Link: topicId = 'dict:entryId'
 *
 * Стратегия:
 * 1. Если у entry есть related_question_ids — грузим только нужные темы и фильтруем по id
 * 2. Если related_question_ids пуст — ищем по вхождению термина в текст вопроса
 * 3. Результат перемешивается в pickSessionQuestions / useQuiz
 *
 * @param {Object} entry — запись из entries.json (с полями topics, related_question_ids, term)
 * @returns {Promise<Array>}
 */
/**
 * Загружает вопросы для Practice Mode по записи словаря (режим «dict:entryId»).
 *
 * Два пула вопросов (СТРОГО РАЗДЕЛЕНЫ — архитектурное требование):
 *
 *   related_question_ids  — термин присутствует в ТЕКСТЕ вопроса (primary).
 *                           Пользователь ВИДИТ слово в вопросе.
 *                           Используется по умолчанию.
 *
 *   context_question_ids  — термин присутствует только в КОММЕНТАРИИ к вопросу (secondary).
 *                           Педагогически ценно для понимания контекста ПДД,
 *                           но термин не виден в тексте вопроса.
 *                           Используется как дополнение если primary пуст,
 *                           или через явный флаг includeContext=true.
 *
 * Immersion Mode (Stage 1/2) использует ТОЛЬКО related_question_ids — см. immersionService.js.
 *
 * @param {Object}  entry          — запись из entries.json
 * @param {boolean} [includeContext=false] — добавить context_question_ids к результату
 * @returns {Promise<Array>}
 */
export async function loadQuestionsByEntry(entry, includeContext) {
  if (!entry) throw new Error('loadQuestionsByEntry: entry не передан');

  // Берём темы из entry.topics (уже известны какие файлы грузить)
  const topicIds = Array.isArray(entry.topics) && entry.topics.length > 0
    ? entry.topics
    : Array.from({ length: 25 }, (_, i) => i + 1); // fallback — все темы

  // Загружаем нужные темы пачками по 5
  const all = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < topicIds.length; i += BATCH_SIZE) {
    const batch = topicIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(id => loadTopicQuestions(id)));
    all.push(...results.flat());
  }

  // Primary пул: related_question_ids (term в тексте вопроса)
  const hasRelated = Array.isArray(entry.related_question_ids) && entry.related_question_ids.length > 0;
  if (hasRelated) {
    const relatedSet = new Set(entry.related_question_ids);

    // Secondary пул: context_question_ids (term в комментарии) — только если запрошен
    const contextSet = (includeContext && Array.isArray(entry.context_question_ids) && entry.context_question_ids.length > 0)
      ? new Set(entry.context_question_ids)
      : null;

    const filtered = all.filter(function (q) {
      return relatedSet.has(q.id) || (contextSet && contextSet.has(q.id));
    });

    if (filtered.length > 0) return filtered;
  }

  // Fallback: поиск по вхождению термина в текст вопроса
  // (страховка на случай если related_question_ids не заполнены — запустить link-questions.js)
  var term = (entry.term || '').toLowerCase();
  return all.filter(function (q) {
    return q.text && q.text.toLowerCase().includes(term);
  });
}

/**
 * Загружает метаданные тем.
 * @returns {Promise<Array>}
 */
export async function loadTopics() {
  const path = '../data/topics.json';
  if (!topicsCache[path]) {
    throw new Error('Метаданные тем не найдены');
  }
  const module = await topicsCache[path]();
  return module.default || module;
}
