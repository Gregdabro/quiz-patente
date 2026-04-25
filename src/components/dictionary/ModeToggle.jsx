import React from 'react';

/**
 * Переключатель режима отображения словаря.
 *
 * @param {string}   value    — 'list' | 'study'
 * @param {Function} onChange — fn(mode)
 */
var MODES = [
  { value: 'list',  label: '☰ Список' },
  { value: 'study', label: '🃏 Карточки' },
];

var ModeToggle = React.memo(function ModeToggle({ value, onChange }) {
  return (
    <div className="dict-mode-toggle">
      {MODES.map(function (mode) {
        var isActive = mode.value === value;
        return (
          <button
            key={mode.value}
            className={'dict-mode-toggle__btn' + (isActive ? ' dict-mode-toggle__btn--active' : '')}
            onClick={function () { onChange(mode.value); }}
            type="button"
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
});

ModeToggle.displayName = 'ModeToggle';

export default ModeToggle;
