import React, { useState, useEffect, useRef } from 'react';

/**
 * Обертка для плавной CSS-анимации смены вопросов (slide-and-fade).
 * Рендерит старый и новый элементы одновременно для плавного эффекта.
 */
const SlideTransition = ({ contentKey, children, direction = 'forward' }) => {
  const [exiting, setExiting] = useState(null);
  const prevKey = useRef(contentKey);
  const prevChildren = useRef(children);

  // Когда меняется ключ вопроса, мы сохраняем старый компонент для анимации "вылета"
  if (contentKey !== prevKey.current) {
    setExiting({
      key: prevKey.current,
      element: prevChildren.current,
      direction
    });
    prevKey.current = contentKey;
  }

  // Всегда сохраняем свежий children синхронно, чтобы UI обновлялся без задержек.
  // Это полностью устраняет эффект "input lag" (300ms defer), 
  // который был в старой реализации с useEffect.
  prevChildren.current = children;

  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(() => {
        setExiting(null);
      }, 150); // Должно совпадать с длительностью анимации в CSS
      return () => clearTimeout(timer);
    }
  }, [exiting]);

  return (
    <div className="slide-transition-wrapper">
      {exiting && (
        <div key={`exit-${exiting.key}`} className={`slide-transition-card exit-${exiting.direction}`}>
          {exiting.element}
        </div>
      )}
      <div key={`enter-${contentKey}`} className={`slide-transition-card ${exiting ? `enter-${direction}` : 'active'}`}>
        {children}
      </div>
    </div>
  );
};

export default SlideTransition;
