/**
 * useProgress.js
 * Предоставляет прогресс по всем темам из progressService.
 */

import { useState, useCallback } from 'react';
import { getProgress, getTopicProgress } from '../services/progressService.js';

export default function useProgress() {
  const [progress, setProgress] = useState(() => getProgress());

  const refresh = useCallback(() => {
    setProgress(getProgress());
  }, []);

  const getForTopic = useCallback((topicId) => {
    return getTopicProgress(topicId);
  }, []);

  return { progress, refresh, getForTopic };
}
