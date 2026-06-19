# Changelog

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
