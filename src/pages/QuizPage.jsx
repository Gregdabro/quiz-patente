import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useQuiz from '../hooks/useQuiz';
import useSwipe from '../hooks/useSwipe';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import AppHeader from '../components/layout/AppHeader';

// Новые компоненты после рефакторинга
import QuizPagination from '../components/quiz/QuizPagination';
import QuestionCard from '../components/quiz/QuestionCard';
import CommentAccordion from '../components/quiz/CommentAccordion';
import ResultScreen from '../components/quiz/ResultScreen';
import SlideTransition from '../components/ui/SlideTransition';
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
  
  const [showComment, setShowComment] = useState(false);
  
  // Глобальное состояние перевода (сохраняется при смене вопроса)
  const [globalTranslation, setGlobalTranslation] = useState(false);
  
  // Направление анимации перехода
  const [transitionDirection, setTransitionDirection] = useState('forward');
  
  const [showResults, setShowResults] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const handleGoTo = useCallback((index) => {
    setTransitionDirection(index > current ? 'forward' : 'backward');
    goTo(index);
    setShowComment(false);
  }, [current, goTo]);

  // Логика свайпа
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleGoTo(current + 1),
    onSwipeRight: () => handleGoTo(current - 1),
    threshold: 60
  });

  if (loading) return <Spinner />;
  if (error) return <div className="container error" style={{ padding: '40px', textAlign: 'center' }}>{error}</div>;
  if (!questions.length) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Нет доступных вопросов</div>;

  const currentQuestion = questions[current];
  const currentAnswer = answered.has(currentQuestion.id) ? answered.get(currentQuestion.id) : undefined;
  const isCorrect = currentAnswer !== undefined ? currentAnswer === currentQuestion.answer : null;

  // Обработчик ответа
  const handleAnswer = useCallback((userAnswer) => {
    answer(userAnswer);
    setShowComment(false);
  }, [answer]);

  // Обработчик завершения
  const handleFinish = useCallback(() => {
    finish();
    setShowResults(true);
  }, [finish]);

  // Обработчик выхода
  const handleExitRequest = useCallback(() => {
    if (isFinished) {
      navigate('/');
    } else {
      setIsExitModalOpen(true);
    }
  }, [isFinished, navigate]);

  const handleToggleComment = useCallback(() => {
    setShowComment(prev => !prev);
  }, []);

  const handleToggleTranslation = useCallback(() => {
    setGlobalTranslation(prev => !prev);
  }, []);

  return (
    <div className="page quiz-page" {...swipeHandlers}>
      <AppHeader 
        title={topicId === 'errors' ? 'Работа над ошибками' : 
               topicId === 'all' ? 'Случайный тест' : `Тема ${topicId}`} 
        showBack={true}
        onBackOverride={handleExitRequest}
      />
      
      <div className="container" style={{ paddingBottom: '120px' }}>
        {/* Пагинация (общие 30 вопросов) */}
        <QuizPagination 
          questions={questions}
          current={current}
          answered={answered}
          onSelect={handleGoTo}
          onFinish={handleFinish}
        />

        <SlideTransition contentKey={currentQuestion.id} direction={transitionDirection}>
          <QuestionCard 
            question={currentQuestion}
            currentAnswer={currentAnswer}
            isSessionFinished={isFinished}
            onAnswer={handleAnswer}
            showComment={showComment}
            onToggleComment={handleToggleComment}
            showTranslation={globalTranslation}
            onToggleTranslation={handleToggleTranslation}
          />
        </SlideTransition>

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
