/** End-to-end resource tests: correct method/path/body out, typed model back. */

import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import {
  APITimeoutError,
  BlitzAPI,
  CompanyDistributionByCountryResponse,
  CompanyDistributionByDepartmentResponse,
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
      people: {
        job_level: ["VP"],
        job_title: { include: ["Engineer"] },
        linkedin_url: ["https://www.linkedin.com/in/example"],
      },
      max_results: 5,
    });

    expect(page.data[0]?.full_name).toBe("Beulah Lee");
    expect(page.response.total_results).toBe(14337505);
    // On a paginated method fair_usage belongs to each page's raw body.
    expect(page.response.fair_usage?.records_used).toBe(3);
    expect(body).toEqual({
      company: { industry: { include: ["Software Development"] } },
      people: {
        job_level: ["VP"],
        job_title: { include: ["Engineer"] },
        linkedin_url: ["https://www.linkedin.com/in/example"],
      },
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
      company: {
        employee_range: ["1-10"],
        total_funding: { min: 1000000 },
        last_funding_type: { include: ["Series A"] },
        lead_investors: { include: ["Sequoia Capital"] },
        hq: { state: { include: ["California"] } },
      },
      max_results: 1,
    });
    expect(page.data[0]?.name).toBe("Google");
    expect(body).toEqual({
      company: {
        employee_range: ["1-10"],
        total_funding: { min: 1000000 },
        last_funding_type: { include: ["Series A"] },
        lead_investors: { include: ["Sequoia Capital"] },
        hq: { state: { include: ["California"] } },
      },
      max_results: 1,
    });
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

  it("jobs.search sends the job and company filters", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/jobs/search`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.JOB_SEARCH);
      }),
    );
    const page = await client().jobs.search({
      job: {
        title: { include: ["Growth Marketing"] },
        seniority: { include: ["2-5"] },
        employment_type: { include: ["FULL_TIME"] },
        work_arrangement: { exclude: ["On-site"] },
        location: { country_code: { include: ["US"] } },
        date_posted: { last_days: 30 },
      },
      company: {
        is_agency: false,
        industry: { include: ["Software Development"] },
        size: { include: ["1001-5000"] },
        hq: { city: { include: ["San Francisco"] } },
      },
      max_results: 1,
    });
    expect(page.data[0]?.title).toBe("Growth Marketing Manager, SMB Ads");
    expect(page.response.total_results).toBe(4821);
    expect(body).toEqual({
      job: {
        title: { include: ["Growth Marketing"] },
        seniority: { include: ["2-5"] },
        employment_type: { include: ["FULL_TIME"] },
        work_arrangement: { exclude: ["On-site"] },
        location: { country_code: { include: ["US"] } },
        date_posted: { last_days: 30 },
      },
      company: {
        is_agency: false,
        industry: { include: ["Software Development"] },
        size: { include: ["1001-5000"] },
        hq: { city: { include: ["San Francisco"] } },
      },
      max_results: 1,
    });
    expect(body).not.toHaveProperty("cursor");
  });

  it("jobs.company scopes to a company_linkedin_url", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/jobs/company`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.COMPANY_JOBS);
      }),
    );
    const page = await client().jobs.company({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      job: { field: { include: ["Software Engineering"] } },
      max_results: 1,
    });
    expect(page.data[0]?.company_name).toBe("OpenAI");
    expect(page.response.total_results).toBe(37);
    expect(body).toEqual({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
      job: { field: { include: ["Software Engineering"] } },
      max_results: 1,
    });
  });

  it("company.tam_by_jobs posts job+company filters, no cursor/max_items on the wire", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/company/tam-by-jobs`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.TAM_BY_JOBS);
      }),
    );
    const page = await client().company.tam_by_jobs({
      job: { title: { include: ["Account Executive"] }, min_per_company: 3 },
      company: { industry: { include: ["Software Development"] } },
      max_results: 10,
      max_items: 50,
    });
    expect(page.data[0]?.matched_jobs).toBe(7);
    expect(page.data[0]?.company?.name).toBe("Google");
    expect(body).toEqual({
      job: { title: { include: ["Account Executive"] }, min_per_company: 3 },
      company: { industry: { include: ["Software Development"] } },
      max_results: 10,
    });
    expect(body).not.toHaveProperty("cursor");
    expect(body).not.toHaveProperty("max_items");
  });

  it("changelog.list issues a public GET and serializes query params", async () => {
    let method: string | undefined;
    let params: URLSearchParams | undefined;
    server.use(
      http.get(`${BASE}/changelog/`, ({ request }) => {
        method = request.method;
        params = new URL(request.url).searchParams;
        return HttpResponse.json(data.CHANGELOG);
      }),
    );
    // Deliberately-invalid key: the endpoint is public, so this still succeeds.
    const c = new BlitzAPI({ api_key: "not-a-real-key", rate_limit_rps: null });
    const entries = await c.changelog.list({ days: 7, limit: 25 });
    expect(method).toBe("GET");
    expect(entries[0]?.type).toBe("feature");
    expect(params?.get("days")).toBe("7");
    expect(params?.get("limit")).toBe("25");
  });

  it("changelog.list omits absent query params (bare trailing-slash URL)", async () => {
    let requestUrl: string | undefined;
    server.use(
      http.get(`${BASE}/changelog/`, ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(data.CHANGELOG);
      }),
    );
    await client().changelog.list();
    expect(requestUrl).toBe(`${BASE}/changelog/`);
    expect(requestUrl).not.toContain("?");
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
      cascade: [{ include_title: ["CEO"] }],
      profile_min_connections: 100,
      max_results: 5,
    });
    expect(WaterfallIcpResponse.parse(result)).toBeTruthy();
    expect(body?.cascade?.[0]?.include_title).toEqual(["CEO"]);
    expect((body as { profile_min_connections?: number })?.profile_min_connections).toBe(100);
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

  it("utils.current_date works with no argument (region optional)", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/utils/current-date`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.CURRENT_DATE);
      }),
    );
    await client().utils.current_date();
    expect(body).toEqual({});
  });

  it("enrichment.company_distribution_by_country posts the company url and types the response", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/enrichment/company-distribution-by-country`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.EMPLOYMENT_DISTRIBUTION);
      }),
    );
    const result = await client().enrichment.company_distribution_by_country({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
    });
    expect(CompanyDistributionByCountryResponse.parse(result)).toBeTruthy();
    expect(result.distribution[0]?.country).toBe("US");
    expect(body).toEqual({ company_linkedin_url: "https://www.linkedin.com/company/openai" });
  });

  it("enrichment.company_distribution_by_department posts the company url and types the response", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v2/enrichment/company-distribution-by-department`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(data.DEPARTMENT_DISTRIBUTION);
      }),
    );
    const result = await client().enrichment.company_distribution_by_department({
      company_linkedin_url: "https://www.linkedin.com/company/openai",
    });
    expect(CompanyDistributionByDepartmentResponse.parse(result)).toBeTruthy();
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
