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
  var path = '../data/questions/topic_' + topicId + '.json';
  if (!questionsCache[path]) {
    throw new Error('Вопросы темы не найдены: ' + path);
  }
  var module = await questionsCache[path]();
  return module.default || module;
}

/**
 * Загружает все вопросы из всех тем (1–25).
 * @returns {Promise<Array>}
 */
export async function loadAllQuestions() {
  var promises = [];
  for (var i = 1; i <= 25; i++) {
    promises.push(loadTopicQuestions(i));
  }
  var results = await Promise.all(promises);
  var all = [];
  for (var j = 0; j < results.length; j++) {
    all = all.concat(results[j]);
  }
  return all;
}

/**
 * Возвращает случайную выборку из SESSION_SIZE вопросов.
 * @param {Array} questions — полный список вопросов
 * @returns {Array} — 30 перемешанных вопросов
 */
export function pickSessionQuestions(questions) {
  var shuffled = shuffle(questions);
  return shuffled.slice(0, SESSION_SIZE);
}

/**
 * Загружает метаданные тем.
 * @returns {Promise<Array>}
 */
export async function loadTopics() {
  var path = '../data/topics.json';
  if (!topicsCache[path]) {
    throw new Error('Метаданные тем не найдены');
  }
  var module = await topicsCache[path]();
  return module.default || module;
}
