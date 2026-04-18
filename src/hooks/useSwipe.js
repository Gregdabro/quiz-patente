import { useCallback, useRef } from 'react';

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
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchEndRef.current = null; // сброс
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current) return;

    const distanceX = touchStartRef.current.x - touchEndRef.current.x;
    const distanceY = touchStartRef.current.y - touchEndRef.current.y;
    const isLeftSwipe = distanceX > threshold;
    const isRightSwipe = distanceX < -threshold;

    // Проверяем, что свайп преимущественно горизонтальный (DX > DY)
    if (Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}
