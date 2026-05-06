/**
 * highlightUtils.js
 * Утилиты для подсветки изученных терминов в тексте вопроса (Smart Highlighting).
 *
 * Используется QuestionCard и QuizPage в режиме Immersion.
 *
 * Алгоритм:
 *   1. buildLearnedLookup — строится один раз при загрузке квиза;
 *      Map: нормализованная_форма → entry. Покрывает:
 *        - основной term
 *        - варианты со «/» (напр. «agente del traffico / vigile» → два ключа)
 *        - опциональное поле morphology[]
 *   2. segmentText — разбивает текст вопроса на сегменты {text, entry|null}.
 *      Жадный поиск от длинных ключей к коротким (фразы раньше слов).
 *      Граница слова: учитывает итальянскую диакритику (à è é ì ò ù).
 *
 * Производительность:
 *   - buildLearnedLookup: O(entries) — вызывается один раз
 *   - segmentText: O(text_len × keys) — при 50 ключах и 20 словах < 1000 операций
 *   - На iPad mini 2 с пустым vocab: выход из segmentText за O(1)
 */

// Regex для проверки «не буква» на границах слова.
// Покрывает латиницу + итальянскую диакритику.
var WORD_CHAR = /[a-zA-Z\u00C0-\u024F]/;

/**
 * Привести строку к нормализованной форме для сравнения:
 * lowercase, без диакритики, trim.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Разбить term по «/» и вернуть массив нормализованных вариантов.
 * Пример: «agente del traffico / vigile / polizia»
 *   → ['agente del traffico', 'vigile', 'polizia']
 * Пример: «autostrada»
 *   → ['autostrada']
 *
 * @param {string} term
 * @returns {string[]}
 */
function termVariants(term) {
  return term
    .split('/')
    .map(function (part) { return normalize(part); })
    .filter(function (part) { return part.length > 0; });
}

/**
 * Построить lookup Map для быстрого поиска изученных терминов.
 * Вызывается один раз при монтировании QuizPage в immersion-режиме.
 *
 * @param {Array}  entries     — все записи из entries.json
 * @param {Object} learnedVocab — { [entryId]: true } из immersionService.getLearnedVocab()
 * @returns {Map<string, Object>} нормализованная_форма → entry
 */
export function buildLearnedLookup(entries, learnedVocab) {
  var lookup = new Map();
  if (!entries || !learnedVocab) return lookup;

  var i, j, entry, variants, variant;
  for (i = 0; i < entries.length; i++) {
    entry = entries[i];
    if (!learnedVocab[entry.id]) continue; // только изученные

    // Основной term (может содержать «/»)
    variants = termVariants(entry.term);
    for (j = 0; j < variants.length; j++) {
      variant = variants[j];
      if (variant.length > 0 && !lookup.has(variant)) {
        lookup.set(variant, entry);
      }
    }

    // Опциональное поле morphology[]
    if (entry.morphology && Array.isArray(entry.morphology)) {
      for (j = 0; j < entry.morphology.length; j++) {
        variant = normalize(entry.morphology[j]);
        if (variant.length > 0 && !lookup.has(variant)) {
          lookup.set(variant, entry);
        }
      }
    }
  }

  return lookup;
}

/**
 * Разбить текст вопроса на сегменты: обычный текст и совпадения с терминами.
 *
 * Алгоритм: жадный поиск слева направо.
 * Ключи сортируются по убыванию длины — фразы находятся раньше отдельных слов.
 * Для матчинга используется нормализованная копия текста;
 * в сегменты попадает оригинальный текст (с диакритикой и регистром).
 *
 * @param {string} text   — оригинальный текст вопроса (question.text)
 * @param {Map}    lookup — результат buildLearnedLookup
 * @returns {Array<{ text: string, entry: Object|null }>}
 */
export function segmentText(text, lookup) {
  // Быстрый выход: пустой текст или пустой lookup
  if (!text) return [{ text: '', entry: null }];
  if (!lookup || lookup.size === 0) return [{ text: text, entry: null }];

  // Сортируем ключи по убыванию длины один раз
  var sortedKeys = Array.from(lookup.keys()).sort(function (a, b) {
    return b.length - a.length;
  });

  var normText = normalize(text);
  var segments = [];
  var pos = 0;
  var textLen = text.length;
  var normLen = normText.length;
  var i, key, keyLen, slice, charBefore, charAfter, matched;

  while (pos < textLen) {
    matched = false;

    // Защита от выхода за пределы нормализованного текста
    if (pos >= normLen) {
      // Остаток оригинального текста (если длины расходятся из-за NFD)
      var tail = text.slice(pos);
      if (tail.length > 0) {
        if (segments.length > 0 && segments[segments.length - 1].entry === null) {
          segments[segments.length - 1].text += tail;
        } else {
          segments.push({ text: tail, entry: null });
        }
      }
      break;
    }

    for (i = 0; i < sortedKeys.length; i++) {
      key = sortedKeys[i];
      keyLen = key.length;

      // Быстрая проверка первого символа
      if (normText[pos] !== key[0]) continue;

      // Проверяем что нормализованный текст с позиции pos совпадает с ключом
      slice = normText.substr(pos, keyLen);
      if (slice !== key) continue;

      // Проверка границы слова: символ перед и после не должен быть буквой
      charBefore = pos > 0 ? normText[pos - 1] : ' ';
      charAfter  = pos + keyLen < normLen ? normText[pos + keyLen] : ' ';

      if (WORD_CHAR.test(charBefore) || WORD_CHAR.test(charAfter)) continue;

      // Совпадение найдено — берём оригинальный текст нужной длины
      segments.push({
        text: text.substr(pos, keyLen),
        entry: lookup.get(key),
      });
      pos += keyLen;
      matched = true;
      break;
    }

    if (!matched) {
      // Добавляем один символ к предыдущему plain-сегменту или создаём новый
      if (segments.length > 0 && segments[segments.length - 1].entry === null) {
        segments[segments.length - 1].text += text[pos];
      } else {
        segments.push({ text: text[pos], entry: null });
      }
      pos++;
    }
  }

  return segments;
}
