import React from 'react';

/**
 * Фильтр по теме для словаря.
 * Загружает список тем через prop (передаётся из DictionaryPage через useTopics).
 *
 * @param {string|null} value    — выбранный topicId или null (все темы)
 * @param {Function}    onChange — fn(topicId | null)
 * @param {Array}       topics   — массив { topic_id, title }
 */
var TopicFilter = React.memo(function TopicFilter({ value, onChange, topics }) {
  return (
    <div className="dict-topic-filter">
      <button
        className={'dict-topic-filter__btn' + (value === null ? ' dict-topic-filter__btn--active' : '')}
        onClick={function () { onChange(null); }}
        type="button"
      >
        Все темы
      </button>
      {(topics || []).map(function (topic) {
        var isActive = String(value) === String(topic.topic_id);
        return (
          <button
            key={topic.topic_id}
            className={'dict-topic-filter__btn' + (isActive ? ' dict-topic-filter__btn--active' : '')}
            onClick={function () { onChange(topic.topic_id); }}
            type="button"
            title={topic.title}
          >
            {topic.topic_id}. {topic.title.length > 22 ? topic.title.slice(0, 22) + '…' : topic.title}
          </button>
        );
      })}
    </div>
  );
});

TopicFilter.displayName = 'TopicFilter';

export default TopicFilter;
