import { MouseEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react';

/** Shared interaction model for a horizontally scrollable navigation track. */
export function useHorizontalScrollNavigation(activeElement: HTMLElement | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseDown = useRef(false);
  const startX = useRef(0);
  const initialScrollLeft = useRef(0);
  const moved = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const updateBounds = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    setCanScrollLeft(element.scrollLeft > 6);
    setCanScrollRight(element.scrollLeft < maxScroll - 6);
    setScrollProgress(maxScroll > 0 ? Math.min(100, Math.max(0, (element.scrollLeft / maxScroll) * 100)) : 0);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    updateBounds();
    element.addEventListener('scroll', updateBounds, { passive: true });
    const observer = new ResizeObserver(updateBounds);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', updateBounds); observer.disconnect(); };
  }, [updateBounds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!activeElement || !container) return;
    const containerRect = container.getBoundingClientRect();
    const itemRect = activeElement.getBoundingClientRect();
    container.scrollTo({ left: itemRect.left - containerRect.left + container.scrollLeft - containerRect.width / 2 + itemRect.width / 2, behavior: 'smooth' });
  }, [activeElement]);

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    containerRef.current?.scrollBy({ left: direction === 'left' ? -260 : 260, behavior: 'smooth' });
  }, []);

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const element = containerRef.current;
    if (element && Math.abs(event.deltaY) > Math.abs(event.deltaX) && element.scrollWidth > element.clientWidth) element.scrollLeft += event.deltaY;
  }, []);

  const onMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const element = containerRef.current;
    if (!element) return;
    mouseDown.current = true; startX.current = event.pageX - element.offsetLeft; initialScrollLeft.current = element.scrollLeft; moved.current = false; setIsDragging(false);
  }, []);
  const onMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const element = containerRef.current;
    if (!mouseDown.current || !element) return;
    event.preventDefault();
    const walk = (event.pageX - element.offsetLeft - startX.current) * 1.5;
    if (Math.abs(walk) > 4) { moved.current = true; setIsDragging(true); }
    element.scrollLeft = initialScrollLeft.current - walk;
  }, []);
  const onMouseUpOrLeave = useCallback(() => {
    mouseDown.current = false;
    window.setTimeout(() => { setIsDragging(false); moved.current = false; }, 50);
  }, []);

  return { containerRef, canScrollLeft, canScrollRight, scrollProgress, isDragging, scrollBy, onWheel, onMouseDown, onMouseMove, onMouseUpOrLeave, wasDragged: () => moved.current };
}
