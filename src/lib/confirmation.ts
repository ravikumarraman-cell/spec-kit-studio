export interface StudioConfirmationRequest {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'caution';
}

type ConfirmationHandler = (request: StudioConfirmationRequest) => Promise<boolean>;
let handler: ConfirmationHandler | undefined;

/** Central asynchronous confirmation API. Unlike window.confirm it is themed,
 * accessible, testable, and never blocks the browser event loop. */
export function confirmStudioAction(request: StudioConfirmationRequest): Promise<boolean> {
  return handler ? handler(request) : Promise.resolve(false);
}

export function registerConfirmationHandler(next: ConfirmationHandler | undefined) { handler = next; }
