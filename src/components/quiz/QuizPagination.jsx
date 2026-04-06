import React from 'react';

/**
 * Компонент пагинации для теста.
 * Отображает 30 индикаторов (точек) с текущим статусом.
 * 
 * @param {Array} questions — массив вопросов
 * @param {number} current — индекс текущего вопроса
 * @param {Object} answered — мапа ответов { index: answerValue }
 * @param {Function} onSelect — обработчик выбора вопроса
 */
const QuizPagination = ({ 
  questions, 
  current, 
  answered, 
  onSelect 
}) => {
  return (
    <div className="quiz-pagination" style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      margin: 'var(--spacing-4) 0',
      justifyContent: 'center'
    }}>
      {questions.map((q, index) => {
        let statusClass = '';
        if (index === current) statusClass = 'active';
        else if (answered.has(q.id)) {
          const isCorrect = answered.get(q.id) === q.answer;
          statusClass = isCorrect ? 'correct' : 'wrong';
        }
        
        return (
          <div 
            key={q.id}
            onClick={() => onSelect(index)}
            className={`pagination-item ${statusClass}`}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: statusClass === 'active' ? 'var(--color-primary)' : 
                               statusClass === 'correct' ? 'var(--color-correct)' : 
                               statusClass === 'wrong' ? 'var(--color-wrong)' : 
                               'var(--color-unanswered)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'var(--font-weight-bold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              margin: '6px',
              transition: 'var(--transition-fast)'
            }}
          >
            {index + 1}
          </div>
        );
      })}
    </div>
  );
};

export default QuizPagination;
