import React from 'react';
import ProgressBar from '../ui/ProgressBar';
import '../../styles/components.css';

/**
 * TopicStatRow Component
 *
 * Displays a single topic's statistics in a row format.
 * Used in StatsPage to show progress across all topics.
 *
 * Props:
 *   - topic: { topic_id, title, questions_count }
 *   - progress: { lastRun, correct, total, bestScore, runs } | null
 */
const TopicStatRow = ({ topic, progress }) => {
  if (!topic) return null;

  // Calculate accuracy percentage based on best score or current correct
  const scoreValue = progress?.bestScore ?? progress?.correct ?? 0;
  const totalValue = progress?.total ?? 30;
  const percentage = totalValue > 0 ? Math.round((scoreValue / totalValue) * 100) : 0;

  return (
    <div className="topic-stat-row">
      {/* Left Section: Topic Info */}
      <div className="topic-stat-row__left">
        <h3 className="topic-stat-row__title">{topic.title}</h3>
        <p className="topic-stat-row__count">
          {topic.questions_count} вопросов
        </p>
      </div>

      {/* Right Section: Statistics or Empty State */}
      <div className="topic-stat-row__right">
        {progress ? (
          <>
            <div className="topic-stat-row__stats">
              <div className="topic-stat-row__stat-item">
                <span className="topic-stat-row__stat-label">Попыток:</span>
                <span className="topic-stat-row__stat-value">
                  {progress.runs}
                </span>
              </div>

              <div className="topic-stat-row__stat-item">
                <span className="topic-stat-row__stat-label">Лучший:</span>
                <span className="topic-stat-row__stat-value">
                  {progress.bestScore || progress.correct}/30
                </span>
              </div>

              <div className="topic-stat-row__stat-item">
                <span className="topic-stat-row__stat-label">Точность:</span>
                <span className="topic-stat-row__stat-value">
                  {percentage}%
                </span>
              </div>
            </div>

            <div className="topic-stat-row__progress">
              <ProgressBar percentage={percentage} />
            </div>
          </>
        ) : (
          <p className="topic-stat-row__no-data">Нет данных</p>
        )}
      </div>
    </div>
  );
};

export default React.memo(TopicStatRow);
