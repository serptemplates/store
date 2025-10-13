export class GhlConfigurationError extends Error {
  constructor(message = "GHL configuration error") {
    super(message);
    this.name = "GhlConfigurationError";
  }
}

export class GhlRequestError extends Error {
  constructor(message: string, public status: number, public body: string) {
    super(message);
    this.name = "GhlRequestError";
  }
}

