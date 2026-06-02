/** Response models for the Enrichment resource. */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";
import { Company, Person } from "./shared.js";

/** A single candidate email returned by `enrichment.email`. */
export const EmailMatch = blitzObject({
  email: z.string().nullish(),
  job_order_in_profile: z.number().nullish(),
  company_linkedin_url: z.string().nullish(),
  email_domain: z.string().nullish(),
});
export type EmailMatch = z.infer<typeof EmailMatch>;

/** Result of `enrichment.email` (LinkedIn URL -> verified work email). */
export const EmailEnrichmentResponse = blitzObject({
  found: z.boolean().nullish(),
  email: z.string().nullish(),
  all_emails: blitzList(EmailMatch),
});
export type EmailEnrichmentResponse = z.infer<typeof EmailEnrichmentResponse>;

/** Result of `enrichment.phone` (LinkedIn URL -> phone). */
export const PhoneEnrichmentResponse = blitzObject({
  found: z.boolean().nullish(),
  phone: z.string().nullish(),
});
export type PhoneEnrichmentResponse = z.infer<typeof PhoneEnrichmentResponse>;

/** Result of `enrichment.email_to_person` (email -> full profile). */
export const EmailToPersonResponse = blitzObject({
  found: z.boolean().nullish(),
  person: Person.nullish(),
});
export type EmailToPersonResponse = z.infer<typeof EmailToPersonResponse>;

/** Result of `enrichment.phone_to_person` (phone -> full profile). */
export const PhoneToPersonResponse = blitzObject({
  found: z.boolean().nullish(),
  person: Person.nullish(),
});
export type PhoneToPersonResponse = z.infer<typeof PhoneToPersonResponse>;

/** Result of `enrichment.company` (company LinkedIn URL -> company profile). */
export const CompanyEnrichmentResponse = blitzObject({
  found: z.boolean().nullish(),
  company: Company.nullish(),
});
export type CompanyEnrichmentResponse = z.infer<typeof CompanyEnrichmentResponse>;

/** Result of `enrichment.domain_to_linkedin` (domain -> company LinkedIn URL). */
export const DomainToLinkedinResponse = blitzObject({
  found: z.boolean().nullish(),
  company_linkedin_url: z.string().nullish(),
});
export type DomainToLinkedinResponse = z.infer<typeof DomainToLinkedinResponse>;

/** Result of `enrichment.linkedin_to_domain` (company LinkedIn URL -> email domain). */
export const LinkedinToDomainResponse = blitzObject({
  found: z.boolean().nullish(),
  email_domain: z.string().nullish(),
});
export type LinkedinToDomainResponse = z.infer<typeof LinkedinToDomainResponse>;
