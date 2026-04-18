import React from 'react';
import { ICONS } from '../../assets/icons/index';

/**
 * Универсальный SVG-иконочный компонент.
 *
 * Все иконки — stroke-based (Lucide), viewBox 0 0 24 24.
 * Цвет наследуется от родителя через currentColor.
 *
 * @param {string} name — ключ из каталога ICONS
 * @param {number} size — размер в px (по умолчанию 24)
 * @param {string} className — доп. CSS-классы
 * @param {string} color — явный цвет (переопределяет currentColor)
 * @param {number} strokeWidth — толщина штриха (по умолчанию 2)
 */
const Icon = React.memo(function Icon({
  name,
  size = 24,
  className = '',
  color,
  strokeWidth = 2,
  ...props
}) {
  var pathData = ICONS[name];

  if (!pathData) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Icon] "' + name + '" not found in catalog');
    }
    return null;
  }

  return (
    <svg
      className={'icon ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* dangerouslySetInnerHTML безопасен: данные из нашего каталога icons/index.js */}
      <g dangerouslySetInnerHTML={{ __html: pathData }} />
    </svg>
  );
});

Icon.displayName = 'Icon';

export default Icon;
