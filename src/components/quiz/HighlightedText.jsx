/**
 * HighlightedText.jsx
 * Рендерит текст вопроса с подсветкой изученных терминов.
 *
 * Поведение:
 *   - Сегменты без entry → plain span
 *   - Сегменты с entry  → <mark> с жёлтой подсветкой + иконка 💡
 *   - Клик по <mark>    → inline tooltip с термином и определением
 *   - Повторный клик    → закрывает tooltip
 *   - Клик на другой   → открывает новый (предыдущий закрывается — activeId один)
 *
 * Props:
 *   segments {Array<{ text: string, entry: Object|null }>} — из segmentText()
 *
 * Производительность:
 *   - React.memo: не перерисовывается если segments не изменились
 *   - activeId — единственный state, менять только при клике
 *
 * iOS 12 / Chrome 92:
 *   - Без gap: margin-right вместо gap для иконки
 *   - position: absolute для tooltip (без JS-repositioning — достаточно для MVP)
 *   - onClick вместо onMouseEnter (тач-устройство)
 */

import React, { useState } from 'react';

var HighlightedText = React.memo(function HighlightedText(props) {
  var segments = props.segments;
  var [activeId, setActiveId] = useState(null);

  if (!segments || segments.length === 0) return null;

  return (
    React.createElement('span', null,
      segments.map(function (seg, idx) {
        // Plain текст — без разметки
        if (!seg.entry) {
          return React.createElement('span', { key: idx }, seg.text);
        }

        var entry = seg.entry;
        // Уникальный ключ: entryId + позиция (один термин может встретиться дважды)
        var segKey = entry.id + '_' + idx;
        var isActive = activeId === segKey;

        // Определение для tooltip: definition.ru > term_ru
        var definition = (entry.definition && entry.definition.ru)
          ? entry.definition.ru
          : entry.term_ru;

        return React.createElement(
          'span',
          {
            key: idx,
            className: 'hl-word-wrapper',
          },
          React.createElement(
            'mark',
            {
              className: 'hl-word' + (isActive ? ' hl-word--active' : ''),
              onClick: function (e) {
                e.stopPropagation();
                setActiveId(isActive ? null : segKey);
              },
            },
            seg.text,
            React.createElement('span', { className: 'hl-word__icon' }, '\uD83D\uDCA1')
          ),
          isActive && React.createElement(
            'span',
            { className: 'hl-tooltip', role: 'tooltip' },
            React.createElement('strong', { className: 'hl-tooltip__term' }, entry.term),
            React.createElement('span', { className: 'hl-tooltip__sep' }, ' — '),
            React.createElement('span', { className: 'hl-tooltip__def' }, definition)
          )
        );
      })
    )
  );
});

HighlightedText.displayName = 'HighlightedText';

export default HighlightedText;
