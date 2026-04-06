/**
 * useQuiz.js
 * Главный хук логики прохождения квиза.
 *
 * topicId: "1"–"25" | "all" | "errors"
 *
 * Контракт:
 * { questions, current, goTo, answered, answer, results, isFinished, finish, loading, error }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadTopicQuestions, loadAllQuestions, pickSessionQuestions } from '../services/questionsService.js';
import { getErrorQuestions } from '../services/errorsService.js';
import { incrementError, decrementError } from '../services/errorsService.js';
import { saveTestResult } from '../services/progressService.js';

export function useQuiz(topicId) {
  var questionsRef = useState([]);
  var questions = questionsRef[0];
  var setQuestions = questionsRef[1];

  var currentRef = useState(0);
  var current = currentRef[0];
  var setCurrent = currentRef[1];

  // Map: questionId → boolean (ответ пользователя)
  var answeredRef = useState(function () { return new Map(); });
  var answered = answeredRef[0];
  var setAnswered = answeredRef[1];

  // Массив { questionId, correct, topicId }
  var resultsRef = useState([]);
  var results = resultsRef[0];
  var setResults = resultsRef[1];

  var loadingRef = useState(true);
  var loading = loadingRef[0];
  var setLoading = loadingRef[1];

  var errorRef = useState(null);
  var error = errorRef[0];
  var setError = errorRef[1];

  var isFinishedRef = useState(false);
  var isFinished = isFinishedRef[0];
  var setIsFinished = isFinishedRef[1];

  // Глобальный тоггл перевода — сохраняется на всю сессию
  var translateRef = useState(false);
  var showTranslation = translateRef[0];
  var setShowTranslation = translateRef[1];

  // Ref для хранения всех вопросов при режиме "errors"
  var allQuestionsRef = useRef([]);

  useEffect(function () {
    var cancelled = false;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrent(0);
    setAnswered(new Map());
    setResults([]);
    setIsFinished(false);

    var promise;

    if (topicId === 'all') {
      promise = loadAllQuestions();
    } else if (topicId === 'errors') {
      promise = loadAllQuestions().then(function (all) {
        allQuestionsRef.current = all;
        return getErrorQuestions(all);
      });
    } else {
      promise = loadTopicQuestions(topicId);
    }

    promise
      .then(function (raw) {
        if (cancelled) return;
        var session = pickSessionQuestions(raw);
        setQuestions(session);
        setLoading(false);
      })
      .catch(function (err) {
        if (cancelled) return;
        setError(err.message || 'Ошибка загрузки вопросов');
        setLoading(false);
      });

    return function () { cancelled = true; };
  }, [topicId]);

  /**
   * Ответить на текущий вопрос.
   * @param {boolean} userAnswer
   */
  var answer = useCallback(function (userAnswer) {
    var q = questions[current];
    if (!q) return;
    if (answered.has(q.id)) return; // уже отвечен

    var isCorrect = userAnswer === q.answer;

    // Обновляем ошибки
    if (isCorrect) {
      decrementError(q.id);
    } else {
      incrementError(q.id);
    }

    // Обновляем answered (новая Map для иммутабельности)
    var newAnswered = new Map(answered);
    newAnswered.set(q.id, userAnswer);
    setAnswered(newAnswered);

    // Обновляем results
    var newResults = results.concat([{
      questionId: q.id,
      correct: isCorrect,
      topicId: q.topic_id,
    }]);
    setResults(newResults);

    // Проверяем завершение сессии
    if (newResults.length === questions.length) {
      setIsFinished(true);
    }
  }, [questions, current, answered, results]);

  /**
   * Перейти к вопросу по индексу (кликабельная пагинация).
   * @param {number} index
   */
  var goTo = useCallback(function (index) {
    if (index >= 0 && index < questions.length) {
      setCurrent(index);
    }
  }, [questions.length]);

  /**
   * Завершить сессию вручную и сохранить результат.
   */
  var finish = useCallback(function () {
    var correctCount = results.filter(function (r) { return r.correct; }).length;
    saveTestResult(topicId, correctCount, questions.length);
    setIsFinished(true);
  }, [results, questions.length, topicId]);

  /**
   * Тоггл перевода (глобальный для сессии).
   */
  var toggleTranslation = useCallback(function () {
    setShowTranslation(function (prev) { return !prev; });
  }, []);

  return {
    questions:       questions,
    current:         current,
    goTo:            goTo,
    answered:        answered,
    answer:          answer,
    results:         results,
    isFinished:      isFinished,
    finish:          finish,
    loading:         loading,
    error:           error,
    showTranslation: showTranslation,
    toggleTranslation: toggleTranslation,
  };
}
