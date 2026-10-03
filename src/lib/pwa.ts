/**
 * Small, framework-independent PWA bootstrap.
 *
 * Hosts can override this before the application bundle loads:
 *   window.__SPEC_KIT_PWA__ = { enabled: false }
 *
 * Keeping the registration here (rather than in a component) makes this
 * module portable to a different React tree or another browser application.
 */
export interface PwaOptions {
  /** Disable registration for an embedded or otherwise non-installable host. */
  enabled?: boolean;
  /** The service-worker URL, relative to the deployed application base. */
  serviceWorkerUrl?: string;
  /** Opt into an immediate reload instead of the default user-facing update notice. */
  reloadOnUpdate?: boolean;
}

export const PWA_UPDATE_AVAILABLE_EVENT = 'speckit:pwa-update-available';

declare global {
  interface Window {
    __SPEC_KIT_PWA__?: PwaOptions;
  }
}

const defaultOptions: Required<PwaOptions> = {
  enabled: true,
  serviceWorkerUrl: 'service-worker.js',
  reloadOnUpdate: false,
};

function resolveServiceWorkerUrl(value: string) {
  const applicationBase = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(value, applicationBase).pathname;
}

let registrationStarted = false;

async function clearDevelopmentPwaState() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations
    .filter((registration) => new URL(registration.scope).origin === window.location.origin)
    .map((registration) => registration.unregister()));
  if (!('caches' in window)) return;
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames
    .filter((name) => name.startsWith('spec-kit-studio-shell-'))
    .map((name) => caches.delete(name)));
}

/** Register the offline shell after the first paint. Safe to call repeatedly. */
export function registerPwa(options: PwaOptions = window.__SPEC_KIT_PWA__ ?? {}) {
  const config = {...defaultOptions, ...options};
  if (!config.enabled || registrationStarted || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  if (import.meta.env.DEV) {
    registrationStarted = true;
    void clearDevelopmentPwaState().catch((error: unknown) => {
      console.warn('Development PWA cleanup failed.', error);
    });
    return;
  }

  const register = () => {
    if (registrationStarted) return;
    registrationStarted = true;
    const existingController = Boolean(navigator.serviceWorker.controller);

    void navigator.serviceWorker.register(resolveServiceWorkerUrl(config.serviceWorkerUrl)).then((registration) => {
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!existingController || refreshed) return;
        if (config.reloadOnUpdate) {
          refreshed = true;
          window.location.reload();
        } else {
          window.dispatchEvent(new Event(PWA_UPDATE_AVAILABLE_EVENT));
        }
      });
      void registration.update();
    }).catch((error: unknown) => {
      // Offline support is progressive: an unavailable worker must not affect
      // the primary application experience.
      console.warn('PWA service worker registration failed.', error);
    });
  };

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', register, {once: true});
  else register();
}
