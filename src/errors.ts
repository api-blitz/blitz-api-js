/**
 * Exception hierarchy raised by the Blitz API SDK.
 *
 *   BlitzError
 *   ├── APIConnectionError        // request never completed (network / timeout)
 *   │   └── APITimeoutError
 *   └── APIStatusError            // a non-2xx HTTP response was received
 *       ├── AuthenticationError       // 401
 *       ├── InsufficientCreditsError  // 402
 *       ├── NotFoundError             // 404
 *       ├── RateLimitError            // 429 (after retries are exhausted)
 *       └── ServerError               // 5xx (after retries are exhausted)
 *
 * Catch `BlitzError` to handle anything this SDK raises.
 */

/** Base class for every error raised by this SDK. */
export class BlitzError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = new.target.name;
    // Keep `instanceof` working across all build targets/bundlers.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The request could not be completed (connection error, DNS, etc.). */
export class APIConnectionError extends BlitzError {
  constructor(message = "Connection error.") {
    super(message);
  }
}

/** The request timed out. */
export class APITimeoutError extends APIConnectionError {
  constructor() {
    super("Request timed out.");
  }
}

export interface APIStatusErrorOptions {
  response: Response;
  body?: unknown;
}

/**
 * The API returned a non-success HTTP status code.
 *
 * - `status_code`: the HTTP status code of the response.
 * - `body`: the parsed JSON body, or the raw text if it was not JSON.
 * - `message`: a human-readable message extracted from the body when present.
 * - `request_id`: the value of the `x-request-id` response header, if any.
 * - `response`: the underlying `Response`.
 */
export class APIStatusError extends BlitzError {
  readonly response: Response;
  readonly status_code: number;
  readonly body: unknown;
  readonly request_id: string | null;

  constructor(message: string, options: APIStatusErrorOptions) {
    super(message);
    this.response = options.response;
    this.status_code = options.response.status;
    this.body = options.body ?? null;
    this.request_id = options.response.headers.get("x-request-id");
  }
}

/** 401 — the API key is missing or invalid. */
export class AuthenticationError extends APIStatusError {}

/** 402 — the key is valid but the account is out of credits. */
export class InsufficientCreditsError extends APIStatusError {}

/** 404 — the API key or resource does not exist. */
export class NotFoundError extends APIStatusError {}

/** 429 — too many requests (raised only after retries are exhausted). */
export class RateLimitError extends APIStatusError {}

/** 5xx — the API failed (raised only after retries are exhausted). */
export class ServerError extends APIStatusError {}
