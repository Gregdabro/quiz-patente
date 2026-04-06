/**
 * useProgress.js
 * Предоставляет прогресс по всем темам из progressService.
 */

import { useState, useCallback } from 'react';
import { getProgress, getTopicProgress } from '../services/progressService.js';

export default function useProgress() {
  var stateRef = useState(function () { return getProgress(); });
  var progress = stateRef[0];
  var setProgress = stateRef[1];

  var refresh = useCallback(function () {
    setProgress(getProgress());
  }, []);

  var getForTopic = useCallback(function (topicId) {
    return getTopicProgress(topicId);
  }, []);

  return { progress: progress, refresh: refresh, getForTopic: getForTopic };
}
