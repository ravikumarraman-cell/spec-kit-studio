import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Classes for the full-screen positioning layer. */
  className?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** Set false for consequential flows that must close only through their UI. */
  closeOnBackdrop?: boolean;
  /** Set false when Escape must not discard or hide active work. */
  closeOnEscape?: boolean;
}

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Shared dialog primitive. It supplies the non-visual behavior every modal
 * needs: focus containment, explicit configurable dismissal, focus restoration,
 * and scroll lock. Defaults deliberately avoid accidental dismissal.
 */
export function Modal({ isOpen, onClose, children, className = '', ariaLabel, ariaLabelledBy, closeOnBackdrop = false, closeOnEscape = false }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const fallbackLabelId = useId();

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    (firstFocusable || dialogRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`studio-modal-overlay fixed inset-0 z-50 flex backdrop-blur-sm ${className}`} onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-labelledby={ariaLabel ? undefined : ariaLabelledBy || fallbackLabelId} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
