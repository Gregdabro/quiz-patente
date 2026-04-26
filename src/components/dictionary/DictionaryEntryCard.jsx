import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

/**
 * Карточка записи словаря с аккордеоном.
 * При первом раскрытии вызывает onMarkSeen.
 *
 * @param {Object}   entry       — запись словаря из entries.json
 * @param {boolean}  isExpanded  — раскрыта ли карточка
 * @param {Function} onToggle    — fn(entryId) — переключить аккордеон
 * @param {boolean}  isSeen      — отмечена ли как просмотренная
 * @param {Function} onMarkSeen  — fn(entryId) — отметить как просмотренную
 */
const DictionaryEntryCard = React.memo(function DictionaryEntryCard({
  entry,
  isExpanded,
  onToggle,
  isSeen,
  onMarkSeen,
}) {
  const navigate = useNavigate();

  function handleToggle() {
    if (!isExpanded && !isSeen) {
      onMarkSeen(entry.id);
    }
    onToggle(entry.id);
  }

  var badge = TYPE_BADGE[entry.type] || TYPE_BADGE.term;
  var hint = entry.quiz_hint || null;
  var example = entry.examples && entry.examples[0] ? entry.examples[0] : null;
  var hasQuestions = entry.related_question_ids && entry.related_question_ids.length > 0;

  return (
    <div className={'dict-entry-card' + (isExpanded ? ' dict-entry-card--expanded' : '')}>

      {/* Заголовок — всегда виден, клик раскрывает/закрывает */}
      <div className="dict-entry-card__header" onClick={handleToggle}>

        <div className="dict-entry-card__header-left">
          <span className={`dict-entry-card__badge dict-entry-card__badge--${badge.cssClass}`}>
            {badge.label}
          </span>
          <div className="dict-entry-card__terms">
            <span className="dict-entry-card__term">{entry.term}</span>
            <span className="dict-entry-card__term-ru">{entry.term_ru}</span>
          </div>
        </div>

        <div className="dict-entry-card__header-right">
          {isSeen && (
            <span className="dict-entry-card__seen-mark" title="Изучено">
              <Icon name="check" size={14} color="var(--color-correct)" />
            </span>
          )}
          <span className="dict-entry-card__toggle-icon">
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="var(--color-text-muted)"
            />
          </span>
        </div>
      </div>

      {/* Тело аккордеона — CSS max-height transition, совместимо с iOS 12 */}
      <div className={'dict-entry-card__body' + (isExpanded ? ' dict-entry-card__body--open' : '')}>
        <div className="dict-entry-card__body-inner">

          {/* Определение */}
          {entry.definition && entry.definition.ru && (
            <div className="dict-entry-card__section">
              <span className="dict-entry-card__section-label">📖 Что это:</span>
              <p className="dict-entry-card__section-text">{entry.definition.ru}</p>
            </div>
          )}

          {/* Подсказка для квиза */}
          {hint && hint.ru && (
            <div className="dict-entry-card__section">
              <span className="dict-entry-card__section-label">
                🎯 В квизе:
                {hint.pct_falso && (
                  <span className="dict-entry-card__pct dict-entry-card__pct--falso">
                    {hint.pct_falso}% FALSO
                  </span>
                )}
                {hint.pct_vero && (
                  <span className="dict-entry-card__pct dict-entry-card__pct--vero">
                    {hint.pct_vero}% VERO
                  </span>
                )}
              </span>
              <p className="dict-entry-card__section-text">{hint.ru}</p>
            </div>
          )}

          {/* Пример */}
          {example && (
            <div className="dict-entry-card__section">
              <span className="dict-entry-card__section-label">Пример:</span>
              <div className="dict-entry-card__example">
                <p className="dict-entry-card__example-it">{example.it}</p>
                {example.ru && (
                  <p className="dict-entry-card__example-ru">{example.ru}</p>
                )}
                <p className={'dict-entry-card__example-answer' + (example.answer ? ' dict-entry-card__example-answer--vero' : ' dict-entry-card__example-answer--falso')}>
                  {example.answer ? '✅ VERO' : '❌ FALSO'}
                  {example.comment_ru && (
                    <span className="dict-entry-card__example-comment"> — {example.comment_ru}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Кнопка практики */}
          <button
            className="dict-entry-card__practice-btn"
            disabled={!hasQuestions}
            onClick={function (e) {
              e.stopPropagation();
              navigate('/quiz/dict:' + entry.id);
            }}
            type="button"
          >
            {hasQuestions
              ? `Практиковать: вопросы с «${entry.term}» →`
              : 'Вопросов для практики пока нет'}
          </button>
        </div>
      </div>
    </div>
  );
});

DictionaryEntryCard.displayName = 'DictionaryEntryCard';

// ─── Бейджи по типу ──────────────────────────────────────────────────────────

var TYPE_BADGE = {
  logic_trigger: { label: 'ЛОВУШКА', cssClass: 'logic-trigger' },
  term:          { label: 'ТЕРМИН',   cssClass: 'term' },
  phrase:        { label: 'ФРАЗА',    cssClass: 'phrase' },
  concept:       { label: 'КОНЦЕПЦИЯ', cssClass: 'concept' },
};

export default DictionaryEntryCard;
