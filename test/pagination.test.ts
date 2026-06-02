/** Auto-pagination: cursor (people/companies) and offset (employee_finder). */

import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import {
  APIConnectionError,
  AuthenticationError,
  BlitzAPI,
  BlitzError,
  RateLimitError,
  ServerError,
} from "../src/index.js";
import { server } from "./helpers/server.js";

const BASE = "https://api.blitz-api.ai";

function client(): BlitzAPI {
  return new BlitzAPI({ api_key: "test-key", rate_limit_rps: null });
}

/** No-retry client so a single 5xx/429/network response surfaces deterministically. */
function client0(): BlitzAPI {
  return new BlitzAPI({ api_key: "test-key", rate_limit_rps: null, max_retries: 0 });
}

describe("cursor pagination (search.people)", () => {
  // Page 1 -> cursor "c2"; page 2 -> cursor null (terminate).
  function install(bodies: Array<{ cursor?: string | null }>): void {
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        const body = (await request.json()) as { cursor?: string | null };
        bodies.push(body);
        if (!body.cursor) {
          return HttpResponse.json({
            results: [{ full_name: "P1" }, { full_name: "P2" }],
            cursor: "c2",
            total_results: 3,
          });
        }
        return HttpResponse.json({ results: [{ full_name: "P3" }], cursor: null });
      }),
    );
  }

  it("streams every item across pages and stops on cursor: null", async () => {
    const bodies: Array<{ cursor?: string | null }> = [];
    install(bodies);

    const names: Array<string | null | undefined> = [];
    for await (const person of client().search.people({ max_results: 2 })) {
      names.push(person.full_name);
    }

    expect(names).toEqual(["P1", "P2", "P3"]);
    expect(bodies).toHaveLength(2); // no request past the null-cursor page
    expect(bodies[0]).not.toHaveProperty("cursor"); // first call sends no cursor
    expect(bodies[1]?.cursor).toBe("c2"); // second call sends the returned cursor
  });

  it("supports manual page control", async () => {
    install([]);

    const page1 = await client().search.people({ max_results: 2 });
    expect(page1.data.map((p) => p.full_name)).toEqual(["P1", "P2"]);
    expect(page1.response.total_results).toBe(3);
    expect(page1.has_next_page()).toBe(true);

    const page2 = await page1.get_next_page();
    expect(page2.data.map((p) => p.full_name)).toEqual(["P3"]);
    expect(page2.has_next_page()).toBe(false);

    await expect(page2.get_next_page()).rejects.toBeInstanceOf(BlitzError);
  });

  it("iter_pages yields each raw page", async () => {
    install([]);
    const sizes: number[] = [];
    const first = await client().search.people({ max_results: 2 });
    for await (const page of first.iter_pages()) {
      sizes.push(page.data.length);
    }
    expect(sizes).toEqual([2, 1]);
  });

  it("throws BlitzError when the cursor does not advance (no infinite loop)", async () => {
    // The server keeps handing back the same non-null cursor it was given.
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, () => {
        calls += 1;
        return HttpResponse.json({ results: [{ full_name: `P${calls}` }], cursor: "stuck" });
      }),
    );

    const run = async (): Promise<void> => {
      for await (const _person of client().search.people({ max_results: 1 })) {
        // drain
      }
    };

    await expect(run()).rejects.toBeInstanceOf(BlitzError);
    // page 1 (no cursor) + page 2 (cursor "stuck"), then the guard trips — not forever.
    expect(calls).toBe(2);
  });

  it("stops fetching when the consumer breaks out early", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, () => {
        calls += 1;
        return HttpResponse.json({
          results: [{ full_name: "P1" }, { full_name: "P2" }],
          cursor: "next", // a next page exists, but the consumer bails first
        });
      }),
    );

    const seen: Array<string | null | undefined> = [];
    for await (const person of client().search.people({ max_results: 2 })) {
      seen.push(person.full_name);
      break;
    }

    expect(seen).toEqual(["P1"]);
    expect(calls).toBe(1); // breaking out must not fetch the next page
  });

  it("makes a single request when the first response cursor is null", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, () => {
        calls += 1;
        return HttpResponse.json({ results: [{ full_name: "Only" }], cursor: null });
      }),
    );

    const names: Array<string | null | undefined> = [];
    for await (const person of client().search.people()) {
      names.push(person.full_name);
    }

    expect(names).toEqual(["Only"]);
    expect(calls).toBe(1);
  });

  it("sends an explicit starting cursor on the first request", async () => {
    const bodies: Array<{ cursor?: string | null }> = [];
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        bodies.push((await request.json()) as { cursor?: string | null });
        return HttpResponse.json({ results: [], cursor: null });
      }),
    );

    await client().search.people({ cursor: "start-here" });
    expect(bodies[0]?.cursor).toBe("start-here");
  });
});

