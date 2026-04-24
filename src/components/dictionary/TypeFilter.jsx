import React from 'react';

/**
 * Горизонтальный фильтр по типу записей словаря.
 *
 * @param {string}   value    — активный тип: 'all' | 'logic_trigger' | 'term' | 'phrase' | 'concept'
 * @param {Function} onChange — вызывается при смене типа
 */

var FILTERS = [
  { value: 'all',           label: 'Все' },
  { value: 'logic_trigger', label: 'Ловушки 🎯' },
  { value: 'term',          label: 'Термины' },
  { value: 'phrase',        label: 'Фразы' },
  { value: 'concept',       label: 'Концепции' },
];

const TypeFilter = React.memo(function TypeFilter({ value, onChange }) {
  return (
    <div className="dict-type-filter">
      {FILTERS.map(function (filter) {
        var isActive = filter.value === value;
        return (
          <button
            key={filter.value}
            className={'dict-type-filter__btn' + (isActive ? ' dict-type-filter__btn--active' : '')}
            onClick={function () { onChange(filter.value); }}
            type="button"
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
});

TypeFilter.displayName = 'TypeFilter';

export default TypeFilter;
