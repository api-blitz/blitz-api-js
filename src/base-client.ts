/**
 * Shared, IO-free request-pipeline logic for the client.
 *
 * The network call lives in `./client.ts`; everything here is pure so it is
 * trivially unit-testable: header building, retry decisions, backoff
 * computation, error mapping, and response parsing.
 */

import type * as z from "zod";
import * as C from "./constants.js";
import {
  APIStatusError,
  type APIStatusErrorOptions,
  AuthenticationError,
  BlitzError,
  InsufficientCreditsError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";

/**
 * Recursively prepare a request payload for JSON serialization: drop
 * `null`/`undefined` object entries (so unset optional fields are omitted) and
 * recurse into arrays and nested objects. Scalars pass through unchanged.
 */
export function to_jsonable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(to_jsonable);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === null || val === undefined) continue;
      out[key] = to_jsonable(val);
    }
    return out;
  }
  return value;
}

export function build_url(baseUrl: string, path: string): string {
  return new URL(path.replace(/^\/+/, ""), baseUrl).toString();
}

export function build_headers(apiKey: string): Record<string, string> {
  return {
    [C.API_KEY_HEADER]: apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": C.USER_AGENT,
  };
}

/** Only 429 and 5xx are retried; 401/402/404 fail fast (no wasted credits/time). */
export function should_retry(statusCode: number): boolean {
  return statusCode === 429 || statusCode >= 500;
}

/** Exponential backoff with full jitter (attempt starts at 1). */
export function backoff_seconds(attempt: number): number {
  const base = Math.min(8, 0.5 * 2 ** (attempt - 1));
  return base + Math.random() * 0.5;
}

export function retry_delay(response: Response, attempt: number): number {
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds)) return seconds;
    }
    return C.DEFAULT_RETRY_AFTER_SECONDS;
  }
  return backoff_seconds(attempt);
}

type StatusErrorCtor = new (message: string, options: APIStatusErrorOptions) => APIStatusError;

// Status code -> exception class. Anything else non-2xx falls back to a generic
// APIStatusError (or ServerError for any 5xx).
const STATUS_ERRORS: Record<number, StatusErrorCtor> = {
  401: AuthenticationError,
  402: InsufficientCreditsError,
  404: NotFoundError,
  429: RateLimitError,
};

/**
 * Lenient body reader for the *error* path: returns the parsed JSON when the
 * body is JSON, the raw string when it is not, and `""` when it is empty — an
 * unparseable error body should never mask the underlying status error.
 */
function parse_body(text: string): unknown {
  if (!text) return "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Strict body parser for the *success* path. A 2xx with an empty or non-JSON
 * body is a protocol violation we can't model, so surface it as a
 * {@link BlitzError} rather than letting a raw `SyntaxError` escape the client.
 */
export function parse_json_body(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new BlitzError("Could not parse the API response body as JSON.");
  }
}

export function make_status_error(response: Response, bodyText: string): APIStatusError {
  const body = parse_body(bodyText);
  let message: string | undefined;
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    const raw = record.message || record.error;
    if (typeof raw === "string") message = raw;
  }
  if (message === undefined) {
    message = `HTTP ${response.status} from ${response.url}`;
  }

  const ErrorClass =
    STATUS_ERRORS[response.status] ?? (response.status >= 500 ? ServerError : APIStatusError);
  return new ErrorClass(message, { response, body });
}

export function parse_model<S extends z.ZodType>(data: unknown, schema: S): z.infer<S> {
  return schema.parse(data);
}
