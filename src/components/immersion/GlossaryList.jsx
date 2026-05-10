/**
 * GlossaryList.jsx
 * Компактный список терминов, не вошедших в карточки Stage 1/2,
 * но встречающихся в 2+ вопросах блока. Показывается на ReadyScreen
 * перед стартом Quiz — пассивное знакомство без активного изучения.
 *
 * Props:
 *   cards {Array} — glossaryCards из getChunkData
 *                   каждый элемент: { term, term_ru, type, _coverage }
 *
 * iOS 12: нет gap в flex — margin-bottom на элементах.
 */

import React, { useState } from 'react';

var GlossaryList = React.memo(function GlossaryList(props) {
  var cards = props.cards;
  var [expanded, setExpanded] = useState(false);

  if (!cards || cards.length === 0) return null;

  // Показываем первые 4 сразу, остальные — по клику «Показать все»
  var PREVIEW_LIMIT = 4;
  var visible = expanded ? cards : cards.slice(0, PREVIEW_LIMIT);
  var hasMore = !expanded && cards.length > PREVIEW_LIMIT;

  return (
    <div className="glossary-list">
      <p className="glossary-list__title">
        {'📋 Ещё встретятся в квизе (' + cards.length + '):'}
      </p>
      <ul className="glossary-list__items">
        {visible.map(function (e) {
          return (
            <li key={e.id} className="glossary-list__item">
              <span className="glossary-list__term">{e.term}</span>
              <span className="glossary-list__sep">{' = '}</span>
              <span className="glossary-list__translation">{e.term_ru}</span>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          className="glossary-list__more-btn"
          onClick={function () { setExpanded(true); }}
        >
          {'Ещё ' + (cards.length - PREVIEW_LIMIT) + ' →'}
        </button>
      )}
    </div>
  );
});

export default GlossaryList;
