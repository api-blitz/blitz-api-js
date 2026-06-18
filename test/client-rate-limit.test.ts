/** The client throttles each endpoint independently, not with one global bucket. */

import { describe, expect, it } from "vitest";
import { BlitzAPI } from "../src/index.js";
import * as data from "./data.js";
import { FakeClock, FakeFetch, jsonResponse } from "./helpers/clock.js";

function clientWith(fetch: typeof globalThis.fetch, clock: FakeClock): BlitzAPI {
  return new BlitzAPI({
    api_key: "k",
    rate_limit_rps: 5,
    fetch,
    now: clock.monotonic,
    sleep: clock.sleep,
  });
}

describe("per-endpoint rate limiting", () => {
  it("gives each endpoint its own bucket", async () => {
    const clock = new FakeClock();
    // 5 email + 1 phone + 1 more email, in call order.
    const ff = new FakeFetch([
      ...Array.from({ length: 5 }, () => jsonResponse(data.EMAIL_ENRICHMENT)),
      jsonResponse(data.PHONE_ENRICHMENT),
      jsonResponse(data.EMAIL_ENRICHMENT),
    ]);
    const client = clientWith(ff.fetch, clock);
    const url = "https://www.linkedin.com/in/example";

    // The email bucket bursts to capacity (5) without sleeping.
    for (let i = 0; i < 5; i++) await client.enrichment.email({ person_linkedin_url: url });
    expect(clock.slept).toEqual([]);

    // A phone call draws from its own (full) bucket — still no throttling.
    await client.enrichment.phone({ person_linkedin_url: url });
    expect(clock.slept).toEqual([]);

    // The 6th email call waits 1/5 s: the email bucket is empty, and the phone
    // traffic in between did not drain it — proving the buckets are independent.
    await client.enrichment.email({ person_linkedin_url: url });
    expect(clock.slept).toEqual([0.2]);
  });
});
