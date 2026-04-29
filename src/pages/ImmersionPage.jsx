/**
 * ImmersionPage.jsx
 * Маршрут: /immersion/:topicId
 *
 * Страница выбора блока (чанка) для режима Staged Immersion.
 * Отображает список всех ChunkCard для выбранной темы.
 *
 * Зависимости:
 *   useImmersion(topicId, null) → { chunks, topicTitle, loading, error }
 *   ChunkCard                   → принимает { chunk, onSelect }
 *   AppHeader                   → title, showBack, onBackOverride
 *   Spinner                     → при loading
 *
 * iOS 12: нет gap в flex — отступы через margin-bottom в .immersion-chunk-list.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useImmersion from '../hooks/useImmersion';
import AppHeader from '../components/layout/AppHeader';
import ChunkCard from '../components/immersion/ChunkCard';
import Spinner from '../components/ui/Spinner';

var ImmersionPage = function ImmersionPage() {
  var params   = useParams();
  var topicId  = params.topicId;
  var navigate = useNavigate();

  // chunkIndex = null → режим выбора чанка
  var result = useImmersion(topicId, null);
  var chunks     = result.chunks;
  var topicTitle = result.topicTitle;
  var loading    = result.loading;
  var error      = result.error;

  function handleBack() {
    navigate('/');
  }

  function handleSelect(chunkIndex) {
    navigate('/immersion/' + topicId + '/' + chunkIndex);
  }

  // Заголовок: "Погружение: {название темы}" или просто "Погружение" пока загружается
  var headerTitle = topicTitle
    ? 'Погружение: ' + topicTitle
    : 'Погружение';

  return (
    <div className="immersion-page">
      <AppHeader
        title={headerTitle}
        showBack={true}
        onBackOverride={handleBack}
      />

      {loading && (
        <div style={{ padding: 'var(--spacing-9) var(--spacing-4)', textAlign: 'center' }}>
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: 'var(--spacing-9) var(--spacing-4)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
            {error}
          </p>
        </div>
      )}

      {!loading && !error && chunks.length === 0 && (
        <div style={{ padding: 'var(--spacing-9) var(--spacing-4)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Нет доступных блоков для этой темы.
          </p>
        </div>
      )}

      {!loading && !error && chunks.length > 0 && (
        <div className="immersion-chunk-list">
          {chunks.map(function (chunk) {
            return (
              <ChunkCard
                key={chunk.index}
                chunk={chunk}
                onSelect={handleSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImmersionPage;
