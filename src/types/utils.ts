/** Response models for the Utilities resource. */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";

/** Result of `utils.current_date`. */
export const CurrentDateResponse = blitzObject({
  datetime: z.string().nullish(),
  timestamp: z.number().nullish(),
  timezone: z.string().nullish(),
  timezone_name: z.string().nullish(),
});
export type CurrentDateResponse = z.infer<typeof CurrentDateResponse>;

/** Employee count for a single country. */
export const EmploymentDistributionItem = blitzObject({
  country: z.string().nullish(),
  count: z.number().nullish(),
});
export type EmploymentDistributionItem = z.infer<typeof EmploymentDistributionItem>;

/** Result of `utils.company_employment_distribution`. */
export const CompanyEmploymentDistributionResponse = blitzObject({
  company_linkedin_url: z.string().nullish(),
  total_employees: z.number().nullish(),
  distribution: blitzList(EmploymentDistributionItem),
});
export type CompanyEmploymentDistributionResponse = z.infer<
  typeof CompanyEmploymentDistributionResponse
>;
