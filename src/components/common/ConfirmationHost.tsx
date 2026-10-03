import { useEffect, useRef, useState } from 'react';
import { registerConfirmationHandler, StudioConfirmationRequest } from '../../lib/confirmation';
import { ConfirmDialog } from './ConfirmDialog';

interface PendingConfirmation { request: StudioConfirmationRequest; resolve: (confirmed: boolean) => void; }

/** Mounted once in App. All screens call the confirmation API and share one
 * theme-aware, focus-safe dialog rather than browser-native prompts. */
export function ConfirmationHost() {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);
  useEffect(() => {
    registerConfirmationHandler((request) => new Promise<boolean>((resolve) => {
      const next = { request, resolve };
      pendingRef.current = next;
      setPending(next);
    }));
    return () => { registerConfirmationHandler(undefined); pendingRef.current?.resolve(false); };
  }, []);
  const settle = (confirmed: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(confirmed);
  };
  if (!pending) return null;
  return <ConfirmDialog isOpen title={pending.request.title} description={pending.request.description} confirmLabel={pending.request.confirmLabel} tone={pending.request.tone} onConfirm={() => settle(true)} onCancel={() => settle(false)} />;
}
