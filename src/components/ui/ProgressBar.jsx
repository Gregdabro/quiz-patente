import React from 'react';

/**
 * Компонент прогресс-бара.
 * 
 * @param {number} progress — процент заполнения (0-100)
 * @param {string} className
 */
const ProgressBar = ({ progress = 0, className = '' }) => {
  const safeProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={`progress-bar ${className}`}>
      <div 
        className="progress-bar__fill" 
        style={{ width: `${safeProgress}%` }}
      />
    </div>
  );
};

export default ProgressBar;
