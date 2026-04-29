/**
 * ImmersionStudyPage.jsx — заглушка (Шаг 12 плана)
 * Маршрут: /immersion/:topicId/:chunkIndex
 *
 * Полная реализация — в Шаге 12.
 * Файл необходим для регистрации маршрута в App.jsx (Шаг 14).
 */

import React from 'react';
import { useParams } from 'react-router-dom';

var ImmersionStudyPage = function ImmersionStudyPage() {
  var params = useParams();
  return (
    <div style={{ padding: 'var(--spacing-9) var(--spacing-4)', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {'Блок ' + params.chunkIndex + ' — изучение (в разработке)'}
      </p>
    </div>
  );
};

export default ImmersionStudyPage;