describe("cursor pagination (search.companies)", () => {
  it("streams every company across pages and stops on cursor: null", async () => {
    const bodies: Array<{ cursor?: string | null }> = [];
    server.use(
      http.post(`${BASE}/v2/search/companies`, async ({ request }) => {
        const body = (await request.json()) as { cursor?: string | null };
        bodies.push(body);
        if (!body.cursor) {
          return HttpResponse.json({ results: [{ name: "C1" }], cursor: "cc2" });
        }
        return HttpResponse.json({ results: [{ name: "C2" }], cursor: null });
      }),
    );

    const names: Array<string | null | undefined> = [];
    for await (const company of client().search.companies({ max_results: 1 })) {
      names.push(company.name);
    }

    expect(names).toEqual(["C1", "C2"]);
    expect(bodies).toHaveLength(2); // stops after the null-cursor page
    expect(bodies[0]).not.toHaveProperty("cursor"); // first call sends no cursor
    expect(bodies[1]?.cursor).toBe("cc2"); // second call sends the returned cursor
  });
});

describe("offset pagination (search.employee_finder)", () => {
  function install(bodies: Array<{ page?: number }>): void {
    server.use(
      http.post(`${BASE}/v2/search/employee-finder`, async ({ request }) => {
        const body = (await request.json()) as { page?: number };
        bodies.push(body);
        if ((body.page ?? 1) === 1) {
          return HttpResponse.json({
            page: 1,
            total_pages: 2,
            results: [{ first_name: "E1" }, { first_name: "E2" }],
          });
        }
        return HttpResponse.json({ page: 2, total_pages: 2, results: [{ first_name: "E3" }] });
      }),
    );
  }

  it("walks pages until page >= total_pages", async () => {
    const bodies: Array<{ page?: number }> = [];
    install(bodies);

    const names: Array<string | null | undefined> = [];
    for await (const employee of client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      max_results: 2,
    })) {
      names.push(employee.first_name);
    }

    expect(names).toEqual(["E1", "E2", "E3"]);
    expect(bodies.map((b) => b.page)).toEqual([1, 2]); // 1-based, increments
  });

  it("stops at the last page and rejects get_next_page past the end", async () => {
    install([]);
    const page1 = await client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      max_results: 2,
    });
    expect(page1.has_next_page()).toBe(true);
    const page2 = await page1.get_next_page();
    expect(page2.has_next_page()).toBe(false);
    await expect(page2.get_next_page()).rejects.toBeInstanceOf(BlitzError);
  });

  it("iter_pages yields each raw page", async () => {
    install([]);
    const sizes: number[] = [];
    const first = await client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      max_results: 2,
    });
    for await (const page of first.iter_pages()) {
      sizes.push(page.data.length);
    }
    expect(sizes).toEqual([2, 1]);
  });

  it("starts at an explicit page when one is supplied", async () => {
    const bodies: Array<{ page?: number }> = [];
    server.use(
      http.post(`${BASE}/v2/search/employee-finder`, async ({ request }) => {
        bodies.push((await request.json()) as { page?: number });
        return HttpResponse.json({ page: 2, total_pages: 2, results: [{ first_name: "E3" }] });
      }),
    );

    const page = await client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      page: 2,
    });
    expect(bodies[0]?.page).toBe(2); // first request uses the supplied page
    expect(page.has_next_page()).toBe(false); // page 2 of 2 — no further pages
  });
});

