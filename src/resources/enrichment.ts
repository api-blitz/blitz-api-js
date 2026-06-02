/** The Enrichment resource: `client.enrichment`. */

import type { BlitzAPI } from "../client.js";
import {
  CompanyEnrichmentResponse,
  DomainToLinkedinResponse,
  EmailEnrichmentResponse,
  EmailToPersonResponse,
  LinkedinToDomainResponse,
  PhoneEnrichmentResponse,
  PhoneToPersonResponse,
} from "../types/enrichment.js";
import type {
  CompanyLinkedinUrlParams,
  DomainToLinkedinParams,
  EmailToPersonParams,
  PersonLinkedinUrlParams,
  PhoneToPersonParams,
} from "../types/filters.js";

const EMAIL = "/v2/enrichment/email";
const PHONE = "/v2/enrichment/phone";
const EMAIL_TO_PERSON = "/v2/enrichment/email-to-person";
const PHONE_TO_PERSON = "/v2/enrichment/phone-to-person";
const COMPANY = "/v2/enrichment/company";
const DOMAIN_TO_LINKEDIN = "/v2/enrichment/domain-to-linkedin";
const LINKEDIN_TO_DOMAIN = "/v2/enrichment/linkedin-to-domain";

export class EnrichmentResource {
  constructor(private readonly client: BlitzAPI) {}

  /** Find a verified work email from a LinkedIn profile URL. */
  email(params: PersonLinkedinUrlParams): Promise<EmailEnrichmentResponse> {
    return this.client.request("POST", EMAIL, params, EmailEnrichmentResponse);
  }

  /** Find a phone number from a LinkedIn profile URL (US only). */
  phone(params: PersonLinkedinUrlParams): Promise<PhoneEnrichmentResponse> {
    return this.client.request("POST", PHONE, params, PhoneEnrichmentResponse);
  }

  /** Resolve a work email to a full person profile. */
  email_to_person(params: EmailToPersonParams): Promise<EmailToPersonResponse> {
    return this.client.request("POST", EMAIL_TO_PERSON, params, EmailToPersonResponse);
  }

  /** Resolve a phone number to a full person profile. */
  phone_to_person(params: PhoneToPersonParams): Promise<PhoneToPersonResponse> {
    return this.client.request("POST", PHONE_TO_PERSON, params, PhoneToPersonResponse);
  }

  /** Resolve a company LinkedIn URL to a full company profile. */
  company(params: CompanyLinkedinUrlParams): Promise<CompanyEnrichmentResponse> {
    return this.client.request("POST", COMPANY, params, CompanyEnrichmentResponse);
  }

  /** Resolve a website domain to a company LinkedIn URL. */
  domain_to_linkedin(params: DomainToLinkedinParams): Promise<DomainToLinkedinResponse> {
    return this.client.request("POST", DOMAIN_TO_LINKEDIN, params, DomainToLinkedinResponse);
  }

  /** Resolve a company LinkedIn URL to its email domain. */
  linkedin_to_domain(params: CompanyLinkedinUrlParams): Promise<LinkedinToDomainResponse> {
    return this.client.request("POST", LINKEDIN_TO_DOMAIN, params, LinkedinToDomainResponse);
  }
}
