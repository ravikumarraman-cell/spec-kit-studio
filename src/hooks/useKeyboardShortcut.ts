import { useEffect } from 'react';

type KeyPredicate = (e: KeyboardEvent) => boolean;

export function useKeyboardShortcut(
  predicateOrKey: string | KeyPredicate,
  callback: (e: KeyboardEvent) => void,
  options: { enabled?: boolean; preventDefault?: boolean } = {}
) {
  const { enabled = true, preventDefault = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      let matches = false;

      if (typeof predicateOrKey === 'function') {
        matches = predicateOrKey(event);
      } else {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifier = isMac ? event.metaKey : event.ctrlKey;

        if (predicateOrKey.toLowerCase() === 'k' && modifier) {
          matches = event.key.toLowerCase() === 'k';
        } else if (predicateOrKey.toLowerCase() === 's' && modifier) {
          matches = event.key.toLowerCase() === 's';
        } else if (event.key.toLowerCase() === predicateOrKey.toLowerCase()) {
          matches = true;
        }
      }

      if (matches) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [predicateOrKey, callback, enabled, preventDefault]);
}
