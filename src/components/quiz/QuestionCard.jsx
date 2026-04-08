import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';

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

  return (
    <div className="question-card card" style={{ padding: 'var(--spacing-4)', position: 'relative' }}>
      {question.image && (
        <div className="question-image" style={{ marginBottom: 'var(--spacing-4)', textAlign: 'center' }}>
          <img 
            src={question.image} 
            alt="вопрос" 
            loading="lazy" 
            style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} 
          />
        </div>
      )}
      
      <div className="question-text" style={{ fontSize: 'var(--font-size-lg)', lineHeight: 1.6 }}>
        <p className="text-it" style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: showTranslation ? 'var(--spacing-2)' : 0 }}>
          {question.text}
        </p>
        {showTranslation && (
          <p className="text-ru" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-md)' }}>
            {question.text_ru}
          </p>
        )}
      </div>

      <div className="quiz-controls" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: 'var(--spacing-6)'
      }}>
        <div className="left-actions" style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="icon" 
            onClick={() => setShowTranslation(!showTranslation)}
            style={{ 
              fontSize: '44px', 
              marginRight: 'var(--spacing-4)'
            }}
            title="Показать перевод"
          >
            🇷🇺
          </Button>

          <Button 
            variant="icon" 
            onClick={onToggleComment}
            disabled={currentAnswer === undefined && !isSessionFinished}
            style={{ 
              fontSize: '44px', 
              position: 'relative'
            }}
            title="Показать комментарий"
          >
            💬
            {showComment && <div style={{ 
              position: 'absolute', 
              bottom: '-5px', 
              width: '100%', 
              height: '3px', 
              background: 'var(--color-primary)',
              borderRadius: '2px'
            }} />}
          </Button>
        </div>

        <div className="right-actions" style={{ display: 'flex', alignItems: 'center' }}>
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
