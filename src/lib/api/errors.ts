export class StudioApiError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); this.name = 'StudioApiError'; }
}