describe("error propagation through PagePromise", () => {
  function install401(): void {
    server.use(
      http.post(`${BASE}/v2/search/people`, () =>
        HttpResponse.json({ message: "invalid key" }, { status: 401 }),
      ),
    );
  }

  it("rejects on await (first page)", async () => {
    install401();
    await expect(client().search.people()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects on for await", async () => {
    install401();
    const run = async (): Promise<void> => {
      for await (const _person of client().search.people()) {
        // never reached
      }
    };
    await expect(run()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects on .catch()", async () => {
    install401();
    const err = await client()
      .search.people()
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe("max_items cap", () => {
  // An endless cursor feed: page N returns two items and always a fresh next cursor,
  // so only `max_items` (or a `break`) can stop the stream.
  function installEndlessPeople(state: { calls: number }, bodies: unknown[] = []): void {
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        bodies.push(await request.json());
        state.calls += 1;
        const n = state.calls;
        return HttpResponse.json({
          results: [{ full_name: `P${n * 2 - 1}` }, { full_name: `P${n * 2}` }],
          cursor: `c${n}`, // a next page always exists
        });
      }),
    );
  }

  // A finite cursor feed: P1,P2 (cursor c2) then P3 (cursor null).
  function installFinitePeople(): void {
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        const body = (await request.json()) as { cursor?: string | null };
        if (!body.cursor) {
          return HttpResponse.json({
            results: [{ full_name: "P1" }, { full_name: "P2" }],
            cursor: "c2",
          });
        }
        return HttpResponse.json({ results: [{ full_name: "P3" }], cursor: null });
      }),
    );
  }

  it("caps total items across pages and stops fetching", async () => {
    const state = { calls: 0 };
    installEndlessPeople(state);

    const names: Array<string | null | undefined> = [];
    for await (const p of client().search.people({ max_results: 2, max_items: 3 })) {
      names.push(p.full_name);
    }

    expect(names).toEqual(["P1", "P2", "P3"]);
    expect(state.calls).toBe(2); // page 1 (2 items) + page 2 (1 more), then the cap halts fetching
  });

  it("never sends max_items on the wire", async () => {
    const state = { calls: 0 };
    const bodies: Array<Record<string, unknown>> = [];
    installEndlessPeople(state, bodies);

    for await (const _p of client().search.people({ max_results: 2, max_items: 1 })) {
      // first item only
    }

    expect(state.calls).toBe(1);
    expect(bodies[0]).not.toHaveProperty("max_items");
    expect(bodies[0]).toHaveProperty("max_results", 2);
  });

  it("is a no-op when larger than the result set", async () => {
    installFinitePeople();
    const names: Array<string | null | undefined> = [];
    for await (const p of client().search.people({ max_results: 2, max_items: 100 })) {
      names.push(p.full_name);
    }
    expect(names).toEqual(["P1", "P2", "P3"]);
  });

  it("max_items: 0 yields nothing (the first page is still fetched eagerly)", async () => {
    const state = { calls: 0 };
    installEndlessPeople(state);
    const names: Array<string | null | undefined> = [];
    for await (const p of client().search.people({ max_items: 0 })) {
      names.push(p.full_name);
    }
    expect(names).toEqual([]);
    expect(state.calls).toBe(1); // eager first fetch happens regardless of the cap
  });

  it("collect() returns the capped array", async () => {
    const state = { calls: 0 };
    installEndlessPeople(state);
    const all = await client().search.people({ max_results: 2, max_items: 3 }).collect();
    expect(all.map((p) => p.full_name)).toEqual(["P1", "P2", "P3"]);
    expect(state.calls).toBe(2);
  });

  it("collect() without max_items returns every item", async () => {
    installFinitePeople();
    const all = await client().search.people({ max_results: 2 }).collect();
    expect(all.map((p) => p.full_name)).toEqual(["P1", "P2", "P3"]);
  });

  it("applies to companies (cursor)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/companies`, () => {
        calls += 1;
        return HttpResponse.json({ results: [{ name: `C${calls}` }], cursor: `cc${calls}` });
      }),
    );
    const names: Array<string | null | undefined> = [];
    for await (const c of client().search.companies({ max_items: 1 })) {
      names.push(c.name);
    }
    expect(names).toEqual(["C1"]);
    expect(calls).toBe(1);
  });

  it("applies to employee_finder (offset)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/employee-finder`, async ({ request }) => {
        const body = (await request.json()) as { page?: number };
        calls += 1;
        const page = body.page ?? 1;
        return HttpResponse.json({
          page,
          total_pages: 10, // many pages available; only max_items should stop us
          results: [{ first_name: `E${page * 2 - 1}` }, { first_name: `E${page * 2}` }],
        });
      }),
    );
    const names: Array<string | null | undefined> = [];
    for await (const e of client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      max_results: 2,
      max_items: 3,
    })) {
      names.push(e.first_name);
    }
    expect(names).toEqual(["E1", "E2", "E3"]);
    expect(calls).toBe(2); // page 1 (2) + page 2 (1 more), then cap halts
  });
});

