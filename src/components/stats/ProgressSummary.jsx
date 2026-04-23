import React from 'react';
import Card from '../ui/Card';

/**
 * ProgressSummary.jsx
 * Compact one-line dashboard summary for iPad mini 2.
 */

const TOTAL_TOPICS = 25;

const ProgressSummary = ({ progress = {} }) => {
  const topicsCompleted = Object.values(progress).filter(
    (topicData) => topicData && (topicData.runs > 0 || topicData.bestScore > 0)
  ).length;

  const totalCorrect = Object.values(progress).reduce((sum, topicData) => {
    return sum + (topicData?.correct || 0);
  }, 0);

  return (
    <Card className="progress-summary-card">
      <div className="progress-summary-content">
        <span className="progress-summary-title">Прогресс:</span>
        
        <div className="progress-summary-stats-row">
          <div className="progress-summary-stat-item">
            <span className="progress-summary-stat-item__value">{topicsCompleted}</span>
            <span className="progress-summary-stat-item__label">/{TOTAL_TOPICS} тем</span>
          </div>

          <div className="progress-summary-stat-item">
            <span className="progress-summary-stat-item__value">{totalCorrect}</span>
            <span className="progress-summary-stat-item__label">верно</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProgressSummary;
