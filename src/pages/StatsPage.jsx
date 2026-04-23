import React from 'react';
import useTopics from '../hooks/useTopics';
import AppHeader from '../components/layout/AppHeader';
import TopicStatRow from '../components/stats/TopicStatRow';
import Spinner from '../components/ui/Spinner';

/**
 * StatsPage — Страница статистики прогресса
 *
 * Отображает:
 * - Общий прогресс (пройдено тем)
 * - Общее количество правильных ответов
 * - Детальную статистику по каждой теме (TopicStatRow)
 *
 * Использует: useTopics hook для загрузки тем с прогрессом
 */
const StatsPage = () => {
  const { topics, loading, error } = useTopics();

  /**
   * Вычисляем общую статистику
   */
  const stats = React.useMemo(() => {
    if (!topics || topics.length === 0) {
      return {
        completedTopics: 0,
        totalCorrect: 0,
      };
    }

    const completedTopics = topics.filter((topic) => topic.progress !== null).length;
    const totalCorrect = topics.reduce((sum, topic) => {
      return sum + (topic.progress?.bestScore || 0);
    }, 0);

    return {
      completedTopics,
      totalCorrect,
    };
  }, [topics]);

  // Loading state
  if (loading) {
    return (
      <div className="page stats-page">
        <AppHeader title="Статистика" />
        <div className="container stats-container">
          <Spinner />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page stats-page">
        <AppHeader title="Статистика" />
        <div className="container stats-container">
          <div className="stats-error">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state — no topics completed
  if (stats.completedTopics === 0) {
    return (
      <div className="page stats-page">
        <AppHeader title="Статистика" />
        <div className="container stats-container">
          <div className="stats-empty">
            <p className="stats-empty__text">
              Пока нет статистики. Пройдите первый тест, чтобы увидеть результаты! 🚀
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page stats-page">
      <AppHeader title="Статистика" />

      <div className="container stats-container">
        {/* Summary Section */}
        <div className="stats-summary">
          <h2 className="stats-summary__title">Общий прогресс</h2>

          <div className="stats-summary__grid">
            <div className="stats-summary__card">
              <div className="stats-summary__card-label">Пройденные темы</div>
              <div className="stats-summary__card-value">
                {stats.completedTopics}
                <span className="stats-summary__card-total"> / 25</span>
              </div>
            </div>

            <div className="stats-summary__card">
              <div className="stats-summary__card-label">Правильных ответов</div>
              <div className="stats-summary__card-value">
                {stats.totalCorrect}
                <span className="stats-summary__card-total">
                  {' '}
                  / {stats.completedTopics * 30}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Topics List Section */}
        <div className="stats-topics">
          <h3 className="stats-topics__title">Статистика по темам</h3>

          <div className="stats-topics__list">
            {topics.map((topic) => (
              <TopicStatRow
                key={topic.topic_id}
                title={topic.title}
                bestScore={topic.progress?.bestScore || null}
                runs={topic.progress?.runs || 0}
                lastRun={topic.progress?.lastRun || null}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
