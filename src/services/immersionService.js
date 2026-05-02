/**
 * immersionService.js
 * Данные для режима Staged Immersion: глобальный словарь изученных терминов
 * и прогресс по чанкам каждой темы.
 * Сейчас: localStorage. Phase 2: заменить тела функций на fetch('/api/immersion/...')
 *
 * Схема qp_immersion_vocab:
 * { [entryId: string]: true }
 * Пример: { "sempre": true, "carreggiata": true }
 *
 * Схема qp_immersion_progress:
 * { [topicId: string]: { [chunkIndex: string]: { s1: 'done'|'pending', s2: 'done'|'pending', quiz: 'done'|'pending' } } }
 * Пример: { "1": { "0": { s1: 'done', s2: 'done', quiz: 'done' } } }
 */

var STORAGE_KEY_VOCAB    = 'qp_immersion_vocab';
var STORAGE_KEY_PROGRESS = 'qp_immersion_progress';

var DEFAULT_CHUNK_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Vocab — глобальный словарь изученных терминов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Получить весь словарь изученных терминов.
 * @returns {{ [entryId: string]: true }}
 */
export function getLearnedVocab() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY_VOCAB);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Отметить один термин как изученный.
 * @param {string} entryId
 */
export function markWordLearned(entryId) {
  var vocab = getLearnedVocab();
  vocab[entryId] = true;
  _saveVocab(vocab);
}

/**
 * Отметить массив терминов как изученных (батч по завершении стадии).
 * @param {string[]} entryIds
 */
export function markWordsLearned(entryIds) {
  if (!entryIds || entryIds.length === 0) return;
  var vocab = getLearnedVocab();
  for (var i = 0; i < entryIds.length; i++) {
    vocab[entryIds[i]] = true;
  }
  _saveVocab(vocab);
}

/**
 * Проверить, изучен ли термин.
 * @param {string} entryId
 * @returns {boolean}
 */
