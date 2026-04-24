/**
 * useDictionary.js
 * Управляет состоянием словаря: загрузка, фильтрация, поиск, прогресс.
 *
 * @param {Object} options
 * @param {string} [options.typeFilter='all'] — фильтр по типу записи:
 *   'all' | 'logic_trigger' | 'term' | 'phrase' | 'concept'
 *
 * @returns {{
 *   entries: Array,        — отфильтрованные записи (по typeFilter + searchQuery)
 *   allEntries: Array,     — все записи без фильтрации (для подсчёта)
 *   progress: Object,      — { [entryId]: { seen, practiced } }
 *   stats: Object,         — { total, seen, practiced }
 *   loading: boolean,
 *   error: string|null,
 *   searchQuery: string,
 *   setSearchQuery: Function,
 *   markSeen: Function,    — markSeen(entryId)
 *   markPracticed: Function — markPracticed(entryId)
 * }}
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadDictionaryEntries,
  searchEntries,
  getDictionaryProgress,
  markAsSeen,
  markAsPracticed,
} from '../services/dictionaryService.js';

export default function useDictionary({ typeFilter = 'all' } = {}) {
  const [allEntries, setAllEntries] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка при монтировании — один раз за жизнь компонента
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const entries = await loadDictionaryEntries();
        if (cancelled) return;

        // Сортировка: сначала по priority (1 → 2 → 3), затем алфавитно по term
        const sorted = entries.slice().sort(function (a, b) {
          const pa = a.priority || 3;
          const pb = b.priority || 3;
          if (pa !== pb) return pa - pb;
          return a.term.localeCompare(b.term);
        });

        setAllEntries(sorted);
        setProgress(getDictionaryProgress());
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Ошибка загрузки словаря');
        setLoading(false);
      }
    }

    load();
    return function () { cancelled = true; };
  }, []);

  // Фильтрация в памяти — без перезагрузки при смене typeFilter или searchQuery
  const entries = useMemo(function () {
    let result = allEntries;

    // 1. Фильтр по типу
    if (typeFilter !== 'all') {
      result = result.filter(function (e) { return e.type === typeFilter; });
    }

    // 2. Текстовый поиск (только если запрос ≥ 2 символов)
    if (searchQuery.trim().length >= 2) {
      result = searchEntries(result, searchQuery);
    }

    return result;
  }, [allEntries, typeFilter, searchQuery]);

  // Статистика прогресса по всем записям (не зависит от фильтра)
  const stats = useMemo(function () {
    const total = allEntries.length;
    const progressValues = Object.values(progress);
    const seen = progressValues.filter(function (p) { return p.seen; }).length;
    const practiced = progressValues.filter(function (p) { return p.practiced; }).length;
    return { total: total, seen: seen, practiced: practiced };
  }, [allEntries, progress]);

  // Колбэки стабильны — не пересоздаются при ре-рендерах
  const handleMarkSeen = useCallback(function (entryId) {
    markAsSeen(entryId);
    setProgress(getDictionaryProgress());
  }, []);

  const handleMarkPracticed = useCallback(function (entryId) {
    markAsPracticed(entryId);
    setProgress(getDictionaryProgress());
  }, []);

  return {
    entries: entries,
    allEntries: allEntries,
    progress: progress,
    stats: stats,
    loading: loading,
    error: error,
    searchQuery: searchQuery,
    setSearchQuery: setSearchQuery,
    markSeen: handleMarkSeen,
    markPracticed: handleMarkPracticed,
  };
}
