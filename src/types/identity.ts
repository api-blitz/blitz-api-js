/** Response models for the Identity resource. */

import * as z from "zod";
import { v2_response } from "./envelopes.js";
import { blitzList, blitzObject } from "./models.js";
import { HQ, Location } from "./shared.js";

/** A past job of a matched person: the company and the job title. */
export const MatchPastExperience = blitzObject({
  company_name: z.string().nullish(),
  job_title: z.string().nullish(),
});
export type MatchPastExperience = z.infer<typeof MatchPastExperience>;

/** A person that `identity.person_match` returns, in `match` or in `candidates`. */
export const PersonMatch = blitzObject({
  linkedin_url: z.string().nullish(),
  full_name: z.string().nullish(),
  /** Title of the current job. With several current jobs, the one at the company of the input. */
  job_title: z.string().nullish(),
  /** Company of that job. */
  company_name: z.string().nullish(),
  location: Location.nullish(),
  /** Probability that this is the right person, from 0 to 1. */
  confidence: z.number().nullish(),
  /** The 3 latest past jobs, and the job at the company of the input when it is an older one. */
  past_experiences: blitzList(MatchPastExperience),
});
export type PersonMatch = z.infer<typeof PersonMatch>;

/** A company that `identity.company_match` returns, in `match` or in `candidates`. */
export const CompanyMatch = blitzObject({
  linkedin_url: z.string().nullish(),
  name: z.string().nullish(),
  domain: z.string().nullish(),
  industry: z.string().nullish(),
  /** Employee range, such as `51-200`. */
  size: z.string().nullish(),
  /** Headquarters of the company. */
  location: HQ.nullish(),
  /** Probability that this is the right company, from 0 to 1. */
  confidence: z.number().nullish(),
});
export type CompanyMatch = z.infer<typeof CompanyMatch>;

/**
 * Result of `identity.person_match`.
 *
 * `status` is `matched` (use `match`), `ambiguous` (choose among `candidates`) or
 * `not_found` (0 records). It is a loose string, not a `z.enum`, so a new value never
 * breaks parsing, the same posture as `ChangelogEntry.type`.
 */
export const PersonMatchResponse = v2_response({
  status: z.string().nullish(),
  /** The person retained. `null` unless `status` is `matched`. */
  match: PersonMatch.nullish(),
  /** Up to 10 other plausible people (confidence of 0.3 or more), most probable first. */
  candidates: blitzList(PersonMatch),
});
export type PersonMatchResponse = z.infer<typeof PersonMatchResponse>;

/**
 * Result of `identity.company_match`.
 *
 * `status` is `matched` (use `match`), `ambiguous` (choose among `candidates`) or
 * `not_found` (0 records), as a loose string (see {@link PersonMatchResponse}).
 */
export const CompanyMatchResponse = v2_response({
  status: z.string().nullish(),
  /** The company retained. `null` unless `status` is `matched`. */
  match: CompanyMatch.nullish(),
  /**
   * Up to 10 other plausible companies (confidence of 0.3 or more), most probable first.
   * With a `company_domain` alone that several pages share, the pages of the domain are
   * listed, also under 0.3, with a confidence of 0.8 at most.
   */
  candidates: blitzList(CompanyMatch),
});
export type CompanyMatchResponse = z.infer<typeof CompanyMatchResponse>;
