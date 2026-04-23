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
 *   - title: string - Topic name
 *   - bestScore: number | null - Best score achieved in this topic
 *   - runs: number - Number of times this topic was completed
 *   - lastRun: timestamp | null - Unix timestamp of last attempt
 */
const TopicStatRow = ({ title, bestScore, runs, lastRun }) => {
  /**
   * Format Unix timestamp to DD.MM.YYYY format
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  /**
   * Calculate percentage based on bestScore
   */
  const percentage = bestScore ? Math.round((bestScore / 30) * 100) : 0;
  const lastRunDate = formatDate(lastRun);

  return (
    <div className="topic-stat-row">
      {/* Left Section: Topic Info */}
      <div className="topic-stat-row__left">
        <h3 className="topic-stat-row__title">{title}</h3>
      </div>

      {/* Right Section: Statistics or Empty State */}
      <div className="topic-stat-row__right">
        {bestScore ? (
          <>
            <div className="topic-stat-row__stats">
              <div className="topic-stat-row__stat-item">
                <span className="topic-stat-row__stat-label">Попыток:</span>
                <span className="topic-stat-row__stat-value">
                  {runs}
                </span>
              </div>

              <div className="topic-stat-row__stat-item">
                <span className="topic-stat-row__stat-label">Лучший:</span>
                <span className="topic-stat-row__stat-value">
                  {bestScore}/30
                </span>
              </div>

              <div className="topic-stat-row__stat-item">
                <span className="topic-stat-row__stat-label">Дата:</span>
                <span className="topic-stat-row__stat-value">
                  {lastRunDate}
                </span>
              </div>
            </div>

            <div className="topic-stat-row__progress">
              <ProgressBar percentage={percentage} />
            </div>
          </>
        ) : (
          <p className="topic-stat-row__no-data">Не пройдено</p>
        )}
      </div>
    </div>
  );
};

export default React.memo(TopicStatRow);
