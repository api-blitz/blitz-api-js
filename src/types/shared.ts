/**
 * Response models shared across multiple Blitz API endpoints.
 *
 * These mirror the JSON the API returns (snake_case keys, 1:1 with the wire).
 * Field shapes vary slightly between endpoints (e.g. `Location.postal_code` is
 * only returned on a person's location, never on a job's), so divergent fields
 * are modeled as optional on a single superset type rather than duplicated.
 * Schemas are forward-compatible: unknown fields are preserved.
 */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";

/**
 * A geographic location attached to a person or a job.
 *
 * Deliberately a superset: the spec lists all six keys only on a person's `location`,
 * `Experience.job_location` carries `city`/`country_code`/`state_code`, and `Job.location`
 * only `city`/`country_code`. The keys a site doesn't send are just `undefined` — every
 * field is optional on the one model, so no per-site copies are needed. `docs/CONTEXT.md`
 * §7 lists exactly which extras appear where.
 */
export const Location = blitzObject({
  city: z.string().nullish(),
  state_code: z.string().nullish(),
  country_code: z.string().nullish(),
  continent: z.string().nullish(),
  postal_code: z.string().nullish(),
  street_address: z.string().nullish(),
});
export type Location = z.infer<typeof Location>;

/** One MX record of a domain. */
export const MxRecord = blitzObject({
  priority: z.number().nullish(),
  host: z.string().nullish(),
});
export type MxRecord = z.infer<typeof MxRecord>;

/**
 * The MX records of a domain, lowest priority first, at most 10. Used by
 * `Company.mx`, `EmailEnrichmentResponse.mx` and `EmailMatch.mx`.
 *
 * Deliberately **not** a `blitzList`: `null` and `[]` mean different things, so coercing
 * one into the other would lose information. `null` is "no MX data" (the domain is not
 * resolved yet), `[]` is "the domain takes no mail" — `mx.length === 0` is only a safe
 * "takes no mail" test after a `null` check. This is the one list field that keeps its
 * `null`; every other `array | null` list goes through `blitzList`.
 */
export const MxRecords = z.array(MxRecord).nullish();
export type MxRecords = z.infer<typeof MxRecords>;

/** A single role from a person's work history. */
export const Experience = blitzObject({
  job_title: z.string().nullish(),
  /** Prefers the name on the linked LinkedIn company page when there is one. */
  company_name: z.string().nullish(),
  company_linkedin_url: z.string().nullish(),
  company_linkedin_id: z.string().nullish(),
  /** Filled on past positions as well as the current one. */
  company_domain: z.string().nullish(),
  job_description: z.string().nullish(),
  job_start_date: z.string().nullish(),
  job_end_date: z.string().nullish(),
  /**
   * Whether this is a current position. On `search.people` and `search.waterfall_icp`
   * it tells a current match from a past one when `include_past_jobs` is set.
   */
  job_is_current: z.boolean().nullish(),
  /**
   * How the role is contracted (e.g. `Full-time`). Free-form upstream, so it is
   * kept a loose string rather than pinned to the request-side
   * `EmploymentType` enum.
   */
  job_contract_type: z.string().nullish(),
  /** Where the work is performed (e.g. `Remote`). Free-form, same as above. */
  job_work_arrangement: z.string().nullish(),
  job_location: Location.nullish(),
});
export type Experience = z.infer<typeof Experience>;

/**
 * A single education entry from a person's profile.
 *
 * `degree` carries the field of study too (e.g.
 * `"Bachelor of Science, Industrial Engineering"`) — the API removed the
 * separate `field_of_study` field on 2026-09-15 and folded it in here.
 */
export const Education = blitzObject({
  school_name: z.string().nullish(),
  degree: z.string().nullish(),
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
  /**
   * Built from the person's first position as `<job title> | @<employer>` —
   * since 2026-09-15 it is no longer the free-text headline on the LinkedIn
   * profile.
   */
  headline: z.string().nullish(),
  about_me: z.string().nullish(),
  location: Location.nullish(),
  linkedin_url: z.string().nullish(),
  connections_count: z.number().nullish(),
  /**
   * @deprecated Always `null` since 2026-09-15. The field is still returned so
   * clients that read it don't break, but it never carries a URL.
   */
  profile_picture_url: z.string().nullish(),
  /**
   * How much of the career is returned depends on the endpoint. `search.people`
   * sends the position that matched the query — in practice a single entry, so treat
   * it as one and don't read it as a career (since 2026-09-21; the API reference page
   * still describes the old full-history behaviour and is out of date). With
   * `include_past_jobs` that position may be a past one — check `job_is_current`.
   * `enrichment.person` and the reverse lookups send every position held, in profile
   * order.
   */
  experiences: blitzList(Experience),
  education: blitzList(Education),
  skills: blitzList(z.string()),
  certifications: blitzList(Certification),
});
export type Person = z.infer<typeof Person>;

/**
 * A company's headquarters location.
 *
 * `postcode` and `street` are **no longer documented** by the OpenAPI spec (as of
 * the 2026-09-15 sync they appear on no endpoint and in no example). They are kept
 * as optional fields rather than removed: they cost nothing when absent, and
 * dropping them would break callers for a change upstream never announced. Expect
 * them to be `undefined`. (They are one of the two deliberate spec-vs-SDK supersets —
 * see `docs/CONTEXT.md` §7 — alongside {@link Location}.)
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
  specialties: blitzList(z.string()),
  industry: z.string().nullish(),
  type: z.string().nullish(),
  size: z.string().nullish(),
  revenue_range: z.string().nullish(),
  employees_on_linkedin: z.number().nullish(),
  followers: z.number().nullish(),
  founded_year: z.number().nullish(),
  hq: HQ.nullish(),
  domain: z.string().nullish(),
  website: z.string().nullish(),
  /**
   * MX records of the company `domain`. Only `enrichment.company` returns it; it is
   * `undefined` on search and TAM results. `null` means no MX data, `[]` means the domain
   * takes no mail — see {@link MxRecords}.
   */
  mx: MxRecords,
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
