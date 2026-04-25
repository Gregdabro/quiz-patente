import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

/**
 * StudyCard — большая карточка для режима «Карточки».
 * Работает по принципу flashcard: лицо → тап → оборот.
 * Навигация: стрелки назад/вперёд или свайп (через родителя).
 *
 * @param {Object}   entry        — запись словаря
 * @param {number}   index        — текущий индекс (0-based)
 * @param {number}   total        — всего карточек
 * @param {boolean}  isSeen       — просмотрена ли
 * @param {Function} onMarkSeen   — fn(entryId)
 * @param {Function} onPrev       — перейти к предыдущей
 * @param {Function} onNext       — перейти к следующей
 */

var TYPE_BADGE = {
  logic_trigger: { label: 'ЛОВУШКА',   bg: '#fef3c7', color: '#92400e' },
  term:          { label: 'ТЕРМИН',    bg: '#dbeafe', color: '#1e40af' },
  phrase:        { label: 'ФРАЗА',     bg: '#d1fae5', color: '#065f46' },
  concept:       { label: 'КОНЦЕПЦИЯ', bg: '#ede9fe', color: '#5b21b6' },
};

var StudyCard = React.memo(function StudyCard({
  entry,
  index,
  total,
  isSeen,
  onMarkSeen,
  onPrev,
  onNext,
}) {
  var [isFlipped, setIsFlipped] = useState(false);
  var navigate = useNavigate();

  var badge = TYPE_BADGE[entry.type] || TYPE_BADGE.term;
  var hint  = entry.quiz_hint || null;
  var example = entry.examples && entry.examples[0] ? entry.examples[0] : null;

  // При флипе помечаем как просмотренную
  var handleFlip = useCallback(function () {
    if (!isFlipped && !isSeen) {
      onMarkSeen(entry.id);
    }
    setIsFlipped(function (prev) { return !prev; });
  }, [isFlipped, isSeen, entry.id, onMarkSeen]);

  // Переключение карточки — сбрасываем флип
  var handlePrev = useCallback(function () {
    setIsFlipped(false);
    onPrev();
  }, [onPrev]);

  var handleNext = useCallback(function () {
    setIsFlipped(false);
    onNext();
  }, [onNext]);

  // Quiz Link: переход в квиз по термину
  var handlePractice = useCallback(function () {
    navigate('/quiz/dict:' + entry.id);
  }, [entry.id, navigate]);

  var hasPrev = index > 0;
  var hasNext = index < total - 1;

  return (
    <div className="study-card">

      {/* Прогресс */}
      <div className="study-card__progress">
        <span className="study-card__progress-text">
          {index + 1} / {total}
        </span>
        {isSeen && (
          <span className="study-card__seen">
            <Icon name="check" size={14} color="var(--color-correct)" />
            изучено
          </span>
        )}
      </div>

      {/* Тело карточки */}
      <div
        className={'study-card__body' + (isFlipped ? ' study-card__body--flipped' : '')}
        onClick={handleFlip}
      >
        {/* ЛИЦО карточки */}
        <div className="study-card__face study-card__face--front">
          <span className={'dict-entry-card__badge dict-entry-card__badge--' + entry.type}>
            {badge.label}
          </span>
          <p className="study-card__term">{entry.term}</p>
          <p className="study-card__term-ru">{entry.term_ru}</p>
          <p className="study-card__hint-tap">Нажмите, чтобы раскрыть →</p>
        </div>

        {/* ОБОРОТ карточки */}
        <div className="study-card__face study-card__face--back">

          {entry.definition && entry.definition.ru && (
            <div className="study-card__section">
              <span className="study-card__section-label">📖 Что это:</span>
              <p className="study-card__section-text">{entry.definition.ru}</p>
            </div>
          )}

          {hint && hint.ru && (
            <div className="study-card__section">
              <span className="study-card__section-label">
                🎯 В квизе:
                {hint.pct_falso && (
                  <span className="dict-entry-card__pct dict-entry-card__pct--falso">
                    {' '}{hint.pct_falso}% FALSO
                  </span>
                )}
                {hint.pct_vero && (
                  <span className="dict-entry-card__pct dict-entry-card__pct--vero">
                    {' '}{hint.pct_vero}% VERO
                  </span>
                )}
              </span>
              <p className="study-card__section-text">{hint.ru}</p>
            </div>
          )}

          {example && (
            <div className="study-card__section">
              <span className="study-card__section-label">Пример:</span>
              <p className="study-card__example-it">{example.it}</p>
              <p className={'study-card__example-answer' + (example.answer ? ' study-card__example-answer--vero' : ' study-card__example-answer--falso')}>
                {example.answer ? '✅ VERO' : '❌ FALSO'}
              </p>
            </div>
          )}

          {/* Кнопка Quiz Link */}
          <button
            className="study-card__practice-btn"
            onClick={function (e) { e.stopPropagation(); handlePractice(); }}
            type="button"
          >
            Практиковать: вопросы с «{entry.term}» →
          </button>
        </div>
      </div>

      {/* Навигация */}
      <div className="study-card__nav">
        <button
          className={'study-card__nav-btn' + (!hasPrev ? ' study-card__nav-btn--disabled' : '')}
          onClick={hasPrev ? handlePrev : undefined}
          type="button"
          aria-label="Предыдущая карточка"
        >
          <Icon name="arrow-left" size={20} color={hasPrev ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
          Назад
        </button>

        <button
          className="study-card__flip-hint"
          onClick={handleFlip}
          type="button"
        >
          {isFlipped ? 'Свернуть' : 'Раскрыть'}
        </button>

        <button
          className={'study-card__nav-btn study-card__nav-btn--right' + (!hasNext ? ' study-card__nav-btn--disabled' : '')}
          onClick={hasNext ? handleNext : undefined}
          type="button"
          aria-label="Следующая карточка"
        >
          Вперёд
          <Icon name="arrow-left" size={20} color={hasNext ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
        </button>
      </div>

    </div>
  );
});

StudyCard.displayName = 'StudyCard';

export default StudyCard;
