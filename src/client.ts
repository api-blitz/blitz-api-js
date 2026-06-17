import type * as z from "zod";
import {
  backoff_seconds,
  build_headers,
  build_url,
  make_status_error,
  parse_success_body,
  retry_delay,
  should_retry,
  to_jsonable,
} from "./base-client.js";
import * as C from "./constants.js";
import { APIConnectionError, APITimeoutError, BlitzError } from "./errors.js";
import { defaultSleep, type NowFn, RateLimiter, type SleepFn } from "./rate-limit.js";
import { AccountResource } from "./resources/account.js";
import { EnrichmentResource } from "./resources/enrichment.js";
import { SearchResource } from "./resources/search.js";
import { UtilsResource } from "./resources/utils.js";
import type { RequestOptions } from "./types/filters.js";

type FetchFn = typeof fetch;

export interface BlitzAPIOptions {
  /** API key. Falls back to the `BLITZ_API_KEY` environment variable. */
  api_key?: string;
  /** API base URL. Defaults to `https://api.blitz-api.ai`. */
  base_url?: string;
  /** Per-request timeout, in seconds. Defaults to 30. */
  timeout?: number;
  /** Retries for transient failures (429/5xx/network). Defaults to 3. */
  max_retries?: number;
  /** Client-side rate limit in req/s. Pass `null` to disable. Defaults to 5. */
  rate_limit_rps?: number | null;
  /** Custom `fetch` implementation (e.g. for tests or a non-global runtime). */
  fetch?: FetchFn;
  /** Sleep used between retries and by the rate limiter (injectable for tests). */
  sleep?: SleepFn;
  /** Monotonic clock used by the rate limiter (injectable for tests). */
  now?: NowFn;
}

/**
 * Client for the Blitz API.
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
export class BlitzAPI {
  readonly api_key: string;
  readonly base_url: string;
  readonly max_retries: number;

  readonly #timeoutMs: number;
  readonly #fetch: FetchFn;
  readonly #sleep: SleepFn;
  readonly #rateLimiter: RateLimiter;

  #account?: AccountResource;
  #search?: SearchResource;
  #enrichment?: EnrichmentResource;
  #utils?: UtilsResource;

  constructor(options: BlitzAPIOptions = {}) {
    const apiKey = options.api_key ?? globalThis.process?.env?.[C.API_KEY_ENV_VAR];
    if (!apiKey) {
      throw new BlitzError(
        `No API key provided. Pass { api_key } or set the ${C.API_KEY_ENV_VAR} environment variable.`,
      );
    }
    this.api_key = apiKey;
    this.base_url = `${(options.base_url ?? C.DEFAULT_BASE_URL).replace(/\/+$/, "")}/`;
    this.max_retries = options.max_retries ?? C.DEFAULT_MAX_RETRIES;
    this.#timeoutMs = (options.timeout ?? C.DEFAULT_TIMEOUT) * 1000;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#sleep = options.sleep ?? defaultSleep;
    const rps =
      options.rate_limit_rps === undefined ? C.DEFAULT_RATE_LIMIT_RPS : options.rate_limit_rps;
    this.#rateLimiter = new RateLimiter(rps, { now: options.now, sleep: options.sleep });
  }

  /** @internal Shared request pipeline used by the resource namespaces. */
  async request<S extends z.ZodType>(
    method: string,
    path: string,
    body: unknown,
    schema: S,
    options?: RequestOptions,
  ): Promise<z.infer<S>> {
    const url = build_url(this.base_url, path);
    const headers = build_headers(this.api_key);
    const jsonBody = body === undefined ? undefined : to_jsonable(body);
    const fetchFn = this.#fetch;
    const timeoutMs = options?.timeout !== undefined ? options.timeout * 1000 : this.#timeoutMs;

    let attempt = 0;
    for (;;) {
      await this.#rateLimiter.acquire();

      let response: Response;
      try {
        response = await fetchFn(url, {
          method,
          headers,
          body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        // A timeout is terminal: with `fetch` we can't tell whether the request
        // already reached the server, and the API bills per request, so we must
        // not re-send a possibly-processed (billable) POST. Only a network error
        // *before* any response arrived (DNS failure, connection refused) is known
        // never to have reached the server, so it stays retryable.
        if (!isTimeout(error) && attempt < this.max_retries) {
          attempt += 1;
          await this.#sleep(backoff_seconds(attempt));
          continue;
        }
        throw isTimeout(error)
          ? new APITimeoutError()
          : new APIConnectionError(errorMessage(error));
      }

      let bodyText: string;
      try {
        bodyText = await response.text();
      } catch (error) {
        // The response already arrived (and the server may have billed for it),
        // so a failure reading the body is terminal — never re-send the request.
        throw isTimeout(error)
          ? new APITimeoutError()
          : new APIConnectionError(errorMessage(error));
      }

      if (response.ok) {
        return parse_success_body(response, bodyText, schema);
      }

      if (should_retry(response.status) && attempt < this.max_retries) {
        attempt += 1;
        await this.#sleep(retry_delay(response, attempt));
        continue;
      }

      throw make_status_error(response, bodyText);
    }
  }

  /** Account: key validity, credits, and rate limit. */
  get account(): AccountResource {
    this.#account ??= new AccountResource(this);
    return this.#account;
  }

  /** Search: people, companies, employee finder, waterfall ICP. */
  get search(): SearchResource {
    this.#search ??= new SearchResource(this);
    return this.#search;
  }

  /** Enrichment: email, phone, and reverse lookups. */
  get enrichment(): EnrichmentResource {
    this.#enrichment ??= new EnrichmentResource(this);
    return this.#enrichment;
  }

  /** Utilities: current date, employment & department distribution. */
  get utils(): UtilsResource {
    this.#utils ??= new UtilsResource(this);
    return this.#utils;
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Connection error.";
}
