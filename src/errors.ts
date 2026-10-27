/**
 * Exception hierarchy raised by the Blitz API SDK.
 *
 *   BlitzError
 *   ├── APIConnectionError          // request never completed (network / timeout)
 *   │   └── APITimeoutError
 *   ├── APIResponseValidationError  // a 2xx body was not valid JSON / not the expected shape
 *   └── APIStatusError              // a non-2xx HTTP response was received
 *       ├── AuthenticationError  // 401 (missing/invalid key, or no access to the route)
 *       ├── InsufficientRecordsError  // 402
 *       ├── NotFoundError        // 404
 *       ├── RateLimitError       // 429 (after retries are exhausted)
 *       └── ServerError          // 5xx (after retries are exhausted)
 *
 * Any other status is a plain `APIStatusError` (check `status_code`), never retried:
 * `422` is an invalid request body (`message` sums up the first three problems,
 * `body.errors` lists up to 20 `{ field, message }`), `423` a locked account
 * (`body` is `{ blocked: true, message }`; contact support).
 *
 * Catch `BlitzError` to handle anything this SDK raises.
 */

import { FairUsage } from "./types/shared.js";

/** Base class for every error raised by this SDK. */
export class BlitzError extends Error {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(message, options);
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

export interface APIResponseValidationErrorOptions {
  response: Response;
  /** The underlying parse/validation error (a `SyntaxError` or Zod error). */
  cause?: unknown;
}

/**
 * A 2xx response body could not be parsed into the expected model.
 *
 * Raised when the server returns success but the body is not valid JSON (e.g. an
 * HTML error page from a proxy, or an empty body) or does not match the response
 * schema. This keeps a successful-status surprise inside the {@link BlitzError}
 * hierarchy instead of leaking a raw `SyntaxError`/Zod error; the original error
 * is preserved on `.cause`.
 *
 * - `status_code`: the HTTP status code of the response (a 2xx).
 * - `request_id`: the value of the `x-request-id` response header, if any.
 * - `response`: the underlying `Response`.
 */
export class APIResponseValidationError extends BlitzError {
  readonly response: Response;
  readonly status_code: number;
  readonly request_id: string | null;

  constructor(message: string, options: APIResponseValidationErrorOptions) {
    super(message, { cause: options.cause });
    this.response = options.response;
    this.status_code = options.response.status;
    this.request_id = options.response.headers.get("x-request-id");
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
 * - `fair_usage`: the body's {@link FairUsage} block when the API sent one (it does
 *   on `402`), else `null`.
 * - `response`: the underlying `Response`.
 */
export class APIStatusError extends BlitzError {
  readonly response: Response;
  readonly status_code: number;
  readonly body: unknown;
  readonly request_id: string | null;
  readonly fair_usage: FairUsage | null;

  constructor(message: string, options: APIStatusErrorOptions) {
    super(message);
    this.response = options.response;
    this.status_code = options.response.status;
    this.body = options.body ?? null;
    this.request_id = options.response.headers.get("x-request-id");
    this.fair_usage = parse_fair_usage(this.body);
  }
}

// Never throws: a malformed block yields `null` rather than masking the API error.
function parse_fair_usage(body: unknown): FairUsage | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
  const parsed = FairUsage.safeParse((body as Record<string, unknown>).fair_usage);
  return parsed.success ? parsed.data : null;
}

/**
 * 401 — the API key is missing or invalid, or it is valid but its plan does not include
 * the endpoint called (`message`: "You do not have access to this route"). Read
 * `message`, or `account.key_info().allowed_apis`, before concluding the key is bad.
 */
export class AuthenticationError extends APIStatusError {}

/**
 * 402 — the key is valid but the plan's Fair Use record limit is reached.
 *
 * Named for the resource that ran out, matching `blitz-api-py` and the `records_used` /
 * `records_remaining` vocabulary the rest of the API already uses. `fair_usage.next_reset_at`
 * says when the balance resets.
 */
export class InsufficientRecordsError extends APIStatusError {}

/**
 * @deprecated Renamed to {@link InsufficientRecordsError} in 3.0.0, to settle the one
 * error name that differed between this SDK and `blitz-api-py`. An alias for the same
 * class (not a subclass), so `instanceof` keeps working unchanged. Scheduled for removal
 * in 4.0.0 — note `error.name` is already `"InsufficientRecordsError"`, so a check
 * against the string `"FairUsageLimitError"` is broken now, not in 4.0.0.
 */
export const FairUsageLimitError = InsufficientRecordsError;
/** @deprecated Renamed to {@link InsufficientRecordsError}. */
export type FairUsageLimitError = InsufficientRecordsError;

/**
 * 404 — an unknown path, or `account.key_info()` found no billing account for the key
 * ("Customer not found"). An unknown key gets a `401`, not a `404`.
 */
export class NotFoundError extends APIStatusError {}

/** 429 — too many requests (raised only after retries are exhausted). */
export class RateLimitError extends APIStatusError {}

/** 5xx — the API failed (raised only after retries are exhausted). */
export class ServerError extends APIStatusError {}
