import React from 'react';

/**
 * Спиннер для индикации загрузки.
 */
const Spinner = ({ className = '' }) => {
  return (
    <div className={`row-center ${className}`} style={{ padding: '40px 0' }}>
      <div className="spinner">
        {/* Стили для .spinner должны быть добавлены в components.css, 
            но пока мы можем использовать простой эмодзи или текст */}
        <span>⏳ Caricamento...</span>
      </div>
    </div>
  );
};

export default Spinner;
