import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon';

/**
 * Нижняя навигационная панель (BottomNav).
 * 4 основные вкладки приложения.
 */
const BottomNav = () => {
  const navItems = [
    { to: '/', label: 'Главная', icon: 'home' },
    { to: '/errors', label: 'Ошибки', icon: 'refresh' },
    { to: '/stats', label: 'Статистика', icon: 'chart' },
    { to: '/dictionary', label: 'Словарь', icon: 'book' },
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
          <span className="bottom-nav__icon">
            <Icon name={item.icon} size={24} />
          </span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
