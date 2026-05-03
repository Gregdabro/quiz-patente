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
    reset,
    loading, 
    error 
  } = useQuiz(topicId);
  
  const [showComment, setShowComment] = useState(false);
  
  // Состояние перевода для каждого вопроса (хранит ID вопросов с включенным переводом)
  const [translatedQuestions, setTranslatedQuestions] = useState(() => new Set());
  
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

  // Определяем куда возвращаться при выходе
  // immersion:topicId:chunkIndex → /immersion/topicId
  // errors:N → /errors
  // всё остальное → /
  var backPath;
  if (topicId.startsWith('immersion:')) {
    var immParts = topicId.split(':'); // ['immersion', 'topicId', 'chunkIndex']
    backPath = '/immersion/' + immParts[1];
  } else if (topicId.startsWith('errors:')) {
    backPath = '/errors';
  } else {
    backPath = '/';
  }

  const currentQuestion = questions[current] || {};

  // Обработчик ответа
  const handleAnswer = useCallback((userAnswer) => {
    answer(userAnswer);
    
    // Если ответ неверный — раскрываем комментарий через 150мс
    if (userAnswer !== currentQuestion.answer) {
      setTimeout(() => setShowComment(true), 150);
    } else {
      setShowComment(false);
    }
  }, [answer, currentQuestion.answer]);

  // Обработчик завершения
  const handleFinish = useCallback(() => {
    finish();
    setShowResults(true);
  }, [finish]);

  // Обработчик выхода
  const handleExitRequest = useCallback(() => {
    if (isFinished) {
      navigate(backPath);
    } else {
      setIsExitModalOpen(true);
    }
  }, [isFinished, navigate, backPath]);

  const handleToggleComment = useCallback(() => {
    setShowComment(prev => !prev);
  }, []);

  const handleToggleTranslation = useCallback(() => {
    const qId = currentQuestion?.id;
    if (!qId) return;
    setTranslatedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  }, [currentQuestion?.id]);

  if (loading) return <Spinner />;
  if (error) return <div className="container error" style={{ padding: '40px', textAlign: 'center' }}>{error}</div>;
  if (!questions.length) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Нет доступных вопросов</div>;

  const currentAnswer = answered.has(currentQuestion.id) ? answered.get(currentQuestion.id) : undefined;
  const isCorrect = currentAnswer !== undefined ? currentAnswer === currentQuestion.answer : null;


  return (
    <div className="page quiz-page" {...swipeHandlers}>
      <AppHeader 
        title={
          topicId === 'errors' ? 'Работа над ошибками' :
          topicId === 'all'    ? 'Случайный тест' :
          topicId.startsWith('errors:') ? `Ошибки — Тема ${topicId.slice(7)}` :
          topicId.startsWith('dict:') ? 'Тренировка по словарю' :
          topicId.startsWith('immersion:') ? 'Квиз — Погружение' :
          `Тема ${topicId}`
        }
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
          isFinished={isFinished}
        />

        <SlideTransition contentKey={currentQuestion.id} direction={transitionDirection}>
          <QuestionCard 
            question={currentQuestion}
            currentAnswer={currentAnswer}
            isSessionFinished={isFinished}
            onAnswer={handleAnswer}
            showComment={showComment}
            onToggleComment={handleToggleComment}
            showTranslation={translatedQuestions.has(currentQuestion.id)}
            onToggleTranslation={handleToggleTranslation}
          />
        </SlideTransition>

        {/* Аккордеон комментария (раскрывается по клику на 💬 или автоматически при ошибке) */}
        <CommentAccordion 
          comment={currentQuestion.comment}
          isVisible={showComment && (currentAnswer !== undefined || isFinished)}
          isCorrect={isCorrect}
          showNextBtn={true}
          onNext={() => {
            const nextIndex = current + 1 < questions.length ? current + 1 : current;
            handleGoTo(nextIndex);
          }}
        />

        {/* Экран результатов (Overlay) */}
        {showResults && (
          <ResultScreen 
            results={results}
            questions={questions}
            total={questions.length}
            topicId={topicId}
            onRestart={() => {
              reset();
              setShowResults(false);
            }}
            onClose={() => setShowResults(false)}
            onFinish={() => navigate(backPath)}
          />
        )}

        {/* Модальное окно подтверждения выхода */}
        <ConfirmationModal 
          isOpen={isExitModalOpen}
          message="Вы уверены, что хотите покинуть квиз? Ваш прогресс в этой сессии будет потерян."
          onConfirm={() => navigate(backPath)}
          onCancel={() => setIsExitModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default QuizPage;
