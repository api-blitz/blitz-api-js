/** Retry / backoff policy. */

import { describe, expect, it } from "vitest";
import {
  APIConnectionError,
  APITimeoutError,
  BlitzAPI,
  RateLimitError,
  ServerError,
} from "../src/index.js";
import * as data from "./data.js";
import {
  bodyReadFailureResponse,
  FakeFetch,
  jsonResponse,
  networkError,
  SleepRecorder,
  timeoutError,
} from "./helpers/clock.js";

function clientWith(
  fetch: typeof globalThis.fetch,
  sleeps: SleepRecorder,
  maxRetries = 2,
): BlitzAPI {
  return new BlitzAPI({
    api_key: "k",
    rate_limit_rps: null,
    max_retries: maxRetries,
    fetch,
    sleep: sleeps.sleep,
  });
}

describe("retry policy", () => {
  it("retries 5xx then succeeds", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([
      jsonResponse({ message: "boom" }, { status: 500 }),
      jsonResponse({ message: "boom" }, { status: 500 }),
      jsonResponse(data.KEY_INFO),
    ]);
    const info = await clientWith(ff.fetch, sleeps).account.key_info();
    expect(info.valid).toBe(true);
    expect(ff.calls).toBe(3);
    expect(sleeps.calls).toHaveLength(2);
  });

  it("exhausts retries on 5xx and raises ServerError", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([
      jsonResponse({ message: "unavailable" }, { status: 503 }),
      jsonResponse({ message: "unavailable" }, { status: 503 }),
      jsonResponse({ message: "unavailable" }, { status: 503 }),
    ]);
    const error = await clientWith(ff.fetch, sleeps)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServerError);
    expect((error as ServerError).status_code).toBe(503);
    expect(ff.calls).toBe(3);
    expect(sleeps.calls).toHaveLength(2);
  });

  it("waits the default 60s on 429 without Retry-After", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([
      jsonResponse({ message: "slow down" }, { status: 429 }),
      jsonResponse({ message: "slow down" }, { status: 429 }),
      jsonResponse({ message: "slow down" }, { status: 429 }),
    ]);
    const error = await clientWith(ff.fetch, sleeps)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(sleeps.calls).toEqual([60, 60]);
  });

  it("respects the Retry-After header on 429", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([
      jsonResponse({}, { status: 429, headers: { "retry-after": "2" } }),
      jsonResponse(data.KEY_INFO),
    ]);
    await clientWith(ff.fetch, sleeps).account.key_info();
    expect(sleeps.calls).toEqual([2]);
  });

  it.each([400, 401, 402, 404])("does not retry client error %i", async (status) => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([jsonResponse({ message: "nope" }, { status })]);
    await clientWith(ff.fetch, sleeps)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(ff.calls).toBe(1);
    expect(sleeps.calls).toEqual([]);
  });

  it("does not retry a timeout (avoids re-billing a possibly-processed request)", async () => {
    const sleeps = new SleepRecorder();
    // A second queued response proves we *could* have retried — but must not.
    const ff = new FakeFetch([timeoutError(), jsonResponse(data.KEY_INFO)]);
    const error = await clientWith(ff.fetch, sleeps)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APITimeoutError);
    expect(ff.calls).toBe(1);
    expect(sleeps.calls).toEqual([]);
  });

  it("retries a pre-response network error, then succeeds", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([networkError(), jsonResponse(data.KEY_INFO)]);
    const info = await clientWith(ff.fetch, sleeps).account.key_info();
    expect(info.valid).toBe(true);
    expect(ff.calls).toBe(2);
    expect(sleeps.calls).toHaveLength(1);
  });

  it("does not retry a failure that happens after the response arrives", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([bodyReadFailureResponse()]);
    const error = await clientWith(ff.fetch, sleeps)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIConnectionError);
    expect(ff.calls).toBe(1);
    expect(sleeps.calls).toEqual([]);
  });

  it("does not retry a read timeout after the request was sent (issue #2 scenario)", async () => {
    const sleeps = new SleepRecorder();
    // Timeout fires while reading the body: the server may already have run the
    // billable POST, so surface APITimeoutError without re-sending it.
    const ff = new FakeFetch([
      bodyReadFailureResponse(timeoutError()),
      jsonResponse(data.KEY_INFO),
    ]);
    const error = await clientWith(ff.fetch, sleeps)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APITimeoutError);
    expect(ff.calls).toBe(1);
    expect(sleeps.calls).toEqual([]);
  });

  it("retries pre-response connection errors then raises APIConnectionError", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([networkError(), networkError(), networkError()]);
    const error = await clientWith(ff.fetch, sleeps)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIConnectionError);
    expect(ff.calls).toBe(3);
  });

  it("max_retries=0 makes a single attempt", async () => {
    const sleeps = new SleepRecorder();
    const ff = new FakeFetch([jsonResponse({ message: "boom" }, { status: 500 })]);
    const error = await clientWith(ff.fetch, sleeps, 0)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServerError);
    expect(ff.calls).toBe(1);
    expect(sleeps.calls).toEqual([]);
  });
});
