import { useState, useEffect } from 'react';
import { loadTopics, loadTopicQuestions } from '../services/questionsService.js';
import { getErrors } from '../services/errorsService.js';

const BATCH_SIZE = 5;

export default function useErrorTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1. Загружаем метаданные тем (topics.json — лёгкий файл)
        const rawTopics = await loadTopics();
        if (cancelled) return;

        // 2. Читаем ошибки из localStorage — синхронно, без запросов
        const errorIds = getErrors();
        const errorIdSet = new Set(Object.keys(errorIds));

        // 3. Оптимизация: если ошибок нет — не грузим JSON-файлы тем вообще
        if (errorIdSet.size === 0) {
          const enriched = rawTopics.map(t => ({ ...t, errorCount: 0 }));
          if (!cancelled) {
            setTopics(enriched);
            setLoading(false);
          }
          return;
        }

        // 4. Грузим вопросы батчами по 5, считаем ошибки по каждой теме
        const ids = rawTopics.map(t => t.topic_id);
        const errorCountMap = {};

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          if (cancelled) return;
          const batch = ids.slice(i, i + BATCH_SIZE);
          const batchQuestions = await Promise.all(
            batch.map(tid => loadTopicQuestions(tid))
          );

          batchQuestions.forEach((questions, idx) => {
            const topicId = batch[idx];
            let count = 0;
            for (let j = 0; j < questions.length; j++) {
              if (errorIdSet.has(String(questions[j].id))) count++;
            }
            errorCountMap[topicId] = count;
          });
        }

        if (cancelled) return;

        // 5. Обогащаем темы полем errorCount
        const enriched = rawTopics.map(t => ({
          ...t,
          errorCount: errorCountMap[t.topic_id] || 0,
        }));

        setTopics(enriched);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки тем');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { topics, loading, error };
}
