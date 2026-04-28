/**
 * useFlashCards.js
 * Управляет навигацией и состоянием отметок для одной колоды флешкарт.
 *
 * Изолированный хук без побочных эффектов:
 * - Нет localStorage (vocab сохраняет useImmersion через completeStage)
 * - Нет сервисов
 * - Нет useEffect
 *
 * Неявная машина состояний:
 *
 *   [Начало] cardIndex=0, doneIds={}
 *       │
 *       ├─ goNext()  → cardIndex++  (если < total-1)
 *       ├─ goPrev()  → cardIndex--  (если > 0)
 *       └─ markDone() → doneIds.add(currentCard.id) → goNext (если не последняя)
 *                                                    → остаёмся (если последняя)
 *   [Готово] isDone = doneIds.size >= total
 *
 * Краевые случаи:
 *   - cards пустой → total=0, isDone=true немедленно, currentCard=null
 *   - single card  → isLast=true сразу; markDone → isDone=true, cardIndex остаётся 0
 *   - повторный markDone → Set идемпотентен, goNext не вызывается повторно (index уже максимум)
 *   - goNext после isDone → навигация разрешена, просмотр завершённых карточек доступен
 *   - goPrev на index=0 → ничего не происходит
 *
 * @param {Array} cards - массив Entry из entries.json (stage1Cards или stage2Cards)
 * @returns {{
 *   currentCard: Object|null,
 *   cardIndex: number,
 *   total: number,
 *   isLast: boolean,
 *   isDone: boolean,
 *   goNext: function,
 *   goPrev: function,
 *   markDone: function,
 *   doneIds: Set<string>
 * }}
 */

import { useState, useCallback, useMemo } from 'react';

export default function useFlashCards(cards) {
  // Защита от undefined/null
  var safeCards = Array.isArray(cards) ? cards : [];
  var total = safeCards.length;

  var [cardIndex, setCardIndex] = useState(0);

  // Set хранится как состояние React.
  // При каждом обновлении создаём новый Set — гарантируем иммутабельность
  // и корректный ре-рендер (React сравнивает по ссылке).
  var [doneIds, setDoneIds] = useState(function () { return new Set(); });

  // Текущая карточка — null если массив пуст
  var currentCard = total > 0 ? safeCards[cardIndex] : null;

  // isLast: находимся на последней карточке (или единственной)
  var isLast = total === 0 ? false : cardIndex === total - 1;

  // isDone: все карточки отмечены (включая случай 0 карточек → true сразу)
  var isDone = useMemo(function () {
    return doneIds.size >= total;
  }, [doneIds, total]);

  /**
   * Перейти к следующей карточке.
   * Ничего не делает если уже на последней или массив пустой.
   */
  var goNext = useCallback(function () {
    setCardIndex(function (prev) {
      if (prev >= total - 1) return prev;
      return prev + 1;
    });
  }, [total]);

  /**
   * Перейти к предыдущей карточке.
   * Ничего не делает если уже на первой или массив пустой.
   */
  var goPrev = useCallback(function () {
    setCardIndex(function (prev) {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  }, []);

  /**
   * Отметить текущую карточку как "Понятно".
   * - Добавляет id в doneIds (идемпотентно — Set не дублирует)
   * - Переходит к следующей карточке, если текущая не последняя
   * - Если последняя — остаётся на ней (пользователь видит финальный экран колоды)
   *
   * Ничего не делает если массив пустой.
   */
  var markDone = useCallback(function () {
    if (!currentCard) return;

    var entryId = currentCard.id;

    setDoneIds(function (prev) {
      // Идемпотентность: если уже отмечена — не создаём новый Set
      if (prev.has(entryId)) return prev;
      var next = new Set(prev);
      next.add(entryId);
      return next;
    });

    // Переходим к следующей карточке, только если не последняя
    setCardIndex(function (prev) {
      if (prev >= total - 1) return prev;
      return prev + 1;
    });
  }, [currentCard, total]);

  return {
    currentCard: currentCard,
    cardIndex:   cardIndex,
    total:       total,
    isLast:      isLast,
    isDone:      isDone,
    goNext:      goNext,
    goPrev:      goPrev,
    markDone:    markDone,
    doneIds:     doneIds,
  };
}
