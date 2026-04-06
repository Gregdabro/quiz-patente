import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useQuiz from '../hooks/useQuiz';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import AppHeader from '../components/layout/AppHeader';

// Новые компоненты после рефакторинга
import QuizPagination from '../components/quiz/QuizPagination';
import QuestionCard from '../components/quiz/QuestionCard';
import CommentAccordion from '../components/quiz/CommentAccordion';
import ResultScreen from '../components/quiz/ResultScreen';

/**
 * Страница прохождения теста (Рефакторинг v2).
 * Интегрирует модульные компоненты квиза.
 */
const QuizPage = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  
  const { 
    questions, 
    current, 
    goTo, 
    answer, 
    answered, 
    results,
    isFinished, 
    finish, 
    loading, 
    error 
  } = useQuiz(topicId);
  
  // Состояние отображения комментария для текущего вопроса
  const [showComment, setShowComment] = useState(false);
  
  // Состояние модального окна результатов
  const [showResults, setShowResults] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <div className="container error" style={{ padding: '40px', textAlign: 'center' }}>{error}</div>;
  if (!questions.length) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Нет доступных вопросов</div>;

  const currentQuestion = questions[current];
  const currentAnswer = answered.has(currentQuestion.id) ? answered.get(currentQuestion.id) : undefined;
  const isCorrect = currentAnswer !== undefined ? currentAnswer === currentQuestion.answer : null;

  // Обработчик ответа
  const handleAnswer = (userAnswer) => {
    answer(userAnswer);
    // Сбрасываем показ комментария при новом ответе (хотя он и так скрыт до ответа)
    setShowComment(false);
  };

  // Обработчик переключения вопроса
  const handleGoTo = (index) => {
    goTo(index);
    setShowComment(false); // Скрываем комментарий при переходе
  };

  // Обработчик завершения
  const handleFinish = () => {
    finish();
    setShowResults(true);
  };

  return (
    <div className="page quiz-page">
      <AppHeader 
        title={topicId === 'errors' ? 'Работа над ошибками' : 
               topicId === 'all' ? 'Случайный тест' : `Тема ${topicId}`} 
        showBack={true} 
      />
      
      <div className="container" style={{ paddingBottom: 'var(--spacing-10)' }}>
        {/* Пагинация (общие 30 вопросов) */}
        <QuizPagination 
          questions={questions}
          current={current}
          answered={answered}
          onSelect={handleGoTo}
        />

        <QuestionCard 
          question={currentQuestion}
          currentAnswer={currentAnswer}
          isSessionFinished={isFinished}
          onAnswer={handleAnswer}
        />

        {/* Секция управления под карточкой */}
        <div className="quiz-actions row-between" style={{ marginTop: 'var(--spacing-4)' }}>
          <div className="left-actions">
            {/* Кнопка перевода продублирована в карточке, 
                но здесь мы оставляем место для доп. кнопок */}
          </div>
          
          <div className="right-actions row" style={{}}>
            {/* Кнопка комментария — активна ТОЛЬКО после ответа */}
            <Button 
              variant="icon" 
              onClick={() => setShowComment(!showComment)}
              disabled={currentAnswer === undefined && !isFinished}
              style={{ fontSize: '44px', position: 'relative', marginRight: 'var(--spacing-4)' }}
              title="Показать комментарий"
            >
              💬
              {showComment && <div style={{ 
                position: 'absolute', 
                bottom: '-5px', 
                width: '100%', 
                height: '3px', 
                background: 'var(--color-primary)',
                borderRadius: '2px'
              }} />}
            </Button>
            
            {/* Кнопка финиша — завершить тест или выйти */}
            {isFinished ? (
              <Button 
                variant="primary" 
                onClick={() => navigate('/')}
              >
                🚪 Выйти
              </Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={handleFinish}
              >
                ✅ Финиш
              </Button>
            )}
          </div>
        </div>

        {/* Аккордеон комментария (появляется по кнопке 💬) */}
        <CommentAccordion 
          comment={currentQuestion.comment}
          isVisible={showComment && (currentAnswer !== undefined || isFinished)}
          isCorrect={isCorrect}
        />

        {/* Экран результатов (Overlay) */}
        {showResults && (
          <ResultScreen 
            results={results}
            total={questions.length}
            onRestart={() => window.location.reload()}
            onClose={() => setShowResults(false)}
            onFinish={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
};

export default QuizPage;