export function isWordLearned(entryId) {
  var vocab = getLearnedVocab();
  return vocab[entryId] === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress — прогресс по чанкам
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Получить весь прогресс по всем темам и чанкам.
 * @returns {Object}
 */
function _getAllProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Получить прогресс одного чанка.
 * Возвращает объект с тремя стадиями; если прогресса нет — все 'pending'.
 * @param {string|number} topicId
 * @param {number} chunkIndex
 * @returns {{ s1: string, s2: string, quiz: string }}
 */
export function getChunkProgress(topicId, chunkIndex) {
  var all = _getAllProgress();
  var topicKey = String(topicId);
  var chunkKey = String(chunkIndex);

  if (all[topicKey] && all[topicKey][chunkKey]) {
    return all[topicKey][chunkKey];
  }

  return { s1: 'pending', s2: 'pending', quiz: 'pending' };
}

/**
 * Отметить стадию чанка как завершённую.
 * @param {string|number} topicId
 * @param {number} chunkIndex
 * @param {'s1'|'s2'|'quiz'} stage
 */
export function markStageComplete(topicId, chunkIndex, stage) {
  var all = _getAllProgress();
  var topicKey = String(topicId);
  var chunkKey = String(chunkIndex);

  if (!all[topicKey]) {
    all[topicKey] = {};
  }
  if (!all[topicKey][chunkKey]) {
    all[topicKey][chunkKey] = { s1: 'pending', s2: 'pending', quiz: 'pending' };
  }

  all[topicKey][chunkKey][stage] = 'done';

  _saveProgress(all);
}

/**
 * Проверить, разблокирован ли чанк.
 * Чанк 0 всегда разблокирован.
 * Чанк N разблокирован, если чанк N-1 полностью завершён (s1 + s2 + quiz = 'done').
 * @param {string|number} topicId
 * @param {number} chunkIndex
 * @returns {boolean}
 */
export function isChunkUnlocked(topicId, chunkIndex) {
  if (chunkIndex === 0) return true;

  var prev = getChunkProgress(topicId, chunkIndex - 1);
  return prev.s1 === 'done' && prev.s2 === 'done' && prev.quiz === 'done';
}

// ─────────────────────────────────────────────────────────────────────────────
// Core — работа с данными чанка
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Вычислить данные одного чанка: вопросы, карточки для Stage 1 и Stage 2.
 *
 * Алгоритм:
 * 1. Вырезаем последовательный срез вопросов (без shuffle).
 * 2. Join: находим entries, чьи related_question_ids пересекаются с вопросами чанка.
 * 3. Фильтруем уже изученные термины через global vocab.
 * 4. Stage 1 — logic_trigger + term, топ 12 по priority (1 = высший).
 * 5. Stage 2 — phrase + concept, топ 8 по priority.
 *
 * @param {string|number} topicId — не используется в вычислении, передаётся для vocab
 * @param {Array} allEntries      — полный массив записей из entries.json
 * @param {Array} topicQuestions  — полный массив вопросов темы (без shuffle)
 * @param {number} chunkIndex
 * @param {number} [chunkSize=20]
 * @returns {{
 *   questions: Array,
 *   stage1Cards: Array,
 *   stage2Cards: Array,
 *   totalRelevant: number,
 *   alreadyKnown: number
 * }}
 */
export function getChunkData(topicId, allEntries, topicQuestions, chunkIndex, chunkSize) {
  var size = chunkSize || DEFAULT_CHUNK_SIZE;
  var start = chunkIndex * size;

  // 1. Срез вопросов чанка
  var questions = topicQuestions.slice(start, start + size);
  var questionIds = {};
  for (var i = 0; i < questions.length; i++) {
    questionIds[questions[i].id] = true;
  }

  // 2. Join: entries → вопросы чанка.
  //
  // АРХИТЕКТУРНОЕ ТРЕБОВАНИЕ: использовать ТОЛЬКО related_question_ids (term в тексте вопроса).
  // context_question_ids (term только в комментарии) здесь ЗАПРЕЩЕНЫ — иначе пользователь
  // изучает карточку термина, а в квизе этот термин не встречается в тексте вопроса.
  // Подробнее: AUDIT_DICTIONARY_IMMERSION-MODE.md, Issue #2.
  var relevantEntries = allEntries.filter(function (entry) {
    var ids = entry.related_question_ids;
    if (!ids || ids.length === 0) return false;
    for (var j = 0; j < ids.length; j++) {
      if (questionIds[ids[j]]) return true;
    }
    return false;
  });

  // 3. Фильтруем уже изученные
  var learnedVocab = getLearnedVocab();
  var newEntries = relevantEntries.filter(function (e) {
    return !learnedVocab[e.id];
  });

  var alreadyKnown = relevantEntries.length - newEntries.length;

  // 4. Stage 1: logic_trigger + term, топ 12
  var stage1Cards = newEntries
    .filter(function (e) {
      return e.type === 'logic_trigger' || e.type === 'term';
    })
    .sort(_byPriority)
    .slice(0, 12);

  // 5. Stage 2: phrase + concept, топ 8
  var stage2Cards = newEntries
    .filter(function (e) {
      return e.type === 'phrase' || e.type === 'concept';
    })
    .sort(_byPriority)
    .slice(0, 8);

  return {
    questions:     questions,
    stage1Cards:   stage1Cards,
    stage2Cards:   stage2Cards,
    totalRelevant: relevantEntries.length,
    alreadyKnown:  alreadyKnown,
  };
}

/**
 * Вычислить метаданные всех чанков темы (для страницы выбора чанка ImmersionPage).
 *
 * @param {string|number} topicId
 * @param {Array} topicQuestions — полный массив вопросов темы
 * @param {number} [chunkSize=20]
 * @returns {Array<{
 *   index: number,
 *   label: string,
 *   questionCount: number,
 *   fromId: number,
 *   toId: number,
 *   progress: { s1: string, s2: string, quiz: string },
 *   isUnlocked: boolean
 * }>}
 */
export function getChunksMetadata(topicId, topicQuestions, chunkSize) {
  var size = chunkSize || DEFAULT_CHUNK_SIZE;
  var totalChunks = Math.ceil(topicQuestions.length / size);
  var result = [];

  for (var i = 0; i < totalChunks; i++) {
    var start = i * size;
    var slice = topicQuestions.slice(start, start + size);

    // fromId и toId — порядковые номера вопросов (1-based) для отображения в UI
    var fromNum = start + 1;
    var toNum   = start + slice.length;

    result.push({
      index:         i,
      label:         'Блок ' + (i + 1),
      questionCount: slice.length,
      fromId:        fromNum,
      toId:          toNum,
      progress:      getChunkProgress(topicId, i),
      isUnlocked:    isChunkUnlocked(topicId, i),
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Приватные хелперы
// ─────────────────────────────────────────────────────────────────────────────

function _byPriority(a, b) {
  return (a.priority || 3) - (b.priority || 3);
}

function _saveVocab(vocab) {
  try {
    localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(vocab));
  } catch (e) {
    console.error('immersionService: не удалось сохранить vocab', e);
  }
}

function _saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('immersionService: не удалось сохранить progress', e);
  }
}
