import React, { useState, useEffect, useRef } from 'react';

/**
 * Обертка для плавной CSS-анимации смены вопросов (slide-and-fade).
 * Рендерит старый и новый элементы одновременно для плавного эффекта.
 */
const SlideTransition = ({ contentKey, children, direction = 'forward' }) => {
  const [components, setComponents] = useState([
    { key: contentKey, element: children, state: 'active' }
  ]);
  const isTransitioning = useRef(false);

  useEffect(() => {
    setComponents((prev) => {
      const activeIdx = prev.findIndex((c) => c.state === 'active');
      const activeComponent = prev[activeIdx];

      // Если ключ не изменился, ничего не делаем
      if (activeComponent && activeComponent.key === contentKey) {
        return prev;
      }

      isTransitioning.current = true;

      // Возвращаем старый (улетающий) и новый (прилетающий) элементы
      return [
        { ...activeComponent, state: `exit-${direction}` },
        { key: contentKey, element: children, state: `enter-${direction}` }
      ];
    });

    // Очищаем DOM от старого элемента после завершения CSS-анимации
    const timer = setTimeout(() => {
      setComponents([{ key: contentKey, element: children, state: 'active' }]);
      isTransitioning.current = false;
    }, 300); // Должно совпадать с длительностью анимации в CSS

    return () => clearTimeout(timer);
  }, [contentKey, children, direction]);

  return (
    <div className="slide-transition-wrapper">
      {components.map(({ key, element, state }) => (
        <div key={key} className={`slide-transition-card ${state}`}>
          {element}
        </div>
      ))}
    </div>
  );
};

export default SlideTransition;
