import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useErrorTopics from '../hooks/useErrorTopics';
import AppHeader from '../components/layout/AppHeader';
import Spinner from '../components/ui/Spinner';

const ErrorsPage = () => {
  const { topics, loading, error } = useErrorTopics();
  const navigate = useNavigate();

  const totalErrors = useMemo(
    () => topics.reduce((sum, t) => sum + t.errorCount, 0),
    [topics]
  );

  const handleTopicClick = (topic) => {
    if (topic.errorCount === 0) return;
    navigate(`/quiz/errors:${topic.topic_id}`);
  };

  if (loading) return <Spinner />;
  if (error) return <div className="container errors-page__error">{error}</div>;

  return (
    <div className="page errors-page">
      <AppHeader title="Ошибки" />

      <div className="container">
        <div className="errors-page__header">
          <h2 className="errors-page__title">Работа над ошибками</h2>
          <p className="errors-page__subtitle">
            {totalErrors > 0
              ? `Всего вопросов с ошибками: ${totalErrors}`
              : 'Отличная работа! Ошибок нет 🎉'}
          </p>
        </div>

        <div className="grid-2col">
          {topics.map((topic) => (
            <ErrorTopicCard
              key={topic.topic_id}
              topic={topic}
              onClick={() => handleTopicClick(topic)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ErrorTopicCard = React.memo(({ topic, onClick }) => {
  const hasErrors = topic.errorCount > 0;

  return (
    <div
      className={`error-topic-card${hasErrors ? '' : ' error-topic-card--clean'}`}
      onClick={hasErrors ? onClick : undefined}
      role={hasErrors ? 'button' : undefined}
      tabIndex={hasErrors ? 0 : undefined}
      onKeyDown={hasErrors ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="error-topic-card__image-wrap">
        <img
          src={topic.image}
          alt=""
          loading="lazy"
          className="error-topic-card__image"
        />
      </div>

      <div className="error-topic-card__body">
        <p className="error-topic-card__title">{topic.title}</p>

        {hasErrors ? (
          <span className="error-topic-card__badge error-topic-card__badge--errors">
            Ошибок: {topic.errorCount}
          </span>
        ) : (
          <span className="error-topic-card__badge error-topic-card__badge--clean">
            ✅ Нет ошибок
          </span>
        )}
      </div>
    </div>
  );
});

ErrorTopicCard.displayName = 'ErrorTopicCard';

export default ErrorsPage;
