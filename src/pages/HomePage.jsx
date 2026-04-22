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
  if (error) return <div className="container error-container">{error}</div>;

  return (
    <div className="page homepage">
      <AppHeader title="Quiz Patente" />
      
      <div className="container home-container">
        <h2 className="home-title">
          Выберите тему
        </h2>
        
        <div className="grid-2col">
          {topics.map((topic) => (
            <Card 
              key={topic.topic_id} 
              className="topic-card topic-card--clickable"
              onClick={() => navigate(`/quiz/${topic.topic_id}`)}
            >
              <div className="topic-card__header">
                <div className="topic-image">
                  <img 
                    src={topic.image} 
                    alt="" 
                    loading="lazy"
                    className="topic-image__img"
                  />
                </div>
                <div className="topic-info">
                  <h3 className="topic-info__title">
                    {topic.title}
                  </h3>
                  <p className="topic-info__count">
                    Вопросов: {topic.questions_count}
                  </p>
                </div>
              </div>
              
              <div className="topic-progress">
                <div className="topic-progress__stats">
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
