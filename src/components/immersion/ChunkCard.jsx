/**
 * ChunkCard.jsx
 * Карточка одного блока (чанка) на ImmersionPage.
 *
 * Отображает:
 *   - заголовок блока (номер, диапазон вопросов)
 *   - три таблетки прогресса: S1 (Слова), S2 (Фразы), Quiz (Квиз)
 *   - кнопку входа (→) или иконку замка если заблокирован
 *
 * Props:
 *   chunk    {Object}   — метаданные блока из immersionService.getChunksMetadata():
 *                         { index, label, questionCount, fromId, toId, progress, isUnlocked }
 *                         progress = { s1: 'done'|'pending', s2: 'done'|'pending', quiz: 'done'|'pending' }
 *   onSelect {Function} — вызывается с chunk.index если isUnlocked === true
 *
 * iOS 12: нет gap в flex — margin-right на pill-элементах.
 * React.memo: не перерисовывается при одинаковых props (список длинный).
 */

import React from 'react';
import Icon from '../ui/Icon';

// ---------------------------------------------------------------------------
// Конфигурация трёх таблеток прогресса
// ---------------------------------------------------------------------------
var PILLS = [
  { key: 's1',   label: 'Слова'  },
  { key: 's2',   label: 'Фразы'  },
  { key: 'quiz', label: 'Квиз'   },
];

// ---------------------------------------------------------------------------
// ChunkPill — одна таблетка прогресса
// ---------------------------------------------------------------------------
function ChunkPill(props) {
  var label  = props.label;
  var status = props.status; // 'done' | 'pending' (active не используется здесь)
  var isLast = props.isLast;

  var isDone = status === 'done';

  return (
    <span
      className={
        'chunk-pill' +
        (isDone ? ' chunk-pill--done' : ' chunk-pill--pending') +
        (isLast ? '' : ' chunk-pill--mr')
      }
      aria-label={label + ': ' + (isDone ? 'выполнено' : 'не выполнено')}
    >
      {isDone
        ? String.fromCodePoint(0x2713) + '\u00a0' + label  // ✓ Слова
        : String.fromCodePoint(0x25CB) + '\u00a0' + label  // ○ Слова
      }
    </span>
  );
}

// ---------------------------------------------------------------------------
// ChunkCard
// ---------------------------------------------------------------------------
var ChunkCard = React.memo(function ChunkCard(props) {
  var chunk    = props.chunk;
  var onSelect = props.onSelect;

  var isUnlocked = chunk.isUnlocked;
  var progress   = chunk.progress || { s1: 'pending', s2: 'pending', quiz: 'pending' };

  function handleClick() {
    if (isUnlocked && typeof onSelect === 'function') {
      onSelect(chunk.index);
    }
  }

  return (
    <div
      className={
        'chunk-card' +
        (isUnlocked ? '' : ' chunk-card--locked')
      }
      onClick={handleClick}
      role={isUnlocked ? 'button' : undefined}
      tabIndex={isUnlocked ? 0 : undefined}
      onKeyDown={isUnlocked ? function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
      aria-disabled={!isUnlocked}
    >
      {/* Заголовок блока */}
      <div className="chunk-card__header">
        <div>
          <p className="chunk-card__label">{chunk.label}</p>
          <p className="chunk-card__range">
            {'вопросы\u00a0' + chunk.fromId + '\u2013' + chunk.toId}
          </p>
        </div>

        {/* Кнопка входа или иконка замка */}
        <div className="chunk-card__action" aria-hidden="true">
          {isUnlocked
            ? <Icon name="chevron-down" size={22} className="chunk-card__arrow" />
            : <Icon name="lock" size={20} className="chunk-card__lock" />
          }
        </div>
      </div>

      {/* Три таблетки прогресса */}
      <div className="chunk-card__pills">
        {PILLS.map(function (pill, idx) {
          return (
            <ChunkPill
              key={pill.key}
              label={pill.label}
              status={progress[pill.key] || 'pending'}
              isLast={idx === PILLS.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
});

ChunkCard.displayName = 'ChunkCard';

export default ChunkCard;
