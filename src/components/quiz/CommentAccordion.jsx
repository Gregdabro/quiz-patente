import React from 'react';

/**
 * Раскрывающаяся секция с комментарием.
 * Показывается после ответа и нажатия на кнопку "💬".
 * 
 * @param {Object} comment — объект комментария { text, text_ru, image }
 * @param {boolean} isVisible — состояние видимости
 * @param {boolean} isCorrect — правильно ли ответил пользователь
 */
const CommentAccordion = ({ comment, isVisible, isCorrect }) => {
  if (!isVisible || !comment) return null;

  const accordionClass = isCorrect 
    ? 'comment-accordion comment-accordion--correct'
    : 'comment-accordion comment-accordion--wrong';

  return (
    <div className={accordionClass}>
      <div className={`comment-status ${isCorrect ? 'comment-status--correct' : 'comment-status--wrong'}`}>
        {isCorrect ? '✅ Corretto!' : '❌ Sbagliato!'}
      </div>

      <div className="comment-body">
        {comment.image && (
          <div className="comment-image">
            <img 
              src={comment.image} 
              alt="комментарий" 
              loading="lazy"
              className="comment-image__img"
            />
          </div>
        )}
        
        <div className="comment-text">
          <p className="comment-text__it">
            {comment.text}
          </p>
          {comment.text_ru && (
            <p className="comment-text__ru">
              {comment.text_ru}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentAccordion;
