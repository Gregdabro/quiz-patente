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
import ConfirmationModal from '../components/ui/ConfirmationModal';

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

  // Состояние модального окна выхода
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

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

  // Обработчик выхода
  const handleExitRequest = () => {
    if (isFinished) {
      navigate('/');
    } else {
      setIsExitModalOpen(true);
    }
  };

  return (
    <div className="page quiz-page">
      <AppHeader 
        title={topicId === 'errors' ? 'Работа над ошибками' : 
               topicId === 'all' ? 'Случайный тест' : `Тема ${topicId}`} 
        showBack={true}
        onBackOverride={handleExitRequest}
      />
      
      <div className="container" style={{ paddingBottom: 'var(--spacing-10)' }}>
        {/* Пагинация (общие 30 вопросов) */}
        <QuizPagination 
          questions={questions}
          current={current}
          answered={answered}
          onSelect={handleGoTo}
          onFinish={handleFinish}
        />

        <QuestionCard 
          question={currentQuestion}
          currentAnswer={currentAnswer}
          isSessionFinished={isFinished}
          onAnswer={handleAnswer}
          showComment={showComment}
          onToggleComment={() => setShowComment(!showComment)}
        />

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

        {/* Модальное окно подтверждения выхода */}
        <ConfirmationModal 
          isOpen={isExitModalOpen}
          message="Вы уверены, что хотите покинуть квиз? Ваш прогресс в этой сессии будет потерян."
          onConfirm={() => navigate('/')}
          onCancel={() => setIsExitModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default QuizPage;
