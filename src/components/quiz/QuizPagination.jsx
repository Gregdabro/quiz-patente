import React, { useRef, useEffect } from 'react';

/**
 * Компонент пагинации для теста (v3).
 * Реализован в виде горизонтального слайдера с кнопками-стрелками.
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
  onSelect,
  onFinish 
}) => {
  const viewportRef = useRef(null);

  // Автоматическая прокрутка к активному вопросу при его смене
  useEffect(() => {
    if (viewportRef.current) {
      const activeItem = viewportRef.current.children[0].children[current];
      if (activeItem) {
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [current]);

  return (
    <div className="quiz-pagination-slider">
      <div className="pagination-viewport-container">
        <div className="pagination-viewport" ref={viewportRef}>
          <div className="pagination-track">
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
                  title={`Вопрос ${index + 1}`}
                >
                  {index + 1}
                </div>
              );
            })}
            
            {/* Кнопка "Финиш" (FINE) в конце ленты */}
            <div 
              className="pagination-item pagination-item--finish"
              onClick={onFinish}
            >
              FINE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPagination;
