/** Test doubles for the injectable clock, sleep, and fetch. */

/** Records the durations passed to a sleep stand-in (for retry tests). */
export class SleepRecorder {
  calls: number[] = [];
  readonly sleep = async (seconds: number): Promise<void> => {
    this.calls.push(seconds);
  };
}

/** A controllable monotonic clock + sleep, for rate-limiter tests. */
export class FakeClock {
  now = 1000;
  slept: number[] = [];
  readonly monotonic = (): number => this.now;
  readonly sleep = async (seconds: number): Promise<void> => {
    this.slept.push(seconds);
    this.now += seconds;
  };
}

/** A `fetch` stand-in that replays a queue of responses/errors (transport control). */
export class FakeFetch {
  calls = 0;
  #queue: Array<Response | Error>;

  constructor(actions: Array<Response | Error>) {
    this.#queue = [...actions];
  }

  readonly fetch = async (): Promise<Response> => {
    this.calls += 1;
    const action = this.#queue.shift();
    if (action === undefined) throw new Error("FakeFetch: no more queued responses");
    if (action instanceof Error) throw action;
    return action;
  };
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

export function textResponse(text: string, status = 200): Response {
  return new Response(text, { status });
}

/** An error shaped like an `AbortSignal.timeout()` rejection. */
export function timeoutError(): Error {
  const error = new Error("The operation timed out.");
  error.name = "TimeoutError";
  return error;
}

/** An error shaped like a `fetch` network failure. */
export function networkError(message = "fetch failed"): Error {
  return new TypeError(message);
}

/**
 * A `Response` stand-in whose body read rejects — models a transport failure that
 * happens *after* the status/headers arrived. The request reached the server (and
 * may have been billed), so the client must treat it as terminal, not retry it.
 */
export function bodyReadFailureResponse(error: Error = networkError("body read failed")): Response {
  return {
    ok: true,
    status: 200,
    url: "https://api.blitz-api.ai/v2/account/key-info",
    headers: new Headers(),
    text: () => Promise.reject(error),
  } as unknown as Response;
}
