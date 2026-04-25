import React from 'react';
import Button from '../ui/Button';

/**
 * Итоговый экран после завершения теста.
 * Показывается поверх контента или как отдельный раздел.
 * 
 * @param {Array} results — массив { questionId, correct, topicId }
 * @param {number} total — общее количество вопросов (обычно 30)
 * @param {Function} onRestart — перезапуск теста
 * @param {Function} onClose — закрыть модалку результатов для просмотра вопросов
 * @param {Function} onFinish — выход к списку тем
 */
const ResultScreen = ({ results, total, topicId, onRestart, onClose, onFinish }) => {
  const correctCount = results.filter(r => r.correct).length;
  const wrongCount = total - correctCount;
  const scorePercent = Math.round((correctCount / total) * 100);
  const isPassed = wrongCount <= 4; // В итальянских правах обычно до 4 ошибок

  return (
    <div className="result-screen">
      <div className="result-screen__container">
        <h2 className="result-screen__title" style={{ 
          color: isPassed ? 'var(--color-correct)' : 'var(--color-wrong)'
        }}>
          {isPassed ? '🎉 Complimenti!' : '❌ Non superato'}
        </h2>

        {topicId && topicId.startsWith('dict:') && (
          <div className="dict-badge" style={{
            display: 'inline-block',
            backgroundColor: 'var(--color-primary-light, #eff6ff)',
            color: 'var(--color-primary)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-3)',
            border: '1px solid var(--color-primary)'
          }}>
            📖 ТРЕНИРОВКА ПО СЛОВАРЮ
          </div>
        )}
        
        <div className="result-screen__subtitle">
          {isPassed ? 'Вы успешно прошли тест!' : 'К сожалению, вы совершили слишком много ошибок.'}
        </div>

        <div className="result-screen__stats">
          <div className="result-screen__stat">
            <div className="result-screen__stat-value" style={{ color: 'var(--color-correct)' }}>
              {correctCount}
            </div>
            <div className="result-screen__stat-label">ВЕРНО</div>
          </div>
          <div className="result-screen__stat">
            <div className="result-screen__stat-value" style={{ color: 'var(--color-wrong)' }}>
              {wrongCount}
            </div>
            <div className="result-screen__stat-label">ОШИБОК</div>
          </div>
          <div className="result-screen__stat">
            <div className="result-screen__stat-value" style={{ color: 'var(--color-primary)' }}>
              {scorePercent}%
            </div>
            <div className="result-screen__stat-label">РЕЗУЛЬТАТ</div>
          </div>
        </div>

        <div className="result-screen__actions">
          <div className="result-screen__action-button">
            <Button variant="primary" onClick={onRestart}>
              🔁 Попробовать снова
            </Button>
          </div>
          <div className="result-screen__action-button">
            <Button variant="primary" onClick={onClose} style={{ backgroundColor: 'var(--color-primary-dark)' }}>
              👀 Посмотреть ответы
            </Button>
          </div>
          <div className="result-screen__action-button">
            <Button variant="vero" onClick={onFinish} style={{ backgroundColor: 'var(--color-text-secondary)' }}>
              ← К списку тем
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
