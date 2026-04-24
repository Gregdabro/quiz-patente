import React, { useState } from 'react';
import AppHeader from '../components/layout/AppHeader';
import Spinner from '../components/ui/Spinner';
import ProgressBar from '../components/ui/ProgressBar';
import SearchBar from '../components/dictionary/SearchBar';
import TypeFilter from '../components/dictionary/TypeFilter';
import DictionaryEntryCard from '../components/dictionary/DictionaryEntryCard';
import useDictionary from '../hooks/useDictionary';

/**
 * Страница словаря (Phase 3).
 * Language Decoder — помогает понять логику вопросов ПДД через язык.
 */
const DictionaryPage = () => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const {
    entries,
    stats,
    progress,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    markSeen,
  } = useDictionary({ typeFilter });

  // Аккордеон: один открытый одновременно
  function handleToggle(entryId) {
    setExpandedId(function (prev) {
      return prev === entryId ? null : entryId;
    });
  }

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="page dictionary-page">
        <AppHeader title="Словарь" />
        <div className="container">
          <p className="dict-error">
            {error}
          </p>
        </div>
      </div>
    );
  }

  var seenPercent = stats.total > 0 ? Math.round((stats.seen / stats.total) * 100) : 0;
  var hasResults = entries.length > 0;

  return (
    <div className="page dictionary-page">
      <AppHeader title="Словарь" />

      <div className="container">

        {/* Прогресс изучения */}
        <div className="dict-page-header">
          <div className="dict-progress">
            <div className="dict-progress__label">
              <span>Изучено</span>
              <span className="dict-progress__count">{stats.seen} / {stats.total}</span>
            </div>
            <ProgressBar progress={seenPercent} />
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="dict-controls">
          <div className="dict-controls__search">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Поиск термина..."
            />
          </div>
          <div className="dict-controls__filter">
            <TypeFilter value={typeFilter} onChange={setTypeFilter} />
          </div>
        </div>

        {/* Список карточек */}
        <div className="dict-list">
          {hasResults ? (
            entries.map(function (entry) {
              return (
                <DictionaryEntryCard
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedId === entry.id}
                  onToggle={handleToggle}
                  isSeen={!!(progress[entry.id] && progress[entry.id].seen)}
                  onMarkSeen={markSeen}
                />
              );
            })
          ) : (
            <div className="dict-empty">
              <div className="dict-empty__icon">🔍</div>
              <p className="dict-empty__text">
                {searchQuery.length >= 2
                  ? 'Ничего не найдено по запросу «' + searchQuery + '»'
                  : 'Нет записей в этой категории'}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DictionaryPage;
