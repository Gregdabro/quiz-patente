import React from 'react';

/**
 * Универсальный компонент кнопки.
 * 
 * @param {string} className — доп. классы
 * @param {string} variant — 'primary' | 'vero' | 'falso' | 'icon'
 * @param {boolean} disabled — заблокирована ли кнопка
 * @param {function} onClick — обработчик клика
 * @param {React.ReactNode} children — содержимое кнопки
 */
const Button = ({ 
  className = '', 
  variant = 'primary', 
  disabled = false, 
  onClick, 
  children,
  ...props 
}) => {
  const baseClass = variant === 'icon' ? 'btn-icon' : `btn btn-${variant}`;
  
  return (
    <button
      className={`${baseClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
