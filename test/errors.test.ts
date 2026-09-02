/** Status-code -> exception mapping, error attributes, and client construction. */

import { describe, expect, it } from "vitest";
import { to_jsonable } from "../src/base-client.js";
import {
  APIResponseValidationError,
  APIStatusError,
  AuthenticationError,
  BlitzAPI,
  BlitzError,
  FairUsageLimitError,
  InsufficientCreditsError,
  NotFoundError,
} from "../src/index.js";
import { FakeFetch, jsonResponse, textResponse } from "./helpers/clock.js";

// The 402 body the API actually sends (the `example` on every /v2 402 response).
const FAIR_USE_MESSAGE =
  "Fair Use limit reached. Upgrade your plan at app.blitz-api.ai/billing or contact support to increase your monthly capacity.";

function client(fetch: typeof globalThis.fetch): BlitzAPI {
  return new BlitzAPI({ api_key: "k", rate_limit_rps: null, max_retries: 0, fetch });
}

describe("status errors", () => {
  it.each([
    [401, AuthenticationError],
    [402, FairUsageLimitError],
    [404, NotFoundError],
    [400, APIStatusError],
    [418, APIStatusError],
  ])("maps %i to the right class", async (status, Expected) => {
    const ff = new FakeFetch([jsonResponse({ message: "explain" }, { status })]);
    const error = await client(ff.fetch)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Expected);
    expect(error).toBeInstanceOf(APIStatusError);
    expect(error).toBeInstanceOf(BlitzError);
  });

  it("carries status, body, message, and request id", async () => {
    const ff = new FakeFetch([
      jsonResponse(
        { message: FAIR_USE_MESSAGE },
        { status: 402, headers: { "x-request-id": "req_123" } },
      ),
    ]);
    const error = await client(ff.fetch)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FairUsageLimitError);
    const err = error as FairUsageLimitError;
    expect(err.status_code).toBe(402);
    expect(err.message).toBe(FAIR_USE_MESSAGE);
    expect(err.body).toEqual({ message: FAIR_USE_MESSAGE });
    expect(err.request_id).toBe("req_123");
  });

  it("still matches the deprecated InsufficientCreditsError alias", async () => {
    // The alias must stay the *same class object* — a subclass would silently make
    // `instanceof InsufficientCreditsError` false for the error the client throws.
    expect(InsufficientCreditsError).toBe(FairUsageLimitError);
    const ff = new FakeFetch([jsonResponse({ message: FAIR_USE_MESSAGE }, { status: 402 })]);
    const error = await client(ff.fetch)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InsufficientCreditsError);
  });

  it("falls back to a synthetic message when the body has none", async () => {
    const ff = new FakeFetch([textResponse("upstream exploded", 500)]);
    const error = await client(ff.fetch)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIStatusError);
    const err = error as APIStatusError;
    expect(err.message).toContain("500");
    expect(err.body).toBe("upstream exploded");
  });

  it("wraps a non-JSON 2xx body as APIResponseValidationError", async () => {
    const ff = new FakeFetch([textResponse("<html>not json</html>", 200)]);
    const error = await client(ff.fetch)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIResponseValidationError);
    expect(error).toBeInstanceOf(BlitzError);
    expect(error).not.toBeInstanceOf(SyntaxError);
  });

  it("wraps an empty 2xx body as APIResponseValidationError", async () => {
    const ff = new FakeFetch([textResponse("", 200)]);
    const error = await client(ff.fetch)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIResponseValidationError);
  });

  it("wraps a wrong-shape 2xx body as APIResponseValidationError with details", async () => {
    // Valid JSON, but `42` is not the KeyInfo object shape -> Zod rejects it.
    const ff = new FakeFetch([jsonResponse(42, { headers: { "x-request-id": "req_v" } })]);
    const error = await client(ff.fetch)
      .account.key_info()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIResponseValidationError);
    expect(error).toBeInstanceOf(BlitzError);
    const err = error as APIResponseValidationError;
    expect(err.status_code).toBe(200);
    expect(err.request_id).toBe("req_v");
    expect(err.cause).toBeDefined();
  });
});

describe("client construction", () => {
  it("uses an explicit api key", () => {
    expect(new BlitzAPI({ api_key: "explicit-key" }).api_key).toBe("explicit-key");
  });

  it("falls back to the BLITZ_API_KEY env var", () => {
    const previous = process.env.BLITZ_API_KEY;
    process.env.BLITZ_API_KEY = "env-key";
    try {
      expect(new BlitzAPI().api_key).toBe("env-key");
    } finally {
      if (previous === undefined) delete process.env.BLITZ_API_KEY;
      else process.env.BLITZ_API_KEY = previous;
    }
  });

  it("throws when no api key is available", () => {
    const previous = process.env.BLITZ_API_KEY;
    delete process.env.BLITZ_API_KEY;
    try {
      expect(() => new BlitzAPI()).toThrow(BlitzError);
    } finally {
      if (previous !== undefined) process.env.BLITZ_API_KEY = previous;
    }
  });

  it("namespaces resources and memoizes them", () => {
    const c = new BlitzAPI({ api_key: "k" });
    expect(c.account).toBe(c.account);
    expect(c.search).toBe(c.search);
    expect(c.enrichment).toBe(c.enrichment);
    expect(c.utils).toBe(c.utils);
  });
});

describe("to_jsonable", () => {
  it("drops null and undefined entries", () => {
    expect(to_jsonable({ a: 1, b: null, c: undefined })).toEqual({ a: 1 });
  });

  it("keeps falsy non-null values", () => {
    expect(to_jsonable({ min: 0, items: [], flag: false })).toEqual({
      min: 0,
      items: [],
      flag: false,
    });
  });

  it("recurses into nested structures", () => {
    const payload = {
      company: { industry: { include: ["Software Development"] }, skip: null },
      tiers: [{ include_title: ["CEO"], exclude_title: undefined }],
    };
    expect(to_jsonable(payload)).toEqual({
      company: { industry: { include: ["Software Development"] } },
      tiers: [{ include_title: ["CEO"] }],
    });
  });
});
