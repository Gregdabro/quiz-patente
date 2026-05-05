/**
 * useImmersion.js
 * Главный контроллер режима Staged Immersion.
 *
 * Два режима использования:
 *   useImmersion(topicId, null)   → режим выбора чанка (ImmersionPage)
 *   useImmersion(topicId, N)      → режим изучения (ImmersionStudyPage)
 *
 * Контракт возвращаемого объекта:
 * {
 *   // Режим выбора чанка
 *   chunks,        // Array<{ index, label, questionCount, fromId, toId, progress, isUnlocked }>
 *   topicTitle,    // string
 *
 *   // Режим изучения
 *   chunkData,     // { questions, stage1Cards, stage2Cards, totalRelevant, alreadyKnown } | null
 *   currentStage,  // 's1' | 's2' | 'quiz_ready'
 *
 *   // Общее
 *   loading,       // boolean
 *   error,         // string | null
 *
 *   // Действие
 *   completeStage, // fn('s1' | 's2') → void
 * }
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadTopicQuestions, loadTopics } from '../services/questionsService.js';
import { loadDictionaryEntries } from '../services/dictionaryService.js';
import {
  getChunksMetadata,
  getChunkData,
  markWordsLearned,
  markStageComplete,
  getChunkProgress,
} from '../services/immersionService.js';

var CHUNK_SIZE = 20;

/**
 * Вычислить начальную стадию на основе сохранённого прогресса.
 * Позволяет вернуться туда, где пользователь остановился.
 *
 * @param {string|number} topicId
 * @param {number} chunkIndex
 * @returns {'s1'|'s2'|'quiz_ready'}
 */
function resolveInitialStage(topicId, chunkIndex) {
  var progress = getChunkProgress(topicId, chunkIndex);
  if (progress.s1 === 'done' && progress.s2 === 'done') {
    return 'quiz_ready';
  }
  if (progress.s1 === 'done') {
    return 's2';
  }
  return 's1';
}

export default function useImmersion(topicId, chunkIndex) {
  // Режим: true = изучение чанка, false = выбор чанка
  var isStudyMode = chunkIndex !== null && chunkIndex !== undefined;

  // --- Сырые данные (загружаются в обоих режимах) ---
  var [topicQuestions, setTopicQuestions] = useState(null);
  var [allEntries, setAllEntries]         = useState(null);
  var [topicTitle, setTopicTitle]         = useState('');

  // --- Стадия (только в режиме изучения) ---
  var [currentStage, setCurrentStage] = useState(function () {
    if (!isStudyMode) return 's1';
    return resolveInitialStage(topicId, chunkIndex);
  });

  var [loading, setLoading] = useState(true);
  var [error, setError]     = useState(null);

  // Загрузка данных при монтировании / смене темы или чанка
  useEffect(function () {
    var cancelled = false;

    setLoading(true);
    setError(null);
    setTopicQuestions(null);
    setAllEntries(null);
    setTopicTitle('');

    // Восстанавливаем стадию из прогресса при каждой смене chunkIndex
    if (isStudyMode) {
      setCurrentStage(resolveInitialStage(topicId, chunkIndex));
    }

    // Параллельная загрузка: вопросы темы + все записи словаря + метаданные тем
    Promise.all([
      loadTopicQuestions(topicId),
      loadDictionaryEntries(),
      loadTopics(),
    ])
      .then(function (results) {
        if (cancelled) return;

        var questions = results[0];
        var entries   = results[1];
        var topics    = results[2];

        // Находим название темы для AppHeader
        var topic = null;
        for (var i = 0; i < topics.length; i++) {
          if (String(topics[i].topic_id) === String(topicId)) {
            topic = topics[i];
            break;
          }
        }

        setTopicQuestions(questions);
        setAllEntries(entries);
        setTopicTitle(topic ? topic.title : '');
        setLoading(false);
      })
      .catch(function (err) {
        if (cancelled) return;
        setError(err.message || 'Ошибка загрузки данных');
        setLoading(false);
      });

    return function () {
      cancelled = true;
    };
  }, [topicId, chunkIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Режим выбора чанка: список всех блоков темы ---
  // useMemo: пересчитывается только при изменении вопросов или смене темы
  var chunks = useMemo(function () {
    if (isStudyMode || !topicQuestions) return [];
    return getChunksMetadata(topicId, topicQuestions, CHUNK_SIZE);
  }, [isStudyMode, topicQuestions, topicId]);

  // --- Режим изучения: данные текущего чанка ---
  // useMemo: пересчитывается только при изменении вопросов или entries
  // Не зависит от currentStage — vocab фильтруется при каждом вычислении
  var chunkData = useMemo(function () {
    if (!isStudyMode || !topicQuestions || !allEntries) return null;
    return getChunkData(topicId, allEntries, topicQuestions, chunkIndex, CHUNK_SIZE);
  }, [isStudyMode, topicQuestions, allEntries, topicId, chunkIndex]);

  /**
   * Завершить стадию изучения.
   * Сохраняет изученные термины в vocab, помечает стадию как done,
   * переходит к следующей стадии.
   *
   * Допустимые значения: 's1' | 's2'
   * Стадию 'quiz' помечает useQuiz.finish() — не этот хук.
   *
   * @param {'s1'|'s2'} stage
   */
  var completeStage = useCallback(function (stage) {
    if (!chunkData) return;

    // Определяем карточки завершаемой стадии
    var cards = stage === 's1' ? chunkData.stage1Cards : chunkData.stage2Cards;
    var entryIds = cards.map(function (e) { return e.id; });

    // Сохраняем изученные термины в глобальный vocab
    markWordsLearned(entryIds);

    // Помечаем стадию завершённой в прогрессе чанка
    markStageComplete(topicId, chunkIndex, stage);

    // Переходим к следующей стадии
    if (stage === 's1') {
      setCurrentStage('s2');
    } else if (stage === 's2') {
      setCurrentStage('quiz_ready');
    }
  }, [chunkData, topicId, chunkIndex]);

  /**
   * Сбросить текущую стадию к начальной (после resetChunkProgress).
   * Вызывается из ImmersionStudyPage при рестарте блока.
   */
  var resetStage = useCallback(function () {
    setCurrentStage('s1');
  }, []);

  return {
    // Режим выбора чанка
    chunks,
    topicTitle,

    // Режим изучения
    chunkData,
    currentStage,

    // Общее
    loading,
    error,

    // Действия
    completeStage,
    resetStage,
  };
}
