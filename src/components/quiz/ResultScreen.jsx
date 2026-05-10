import React from 'react';
import Button from '../ui/Button';
import { getErrors } from '../../services/errorsService';

/**
 * Итоговый экран после завершения теста.
 * Показывается поверх контента или как отдельный раздел.
 * 
 * @param {Array} results — массив { questionId, correct, topicId }
 * @param {Array} questions — массив объектов вопросов текущей сессии
 * @param {number} total — общее количество вопросов (обычно 30)
 * @param {Function} onRestart — перезапуск теста
 * @param {Function} onClose — закрыть модалку результатов для просмотра вопросов
 * @param {Function} onFinish — выход к списку тем
 */
const ResultScreen = ({ results, questions = [], total, topicId, passingThreshold, onRestart, onClose, onFinish }) => {
  const correctCount = results.filter(r => r.correct).length;
  const wrongCount = total - correctCount;
  const scorePercent = Math.round((correctCount / total) * 100);
  const threshold = passingThreshold != null ? passingThreshold : 4;
  const isPassed = wrongCount <= threshold;

  // Lookup map для быстрого доступа к вопросам по id
  const qMap = questions.reduce((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {});

  const wrongResults = results.filter(r => !r.correct);
  const errorCounts = getErrors(); // { "questionId": count } — синхронно из localStorage

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

        {/* === НОВОЕ: разбор ошибок === */}
        {wrongResults.length > 0 && (
          <div className="result-errors">
            <div className="result-errors__title">
              Ошибки ({wrongResults.length})
            </div>
            {wrongResults.map(r => {
              const q = qMap[r.questionId];
              if (!q) return null;
              const preview = q.text.length > 90
                ? q.text.slice(0, 90) + '…'
                : q.text;
              const commentPreview = q.comment?.text_ru
                ? (q.comment.text_ru.length > 70
                    ? q.comment.text_ru.slice(0, 70) + '…'
                    : q.comment.text_ru)
                : null;
              return (
                <div key={r.questionId} className="result-error-item">
                  <div className="result-error-item__answer">
                    <div>{q.answer ? 'VERO' : 'FALSO'}</div>
                    {errorCounts[String(r.questionId)] > 1 && (
                      <span className="result-error-item__repeat">
                        ⚠ {errorCounts[String(r.questionId)]}-я ошибка
                      </span>
                    )}
                  </div>
                  <div className="result-error-item__body">
                    <p className="result-error-item__text">{preview}</p>
                    {commentPreview && (
                      <p className="result-error-item__comment">
                        {commentPreview}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultScreen;
