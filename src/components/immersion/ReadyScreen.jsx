import React from 'react';
import Button from '../ui/Button';
import GlossaryList from './GlossaryList';

/**
 * Экран-мостик перед запуском квиза в Immersion Mode.
 * Показывается после завершения Stage 1 и Stage 2 (currentStage === 'quiz_ready').
 *
 * @param {number}   s1Count       — количество карточек, изученных в Stage 1 (logic_triggers + terms)
 * @param {number}   s2Count       — количество карточек, изученных в Stage 2 (phrases + concepts)
 * @param {number}   alreadyKnown  — количество терминов, уже изученных ранее (из global vocab)
 * @param {number}   questionCount — количество вопросов в квизе (обычно 20)
 * @param {function} onStart       — callback: navigate('/quiz/immersion:topicId:chunkIndex')
 * @param {Array}    glossaryCards — опционально: массив терминов для пассивного повторения
 */
const ReadyScreen = ({ s1Count, s2Count, alreadyKnown, questionCount, glossaryCards, onStart }) => {
  const totalStudied = s1Count + s2Count;

  return (
    <div className="immersion-ready">
      <div className="immersion-ready__icon" aria-hidden="true">🎯</div>

      <h2 className="immersion-ready__title">Готов к квизу!</h2>

      <div className="immersion-ready__stats">
        {totalStudied > 0 && (
          <div className="immersion-ready__stat-row">
            <span className="immersion-ready__stat-label">Изучено терминов</span>
            <span className="immersion-ready__stat-value immersion-ready__stat-value--new">
              {totalStudied}
            </span>
          </div>
        )}

        {alreadyKnown > 0 && (
          <div className="immersion-ready__stat-row">
            <span className="immersion-ready__stat-label">Уже знал</span>
            <span className="immersion-ready__stat-value immersion-ready__stat-value--known">
              {alreadyKnown} ✓
            </span>
          </div>
        )}

        <div className="immersion-ready__stat-row immersion-ready__stat-row--questions">
          <span className="immersion-ready__stat-label">Вопросов в квизе</span>
          <span className="immersion-ready__stat-value">{questionCount}</span>
        </div>
      </div>

      {totalStudied === 0 && alreadyKnown === 0 && (
        <p className="immersion-ready__note">
          В этом блоке нет связанных терминов из словаря.
        </p>
      )}

      {alreadyKnown > 0 && totalStudied === 0 && (
        <p className="immersion-ready__note">
          Ты уже знаешь все термины этого блока 🎉
        </p>
      )}

      {glossaryCards && glossaryCards.length > 0 && (
        <GlossaryList cards={glossaryCards} />
      )}

      <Button
        variant="primary"
        className="immersion-ready__btn"
        onClick={onStart}
      >
        Начать квиз →
      </Button>
    </div>
  );
};

export default React.memo(ReadyScreen);
