/** The hand-written Zod schemas must match the API's example shapes. */

import { describe, expect, it } from "vitest";
import * as z from "zod";
import * as api from "../src/index.js";
import {
  ChangelogResponse,
  CompanyDistributionByCountryResponse,
  CompanyDistributionByDepartmentResponse,
  CompanyEnrichmentResponse,
  CompanyJobsResponse,
  CompanySearchResponse,
  CurrentDateResponse,
  DomainToLinkedinResponse,
  Education,
  EmailEnrichmentResponse,
  EmailToPersonResponse,
  EmployeeFinderResponse,
  JobSearchResponse,
  KeyInfo,
  LinkedinToDomainResponse,
  PeopleSearchResponse,
  PersonEnrichmentResponse,
  PhoneEnrichmentResponse,
  PhoneToPersonResponse,
  TamByJobsResponse,
  TamByPeopleResponse,
  WaterfallIcpResponse,
} from "../src/index.js";
import * as data from "./data.js";

describe("response models", () => {
  it("parses key info", () => {
    const info = KeyInfo.parse(data.KEY_INFO);
    expect(info.valid).toBe(true);
    expect(info.max_requests_per_seconds).toBe(5);
    expect(info.allowed_apis).toEqual(["/enrichment/email", "/search/people"]);
    expect(info.active_plans[0]?.name).toBe("Unlimited Leads");
    expect(info.records_remaining).toBe(99.5);
    // key-info is the one endpoint that is not rate limited, so it carries no `rate_limit`.
    expect(info.fair_usage?.request_id).toBe("019bae09-0055-7441-b2ea-16086e499219");
    expect(info.fair_usage?.rate_limit).toBeUndefined();
    // Guard the field name on the schema itself: `blitzObject` preserves unknown keys, so a
    // value assertion alone would still pass if `records_remaining` regressed to `remaining_credits`.
    expect(Object.keys(KeyInfo.shape)).toContain("records_remaining");
    expect(Object.keys(KeyInfo.shape)).not.toContain("remaining_credits");
  });

  it('parses key info on an unlimited plan (number | "unlimited" union)', () => {
    const info = KeyInfo.parse(data.KEY_INFO_UNLIMITED);
    expect(info.records_remaining).toBe("unlimited");
    expect(info.max_requests_per_seconds).toBe("unlimited");
  });

  it("parses people search with a nested person", () => {
    const resp = PeopleSearchResponse.parse(data.PEOPLE_SEARCH);
    expect(resp.total_results).toBe(14337505);
    const person = resp.results[0];
    expect(person?.full_name).toBe("Beulah Lee");
    expect(person?.location?.country_code).toBe("US");
    expect(person?.experiences[0]?.company_name).toBe("Google");
    expect(person?.experiences[0]?.job_location?.city).toBe("Sunnyvale");
    expect(person?.experiences[0]?.job_contract_type).toBe("Full-time");
    expect(person?.experiences[0]?.job_work_arrangement).toBe("Hybrid");
    expect(person?.location?.postal_code).toBe("94089");
    expect(person?.location?.street_address).toBe("1600 Amphitheatre Parkway");
    // `degree` carries the field of study; the API removed `field_of_study` on 2026-09-15.
    expect(person?.education[0]?.degree).toBe("Bachelor of Science, Computer Science");
    expect(person?.education[0]?.school_name).toBe("Stanford University");
    expect(person?.certifications[0]?.authority).toBe("Google");
    // Guard the field names on the schema itself: `blitzObject` preserves unknown keys,
    // so a value assertion alone would still pass if `school_name` regressed to `school`
    // or if the dropped `field_of_study` crept back in.
    expect(Object.keys(Education.shape).sort()).toEqual([
      "degree",
      "end_date",
      "school_name",
      "start_date",
    ]);
  });

  it("parses company search", () => {
    const resp = CompanySearchResponse.parse(data.COMPANY_SEARCH);
    const company = resp.results[0];
    expect(company?.name).toBe("Google");
    expect(company?.linkedin_id).toBe(1441);
    expect(company?.hq?.region).toBe("NORAM");
    expect(company?.specialties).toEqual(["search", "cloud"]);
    expect(company?.slogan).toBe("Organize the world's information");
    expect(company?.revenue).toBe(350000000000);
    expect(company?.employee_growth[0]).toEqual({ percentage: 12.5, timespan: "1 year" });
  });

  it("parses job search with a nested job", () => {
    const resp = JobSearchResponse.parse(data.JOB_SEARCH);
    expect(resp.total_results).toBe(4821);
    const job = resp.results[0];
    expect(job?.title).toBe("Growth Marketing Manager, SMB Ads");
    expect(job?.company_name).toBe("OpenAI");
    // The API emits a space-separated timestamp with an offset, not ISO-8601.
    expect(job?.date_posted).toBe("2026-07-08 23:00:07+02");
    expect(job?.location?.city).toBe("San Francisco");
    expect(job?.location?.country_code).toBe("US");
  });

  it("parses company jobs", () => {
    const resp = CompanyJobsResponse.parse(data.COMPANY_JOBS);
    expect(resp.total_results).toBe(37);
    expect(resp.results[0]?.company_linkedin_url).toBe("https://www.linkedin.com/company/openai");
  });

  it("parses employee finder as page-paginated", () => {
    const resp = EmployeeFinderResponse.parse(data.EMPLOYEE_FINDER);
    expect(resp.page).toBe(1);
    expect(resp.total_pages).toBe(1285);
    expect(resp.results[0]?.first_name).toBe("Beulah");
  });

  it("parses waterfall icp wrapping a person with a tier", () => {
    const resp = WaterfallIcpResponse.parse(data.WATERFALL_ICP);
    const match = resp.results[0];
    expect(match?.icp).toBe(1);
    expect(match?.ranking).toBe(1);
    expect(match?.person?.full_name).toBe("Beulah Lee");
  });

  it("parses email enrichment", () => {
    const resp = EmailEnrichmentResponse.parse(data.EMAIL_ENRICHMENT);
    expect(resp.found).toBe(true);
    expect(resp.email).toBe("antoine@blitz-agency.com");
    expect(resp.all_emails[0]?.email_domain).toBe("blitz-agency.com");
  });

  it("parses phone enrichment", () => {
    const resp = PhoneEnrichmentResponse.parse(data.PHONE_ENRICHMENT);
    expect(resp.found).toBe(true);
    expect(resp.phone).toBe("+1234567890");
  });

  it("parses email to person", () => {
    const resp = EmailToPersonResponse.parse(data.EMAIL_TO_PERSON);
    expect(resp.person?.linkedin_url).toBe("https://www.linkedin.com/in/beulah-lee");
  });

  it("parses phone to person", () => {
    const resp = PhoneToPersonResponse.parse(data.PHONE_TO_PERSON);
    expect(resp.person).not.toBeNull();
  });

  it("parses company enrichment", () => {
    const resp = CompanyEnrichmentResponse.parse(data.COMPANY_ENRICHMENT);
    expect(resp.company?.domain).toBe("google.com");
  });

  it("parses domain to linkedin", () => {
    const resp = DomainToLinkedinResponse.parse(data.DOMAIN_TO_LINKEDIN);
    expect(resp.company_linkedin_url).toBe("https://www.linkedin.com/company/blitz-api");
    expect(resp.company_name).toBe("Blitz");
    expect(resp.other[0]?.company_name).toBe("Blitz Other");
  });

  it("parses linkedin to domain", () => {
    const resp = LinkedinToDomainResponse.parse(data.LINKEDIN_TO_DOMAIN);
    expect(resp.email_domain).toBe("blitz-agency.com");
  });

  it("parses current date", () => {
    const resp = CurrentDateResponse.parse(data.CURRENT_DATE);
    expect(resp.timestamp).toBe(1736385600);
    expect(resp.timezone).toBe("America/New_York");
  });

  it("parses distribution by country", () => {
    const resp = CompanyDistributionByCountryResponse.parse(data.EMPLOYMENT_DISTRIBUTION);
    expect(resp.total_employees).toBe(1234);
    expect(resp.distribution[0]?.country).toBe("US");
    expect(resp.distribution[0]?.count).toBe(900);
    expect(resp.distribution[0]?.percentage_ratio).toBe(72.93);
  });

  it("parses distribution by department", () => {
    const resp = CompanyDistributionByDepartmentResponse.parse(data.DEPARTMENT_DISTRIBUTION);
    expect(resp.total_employees).toBe(1234);
    expect(resp.distribution[0]?.department).toBe("Engineering");
    expect(resp.distribution[0]?.count).toBe(320);
    expect(resp.distribution[0]?.percentage_ratio).toBe(25.93);
  });

  it("parses tam by jobs (a company + matched_jobs, no total_results)", () => {
    const resp = TamByJobsResponse.parse(data.TAM_BY_JOBS);
    expect(resp.results[0]?.matched_jobs).toBe(7);
    expect(resp.results[0]?.company?.name).toBe("Google");
    expect(resp.cursor).toBe("example_cursor_tam_p2");
    // The TAM envelope carries no total_results (unlike the search/jobs envelopes).
    expect((resp as Record<string, unknown>).total_results).toBeUndefined();
  });

  it("parses person enrichment (whole career on the nested person)", () => {
    const resp = PersonEnrichmentResponse.parse(data.PERSON_ENRICHMENT);
    expect(resp.found).toBe(true);
    expect(resp.person?.linkedin_url).toBe("https://www.linkedin.com/in/beulah-lee");
    expect(resp.person?.experiences[0]?.job_title).toBe("Software Engineer");
    expect(resp.person?.skills).toEqual(["python"]);
  });

  it("parses a person-enrichment miss (found: false, person: null)", () => {
    const resp = PersonEnrichmentResponse.parse(data.PERSON_ENRICHMENT_NOT_FOUND);
    expect(resp.found).toBe(false);
    expect(resp.person).toBeNull();
    expect(resp.fair_usage?.records_used).toBe(0);
  });

  it("parses tam by people (a company + matched_people, no total_results)", () => {
    const resp = TamByPeopleResponse.parse(data.TAM_BY_PEOPLE);
    expect(resp.results[0]?.matched_people).toBe(42);
    expect(resp.results[0]?.company?.name).toBe("Google");
    expect(resp.cursor).toBe("example_cursor_tam_people_p2");
    // Like the TAM-by-jobs envelope, this one carries no total_results.
    expect((resp as Record<string, unknown>).total_results).toBeUndefined();
  });

  it("parses the fair_usage block every /v2 response carries", () => {
    const resp = EmailEnrichmentResponse.parse(data.EMAIL_ENRICHMENT);
    expect(resp.fair_usage?.records_used).toBe(3);
    expect(resp.fair_usage?.records_remaining).toBe(9913547);
    expect(resp.fair_usage?.next_reset_at).toBe("2026-09-29T10:25:23.155Z");
    expect(resp.fair_usage?.rate_limit?.requests_per_second).toBe(100);
    expect(resp.fair_usage?.rate_limit?.remaining_this_second).toBe(97);
    expect(resp.fair_usage?.request_id).toBe("019bae09-0055-7441-b2ea-16086e499219");
  });

  it('parses an unlimited-plan fair_usage (records_remaining: "unlimited")', () => {
    const resp = PeopleSearchResponse.parse({
      ...data.PEOPLE_SEARCH,
      fair_usage: { ...data.FAIR_USAGE, records_remaining: "unlimited", next_reset_at: null },
    });
    expect(resp.fair_usage?.records_remaining).toBe("unlimited");
    expect(resp.fair_usage?.next_reset_at).toBeNull();
  });

  it("declares fair_usage on every /v2 response model", () => {
    // The API attaches the block to every `/v2` endpoint; only the public
    // `/changelog/` (a top-level array) is exempt. Every envelope is built by
    // `v2_response`, so this holds by construction. Sweeping the whole export
    // surface rather than a hand-maintained list means a new endpoint added
    // without the factory fails here without anyone remembering to update a count.
    const missing: string[] = [];
    let checked = 0;
    for (const [name, value] of Object.entries(api)) {
      const is_v2_model = name === "KeyInfo" || name.endsWith("Response");
      if (!is_v2_model || !(value instanceof z.ZodObject)) continue;
      checked += 1;
      if (!Object.keys(value.shape).includes("fair_usage")) missing.push(name);
    }
    expect(missing).toEqual([]);
    // ChangelogResponse is a top-level array, not a ZodObject, so it is skipped.
    expect(checked).toBe(20);
  });

  it("parses a response that omits fair_usage (older deployment)", () => {
    const { fair_usage, ...without } = data.EMAIL_ENRICHMENT;
    expect(fair_usage).toBeDefined();
    expect(EmailEnrichmentResponse.parse(without).fair_usage).toBeUndefined();
  });

  it("parses the changelog as a top-level array", () => {
    const resp = ChangelogResponse.parse(data.CHANGELOG);
    expect(Array.isArray(resp)).toBe(true);
    expect(resp).toHaveLength(2);
    expect(resp[0]?.type).toBe("feature");
    expect(resp[0]?.affected_endpoints).toEqual(["/v2/company/tam-by-jobs"]);
    expect(resp[0]?.links[0]?.url).toBe("https://docs.blitz-api.ai/changelog");
    // Optional lists absent on the second entry coerce to [].
    expect(resp[1]?.affected_endpoints).toEqual([]);
    expect(resp[1]?.links).toEqual([]);
  });

  it("coerces a null/absent changelog body to [] (top-level blitzList)", () => {
    expect(ChangelogResponse.parse(null)).toEqual([]);
    expect(ChangelogResponse.parse(undefined)).toEqual([]);
  });

  it("coerces null list fields to [] (top-level and nested)", () => {
    // The API returning `null` for an empty list must not break deserialization.
    const resp = PeopleSearchResponse.parse({
      total_results: 0,
      results: null,
    });
    expect(resp.results).toEqual([]);

    const person = EmailToPersonResponse.parse({
      found: false,
      person: { full_name: "X", experiences: null, skills: null },
    });
    expect(person.person?.experiences).toEqual([]);
    expect(person.person?.skills).toEqual([]);

    // An omitted list still defaults to [] (unchanged behavior).
    expect(KeyInfo.parse({ valid: true }).allowed_apis).toEqual([]);
  });

  it("preserves unknown top-level fields (forward-compatible)", () => {
    const resp = PhoneEnrichmentResponse.parse({
      ...data.PHONE_ENRICHMENT,
      confidence_score: 0.97,
    });
    expect(resp.phone).toBe("+1234567890");
    expect((resp as Record<string, unknown>).confidence_score).toBe(0.97);
  });

  it("preserves unknown nested fields (forward-compatible)", () => {
    const resp = EmailToPersonResponse.parse({
      found: true,
      person: { full_name: "X", new_nested_field: { a: 1 } },
    });
    expect(resp.person).not.toBeNull();
    expect((resp.person as Record<string, unknown>).new_nested_field).toEqual({ a: 1 });
  });
});
