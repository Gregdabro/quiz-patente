/**
 * FlashCardDeck.jsx
 * Обёртка колоды флешкарт для одной стадии Staged Immersion Mode.
 *
 * Отвечает за:
 *   - управление очередью карточек через useFlashCards
 *   - свайп-навигацию через useSwipe
 *   - анимацию смены через SlideTransition
 *   - рендер нижней навигации (← Назад / Понятно ✓)
 *   - экран завершения стадии (DoneScreen) когда isDone=true
 *
 * Props:
 *   cards      {Array}    — stage1Cards или stage2Cards из useImmersion
 *   onComplete {Function} — вызывается когда пользователь нажал "Продолжить"
 *                           на экране завершения стадии
 */

import React, { useRef } from 'react';
import useFlashCards from '../../hooks/useFlashCards';
import useSwipe from '../../hooks/useSwipe';
import SlideTransition from '../ui/SlideTransition';
import FlashCard from './FlashCard';

// --------------------------------------------------------------------------
// DoneScreen — экран-итог после того как все карточки отмечены "Понятно"
// --------------------------------------------------------------------------
function DoneScreen(props) {
  var total      = props.total;
  var onComplete = props.onComplete;

  return (
    <div className="flash-deck__done-screen">
      <p className="flash-deck__done-icon">&#x1F393;</p>
      <p className="flash-deck__done-title">Стадия завершена!</p>
      <p className="flash-deck__done-subtitle">
        {total > 0
          ? total + '\u00a0' + pluralCards(total) + ' изучено'
          : 'Карточек не было — идём дальше'}
      </p>
      <button
        className="btn btn-primary flash-deck__done-btn"
        onClick={onComplete}
      >
        Продолжить &#x2192;
      </button>
    </div>
  );
}

// Простой плюрализатор для "карточка/карточки/карточек"
function pluralCards(n) {
  var mod10  = n % 10;
  var mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11)  return 'карточка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'карточки';
  return 'карточек';
}

// --------------------------------------------------------------------------
// FlashCardDeck
// --------------------------------------------------------------------------
var FlashCardDeck = function FlashCardDeck(props) {
  var cards      = props.cards;
  var onComplete = props.onComplete;

  var deck = useFlashCards(cards);

  // Направление анимации: отслеживаем предыдущий индекс
  var prevIndexRef = useRef(deck.cardIndex);
  var direction = deck.cardIndex >= prevIndexRef.current ? 'forward' : 'backward';
  // Обновляем ref ПОСЛЕ вычисления direction (синхронно, до рендера)
  // Используем ref как мутабельное значение — не вызывает ре-рендер
  if (prevIndexRef.current !== deck.cardIndex) {
    prevIndexRef.current = deck.cardIndex;
  }

  // Свайп-навигация: влево = следующая, вправо = предыдущая
  var swipeHandlers = useSwipe({
    onSwipeLeft:  deck.isDone ? undefined : deck.goNext,
    onSwipeRight: deck.isDone ? undefined : deck.goPrev,
    threshold: 60,
  });

  // Если стадия завершена — показываем DoneScreen (без анимации смены)
  if (deck.isDone) {
    return (
      <div className="flash-deck">
        <DoneScreen total={deck.total} onComplete={onComplete} />
      </div>
    );
  }

  var currentCard  = deck.currentCard;
  var isCurrentDone = currentCard ? deck.doneIds.has(currentCard.id) : false;

  return (
    <div
      className="flash-deck"
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={swipeHandlers.onTouchEnd}
    >
      {/* Область карточки с анимацией */}
      <div className="flash-deck__card-area">
        <SlideTransition
          contentKey={currentCard ? currentCard.id : 'empty'}
          direction={direction}
        >
          {currentCard ? (
            <FlashCard
              entry={currentCard}
              index={deck.cardIndex}
              total={deck.total}
              isDone={isCurrentDone}
            />
          ) : null}
        </SlideTransition>
      </div>

      {/* Нижняя навигация */}
      <div className="flash-deck__nav">
        {/* Кнопка "Назад" — disabled на первой карточке */}
        <button
          className="btn btn-secondary flash-deck__nav-btn flash-deck__nav-btn--back"
          onClick={deck.goPrev}
          disabled={deck.cardIndex === 0}
        >
          &#x2190; Назад
        </button>

        {/* Кнопка "Понятно" — после нажатия меняется на "Запомнено" (disabled) */}
        {isCurrentDone ? (
          <button
            className="btn flash-deck__nav-btn flash-deck__nav-btn--done-state"
            disabled={true}
          >
            &#x2713; Запомнено
          </button>
        ) : (
          <button
            className="btn btn-primary flash-deck__nav-btn flash-deck__nav-btn--mark"
            onClick={deck.markDone}
          >
            Понятно &#x2713;
          </button>
        )}
      </div>
    </div>
  );
};

export default FlashCardDeck;
