/**
 * useTopics.js
 * Загружает список тем и обогащает их прогрессом из progressService.
 */

import { useState, useEffect } from 'react';
import { loadTopics } from '../services/questionsService.js';
import { getTopicProgress } from '../services/progressService.js';

export default function useTopics() {
  const [state, setState] = useState({ topics: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    loadTopics()
      .then((raw) => {
        if (cancelled) return;
        const enriched = raw.map((topic) => {
          const progress = getTopicProgress(topic.topic_id);
          return { ...topic, progress };
        });
        setState({ topics: enriched, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ topics: [], loading: false, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
