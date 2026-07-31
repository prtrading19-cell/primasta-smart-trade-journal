export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
