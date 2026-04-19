/**
 * questionsService.js
 * Загрузка вопросов из JSON-файлов (src/data/).
 * Сейчас: динамический import(). Phase 2: заменить на fetch('/api/questions/...')
 */

import { shuffle } from '../utils/shuffle.js';

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
