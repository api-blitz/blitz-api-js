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

/** An additional company LinkedIn match for a domain, beyond the primary one. */
export const DomainToLinkedinMatch = blitzObject({
  company_linkedin_url: z.string().nullish(),
  company_name: z.string().nullish(),
});
export type DomainToLinkedinMatch = z.infer<typeof DomainToLinkedinMatch>;

/** Result of `enrichment.domain_to_linkedin` (domain -> company LinkedIn URL). */
export const DomainToLinkedinResponse = blitzObject({
  found: z.boolean().nullish(),
  company_linkedin_url: z.string().nullish(),
  company_name: z.string().nullish(),
  // Runner-up matches when a domain resolves to more than one company.
  other: blitzList(DomainToLinkedinMatch),
});
export type DomainToLinkedinResponse = z.infer<typeof DomainToLinkedinResponse>;

/** Result of `enrichment.linkedin_to_domain` (company LinkedIn URL -> email domain). */
export const LinkedinToDomainResponse = blitzObject({
  found: z.boolean().nullish(),
  email_domain: z.string().nullish(),
});
export type LinkedinToDomainResponse = z.infer<typeof LinkedinToDomainResponse>;

/** Employee count for a single country (ISO 3166-1 alpha-2; `unknown` when undetermined). */
export const CountryDistributionItem = blitzObject({
  country: z.string().nullish(),
  count: z.number().nullish(),
  percentage_ratio: z.number().nullish(),
});
export type CountryDistributionItem = z.infer<typeof CountryDistributionItem>;

/** Result of `enrichment.company_distribution_by_country`. */
export const CompanyDistributionByCountryResponse = blitzObject({
  company_linkedin_url: z.string().nullish(),
  total_employees: z.number().nullish(),
  distribution: blitzList(CountryDistributionItem),
});
export type CompanyDistributionByCountryResponse = z.infer<
  typeof CompanyDistributionByCountryResponse
>;

/** Employee count for a single department (`Other` when unclassified). */
export const DepartmentDistributionItem = blitzObject({
  department: z.string().nullish(),
  count: z.number().nullish(),
  percentage_ratio: z.number().nullish(),
});
export type DepartmentDistributionItem = z.infer<typeof DepartmentDistributionItem>;

/** Result of `enrichment.company_distribution_by_department`. */
export const CompanyDistributionByDepartmentResponse = blitzObject({
  company_linkedin_url: z.string().nullish(),
  total_employees: z.number().nullish(),
  distribution: blitzList(DepartmentDistributionItem),
});
export type CompanyDistributionByDepartmentResponse = z.infer<
  typeof CompanyDistributionByDepartmentResponse
>;
