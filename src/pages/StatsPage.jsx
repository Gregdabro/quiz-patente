import React from 'react';
import AppHeader from '../components/layout/AppHeader';
import Icon from '../components/ui/Icon';

/**
 * Страница статистики (Coming-Soon).
 * Показывает информативное сообщение о том, что функция в разработке.
 */
const StatsPage = () => (
  <div className="page stats-page">
    <AppHeader title="Статистика" />
    <div className="coming-soon">
      <div className="coming-soon__icon">
        <Icon name="chart" size={48} color="var(--color-primary)" />
      </div>
      <h2 className="coming-soon__title">Статистика прогресса</h2>
      <p className="coming-soon__description">
        Скоро здесь появится подробная статистика вашего прогресса по темам,
        графики успеваемости и рекомендации для улучшения.
      </p>
      <div className="coming-soon__badge">🚀 В разработке</div>
    </div>
  </div>
);

export default StatsPage;
