import { useEffect, useRef } from 'react';

interface RevealOptions {
  block?: ScrollLogicalPosition;
  focus?: boolean;
}

/**
 * Reveals a newly rendered consequential message and gives it keyboard focus.
 * Use this for errors and validation blockers that may appear outside the
 * current viewport; never use it for passive status updates.
 */
export function useRevealOnChange<T extends HTMLElement>(signal: string | null | undefined, { block = 'center', focus = true }: RevealOptions = {}) {
  const targetRef = useRef<T>(null);

  useEffect(() => {
    if (!signal) return;
    const reveal = window.setTimeout(() => {
      const target = targetRef.current;
      if (!target) return;
      const behavior: ScrollBehavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      target.scrollIntoView({ behavior, block });
      if (focus) target.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(reveal);
  }, [signal, block, focus]);

  return targetRef;
}
