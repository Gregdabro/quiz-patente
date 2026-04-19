import React from 'react';
import AppHeader from '../components/layout/AppHeader';
import Icon from '../components/ui/Icon';

/**
 * Страница словаря (Coming-Soon).
 * Показывает информативное сообщение о том, что функция в разработке.
 */
const DictionaryPage = () => (
  <div className="page dictionary-page">
    <AppHeader title="Словарь" />
    <div className="coming-soon">
      <div className="coming-soon__icon">
        <Icon name="book" size={48} color="var(--color-primary)" />
      </div>
      <h2 className="coming-soon__title">Словарь ПДД</h2>
      <p className="coming-soon__description">
        Интерактивный словарь с определениями основных терминов
        правил дорожного движения на итальянском и русском языках.
      </p>
      <div className="coming-soon__badge">🚀 В разработке</div>
    </div>
  </div>
);

export default DictionaryPage;
