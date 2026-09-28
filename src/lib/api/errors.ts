export class StudioApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code = 'REQUEST_FAILED',
    public readonly requestId?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'StudioApiError';
  }

  get retryable() {
    return this.status === undefined || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}
