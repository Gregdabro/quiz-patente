import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTopics from '../hooks/useTopics';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import AppHeader from '../components/layout/AppHeader';

/**
 * Главная страница приложения.
 * Список из 25 тематических категорий с прогрессом.
 */
const HomePage = () => {
  const { topics, loading, error } = useTopics();
  const navigate = useNavigate();

  if (loading) return <Spinner />;
  if (error) return <div className="container error">{error}</div>;

  return (
    <div className="page homepage">
      <AppHeader title="Quiz Patente" />
      
      <div className="container" style={{ paddingTop: 'var(--spacing-4)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-xl)' }}>
          Выберите тему
        </h2>
        
        <div className="grid-2col">
          {topics.map((topic) => (
            <Card 
              key={topic.topic_id} 
              className="topic-card"
              onClick={() => navigate(`/quiz/${topic.topic_id}`)}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
                <div 
                  className="topic-image" 
                  style={{ 
                    width: '96px', 
                    height: '96px', 
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src={topic.image} 
                    alt="" 
                    loading="lazy" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="topic-info" style={{ marginLeft: 'var(--spacing-4)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-md)', margin: 0, marginBottom: 'var(--spacing-1)' }}>
                    {topic.title}
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                    Вопросов: {topic.questions_count}
                  </p>
                </div>
              </div>
              
              <div className="topic-progress">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
                  <span>Прогресс: {topic.progress?.correct || 0} / {topic.questions_count}</span>
                  <span>{Math.round((topic.progress?.correct || 0) / topic.questions_count * 100)}%</span>
                </div>
                <ProgressBar 
                  progress={(topic.progress?.correct || 0) / topic.questions_count * 100} 
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
