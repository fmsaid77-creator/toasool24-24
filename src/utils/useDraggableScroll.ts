import { useRef, useState, useCallback, useEffect } from 'react';

export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !ref.current) return;
      e.preventDefault();
      const x = e.pageX - ref.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      ref.current.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft]
  );

  const onMouseUpOrLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!ref.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      ref.current.scrollLeft += e.deltaY;
    }
  }, []);

  const scrollBy = useCallback((distance: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: distance, behavior: 'smooth' });
    }
  }, []);

  return {
    ref,
    isDragging,
    events: {
      onMouseDown,
      onMouseMove,
      onMouseUp: onMouseUpOrLeave,
      onMouseLeave: onMouseUpOrLeave,
      onWheel,
    },
    scrollBy,
  };
}
