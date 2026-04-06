import React from 'react';

/**
 * Универсальный компонент карточки.
 * 
 * @param {string} className
 * @param {React.ReactNode} children
 * @param {function} onClick
 */
const Card = ({ 
  className = '', 
  children, 
  onClick,
  ...props 
}) => {
  return (
    <div 
      className={`card ${className}`} 
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
