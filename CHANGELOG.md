# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Shared Access**: Ability to grant read-only access to specific users for specific projects or contacts.
- **Projects Module**: Grouping transactions into projects for better organization.
- **Subscription Tiers**: Basic and Pro plans with feature gating.
- **Support Module**: Functionality for users to support the platform financially.
- **Multi-currency Support**: Enhanced currency handling with real-time exchange rates.

### Changed
- Refactored `Transaction` model to support `TransactionConversion` (e.g., Loan to Gift).
- Updated `Witness` system to allow re-verification if transaction details change.
- Improved Dashboard UI for better mobile responsiveness.

### Fixed
- Fixed issue with "Perspective Flipping" where shared transactions showed incorrect direction for the recipient.
- Resolved race condition in `ExchangeRate` service caching.
- Fixed unclickable footer links on mobile devices.

## [1.0.0] - 2026-01-01

### Initial Release
- Core Transaction Ledger (Funds & Items).
- Witness System (Invitation & Verification).
- Contact Management.
- Basic Reporting.
- User Authentication (JWT).
