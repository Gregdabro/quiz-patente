/**
 * useTopics.js
 * Загружает список тем и обогащает их прогрессом из progressService.
 */

import { useState, useEffect } from 'react';
import { loadTopics } from '../services/questionsService.js';
import { getTopicProgress } from '../services/progressService.js';

export function useTopics() {
  var initialState = { topics: [], loading: true, error: null };
  var stateRef = useState(initialState);
  var state = stateRef[0];
  var setState = stateRef[1];

  useEffect(function () {
    var cancelled = false;

    loadTopics()
      .then(function (raw) {
        if (cancelled) return;
        var enriched = raw.map(function (topic) {
          var progress = getTopicProgress(topic.topic_id);
          return Object.assign({}, topic, { progress: progress });
        });
        setState({ topics: enriched, loading: false, error: null });
      })
      .catch(function (err) {
        if (cancelled) return;
        setState({ topics: [], loading: false, error: err.message });
      });

    return function () { cancelled = true; };
  }, []);

  return state;
}
