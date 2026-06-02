import * as z from "zod";

/**
 * Base factory for every Blitz API response schema.
 *
 * Built on `z.looseObject` so unknown fields returned by the API are preserved
 * (merged onto the parsed object) instead of being stripped or rejected — a new
 * server-side field never breaks deserialization. Known fields stay precisely
 * typed. This is the Zod equivalent of Pydantic's `extra="allow"`.
 */
export const blitzObject = <T extends z.ZodRawShape>(shape: T) => z.looseObject(shape);

/**
 * List field that coerces a missing **or `null`** value to `[]`.
 *
 * `z.array(item).default([])` fills the default only for `undefined`, so an explicit
 * `null` from the API would throw and break deserialization. These fields are
 * array-or-omitted today, but tolerating `null` too keeps a future `null`-for-empty
 * list from breaking the parse — same forward-compat intent as {@link blitzObject}.
 * Fields the API documents as genuinely nullable (e.g. `Company.specialties`) stay
 * `.nullish()` so they can still surface `null`.
 */
export const blitzList = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((value) => value ?? []);
