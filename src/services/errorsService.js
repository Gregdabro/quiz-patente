/**
 * errorsService.js
 * Управление счётчиком ошибок по вопросам.
 * Сейчас: localStorage. Phase 2: заменить тела функций на fetch('/api/errors')
 *
 * Схема qp_errors:
 * { "questionId": count }
 * Значение = кол-во неправильных ответов.
 * При count === 0 — ключ удаляется.
 */

var STORAGE_KEY = 'qp_errors';

/**
 * Получить все ошибки.
 * @returns {Object} { questionId: count }
 */
export function getErrors() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Инкрементировать счётчик ошибки для вопроса (неправильный ответ).
 * @param {number|string} questionId
 */
export function incrementError(questionId) {
  var errors = getErrors();
  var key = String(questionId);
  errors[key] = (errors[key] || 0) + 1;
  _save(errors);
}

/**
 * Декрементировать счётчик ошибки для вопроса (правильный ответ).
 * Если счётчик достигает 0 — удалить ключ.
 * @param {number|string} questionId
 */
export function decrementError(questionId) {
  var errors = getErrors();
  var key = String(questionId);
  if (!errors[key]) return;

  errors[key] = errors[key] - 1;
  if (errors[key] <= 0) {
    delete errors[key];
  }
  _save(errors);
}

/**
 * Получить список ID вопросов с ошибками.
 * @returns {string[]}
 */
export function getErrorIds() {
  var errors = getErrors();
  return Object.keys(errors);
}

/**
 * Получить количество уникальных вопросов с ошибками.
 * @returns {number}
 */
export function getErrorCount() {
  return getErrorIds().length;
}

/**
 * Получить вопросы-ошибки из полного списка.
 * @param {Array} allQuestions — весь массив вопросов
 * @returns {Array}
 */
export function getErrorQuestions(allQuestions) {
  var errorIds = getErrors();
  return allQuestions.filter(function (q) {
    return errorIds[String(q.id)];
  });
}

/**
 * Получить количество ошибок для конкретной темы.
 * Принимает уже загруженный массив вопросов и сверяет с qp_errors.
 * @param {Array} topicQuestions — массив вопросов одной темы
 * @returns {number}
 */
export function getErrorCountForQuestions(topicQuestions) {
  var errorIds = getErrors();
  var count = 0;
  for (var i = 0; i < topicQuestions.length; i++) {
    if (errorIds[String(topicQuestions[i].id)]) {
      count++;
    }
  }
  return count;
}

/**
 * Получить общее количество уникальных вопросов с ошибками.
 * @returns {number}
 */
export function getTotalErrorCount() {
  return getErrorIds().length;
}

/**
 * Очистить все ошибки.
 */
export function clearErrors() {
  localStorage.removeItem(STORAGE_KEY);
}

function _save(errors) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch (e) {
    console.error('errorsService: не удалось сохранить ошибки', e);
  }
}
