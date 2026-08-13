/** Response models for the Changelog resource. */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";

/** A labelled external link attached to a changelog entry (docs, migration guide, ...). */
export const ChangelogLink = blitzObject({
  label: z.string().nullish(),
  url: z.string().nullish(),
});
export type ChangelogLink = z.infer<typeof ChangelogLink>;

/** A single changelog entry. */
export const ChangelogEntry = blitzObject({
  /** Publish date in UTC, `YYYY-MM-DD`. */
  date: z.string().nullish(),
  /**
   * Impact category of the change. One of `breaking`, `feature`, `improvement`,
   * `fix`, `deprecation`, `announcement`. Kept a loose string (not a `z.enum`) so
   * a new upstream category never breaks deserialization — the same
   * forward-compatible posture as `Company.type`/`Company.industry`.
   */
  type: z.string().nullish(),
  /** Short headline for the change. */
  title: z.string().nullish(),
  /** Optional markdown detail. */
  body: z.string().nullish(),
  /** API routes affected by this change; empty/omitted for product announcements. */
  affected_endpoints: blitzList(z.string()),
  links: blitzList(ChangelogLink),
});
export type ChangelogEntry = z.infer<typeof ChangelogEntry>;

/**
 * Result of `changelog.list`: a **top-level array** of entries, newest-first.
 * `blitzList` (rather than a bare `z.array`) tolerates a `null`/omitted body,
 * coercing it to `[]` — consistent with every other list in the SDK.
 */
export const ChangelogResponse = blitzList(ChangelogEntry);
export type ChangelogResponse = z.infer<typeof ChangelogResponse>;
