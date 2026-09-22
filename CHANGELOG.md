# Changelog

## [3.0.0](https://github.com/api-blitz/blitz-api-js/compare/v2.0.0...v3.0.0) (2026-09-22)


### ⚠ BREAKING CHANGES

* the 402 class is renamed `FairUsageLimitError` -> `InsufficientRecordsError`, matching `blitz-api-py`. `FairUsageLimitError` remains as a deprecated alias for the same class until 4.0.0, so `instanceof` and imports keep working. `error.name` is `"InsufficientRecordsError"` from this release on, so update any comparison against the literal string `"FairUsageLimitError"`.
* `Company.specialties` is now `string[]`, never `null`. A `null` from the API coerces to `[]` like every other list field, so `specialties?.map()` guards are no longer needed (and `?? []` fallbacks become dead code).
* drop three response fields neither spec documents; finish the pagination audit
* `Education.field_of_study` is removed — the API folded the field of study into `degree` ("Bachelor of Science, Industrial Engineering").

### Features

* add the "Unknown" industry sentinel, document the min&gt;max range rejection ([82daa0e](https://github.com/api-blitz/blitz-api-js/commit/82daa0ef9133a38f0a1aa21236b056e608544e8d))
* close the three cross-SDK divergences raised against this PR ([#24](https://github.com/api-blitz/blitz-api-js/issues/24), [#25](https://github.com/api-blitz/blitz-api-js/issues/25), [#26](https://github.com/api-blitz/blitz-api-js/issues/26)) ([58ff3fd](https://github.com/api-blitz/blitz-api-js/commit/58ff3fd9726e227d1575c20340e9e3a4ecf58209))
* rename the 402 class to InsufficientRecordsError, matching blitz-api-py ([#25](https://github.com/api-blitz/blitz-api-js/issues/25)) ([42cdf8e](https://github.com/api-blitz/blitz-api-js/commit/42cdf8e5ecde9dd3600ad1667d1f7ea1641691f9))
* sync with the live spec — person enrichment, TAM by people, 2026-09-15 field changes ([071a8a5](https://github.com/api-blitz/blitz-api-js/commit/071a8a539d01669b671394db5d63df4cd875bb27))


### Bug Fixes

* drop three response fields neither spec documents; finish the pagination audit ([14d0444](https://github.com/api-blitz/blitz-api-js/commit/14d0444483be4c78fc9ae6f8c39c2f997aa47768))

## [2.0.0](https://github.com/api-blitz/blitz-api-js/compare/v1.2.0...v2.0.0) (2026-09-02)


### ⚠ BREAKING CHANGES

* `KeyInfo.remaining_credits` is now `KeyInfo.records_remaining`. Read `info.records_remaining` instead. The `InsufficientCreditsError` rename is not breaking — the old name stays exported as a deprecated alias.

### Features

* sync with the live spec — fair_usage block, records vocabulary ([55d39c2](https://github.com/api-blitz/blitz-api-js/commit/55d39c2fd8645b9fc0d58965efbcb8829f0c897e))

## [1.2.0](https://github.com/api-blitz/blitz-api-js/compare/v1.1.0...v1.2.0) (2026-08-13)


### Features

* add company and changelog resources with new endpoints ([7d40579](https://github.com/api-blitz/blitz-api-js/commit/7d405796508c0968469d56800dfca7f31802e4c6))

## [1.1.0](https://github.com/api-blitz/blitz-api-js/compare/v1.0.0...v1.1.0) (2026-07-23)


### Features

* add Jobs resource and enhance pagination for job search ([97ed394](https://github.com/api-blitz/blitz-api-js/commit/97ed39457e9434653264aa8e6fa683b75fe58b5e))

## [1.0.0](https://github.com/api-blitz/blitz-api-js/compare/v0.5.0...v1.0.0) (2026-06-19)


### ⚠ BREAKING CHANGES

* utils.company_employment_distribution -> enrichment.company_distribution_by_country and utils.company_department_distribution -> enrichment.company_distribution_by_department; the CompanyEmploymentDistributionResponse / CompanyDepartmentDistributionResponse types are renamed CompanyDistributionByCountryResponse / CompanyDistributionByDepartmentResponse.

### Features

* align find-people, find-companies & distribution with Blitz API v2 ([5053ff6](https://github.com/api-blitz/blitz-api-js/commit/5053ff6ab208537fb4b7f20d13dd09f120dd5249))

## [0.5.0](https://github.com/api-blitz/blitz-api-js/compare/v0.4.0...v0.5.0) (2026-06-18)


### Features

* rate-limit per endpoint instead of globally ([7e038d5](https://github.com/api-blitz/blitz-api-js/commit/7e038d5a4e72756ddc1a529d8334a2c97a54253a))

## [0.4.0](https://github.com/api-blitz/blitz-api-js/compare/v0.3.0...v0.4.0) (2026-06-17)


### Features

* add company department distribution endpoint and update related documentation ([06c1d32](https://github.com/api-blitz/blitz-api-js/commit/06c1d32e9e3c0575f26c2727e0f747b8776ccd34))

## [0.3.0](https://github.com/api-blitz/blitz-api-js/compare/v0.2.0...v0.3.0) (2026-06-04)


### Features

* generate enums from the live OpenAPI spec with dedup ([98d8942](https://github.com/api-blitz/blitz-api-js/commit/98d894257214e90f3406e3548166a23d672f3d28))
* generate enums from the live OpenAPI spec with dedup ([b35eddd](https://github.com/api-blitz/blitz-api-js/commit/b35eddda7f4cdea5a352251e47724591c75ded83))

## [0.2.0](https://github.com/api-blitz/blitz-api-js/compare/v0.1.0...v0.2.0) (2026-06-02)


### Features

* add per-request timeout and close blitz-api-py parity gaps ([20147d0](https://github.com/api-blitz/blitz-api-js/commit/20147d009a3279ae6442650afdb05f8e6e8725cb)), closes [#2](https://github.com/api-blitz/blitz-api-js/issues/2) [#3](https://github.com/api-blitz/blitz-api-js/issues/3) [#4](https://github.com/api-blitz/blitz-api-js/issues/4)
* per-request timeout + close blitz-api-py parity gaps ([5e848b7](https://github.com/api-blitz/blitz-api-js/commit/5e848b74c6a13bb93dee1ef41b3e4fdd607fe395))

## Changelog

All notable changes to this project are documented here. This file is maintained
automatically by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/).
