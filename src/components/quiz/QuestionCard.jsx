import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

/**
 * Компонент карточки вопроса.
 * Отображает изображение, текст вопроса и кнопки VERO/FALSO.
 * 
 * @param {Object} question — объект вопроса
 * @param {boolean} currentAnswer — ответ пользователя на этот вопрос (true/false/undefined)
 * @param {boolean} isSessionFinished — завершена ли сессия квиза
 * @param {Function} onAnswer — обработчик ответа
 */
const QuestionCard = ({ 
  question, 
  currentAnswer, 
  isSessionFinished,
  onAnswer,
  showComment,
  onToggleComment
}) => {
  const [showTranslation, setShowTranslation] = useState(false);

  // Сброс перевода при смене вопроса
  useEffect(() => {
    setShowTranslation(false);
  }, [question.id]);

  const getVariant = (btnValue) => {
    if (currentAnswer === undefined && !isSessionFinished) return 'primary';
    if (currentAnswer === btnValue) {
      return question.answer === btnValue ? 'vero' : 'falso';
    }
    return 'primary';
  };

  var isAnswered = currentAnswer !== undefined || isSessionFinished;

  return (
    <div className="question-card card">
      <div className="question-card__body">
        {question.image && (
          <div className="question-card__image-container">
            <img 
              src={question.image} 
              alt="" 
              loading="lazy" 
              className="question-card__image"
            />
          </div>
        )}
        
        <div className="question-card__content">
          <div className="question-text">
            <p className="question-text__it">
              {question.id}. {question.text}
            </p>
            {showTranslation && (
              <p className="question-text__ru">
                {question.text_ru}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="question-card__footer">
        <div className="question-card__actions-left">
          <button 
            className={'action-icon' + (showTranslation ? ' action-icon--active' : '')}
            onClick={() => setShowTranslation(!showTranslation)}
            title="Показать перевод"
          >
            <Icon name="translate" size={20} />
          </button>

          <button 
            className={'action-icon' + (showComment ? ' action-icon--active' : '')}
            onClick={onToggleComment}
            disabled={!isAnswered}
            title="Показать комментарий"
          >
            <Icon name="comment" size={22} />
          </button>
        </div>

        <div className="question-card__actions-right">
          <Button 
            variant={getVariant(true)}
            className="btn-quiz"
            style={{ marginRight: 'var(--spacing-4)' }}
            onClick={() => onAnswer(true)}
            disabled={currentAnswer !== undefined || isSessionFinished}
          >
            VERO
          </Button>
          <Button 
            variant={getVariant(false)}
            className="btn-quiz"
            onClick={() => onAnswer(false)}
            disabled={currentAnswer !== undefined || isSessionFinished}
          >
            FALSO
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
