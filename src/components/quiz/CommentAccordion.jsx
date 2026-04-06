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

  return (
    <div className="comment-accordion" style={{ 
      marginTop: 'var(--spacing-4)',
      padding: 'var(--spacing-4)',
      backgroundColor: isCorrect ? 'var(--color-correct-bg)' : 'var(--color-wrong-bg)',
      border: `1px solid ${isCorrect ? 'var(--color-correct-border)' : 'var(--color-wrong-border)'}`,
      borderRadius: 'var(--radius-md)',
      transition: 'all var(--transition-base)'
    }}>
      <div className="comment-status" style={{ 
        fontWeight: 'var(--font-weight-bold)', 
        color: isCorrect ? 'var(--color-correct)' : 'var(--color-wrong)',
        marginBottom: 'var(--spacing-3)',
        fontSize: 'var(--font-size-md)'
      }}>
        {isCorrect ? '✅ Corretto!' : '❌ Sbagliato!'}
      </div>

      <div className="comment-body">
        {comment.image && (
          <div className="comment-image" style={{ marginBottom: 'var(--spacing-3)', textAlign: 'center' }}>
            <img 
              src={comment.image} 
              alt="комментарий" 
              loading="lazy" 
              style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} 
            />
          </div>
        )}
        
        <div className="comment-text" style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
          <p className="text-it" style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-2)' }}>
            {comment.text}
          </p>
          {comment.text_ru && (
            <p className="text-ru" style={{ color: 'var(--color-text-secondary)' }}>
              {comment.text_ru}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentAccordion;
