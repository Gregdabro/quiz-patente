/**
 * ImmersionStudyPage.jsx — Шаг 12 плана Staged Immersion Mode
 * Маршрут: /immersion/:topicId/:chunkIndex
 *
 * Пайплайн: Stage 1 (Слова) → Stage 2 (Фразы) → Quiz Ready
 *
 * Зависимости:
 *   useImmersion(topicId, chunkIndex) → chunkData, currentStage, completeStage, ...
 *   FlashCardDeck  → cards, onComplete
 *   StageNav       → stages[]
 *   ReadyScreen    → s1Count, s2Count, alreadyKnown, questionCount, onStart
 *   AppHeader      → title, showBack, onBackOverride
 *   ConfirmationModal → выход из незавершённой стадии
 *   Spinner        → при loading
 *
 * Edge cases:
 *   - stage1Cards.length === 0 → стадия 1 автоматически пропускается в useImmersion
 *   - stage2Cards.length === 0 → стадия 2 автоматически пропускается в useImmersion
 *   - Пустые обе стадии → currentStage === 'quiz_ready' сразу (useImmersion обрабатывает)
 *
 * iOS 12: margin-based spacing, нет gap, transition через max-height.
 */

import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useImmersion from '../hooks/useImmersion';
import AppHeader from '../components/layout/AppHeader';
import FlashCardDeck from '../components/immersion/FlashCardDeck';
import StageNav from '../components/immersion/StageNav';
import ReadyScreen from '../components/immersion/ReadyScreen';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Spinner from '../components/ui/Spinner';
import { resetChunkProgress } from '../services/immersionService';

// ---------------------------------------------------------------------------
// Вспомогательная функция: вычислить массив stages для StageNav
// ---------------------------------------------------------------------------
function buildStages(currentStage) {
  // s1 → active:s1, pending:s2/quiz
  // s2 → done:s1, active:s2, pending:quiz
  // quiz_ready → done:s1, done:s2, active:quiz
  var s1Status, s2Status, quizStatus;

  if (currentStage === 's1') {
    s1Status   = 'active';
    s2Status   = 'pending';
    quizStatus = 'pending';
  } else if (currentStage === 's2') {
    s1Status   = 'done';
    s2Status   = 'active';
    quizStatus = 'pending';
  } else {
    // quiz_ready
    s1Status   = 'done';
    s2Status   = 'done';
    quizStatus = 'active';
  }

  return [
    { id: 's1',   label: 'Слова',  status: s1Status },
    { id: 's2',   label: 'Фразы',  status: s2Status },
    { id: 'quiz', label: 'Квиз',   status: quizStatus },
  ];
}

