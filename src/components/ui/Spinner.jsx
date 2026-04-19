import React from 'react';

/**
 * Спиннер для индикации загрузки.
 * Использует CSS-анимацию для плавного вращения.
 * 
 * @param {string} className - дополнительные CSS классы
 */
const Spinner = ({ className = '' }) => {
  return (
    <div className={`row-center ${className}`} style={{ padding: '40px 0' }}>
      <div
        className="spinner"
        role="status"
        aria-label="Загрузка..."
      />
    </div>
  );
};

export default Spinner;
