import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Верхняя навигационная панель (Хедер).
 * 
 * @param {string} title — заголовок страницы
 * @param {boolean} showBack — показывать кнопку "Назад"
 */
const AppHeader = ({ title = 'Quiz Patente', showBack = false }) => {
  const navigate = useNavigate();

  return (
    <header className="app-header" style={{
      height: 'var(--header-height)',
      backgroundColor: 'var(--color-header-bg)',
      color: 'var(--color-header-text)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 var(--spacing-4)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {showBack && (
            <button 
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                fontSize: '20px',
                cursor: 'pointer',
                padding: 'var(--spacing-2) 0',
                marginRight: 'var(--spacing-3)'
              }}
            >
              ←
            </button>
          )}
          <h1 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-bold)',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {title}
          </h1>
        </div>
        
        <div className="header-actions">
          {/* Место для дополнительных кнопок, если понадобятся */}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
