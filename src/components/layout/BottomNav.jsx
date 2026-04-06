import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Нижняя навигационная панель (BottomNav).
 * 4 основные вкладки приложения.
 */
const BottomNav = () => {
  const navItems = [
    { to: '/', label: 'Главная', icon: '🏠' },
    { to: '/quiz/errors', label: 'Ошибки', icon: '🔁' },
    { to: '/stats', label: 'Статистика', icon: '📊' },
    { to: '/dictionary', label: 'Словарь', icon: '📖' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => 
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__icon">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
