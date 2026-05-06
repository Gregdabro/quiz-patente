/**
 * FlashCard.jsx
 * Карточка одного термина в режиме Staged Immersion.
 *
 * Поведение:
 *   - По умолчанию показывает только термин + перевод (collapsed).
 *   - Клик на кнопку «Показать объяснение» раскрывает определение,
 *     подсказку и пример (expanded).
 *   - При смене карточки (entry.id меняется) collapsed-состояние сбрасывается.
 *
 * Props:
 *   entry  {Object}  — запись из entries.json
 *   index  {number}  — текущий индекс (0-based), для счётчика N/Total
 *   total  {number}  — всего карточек в стадии
 *   isDone {boolean} — карточка уже отмечена «Понятно»
 *
 * React.memo: карточка не перерисовывается если props не изменились.
 */

import React, { useState, useEffect } from 'react';

var BADGE_MAP = {
  logic_trigger: { cls: 'flash-badge--logic-trigger', label: 'ЛОВУШКА' },
  term: { cls: 'flash-badge--term', label: 'ТЕРМИН' },
  phrase: { cls: 'flash-badge--phrase', label: 'ФРАЗА' },
  concept: { cls: 'flash-badge--concept', label: 'КОНЦЕПЦИЯ' },
};

var FlashCard = React.memo(function FlashCard(props) {
  var entry = props.entry;
  var index = props.index;
  var total = props.total;
  var isDone = props.isDone;

  var [isExpanded, setIsExpanded] = useState(false);

  // Сбрасываем expanded при смене карточки
  useEffect(function () {
    setIsExpanded(false);
  }, [entry ? entry.id : null]);

  if (!entry) return null;

  var badge = BADGE_MAP[entry.type] || BADGE_MAP.term;
  var example = entry.examples && entry.examples.length > 0 ? entry.examples[0] : null;

  var hasDefinition = entry.definition && entry.definition.ru;
  var hasHint = entry.quiz_hint && entry.quiz_hint.ru;
  var hasCollapsible = hasDefinition || hasHint || example;

  function handleToggle() {
    setIsExpanded(function (prev) { return !prev; });
  }

  return (
    <div className={'flash-card' + (isDone ? ' flash-card--done' : '')}>

      {/* Заголовок: badge слева, счётчик справа */}
      <div className="flash-card__header">
        <span className={'flash-card__badge ' + badge.cls}>
          {badge.label}
        </span>
        <span className="flash-card__counter">
          {index + 1} / {total}
        </span>
      </div>

      {/* Термин — всегда виден */}
      <div className="flash-card__term-block">
        <p className="flash-card__term">{entry.term}</p>
        <p className="flash-card__term-ru">{entry.term_ru}</p>
      </div>

      {/* Кнопка expand/collapse — только если есть что раскрывать */}
      {hasCollapsible && (
        <button
          className={'flash-card__expand-btn' + (isExpanded ? ' flash-card__expand-btn--open' : '')}
          onClick={handleToggle}
        >
          {isExpanded ? '\u25B2 Скрыть' : '\u25BC Показать объяснение'}
        </button>
      )}

      {/* Раскрывающийся блок: max-height transition (iOS 12 safe) */}
      <div className={'flash-card__collapsible' + (isExpanded ? ' flash-card__collapsible--open' : '')}>

        <hr className="flash-card__divider" />

        {hasDefinition && (
          <div className="flash-card__section flash-card__section--definition">
            <p className="flash-card__section-label">Что это:</p>
            <p className="flash-card__section-text">{entry.definition.ru}</p>
          </div>
        )}

        {hasHint && (
          <div className="flash-card__section flash-card__section--hint">
            <p className="flash-card__section-label">В квизе:</p>
            <p className="flash-card__section-text">{entry.quiz_hint.ru}</p>
          </div>
        )}

        {example && (
          <div className="flash-card__example">
            <p className="flash-card__example-it">&laquo;{example.it}&raquo;</p>
            {example.ru && (
              <p className="flash-card__example-ru">&rarr; {example.ru}</p>
            )}
            <p className={'flash-card__example-answer flash-card__example-answer--' + (example.answer ? 'vero' : 'falso')}>
              {example.answer
                ? String.fromCodePoint(0x2705) + ' VERO'
                : String.fromCodePoint(0x274C) + ' FALSO'}
            </p>
          </div>
        )}

      </div>

      {/* Метка «Запомнено» — вне collapsible, всегда видна если isDone */}
      {isDone && (
        <p className="flash-card__done-mark">
          {String.fromCodePoint(0x2713)} Запомнено
        </p>
      )}

    </div>
  );
});

FlashCard.displayName = 'FlashCard';

export default FlashCard;
