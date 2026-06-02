/** Token-bucket rate limiter, driven by a fake clock. */

import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/rate-limit.js";
import { FakeClock } from "./helpers/clock.js";

function limiter(rps: number | null, clock: FakeClock): RateLimiter {
  return new RateLimiter(rps, { now: clock.monotonic, sleep: clock.sleep });
}

describe("rate limiter", () => {
  it("never sleeps when disabled", async () => {
    const clock = new FakeClock();
    const rl = limiter(null, clock);
    for (let i = 0; i < 100; i++) await rl.acquire();
    expect(clock.slept).toEqual([]);
  });

  it("bursts up to capacity immediately", async () => {
    const clock = new FakeClock();
    const rl = limiter(5, clock);
    for (let i = 0; i < 5; i++) await rl.acquire();
    expect(clock.slept).toEqual([]);
  });

  it("waits 1/rps once capacity is exhausted", async () => {
    const clock = new FakeClock();
    const rl = limiter(5, clock);
    for (let i = 0; i < 5; i++) await rl.acquire();
    await rl.acquire(); // 6th — bucket empty, waits 1/5 s for one token
    expect(clock.slept).toEqual([0.2]);
  });

  it("scales the wait with the rate", async () => {
    const clock = new FakeClock();
    const rl = limiter(2, clock);
    for (let i = 0; i < 2; i++) await rl.acquire();
    await rl.acquire();
    expect(clock.slept).toEqual([0.5]);
  });
});
