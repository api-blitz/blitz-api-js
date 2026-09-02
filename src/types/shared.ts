/**
 * Response models shared across multiple Blitz API endpoints.
 *
 * These mirror the JSON the API returns (snake_case keys, 1:1 with the wire).
 * Field shapes vary slightly between endpoints (e.g. `company_name` is only
 * populated by people search; `HQ.postcode`/`street` only by company
 * enrichment), so divergent fields are modeled as optional on a single superset
 * type rather than duplicated. Schemas are forward-compatible: unknown fields
 * are preserved.
 */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";

/** A geographic location attached to a person or a job. */
export const Location = blitzObject({
  city: z.string().nullish(),
  state_code: z.string().nullish(),
  country_code: z.string().nullish(),
  continent: z.string().nullish(),
});
export type Location = z.infer<typeof Location>;

/** A single role from a person's work history. */
export const Experience = blitzObject({
  job_title: z.string().nullish(),
  // Populated by `search.people`; absent from employee-finder / reverse lookups.
  company_name: z.string().nullish(),
  company_linkedin_url: z.string().nullish(),
  company_linkedin_id: z.string().nullish(),
  company_domain: z.string().nullish(),
  job_description: z.string().nullish(),
  job_start_date: z.string().nullish(),
  job_end_date: z.string().nullish(),
  job_is_current: z.boolean().nullish(),
  job_location: Location.nullish(),
});
export type Experience = z.infer<typeof Experience>;

/** A single education entry from a person's profile. */
export const Education = blitzObject({
  school_name: z.string().nullish(),
  degree: z.string().nullish(),
  field_of_study: z.string().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
});
export type Education = z.infer<typeof Education>;

/** A professional certification listed on a person's profile. */
export const Certification = blitzObject({
  authority: z.string().nullish(),
  name: z.string().nullish(),
  url: z.string().nullish(),
});
export type Certification = z.infer<typeof Certification>;

/** A person profile returned by search and reverse-enrichment endpoints. */
export const Person = blitzObject({
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  full_name: z.string().nullish(),
  nickname: z.string().nullish(),
  civility_title: z.string().nullish(),
  headline: z.string().nullish(),
  about_me: z.string().nullish(),
  location: Location.nullish(),
  linkedin_url: z.string().nullish(),
  connections_count: z.number().nullish(),
  profile_picture_url: z.string().nullish(),
  experiences: blitzList(Experience),
  education: blitzList(Education),
  skills: blitzList(z.string()),
  certifications: blitzList(Certification),
});
export type Person = z.infer<typeof Person>;

/**
 * A company's headquarters location. Company enrichment returns `postcode` and
 * `street` in addition to the fields company search returns; both are optional.
 */
export const HQ = blitzObject({
  city: z.string().nullish(),
  state: z.string().nullish(),
  postcode: z.string().nullish(),
  country_code: z.string().nullish(),
  country_name: z.string().nullish(),
  region: z.string().nullish(),
  continent: z.string().nullish(),
  street: z.string().nullish(),
});
export type HQ = z.infer<typeof HQ>;

/** A company profile returned by company search and company enrichment. */
export const Company = blitzObject({
  linkedin_url: z.string().nullish(),
  linkedin_id: z.number().nullish(),
  name: z.string().nullish(),
  about: z.string().nullish(),
  specialties: z.array(z.string()).nullish(),
  industry: z.string().nullish(),
  type: z.string().nullish(),
  size: z.string().nullish(),
  employees_on_linkedin: z.number().nullish(),
  followers: z.number().nullish(),
  founded_year: z.number().nullish(),
  hq: HQ.nullish(),
  domain: z.string().nullish(),
  website: z.string().nullish(),
});
export type Company = z.infer<typeof Company>;

// ---------------------------------------------------------------------------
// Fair usage — the per-request usage/limit block every `/v2` response carries.
// ---------------------------------------------------------------------------

/**
 * A metered value that is a number on capped plans and the literal `"unlimited"`
 * on unlimited plans. The API returns either, so both must parse.
 */
export const MeteredValue = z.union([z.number(), z.literal("unlimited")]).nullish();
export type MeteredValue = z.infer<typeof MeteredValue>;

/** Request-rate counters inside {@link FairUsage}. */
export const FairUsageRateLimit = blitzObject({
  /** Requests this API key may send per second. */
  requests_per_second: z.number().nullish(),
  /** Requests left in the current one-second window. */
  remaining_this_second: z.number().nullish(),
});
export type FairUsageRateLimit = z.infer<typeof FairUsageRateLimit>;

/**
 * Record usage, rate limit, and tracing data for the request that returned it.
 *
 * The API attaches this block to every `/v2` response (and to the `402`
 * insufficient-balance error body). It is optional on every model so a response
 * from a deployment that predates it still parses — the same forward-compatible
 * posture as {@link blitzObject}.
 */
export const FairUsage = blitzObject({
  /** Records this request consumed, after reconciliation against the results actually returned. */
  records_used: z.number().nullish(),
  /** Records left on the plan after this request. */
  records_remaining: MeteredValue,
  /** When the record balance resets. `null` on an unlimited plan. */
  next_reset_at: z.string().nullish(),
  /** Absent on endpoints that are not rate limited (`account.key_info`). */
  rate_limit: FairUsageRateLimit.nullish(),
  /** Quote this id when you contact support. */
  request_id: z.string().nullish(),
});
export type FairUsage = z.infer<typeof FairUsage>;
