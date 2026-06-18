/** Internal defaults for the Blitz API client. */
import { VERSION } from "./version.js";

/** Production API base URL. */
export const DEFAULT_BASE_URL = "https://api.blitz-api.ai";

/** Environment variable read when `api_key` is not passed explicitly. */
export const API_KEY_ENV_VAR = "BLITZ_API_KEY";

/** Header carrying the API key (Blitz uses `x-api-key`, not `Authorization`). */
export const API_KEY_HEADER = "x-api-key";

/** Default per-request timeout, in seconds. */
export const DEFAULT_TIMEOUT = 30;

/** Number of retries (in addition to the first attempt) for transient failures. */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Default client-side rate limit. The API allows 5 req/s per endpoint on every
 * plan; your per-endpoint value is discoverable via `client.account.key_info()`.
 */
export const DEFAULT_RATE_LIMIT_RPS = 5;

/**
 * Seconds to wait after a 429 when the response has no `Retry-After` header.
 * Matches the behaviour of the official reference client.
 */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

/** Sent as the `User-Agent` header so requests are attributable to this SDK. */
export const USER_AGENT = `blitz-api-js/${VERSION}`;
