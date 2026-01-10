# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1](https://github.com/flxbl-io/add-comment/compare/v1.0.0...v1.0.1) (2026-01-10)


### Bug Fixes

* improve README description clarity ([067e5df](https://github.com/flxbl-io/add-comment/commit/067e5df11d2d7810ef1f72fa55832946b433a56f))

## 1.0.0 (2026-01-10)


### Features

* add manual trigger to CI workflow ([10f944c](https://github.com/flxbl-io/add-comment/commit/10f944c0bf62e715a91acbeaa8ea9cbe63940a9c))
* initial release of add-comment action ([47061c3](https://github.com/flxbl-io/add-comment/commit/47061c308029e0332f8e640c4b6a51306f49318b))


### Bug Fixes

* use GHA_TOKEN for release-please ([8a1223f](https://github.com/flxbl-io/add-comment/commit/8a1223f1055bcff18267084e2a9ddbb678f81009))

## [1.0.0] - 2025-01-10

### Added

- Initial release
- Add comments to GitHub PRs and Issues
- Update existing comments using `message-id` for deduplication
- Automatic comment truncation for messages exceeding GitHub's 64KB limit
- Support for `issue-number` and `pr-number` inputs
- Cross-repository commenting support
- Outputs: `comment-id`, `comment-created`, `comment-updated`
