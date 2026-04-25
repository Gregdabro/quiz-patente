import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Spinner from '../components/ui/Spinner';
import ProgressBar from '../components/ui/ProgressBar';
import SearchBar from '../components/dictionary/SearchBar';
import TypeFilter from '../components/dictionary/TypeFilter';
import TopicFilter from '../components/dictionary/TopicFilter';
import ModeToggle from '../components/dictionary/ModeToggle';
import DictionaryEntryCard from '../components/dictionary/DictionaryEntryCard';
import StudyCard from '../components/dictionary/StudyCard';
import useDictionary from '../hooks/useDictionary';
import useTopics from '../hooks/useTopics';

/**
 * Страница словаря (Phase 3 v2).
 * Language Decoder — помогает понять логику вопросов ПДД через язык.
 * Режимы: Список (аккордеон) и Карточки (StudyCard / flashcards).
 */
var DictionaryPage = function DictionaryPage() {
  var [searchParams] = useSearchParams();
  var [mode, setMode]               = useState('list');
  var [typeFilter, setTypeFilter]   = useState('all');
  var [topicFilter, setTopicFilter] = useState(function () {
    var t = searchParams.get('topic');
    return t ? Number(t) : null;
  });
  var [expandedId, setExpandedId]   = useState(null);

  var { topics } = useTopics();

  var {
    entries,
    stats,
    progress,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    studyIndex,
    setStudyIndex,
    markSeen,
    markPracticed,
  } = useDictionary({ typeFilter: typeFilter, topicFilter: topicFilter });

  // Аккордеон: один открытый одновременно
  function handleToggle(entryId) {
    setExpandedId(function (prev) {
      return prev === entryId ? null : entryId;
    });
  }

  // Study Mode навигация
  function handleStudyPrev() {
    setStudyIndex(function (prev) { return Math.max(0, prev - 1); });
  }
  function handleStudyNext() {
    setStudyIndex(function (prev) { return Math.min(entries.length - 1, prev + 1); });
  }

  // При смене режима — сбрасываем состояния навигации
  function handleModeChange(newMode) {
    setMode(newMode);
    setExpandedId(null);
  }

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="page dictionary-page">
        <AppHeader title="Словарь" />
        <div className="container">
          <p className="dict-error">{error}</p>
        </div>
      </div>
    );
  }

  var seenPercent = stats.total > 0 ? Math.round((stats.seen / stats.total) * 100) : 0;
  var hasResults  = entries.length > 0;
  var currentEntry = entries[studyIndex] || null;

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

        {/* Переключатель режимов */}
        <div className="dict-controls__mode">
          <ModeToggle value={mode} onChange={handleModeChange} />
        </div>

        {/* Поиск и фильтры — скрываем в Study Mode, там не нужны */}
        {mode === 'list' && (
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
            <div className="dict-controls__topic">
              <TopicFilter
                value={topicFilter}
                onChange={setTopicFilter}
                topics={topics}
              />
            </div>
          </div>
        )}

        {/* Study Mode — только TypeFilter и TopicFilter (без поиска) */}
        {mode === 'study' && (
          <div className="dict-controls dict-controls--study">
            <div className="dict-controls__filter">
              <TypeFilter value={typeFilter} onChange={setTypeFilter} />
            </div>
            <div className="dict-controls__topic">
              <TopicFilter
                value={topicFilter}
                onChange={setTopicFilter}
                topics={topics}
              />
            </div>
          </div>
        )}

        {/* Контент */}
        {mode === 'list' ? (

          /* ── List Mode ── */
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

        ) : (

          /* ── Study Mode ── */
          <div className="dict-study">
            {hasResults && currentEntry ? (
              <StudyCard
                entry={currentEntry}
                index={studyIndex}
                total={entries.length}
                isSeen={!!(progress[currentEntry.id] && progress[currentEntry.id].seen)}
                onMarkSeen={markSeen}
                onPrev={handleStudyPrev}
                onNext={handleStudyNext}
              />
            ) : (
              <div className="dict-empty">
                <div className="dict-empty__icon">🃏</div>
                <p className="dict-empty__text">Нет карточек в этой категории</p>
              </div>
            )}
          </div>

        )}

      </div>
    </div>
  );
};

export default DictionaryPage;
