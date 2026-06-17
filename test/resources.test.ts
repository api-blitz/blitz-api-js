/** End-to-end resource tests: correct method/path/body out, typed model back. */

import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import {
  APITimeoutError,
  BlitzAPI,
  CompanyDepartmentDistributionResponse,
  CompanyEnrichmentResponse,
  CurrentDateResponse,
  EmailEnrichmentResponse,
  WaterfallIcpResponse,
} from "../src/index.js";
import * as data from "./data.js";
import { server } from "./helpers/server.js";

const BASE = "https://api.blitz-api.ai";
const TEST_KEY = "test-key";

function client(): BlitzAPI {
  return new BlitzAPI({ api_key: TEST_KEY, rate_limit_rps: null });
}

describe("resources", () => {
  it("account.key_info issues a GET with the api-key header", async () => {
    let method: string | undefined;
    let apiKey: string | null = null;
    let userAgent: string | null = null;
    server.use(
      http.get(`${BASE}/v2/account/key-info`, ({ request }) => {
        method = request.method;
        apiKey = request.headers.get("x-api-key");
        userAgent = request.headers.get("user-agent");
        return HttpResponse.json(data.KEY_INFO);
      }),
    );

    const result = await client().account.key_info();
    expect(result.valid).toBe(true);
    expect(method).toBe("GET");
    expect(apiKey).toBe(TEST_KEY);
    expect(userAgent).toMatch(/^blitz-api-js\//);
  });

  it("enrichment.email posts the person_linkedin_url body", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/enrichment/email`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.EMAIL_ENRICHMENT);
      }),
    );

    const result = await client().enrichment.email({
      person_linkedin_url: "https://www.linkedin.com/in/example",
    });
    expect(result).toBeInstanceOf(Object);
    expect(result.email).toBe("antoine@blitz-agency.com");
    expect(EmailEnrichmentResponse.parse(result)).toEqual(result);
    expect(body).toEqual({ person_linkedin_url: "https://www.linkedin.com/in/example" });
  });

  it("enrichment.company resolves a company profile", async () => {
    server.use(
      http.post(`${BASE}/v2/enrichment/company`, () => HttpResponse.json(data.COMPANY_ENRICHMENT)),
    );
    const result = await client().enrichment.company({
      company_linkedin_url: "https://www.linkedin.com/company/google",
    });
    expect(CompanyEnrichmentResponse.parse(result)).toBeTruthy();
    expect(result.company?.name).toBe("Google");
  });

  it("search.people sends values and drops undefined params", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.PEOPLE_SEARCH);
      }),
    );

    const page = await client().search.people({
      company: { industry: { include: ["Software Development"] } },
      people: { job_level: ["VP"], job_title: { include: ["Engineer"] } },
      max_results: 5,
    });

    expect(page.data[0]?.full_name).toBe("Beulah Lee");
    expect(page.response.total_results).toBe(14337505);
    expect(body).toEqual({
      company: { industry: { include: ["Software Development"] } },
      people: { job_level: ["VP"], job_title: { include: ["Engineer"] } },
      max_results: 5,
    });
    expect(body).not.toHaveProperty("cursor");
  });

  it("search.companies sends the company filter", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/search/companies`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.COMPANY_SEARCH);
      }),
    );
    const page = await client().search.companies({
      company: { employee_range: ["1-10"] },
      max_results: 1,
    });
    expect(page.data[0]?.name).toBe("Google");
    expect(body).toEqual({ company: { employee_range: ["1-10"] }, max_results: 1 });
  });

  it("search.employee_finder sends value lists", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/search/employee-finder`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.EMPLOYEE_FINDER);
      }),
    );
    const page = await client().search.employee_finder({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      job_level: ["Director"],
      job_function: ["Engineering"],
      max_results: 1,
    });
    expect(page.data[0]?.first_name).toBe("Beulah");
    expect(body).toEqual({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      job_level: ["Director"],
      job_function: ["Engineering"],
      max_results: 1,
      page: 1,
    });
  });

  it("search.waterfall_icp sends the cascade", async () => {
    let body: { cascade?: Array<{ include_title?: string[] }> } | undefined;
    server.use(
      http.post(`${BASE}/v2/search/waterfall-icp-keyword`, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json(data.WATERFALL_ICP);
      }),
    );
    const result = await client().search.waterfall_icp({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      cascade: [{ include_title: ["CEO"], location: ["WORLD"], include_headline_search: false }],
      max_results: 5,
    });
    expect(WaterfallIcpResponse.parse(result)).toBeTruthy();
    expect(body?.cascade?.[0]?.include_title).toEqual(["CEO"]);
  });

  it("utils.current_date sends the region", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/utils/current-date`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.CURRENT_DATE);
      }),
    );
    const result = await client().utils.current_date({ region: "America/New_York" });
    expect(CurrentDateResponse.parse(result)).toBeTruthy();
    expect(body).toEqual({ region: "America/New_York" });
  });

  it("utils.company_department_distribution posts the company url and types the response", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/utils/company-department-distribution`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.DEPARTMENT_DISTRIBUTION);
      }),
    );
    const result = await client().utils.company_department_distribution({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
    });
    expect(CompanyDepartmentDistributionResponse.parse(result)).toBeTruthy();
    expect(result.distribution[0]?.department).toBe("Engineering");
    expect(body).toEqual({ company_linkedin_url: "https://www.linkedin.com/company/openai" });
  });

  it("applies the per-call timeout, overriding the client default", async () => {
    // A fetch that only ever settles when its AbortSignal fires. The client
    // default is 30s; the per-call 20ms must be what aborts it.
    const hangUntilAbort: typeof globalThis.fetch = (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | null | undefined;
        signal?.addEventListener("abort", () => reject(signal.reason));
      });
    const c = new BlitzAPI({
      api_key: TEST_KEY,
      rate_limit_rps: null,
      timeout: 30,
      fetch: hangUntilAbort,
    });
    const error = await c.enrichment
      .email({ person_linkedin_url: "https://www.linkedin.com/in/example" }, { timeout: 0.02 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APITimeoutError);
  });

  it("never sends the per-call timeout on the wire", async () => {
    let body: unknown;
    let requestUrl: string | undefined;
    server.use(
      http.post(`${BASE}/v2/enrichment/email`, async ({ request }) => {
        requestUrl = request.url;
        body = await request.json();
        return HttpResponse.json(data.EMAIL_ENRICHMENT);
      }),
    );
    await client().enrichment.email(
      { person_linkedin_url: "https://www.linkedin.com/in/example" },
      { timeout: 5 },
    );
    expect(body).toEqual({ person_linkedin_url: "https://www.linkedin.com/in/example" });
    expect(requestUrl).not.toContain("timeout");
  });

  it("threads request options through paginated page fetches without leaking them", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    let calls = 0;
    server.use(
      http.post(`${BASE}/v2/search/people`, async ({ request }) => {
        calls += 1;
        bodies.push((await request.json()) as Record<string, unknown>);
        // Page 1 carries a cursor; page 2 returns a null cursor to stop the walk.
        const payload = calls === 1 ? data.PEOPLE_SEARCH : { ...data.PEOPLE_SEARCH, cursor: null };
        return HttpResponse.json(payload);
      }),
    );

    const collected = [];
    for await (const person of client().search.people({ max_results: 1 }, { timeout: 5 })) {
      collected.push(person);
    }

    expect(calls).toBe(2);
    expect(collected).toHaveLength(2);
    for (const sent of bodies) expect(sent).not.toHaveProperty("timeout");
  });
});
