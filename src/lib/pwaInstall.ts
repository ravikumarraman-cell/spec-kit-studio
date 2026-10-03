/**
 * A small adapter around the browser's deferred PWA install prompt.
 *
 * Browsers decide when an app is installable. We keep their event until the
 * user explicitly asks to install from the UI; nothing here opens a prompt on
 * its own.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

function notify() {
  const available = deferredPrompt !== null;
  listeners.forEach((listener) => listener(available));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep this browser-provided prompt for an explicit user action in More.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** Subscribe to whether this browser currently offers PWA installation. */
export function subscribeToPwaInstallAvailability(listener: (available: boolean) => void) {
  listeners.add(listener);
  listener(deferredPrompt !== null);
  return () => {
    listeners.delete(listener);
  };
}

/** Allows a user-action handler to choose the native one-click path synchronously. */
export function isPwaInstallPromptAvailable() {
  return deferredPrompt !== null;
}

/** Opens the native install dialog, but only after a direct user action. */
export async function requestPwaInstall() {
  const installEvent = deferredPrompt;
  if (!installEvent) return false;

  try {
    await installEvent['prompt']();
    const choice = await installEvent.userChoice;
    deferredPrompt = null;
    notify();
    return choice.outcome === 'accepted';
  } catch {
    deferredPrompt = null;
    notify();
    return false;
  }
}
