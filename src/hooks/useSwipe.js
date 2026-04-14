import { useState, useCallback } from 'react';

/**
 * Хук для обработки свайп-жестов.
 * Возвращает обработчики событий touch, которые нужно прикрепить к элементу.
 * 
 * @param {Object} options 
 * @param {Function} options.onSwipeLeft — вызывается при свайпе влево (следующий)
 * @param {Function} options.onSwipeRight — вызывается при свайпе вправо (предыдущий)
 * @param {number} options.threshold — порог срабатывания в пикселях (по умолчанию 50)
 */
export default function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null); // сброс
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  }, []);

  const handleTouchMove = useCallback((e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > threshold;
    const isRightSwipe = distanceX < -threshold;

    // Проверяем, что свайп преимущественно горизонтальный (DX > DY)
    // Это предотвращает ложные срабатывания при вертикальной прокрутке
    if (Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, threshold, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}
