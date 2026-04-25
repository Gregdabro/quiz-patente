/**
 * useQuiz.js
 * Главный хук логики прохождения квиза.
 *
 * topicId: "1"–"25" | "all" | "errors" | "errors:N" | "dict:entryId"
 *
 * Контракт:
 * { questions, current, goTo, answered, answer, results, isFinished, finish, reset, loading, error }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadTopicQuestions,
  loadAllQuestions,
  loadTopicErrorQuestions,
  loadQuestionsByEntry,
  pickSessionQuestions
} from '../services/questionsService.js';
import { getErrorQuestions } from '../services/errorsService.js';
import { incrementError, decrementError } from '../services/errorsService.js';
import { saveTestResult } from '../services/progressService.js';
import { loadDictionaryEntries, markAsPracticed } from '../services/dictionaryService.js';

export default function useQuiz(topicId) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  
  // Map: questionId → boolean (ответ пользователя)
  const [answered, setAnswered] = useState(() => new Map());
  
  // Массив { questionId, correct, topicId }
  const [results, setResults] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  // Ref для хранения всех вопросов при режиме "errors"
  const allQuestionsRef = useRef([]);
  // Защита от двойного сохранения статистики
  const isSavedRef = useRef(false);
  // Защита от Race Condition при быстром клике
  const answeringRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrent(0);
    setAnswered(new Map());
    setResults([]);
    setIsFinished(false);
    isSavedRef.current = false;
    answeringRef.current = false;

    let promise;

    if (topicId === 'all') {
      promise = loadAllQuestions();
    } else if (topicId === 'errors') {
      promise = loadAllQuestions().then((all) => {
        allQuestionsRef.current = all;
        return getErrorQuestions(all);
      });
    } else if (typeof topicId === 'string' && topicId.startsWith('errors:')) {
      // Режим «ошибки по конкретной теме»
      const tid = topicId.slice(7); // убираем префикс 'errors:'
      promise = loadTopicErrorQuestions(tid);
    } else if (typeof topicId === 'string' && topicId.startsWith('dict:')) {
      // Режим «вопросы по термину словаря»
      const entryId = topicId.slice(5); // убираем префикс 'dict:'
      promise = loadDictionaryEntries().then(function (entries) {
        var entry = entries.find(function (e) { return e.id === entryId; });
        if (!entry) throw new Error('Термин словаря не найден: ' + entryId);
        return loadQuestionsByEntry(entry);
      });
    } else {
      promise = loadTopicQuestions(topicId);
    }

    promise
      .then((raw) => {
        if (cancelled) return;
        const session = pickSessionQuestions(raw);
        setQuestions(session);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Ошибка загрузки вопросов');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [topicId, sessionKey]);

  /**
   * Ответить на текущий вопрос.
   * @param {boolean} userAnswer
   */
  const answer = useCallback((userAnswer) => {
    if (isFinished || answeringRef.current) return;

    const q = questions[current];
    if (!q) return;
    if (answered.has(q.id)) return; // уже отвечен

    answeringRef.current = true;

    const isCorrect = userAnswer === q.answer;

    // Обновляем ошибки
    if (isCorrect) {
      decrementError(q.id);
    } else {
      incrementError(q.id);
    }

    // Обновляем answered (новая Map для иммутабельности)
    const newAnswered = new Map(answered);
    newAnswered.set(q.id, userAnswer);
    setAnswered(newAnswered);

    // Обновляем results
    const newResults = results.concat([{
      questionId: q.id,
      correct: isCorrect,
      topicId: q.topic_id,
    }]);
    setResults(newResults);

    // Проверяем завершение сессии
    if (newResults.length === questions.length) {
      setIsFinished(true);
    }

    // Снимаем блокировку через небольшую задержку
    // чтобы предотвратить дебаунс на уровне UI
    setTimeout(() => {
      answeringRef.current = false;
    }, 50);
  }, [questions, current, answered, results, isFinished]);

  /**
   * Перейти к вопросу по индексу (кликабельная пагинация).
   * @param {number} index
   */
  const goTo = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      setCurrent(index);
    }
  }, [questions.length]);

  /**
   * Завершить сессию вручную и сохранить результат.
   */
  const finish = useCallback(() => {
    if (isSavedRef.current) return;

    const correctCount = results.filter((r) => r.correct).length;
    // Не сохраняем статистику для режимов dict: (тренировка по термину)
    var isDictMode = typeof topicId === 'string' && topicId.startsWith('dict:');
    if (!isDictMode) {
      saveTestResult(topicId, correctCount, questions.length);
    } else {
      // Для словаря — отмечаем как отработанное
      var entryId = topicId.slice(5);
      markAsPracticed(entryId);
    }

    isSavedRef.current = true;
    setIsFinished(true);
  }, [results, questions.length, topicId]);

  /**
   * Сбросить сессию и запустить новую (для кнопки "Попробовать снова").
   */
  const reset = useCallback(() => {
    setSessionKey(prev => prev + 1);
  }, []);

  return {
    questions,
    current,
    goTo,
    answered,
    answer,
    results,
    isFinished,
    finish,
    reset,
    loading,
    error,
  };
}
