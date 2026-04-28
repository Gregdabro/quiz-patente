/**
 * StageNav.jsx
 * Горизонтальный индикатор прогресса трёх стадий Staged Immersion Mode.
 *
 * Props:
 *   stages {Array<{ id: string, label: string, status: 'done'|'active'|'pending' }>}
 *
 * Визуал:
 *   [✓ Слова] ──────── [● Фразы] ──────── [○ Квиз]
 *
 * Иконки статусов:
 *   pending → ○  (пустой круг)
 *   active  → ●  (закрашенный круг)
 *   done    → ✓  (галочка)
 *
 * iOS 12: нет gap. Коннекторы — flex: 1 span между элементами.
 * React.memo: компонент не перерисовывается без изменения stages.
 */

import React from 'react';

// Символы статусов через Unicode code points (безопасно во всех браузерах)
var STATUS_ICON = {
  pending: String.fromCodePoint(0x25CB), // ○
  active:  String.fromCodePoint(0x25CF), // ●
  done:    String.fromCodePoint(0x2713), // ✓
};

var StageNav = React.memo(function StageNav(props) {
  var stages = Array.isArray(props.stages) ? props.stages : [];

  return (
    <nav className="stage-nav" aria-label="Прогресс стадий">
      {stages.map(function (stage, idx) {
        return (
          <React.Fragment key={stage.id}>
            {/* Элемент стадии */}
            <div
              className={
                'stage-nav__item stage-nav__item--' + stage.status
              }
              aria-current={stage.status === 'active' ? 'step' : undefined}
            >
              <span className="stage-nav__icon" aria-hidden="true">
                {STATUS_ICON[stage.status] || STATUS_ICON.pending}
              </span>
              <span className="stage-nav__label">{stage.label}</span>
            </div>

            {/* Коннектор между элементами (не после последнего) */}
            {idx < stages.length - 1 && (
              <span className="stage-nav__connector" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
});

StageNav.displayName = 'StageNav';

export default StageNav;
