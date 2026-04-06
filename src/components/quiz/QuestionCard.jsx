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
  onAnswer
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
      
      <div className="question-text" style={{ fontSize: 'var(--font-size-md)', lineHeight: 1.6 }}>
        <p className="text-it" style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: showTranslation ? 'var(--spacing-2)' : 0 }}>
          {question.text}
        </p>
        {showTranslation && (
          <p className="text-ru" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {question.text_ru}
          </p>
        )}
      </div>

      <div className="quiz-controls" style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: 'var(--spacing-8)',
        marginTop: 'var(--spacing-6)'
      }}>
        <Button 
          variant={getVariant(true)}
          className="btn-quiz"
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

      <Button 
        variant="icon" 
        onClick={() => setShowTranslation(!showTranslation)}
        style={{ 
          position: 'absolute', 
          top: 'var(--spacing-3)', 
          right: 'var(--spacing-3)',
          fontSize: '40px' 
        }}
        title="Показать перевод"
      >
        🇷🇺
      </Button>
    </div>
  );
};

export default QuestionCard;