describe("mid-stream failures", () => {
  it("propagates a 500 on page 2 and halts (cursor)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        const body = (await request.json()) as { cursor?: string | null };
        calls += 1;
        if (!body.cursor) {
          return HttpResponse.json({ results: [{ full_name: "P1" }], cursor: "c2" });
        }
        return HttpResponse.json({ message: "boom" }, { status: 500 });
      }),
    );
    const run = async (): Promise<void> => {
      for await (const _p of client0().search.people()) {
        // drain until the page-2 fetch throws
      }
    };
    await expect(run()).rejects.toBeInstanceOf(ServerError);
    expect(calls).toBe(2); // page 1 ok, page 2 fails — no further requests
  });

  it("propagates a 429 on page 2 (cursor)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        const body = (await request.json()) as { cursor?: string | null };
        calls += 1;
        if (!body.cursor) {
          return HttpResponse.json({ results: [{ full_name: "P1" }], cursor: "c2" });
        }
        return HttpResponse.json({ message: "slow down" }, { status: 429 });
      }),
    );
    const run = async (): Promise<void> => {
      for await (const _p of client0().search.people()) {
        // drain
      }
    };
    await expect(run()).rejects.toBeInstanceOf(RateLimitError);
    expect(calls).toBe(2);
  });

  it("propagates a network error on page 2 and halts (offset)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/employee-finder`, async ({ request }) => {
        const body = (await request.json()) as { page?: number };
        calls += 1;
        if ((body.page ?? 1) === 1) {
          return HttpResponse.json({ page: 1, total_pages: 2, results: [{ first_name: "E1" }] });
        }
        return HttpResponse.error(); // network failure on page 2
      }),
    );
    const run = async (): Promise<void> => {
      for await (const _e of client0().search.employee_finder({
        company_linkedin_url: "https://www.linkedin.com/company/openai",
      })) {
        // drain
      }
    };
    await expect(run()).rejects.toBeInstanceOf(APIConnectionError);
    expect(calls).toBe(2);
  });
});

describe("pagination edge cases", () => {
  it("yields nothing for an empty page and continues to the next (cursor)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        const body = (await request.json()) as { cursor?: string | null };
        calls += 1;
        if (!body.cursor) {
          return HttpResponse.json({ results: [], cursor: "c2" }); // empty, but a next page exists
        }
        return HttpResponse.json({ results: [{ full_name: "P1" }], cursor: null });
      }),
    );
    const names: Array<string | null | undefined> = [];
    for await (const p of client().search.people()) {
      names.push(p.full_name);
    }
    expect(names).toEqual(["P1"]);
    expect(calls).toBe(2);
  });

  it("treats an absent cursor field as no next page (cursor)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, () => {
        calls += 1;
        return HttpResponse.json({ results: [{ full_name: "Solo" }] }); // no cursor key at all
      }),
    );
    const names: Array<string | null | undefined> = [];
    for await (const p of client().search.people()) {
      names.push(p.full_name);
    }
    expect(names).toEqual(["Solo"]);
    expect(calls).toBe(1);
  });

  it("treats an absent total_pages as a single page (offset)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/employee-finder`, () => {
        calls += 1;
        return HttpResponse.json({ page: 1, results: [{ first_name: "E1" }] }); // no total_pages
      }),
    );
    const names: Array<string | null | undefined> = [];
    for await (const e of client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
    })) {
      names.push(e.first_name);
    }
    expect(names).toEqual(["E1"]);
    expect(calls).toBe(1);
  });

  it("treats total_pages: 0 as a single page (offset)", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/employee-finder`, () => {
        calls += 1;
        return HttpResponse.json({ page: 1, total_pages: 0, results: [{ first_name: "E1" }] });
      }),
    );
    const names: Array<string | null | undefined> = [];
    for await (const e of client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
    })) {
      names.push(e.first_name);
    }
    expect(names).toEqual(["E1"]);
    expect(calls).toBe(1);
  });
});
