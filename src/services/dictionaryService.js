/**
 * dictionaryService.js
 * Загрузка записей словаря и управление прогрессом изучения.
 * Сейчас: JSON-файл + localStorage. Phase 2: заменить тела функций на fetch('/api/dictionary/...')
 *
 * Схема qp_dictionary:
 * {
 *   "sempre": { "seen": true, "practiced": false },
 *   "carreggiata": { "seen": true, "practiced": true }
 * }
 */

var STORAGE_KEY = 'qp_dictionary';

// Кэш в памяти — entries.json грузится один раз за сессию
var _entriesCache = null;

var entriesLoader = import.meta.glob('../data/dictionary/entries.json');

// ─── Загрузка данных ──────────────────────────────────────────────────────────

/**
 * Загрузить все записи словаря.
 * Результат кэшируется в памяти после первой загрузки.
 * @returns {Promise<Array>}
 */
export async function loadDictionaryEntries() {
  if (_entriesCache) return _entriesCache;

  var path = '../data/dictionary/entries.json';
  if (!entriesLoader[path]) {
    throw new Error('dictionaryService: entries.json не найден по пути ' + path);
  }

  var module = await entriesLoader[path]();
  _entriesCache = module.default || module;
  return _entriesCache;
}

/**
 * Загрузить записи, отфильтрованные по типу.
 * @param {string} type — 'all' | 'logic_trigger' | 'term' | 'phrase' | 'concept'
 * @returns {Promise<Array>}
 */
export async function loadEntriesByType(type) {
  var all = await loadDictionaryEntries();
  if (type === 'all') return all;
  return all.filter(function (e) { return e.type === type; });
}

/**
 * Загрузить записи, связанные с конкретной темой.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export async function loadEntriesByTopic(topicId) {
  var all = await loadDictionaryEntries();
  var id = Number(topicId);
  return all.filter(function (e) {
    return Array.isArray(e.topics) && e.topics.includes(id);
  });
}

/**
 * Получить одну запись по id (синхронно, только если кэш уже загружен).
 * @param {string} entryId
 * @returns {Object|null}
 */
export function getEntry(entryId) {
  if (!_entriesCache) return null;
  return _entriesCache.find(function (e) { return e.id === entryId; }) || null;
}

// ─── Клиентский поиск ────────────────────────────────────────────────────────

/**
 * Синхронная фильтрация массива записей по поисковому запросу.
 * Поддерживает итальянский текст с диакритикой (à, è, ì, ò, ù).
 * @param {Array} entries — массив записей для поиска
 * @param {string} query  — строка запроса
 * @returns {Array}
 */
export function searchEntries(entries, query) {
  if (!query || query.trim().length < 2) return entries;

  var normalize = function (str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  var q = normalize(query.trim());

  return entries.filter(function (e) {
    return (
      normalize(e.term).includes(q) ||
      normalize(e.term_ru).includes(q) ||
      normalize(e.definition && e.definition.ru ? e.definition.ru : '').includes(q)
    );
  });
}

// ─── Прогресс изучения ────────────────────────────────────────────────────────

/**
 * Получить весь прогресс изучения словаря.
 * @returns {Object} — { [entryId]: { seen, practiced } }
 */
export function getDictionaryProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Отметить запись как просмотренную (пользователь открыл карточку).
 * @param {string} entryId
 */
export function markAsSeen(entryId) {
  var progress = getDictionaryProgress();
  if (!progress[entryId]) progress[entryId] = {};
  progress[entryId].seen = true;
  _saveProgress(progress);
}

/**
 * Отметить запись как отработанную (пользователь перешёл в квиз по термину).
 * @param {string} entryId
 */
export function markAsPracticed(entryId) {
  var progress = getDictionaryProgress();
  if (!progress[entryId]) progress[entryId] = {};
  progress[entryId].seen = true;
  progress[entryId].practiced = true;
  _saveProgress(progress);
}

/**
 * Очистить весь прогресс словаря.
 */
export function clearDictionaryProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Приватные утилиты ────────────────────────────────────────────────────────

function _saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('dictionaryService: не удалось сохранить прогресс', e);
  }
}
