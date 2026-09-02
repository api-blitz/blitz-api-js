/**
 * Typed TypeScript SDK for the Blitz API.
 *
 * ```ts
 * import { BlitzAPI } from "blitz-api-js";
 *
 * const client = new BlitzAPI(); // reads BLITZ_API_KEY
 * const result = await client.enrichment.email({
 *   person_linkedin_url: "https://www.linkedin.com/in/example",
 * });
 * console.log(result.found, result.email);
 * ```
 *
 * See https://docs.blitz-api.ai for the full API reference.
 */

export { BlitzAPI, type BlitzAPIOptions } from "./client.js";
export {
  APIConnectionError,
  APIResponseValidationError,
  type APIResponseValidationErrorOptions,
  APIStatusError,
  type APIStatusErrorOptions,
  APITimeoutError,
  AuthenticationError,
  BlitzError,
  FairUsageLimitError,
  InsufficientCreditsError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";
export { CursorPage, OffsetPage, Page, PagePromise } from "./pagination.js";
export * from "./types/index.js";
export { VERSION } from "./version.js";
