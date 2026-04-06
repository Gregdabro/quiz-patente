/**
 * progressService.js
 * Сохранение и получение прогресса по темам.
 * Сейчас: localStorage. Phase 2: заменить тела функций на fetch('/api/progress')
 *
 * Схема qp_progress:
 * {
 *   "1": { lastRun, correct, total, bestScore, runs }
 * }
 */

var STORAGE_KEY = 'qp_progress';

/**
 * Получить весь прогресс.
 * @returns {Object}
 */
export function getProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Получить прогресс одной темы.
 * @param {number|string} topicId
 * @returns {Object|null}
 */
export function getTopicProgress(topicId) {
  var progress = getProgress();
  return progress[String(topicId)] || null;
}

/**
 * Сохранить результат прохождения теста.
 * @param {number|string} topicId
 * @param {number} correct — количество правильных ответов
 * @param {number} total   — всего вопросов в сессии
 */
export function saveTestResult(topicId, correct, total) {
  var progress = getProgress();
  var key = String(topicId);
  var existing = progress[key] || { bestScore: 0, runs: 0 };

  progress[key] = {
    lastRun:   Date.now(),
    correct:   correct,
    total:     total,
    bestScore: Math.max(existing.bestScore, correct),
    runs:      existing.runs + 1,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('progressService: не удалось сохранить прогресс', e);
  }
}

/**
 * Очистить весь прогресс.
 */
export function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
