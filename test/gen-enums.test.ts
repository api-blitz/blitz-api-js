/**
 * Unit tests for the spec-walk + dedup logic in scripts/gen-enums.ts.
 *
 * These exercise the pure functions only (no network, no disk). The generated
 * `src/types/enums.ts` is byte-identical to before, so the existing model and
 * resource tests stay unchanged; the live byte-identity is verified separately
 * via `pnpm gen:enums:check`.
 */

import { describe, expect, it, vi } from "vitest";
import { buildArtifact, extractEnums, serializeArtifact } from "../scripts/gen-enums.js";

const INDUSTRY = ["Software Development", "Banking"];
const COMPANY_TYPE = ["Public Company", "Nonprofit"];
const EMPLOYEE_RANGE = ["1-10", "11-50"];
const CONTINENT = ["Africa", "Asia"];
const SALES_REGION = ["NORAM", "EMEA"];
const JOB_FUNCTION = ["Engineering", "Finance & Accounting"];
const JOB_LEVEL = ["C-Team", "Director"];
const LAST_FUNDING_TYPE = ["Series A", "Seed"];

const DEFAULTS = {
  industry: INDUSTRY,
  type: COMPANY_TYPE,
  employee_range: EMPLOYEE_RANGE,
  continent: CONTINENT,
  sales_region: SALES_REGION,
  job_function: JOB_FUNCTION,
  job_level: JOB_LEVEL,
  last_funding_type: LAST_FUNDING_TYPE,
};

/** `{ include: {items.enum}, exclude: {items.enum} }` — the industry/type shape. */
function filterProp(values: string[]) {
  return {
    type: "object",
    properties: {
      include: { type: "array", items: { type: "string", enum: values } },
      exclude: { type: "array", items: { type: "string", enum: values } },
    },
  };
}

/** `{ type: "array", items: {type:"string", enum} }` — the plain list shape. */
function arrayEnumProp(values: string[]) {
  return { type: "array", items: { type: "string", enum: values } };
}

function objSchema(properties: Record<string, unknown>) {
  return { type: "object", properties };
}

/** A POST endpoint repeating the schema across two content-types (like the real spec). */
function endpoint(schema: unknown) {
  return {
    post: {
      requestBody: {
        content: {
          "application/json": { schema },
          "multipart/form-data": { schema: structuredClone(schema) },
        },
      },
    },
  };
}

function companyBlock(v: typeof DEFAULTS) {
  return objSchema({
    company: objSchema({
      industry: filterProp(v.industry),
      type: filterProp(v.type),
      employee_range: arrayEnumProp(v.employee_range),
      last_funding_type: filterProp(v.last_funding_type),
      hq: objSchema({
        continent: arrayEnumProp(v.continent),
        sales_region: arrayEnumProp(v.sales_region),
      }),
    }),
  });
}

/**
 * A complete spec mirroring the real one: all 8 enums, each repeated across two
 * content-types (json + multipart) and, for industry/type, include + exclude,
 * plus continent/sales_region under both companies.hq and employee-finder.
 * Every occurrence is identical, so it round-trips cleanly.
 */
function fullSpec(overrides: Partial<typeof DEFAULTS> = {}) {
  const v = { ...DEFAULTS, ...overrides };
  return {
    openapi: "3.1.0",
    info: { version: "1.0.0" },
    paths: {
      "/v2/search/companies": endpoint(companyBlock(v)),
      "/v2/search/employee-finder": endpoint(
        objSchema({
          continent: arrayEnumProp(v.continent),
          sales_region: arrayEnumProp(v.sales_region),
          job_function: arrayEnumProp(v.job_function),
          job_level: arrayEnumProp(v.job_level),
        }),
      ),
    },
  };
}

