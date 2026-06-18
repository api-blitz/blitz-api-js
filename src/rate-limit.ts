/**
 * Client-side token-bucket rate limiter — a single bucket.
 *
 * The client instantiates one of these *per endpoint* (see `BlitzAPI`), so each
 * endpoint is throttled independently and a burst on one never starves another.
 * Each bucket throttles outgoing requests *before* they are sent; the server-side
 * 429 retry path is the backstop for bursts across processes.
 *
 * The clock and sleep functions are injectable so tests can drive them with a
 * fake clock.
 */

/** Monotonic clock, in seconds. */
export type NowFn = () => number;

/** Async sleep for a number of seconds. */
export type SleepFn = (seconds: number) => Promise<void>;

export const defaultNow: NowFn = () => performance.now() / 1000;

export const defaultSleep: SleepFn = (seconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });

export interface RateLimiterOptions {
  now?: NowFn;
  sleep?: SleepFn;
}

export class RateLimiter {
  /** Requests per second, or `null` to disable throttling. */
  readonly rps: number | null;

  #capacity: number;
  #tokens: number;
  #updated: number;
  readonly #now: NowFn;
  readonly #sleep: SleepFn;

  constructor(rps: number | null, options: RateLimiterOptions = {}) {
    this.rps = rps;
    this.#capacity = rps ? Math.max(rps, 1) : 0;
    this.#tokens = this.#capacity;
    this.#now = options.now ?? defaultNow;
    this.#updated = this.#now();
    this.#sleep = options.sleep ?? defaultSleep;
  }

  /** Suspend until a request token is available. */
  async acquire(): Promise<void> {
    const rps = this.rps;
    if (!rps) return;
    for (;;) {
      const now = this.#now();
      this.#tokens = Math.min(this.#capacity, this.#tokens + (now - this.#updated) * rps);
      this.#updated = now;
      if (this.#tokens >= 1) {
        this.#tokens -= 1;
        return;
      }
      const wait = (1 - this.#tokens) / rps;
      await this.#sleep(wait);
    }
  }
}
