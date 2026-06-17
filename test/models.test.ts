/** The hand-written Zod schemas must match the API's example shapes. */

import { describe, expect, it } from "vitest";
import {
  CompanyDepartmentDistributionResponse,
  CompanyEmploymentDistributionResponse,
  CompanyEnrichmentResponse,
  CompanySearchResponse,
  CurrentDateResponse,
  DomainToLinkedinResponse,
  EmailEnrichmentResponse,
  EmailToPersonResponse,
  EmployeeFinderResponse,
  KeyInfo,
  LinkedinToDomainResponse,
  PeopleSearchResponse,
  PhoneEnrichmentResponse,
  PhoneToPersonResponse,
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
  });

  it("parses people search with a nested person", () => {
    const resp = PeopleSearchResponse.parse(data.PEOPLE_SEARCH);
    expect(resp.total_results).toBe(14337505);
    const person = resp.results[0];
    expect(person?.full_name).toBe("Beulah Lee");
    expect(person?.location?.country_code).toBe("US");
    expect(person?.experiences[0]?.company_name).toBe("Google");
    expect(person?.experiences[0]?.job_location?.city).toBe("Sunnyvale");
    expect(person?.education[0]?.degree).toBe("Bachelor's degree");
    expect(person?.certifications[0]?.authority).toBe("Google");
  });

  it("parses company search", () => {
    const resp = CompanySearchResponse.parse(data.COMPANY_SEARCH);
    const company = resp.results[0];
    expect(company?.name).toBe("Google");
    expect(company?.linkedin_id).toBe(1441);
    expect(company?.hq?.region).toBe("NORAM");
    expect(company?.specialties).toEqual(["search", "cloud"]);
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

  it("parses employment distribution", () => {
    const resp = CompanyEmploymentDistributionResponse.parse(data.EMPLOYMENT_DISTRIBUTION);
    expect(resp.total_employees).toBe(1234);
    expect(resp.distribution[0]?.country).toBe("US");
    expect(resp.distribution[0]?.count).toBe(900);
  });

  it("parses department distribution", () => {
    const resp = CompanyDepartmentDistributionResponse.parse(data.DEPARTMENT_DISTRIBUTION);
    expect(resp.total_employees).toBe(1234);
    expect(resp.distribution[0]?.department).toBe("Engineering");
    expect(resp.distribution[0]?.count).toBe(320);
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
