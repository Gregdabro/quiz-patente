import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useTopics from '../hooks/useTopics';
import useProgress from '../hooks/useProgress';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import ProgressSummary from '../components/stats/ProgressSummary';
import AppHeader from '../components/layout/AppHeader';
import { loadDictionaryEntries, getDictionaryProgress } from '../services/dictionaryService';
import Icon from '../components/ui/Icon';

/**
 * Главная страница приложения.
 * Список из 25 тематических категорий с прогрессом.
 */
const HomePage = () => {
  const { topics, loading, error } = useTopics();
  const { progress } = useProgress();
  const navigate = useNavigate();
  
  const [dictStats, setDictStats] = React.useState({ total: 0, seen: 0 });
  const [termsPerTopic, setTermsPerTopic] = React.useState({});

  React.useEffect(() => {
    async function loadDict() {
      try {
        const entries = await loadDictionaryEntries();
        const dictProgress = getDictionaryProgress();
        
        // Общая статистика
        const total = entries.length;
        const seen = Object.values(dictProgress).filter(p => p.seen).length;
        setDictStats({ total, seen });

        // Группировка по темам
        const counts = {};
        entries.forEach(entry => {
          if (Array.isArray(entry.topics)) {
            entry.topics.forEach(tId => {
              counts[tId] = (counts[tId] || 0) + 1;
            });
          }
        });
        setTermsPerTopic(counts);
      } catch (err) {
        console.error('HomePage: ошибка загрузки словаря', err);
      }
    }
    loadDict();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="container error-container">{error}</div>;

  return (
    <div className="page homepage">
      <AppHeader title="Quiz Patente" />
      
      <div className="container home-container">
        <ProgressSummary progress={progress} />

        {/* Прогресс словаря */}
        <Card className="dict-progress-card" onClick={() => navigate('/dictionary')}>
          <div className="dict-progress-card__header">
            <div className="dict-progress-card__title">
              <Icon name="book" size={18} color="var(--color-primary)" />
              <span>Словарь терминов</span>
            </div>
            <span className="dict-progress-card__count">{dictStats.seen} / {dictStats.total}</span>
          </div>
          <ProgressBar progress={dictStats.total > 0 ? (dictStats.seen / dictStats.total * 100) : 0} />
          <p className="dict-progress-card__hint">Нажмите, чтобы продолжить изучение</p>
        </Card>
        
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
                <Link
                  to={'/dictionary?topic=' + topic.topic_id}
                  className="topic-dict-link"
                  onClick={function (e) { e.stopPropagation(); }}
                >
                  <Icon name="book" size={14} color="var(--color-primary)" />
                  <span>{termsPerTopic[topic.topic_id] || 0} терминов</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
