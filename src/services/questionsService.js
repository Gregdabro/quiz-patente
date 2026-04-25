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
export async function loadQuestionsByEntry(entry) {
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

  // Фильтрация: сначала по related_question_ids, потом по термину в тексте
  const hasIds = Array.isArray(entry.related_question_ids) && entry.related_question_ids.length > 0;

  if (hasIds) {
    const idSet = new Set(entry.related_question_ids);
    const filtered = all.filter(function (q) { return idSet.has(q.id); });
    // Если нашли вопросы по id — отдаём, иначе падаем на поиск по тексту
    if (filtered.length > 0) return filtered;
  }

  // Поиск по вхождению термина в итальянский текст вопроса
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
