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
const ResultScreen = ({ results, total, onRestart, onClose, onFinish }) => {
  const correctCount = results.filter(r => r.correct).length;
  const wrongCount = total - correctCount;
  const scorePercent = Math.round((correctCount / total) * 100);
  const isPassed = wrongCount <= 4; // В итальянских правах обычно до 4 ошибок

  return (
    <div className="result-screen" style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--color-bg)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--spacing-4)'
    }}>
      <div className="container" style={{ 
        maxWidth: '400px',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--spacing-8)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-2xl)', 
          marginBottom: 'var(--spacing-4)',
          color: isPassed ? 'var(--color-correct)' : 'var(--color-wrong)'
        }}>
          {isPassed ? '🎉 Complimenti!' : '❌ Non superato'}
        </h2>
        
        <div style={{ 
          fontSize: 'var(--font-size-lg)', 
          marginBottom: 'var(--spacing-6)',
          color: 'var(--color-text-secondary)'
        }}>
          {isPassed ? 'Вы успешно прошли тест!' : 'К сожалению, вы совершили слишком много ошибок.'}
        </div>

        <div className="result-stats" style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-4) 0',
          borderBlock: '1px solid var(--color-border)'
        }}>
          <div className="stat-item">
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-correct)' }}>
              {correctCount}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>ВЕРНО</div>
          </div>
          <div className="stat-item">
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-wrong)' }}>
              {wrongCount}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>ОШИБОК</div>
          </div>
          <div className="stat-item">
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
              {scorePercent}%
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>РЕЗУЛЬТАТ</div>
          </div>
        </div>

        <div className="result-actions" style={{ 
          display: 'flex', 
          flexDirection: 'column'
        }}>
          <Button variant="primary" onClick={onRestart} style={{ marginBottom: 'var(--spacing-4)' }}>
            🔁 Попробовать снова
          </Button>
          <Button variant="primary" onClick={onClose} style={{ backgroundColor: 'var(--color-primary-dark)', marginBottom: 'var(--spacing-4)' }}>
            👀 Посмотреть ответы
          </Button>
          <Button variant="vero" onClick={onFinish} style={{ backgroundColor: 'var(--color-text-secondary)' }}>
            ← К списку тем
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
