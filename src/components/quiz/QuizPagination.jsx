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
  onSelect 
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

  const scroll = (direction) => {
    if (viewportRef.current) {
      const scrollAmount = 148; // Примерно 4 вопроса (37 * 4)
      viewportRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="quiz-pagination-slider">
      {/* Стрелка влево */}
      <button 
        className="nav-arrow" 
        onClick={() => scroll('left')}
        title="Назад"
      >
        ‹
      </button>

      {/* Окно просмотра слайдера */}
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
        </div>
      </div>

      {/* Стрелка вправо */}
      <button 
        className="nav-arrow" 
        onClick={() => scroll('right')}
        title="Вперед"
      >
        ›
      </button>
    </div>
  );
};

export default QuizPagination;