describe("extractEnums", () => {
  it("maps all 8 owning properties to class names, in canonical order", () => {
    const enums = extractEnums(fullSpec());
    expect(Object.keys(enums)).toEqual([
      "Industry",
      "CompanyType",
      "EmployeeRange",
      "Continent",
      "SalesRegion",
      "JobFunction",
      "JobLevel",
      "LastFundingType",
    ]);
    expect(enums).toEqual({
      Industry: INDUSTRY,
      CompanyType: COMPANY_TYPE,
      EmployeeRange: EMPLOYEE_RANGE,
      Continent: CONTINENT,
      SalesRegion: SALES_REGION,
      JobFunction: JOB_FUNCTION,
      JobLevel: JOB_LEVEL,
      LastFundingType: LAST_FUNDING_TYPE,
    });
  });

  it("collapses identical duplicate occurrences to a single list", () => {
    // fullSpec repeats each enum 4× (content-types × include/exclude or endpoints);
    // the result must not be doubled.
    const enums = extractEnums(fullSpec());
    expect(enums.Continent).toEqual(CONTINENT);
    expect(enums.Industry).toEqual(INDUSTRY);
  });

  it("throws when two occurrences of the same enum diverge", () => {
    const spec = {
      paths: {
        "/a": endpoint(objSchema({ industry: filterProp(["Software Development"]) })),
        "/b": endpoint(objSchema({ industry: filterProp(["Banking"]) })),
      },
    };
    expect(() => extractEnums(spec)).toThrow(/Industry.*divergent/s);
  });

  it("throws when a mapped enum is absent from the spec", () => {
    const spec = {
      paths: {
        "/v2/search/companies": endpoint(companyBlock(DEFAULTS)),
        // employee-finder is present but job_level is omitted
        "/v2/search/employee-finder": endpoint(
          objSchema({ job_function: arrayEnumProp(JOB_FUNCTION) }),
        ),
      },
    };
    expect(() => extractEnums(spec)).toThrow(/JobLevel/);
  });

  it("drops exact-duplicate values but keeps near-duplicates", () => {
    const enums = extractEnums(fullSpec({ continent: ["Africa", "Africa", "Africa/North"] }));
    expect(enums.Continent).toEqual(["Africa", "Africa/North"]);
  });

  it("warns about and ignores an enum under an unmapped property", () => {
    const spec = {
      paths: {
        "/v2/search/companies": endpoint(companyBlock(DEFAULTS)),
        "/v2/search/employee-finder": endpoint(
          objSchema({
            continent: arrayEnumProp(CONTINENT),
            sales_region: arrayEnumProp(SALES_REGION),
            job_function: arrayEnumProp(JOB_FUNCTION),
            job_level: arrayEnumProp(JOB_LEVEL),
            seniority: arrayEnumProp(["Junior", "Senior"]),
          }),
        ),
      },
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const enums = extractEnums(spec);
      expect(enums).not.toHaveProperty("Seniority");
      expect(Object.keys(enums)).toHaveLength(8);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("seniority"));
    } finally {
      warn.mockRestore();
    }
  });
});

describe("buildArtifact / serializeArtifact", () => {
  it("records provenance and the live spec version", () => {
    const artifact = buildArtifact(fullSpec());
    expect(artifact._source_url).toBe("https://api.blitz-api.ai/openapi");
    expect(artifact.spec_version).toBe("1.0.0");
    expect(artifact._comment).toMatch(/do not hand-edit/i);
  });

  it("round-trips the double-escaped value byte-for-byte", () => {
    // Two literal backslashes + apostrophe, exactly as stored upstream.
    const value = "Women\\\\'s Handbag Manufacturing";
    const artifact = buildArtifact(fullSpec({ industry: [value] }));
    expect(artifact.enums.Industry[0]).toBe(value);
    const reparsed = JSON.parse(serializeArtifact(artifact)) as typeof artifact;
    expect(reparsed.enums.Industry[0]).toBe(value);
  });

  it("serializes compact value lists with a trailing newline", () => {
    const out = serializeArtifact(buildArtifact(fullSpec()));
    expect(out.endsWith("}\n")).toBe(true);
    // Arrays are emitted on one line (no spaces after commas).
    expect(out).toContain('"Continent": ["Africa","Asia"]');
  });
});
