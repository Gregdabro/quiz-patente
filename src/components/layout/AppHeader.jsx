import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

/**
 * Верхняя навигационная панель (Хедер).
 * 
 * @param {string} title — заголовок страницы
 * @param {boolean} showBack — показывать кнопку "Назад"
 */
const AppHeader = ({ 
  title = 'Quiz Patente', 
  showBack = false,
  onBackOverride = null 
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackOverride) {
      onBackOverride();
    } else {
      navigate(-1);
    }
  };

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
              className="header-back-btn"
              onClick={handleBack}
              title="Назад"
            >
              <Icon name="arrow-left" size={22} />
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
