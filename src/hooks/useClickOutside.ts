import { RefObject, useEffect } from 'react';

/** Invokes a callback when a pointer begins outside every supplied element. */
export function useClickOutside(refs: RefObject<HTMLElement | null>[], onOutside: () => void) {
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (refs.every((ref) => !ref.current?.contains(event.target as Node))) onOutside();
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [refs, onOutside]);
}