// ---------------------------------------------------------------------------
// ImmersionStudyPage
// ---------------------------------------------------------------------------
var ImmersionStudyPage = function ImmersionStudyPage() {
  var params      = useParams();
  var topicId     = params.topicId;
  var chunkIndex  = parseInt(params.chunkIndex, 10);
  var navigate    = useNavigate();

  // Показывать ConfirmationModal при попытке выйти до завершения стадии
  var [showExitModal, setShowExitModal] = useState(false);
  // Показывать ConfirmationModal при рестарте блока
  var [showRestartModal, setShowRestartModal] = useState(false);
  // Ключ для принудительного ре-маунта FlashCardDeck после рестарта
  var [deckKey, setDeckKey] = useState(0);

  // Данные чанка и управление стадиями
  var result        = useImmersion(topicId, chunkIndex);
  var chunkData     = result.chunkData;
  var currentStage  = result.currentStage;
  var topicTitle    = result.topicTitle;
  var loading       = result.loading;
  var error         = result.error;
  var completeStage = result.completeStage;
  var resetStage    = result.resetStage;
  var resetChunkData = result.resetChunkData;

  // -------------------------------------------------------------------
  // Обработчики навигации
  // -------------------------------------------------------------------

  // Кнопка "←" в AppHeader: если стадия не завершена — показываем модал
  var handleBackAttempt = useCallback(function () {
    // На стадии quiz_ready можно уходить свободно (стадии уже сохранены)
    if (currentStage === 'quiz_ready') {
      navigate('/immersion/' + topicId);
    } else {
      setShowExitModal(true);
    }
  }, [currentStage, navigate, topicId]);

  // Подтверждение выхода через модал
  var handleExitConfirm = useCallback(function () {
    setShowExitModal(false);
    navigate('/immersion/' + topicId);
  }, [navigate, topicId]);

  var handleExitCancel = useCallback(function () {
    setShowExitModal(false);
  }, []);

  // Запрос на рестарт — показываем модал
  var handleRestartRequest = useCallback(function () {
    setShowRestartModal(true);
  }, []);

  // Подтверждение рестарта: сброс прогресса + stage + chunkData + deck
  var handleRestartConfirm = useCallback(function () {
    resetChunkProgress(topicId, chunkIndex);
    resetStage();
    resetChunkData();  // инвалидирует useMemo → chunkData пересчитается с актуальным vocab
    setDeckKey(function (prev) { return prev + 1; });
    setShowRestartModal(false);
  }, [topicId, chunkIndex, resetStage, resetChunkData]);

  var handleRestartCancel = useCallback(function () {
    setShowRestartModal(false);
  }, []);

  // Завершение Stage 1 → переход к Stage 2
  var handleStage1Complete = useCallback(function () {
    completeStage('s1');
  }, [completeStage]);

  // Завершение Stage 2 → переход к quiz_ready
  var handleStage2Complete = useCallback(function () {
    completeStage('s2');
  }, [completeStage]);

  // Кнопка "Начать квиз" на ReadyScreen
  var handleStartQuiz = useCallback(function () {
    navigate('/quiz/immersion:' + topicId + ':' + chunkIndex);
  }, [navigate, topicId, chunkIndex]);

  // -------------------------------------------------------------------
  // Заголовок AppHeader
  // -------------------------------------------------------------------
  var chunkNumber = chunkIndex + 1; // Блок 1, Блок 2, ...
  var headerTitle = topicTitle
    ? topicTitle + ' · Блок ' + chunkNumber
    : 'Блок ' + chunkNumber;

  // -------------------------------------------------------------------
  // Стадии для StageNav
  // -------------------------------------------------------------------
  var stages = buildStages(currentStage);

  // Кнопка рестарта видна всегда в режиме изучения (не только при наличии прогресса).
  // Пользователь может захотеть начать заново с любой стадии.
  var hasProgress = true;

  // -------------------------------------------------------------------
  // Рендер
  // -------------------------------------------------------------------

  return (
    <div className="immersion-study">
      <AppHeader
        title={headerTitle}
        showBack={true}
        onBackOverride={handleBackAttempt}
        rightContent={hasProgress && !loading && !error ? (
          <button
            className="header-restart-btn"
            onClick={handleRestartRequest}
            title="Начать блок заново"
          >
            ↺ Заново
          </button>
        ) : null}
      />

      {/* Прогресс стадий (всегда виден кроме loading) */}
      {!loading && !error && (
        <div className="immersion-study__stage-nav">
          <StageNav stages={stages} />
        </div>
      )}

      {/* Основной контент */}
      <div className="immersion-study__body">
        {loading && (
          <div className="immersion-study__loading">
            <Spinner />
          </div>
        )}

        {!loading && error && (
          <div className="immersion-study__error">
            <p className="immersion-study__error-text">{error}</p>
          </div>
        )}

        {!loading && !error && chunkData && (
          <>
            {/* Stage 1: logic_trigger + term */}
            {currentStage === 's1' && (
              <div className="immersion-study__stage">
                {chunkData.stage1Cards.length === 0 ? (
                  /* Нет карточек — авто-пропуск (useImmersion должен был перейти сам,
                     но на случай рассинхронизации показываем сообщение) */
                  <div className="immersion-study__empty-stage">
                    <p className="immersion-study__empty-text">
                      Ты уже знаешь все термины этого блока 🎉
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={handleStage1Complete}
                    >
                      Продолжить →
                    </button>
                  </div>
                ) : (
                  <FlashCardDeck
                    key={deckKey}
                    cards={chunkData.stage1Cards}
                    onComplete={handleStage1Complete}
                  />
                )}
              </div>
            )}

            {/* Stage 2: phrase + concept */}
            {currentStage === 's2' && (
              <div className="immersion-study__stage">
                {chunkData.stage2Cards.length === 0 ? (
                  <div className="immersion-study__empty-stage">
                    <p className="immersion-study__empty-text">
                      Фраз для этого блока нет — идём к квизу 🎉
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={handleStage2Complete}
                    >
                      Продолжить →
                    </button>
                  </div>
                ) : (
                  <FlashCardDeck
                    key={deckKey}
                    cards={chunkData.stage2Cards}
                    onComplete={handleStage2Complete}
                  />
                )}
              </div>
            )}

            {/* Quiz Ready */}
            {currentStage === 'quiz_ready' && (
              <div className="immersion-study__ready">
                <ReadyScreen
                  s1Count={chunkData.stage1Cards.length}
                  s2Count={chunkData.stage2Cards.length}
                  alreadyKnown={chunkData.alreadyKnown}
                  questionCount={chunkData.questions.length}
                  onStart={handleStartQuiz}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Модал подтверждения выхода */}
      <ConfirmationModal
        isOpen={showExitModal}
        title="Выйти из изучения?"
        message="Прогресс текущей стадии не сохранится. Выйти?"
        confirmText="Выйти"
        cancelText="Остаться"
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
      />

      {/* Модал подтверждения рестарта */}
      <ConfirmationModal
        isOpen={showRestartModal}
        title="Начать заново?"
        message="Прогресс блока сбросится. Изученные слова останутся в словаре."
        confirmText="Сбросить"
        cancelText="Отмена"
        onConfirm={handleRestartConfirm}
        onCancel={handleRestartCancel}
      />
    </div>
  );
};

export default ImmersionStudyPage;
